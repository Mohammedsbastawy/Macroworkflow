"use client";

import React, { useState, useEffect } from "react";
import { fetchOrgHierarchyAction } from "@/app/actions/workflowActions";
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
                    👤 Mona Omar (CFO & Executive Officer)
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CONNECTING LINE */}
          <div style={{ width: 2, height: 30, background: "#4F46E5" }} />

          {/* SUB-DEPARTMENTS LEVEL GRID */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16, width: "100%" }}>
            {childDepts.map((dept) => {
              const deptManager = SYSTEM_USERS.find((u) => u.id === dept.head_user_id || u.department_id === dept.id && u.role === "approver");
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
                    <div style={{ background: "var(--color-bg)", padding: 8, borderRadius: 6 }}>
                      <div style={{ fontSize: 10, color: "var(--color-text-muted)", fontWeight: 700 }}>🛡️ Department Head (Manager)</div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: "#059669", marginTop: 2 }}>
                        {deptManager ? deptManager.name : "Unassigned"}
                      </div>
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
    </div>
  );
}
