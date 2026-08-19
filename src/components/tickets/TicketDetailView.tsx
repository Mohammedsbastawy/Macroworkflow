"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { SYSTEM_USERS, SystemUser, DEFAULT_ROLE_PERMISSIONS, BUSINESS_GROUPS, DEPARTMENTS } from "@/lib/engine/iamStore";
import { ExternalIntegrationsPanel } from "./ExternalIntegrationsPanel";

export interface TicketDetailProps {
  requestId: string;
  detail: any;
  onRefresh: () => void;
  onSubmitApproval: (action: 'approved' | 'rejected' | 'returned_for_revision' | 'cancelled', comment: string) => Promise<void>;
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

const isInternalWorkflowLog = (item: any) => {
  const action = item.action || '';
  const comments = item.comments || '';
  
  if ([
    'ola_paused', 'ola_resumed', 'ola_breached', 'sla_breached', 
    'auto_approved', 'auto_rejected', 'ooo_rerouted', 'delegated', 'escalated', 'assigned',
    'ola_started', 'sla_started'
  ].includes(action)) {
    return true;
  }
  
  const lowerComment = comments.toLowerCase().trim();
  if (
    lowerComment.startsWith('[sla tracker]') ||
    lowerComment.startsWith('[ola tracker]') ||
    lowerComment.startsWith('[breach alert]') ||
    lowerComment.startsWith('workflow action executed:') ||
    lowerComment.startsWith('ticket assigned to employee:')
  ) {
    return true;
  }
  
  return false;
};

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
  // File attachment state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploadingComment, setIsUploadingComment] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const rfiFileInputRef = React.useRef<HTMLInputElement>(null);

