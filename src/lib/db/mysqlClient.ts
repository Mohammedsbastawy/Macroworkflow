import mysql from 'mysql2/promise';
import crypto from 'crypto';

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  port: Number(process.env.MYSQL_PORT) || 3306,
  database: process.env.MYSQL_DATABASE || 'emacro_dashboard',
  user: process.env.MYSQL_USER || 'emacro',
  password: process.env.MYSQL_PASSWORD || 'emacro123',
  connectionLimit: 15,
  waitForConnections: true,
  queueLimit: 0,
  timezone: '+00:00',
});

// JSON Column lists to automatically parse/serialize
const JSON_KEYS = [
  'steps_json',
  'fields_json',
  'react_flow_graph_json',
  'visibility_rules_json',
  'workflow_snapshot_json',
  'current_assignees_json',
  'value_json',
  'group_ids_json',
  'member_user_ids_json',
  'target_group_ids_json',
  'target_department_ids_json',
  'rules_json',
  'auth_config_json',
  'department_ids_json',
  'trigger_rules_json',
  'initial_form_data',
  'execution_path_json',
  'metadata_json',
  'roles_json'
];

function formatToMySqlDateTime(val: any): any {
  // Handle Date objects directly
  if (val instanceof Date && !isNaN(val.getTime())) {
    const pad = (n: number, l = 2) => String(n).padStart(l, '0');
    return `${val.getUTCFullYear()}-${pad(val.getUTCMonth() + 1)}-${pad(val.getUTCDate())} ${pad(val.getUTCHours())}:${pad(val.getUTCMinutes())}:${pad(val.getUTCSeconds())}.${pad(val.getUTCMilliseconds(), 3)}`;
  }
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
    try {
      const date = new Date(val);
      if (!isNaN(date.getTime())) {
        const pad = (n: number, l = 2) => String(n).padStart(l, '0');
        return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}.${pad(date.getUTCMilliseconds(), 3)}`;
      }
    } catch (e) {}
  }
  return val;
}

function parseJsonColumns(row: any) {
  if (!row) return row;
  const parsed = { ...row };
  for (const key of Object.keys(parsed)) {
    if (JSON_KEYS.includes(key) && parsed[key] !== null) {
      if (typeof parsed[key] === 'string') {
        try {
          parsed[key] = JSON.parse(parsed[key]);
        } catch (e) {}
      }
    }
  }
  return parsed;
}

// Build SQL WHERE clause from filter object
function buildWhereClause(filter: any): { sql: string; values: any[] } {
  if (!filter || Object.keys(filter).length === 0) {
    return { sql: '', values: [] };
  }

  const clauses: string[] = [];
  const values: any[] = [];

  for (const key of Object.keys(filter)) {
    const fieldVal = filter[key];
    if (fieldVal && typeof fieldVal === 'object' && !Array.isArray(fieldVal)) {
      const op = Object.keys(fieldVal)[0];
      const val = fieldVal[op];

      if (op === '_eq') {
        clauses.push(`\`${key}\` = ?`);
        values.push(val);
      } else if (op === '_neq') {
        clauses.push(`\`${key}\` != ?`);
        values.push(val);
      } else if (op === '_in') {
        if (Array.isArray(val) && val.length > 0) {
          clauses.push(`\`${key}\` IN (${val.map(() => '?').join(', ')})`);
          values.push(...val);
        } else {
          // If empty array, force no match
          clauses.push('1 = 0');
        }
      }
    } else {
      // Simple key-value eq mapping
      clauses.push(`\`${key}\` = ?`);
      values.push(fieldVal);
    }
  }

  return {
    sql: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    values,
  };
}

// Build SQL ORDER BY clause from sort syntax
function buildOrderByClause(sort: any): string {
  if (!sort) return '';
  const fields = Array.isArray(sort) ? sort : String(sort).split(',');
  const clauses = fields
    .map((f) => {
      const trimmed = f.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('-')) {
        return `\`${trimmed.slice(1)}\` DESC`;
      }
      return `\`${trimmed}\` ASC`;
    })
    .filter(Boolean);

  return clauses.length > 0 ? `ORDER BY ${clauses.join(', ')}` : '';
}

// ============================================================
//  CRUD Helpers — Pure MySQL Direct Database Backend
// ============================================================

