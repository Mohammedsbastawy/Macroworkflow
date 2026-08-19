"use server";

import { revalidatePath } from "next/cache";
import { encryptSecret } from "@/lib/security/encryption";

export interface ApiIntegration {
  id: string;
  name: string;
  provider?: string;
  auth_type?: string;
  endpoint_url: string;
  http_method?: string;
  request_body_template?: string;
  config_json?: any;
  auth_headers_json?: string;
  allowed_roles_json?: string;
  allowed_users_json?: string;
  is_active: number | boolean;
}

export interface ApiEndpoint {
  id: string;
  integration_id: string;
  name: string;
  http_method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  response_display_path?: string;
  description?: string;
  is_active: number | boolean;
  integration_name?: string;
}

// ── CRUD OPERATIONS FOR ADMIN ──

export async function fetchAllIntegrationsAction() {
  const { dbQuery } = await import("@/lib/db/mysqlClient");
  try {
    const rows = await dbQuery("SELECT * FROM api_integrations ORDER BY created_at DESC");
    return rows;
  } catch (error) {
    console.error("Failed to fetch integrations:", error);
    return [];
  }
}

export async function saveIntegrationAction(payload: Partial<ApiIntegration>) {
  const { dbQuery } = await import("@/lib/db/mysqlClient");
  try {
    if (!payload.id) {
      payload.id = "api-" + Math.random().toString(36).substring(2, 9);
    }

    const provider = payload.provider || "oracle_fusion";
    const authType = payload.auth_type || "jwt_rs256";
    const httpMethod = (payload.http_method || "GET").toUpperCase();
    const bodyTemplate = payload.request_body_template || null;

    // Encrypt private_key inside config_json if present
    let configObj: any = payload.config_json || {};
    if (typeof configObj === "string") {
      try { configObj = JSON.parse(configObj); } catch { configObj = {}; }
    }
    if (configObj.private_key && !configObj.private_key.startsWith("AES256GCM:")) {
      configObj.private_key = encryptSecret(configObj.private_key);
    }
    const configJsonStr = JSON.stringify(configObj);

    // Check if exists
    const existing = await dbQuery("SELECT id FROM api_integrations WHERE id = ?", [payload.id]);

    if (existing.length > 0) {
      await dbQuery(
        `UPDATE api_integrations SET 
          name = ?, 
          provider = ?,
          auth_type = ?,
          endpoint_url = ?, 
          http_method = ?,
          request_body_template = ?,
          config_json = ?,
          auth_headers_json = ?, 
          allowed_roles_json = ?, 
          allowed_users_json = ?, 
          is_active = ? 
        WHERE id = ?`,
        [
          payload.name,
          provider,
          authType,
          payload.endpoint_url,
          httpMethod,
          bodyTemplate,
          configJsonStr,
          payload.auth_headers_json || null,
          payload.allowed_roles_json || "[]",
          payload.allowed_users_json || "[]",
          payload.is_active ? 1 : 0,
          payload.id
        ]
      );
    } else {
      await dbQuery(
        `INSERT INTO api_integrations 
          (id, name, provider, auth_type, endpoint_url, http_method, request_body_template, config_json, auth_headers_json, allowed_roles_json, allowed_users_json, is_active) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          payload.id,
          payload.name,
          provider,
          authType,
          payload.endpoint_url,
          httpMethod,
          bodyTemplate,
          configJsonStr,
          payload.auth_headers_json || null,
          payload.allowed_roles_json || "[]",
          payload.allowed_users_json || "[]",
          payload.is_active ? 1 : 0
        ]
      );
    }
    revalidatePath("/admin/integrations");
    return { success: true, id: payload.id };
  } catch (error: any) {
    console.error("Failed to save integration:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteIntegrationAction(id: string) {
  const { dbQuery } = await import("@/lib/db/mysqlClient");
  try {
    await dbQuery("DELETE FROM api_integrations WHERE id = ?", [id]);
    revalidatePath("/admin/integrations");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete integration:", error);
    return { success: false, error: error.message };
  }
}

// ── EXECUTION & PROXY ROUTE ──

export async function executeIntegrationAction(integrationId: string, queryParam: string, currentUserId: string, currentUserRole: string) {
  const { dbQuery } = await import("@/lib/db/mysqlClient");
  try {
    const rows = await dbQuery("SELECT * FROM api_integrations WHERE id = ? AND is_active = 1", [integrationId]);
    const api = rows[0];
    if (!api) {
      throw new Error("API Integration not found or inactive.");
    }

    // Check Permissions
    let roles: string[] = [];
    let users: string[] = [];
    try { roles = JSON.parse(api.allowed_roles_json || "[]"); } catch (e) {}
    try { users = JSON.parse(api.allowed_users_json || "[]"); } catch (e) {}

    const hasRoleAccess = roles.includes(currentUserRole) || roles.includes("admin");
    const hasUserAccess = users.includes(currentUserId);

    if (!hasRoleAccess && !hasUserAccess) {
      throw new Error("Access Denied: You do not have permission to execute this API.");
    }

    // If provider is oracle_fusion or auth_type is jwt_rs256, delegate to OracleFusionClient
    if (api.provider === "oracle_fusion" || api.auth_type === "jwt_rs256") {
      const { OracleFusionClient } = await import("@/lib/integrations/oracle/OracleFusionClient");
      const client = new OracleFusionClient();
      const items = await client.searchItems(integrationId, queryParam);
      return { success: true, data: { items } };
    }

    // Fallback generic REST fetch
    let headers: Record<string, string> = {};
    try {
      if (api.auth_headers_json) {
        headers = JSON.parse(api.auth_headers_json);
      }
    } catch (e) {}

    headers["Content-Type"] = "application/json";
    headers["Accept"] = "application/json";

    const method = (api.http_method || "GET").toUpperCase();
    const finalUrl = api.endpoint_url
      .replace("{query}", encodeURIComponent(queryParam))
      .replace("{itemnumber}", encodeURIComponent(queryParam));

    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    if (["POST", "PUT", "PATCH"].includes(method)) {
      if (api.request_body_template) {
        fetchOptions.body = api.request_body_template
          .replace(/{query}/g, queryParam)
          .replace(/{itemnumber}/g, queryParam);
      } else {
        fetchOptions.body = JSON.stringify({ query: queryParam, itemNumber: queryParam });
      }
    }

    const response = await fetch(finalUrl, fetchOptions);

    if (!response.ok) {
      return { success: false, error: `External API returned status: ${response.status}` };
    }

    const data = await response.json();
    return { success: true, data };

  } catch (error: any) {
    console.error("Execute integration error:", error);
    return { success: false, error: error.message };
  }
}

// ── ENDPOINTS MANAGEMENT ──

export async function ensureApiEndpointsTable() {
  const { dbQuery } = await import("@/lib/db/mysqlClient");
  try {
    await dbQuery(`
      CREATE TABLE IF NOT EXISTS api_endpoints (
        id VARCHAR(64) PRIMARY KEY,
        integration_id VARCHAR(64) NOT NULL,
        name VARCHAR(255) NOT NULL,
        http_method VARCHAR(10) NOT NULL DEFAULT 'GET',
        path TEXT NOT NULL,
        response_display_path VARCHAR(255) DEFAULT NULL,
        description TEXT DEFAULT NULL,
        is_active TINYINT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_integration (integration_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  } catch (err) {
    console.error("Failed to create api_endpoints table:", err);
  }
}

export async function fetchEndpointsForIntegrationAction(integrationId?: string) {
  const { dbQuery } = await import("@/lib/db/mysqlClient");
  await ensureApiEndpointsTable();
  try {
    if (integrationId) {
      const rows = await dbQuery(
        "SELECT * FROM api_endpoints WHERE integration_id = ? ORDER BY created_at DESC",
        [integrationId]
      );
      return rows;
    } else {
      const rows = await dbQuery(
        "SELECT e.*, i.name as integration_name FROM api_endpoints e LEFT JOIN api_integrations i ON e.integration_id = i.id WHERE e.is_active = 1 ORDER BY i.name ASC, e.name ASC"
      );
      return rows;
    }
  } catch (error) {
    console.error("Failed to fetch endpoints:", error);
    return [];
  }
}

export async function saveEndpointAction(payload: Partial<ApiEndpoint>) {
  const { dbQuery } = await import("@/lib/db/mysqlClient");
  await ensureApiEndpointsTable();
  try {
    if (!payload.id) {
      payload.id = "ep-" + Math.random().toString(36).substring(2, 9);
    }
    const existing = await dbQuery("SELECT id FROM api_endpoints WHERE id = ?", [payload.id]);
    if (existing.length > 0) {
      await dbQuery(
        `UPDATE api_endpoints SET 
          integration_id = ?,
          name = ?, 
          http_method = ?,
          path = ?, 
          response_display_path = ?,
          description = ?,
          is_active = ? 
        WHERE id = ?`,
        [
          payload.integration_id,
          payload.name,
          (payload.http_method || "GET").toUpperCase(),
          payload.path,
          payload.response_display_path || null,
          payload.description || null,
          payload.is_active ? 1 : 0,
          payload.id
        ]
      );
    } else {
      await dbQuery(
        `INSERT INTO api_endpoints 
          (id, integration_id, name, http_method, path, response_display_path, description, is_active) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          payload.id,
          payload.integration_id,
          payload.name,
          (payload.http_method || "GET").toUpperCase(),
          payload.path,
          payload.response_display_path || null,
          payload.description || null,
          payload.is_active ? 1 : 0
        ]
      );
    }
    revalidatePath("/admin/integrations");
    return { success: true, id: payload.id };
  } catch (error: any) {
    console.error("Failed to save endpoint:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteEndpointAction(id: string) {
  const { dbQuery } = await import("@/lib/db/mysqlClient");
  await ensureApiEndpointsTable();
  try {
    await dbQuery("DELETE FROM api_endpoints WHERE id = ?", [id]);
    revalidatePath("/admin/integrations");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete endpoint:", error);
    return { success: false, error: error.message };
  }
}
