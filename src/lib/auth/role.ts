/**
 * Map legacy / stored roles to the canonical app roles.
 */
export function normalizeRole(role: string): string {
  const cleaned = String(role || "").replace(/^role-/, "");
  switch (cleaned) {
    case "standard":
      return "selfservice";
    case "approver":
      return "agent";
    default:
      return cleaned;
  }
}

export function normalizeRoles(roles?: unknown): string[] {
  if (Array.isArray(roles)) {
    return roles.map((r) => normalizeRole(String(r)));
  }
  return [];
}