export async function dbGet<T = any>(
  collection: string,
  filter?: Record<string, any>,
  sort?: string | string[],
  limit?: number,
  fields?: string[]
): Promise<T[]> {
  const { sql: whereSql, values } = buildWhereClause(filter);
  const orderSql = buildOrderByClause(sort);
  const limitSql = limit ? `LIMIT ${Number(limit)}` : '';
  const columns = fields && fields.length > 0 ? fields.map((f) => `\`${f}\``).join(', ') : '*';

  const sql = `SELECT ${columns} FROM \`${collection}\` ${whereSql} ${orderSql} ${limitSql};`;
  const [rows] = await pool.query(sql, values);

  return (rows as any[]).map(parseJsonColumns) as T[];
}

export async function dbGetOne<T = any>(
  collection: string,
  id: string,
  fields?: string[]
): Promise<T | null> {
  const rows = await dbGet<T>(collection, { id }, undefined, 1, fields);
  return rows.length > 0 ? rows[0] : null;
}

export async function dbCreate<T = any>(
  collection: string,
  data: Record<string, any>
): Promise<T> {
  // Auto-generate UUID if no 'id' field is provided (tables use VARCHAR PKs without AUTO_INCREMENT)
  const record = { ...data };
  if (!record.id) {
    record.id = crypto.randomUUID();
  }

  const columns = Object.keys(record);
  const values = columns.map((col) => {
    const val = record[col];
    if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
      return JSON.stringify(val);
    }
    return formatToMySqlDateTime(val);
  });

  const placeholders = columns.map(() => '?').join(', ');
  const sql = `INSERT INTO \`${collection}\` (${columns.map((c) => `\`${c}\``).join(', ')}) VALUES (${placeholders});`;

  const [result] = await pool.query(sql, values);
  const id = record.id || (result as any).insertId;

  const created = await dbGetOne<T>(collection, String(id));
  if (!created) throw new Error(`Insert failed to retrieve record ${id} from ${collection}`);
  return created;
}

export async function dbUpdate<T = any>(
  collection: string,
  id: string,
  data: Record<string, any>
): Promise<T> {
  const updateData = { ...data };
  delete updateData.id;

  const columns = Object.keys(updateData);
  if (columns.length === 0) {
    const existing = await dbGetOne<T>(collection, id);
    if (!existing) throw new Error(`Record ${id} not found in ${collection}`);
    return existing;
  }

  const setClauses = columns.map((c) => `\`${c}\` = ?`).join(', ');
  const values = columns.map((col) => {
    const val = updateData[col];
    if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
      return JSON.stringify(val);
    }
    return formatToMySqlDateTime(val);
  });

  const sql = `UPDATE \`${collection}\` SET ${setClauses} WHERE \`id\` = ?;`;
  await pool.query(sql, [...values, id]);

  const updated = await dbGetOne<T>(collection, id);
  if (!updated) throw new Error(`Record ${id} not found after update in ${collection}`);
  return updated;
}

export async function dbDelete(
  collection: string,
  id: string
): Promise<boolean> {
  const sql = `DELETE FROM \`${collection}\` WHERE \`id\` = ?;`;
  const [result] = await pool.query(sql, [id]);
  return (result as any).affectedRows > 0;
}

export async function dbFetch<T = any>(
  collectionName: string,
  queryOptions: Record<string, any> = {}
): Promise<T[]> {
  return dbGet<T>(collectionName, queryOptions.filter, queryOptions.sort, queryOptions.limit);
}

export async function dbQuery<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const [rows] = await pool.query(sql, params);
  return rows as T[];
}

export async function dbDeleteWhere(collection: string, field: string, value: any): Promise<number> {
  const sql = `DELETE FROM \`${collection}\` WHERE \`${field}\` = ?;`;
  const [result] = await pool.query(sql, [value]);
  return (result as any).affectedRows || 0;
}

export async function dbBulkCreate(collection: string, records: Record<string, any>[]): Promise<number> {
  if (!records || records.length === 0) return 0;
  
  const CHUNK_SIZE = 500;
  let totalInserted = 0;

  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    const chunk = records.slice(i, i + CHUNK_SIZE);
    if (chunk.length === 0) continue;

    const firstRecord = chunk[0];
    const columns = Object.keys(firstRecord);
    const colNames = columns.map(c => `\`${c}\``).join(', ');
    
    const rowPlaceholders = chunk.map(() => `(${columns.map(() => '?').join(', ')})`).join(', ');
    const sql = `INSERT INTO \`${collection}\` (${colNames}) VALUES ${rowPlaceholders};`;
    
    const values: any[] = [];
    for (const record of chunk) {
      for (const col of columns) {
        const val = record[col];
        if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
          values.push(JSON.stringify(val));
        } else {
          values.push(formatToMySqlDateTime(val));
        }
      }
    }

    const [result] = await pool.query(sql, values);
    totalInserted += (result as any).affectedRows || 0;
  }

  return totalInserted;
}
