"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchAllRequestsAction } from "@/app/actions/workflowActions";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export default function MyRequestsPage() {
  const { lang, t } = useLanguage();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    fetchAllRequestsAction().then((res) => {
      setRequests(res.requests || []);
      setLoading(false);
    });
  }, []);

  const filteredRequests = requests.filter((r) => {
    if (filterStatus === "all") return true;
    return r.status === filterStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return { label: lang === "ar" ? "تم الاعتماد" : "Approved", bg: "#DEF7EC", color: "#03543F" };
      case "rejected":
        return { label: lang === "ar" ? "مرفوض" : "Rejected", bg: "#FDE8E8", color: "#9B1C1C" };
      case "in_progress":
      case "pending":
        return { label: lang === "ar" ? "قيد المراجعة" : "In Progress", bg: "#FEF08A", color: "#713F12" };
      case "returned_for_revision":
        return { label: lang === "ar" ? "معاد للتعديل" : "Returned", bg: "#E1EFFE", color: "#1E429F" };
      default:
        return { label: status, bg: "#F3F4F6", color: "#374151" };
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 60 }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div>
          <h1 className="page-title">{lang === "ar" ? "سجل طلباتي وقائمة المتابعة" : "My Requests"}</h1>
          <p className="page-subtitle">
            {lang === "ar"
              ? "استعرض كافة الطلبات المقدمة، حالات الاعتماد، وتتبع مسار كل طلب"
              : "Track all submitted workflow requests and approval statuses"}
          </p>
        </div>
        <Link href="/requests/new">
          <button className="btn btn-primary">
            ＋ {lang === "ar" ? "تقديم طلب جديد" : "New Request"}
          </button>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 16,
          overflowX: "auto",
          paddingBottom: 4,
          WebkitOverflowScrolling: "touch",
        }}
      >
        {[
          { id: "all", labelAr: "كافة الطلبات", labelEn: "All Requests" },
          { id: "in_progress", labelAr: "قيد التنفيذ", labelEn: "In Progress" },
          { id: "approved", labelAr: "المعتمدة", labelEn: "Approved" },
          { id: "rejected", labelAr: "المرفوضة", labelEn: "Rejected" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterStatus(tab.id)}
            className={`btn ${filterStatus === tab.id ? "btn-primary" : "btn-outline"}`}
            style={{
              padding: "6px 14px",
              fontSize: 12,
              borderRadius: 20,
              whiteSpace: "nowrap",
            }}
          >
            {lang === "ar" ? tab.labelAr : tab.labelEn}
          </button>
        ))}
      </div>

      {/* Content Section */}
      {loading ? (
        <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)" }}>
          ⏳ {lang === "ar" ? "جاري تحميل الطلبات..." : "Loading requests..."}
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="card empty-state" style={{ padding: "50px 20px" }}>
          <div className="empty-state-icon" style={{ fontSize: 40 }}>📄</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "var(--color-text-primary)", marginTop: 10 }}>
            {lang === "ar" ? "لا يوجد طلبات حالية" : "No Submissions Found"}
          </div>
          <div className="empty-state-text" style={{ fontSize: 13, color: "var(--color-text-secondary)", marginTop: 4 }}>
            {lang === "ar" ? "لم تقم بتقديم أي طلبات في هذه الفئة بعد." : "You haven't submitted any requests in this view yet."}
          </div>
          <div style={{ marginTop: 16 }}>
            <Link href="/requests/new">
              <button className="btn btn-primary">＋ {lang === "ar" ? "تقديم طلب الآن" : "Submit a Request"}</button>
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* 📱 DEDICATED MOBILE REQUEST CARDS (Visible on Mobile Screens) */}
          <div className="mobile-requests-list" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filteredRequests.map((req) => {
              const badge = getStatusBadge(req.status);
              return (
                <div
                  key={req.id}
                  className="card mobile-req-card"
                  style={{
                    padding: 16,
                    borderRadius: 14,
                    border: "1px solid var(--color-border)",
                    boxShadow: "var(--shadow-sm)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    background: "#FFFFFF",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
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
                      <h3 style={{ fontSize: 15, fontWeight: 700, margin: "6px 0 2px", color: "var(--color-text-primary)" }}>
                        {req.title || "طلب بدون عنوان"}
                      </h3>
                      <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                        {req.workflow_name || req.category || "عام"}
                      </div>
                    </div>
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: 12,
                        fontSize: 11,
                        fontWeight: 700,
                        backgroundColor: badge.bg,
                        color: badge.color,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {badge.label}
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
                      color: "var(--color-text-muted)",
                    }}
                  >
                    <span>📅 {new Date(req.submitted_at || req.date_created || Date.now()).toLocaleDateString()}</span>
                    <Link href={`/requests/${req.id}`}>
                      <button className="btn btn-outline btn-sm" style={{ padding: "6px 16px", fontWeight: 700 }}>
                        {lang === "ar" ? "عرض والتتبع ←" : "View Details →"}
                      </button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 💻 DESKTOP DATA TABLE (Visible on Larger Screens) */}
          <div className="card desktop-requests-table" style={{ overflow: "hidden", marginTop: 12 }}>
            <div className="table-wrap">
              <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--color-bg)", textAlign: "left" }}>
                    <th style={{ padding: 12 }}>{lang === "ar" ? "رقم الطلب" : "Request #"}</th>
                    <th style={{ padding: 12 }}>{lang === "ar" ? "عنوان الطلب" : "Title"}</th>
                    <th style={{ padding: 12 }}>{lang === "ar" ? "الأولوية" : "Priority"}</th>
                    <th style={{ padding: 12 }}>{lang === "ar" ? "الحالة الحالية" : "Status"}</th>
                    <th style={{ padding: 12 }}>{lang === "ar" ? "تاريخ التقديم" : "Submitted At"}</th>
                    <th style={{ padding: 12, textAlign: "right" }}>{lang === "ar" ? "الإجراء" : "Action"}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((req) => {
                    const badge = getStatusBadge(req.status);
                    return (
                      <tr key={req.id} style={{ borderBottom: "1px solid var(--color-border-light)" }}>
                        <td style={{ padding: 12, fontWeight: 700, color: "var(--color-primary)" }}>
                          {req.request_number || `#REQ-${req.id.slice(0, 6)}`}
                        </td>
                        <td style={{ padding: 12, fontWeight: 600 }}>{req.title}</td>
                        <td style={{ padding: 12 }}>
                          <span className="tag" style={{ fontSize: 11 }}>{req.priority || "NORMAL"}</span>
                        </td>
                        <td style={{ padding: 12 }}>
                          <span
                            style={{
                              padding: "4px 10px",
                              borderRadius: 12,
                              fontSize: 11,
                              fontWeight: 700,
                              backgroundColor: badge.bg,
                              color: badge.color,
                            }}
                          >
                            {badge.label}
                          </span>
                        </td>
                        <td style={{ padding: 12, fontSize: 12, color: "var(--color-text-muted)" }}>
                          {new Date(req.submitted_at || req.date_created || Date.now()).toLocaleString()}
                        </td>
                        <td style={{ padding: 12, textAlign: "right" }}>
                          <Link href={`/requests/${req.id}`}>
                            <button className="btn btn-outline btn-sm">
                              {lang === "ar" ? "عرض التفاصيل →" : "View →"}
                            </button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