  // Assignment Modal States
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAssigneeName, setSelectedAssigneeName] = useState("");

  // RFI Modal state
  const [showRfiModal, setShowRfiModal] = useState(false);
  const [rfiQuestion, setRfiQuestion] = useState("");
  const [rfiAnswer, setRfiAnswer] = useState("");
  const [rfiAnswerFiles, setRfiAnswerFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { request, workflow, values, logs } = detail || {};

   const currentGroupObj = request ? BUSINESS_GROUPS.find(g => g.name === request.assigned_group || g.id === request.assigned_group || g.code === request.assigned_group) : null;
   const userBelongsToGroup = currentUser && currentGroupObj && (currentGroupObj.member_user_ids || (currentGroupObj as any).member_user_ids_json || []).includes(currentUser.id);
   const userRoles = (currentUser.roles && currentUser.roles.length > 0 ? currentUser.roles : [currentUser.role]) as string[];
   const isAssignedGroupMemberOrAdmin = currentUser && (userRoles.includes("admin") || userRoles.includes("agent") || userBelongsToGroup || (request && request.assigned_user === currentUser.id));
   const isRequester = request?.requester_id === currentUser?.id || request?.requester_id === currentUser?.name || (request as any)?.requester_name === currentUser?.name;
   const canViewSlaAndApproval = (userBelongsToGroup || request?.assigned_user === currentUser?.id) && !isRequester;

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

  // Filter fields based on Field Level Access Control
  const isFieldVisible = (f: any) => {
    if (!f.visibility_scope || f.visibility_scope !== "custom") return true;
    const userRole = currentUser.role || "";
    const userId = currentUser.id || "";
    const userDept = currentUser.department_id || (currentUser as any).department || "";

    let hasMatch = false;
    let customRulesSet = false;

    if (f.visible_user_ids && f.visible_user_ids.length > 0) {
      customRulesSet = true;
      if (f.visible_user_ids.includes(userId)) hasMatch = true;
    }
    if (f.visible_group_ids && f.visible_group_ids.length > 0) {
      customRulesSet = true;
      if (f.visible_group_ids.includes(userRole)) hasMatch = true;
    }
    if (f.visible_dept_ids && f.visible_dept_ids.length > 0) {
      customRulesSet = true;
      if (f.visible_dept_ids.includes(userDept)) hasMatch = true;
    }

    if (customRulesSet && !hasMatch) return false;
    return true;
  };

  const visibleFields = fields.filter(isFieldVisible);

  // Group fields by zone placement (set in Form Builder)
  const headerFields = visibleFields.filter((f: any) => f.ticketZone === "header");
  const sidebarFields = visibleFields.filter((f: any) => f.ticketZone === "sidebar");
  const hiddenFieldsKeys = new Set(visibleFields.filter((f: any) => f.ticketZone === "hidden").map((f: any) => f.key || f.id));
  const mainFields = visibleFields.filter((f: any) => !f.ticketZone || f.ticketZone === "details" || f.ticketZone === "main");

  // Dynamic Custom Sections from Workflow
  const rawCustomSections: any[] = workflow?.visibility_rules?.custom_sections || [];
  
  const isSectionVisible = (sec: any) => {
    if (!sec.visibility_scope || sec.visibility_scope !== "custom") return true;
    if (currentUser.role === "admin" || (currentUser.roles && currentUser.roles.includes("admin"))) return true;
    
    let hasMatch = false;
    let customRulesSet = false;

    if (sec.visible_user_ids && sec.visible_user_ids.length > 0) {
      customRulesSet = true;
      if (sec.visible_user_ids.includes(currentUser.id) || sec.visible_user_ids.includes(currentUser.name)) hasMatch = true;
    }
    if (sec.visible_group_ids && sec.visible_group_ids.length > 0) {
      customRulesSet = true;
      const userRole = currentUser.role || "";
      if (sec.visible_group_ids.includes(userRole) || (currentUser.roles && currentUser.roles.some((r: string) => sec.visible_group_ids.includes(r)))) hasMatch = true;
    }
    if (sec.visible_dept_ids && sec.visible_dept_ids.length > 0) {
      customRulesSet = true;
      const userDept = (currentUser as any).department || (currentUser as any).dept_id || "";
      if (sec.visible_dept_ids.includes(userDept)) hasMatch = true;
    }

    if (customRulesSet && !hasMatch) return false;
    return true;
  };

  const visibleCustomSections = rawCustomSections.filter(isSectionVisible);

  // Merge activity timeline (ledger logs + local comments)
  useEffect(() => {
    const combined = [...(logs || [])];
    setTimelineItems(combined);
  }, [logs]);

  const handlePostComment = async () => {
    if (!commentText.trim() && selectedFiles.length === 0) return;
    setIsUploadingComment(true);
    try {
      // Upload files first if any
      let uploadedAttachments: Array<{ fileId: string; fileName: string; mimeType: string; size: number }> = [];
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          const formData = new FormData();
          formData.append("file", file);
          const res = await fetch("/api/files", { method: "POST", body: formData });
          const json = await res.json();
          if (json?.data?.id) {
            uploadedAttachments.push({
              fileId: json.data.id,
              fileName: file.name,
              mimeType: file.type,
              size: file.size,
            });
          }
        }
      }

      const { addCommentAction } = await import("@/app/actions/workflowActions");
      const result = await addCommentAction({
        ticketId: requestId,
        actorId: currentUser.id || currentUser.name,
        actorName: currentUser.name,
        content: commentText,
        isInternal: isInternalNote,
        attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
      });

      if (result.success) {
        // Refresh the full timeline from the server
        onRefresh();
        setCommentText("");
        setSelectedFiles([]);
      }
    } catch (err) {
      console.error("Failed to post comment:", err);
      alert("Failed to post comment. Please try again.");
    } finally {
      setIsUploadingComment(false);
    }
  };

  // File upload helpers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    setSelectedFiles((prev) => [...prev, ...files]);
    e.target.value = "";
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadCommentFile = () => {
    fileInputRef.current?.click();
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

  const handleRfiFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    setRfiAnswerFiles((prev) => [...prev, ...files]);
    e.target.value = "";
  };

  const removeRfiFile = (index: number) => {
    setRfiAnswerFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAnswerRfiClick = async () => {
    if (!rfiAnswer.trim()) return;
    setIsSubmitting(true);
    try {
      // Upload files first if any
      let uploadedAttachments: Array<{ fileId: string; fileName: string; mimeType: string; size: number }> = [];
      if (rfiAnswerFiles.length > 0) {
        for (const file of rfiAnswerFiles) {
          const formData = new FormData();
          formData.append("file", file);
          const res = await fetch("/api/files", { method: "POST", body: formData });
          const json = await res.json();
          if (json?.data?.id) {
            uploadedAttachments.push({
              fileId: json.data.id,
              fileName: file.name,
              mimeType: file.type,
              size: file.size,
            });
          }
        }
      }

      // Resume OLA with RFI answer
      await onAnswerRfi(rfiAnswer);

      // Sync the RFI answer as a comment in the ticket timeline (visible to all)
      const { addCommentAction } = await import("@/app/actions/workflowActions");
      await addCommentAction({
        ticketId: requestId,
        actorId: currentUser.id || currentUser.name,
        actorName: currentUser.name,
        content: `📝 RFI Answer: ${rfiAnswer}`,
        isInternal: false,
        attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
        skipNotification: true,
      });

      setRfiAnswer("");
      setRfiAnswerFiles([]);
      onRefresh();
    } catch (err) {
      alert("Error: " + err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignMemberSubmit = async () => {
    if (!selectedAssigneeName) return;
    setIsSubmitting(true);
    try {
      const { assignTicketUserAction } = await import("@/app/actions/workflowActions");
      await assignTicketUserAction(request.id, selectedAssigneeName, currentUser.name);
      setShowAssignModal(false);
      onRefresh();
    } catch (e) {
      alert("Error assigning member: " + e);
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
          {isAssignedGroupMemberOrAdmin && (
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
          )}
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

      {/* RFI Alert Banner — Only visible to the ticket Requester who needs to answer */}
      {request.status === "pending_info" && isRequester && (
        <div className="card" style={{ background: "#FFFBEB", borderColor: "#FCD34D" }}>
          <div className="card-body">
            <div style={{ fontWeight: 700, fontSize: 14, color: "#92400E", marginBottom: 6 }}>
              💡 Request For Information (RFI) Pending Answer
            </div>
            <p style={{ fontSize: 12, color: "#B45309", marginBottom: 12 }}>
              A reviewer has requested additional details. The OLA clock is currently <strong>PAUSED</strong> until you answer below.
            </p>
            <div style={{ display: "flex", gap: 10, flexDirection: "column" }}>
              <div style={{ display: "flex", gap: 10 }}>
                <input
                  className="form-control"
                  placeholder={isAr ? "اكتب إجابتك على سؤال المراجع..." : "Type your response to the reviewer's question..."}
                  value={rfiAnswer}
                  onChange={(e) => setRfiAnswer(e.target.value)}
                />
                <button className="btn btn-primary" onClick={handleAnswerRfiClick} disabled={isSubmitting}>
                  {isSubmitting ? "⏳ Submitting..." : "Answer & Resume OLA"}
                </button>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => rfiFileInputRef.current?.click()}
                  style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px" }}
                >
                  📎 {isAr ? "إرفاق ملفات" : "Attach Files"}
                </button>
                <input
                  ref={rfiFileInputRef}
                  type="file"
                  multiple
                  accept="image/*,.pdf,.docx,.doc,.xlsx,.xls,.zip,.txt,.csv"
                  style={{ display: "none" }}
                  onChange={handleRfiFileSelect}
                />
                {rfiAnswerFiles.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {rfiAnswerFiles.map((file, idx) => (
                      <span
                        key={idx}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: 11,
                          background: "#FEF3C7",
                          border: "1px solid #FCD34D",
                          borderRadius: 4,
                          padding: "2px 8px",
                          color: "#92400E",
                        }}
                      >
                        📎 {file.name.length > 20 ? file.name.slice(0, 17) + "..." : file.name}
                        <span
                          style={{ cursor: "pointer", fontWeight: 900, marginLeft: 4 }}
                          onClick={() => removeRfiFile(idx)}
                        >
                          ✕
                        </span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 2-COLUMN MAIN CONTENT (LEFT MAIN + RIGHT SIDEBAR) ── */}
      <div className="detail-grid" style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>
        {/* ── LEFT COLUMN: MAIN FORM DATA + TIMELINE ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Helper to render individual field item */}
          {(() => {
            const renderFieldItem = (field: any) => {
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

              if (field.type === "display_panel" || field.type === "api_panel") {
                const queryVal = field.bound_field_key ? values?.[field.bound_field_key] : val;
                return (
                  <div key={field.id} style={{ gridColumn: "1 / -1" }}>
                    <ExternalIntegrationsPanel
                      currentUserId={currentUser.id}
                      currentUserRole={currentUser.role}
                      targetApiId={field.api_integration_id}
                      initialQuery={queryVal ? String(queryVal) : undefined}
                      titleOverride={field.label}
                      searchLabel={field.api_search_label}
                      searchPlaceholder={field.placeholder}
                      buttonText={field.api_button_text}
                      visibleColumns={field.oracle_columns}
                      ownershipFilter={field.oracle_ownership_filter}
                    />
                  </div>
                );
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
                                <td style={{ padding: "8px 10px", textAlign: isAr ? "right" : "left" }}>🍔 {isAr ? "الوجبات" : "Meals Allowance"}</td>
                                <td style={{ padding: "8px 10px", textAlign: isAr ? "left" : "right", fontWeight: 700 }}>{Number(parsedJson.calculatedMeals ?? parsedJson.mealCost ?? 0).toLocaleString()} {isAr ? "ج.م" : "EGP"}</td>
                              </tr>
                              <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                                <td style={{ padding: "8px 10px", textAlign: isAr ? "right" : "left" }}>☕ {isAr ? "القهوة" : "Coffee"}</td>
                                <td style={{ padding: "8px 10px", textAlign: isAr ? "left" : "right", fontWeight: 700 }}>{Number(parsedJson.coffeeCost || 0).toLocaleString()} {isAr ? "ج.م" : "EGP"}</td>
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

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--color-primary-light)", padding: "10px 14px", borderRadius: 8, marginTop: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 900, color: "var(--color-primary)" }}>{isAr ? "إجمالي المستحق المالي للرحلة:" : "Total Calculated Allowance:"}</span>
                            <span style={{ fontSize: 16, fontWeight: 900, color: "var(--color-primary)" }}>{Number(parsedJson.totalCost || parsedJson.calculatedAllowance || 0).toLocaleString()} {isAr ? "ج.م (EGP)" : "EGP"}</span>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                          {parsedJson.routes?.map((r: any, rIdx: number) => (
                            <div key={rIdx} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--color-border)", paddingBottom: 6 }}>
                              <span>📍 {r.from} ➔ {r.to} ({r.date})</span>
                              <strong>{Number(r.cost || 0).toLocaleString()} {isAr ? "ج.م" : "EGP"}</strong>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : field.type === "section_header" ? (
                    <div style={{ fontWeight: 800, fontSize: 14, color: "var(--color-primary)", borderBottom: "2px solid var(--color-primary)", paddingBottom: 4, marginTop: 8 }}>
                      📌 {field.label}
                    </div>
                  ) : field.type === "info_notice" ? (
                    <div style={{ background: "var(--color-primary-light)", color: "var(--color-primary)", padding: 12, borderRadius: 8, fontSize: 12 }}>
                      ℹ️ {field.placeholder || field.label}
                    </div>
                  ) : field.type === "checkbox" ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600 }}>
                      <span>{val ? "☑️" : "⬜"}</span>
                      <span>{field.label}</span>
                    </div>
                  ) : field.type === "file" ? (
                    <div>
                      {val ? (
                        <a href={`/api/files/${val}`} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm" style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                          📎 {isAr ? "تحميل المرفق" : "Download Attached Document"}
                        </a>
                      ) : (
                        <span style={{ color: "var(--color-text-muted)", fontSize: 12 }}>{isAr ? "لا يوجد ملف مرفق" : "No document uploaded"}</span>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: 13, fontWeight: 600, padding: "8px 12px", background: "var(--color-bg)", borderRadius: 6, border: "1px solid var(--color-border)" }}>
                      {val !== undefined && val !== null && val !== "" ? (parsedJson?.summaryText || String(val)) : "—"}
                    </div>
                  )}
                </div>
              );
            };

            // If custom sections are defined in workflow
            if (visibleCustomSections.length > 0) {
              return visibleCustomSections.map((section: any, sIdx: number) => {
                const secFields = mainFields.filter((f: any) => {
                  if (f.section === section.id || f.section === section.title) return true;
                  const matchesOther = visibleCustomSections.some((o: any) => o.id !== section.id && (f.section === o.id || f.section === o.title));
                  if (sIdx === 0 && !matchesOther) return true;
                  return false;
                });

                return (
                  <div key={section.id || sIdx} className="card">
                    <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div className="card-title">📝 {section.title || "Ticket Form Details"}</div>
                      <span className="tag">{secFields.length} {isAr ? "حقول" : "Fields"}</span>
                    </div>
                    <div className="card-body">
                      <div className="detail-fields" style={{ gap: 16 }}>
                        {secFields.length > 0 ? (
                          secFields.map(renderFieldItem)
                        ) : (
                          <div style={{ gridColumn: "1 / -1", padding: 16, textAlign: "center", color: "var(--color-text-muted)", fontSize: 12 }}>
                            {isAr ? "لا توجد حقول في هذا القسم." : "No fields in this section."}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              });
            }

            // Default fallback: Single Main Details Card
            return (
              <div className="card">
                <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div className="card-title">📝 {isAr ? "بيانات واستمارة المعاملة" : "Ticket Form Details"}</div>
                  <span className="tag">{mainFields.length} Form Fields</span>
                </div>
                <div className="card-body">
                  <div className="detail-fields" style={{ gap: 16 }}>
                    {mainFields.length > 0 ? (
                      mainFields.map(renderFieldItem)
                    ) : (
                      <div style={{ gridColumn: "1 / -1", padding: 16, textAlign: "center", color: "var(--color-text-muted)", fontSize: 12 }}>
                        {isAr ? "جميع حقول التذكرة تم ضبط موقعها في الهيدر العلوي واللوحة الجانبية." : "All fields are positioned in header or sidebar."}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ── ACTION BUTTONS PANEL (ITSM Standard Role Actions & Protection) ── */}
          {(() => {
            const isDeptHead = DEPARTMENTS.some(d => d.head_user_id === currentUser.id);
            
            // 1. Check if current user is an active Approver for this step
            const isAssignedApprover = 
              (request.current_assignees_json || []).some((a: string) => {
                const cleanA = a.toLowerCase();
                return cleanA.includes(currentUser.name.toLowerCase()) || 
                       cleanA.includes(currentUser.id.toLowerCase()) || 
                       cleanA.includes(currentUser.role.toLowerCase()) ||
                       (currentUser.group_ids || []).some(gId => {
                         const bg = BUSINESS_GROUPS.find(b => b.id === gId);
                         return bg && (cleanA.includes(bg.id.toLowerCase()) || cleanA.includes(bg.name.toLowerCase()) || cleanA.includes((bg.code || '').toLowerCase()));
                       });
              }) ||
              request.current_approver === currentUser.id;

            // 2. Check if current user is the Assigned Tech or member of Assigned Group
            const isAssignedTech = 
              request.assigned_user === currentUser.id || 
              userBelongsToGroup;

            const canApprove = (isAssignedApprover || userRoles.includes("admin") || userRoles.includes("agent")) && request.status === "pending";
            const canReject = (isAssignedApprover || userRoles.includes("admin") || userRoles.includes("agent")) && request.status === "pending";
            const canRfi = (isAssignedApprover || userRoles.includes("admin") || userRoles.includes("agent")) && request.status === "pending";
            const canReassign = (isAssignedTech || userRoles.includes("admin") || userRoles.includes("agent")) && request.status === "pending";
            const canAssignGroupMember = (userRoles.includes("admin") || userRoles.includes("agent") || (currentGroupObj && currentGroupObj.manager_id === currentUser.id) || (userBelongsToGroup && Boolean((currentUser as any).can_assign_group_tickets))) && request.status === "pending";

            const groupMembers = currentGroupObj
              ? (currentGroupObj.member_user_ids || (currentGroupObj as any).member_user_ids_json || [])
                  .map((mId: string) => SYSTEM_USERS.find(u => u.id === mId))
                  .filter((u): u is typeof SYSTEM_USERS[0] => !!u)
              : SYSTEM_USERS;

            // ITSM Standard Cancellation Rules:
            // 1. Can cancel if ticket is active/pending/draft (not already approved, solved, or closed)
            // 2. Allowed for Requester (صاحب الطلب), Assigned Tech, or System Admin
            const isCancellable = !["approved", "solved", "closed", "cancelled"].includes(request.status);
            const canCancel = isCancellable && (isRequester || isAssignedTech || userRoles.includes("admin") || userRoles.includes("agent"));

            const hasAnyAction = canApprove || canReject || canRfi || canReassign || canCancel || canAssignGroupMember;

            // Don't show the Action Panel at all if the ticket is in a final/closed state
            const isFinalStatus = ["approved", "rejected", "cancelled", "solved", "closed"].includes(request.status);
            if (isFinalStatus) return null;

            return (
              <div className="card" style={{ padding: 16, background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 12, color: "var(--color-text-primary)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>
                    ⚡ Available Actions for: <strong style={{ color: "var(--color-primary)" }}>{currentUser.name}</strong> ({currentUser.role.toUpperCase()})
                  </span>
                  <span className="tag" style={{ fontSize: 10 }}>
                    Role: {currentUser.role === "admin" ? "👑 System Admin" : currentUser.role === "agent" ? "🛡️ Agent" : currentUser.role === "selfservice" ? "👤 Self-Service Employee" : "👤 Requester Employee"}
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
                    {canAssignGroupMember && (
                      <button className="btn btn-ghost" onClick={() => {
                        if (groupMembers.length > 0) {
                          setSelectedAssigneeName(groupMembers[0].name);
                        }
                        setShowAssignModal(true);
                      }} style={{ fontSize: 12, color: "var(--color-primary)", fontWeight: 700 }}>
                        👤 Assign to Group Member
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

                {/* Assign to Group Member Modal */}
                {showAssignModal && (
                  <div style={{ marginTop: 14, padding: 14, background: "var(--color-bg)", borderRadius: 8, border: "1px solid var(--color-primary)" }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "var(--color-text-primary)", marginBottom: 6 }}>
                      Select Group Member to Assign (تعيين موظف من المجموعة):
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <select
                        className="form-control"
                        value={selectedAssigneeName}
                        onChange={(e) => setSelectedAssigneeName(e.target.value)}
                        style={{ fontSize: 12, fontWeight: 700 }}
                      >
                        {groupMembers.map(m => (
                          <option key={m.id} value={m.name}>
                            👤 {m.name} ({m.job_title || 'Team Member'})
                          </option>
                        ))}
                      </select>
                      <button className="btn btn-primary" onClick={handleAssignMemberSubmit} disabled={isSubmitting} style={{ fontSize: 12, fontWeight: 700 }}>
                        Assign User
                      </button>
                      <button className="btn btn-ghost" onClick={() => setShowAssignModal(false)} style={{ fontSize: 12, fontWeight: 700 }}>
                        Cancel
                      </button>
                    </div>
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
          {canViewSlaAndApproval && workflow?.steps && workflow.steps.length > 0 && (
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
                              {(() => {
                                const stepLog = logs?.find((l: any) => l.workflow_step_node_id === step.react_flow_node_id || l.step_node_id === step.react_flow_node_id);
                                if (isCompleted) {
                                  return <span>Approved by: <strong>{stepLog?.actor_id || stepLog?.actor_name || "System"}</strong></span>;
                                }
                                if (isActive) {
                                  return <span>Pending Approval from: <strong>{request.current_assignees_json?.join(', ') || request.current_approver || step.assignee_value}</strong></span>;
                                }
                                return <span>Assignee Role: <strong>{step.assignee_value || "Department Manager"}</strong></span>;
                              })()}
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

          {/* ── COMMENTS SECTION (Visible to ALL authorized users including Requester) ── */}
          <div className="card">
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="card-title">💬 Comments</div>
              <span className="tag">Communication</span>
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
                {/* File attachment preview */}
                {selectedFiles.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    {selectedFiles.map((file, idx) => (
                      <div key={idx} style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", background: "var(--color-border)", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                        <span>📎 {file.name}</span>
                        <button onClick={() => removeSelectedFile(idx)} style={{ background: "none", border: "none", cursor: "pointer", color: "#EF4444", fontSize: 14, lineHeight: 1, padding: 0 }} title="Remove">×</button>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
                    <button onClick={uploadCommentFile} style={{ background: "none", border: "1px solid var(--color-border)", borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                      📎 Attach
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,.pdf,.docx,.doc,.xlsx,.xls,.zip,.txt,.csv"
                      style={{ display: "none" }}
                      onChange={handleFileSelect}
                    />
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={handlePostComment} disabled={isUploadingComment} style={{ marginLeft: "auto" }}>
                    {isUploadingComment ? "⏳ Uploading..." : `Post ${isInternalNote ? "Internal Note" : "Comment"}`}
                  </button>
                </div>
              </div>

              {/* Comments Feed (only user comments, not system logs) */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {(() => {
                  const commentItems = timelineItems.filter(
                    (item: any) => !isInternalWorkflowLog(item)
                  );
                  if (commentItems.length === 0) {
                    return (
                      <div style={{ textAlign: "center", padding: 20, color: "var(--color-text-muted)", fontSize: 12 }}>
                        No comments yet. Be the first to add a comment.
                      </div>
                    );
                  }
                  return commentItems.map((item: any) => {
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
                              {(() => {
                                const dateVal = item.created_at || item.decision_at;
                                return dateVal ? new Date(dateVal).toLocaleString() : "Just now";
                              })()}
                            </span>
                          </div>
                          <p style={{ fontSize: 12, color: "var(--color-text-primary)", margin: 0, whiteSpace: "pre-wrap" }}>
                            {item.comments || item.action}
                          </p>
                          {/* Render attachments */}
                          {item.metadata_json?.attachments && item.metadata_json.attachments.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                              {item.metadata_json.attachments.map((att: any, attIdx: number) => {
                                const isImage = att.mimeType?.startsWith("image/");
                                const fileUrl = `/api/files/${att.fileId}`;
                                if (isImage) {
                                  return (
                                    <div key={attIdx} style={{ position: "relative", borderRadius: 8, overflow: "hidden", border: "1px solid var(--color-border)", maxWidth: 200 }}>
                                      <a href={fileUrl} target="_blank" rel="noreferrer">
                                        <img src={fileUrl} alt={att.fileName} style={{ width: "100%", height: "auto", maxHeight: 150, objectFit: "cover", display: "block" }} />
                                      </a>
                                      <div style={{ fontSize: 10, padding: "2px 6px", background: "rgba(0,0,0,0.6)", color: "#fff", position: "absolute", bottom: 0, left: 0, right: 0, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                                        {att.fileName}
                                      </div>
                                    </div>
                                  );
                                }
                                return (
                                  <a key={attIdx} href={fileUrl} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-bg)", textDecoration: "none", color: "var(--color-text-primary)", fontSize: 11, fontWeight: 600, maxWidth: 220 }}>
                                    <span style={{ fontSize: 16 }}>📎</span>
                                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{att.fileName}</span>
                                    <span style={{ fontSize: 10, color: "var(--color-text-muted)", marginLeft: "auto" }}>↗</span>
                                  </a>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>

          {/* ── ACTIVITY TIMELINE SECTION (Restricted ONLY to Assigned Technical Group members) ── */}
          {isAssignedGroupMemberOrAdmin && (
            <div className="card">
              <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="card-title">⚡ Activity Timeline</div>
                <span className="tag">System Audit Ledger</span>
              </div>
              <div className="card-body">
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {(() => {
                    const logItems = timelineItems.filter(
                      (item: any) => isInternalWorkflowLog(item)
                    );
                    if (logItems.length === 0) {
                      return (
                        <div style={{ textAlign: "center", padding: 20, color: "var(--color-text-muted)", fontSize: 12 }}>
                          No activity recorded yet.
                        </div>
                      );
                    }
                    return logItems.map((item: any) => (
                      <div
                        key={item.id}
                        style={{
                          display: "flex",
                          gap: 12,
                          padding: 12,
                          borderRadius: 8,
                          background: "var(--color-surface)",
                          border: "1px solid var(--color-border)",
                        }}
                      >
                        <div className="avatar md" style={{ background: "#4F46E5", color: "#fff", flexShrink: 0 }}>
                          {item.actor_id ? item.actor_id.substring(0, 2).toUpperCase() : "SY"}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 700 }}>{item.actor_id || "System"}</span>
                            <span style={{ fontSize: 10, color: "var(--color-text-muted)", marginLeft: "auto" }}>
                              {(() => {
                                const dateVal = item.created_at || item.decision_at;
                                return dateVal ? new Date(dateVal).toLocaleString() : "Just now";
                              })()}
                            </span>
                          </div>
                          <p style={{ fontSize: 12, color: "var(--color-text-primary)", margin: 0, whiteSpace: "pre-wrap" }}>
                            {item.comments || item.action}
                          </p>
                          {item.metadata_json?.attachments && item.metadata_json.attachments.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                              {item.metadata_json.attachments.map((att: any, attIdx: number) => {
                                const isImage = att.mimeType?.startsWith("image/");
                                const fileUrl = `/api/files/${att.fileId}`;
                                if (isImage) {
                                  return (
                                    <div key={attIdx} style={{ position: "relative", borderRadius: 8, overflow: "hidden", border: "1px solid var(--color-border)", maxWidth: 200 }}>
                                      <a href={fileUrl} target="_blank" rel="noreferrer">
                                        <img src={fileUrl} alt={att.fileName} style={{ width: "100%", height: "auto", maxHeight: 150, objectFit: "cover", display: "block" }} />
                                      </a>
                                      <div style={{ fontSize: 10, padding: "2px 6px", background: "rgba(0,0,0,0.6)", color: "#fff", position: "absolute", bottom: 0, left: 0, right: 0, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                                        {att.fileName}
                                      </div>
                                    </div>
                                  );
                                }
                                return (
                                  <a key={attIdx} href={fileUrl} target="_blank" rel="noreferrer" style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-bg)", textDecoration: "none", color: "var(--color-text-primary)", fontSize: 11, fontWeight: 600, maxWidth: 220 }}>
                                    <span style={{ fontSize: 16 }}>📎</span>
                                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{att.fileName}</span>
                                    <span style={{ fontSize: 10, color: "var(--color-text-muted)", marginLeft: "auto" }}>↗</span>
                                  </a>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>
          )}
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
                          🛠️ {request.assigned_group || "Unassigned Group"}
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

                      {request.observer_id && request.observer_id.trim() !== "" && (
                        <div style={{ paddingTop: 8, borderTop: '1px dashed var(--color-border)' }}>
                          <div style={{ fontSize: 10, color: "var(--color-text-muted)", fontWeight: 700 }}>Observers / CC (المتابعين)</div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text-primary)", marginTop: 2 }}>
                            👁️ {request.observer_id}
                          </div>
                        </div>
                      )}

                      {/* SECTION: Custom Form Fields Placed in Sidebar */}
                      {sidebarFields.length > 0 && (
                        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed var(--color-border)' }}>
                          <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: 6 }}>
                            📊 Custom Sidebar Info Fields
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {sidebarFields.map((field: any) => {
                              const key = field.key || field.id;
                              const val = values?.[key];
                              if (field.type === 'display_panel' || field.type === 'api_panel') {
                                const queryVal = field.bound_field_key ? values?.[field.bound_field_key] : val;
                                return (
                                  <div key={field.id} style={{ marginTop: 4 }}>
                                    <ExternalIntegrationsPanel
                                      currentUserId={currentUser.id}
                                      currentUserRole={currentUser.role}
                                      targetApiId={field.api_integration_id}
                                      initialQuery={queryVal ? String(queryVal) : undefined}
                                      titleOverride={field.label}
                                      searchLabel={field.api_search_label}
                                      searchPlaceholder={field.placeholder}
                                      buttonText={field.api_button_text}
                                      visibleColumns={field.oracle_columns}
                                      ownershipFilter={field.oracle_ownership_filter}
                                    />
                                  </div>
                                );
                              }
                              return (
                                <div key={field.id} style={{ background: 'var(--color-surface)', padding: 6, borderRadius: 6, border: '1px solid var(--color-border)' }}>
                                  <div style={{ fontSize: 9, color: "var(--color-text-muted)", fontWeight: 700 }}>{field.label}</div>
                                  <div style={{ fontSize: 11, fontWeight: 800, color: "var(--color-text-primary)", marginTop: 2 }}>
                                    {val !== undefined && val !== null && val !== "" ? String(val) : "—"}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* SECTION 3: SLA & Time Targets */}
                  {cfg.showSlaMetrics !== false && isAssignedGroupMemberOrAdmin && (
                    <div style={{ background: 'var(--color-bg)', padding: 10, borderRadius: 8, border: '1px solid var(--color-border)' }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: 8 }}>
                        ⏱️ SLA / OLA Deadlines
                      </div>

                      {(() => {
                        const nowMs = Date.now();
                        const isClosedOrSolved = ['solved', 'closed', 'approved', 'rejected'].includes(request.status);
                        
                        const isTtoBreached = !isClosedOrSolved && request.sla_tto_deadline ? (nowMs > new Date(request.sla_tto_deadline).getTime() && !request.assigned_user) : false;
                        const isTtrBreached = !isClosedOrSolved && (request.sla_ttr_deadline || request.sla_deadline) ? (nowMs > new Date(request.sla_ttr_deadline || request.sla_deadline!).getTime()) : false;
                        const isOlaBreached = !isClosedOrSolved && request.ola_deadline ? (nowMs > new Date(request.ola_deadline).getTime()) : false;

                        return (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                            <div>
                              <div style={{ fontSize: 10, color: "var(--color-text-muted)", fontWeight: 700 }}>
                                SLA TTO (Takeover) {isTtoBreached && '🚨'}
                              </div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: isTtoBreached ? '#EF4444' : '#10B981', marginTop: 2 }}>
                                {request.sla_tto_deadline ? new Date(request.sla_tto_deadline).toLocaleString() : '1 Hour'}
                              </div>
                            </div>

                            <div>
                              <div style={{ fontSize: 10, color: "var(--color-text-muted)", fontWeight: 700 }}>
                                SLA TTR (Resolution) {isTtrBreached && '🚨'}
                              </div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: isTtrBreached ? '#EF4444' : '#3B82F6', marginTop: 2 }}>
                                {request.sla_ttr_deadline || request.sla_deadline ? new Date(request.sla_ttr_deadline || request.sla_deadline!).toLocaleString() : '8 Hours'}
                              </div>
                            </div>

                            <div>
                              <div style={{ fontSize: 10, color: "var(--color-text-muted)", fontWeight: 700 }}>
                                Active Step OLA {isOlaBreached && '🚨'}
                              </div>
                              <div style={{ fontSize: 11, fontWeight: 700, color: isOlaBreached ? '#EF4444' : '#F59E0B', marginTop: 2 }}>
                                {request.ola_deadline ? new Date(request.ola_deadline).toLocaleString() : '—'}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Workflow SLA Metrics */}
          {canViewSlaAndApproval && (() => {
            const steps = request.workflow_version_snapshot || [];
            const currentStep = steps.find((s: any) => s.react_flow_node_id === request.current_step_node_id);
            
            // OLA step target calculations
            const olaHours = currentStep?.ola_hours ?? 4;
            const olaMinutes = currentStep?.ola_minutes ?? 0;
            const olaTotalMs = (olaHours * 60 + olaMinutes) * 60 * 1000;
            
            const stepStartTime = request.date_updated ? new Date(request.date_updated).getTime() : new Date(request.date_created).getTime();
            const stepDeadlineTime = request.ola_deadline ? new Date(request.ola_deadline).getTime() : (stepStartTime + olaTotalMs);
            const totalStepDuration = Math.max(1000, stepDeadlineTime - stepStartTime);
            const elapsedStep = Date.now() - stepStartTime;
            const stepPercent = Math.min(100, Math.max(0, Math.round((elapsedStep / totalStepDuration) * 100)));
            const isStepBreached = Date.now() > stepDeadlineTime;
            
            // SLA TTR calculations
            const slaStartTime = new Date(request.date_created).getTime();
            const slaTtrDeadlineTime = new Date(request.sla_ttr_deadline || request.sla_deadline || (slaStartTime + 48 * 3600000)).getTime();
            const totalSlaDuration = Math.max(1000, slaTtrDeadlineTime - slaStartTime);
            const elapsedSla = Date.now() - slaStartTime;
            const slaPercent = Math.min(100, Math.max(0, Math.round((elapsedSla / totalSlaDuration) * 100)));
            const isSlaBreached = Date.now() > slaTtrDeadlineTime;

            // SLA TTO calculations
            const ttoDeadlineTime = new Date(request.sla_tto_deadline || (slaStartTime + 3600000)).getTime();
            const totalTtoDuration = Math.max(1000, ttoDeadlineTime - slaStartTime);
            const elapsedTto = Date.now() - slaStartTime;
            const ttoPercent = Math.min(100, Math.max(0, Math.round((elapsedTto / totalTtoDuration) * 100)));
            const isTtoBreached = Date.now() > ttoDeadlineTime;

            return (
              <div className="card">
                <div className="card-header" style={{ borderBottom: 'none' }}>
                  <div className="card-title">⏱️ OLA & SLA Targets</div>
                </div>
                <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 0 }}>
                  {/* Active Step OLA */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                      <span><strong>Active Step OLA:</strong> {currentStep?.name || "Approval Step"}</span>
                      <span style={{ color: isStepBreached ? '#EF4444' : '#10B981', fontWeight: 'bold' }}>
                        {olaHours > 0 ? `${Math.round(olaHours)}h` : ''} {olaMinutes > 0 ? `${olaMinutes}m` : ''}
                      </span>
                    </div>
                    <div style={{ width: "100%", height: 8, background: "var(--color-bg)", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${stepPercent}%`, height: "100%", background: isStepBreached ? "#EF4444" : "#10B981" }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: "var(--color-text-muted)", marginTop: 6 }}>
                      <span>{stepPercent}% time elapsed</span>
                      <span>{isStepBreached ? '🚨 Breached' : 'On-Track'}</span>
                    </div>
                  </div>

                  {/* SLA TTO */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                      <strong>Takeover SLA (TTO):</strong>
                      <span style={{ color: isTtoBreached ? '#EF4444' : '#F59E0B', fontWeight: 'bold' }}>
                        {request.sla_tto_deadline ? new Date(request.sla_tto_deadline).toLocaleTimeString() : '1 Hour'}
                      </span>
                    </div>
                    <div style={{ width: "100%", height: 8, background: "var(--color-bg)", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${ttoPercent}%`, height: "100%", background: isTtoBreached ? "#EF4444" : "#F59E0B" }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: "var(--color-text-muted)", marginTop: 6 }}>
                      <span>{ttoPercent}% time elapsed</span>
                      <span>{isTtoBreached ? '🚨 Breached' : 'On-Track'}</span>
                    </div>
                  </div>

                  {/* SLA TTR */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                      <strong>Resolution SLA (TTR):</strong>
                      <span style={{ color: isSlaBreached ? '#EF4444' : '#3B82F6', fontWeight: 'bold' }}>
                        {request.sla_ttr_deadline || request.sla_deadline ? new Date(request.sla_ttr_deadline || request.sla_deadline!).toLocaleTimeString() : '8 Hours'}
                      </span>
                    </div>
                    <div style={{ width: "100%", height: 8, background: "var(--color-bg)", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ width: `${slaPercent}%`, height: "100%", background: isSlaBreached ? "#EF4444" : "#3B82F6" }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: "var(--color-text-muted)", marginTop: 6 }}>
                      <span>{slaPercent}% time elapsed</span>
                      <span>{isSlaBreached ? '🚨 Breached' : 'On-Track'}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* 📱 DEDICATED MOBILE STICKY DECISION BAR */}
      {(() => {
        const isAssignedApproverOrTech = 
          userRoles.includes("admin") || userRoles.includes("agent") ||
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
