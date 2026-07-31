"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchAllRequestsAction } from "@/app/actions/workflowActions";
import { SYSTEM_USERS, SystemUser } from "@/lib/engine/iamStore";
import { SimplifiedPortal } from "@/components/portal/SimplifiedPortal";

import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function HomeDashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState<SystemUser>(SYSTEM_USERS[0]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  // Hooks must be called unconditionally — move i18n hook near the top to avoid changing hook order across renders
  const { t } = useLanguage();

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

  // Self-service Employees get the Simplified Self-Service Portal View!
  if (currentUser.role === "selfservice") {
    return <SimplifiedPortal />;
  }

  // Admin users get the Full Enterprise Analytics Dashboard
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
            <div className="kpi-label">Requests Awaiting Action</div>
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
      <div className="main-grid">
        {/* Pending Approvals Table */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">{t('requests','requests','الطلبات')}</div>
            <Link href="/requests">
              <button className="btn btn-ghost btn-sm">View All →</button>
            </Link>
          </div>
          <div className="table-wrap">
            <table className="responsive-table">
              <thead>
                <tr>
                  <th>{t('hdrTicketId','Ticket ID','معرّف التذكرة')}</th>
                  <th>{t('hdrTitleRequester','Title & Requester','العنوان والمُقدّم')}</th>
                  <th>{t('hdrPriority','Priority','الأولوية')}</th>
                  <th>{t('hdrStatus','Status','الحالة')}</th>
                  <th>{t('hdrAction','Action','إجراء')}</th>
                </tr>
              </thead>
              <tbody>
                {pendingApprovals.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: 30, color: "var(--color-text-muted)" }}>
                      🎉 {t('noPending','No pending approval requests in your queue.','لا توجد طلبات انتظار في قائمة الاعتماد الخاصة بك.')}
                    </td>
                  </tr>
                ) : (
                  pendingApprovals.slice(0, 5).map((req) => (
                    <tr key={req.id}>
                      <td data-label={t('hdrTicketId','Ticket ID','معرّف التذكرة')} className="td-req-number">{req.request_number}</td>
                      <td data-label={t('hdrTitleRequester','Title & Requester','العنوان والمُقدّم')}>
                        <div className="td-title" style={{ fontWeight: 600, fontSize: 13 }}>{req.title}</div>
                        <div className="td-sub" style={{ fontSize: 11 }}>{req.requester_id}</div>
                      </td>
                      <td data-label={t('hdrPriority','Priority','الأولوية')}>
                        <span className="badge urgent">{req.priority}</span>
                      </td>
                      <td data-label={t('hdrStatus','Status','الحالة')}>
                        <span className={`badge ${req.status}`}>{req.status}</span>
                      </td>
                      <td data-label={t('hdrAction','Action','إجراء')} className="td-actions">
                        <Link href={`/requests/${req.id}`}>
                          <button className="btn btn-primary btn-sm">{t('btnReview','Review →','عرض')}</button>
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
