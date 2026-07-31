"use client";

import React, { useState, useEffect } from "react";
import { fetchOrgHierarchyAction, saveDepartmentAction } from "@/app/actions/workflowActions";
import { SYSTEM_USERS } from "@/lib/engine/iamStore";

export default function OrgChartPage() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrgHierarchyAction()
      .then((data) => setDepartments(data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDeptId, setEditingDeptId] = useState("");
  const [deptName, setDeptName] = useState("");
  const [deptCode, setDeptCode] = useState("");
  const [deptManagerId, setDeptManagerId] = useState("");
  const [deptParentId, setDeptParentId] = useState<string | null>(null);

  const handleSaveDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim()) return;
    setLoading(true);
    try {
      await saveDepartmentAction({
        id: editingDeptId,
        name: deptName,
        code: deptCode || deptName.substring(0, 3).toUpperCase(),
        head_user_id: deptManagerId || undefined,
        parent_department_id: deptParentId || null
      });
      const data = await fetchOrgHierarchyAction();
      setDepartments(data || []);
      setShowEditModal(false);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const apexDept = departments.find((d) => !d.parent_department_id) || departments[0];
  const childDepts = departments.filter((d) => d.id !== apexDept?.id);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">🏢 Enterprise Org Chart (الهيكل التنظيمي للشركة)</h1>
          <p className="page-subtitle">Parent/Child Self-Referencing Department Tree & Direct Manager Hierarchy</p>
        </div>
        <span className="badge primary">Dynamic Database Tree</span>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)" }}>Loading Enterprise Org Chart...</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24, alignItems: "center" }}>
          
          {/* APEX LEVEL: CEO / EXECUTIVE BOARD */}
          {apexDept && (
            <div
              className="card"
              style={{
                width: 380,
                border: "2px solid #4F46E5",
                background: "linear-gradient(135deg, rgba(79,70,229,0.1), rgba(79,70,229,0.02))",
                textAlign: "center",
                boxShadow: "0 8px 24px rgba(79,70,229,0.15)"
              }}
            >
              <div className="card-body">
                <div className="badge primary" style={{ fontSize: 10, marginBottom: 8 }}>👑 APEX LEVEL (قمة الهيكل)</div>
                <h3 style={{ fontSize: 18, fontWeight: 900, margin: "4px 0" }}>{apexDept.name}</h3>
                <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Code: {apexDept.code || "EXEC"}</div>
                
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px dashed rgba(79,70,229,0.3)" }}>
                  <div style={{ fontSize: 10, color: "var(--color-text-muted)", fontWeight: 700 }}>Head / Manager</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "var(--color-primary)", marginTop: 2 }}>
                    👤 {SYSTEM_USERS.find(u => u.id === apexDept.head_user_id)?.name || "Unassigned"}
                  </div>
                  <button
                    className="btn btn-outline btn-xs"
                    onClick={() => {
                      setEditingDeptId(apexDept.id);
                      setDeptName(apexDept.name);
                      setDeptCode(apexDept.code || "");
                      setDeptManagerId(apexDept.head_user_id || "");
                      setDeptParentId(apexDept.parent_department_id || null);
                      setShowEditModal(true);
                    }}
                    style={{ marginTop: 10, fontSize: 10, padding: "2px 8px" }}
                  >
                    ✏️ Edit Structure
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* CONNECTING LINE */}
          <div style={{ width: 2, height: 30, background: "#4F46E5" }} />

          {/* SUB-DEPARTMENTS LEVEL GRID */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, width: "100%" }}>
            {childDepts.map((dept) => {
              const deptManager = SYSTEM_USERS.find((u) => u.id === dept.head_user_id || u.department_id === dept.id);
              const deptStaff = SYSTEM_USERS.filter((u) => u.department_id === dept.id);

              return (
                <div key={dept.id} className="card" style={{ borderTop: "4px solid #3B82F6" }}>
                  <div className="card-header" style={{ display: "between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800 }}>📂 {dept.name}</div>
                      <div style={{ fontSize: 10, color: "var(--color-text-muted)" }}>Parent: {apexDept?.name || "Executive"}</div>
                    </div>
                    <span className="tag">{dept.code}</span>
                  </div>

                  <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ background: "var(--color-bg)", padding: 8, borderRadius: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 10, color: "var(--color-text-muted)", fontWeight: 700 }}>🛡️ Department Head (Manager)</div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: "#059669", marginTop: 2 }}>
                          {SYSTEM_USERS.find(u => u.id === dept.head_user_id)?.name || "Unassigned"}
                        </div>
                      </div>
                      <button
                        className="btn btn-outline btn-xs"
                        onClick={() => {
                          setEditingDeptId(dept.id);
                          setDeptName(dept.name);
                          setDeptCode(dept.code || "");
                          setDeptManagerId(dept.head_user_id || "");
                          setDeptParentId(dept.parent_department_id || null);
                          setShowEditModal(true);
                        }}
                        style={{ fontSize: 10, padding: "2px 8px" }}
                      >
                        ✏️ Edit
                      </button>
                    </div>

                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", marginBottom: 6 }}>
                        👥 Staff & Direct Reports ({deptStaff.length})
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {deptStaff.map((staff) => {
                          const directMgr = SYSTEM_USERS.find((u) => u.id === staff.direct_manager_id);
                          return (
                            <div
                              key={staff.id}
                              style={{
                                fontSize: 11,
                                padding: "6px 8px",
                                background: "var(--color-surface)",
                                borderRadius: 6,
                                border: "1px solid var(--color-border)",
                              }}
                            >
                              <div style={{ fontWeight: 700, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span>{staff.name}</span>
                                {staff.unit && (
                                  <span className="tag" style={{ fontSize: 9, background: "#FFFBEB", color: "#D97706", borderColor: "#FCD34D" }}>
                                    🏷️ {staff.unit}
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: 10, color: "var(--color-text-muted)", marginTop: 2 }}>
                                {staff.job_title || "Specialist"} {directMgr ? `(Direct Mgr: ${directMgr.name.split(" ")[0]})` : ""}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* Edit Department Modal */}
      {showEditModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div className="card" style={{ width: "100%", maxWidth: 440, boxShadow: "var(--shadow-lg)" }}>
            <div className="card-header">
              <div className="card-title">🏢 Edit Department Structure</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveDepartment}>
              <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Department Name <span className="required">*</span></label>
                  <input className="form-control" value={deptName} onChange={(e) => setDeptName(e.target.value)} required />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Code / Abbreviation</label>
                  <input className="form-control" value={deptCode} onChange={(e) => setDeptCode(e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Department Manager / Head</label>
                  <select className="form-control" value={deptManagerId} onChange={(e) => setDeptManagerId(e.target.value)}>
                    <option value="">-- Unassigned --</option>
                    {SYSTEM_USERS.map((u) => (
                      <option key={u.id} value={u.id}>
                        👤 {u.name} ({u.job_title || 'Employee'})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Parent Department (Rewire hierarchy)</label>
                  <select
                    className="form-control"
                    value={deptParentId || ""}
                    onChange={(e) => setDeptParentId(e.target.value || null)}
                  >
                    <option value="">-- No Parent / Apex Level --</option>
                    {departments.filter(d => d.id !== editingDeptId).map((d) => (
                      <option key={d.id} value={d.id}>
                        🏢 {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ padding: "12px 20px", borderTop: "1px solid var(--color-border)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Structure</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
