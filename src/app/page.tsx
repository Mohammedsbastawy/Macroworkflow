"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchAllRequestsAction } from "@/app/actions/workflowActions";
import { SYSTEM_USERS, SystemUser } from "@/lib/engine/iamStore";
import { SimplifiedPortal } from "@/components/portal/SimplifiedPortal";

export default function HomeDashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<SystemUser>(SYSTEM_USERS[0]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    try {
      const { fetchSystemUsersAction } = await import("@/app/actions/workflowActions");
      const dbUsers = await fetchSystemUsersAction();
      const savedId = localStorage.getItem("simulated_user_id");
      if (savedId) {
        const found = dbUsers.find((u: any) => u.id === savedId) || dbUsers[0];
        if (found) setCurrentUser(found as any);
      } else if (dbUsers.length > 0) {
        setCurrentUser(dbUsers[0] as any);
      }
    } catch (e) {
      console.error(e);
    }

    try {
      const res = await fetchAllRequestsAction();
      setRequests(res?.requests || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    setMounted(true);
    loadData();
    const handleSwitch = () => loadData();
    window.addEventListener("user-simulated-switch", handleSwitch);
    return () => window.removeEventListener("user-simulated-switch", handleSwitch);
  }, []);

  if (!mounted) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)" }}>
        ⏳ Loading Dashboard...
      </div>
    );
  }

  // Standard Employees get the Simplified Self-Service Portal View!
  if (currentUser.role === "standard") {
    return <SimplifiedPortal />;
  }

  // Admin & Approvers get the Full Enterprise Analytics Dashboard
  const pendingApprovals = requests.filter((r) => r.status === "pending" || r.status === "pending_info");
  const approvedTotal = requests.filter((r) => r.status === "approved" || r.status === "solved").length;
  const totalCount = requests.length;

  return (
    <>
      {/* Header Banner */}
      <div className="page-header" style={{ marginBottom: 24 }} suppressHydrationWarning>
        <div>
          <h1 className="page-title">Enterprise Dashboard</h1>
          <p className="page-subtitle" suppressHydrationWarning>
            Welcome back, {currentUser.name} · Role: {currentUser.role.toUpperCase()}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/portal">
            <button className="btn btn-outline">✨ Self-Service Portal View</button>
          </Link>
          <Link href="/requests/new">
            <button className="btn btn-primary">＋ New Request</button>
          </Link>
        </div>
      </div>

      {/* KPI Summary Grid */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon blue">⚡</div>
          <div className="kpi-body">
            <div className="kpi-value">{totalCount}</div>
            <div className="kpi-label">Total System Requests</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon amber">⏱</div>
          <div className="kpi-body">
            <div className="kpi-value">{pendingApprovals.length}</div>
            <div className="kpi-label">Pending Approvals</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon green">✅</div>
          <div className="kpi-body">
            <div className="kpi-value">{approvedTotal}</div>
            <div className="kpi-label">Approved & Solved</div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon purple">📊</div>
          <div className="kpi-body">
            <div className="kpi-value">98.4%</div>
            <div className="kpi-label">SLA Compliance Rate</div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginTop: 24 }}>
        {/* Pending Approvals Table */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">⚡ Pending Approvals Requiring Action</div>
            <Link href="/approvals">
              <button className="btn btn-ghost btn-sm">View All →</button>
            </Link>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ticket ID</th>
                  <th>Title & Requester</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingApprovals.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: 30, color: "var(--color-text-muted)" }}>
                      🎉 No pending approval requests in your queue.
                    </td>
                  </tr>
                ) : (
                  pendingApprovals.slice(0, 5).map((req) => (
                    <tr key={req.id}>
                      <td style={{ fontWeight: 700 }}>{req.request_number}</td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{req.title}</div>
                        <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{req.requester_id}</div>
                      </td>
                      <td>
                        <span className="badge urgent">{req.priority}</span>
                      </td>
                      <td>
                        <span className={`badge ${req.status}`}>{req.status}</span>
                      </td>
                      <td>
                        <Link href={`/requests/${req.id}`}>
                          <button className="btn btn-primary btn-sm">Review →</button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick System Shortcuts */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">🚀 Quick Actions</div>
          </div>
          <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Link href="/portal">
              <button className="btn btn-primary btn-full" style={{ justifyContent: "flex-start" }}>
                ✨ Open Self-Service Portal View
              </button>
            </Link>
            <Link href="/workflows">
              <button className="btn btn-outline btn-full" style={{ justifyContent: "flex-start" }}>
                📂 Browse Service Catalog
              </button>
            </Link>
            <Link href="/workflows/form-builder">
              <button className="btn btn-outline btn-full" style={{ justifyContent: "flex-start" }}>
                ✨ Design New Form (Form Builder)
              </button>
            </Link>
            <Link href="/admin/builder">
              <button className="btn btn-outline btn-full" style={{ justifyContent: "flex-start" }}>
                🔧 Open Visual Workflow Builder
              </button>
            </Link>
            <Link href="/admin/profiles">
              <button className="btn btn-outline btn-full" style={{ justifyContent: "flex-start" }}>
                🛡️ Manage Profile Setup & IAM
              </button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
