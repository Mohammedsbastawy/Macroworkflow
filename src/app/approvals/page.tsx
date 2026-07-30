"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchAllRequestsAction } from "@/app/actions/workflowActions";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function ApprovalsPage() {
  const { lang } = useLanguage();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllRequestsAction().then((res) => {
      setRequests(res.requests || []);
      setLoading(false);
    });
  }, []);

  const pending = requests.filter((r) => r.status === "pending" || r.status === "in_progress");
  const approved = requests.filter((r) => r.status === "approved");
  const urgent = pending.filter((r) => r.priority === "urgent" || r.priority === "high" || r.priority === "HIGH");

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 60 }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">{lang === "ar" ? "قائمة الاعتمادات والقرارات" : "Pending Approvals"}</h1>
          <p className="page-subtitle">
            {lang === "ar"
              ? "استعرض كافة المعاملات والطلبات المسندة إليك لاتخاذ القرار"
              : "Requests assigned requiring your decision"}
          </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="kpi-grid" style={{ marginBottom: 24 }}>
        {[
          { icon: "⏳", color: "amber", value: String(pending.length), label: lang === "ar" ? "معاملات تنتظر قرارك" : "Pending Approvals" },
          { icon: "🔴", color: "red", value: String(urgent.length), label: lang === "ar" ? "طلبات عاجلة / أولوية قصوى" : "Urgent / High Priority" },
          { icon: "✅", color: "green", value: String(approved.length), label: lang === "ar" ? "طلبات معتمدة" : "Approved Requests" },
        ].map((k) => (
          <div key={k.label} className="kpi-card">
            <div className={`kpi-icon ${k.color}`}>{k.icon}</div>
            <div className="kpi-body">
              <div className="kpi-value">{k.value}</div>
              <div className="kpi-label">{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Approvals Content */}
      <div className="card" style={{ padding: 16 }}>
        <div className="card-header" style={{ marginBottom: 16 }}>
          <div className="card-title">{lang === "ar" ? "الطلبات المسندة إليك حالياً" : "Requests Assigned to You"}</div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)" }}>
            ⏳ {lang === "ar" ? "جاري تحميل الاعتمادات..." : "Loading approvals..."}
          </div>
        ) : pending.length === 0 ? (
          <div className="empty-state" style={{ padding: "50px 20px", textAlign: "center" }}>
            <div className="empty-state-icon" style={{ fontSize: 40 }}>✅</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "var(--color-text-primary)", marginTop: 10 }}>
              {lang === "ar" ? "لا يوجد طلبات تنتظر الاعتماد" : "No Pending Approvals"}
            </div>
            <div className="empty-state-text" style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 4 }}>
              {lang === "ar" ? "جميع المعاملات مقفلة ولا يوجد طلبات قيد المراجعة في صندوقك." : "You have no approval requests waiting in your inbox."}
            </div>
          </div>
        ) : (
          <>
            {/* 📱 DEDICATED MOBILE APPROVAL CARDS */}
            <div className="mobile-requests-list" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {pending.map((req) => (
                <div
                  key={req.id}
                  className="card"
                  style={{
                    padding: 16,
                    borderRadius: 14,
                    border: "1px solid var(--color-border)",
                    boxShadow: "var(--shadow-sm)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    background: "#FFFFFF",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "var(--color-primary)",
                          background: "var(--color-primary-light)",
                          padding: "2px 8px",
                          borderRadius: 6,
                        }}
                      >
                        {req.request_number || `#REQ-${req.id.slice(0, 6)}`}
                      </span>
                      <h3 style={{ fontSize: 15, fontWeight: 700, margin: "6px 0 2px" }}>
                        {req.title || "طلب اعتماد"}
                      </h3>
                      <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                        {req.workflow_name || req.category || "عام"}
                      </div>
                    </div>
                    <span className="tag" style={{ background: "#FEF3C7", color: "#92400E", fontWeight: 700 }}>
                      {req.priority || "NORMAL"}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingTop: 10,
                      borderTop: "1px dashed var(--color-border-light)",
                      fontSize: 12,
                    }}
                  >
                    <span style={{ color: "var(--color-warning)", fontWeight: 600 }}>
                      ⏱ OLA: {new Date(req.ola_deadline || Date.now() + 4 * 3600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <Link href={`/requests/${req.id}`}>
                      <button className="btn btn-primary btn-sm" style={{ padding: "8px 16px", fontWeight: 700 }}>
                        {lang === "ar" ? "مراجعة واتخاذ القرار ←" : "Review & Decide →"}
                      </button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* 💻 DESKTOP APPROVALS TABLE */}
            <div className="desktop-requests-table">
              <div className="table-wrap">
                <table className="table" style={{ width: "100%" }}>
                  <thead>
                    <tr style={{ background: "var(--color-bg)", textAlign: "left" }}>
                      <th style={{ padding: 12 }}>{lang === "ar" ? "رقم المعاملة" : "Request #"}</th>
                      <th style={{ padding: 12 }}>{lang === "ar" ? "عنوان الطلب" : "Title"}</th>
                      <th style={{ padding: 12 }}>{lang === "ar" ? "الأولوية" : "Priority"}</th>
                      <th style={{ padding: 12 }}>{lang === "ar" ? "مهلة اتفاقية الخدمة (OLA)" : "OLA Deadline"}</th>
                      <th style={{ padding: 12, textAlign: "right" }}>{lang === "ar" ? "القرار" : "Action"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending.map((req) => (
                      <tr key={req.id} style={{ borderBottom: "1px solid var(--color-border-light)" }}>
                        <td style={{ padding: 12, fontWeight: 700, color: "var(--color-primary)" }}>
                          {req.request_number || `#REQ-${req.id.slice(0, 6)}`}
                        </td>
                        <td style={{ padding: 12, fontWeight: 600 }}>{req.title}</td>
                        <td style={{ padding: 12 }}>
                          <span className="tag">{req.priority || "NORMAL"}</span>
                        </td>
                        <td style={{ padding: 12 }}>
                          <span style={{ fontSize: 12, color: "var(--color-warning)", fontWeight: 600 }}>
                            ⏱ {new Date(req.ola_deadline || Date.now() + 4 * 3600000).toLocaleTimeString()}
                          </span>
                        </td>
                        <td style={{ padding: 12, textAlign: "right" }}>
                          <Link href={`/requests/${req.id}`}>
                            <button className="btn btn-primary btn-sm">
                              {lang === "ar" ? "مراجعة والبت ←" : "Review →"}
                            </button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
