"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { SYSTEM_USERS, SystemUser, DEFAULT_ROLE_PERMISSIONS } from "@/lib/engine/iamStore";

export interface TicketDetailProps {
  requestId: string;
  detail: any;
  onRefresh: () => void;
  onSubmitApproval: (action: 'approved' | 'rejected' | 'returned_for_revision', comment: string) => Promise<void>;
  onSendRfi: (question: string) => Promise<void>;
  onAnswerRfi: (answer: string) => Promise<void>;
}

function LiveSlaCountdownTimer({ deadline, status, isPaused }: { deadline?: string | null; status?: string; isPaused?: boolean }) {
  const [timeLeftStr, setTimeLeftStr] = useState<string>('00h : 00m : 00s');
  const [isBreached, setIsBreached] = useState<boolean>(false);

  useEffect(() => {
    if (status === 'approved' || status === 'solved' || status === 'closed') {
      setTimeLeftStr('✅ SLA Fulfilled');
      setIsBreached(false);
      return;
    }

    if (isPaused || status === 'pending_info') {
      setTimeLeftStr('⏸ Clock Paused');
      return;
    }

    const targetTime = deadline ? new Date(deadline).getTime() : Date.now() + 4 * 60 * 60 * 1000;

    const updateTimer = () => {
      const now = Date.now();
      const diff = targetTime - now;

      if (diff <= 0) {
        setIsBreached(true);
        const absDiff = Math.abs(diff);
        const hours = Math.floor(absDiff / (1000 * 60 * 60));
        const minutes = Math.floor((absDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((absDiff % (1000 * 60)) / 1000);
        const pad = (n: number) => n.toString().padStart(2, '0');
        setTimeLeftStr(`🚨 SLA Breached (-${pad(hours)}h : ${pad(minutes)}m : ${pad(seconds)}s)`);
      } else {
        setIsBreached(false);
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        const pad = (n: number) => n.toString().padStart(2, '0');
        setTimeLeftStr(`⏱ ${pad(hours)}h : ${pad(minutes)}m : ${pad(seconds)}s Remaining`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [deadline, status, isPaused]);

  const color = status === 'approved' || status === 'solved' || status === 'closed'
    ? '#10B981'
    : isBreached
    ? '#EF4444'
    : isPaused
    ? '#F59E0B'
    : '#3B82F6';

  return (
    <div style={{ fontSize: 14, fontWeight: 900, color, fontFamily: 'monospace', letterSpacing: '0.04em' }}>
      {timeLeftStr}
    </div>
  );
}

export function TicketDetailView({
  requestId,
  detail,
  onRefresh,
  onSubmitApproval,
  onSendRfi,
  onAnswerRfi,
}: TicketDetailProps) {
  const [systemLang, setSystemLang] = useState("en");
  useEffect(() => {
    if (typeof window !== "undefined") {
      setSystemLang(localStorage.getItem("system_lang") || "en");
    }
  }, []);
  const isAr = systemLang === "ar";

  const [currentUser, setCurrentUser] = useState<SystemUser>(SYSTEM_USERS[0]);
  const [userPermissions, setUserPermissions] = useState(DEFAULT_ROLE_PERMISSIONS.admin);

  // Comments / Internal Notes state
  const [commentText, setCommentText] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [timelineItems, setTimelineItems] = useState<any[]>([]);

  // RFI Modal state
  const [showRfiModal, setShowRfiModal] = useState(false);
  const [rfiQuestion, setRfiQuestion] = useState("");
  const [rfiAnswer, setRfiAnswer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { request, workflow, values, logs } = detail || {};

  // Sync user state & DB role permissions dynamically
  const loadUserAndPermissions = async () => {
    let u = SYSTEM_USERS[0];
    const savedId = localStorage.getItem("simulated_user_id");
    if (savedId) {
      const found = SYSTEM_USERS.find((user) => user.id === savedId);
      if (found) u = found;
    }
    setCurrentUser(u);

    try {
      const { fetchRolePermissionsAction } = await import("@/app/actions/workflowActions");
      const dbPerms = await fetchRolePermissionsAction();
      const perm = dbPerms?.[u.role] || DEFAULT_ROLE_PERMISSIONS[u.role] || DEFAULT_ROLE_PERMISSIONS.selfservice;
      setUserPermissions(perm);
    } catch (e) {
      const perm = DEFAULT_ROLE_PERMISSIONS[u.role] || DEFAULT_ROLE_PERMISSIONS.selfservice;
      setUserPermissions(perm);
    }
  };

  useEffect(() => {
    loadUserAndPermissions();
    const handleSwitch = () => loadUserAndPermissions();
    window.addEventListener("user-simulated-switch", handleSwitch);
    window.addEventListener("profile-permissions-updated", handleSwitch);
    return () => {
      window.removeEventListener("user-simulated-switch", handleSwitch);
      window.removeEventListener("profile-permissions-updated", handleSwitch);
    };
  }, []);

  const schema = workflow?.form_schema || workflow || { fields: [] };
  const fields = workflow?.fields || workflow?.form_schema?.fields || schema.fields || [];

  // Group fields by zone placement (set in Form Builder)
  const headerFields = fields.filter((f: any) => f.ticketZone === "header");
  const sidebarFields = fields.filter((f: any) => f.ticketZone === "sidebar");
  const hiddenFieldsKeys = new Set(fields.filter((f: any) => f.ticketZone === "hidden").map((f: any) => f.key || f.id));
  const mainFields = fields.filter((f: any) => !f.ticketZone || f.ticketZone === "details" || f.ticketZone === "main");

  // Merge activity timeline (ledger logs + local comments)
  useEffect(() => {
    const combined = [...(logs || [])];
    setTimelineItems(combined);
  }, [logs]);

  const handlePostComment = () => {
    if (!commentText.trim()) return;
    const newItem = {
      id: `comment-${Date.now()}`,
      actor_id: currentUser.name,
      action: isInternalNote ? "internal_note" : "comment",
      comments: commentText,
      created_at: new Date().toISOString(),
      is_internal: isInternalNote,
    };
    setTimelineItems((prev) => [newItem, ...prev]);
    setCommentText("");
  };

  const handleAction = async (action: 'approved' | 'rejected' | 'returned_for_revision') => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSubmitApproval(action, commentText || `Decision: ${action}`);
      setCommentText("");
    } catch (err) {
      alert("Error: " + err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendRfiClick = async () => {
    if (!rfiQuestion.trim()) return;
    setIsSubmitting(true);
    try {
      await onSendRfi(rfiQuestion);
      setShowRfiModal(false);
      setRfiQuestion("");
    } catch (err) {
      alert("Error: " + err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAnswerRfiClick = async () => {
    if (!rfiAnswer.trim()) return;
    setIsSubmitting(true);
    try {
      await onAnswerRfi(rfiAnswer);
      setRfiAnswer("");
    } catch (err) {
      alert("Error: " + err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!request) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ── TOP HEADER BAR ── */}
      <div className="card" style={{ padding: "16px 24px", background: "var(--color-surface)", borderBottom: "3px solid var(--color-primary)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Link href="/requests">
              <button className="btn btn-ghost btn-sm" style={{ padding: "4px 10px" }}>← All Tickets</button>
            </Link>
              {(() => {
                const titleField = fields.find((f: any) => f.ticketSlot === "request_title" || f.ticketSlot === "title");
                const priorityField = fields.find((f: any) => f.ticketSlot === "priority_badge" || f.ticketSlot === "priority");
                const refNoField = fields.find((f: any) => f.ticketSlot === "request_number" || f.ticketSlot === "auto_ticket_no");

                const displayTitle = titleField ? (values?.[titleField.key || titleField.id] || request.title) : request.title;
                const displayPriority = priorityField ? (values?.[priorityField.key || priorityField.id] || request.priority || "Medium") : (request.priority || "Medium");
                const displayRefNo = refNoField ? (values?.[refNoField.key || refNoField.id] || request.request_number) : request.request_number;

                return (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 20, fontWeight: 900, color: "var(--color-primary)" }}>
                        {displayRefNo}
                      </span>
                      <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{displayTitle}</h1>
                      <span className={`badge ${request.status}`}>{request.status?.toUpperCase()}</span>
                      <span className="badge urgent">{displayPriority} Priority</span>
                      {request.status === "pending_info" && (
                        <span className="badge warning" style={{ background: "#FEF3C7", color: "#B45309" }}>⏱ OLA Paused (RFI)</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--color-text-secondary)", marginTop: 4 }}>
                      📁 Workflow: <strong>{workflow?.name || "General Workflow"}</strong> · Requested by <strong>{request.requester_id}</strong> · Created {new Date(request.date_created).toLocaleString()}
                    </div>
                  </div>
                );
              })()}
          </div>

          {/* SLA Clock & Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ textAlign: "right", padding: "6px 14px", background: "var(--color-bg)", borderRadius: 8, border: "1px solid var(--color-border)" }}>
              <div style={{ fontSize: 10, color: "var(--color-text-muted)", textTransform: "uppercase", fontWeight: 700 }}>SLA Target Countdown</div>
              <LiveSlaCountdownTimer
                deadline={request.sla_ttr_deadline || request.sla_deadline || request.ola_deadline}
                status={request.status}
                isPaused={request.status === "pending_info"}
              />
            </div>
          </div>
        </div>

        {/* ── HEADER ZONE FIELDS (If defined in Form Builder) ── */}
        {headerFields.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginTop: 16, paddingTop: 16, borderTop: "1px dashed var(--color-border)" }}>
            {headerFields.map((field: any) => {
              const val = values?.[field.key || field.id] ?? "—";
              return (
                <div key={field.id} style={{ background: "var(--color-bg)", padding: "8px 14px", borderRadius: 6, border: "1px solid var(--color-border)" }}>
                  <div style={{ fontSize: 10, color: "var(--color-text-muted)", fontWeight: 700 }}>📌 {field.label}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "var(--color-primary)", marginTop: 2 }}>{String(val)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* RFI Alert Banner if ticket status is pending_info */}
      {request.status === "pending_info" && (
        <div className="card" style={{ background: "#FFFBEB", borderColor: "#FCD34D" }}>
          <div className="card-body">
            <div style={{ fontWeight: 700, fontSize: 14, color: "#92400E", marginBottom: 6 }}>
              💡 Request For Information (RFI) Pending Answer
            </div>
            <p style={{ fontSize: 12, color: "#B45309", marginBottom: 12 }}>
              A reviewer has requested additional details. The OLA clock is currently <strong>PAUSED</strong> until you answer below.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <input
                className="form-control"
                placeholder={isAr ? "اكتب إجابتك على سؤال المراجع..." : "Type your response to the reviewer's question..."}
                value={rfiAnswer}
                onChange={(e) => setRfiAnswer(e.target.value)}
              />
              <button className="btn btn-primary" onClick={handleAnswerRfiClick} disabled={isSubmitting}>
                Answer & Resume OLA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 2-COLUMN MAIN CONTENT (LEFT MAIN + RIGHT SIDEBAR) ── */}
      <div className="detail-grid" style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>
        {/* ── LEFT COLUMN: MAIN FORM DATA + TIMELINE ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Main Details Card */}
          <div className="card">
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="card-title">📝 Ticket Form Details</div>
              <span className="tag">{mainFields.length} Form Fields</span>
            </div>
            <div className="card-body">
              <div className="detail-fields" style={{ gap: 16 }}>
                {/* Render fields configured as 'details' / main */}
                {mainFields.length > 0 ? (
                  mainFields.map((field: any) => {
                    const key = field.key || field.id;
                    let val = values?.[key];
                    let parsedJson: any = null;
                    if (typeof val === "object" && val !== null) {
                      parsedJson = val;
                    } else if (typeof val === "string" && (val.startsWith("{") || val.startsWith("["))) {
                      try {
                        parsedJson = JSON.parse(val);
                      } catch (e) {}
                    }

                    // Fallback for transportation_route if values object has flat travel fields or summary
                    if (field.type === "transportation_route" && !parsedJson && values) {
                      parsedJson = {
                        mode: "travel_package",
                        fromZone: values.originZone || values.origin || "التجمع الخامس",
                        toZone: values.destinationZone || values.destination || "الاسكندرية",
                        fromDate: values.fromDate || "2026-08-01",
                        toDate: values.toDate || "2026-08-02",
                        isOvernight: values.isOvernight ?? true,
                        isMeeting: values.isMeeting ?? true,
                        calculatedCost: values.calculatedCost || 250,
                        calculatedMeals: values.calculatedMeals || 150,
                        parkingCost: values.parkingCost || 50,
                        totalCost: values.totalCost || values.calculatedAllowance || 450,
                      };
                    }

                    return (
                      <div key={field.id} style={{ gridColumn: field.type === "textarea" || field.type === "transportation_route" ? "1 / -1" : "auto" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-muted)", marginBottom: 4 }}>
                          {field.label}
                        </div>
                        {field.type === "transportation_route" && parsedJson ? (
                          <div style={{ padding: 16, background: "var(--color-bg)", borderRadius: 8, border: "1px solid var(--color-primary)" }}>
                            {parsedJson.mode === "travel_package" ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                                <div style={{ fontSize: 13, fontWeight: 800, color: "var(--color-primary)", borderBottom: "1px solid var(--color-border)", paddingBottom: 6, marginBottom: 4 }}>
                                  🚗 {isAr ? "تفاصيل السفر والانتقال المجمعة" : "Travel Route & Financial Package Breakdown"}
                                </div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 12 }}>
                                  <div>📅 <strong>{isAr ? "الفترة:" : "Period:"}</strong> {isAr ? "من" : "from"} {parsedJson.fromDate} {parsedJson.isOvernight ? `${isAr ? "إلى" : "to"} ${parsedJson.toDate}` : ""}</div>
                                  <div>🏨 <strong>{isAr ? "المبيت:" : "Overnight Stay:"}</strong> {parsedJson.isOvernight ? (isAr ? "نعم" : "Yes") : (isAr ? "لا" : "No")}</div>
                                  <div>📍 <strong>{isAr ? "خط السير:" : "Route:"}</strong> {isAr ? "من" : "from"} <strong>[{parsedJson.fromZone}]</strong> {isAr ? "إلى" : "to"} <strong>[{parsedJson.toZone}]</strong></div>
                                  <div>👥 <strong>{isAr ? "اجتماع عمل:" : "Business Meeting:"}</strong> {parsedJson.isMeeting ? (isAr ? "نعم" : "Yes") : (isAr ? "لا" : "No")}</div>
                                </div>
                                
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginTop: 8 }}>
                                  <thead>
                                    <tr style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
                                      <th style={{ padding: "8px 10px", textAlign: isAr ? "right" : "left", fontWeight: 700 }}>{isAr ? "البند" : "Expense Item"}</th>
                                      <th style={{ padding: "8px 10px", textAlign: isAr ? "left" : "right", fontWeight: 700 }}>{isAr ? "التكلفة" : "Amount"}</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                                      <td style={{ padding: "8px 10px", textAlign: isAr ? "right" : "left" }}>
                                        🚗 {isAr ? "بدل الانتقال" : "Travel Allowance"} {parsedJson.hasTicket ? (isAr ? " (يدوي - تذكرة)" : " (Manual - Ticket)") : (isAr ? " (تلقائي - لائحة)" : " (Policy - Allowance)")}
                                        {parsedJson.ticketFileId && (
                                          <div style={{ fontSize: 11, marginTop: 4 }}>
                                            📎 <a href={`/api/files/${parsedJson.ticketFileId}`} target="_blank" rel="noreferrer" style={{ color: "var(--color-primary)", textDecoration: "underline", fontWeight: 700 }}>{isAr ? "تحميل التذكرة المرفقة" : "Download Attached Ticket"}</a>
                                          </div>
                                        )}
                                      </td>
                                      <td style={{ padding: "8px 10px", textAlign: isAr ? "left" : "right", fontWeight: 700 }}>{Number(parsedJson.calculatedCost || 0).toLocaleString()} {isAr ? "ج.م" : "EGP"}</td>
                                    </tr>
                                    <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                                      <td style={{ padding: "8px 10px", textAlign: isAr ? "right" : "left" }}>🍔 {isAr ? "بدل الوجبات" : "Meals & Overnight Allowance"} {parsedJson.isMeeting && !parsedJson.isOvernight ? (isAr ? " (ملغى لوجود اجتماع)" : " (Cancelled for meeting)") : ""}</td>
                                      <td style={{ padding: "8px 10px", textAlign: isAr ? "left" : "right", fontWeight: 700 }}>{Number(parsedJson.calculatedMeals || 0).toLocaleString()} {isAr ? "ج.م" : "EGP"}</td>
                                    </tr>
                                    <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                                      <td style={{ padding: "8px 10px", textAlign: isAr ? "right" : "left" }}>✉️ {isAr ? "المراسلات" : "Correspondence Cost"}</td>
                                      <td style={{ padding: "8px 10px", textAlign: isAr ? "left" : "right", fontWeight: 700 }}>{Number(parsedJson.correspondenceCost || 0).toLocaleString()} {isAr ? "ج.م" : "EGP"}</td>
                                    </tr>
                                    <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                                      <td style={{ padding: "8px 10px", textAlign: isAr ? "right" : "left" }}>🅿️ {isAr ? "الباركينج" : "Parking & Tolls"}</td>
                                      <td style={{ padding: "8px 10px", textAlign: isAr ? "left" : "right", fontWeight: 700 }}>{Number(parsedJson.parkingCost || 0).toLocaleString()} {isAr ? "ج.م" : "EGP"}</td>
                                    </tr>
                                    <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                                      <td style={{ padding: "8px 10px", textAlign: isAr ? "right" : "left" }}>👥 {isAr ? "مصاريف اجتماع فريق" : "Team Meeting Expenses"}</td>
                                      <td style={{ padding: "8px 10px", textAlign: isAr ? "left" : "right", fontWeight: 700 }}>{Number(parsedJson.teamMeetingCost || 0).toLocaleString()} {isAr ? "ج.م" : "EGP"}</td>
                                    </tr>
                                    {parsedJson.additionalNotes && (
                                      <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                                        <td style={{ padding: "8px 10px", textAlign: isAr ? "right" : "left" }}>📝 {isAr ? "ملاحظات إضافية:" : "Additional Notes:"}</td>
                                        <td style={{ padding: "8px 10px", textAlign: isAr ? "left" : "right", fontStyle: "italic", fontWeight: 600 }}>{parsedJson.additionalNotes}</td>
                                      </tr>
                                    )}
                                    {parsedJson.additionalAttachmentFileId && (
                                      <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                                        <td style={{ padding: "8px 10px", textAlign: isAr ? "right" : "left" }}>📎 {isAr ? "مرفق إضافي:" : "Extra Attachment:"}</td>
                                        <td style={{ padding: "8px 10px", textAlign: isAr ? "left" : "right" }}>
                                          <a href={`/api/files/${parsedJson.additionalAttachmentFileId}`} target="_blank" rel="noreferrer" style={{ color: "var(--color-primary)", textDecoration: "underline", fontWeight: 700 }}>
                                            {parsedJson.additionalAttachmentFileName || (isAr ? "تحميل المرفق الإضافي" : "Download Attachment")}
                                          </a>
                                        </td>
                                      </tr>
                                    )}
                                    <tr style={{ background: "#ECFDF5", borderTop: "2px solid #10B981" }}>
                                      <td style={{ padding: "10px 10px", textAlign: isAr ? "right" : "left", fontWeight: 900, color: "#065F46" }}>💰 {isAr ? "الإجمالي المستحق (الصافي):" : "Grand Total:"}</td>
                                      <td style={{ padding: "10px 10px", textAlign: isAr ? "left" : "right", fontWeight: 950, color: "#047857", fontSize: 14 }}>{Number(parsedJson.totalCost || 0).toLocaleString()} {isAr ? "ج.م" : "EGP"}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            ) : parsedJson.mode === "distance_km" ? (
                              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--color-primary)" }}>
                                🚗 {isAr ? "احتساب الانتقال بالكيلومترات:" : "Distance Based Allowance:"} <strong>{parsedJson.distanceKm} {isAr ? "كم" : "km"}</strong> × <strong>{parsedJson.ratePerKm} {isAr ? "ج.م/كم" : "EGP/km"}</strong> = {isAr ? "إجمالي البدل" : "Total"} <strong style={{ color: "#10B981" }}>{parsedJson.calculatedAllowance?.toLocaleString()} {isAr ? "ج.م" : "EGP"}</strong>
                              </div>
                            ) : (
                              <div style={{ fontSize: 13, fontWeight: 800, color: "var(--color-primary)" }}>
                                📍 {isAr ? "خط السير:" : "Route:"} {isAr ? "من" : "from"} <strong>[{parsedJson.originZone}]</strong> {isAr ? "إلى" : "to"} <strong>[{parsedJson.destinationZone}]</strong> | {isAr ? "الوسيلة:" : "Method:"} {parsedJson.travelMethod} | {isAr ? "التكلفة:" : "Cost:"} <strong>{parsedJson.estimatedCost} {isAr ? "ج.م" : "EGP"}</strong>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div style={{ fontSize: 13, fontWeight: 600, padding: "8px 12px", background: "var(--color-bg)", borderRadius: 6, border: "1px solid var(--color-border)" }}>
                            {val !== undefined && val !== null && val !== "" ? (parsedJson?.summaryText || String(val)) : "—"}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div style={{ gridColumn: "1 / -1", padding: 16, textAlign: "center", color: "var(--color-text-muted)", fontSize: 12 }}>
                    جميع حقول التذكرة تم ضبط موقعها في الهيدر العلوي واللوحة الجانبية.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── ACTION BUTTONS PANEL (ITSM Standard Role Actions & Protection) ── */}
          {(() => {
            const isRequester = request.requester_id === currentUser.id || request.requester_id === currentUser.name || (request as any).requester_name === currentUser.name;
            
            // Check if current user is an assigned approver, technician, or system admin
            const isAssignedApproverOrTech = 
              currentUser.role === "admin" ||
              (request.current_assignees_json || []).some((a: string) => a.toLowerCase().includes(currentUser.name.toLowerCase()) || a.toLowerCase().includes(currentUser.id.toLowerCase()) || a.toLowerCase().includes(currentUser.role.toLowerCase())) ||
              request.assigned_user === currentUser.id ||
              request.current_approver === currentUser.id;

            const canApprove = isAssignedApproverOrTech && request.status === "pending";
            const canReject = isAssignedApproverOrTech && request.status === "pending";
            const canRfi = isAssignedApproverOrTech && request.status === "pending";
            const canReassign = (isAssignedApproverOrTech || currentUser.role === "admin") && request.status === "pending";
            
            // ITSM Standard Cancellation Rules:
            // 1. Can cancel if ticket is active/pending/draft (not already approved, solved, or closed)
            // 2. Allowed for Requester (صاحب الطلب), Assigned Tech/Approver, or System Admin
            const isCancellable = !["approved", "solved", "closed", "cancelled"].includes(request.status);
            const canCancel = isCancellable && (isRequester || isAssignedApproverOrTech || currentUser.role === "admin");

            const hasAnyAction = canApprove || canReject || canRfi || canReassign || canCancel;

            return (
              <div className="card" style={{ padding: 16, background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12, color: "var(--color-text-primary)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>
                    ⚡ Available Actions for: <strong style={{ color: "var(--color-primary)" }}>{currentUser.name}</strong> ({currentUser.role.toUpperCase()})
                  </span>
                  <span className="tag" style={{ fontSize: 10 }}>
                    Role: {currentUser.role === "admin" ? "👑 System Admin" : currentUser.role === "selfservice" ? "👤 Self-Service Employee" : "👤 Requester Employee"}
                  </span>
                </div>
                {hasAnyAction ? (
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                    {canApprove && (
                      <button className="btn btn-primary" onClick={() => handleAction("approved")} disabled={isSubmitting} style={{ background: "#10B981", borderColor: "#10B981" }}>
                        ✓ Approve Ticket
                      </button>
                    )}
                    {canReject && (
                      <button className="btn" onClick={() => handleAction("rejected")} disabled={isSubmitting} style={{ background: "#EF4444", color: "#fff" }}>
                        ✕ Reject Ticket
                      </button>
                    )}
                    {canRfi && (
                      <button className="btn" onClick={() => setShowRfiModal(true)} disabled={isSubmitting} style={{ background: "#F59E0B", color: "#fff" }}>
                        ❓ Request Info (RFI)
                      </button>
                    )}
                    {canReassign && (
                      <button className="btn btn-ghost" onClick={() => alert("Reassign modal opened")} style={{ fontSize: 12 }}>
                        🔄 Reassign Group
                      </button>
                    )}
                    {canCancel && (
                      <button
                        className="btn btn-ghost"
                        disabled={isSubmitting}
                        onClick={async () => {
                          const reason = prompt("يرجى كتابة سبب إلغاء التذكرة (Reason for Cancellation):", "تم الإلغاء حسب رغبة الموظف/الفني");
                          if (reason === null) return;
                          await onSubmitApproval("cancelled" as any, reason || "Cancelled Ticket");
                        }}
                        style={{ fontSize: 12, color: "var(--color-danger)", fontWeight: 700 }}
                      >
                        🚫 Cancel Ticket
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)", fontStyle: "italic" }}>
                    👁️ View-Only Ticket Mode — No pending action required from your account.
                  </div>
                )}

                {/* RFI Question Modal/Prompt */}
                {showRfiModal && (
                  <div style={{ marginTop: 14, padding: 14, background: "#FEF3C7", borderRadius: 8, border: "1px solid #FCD34D" }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "#92400E", marginBottom: 6 }}>Specify Question for Requester:</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        className="form-control"
                        placeholder="e.g. Please provide additional justification / invoice copy..."
                        value={rfiQuestion}
                        onChange={(e) => setRfiQuestion(e.target.value)}
                      />
                      <button className="btn btn-primary" onClick={handleSendRfiClick} disabled={isSubmitting}>
                        Pause OLA & Send RFI
                      </button>
                      <button className="btn btn-ghost" onClick={() => setShowRfiModal(false)}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── ⚡ APPROVAL WORKFLOW PROGRESS TRACKER ── */}
          {workflow?.steps && workflow.steps.length > 0 && (
            <div className="card" style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
              <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="card-title">⚡ Approval Workflow Progress (مسار المعاملة والاعتمادات)</div>
                <span className="tag primary">{workflow.steps.length} Steps configured</span>
              </div>
              <div className="card-body">
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {workflow.steps.map((step: any, idx: number) => {
                    const isCompleted = step.step_order < request.current_step_order || request.status === "approved";
                    const isActive = step.step_order === request.current_step_order && request.status !== "approved" && request.status !== "rejected" && request.status !== "cancelled";
                    const isNext = step.step_order > request.current_step_order;

                    let statusText = "Pending / منتظر";
                    let statusColor = "var(--color-text-muted)";
                    let statusBg = "rgba(0,0,0,0.03)";
                    let statusBorder = "1px dashed var(--color-border)";

                    if (isCompleted) {
                      statusText = "✓ Completed / مكتمل";
                      statusColor = "#10B981";
                      statusBg = "rgba(16, 185, 129, 0.08)";
                      statusBorder = "1px solid #10B981";
                    } else if (isActive) {
                      statusText = "⏳ Pending Approval / قيد الاعتماد";
                      statusColor = "var(--color-primary, #4F46E5)";
                      statusBg = "rgba(79, 70, 229, 0.08)";
                      statusBorder = "2px solid var(--color-primary)";
                    }

                    return (
                      <div
                        key={step.id || idx}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "10px 14px",
                          borderRadius: 8,
                          background: statusBg,
                          border: statusBorder,
                          color: statusColor,
                          transition: "all 0.2s",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            background: isCompleted ? "#10B981" : isActive ? "var(--color-primary)" : "var(--color-border)",
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 11,
                            fontWeight: 900
                          }}>
                            {step.step_order}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--color-text-primary)" }}>{step.name || `Step ${step.step_order}`}</div>
                            <div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>
                              Assignee Role: <strong>{step.assignee_value || "Department Manager"}</strong>
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: 11, fontWeight: 700 }}>{statusText}</span>
                          {step.ola_hours && (
                            <div style={{ fontSize: 9, color: "var(--color-text-muted)", marginTop: 2 }}>
                              OLA target: {step.ola_hours} hours
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── TIMELINE: COMMENTS & INTERNAL NOTES ── */}
          <div className="card">
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="card-title">💬 Activity Timeline & Comments</div>
              <span className="tag">System Audit Ledger</span>
            </div>
            <div className="card-body">
              {/* Comment Composer */}
              <div style={{ marginBottom: 20, padding: 14, background: "var(--color-bg)", borderRadius: 8, border: "1px solid var(--color-border)" }}>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder={isInternalNote ? "Write an internal note (Visible ONLY to assigned reviewers & Admins)..." : "Add a public comment to requester..."}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                  {userPermissions.actions.addInternalNote && (
                    <label style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", color: isInternalNote ? "#B45309" : "var(--color-text-muted)" }}>
                      <input
                        type="checkbox"
                        checked={isInternalNote}
                        onChange={(e) => setIsInternalNote(e.target.checked)}
                      />
                      🔒 Internal Note (Reviewers & Admins)
                    </label>
                  )}
                  <button className="btn btn-primary btn-sm" onClick={handlePostComment} style={{ marginLeft: "auto" }}>
                    Post {isInternalNote ? "Internal Note" : "Comment"}
                  </button>
                </div>
              </div>

              {/* Timeline Feed */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {timelineItems.map((item: any) => {
                  const isInternal = item.is_internal || item.action === "internal_note";
                  // Hide internal notes from self-service users
                  if (isInternal && currentUser.role === "selfservice") return null;

                  return (
                    <div
                      key={item.id}
                      style={{
                        display: "flex",
                        gap: 12,
                        padding: 12,
                        borderRadius: 8,
                        background: isInternal ? "#FFFBEB" : "var(--color-surface)",
                        border: `1px solid ${isInternal ? "#FCD34D" : "var(--color-border)"}`,
                      }}
                    >
                      <div className="avatar md" style={{ background: isInternal ? "#F59E0B" : "var(--color-primary)", color: "#fff", flexShrink: 0 }}>
                        {item.actor_id ? item.actor_id.substring(0, 2).toUpperCase() : "SY"}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 700 }}>{item.actor_id || "System"}</span>
                          {isInternal && (
                            <span style={{ fontSize: 10, background: "#FEF3C7", color: "#B45309", padding: "1px 6px", borderRadius: 4, fontWeight: 800 }}>
                              🔒 Internal Note
                            </span>
                          )}
                          <span style={{ fontSize: 10, color: "var(--color-text-muted)", marginLeft: "auto" }}>
                            {item.created_at ? new Date(item.created_at).toLocaleTimeString() : "Just now"}
                          </span>
                        </div>
                        <p style={{ fontSize: 12, color: "var(--color-text-primary)", margin: 0 }}>
                          {item.comments || item.action}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: SIDEBAR METRICS & SIDEBAR FIELDS ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Ticket Metadata Card (Standard Info Panel - Configured per Workflow) */}
          {(() => {
            const cfg = workflow?.visibility_rules?.ticket_info_panel_config || (workflow as any)?.ticket_info_panel_config || {
              customPanelTitle: "Ticket Info & Classification Panel",
              showStatusClassification: true,
              showActorsAssignment: true,
              showSlaMetrics: true,
              showLocationBranch: true,
              showTargetAsset: true,
              showBusinessUnitBrand: true,
              showCostBudgetSummary: true,
            };

            return (
              <div className="card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="card-title">📊 {cfg.customPanelTitle || "Ticket Info & Classification Panel"}</div>
                  <span className="tag primary">{request.type?.toUpperCase() || 'REQUEST'}</span>
                </div>
                <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                  {/* READ-ONLY DISPLAY SECTIONS */}
                  
                  {/* SECTION 1: Status & Classification */}
                  {cfg.showStatusClassification !== false && (
                    <div style={{ background: 'var(--color-bg)', padding: 10, borderRadius: 8, border: '1px solid var(--color-border)' }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: 8 }}>
                        🏷️ Status & Classification
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div>
                          <div style={{ fontSize: 10, color: "var(--color-text-muted)", fontWeight: 700 }}>Status</div>
                          <span className={`badge ${request.status}`} style={{ marginTop: 2, fontSize: 10 }}>{request.status?.toUpperCase()}</span>
                        </div>

                        <div>
                          <div style={{ fontSize: 10, color: "var(--color-text-muted)", fontWeight: 700 }}>Priority</div>
                           <span className="badge urgent" style={{ marginTop: 2, fontSize: 10 }}>{(request.priority || values?.["glpi_urgency"] || 'normal').toUpperCase()}</span>
                        </div>

                        <div>
                          <div style={{ fontSize: 10, color: "var(--color-text-muted)", fontWeight: 700 }}>Impact</div>
                          <div style={{ fontSize: 11, fontWeight: 700, marginTop: 2 }}>{request.impact?.toUpperCase() || 'MEDIUM'}</div>
                        </div>

                        <div>
                          <div style={{ fontSize: 10, color: "var(--color-text-muted)", fontWeight: 700 }}>Urgency</div>
                          <div style={{ fontSize: 11, fontWeight: 700, marginTop: 2 }}>{(values?.["glpi_urgency"] || request.urgency || 'NORMAL').toUpperCase()}</div>
                        </div>
                      </div>

                      <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed var(--color-border)' }}>
                        <div style={{ fontSize: 10, color: "var(--color-text-muted)", fontWeight: 700 }}>Category & Classification</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-primary)', marginTop: 2 }}>
                          📁 {values?.["glpi_category"] || workflow?.category || 'General'} {request.subcategory_id ? `▸ ${request.subcategory_id}` : ''}
                        </div>
                      </div>

                      {cfg.showLocationBranch !== false && (values?.["glpi_location"] || request.location_id) && (
                        <div style={{ marginTop: 6 }}>
                          <div style={{ fontSize: 10, color: "var(--color-text-muted)", fontWeight: 700 }}>Location / Branch</div>
                          <div style={{ fontSize: 11, fontWeight: 600 }}>📍 {values?.["glpi_location"] || request.location_id}</div>
                        </div>
                      )}

                      {cfg.showTargetAsset !== false && values?.["glpi_asset"] && (
                        <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px dashed var(--color-border)' }}>
                          <div style={{ fontSize: 10, color: "var(--color-text-muted)", fontWeight: 700 }}>Target Asset / Equipment</div>
                          <div style={{ fontSize: 11, fontWeight: 800, color: "#8B5CF6" }}>💻 {values["glpi_asset"]}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* SECTION 2: Actors & Responsibilities */}
                  {cfg.showActorsAssignment !== false && (
                    <div style={{ background: 'var(--color-bg)', padding: 10, borderRadius: 8, border: '1px solid var(--color-border)' }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: 8 }}>
                        👤 Actors & Assignment
                      </div>

                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 10, color: "var(--color-text-muted)", fontWeight: 700 }}>Requester</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                          <div className="avatar sm a">{(request.requester_name || request.requester_id || 'AM').slice(0, 2).toUpperCase()}</div>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700 }}>{request.requester_name || request.requester_id}</div>
                            <div style={{ fontSize: 10, color: "var(--color-text-secondary)" }}>{request.requester_department || 'IT Department'}</div>
                          </div>
                        </div>
                      </div>

                      <div style={{ marginBottom: 8, paddingTop: 8, borderTop: '1px dashed var(--color-border)' }}>
                        <div style={{ fontSize: 10, color: "var(--color-text-muted)", fontWeight: 700 }}>Assigned Technical Group</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#4F46E5", marginTop: 2 }}>
                          🛠️ {request.assigned_group || "IT Helpdesk Team"}
                        </div>
                      </div>

                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 10, color: "var(--color-text-muted)", fontWeight: 700 }}>Assigned Technician / Reviewer</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#059669", marginTop: 2 }}>
                          👤 {request.assigned_user || "Unassigned"}
                        </div>
                      </div>

                      {request.status === 'pending' && request.current_assignees_json && request.current_assignees_json.length > 0 && (
                        <div style={{ marginBottom: 8, paddingTop: 8, borderTop: '1px dashed var(--color-border)' }}>
                          <div style={{ fontSize: 10, color: "var(--color-text-muted)", fontWeight: 700 }}>⏳ Pending Approval From (قيد الاعتماد من)</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-primary)", marginTop: 2 }}>
                            🔑 {request.current_assignees_json.join(', ')}
                          </div>
                        </div>
                      )}

                      {cfg.showBusinessUnitBrand !== false && request.unit && (
                        <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px dashed var(--color-border)' }}>
                          <div style={{ fontSize: 10, color: "var(--color-text-muted)", fontWeight: 700 }}>Brand / Business Unit (الوحدة البراند)</div>
                          <div style={{ fontSize: 11, fontWeight: 800, color: "#D97706" }}>🏷️ {request.unit}</div>
                        </div>
                      )}

                      <div style={{ paddingTop: 8, borderTop: '1px dashed var(--color-border)' }}>
                        <div style={{ fontSize: 10, color: "var(--color-text-muted)", fontWeight: 700 }}>Observers / CC (المتابعين)</div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-primary)", marginTop: 2 }}>
                          👁️ {request.observer_id || "Ahmed Mohamed, Sara Hassan"}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SECTION 3: SLA & Time Targets */}
                  {cfg.showSlaMetrics !== false && (
                    <div style={{ background: 'var(--color-bg)', padding: 10, borderRadius: 8, border: '1px solid var(--color-border)' }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: 8 }}>
                        ⏱️ SLA / OLA Deadlines
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 10, color: "var(--color-text-muted)", fontWeight: 700 }}>SLA TTO (Takeover)</div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#10B981', marginTop: 2 }}>
                            {request.sla_tto_deadline ? new Date(request.sla_tto_deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '1 Hour'}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: 10, color: "var(--color-text-muted)", fontWeight: 700 }}>SLA TTR (Resolution)</div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#3B82F6', marginTop: 2 }}>
                            {request.sla_ttr_deadline || request.sla_deadline ? new Date(request.sla_ttr_deadline || request.sla_deadline!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '8 Hours'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Workflow SLA Metrics */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">⏱️ OLA & SLA Targets</div>
            </div>
            <div className="card-body">
              <div style={{ fontSize: 12, marginBottom: 8 }}>
                <strong>Resolution SLA:</strong> 24 Hours
              </div>
              <div style={{ width: "100%", height: 8, background: "var(--color-bg)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: "35%", height: "100%", background: "#10B981" }} />
              </div>
              <div style={{ fontSize: 10, color: "var(--color-text-muted)", marginTop: 6 }}>
                35% time elapsed (On-Track)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 📱 DEDICATED MOBILE STICKY DECISION BAR */}
      {(() => {
        const isAssignedApproverOrTech = 
          currentUser.role === "admin" ||
          (request.current_assignees_json || []).some((a: string) => a.toLowerCase().includes(currentUser.name.toLowerCase()) || a.toLowerCase().includes(currentUser.id.toLowerCase()) || a.toLowerCase().includes(currentUser.role.toLowerCase())) ||
          request.assigned_user === currentUser.id ||
          request.current_approver === currentUser.id;

        const canApprove = isAssignedApproverOrTech && request.status === "pending";
        const canReject = isAssignedApproverOrTech && request.status === "pending";

        if (!canApprove && !canReject) return null;

        return (
          <div className="mobile-sticky-decision-bar">
            {canApprove && (
              <button
                className="btn btn-primary"
                onClick={() => handleAction("approved")}
                disabled={isSubmitting}
                style={{ flex: 1, padding: "12px", background: "#10B981", borderColor: "#10B981", fontWeight: 800, fontSize: 14 }}
              >
                ✓ اعتماد الطلب
              </button>
            )}
            {canReject && (
              <button
                className="btn"
                onClick={() => handleAction("rejected")}
                disabled={isSubmitting}
                style={{ flex: 1, padding: "12px", background: "#EF4444", color: "#FFF", fontWeight: 800, fontSize: 14 }}
              >
                ✕ رفض الطلب
              </button>
            )}
          </div>
        );
      })()}
    </div>
  );
}
