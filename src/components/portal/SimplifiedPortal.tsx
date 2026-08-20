"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { fetchAuthorizedCatalogWorkflowsAction, fetchMyRequestsAction } from "@/app/actions/workflowActions";
import { SYSTEM_USERS, SystemUser } from "@/lib/engine/iamStore";
import { useLanguage } from "@/lib/i18n/LanguageContext";

export function SimplifiedPortal() {
  const { lang } = useLanguage();
  const [activeTab, setActiveTab] = useState<"categories" | "my_requests">("categories");
  const [currentUser, setCurrentUser] = useState<SystemUser>(SYSTEM_USERS[1]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPortalData = async () => {
    const savedId = typeof window !== "undefined" ? localStorage.getItem("simulated_user_id") : null;
    const rawUser = typeof window !== "undefined" ? localStorage.getItem("system_user") : null;
    let user = SYSTEM_USERS[1];

    if (rawUser) {
      try {
        const parsed = JSON.parse(rawUser);
        if (parsed && (!savedId || parsed.id === savedId)) {
          user = parsed;
        }
      } catch (e) {}
    }

    if (savedId && user.id !== savedId) {
      const found = SYSTEM_USERS.find((u) => u.id === savedId);
      if (found) user = found;
    }
    setCurrentUser(user);

    try {
      const forms = await fetchAuthorizedCatalogWorkflowsAction(user.id);
      if (forms && forms.length > 0) {
        setWorkflows(forms);
      } else {
        setWorkflows([]);
      }

      const reqRes = await fetchMyRequestsAction(user.id);
      if (reqRes?.requests) {
        setMyRequests(reqRes.requests);
      } else {
        setMyRequests([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortalData();
    const handleSwitch = () => loadPortalData();
    window.addEventListener("user-simulated-switch", handleSwitch);
    window.addEventListener("system_user_changed", handleSwitch);
    return () => {
      window.removeEventListener("user-simulated-switch", handleSwitch);
      window.removeEventListener("system_user_changed", handleSwitch);
    };
  }, [lang]);

  const categoriesMap = workflows.reduce((acc, wf) => {
    const cat = wf.category || (lang === "ar" ? "خدمات عامة" : "General Services");
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(wf);
    return acc;
  }, {} as Record<string, any[]>);

  const getCategoryMeta = (catName: string) => {
    if (catName.toLowerCase().includes("hr")) return { icon: "🌴", color: "#10B981", desc: lang === "ar" ? "خدمات الموارد البشرية، الإجازات، والخطابات الرسمية" : "HR Services, Leave Requests & Letters" };
    if (catName.toLowerCase().includes("it")) return { icon: "💻", color: "#0EA5E9", desc: lang === "ar" ? "الدعم الفني، طلب أجهزة، وصلاحيات السيرفرات" : "Technical Support, IT Assets & Access Rights" };
    if (catName.toLowerCase().includes("finance")) return { icon: "💰", color: "#F59E0B", desc: lang === "ar" ? "الخدمات المالية، تسوية العهد، والمشتريات" : "Financial Services, Procurement & Expenses" };
    return { icon: "📝", color: "#8B5CF6", desc: lang === "ar" ? "الخدمات العامة والنماذج الإدارية" : "General Services & Administrative Forms" };
  };

  const isSimulating = typeof window !== "undefined" && Boolean(localStorage.getItem("simulated_user_id"));

  return (
    <div style={{ maxWidth: 1140, margin: "0 auto", paddingBottom: 40 }}>
      {/* ⚠️ Simulation Active Notice */}
      {isSimulating && (
        <div style={{
          background: "#FEF3C7",
          border: "1px solid #F59E0B",
          padding: "12px 18px",
          borderRadius: 10,
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          boxShadow: "0 2px 8px rgba(245, 158, 11, 0.15)",
          flexWrap: "wrap",
          gap: 10
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>👁️</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#92400E" }}>
                {lang === "ar" ? "أنت تتصفح حالياً في وضع المحاكاة التجريبي" : "You are currently browsing in Simulation Mode"}
              </div>
              <div style={{ fontSize: 11, color: "#B45309", fontWeight: 600 }}>
                {lang === "ar" ? `الحساب المعروض: ${currentUser.name} (${currentUser.role.toUpperCase()})` : `Simulated User: ${currentUser.name} (${currentUser.role.toUpperCase()})`}
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                localStorage.removeItem("simulated_user_id");
                localStorage.removeItem("system_user");
                window.dispatchEvent(new Event("user-simulated-switch"));
                window.dispatchEvent(new Event("system_user_changed"));
                window.location.href = "/";
              }
            }}
            style={{
              background: "#D97706",
              color: "#FFFFFF",
              border: "none",
              padding: "7px 14px",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              gap: 6
            }}
          >
            <span>↩️</span>
            <span>{lang === "ar" ? "إنهاء المحاكاة والعودة للوحة التحكم" : "Exit Simulation & Return to Dashboard"}</span>
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div
        className="card"
        style={{
          background: "linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #0F172A 100%)",
          color: "#FFFFFF",
          padding: "24px 30px",
          borderRadius: "var(--radius-xl)",
          marginBottom: 24,
          boxShadow: "var(--shadow-md)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "#A5B4FC", marginBottom: 6 }}>
            <span>✨ Portal View (Self-Service)</span>
            <span>·</span>
            <span>{currentUser.name}</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: "#FFFFFF" }}>
            {lang === "ar" ? "بوابة الخدمات والطلبات الذاتية" : "Self-Service Requests & Services Portal"}
          </h1>
          <p style={{ fontSize: 13, color: "#CBD5E1", marginTop: 4, margin: 0 }}>
            {lang === "ar"
              ? "اختر الفئة المطلوبة لتقديم طلب جديد، أو تابع حالة طلباتك الحالية بكل سهولة."
              : "Select a service category to initiate a new request, or track your active submissions effortlessly."}
          </p>
        </div>

        {/* Navigation Switcher Buttons */}
        <div style={{ display: "flex", gap: 8, background: "rgba(255,255,255,0.1)", padding: 4, borderRadius: "var(--radius-lg)" }}>
          <button
            onClick={() => setActiveTab("categories")}
            className={`btn btn-sm ${activeTab === "categories" ? "btn-primary" : "btn-ghost"}`}
            style={{ color: activeTab === "categories" ? "#FFFFFF" : "#E2E8F0", fontSize: 12, fontWeight: 700 }}
          >
            📂 {lang === "ar" ? "فئات الخدمات" : "Service Categories"}
          </button>
          <button
            onClick={() => setActiveTab("my_requests")}
            className={`btn btn-sm ${activeTab === "my_requests" ? "btn-primary" : "btn-ghost"}`}
            style={{ color: activeTab === "my_requests" ? "#FFFFFF" : "#E2E8F0", fontSize: 12, fontWeight: 700 }}
          >
            📋 {lang === "ar" ? `طلباتي (${myRequests.length})` : `My Requests (${myRequests.length})`}
          </button>
        </div>
      </div>

      {/* ── TAB 1: CATEGORIES & SERVICE CARDS ── */}
      {activeTab === "categories" && (
        loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)" }}>
            ⏳ {lang === "ar" ? "جاري تحميل الاستمارات والخدمات المتاحة..." : "Loading available service forms..."}
          </div>
        ) : workflows.length === 0 ? (
          <div className="card" style={{ padding: 50, textAlign: "center", border: "1px solid var(--color-border)", borderRadius: 12 }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>📝</div>
            <h3 style={{ fontSize: 16, fontWeight: 800 }}>
              {lang === "ar" ? "لا توجد استمارات خدمات مصرح بها حالياً" : "No Authorized Service Forms Available"}
            </h3>
            <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
              {lang === "ar"
                ? "لم يتم إتاحة استمارات خدمات موجهة لقطاعك أو مجموعتك حتى الآن. تواصل مع المسؤول لإتاحة الخدمات."
                : "No service templates are targeted to your department or group yet. Contact system admin to assign permissions."}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {Object.entries(categoriesMap).map(([catName, formsList]) => {
            const meta = getCategoryMeta(catName);
            return (
              <div key={catName} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Category Title Header */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--color-border)", paddingBottom: 10 }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: "var(--radius-md)",
                      background: meta.color + "18",
                      color: meta.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 20,
                      fontWeight: 800,
                    }}
                  >
                    {meta.icon}
                  </div>
                  <div>
                    <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "var(--color-text-primary)" }}>{catName}</h2>
                    <p style={{ fontSize: 12, color: "var(--color-text-muted)", margin: 0 }}>{meta.desc}</p>
                  </div>
                </div>

                {/* Cards Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                  {(formsList as any[]).map((form: any) => (
                    <div
                      key={form.id || form.slug}
                      className="card"
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        transition: "box-shadow 0.2s, transform 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = "var(--shadow-md)";
                        e.currentTarget.style.transform = "translateY(-2px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = "var(--shadow-sm)";
                        e.currentTarget.style.transform = "none";
                      }}
                    >
                      <div style={{ height: 4, background: form.color || meta.color, borderRadius: "var(--radius-lg) var(--radius-lg) 0 0" }} />
                      <div className="card-body" style={{ padding: 18 }}>
                        <div style={{ fontSize: 32, marginBottom: 10 }}>{form.icon || meta.icon}</div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: "var(--color-text-primary)", marginBottom: 6 }}>
                          {form.name}
                        </div>
                        <p style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.5, marginBottom: 14 }}>
                          {form.description}
                        </p>
                      </div>

                      <div
                        style={{
                          padding: "12px 18px",
                          borderTop: "1px solid var(--color-border)",
                          background: "var(--color-bg)",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div style={{ display: "flex", gap: 6, width: "100%", justifyContent: "space-between", alignItems: "center" }}>
                          {currentUser.role === "admin" ? (
                            <Link href={`/workflows/form-builder?id=${form.id}`}>
                              <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "4px 8px" }}>
                                ✏️ {lang === "ar" ? "تعديل الاستمارة" : "Edit Form"}
                              </button>
                            </Link>
                          ) : (
                            <span style={{ fontSize: 11, color: "var(--color-text-muted)", fontWeight: 600 }}>
                              {lang === "ar" ? "استمارة مسموحة" : "Authorized Template"}
                            </span>
                          )}
                          <Link href={`/requests/new?slug=${form.slug || form.id}`}>
                            <button className="btn btn-primary btn-sm">
                              {lang === "ar" ? "تقديم طلب ←" : "Submit Request →"}
                            </button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {/* ── TAB 2: MY REQUESTS LIST ── */}
      {activeTab === "my_requests" && (
        <div className="card">
          <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="card-title">📋 قائمة طلباتي المقدمة</div>
            <span className="tag">إجمالي {myRequests.length} طلبات</span>
          </div>

          <div className="card-body" style={{ padding: 0 }}>
            {myRequests.length === 0 ? (
              <div className="empty-state" style={{ padding: 40 }}>
                <div className="empty-state-icon">📄</div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>لم تقم بتقديم أي طلبات حتى الآن</div>
                <p style={{ fontSize: 12, color: "var(--color-text-muted)", margin: "6px 0 14px" }}>
                  اختر فئة من تبويب الفئات لتقديم طلبك الأول.
                </p>
                <button className="btn btn-primary btn-sm" onClick={() => setActiveTab("categories")}>
                  تصفح الخدمات المتاحة
                </button>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>رقم الطلب</th>
                      <th>عنوان الطلب</th>
                      <th>التاريخ</th>
                      <th>الحالة</th>
                      <th>الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myRequests.map((req) => (
                      <tr key={req.id}>
                        <td style={{ fontWeight: 800 }}>#{req.request_number?.slice(-4) || "001"}</td>
                        <td>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{req.title}</div>
                        </td>
                        <td style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
                          {new Date(req.date_created).toLocaleDateString()}
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              req.status === "approved" || req.status === "solved"
                                ? "approved"
                                : req.status === "rejected"
                                ? "rejected"
                                : req.status === "pending_info"
                                ? "warning"
                                : "info"
                            }`}
                          >
                            {req.status === "approved"
                              ? "موافق عليه"
                              : req.status === "rejected"
                              ? "مرفوض"
                              : req.status === "pending_info"
                              ? "مطلوب استيفاء"
                              : "قيد المراجعة"}
                          </span>
                        </td>
                        <td>
                          <Link href={`/requests/${req.id}`}>
                            <button className="btn btn-outline btn-sm">التفاصيل ←</button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
