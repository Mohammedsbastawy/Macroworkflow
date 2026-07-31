"use client";
import { useState, useEffect } from "react";
import {
  SystemUser,
  Department,
  BusinessGroup,
} from "@/lib/engine/iamStore";
import { AuthGuard } from "@/components/auth/AuthGuard";
import {
  fetchSystemUsersAction,
  saveSystemUserAction,
  fetchOrgHierarchyAction,
  saveDepartmentAction,
  fetchBusinessGroupsAction,
  saveBusinessGroupAction
} from "@/app/actions/workflowActions";

import Link from "next/link";

export default function UsersIamPage() {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [groups, setGroups] = useState<BusinessGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<"users" | "departments" | "groups">("users");
  const [selectedDeptFilter, setSelectedDeptFilter] = useState("all");

  // Add User Modal State
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userDept, setUserDept] = useState("dept-it");
  const [userRole, setUserRole] = useState<"admin" | "selfservice">("selfservice");
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);

  // Add Dept Modal State
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [deptName, setDeptName] = useState("");
  const [deptCode, setDeptCode] = useState("");

  // Add Group Modal State
  const [showAddGroupModal, setShowAddGroupModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupCode, setGroupCode] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const [uRes, dRes, gRes] = await Promise.all([
        fetchSystemUsersAction(),
        fetchOrgHierarchyAction(),
        fetchBusinessGroupsAction(),
      ]);
      setUsers(uRes as any);
      setDepartments(dRes as any);
      setGroups(gRes as any);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !userEmail.trim()) return;

    const initials = userName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();

    const newUserPayload = {
      name: userName,
      email: userEmail,
      department_id: userDept,
      group_ids: selectedGroupIds,
      role: userRole,
      avatar_initials: initials || "US",
    };

    await saveSystemUserAction(newUserPayload);
    setShowAddUserModal(false);
    setUserName("");
    setUserEmail("");
    setSelectedGroupIds([]);
    await loadData();
  };

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptName.trim()) return;

    const newDeptPayload = {
      name: deptName,
      code: deptCode || deptName.substring(0, 3).toUpperCase(),
    };

    await saveDepartmentAction(newDeptPayload);
    setShowAddDeptModal(false);
    setDeptName("");
    setDeptCode("");
    await loadData();
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    const newGroupPayload = {
      name: groupName,
      code: groupCode || groupName.substring(0, 4).toUpperCase(),
      member_user_ids: [],
    };

    await saveBusinessGroupAction(newGroupPayload);
    setShowAddGroupModal(false);
    setGroupName("");
    setGroupCode("");
    await loadData();
  };

  const filteredUsers = users.filter(
    (u) => selectedDeptFilter === "all" || u.department_id === selectedDeptFilter
  );

  return (
    <AuthGuard requiredModule="usersIam" allowRoles={['admin']}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">👥 Users & IAM Management</h1>
          <p className="page-subtitle">Manage organizational hierarchy, Active Directory sync, departments, and business groups</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          {activeTab === "users" && (
            <button className="btn btn-primary" onClick={() => setShowAddUserModal(true)}>
              ＋ Add New User
            </button>
          )}
          {activeTab === "departments" && (
            <button className="btn btn-primary" onClick={() => setShowAddDeptModal(true)}>
              ＋ Add Department
            </button>
          )}
          {activeTab === "groups" && (
            <button className="btn btn-primary" onClick={() => setShowAddGroupModal(true)}>
              ＋ Add Business Group
            </button>
          )}
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, borderBottom: "1px solid var(--color-border)", paddingBottom: 10 }}>
        {[
          { id: "users", label: `👥 System Users (${users.length})` },
          { id: "departments", label: `🏢 Departments (${departments.length})` },
          { id: "groups", label: `👥 Business Groups (${groups.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`btn btn-sm ${activeTab === tab.id ? "btn-primary" : "btn-outline"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: USERS LIST ── */}
      {activeTab === "users" && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">User Accounts Directory</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>Department:</span>
              <select
                className="form-control"
                style={{ fontSize: 12, padding: "4px 8px", width: "auto" }}
                value={selectedDeptFilter}
                onChange={(e) => setSelectedDeptFilter(e.target.value)}
              >
                <option value="all">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User Profile</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Business Groups</th>
                  <th>System Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const dept = departments.find((d) => d.id === u.department_id);
                  const userGroups = groups.filter((g) => u.group_ids.includes(g.id));
                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div className="avatar md a">{u.avatar_initials}</div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>{u.name}</div>
                            <div style={{ fontSize: 10, color: "var(--color-text-muted)", fontFamily: "monospace" }}>{u.id}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{u.email}</td>
                      <td>
                        <span className="tag" style={{ color: "var(--color-primary)", borderColor: "#BFDBFE" }}>
                          🏢 {dept?.name || "Unassigned"}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                          {userGroups.length > 0 ? (
                            userGroups.map((g) => (
                              <span key={g.id} className="tag" style={{ fontSize: 10, background: "#FEF3C7", color: "#B45309" }}>
                                {g.name}
                              </span>
                            ))
                          ) : (
                            <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>None</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${u.role === "admin" ? "urgent" : "draft"}`}>
                          {u.role.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <Link href={`/admin/users/${u.id}`}>
                          <button className="btn btn-outline btn-sm" style={{ fontSize: 11 }}>✏️ تعديل الملف</button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 2: DEPARTMENTS MANAGER ── */}
      {activeTab === "departments" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {departments.map((d) => {
            const headUser = users.find((u) => u.id === d.head_user_id);
            const memberCount = users.filter((u) => u.department_id === d.id).length;
            return (
              <div key={d.id} className="card">
                <div className="card-body">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>🏢 {d.name}</div>
                    <span className="tag">{d.code}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 12 }}>
                    Head of Department: <strong>{headUser?.name || "Unassigned"}</strong>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                    👥 {memberCount} Active Employees
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── TAB 3: BUSINESS GROUPS MANAGER ── */}
      {activeTab === "groups" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {groups.map((g) => {
            const groupMembers = users.filter((u) => u.group_ids.includes(g.id));
            return (
              <div key={g.id} className="card">
                <div className="card-body">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>👥 {g.name}</div>
                    <span className="tag" style={{ background: "#FEF3C7", color: "#B45309" }}>{g.code}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 12 }}>
                    Cross-departmental Membership ({groupMembers.length} members)
                  </div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {groupMembers.map((m) => (
                      <span key={m.id} className="tag" style={{ fontSize: 10 }}>{m.name.split(" ")[0]}</span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div className="card" style={{ width: 440, background: "var(--color-surface)", borderRadius: 12 }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 800, fontSize: 16 }}>👤 Add New System User</div>
              <button className="btn btn-outline btn-sm" onClick={() => setShowAddUserModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input className="form-control" value={userName} onChange={(e) => setUserName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input type="email" className="form-control" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} required />
                </div>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Department</label>
                    <select className="form-control" value={userDept} onChange={(e) => setUserDept(e.target.value)}>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">IAM Role</label>
                    <select className="form-control" value={userRole} onChange={(e) => setUserRole(e.target.value as any)}>
                      <option value="selfservice">Self-Service Employee</option>
                      <option value="admin">System Admin</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Assign Business Groups</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, background: "var(--color-bg)", padding: 10, borderRadius: "var(--radius-md)" }}>
                    {groups.map((g) => (
                      <label key={g.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={selectedGroupIds.includes(g.id)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedGroupIds([...selectedGroupIds, g.id]);
                            else setSelectedGroupIds(selectedGroupIds.filter((id) => id !== g.id));
                          }}
                        />
                        {g.name} ({g.code})
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ padding: "12px 20px", borderTop: "1px solid var(--color-border)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAddUserModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save User Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: ADD DEPARTMENT ── */}
      {showAddDeptModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div className="card" style={{ width: "100%", maxWidth: 440, boxShadow: "var(--shadow-lg)" }}>
            <div className="card-header">
              <div className="card-title">🏢 Add Department</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAddDeptModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateDept}>
              <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Department Name <span className="required">*</span></label>
                  <input className="form-control" placeholder="e.g. Legal & Compliance" value={deptName} onChange={(e) => setDeptName(e.target.value)} required />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Code / Abbreviation</label>
                  <input className="form-control" placeholder="e.g. LGL" value={deptCode} onChange={(e) => setDeptCode(e.target.value)} />
                </div>
              </div>
              <div style={{ padding: "12px 20px", borderTop: "1px solid var(--color-border)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAddDeptModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Department</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: ADD BUSINESS GROUP ── */}
      {showAddGroupModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div className="card" style={{ width: "100%", maxWidth: 440, boxShadow: "var(--shadow-lg)" }}>
            <div className="card-header">
              <div className="card-title">👥 Add Business Group</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAddGroupModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateGroup}>
              <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Group Name <span className="required">*</span></label>
                  <input className="form-control" placeholder="e.g. Steering Committee" value={groupName} onChange={(e) => setGroupName(e.target.value)} required />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Group Code</label>
                  <input className="form-control" placeholder="e.g. STEER_COMM" value={groupCode} onChange={(e) => setGroupCode(e.target.value)} />
                </div>
              </div>
              <div style={{ padding: "12px 20px", borderTop: "1px solid var(--color-border)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAddGroupModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Business Group</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AuthGuard>
  );
}
