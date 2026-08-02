import { cache } from "react";

export interface SystemSetting {
  key: string;
  value: string;
  description?: string | null;
  updated_at?: string | null;
}

async function loadAll(): Promise<Map<string, SystemSetting>> {
  const { dbGet } = await import("@/lib/db/mysqlClient");
  try {
    const rows = await dbGet<SystemSetting>("system_settings");
    return new Map(rows.map((r) => [r.key, r]));
  } catch (e) {
    console.error("system_settings fetch error:", e);
    return new Map();
  }
}

/**
 * Read a single system setting value (with per-request caching).
 */
export const getSystemSetting = cache(async (key: string): Promise<string | null> => {
  const all = await loadAll();
  return all.get(key)?.value ?? null;
});

/**
 * Read multiple setting values in one pass.
 */
export async function getSystemSettings(keys: string[]): Promise<Record<string, string | null>> {
  const all = await loadAll();
  const out: Record<string, string | null> = {};
  for (const k of keys) out[k] = all.get(k)?.value ?? null;
  return out;
}

/**
 * Upsert a system setting value.
 */
export async function setSystemSetting(key: string, value: string, description?: string): Promise<void> {
  const { dbUpdate, dbCreate } = await import("@/lib/db/mysqlClient");
  try {
    await dbUpdate("system_settings", key, {
      value,
      ...(description ? { description } : {}),
    });
  } catch {
    try {
      await dbCreate("system_settings", {
        key,
        value,
        description: description || `Setting ${key}`,
      });
    } catch (e) {
      console.error("system_settings save error:", e);
    }
  }
}