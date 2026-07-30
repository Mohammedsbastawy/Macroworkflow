"use client";
import { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  fetchRequestDetailAction,
  submitApprovalDecisionAction,
  pauseTicketOlaAction,
  resumeTicketOlaAction,
} from "@/app/actions/workflowActions";

import { TicketDetailView } from "@/components/tickets/TicketDetailView";

import { SYSTEM_USERS } from "@/lib/engine/iamStore";

export default function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const requestId = resolvedParams.id;

  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const getActiveUser = () => {
    if (typeof window === "undefined") return SYSTEM_USERS[0];
    const savedId = localStorage.getItem("simulated_user_id");
    return SYSTEM_USERS.find((u) => u.id === savedId) || SYSTEM_USERS[0];
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const activeUser = getActiveUser();
      const res = await fetchRequestDetailAction(requestId, activeUser.id);
      setDetail(res);
    } catch (err) {
      console.error(err);
      setDetail(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleSwitch = () => loadData();
    window.addEventListener("user-simulated-switch", handleSwitch);
    return () => window.removeEventListener("user-simulated-switch", handleSwitch);
  }, [requestId]);

  const handleSubmitApproval = async (action: 'approved' | 'rejected' | 'returned_for_revision', comment: string) => {
    const user = getActiveUser();
    await submitApprovalDecisionAction({
      requestId,
      actorName: user.name,
      action,
      comments: comment,
    });
    await loadData();
  };

  const handleSendRfi = async (question: string) => {
    const user = getActiveUser();
    await pauseTicketOlaAction({ requestId, actorName: `${user.name} (${user.role.toUpperCase()})`, question });
    await loadData();
  };

  const handleAnswerRfi = async (answer: string) => {
    const user = getActiveUser();
    await resumeTicketOlaAction({ requestId, requesterName: `${user.name} (Requester)`, answer });
    await loadData();
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)" }}>🔒 Checking ITSM Ticket Security & Permissions...</div>;
  }

  const activeUser = getActiveUser();

  if (!detail || !detail.request) {
    return (
      <div className="card" style={{ padding: 40, textAlign: "center", border: "2px solid #EF4444", background: "rgba(239, 68, 68, 0.05)" }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🛡️ 🚫</div>
        <div style={{ fontWeight: 900, fontSize: 20, color: "#EF4444" }}>403 Access Denied / Ticket Forbidden</div>
        <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: "12px auto 20px", maxWidth: 500, lineHeight: 1.6 }}>
          المحاولة مرفوضة أمنياً! الموظف الحالي (<strong>{activeUser.name}</strong>) ليس لديه صلاحية مشاهدة هذه التذكرة.
          <br />
          وفقاً لمعايير الأمان، يُسمح بالوصول فقط لـ: <strong>مقدم الطلب (Requester)</strong>، <strong>الفني/المعتمد (Assigned Approver)</strong>، <strong>المُتابع (Observer)</strong>، أو <strong>أدمن النظام (Admin)</strong>.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <Link href="/requests">
            <button className="btn btn-primary">📋 الذهاب لتذاكري (My Tickets)</button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <TicketDetailView
      requestId={requestId}
      detail={detail}
      onRefresh={loadData}
      onSubmitApproval={handleSubmitApproval}
      onSendRfi={handleSendRfi}
      onAnswerRfi={handleAnswerRfi}
    />
  );
}
