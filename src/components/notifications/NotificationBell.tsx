"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface NotificationItem {
  id: string;
  event_type: string;
  recipient_id: string;
  ticket_id?: string;
  ticket_number?: string;
  actor_name?: string;
  title_ar: string;
  title_en: string;
  body_ar: string;
  body_en: string;
  priority: string;
  is_read: boolean;
  metadata_json?: { route?: string; entityId?: string } | Record<string, unknown>;
  created_at: string;
}

const ICON_BY_TYPE: Record<string, string> = {
  request_submitted: "📩",
  assigned_to_you: "📨",
  assignment_changed: "🔀",
  approval_requested: "✅",
  approved: "✅",
  rejected: "❌",
  returned_for_revision: "↩️",
  rfi_sent: "❓",
  rfi_answered: "💬",
  comment_added: "💬",
  internal_note_added: "📝",
  ticket_closed: "🔒",
  sla_breached: "🚨",
  ola_breached: "⏰",
  ola_escalated: "🆙",
  delegated: "🤝",
};

export function NotificationBell({ currentUserId }: { currentUserId: string }) {
  const { lang } = useLanguage();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const openRef = useRef(false);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const load = async () => {
    if (!currentUserId) return;
    try {
      const { fetchMyNotificationsAction, fetchUnreadNotificationsCountAction } = await import(
        "@/app/actions/notificationActions"
      );
      const list = (await fetchMyNotificationsAction(currentUserId)) as NotificationItem[];
      const count = (await fetchUnreadNotificationsCountAction(currentUserId)) as number;
      setItems(list);
      setUnread(count);
    } catch (e) {
      // ignore
    }
  };

  // Live badge-only refresh (used while the panel is closed).
  const refreshUnread = async () => {
    if (!currentUserId) return;
    try {
      const { fetchUnreadNotificationsCountAction } = await import("@/app/actions/notificationActions");
      const count = (await fetchUnreadNotificationsCountAction(currentUserId)) as number;
      setUnread(count);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    load();
    const handle = () => load();
    window.addEventListener("system_user_changed", handle);
    window.addEventListener("user-simulated-switch", handle);
    window.addEventListener("notifications-refresh", handle);

    // ── LIVE push via Server-Sent Events (instant, no page refresh).
    let es: EventSource | null = null;
    if (typeof window !== "undefined" && currentUserId) {
      es = new EventSource(`/api/notifications/stream?userId=${encodeURIComponent(currentUserId)}`);
      es.addEventListener("refresh", () => {
        if (openRef.current) load();
        else refreshUnread();
      });
      // EventSource auto-reconnects on failure; treat errors silently.
      es.onerror = () => {};
    }

    // ── Reliable live polling (primary): every 15s.
    // Guarantees live updates even when SSE isn't shared across dev workers.
    const FALLBACK_POLL_MS = 15000;
    const pollId = window.setInterval(() => {
      if (openRef.current) load();
      else refreshUnread();
    }, FALLBACK_POLL_MS);

    return () => {
      es?.close();
      window.clearInterval(pollId);
      window.removeEventListener("system_user_changed", handle);
      window.removeEventListener("user-simulated-switch", handle);
      window.removeEventListener("notifications-refresh", handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  useEffect(() => {
    const onClickAway = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, []);

  const timeAgo = (iso: string) => {
    if (!iso) return "";
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return lang === "ar" ? "الآن" : "now";
    if (mins < 60) return lang === "ar" ? `${mins} د` : `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return lang === "ar" ? `${hrs} س` : `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return lang === "ar" ? `${days} ي` : `${days}d`;
  };

  const openNotification = async (n: NotificationItem) => {
    if (!n.is_read) {
      try {
        const { markNotificationReadAction } = await import("@/app/actions/notificationActions");
        await markNotificationReadAction(n.id);
      } catch (e) {}
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
    }
    setOpen(false);
    const route = (n.metadata_json as any)?.route || (n.ticket_id ? `/requests/${n.ticket_id}` : null);
    if (route) router.push(route);
  };

  const markAllRead = async () => {
    try {
      const { markAllNotificationsReadAction } = await import("@/app/actions/notificationActions");
      await markAllNotificationsReadAction(currentUserId);
    } catch (e) {}
    setItems((prev) => prev.map((x) => ({ ...x, is_read: true })));
    setUnread(0);
  };

  const archive = async (id: string) => {
    try {
      const { archiveNotificationAction } = await import("@/app/actions/notificationActions");
      await archiveNotificationAction(id);
    } catch (e) {}
    setItems((prev) => prev.filter((x) => x.id !== id));
  };

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-flex" }}>
      <button
        className="icon-btn"
        title={lang === "ar" ? "الإشعارات" : "Notifications"}
        onClick={() => setOpen((o) => {
          const next = !o;
          if (next) load(); // ensure a fresh list the moment the panel opens
          return next;
        })}
        style={{ position: "relative" }}
      >
        🔔
        {unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: -2,
              right: -2,
              minWidth: 16,
              height: 16,
              padding: "0 4px",
              borderRadius: 8,
              background: "#EF4444",
              color: "#fff",
              fontSize: 9,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            top: 64,
            right: 24,
            width: 360,
            maxWidth: "calc(100vw - 32px)",
            maxHeight: "70vh",
            display: "flex",
            flexDirection: "column",
            background: "#fff",
            border: "1px solid var(--color-border)",
            borderRadius: 14,
            boxShadow: "0 12px 32px rgba(0,0,0,0.18)",
            zIndex: 10000,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 14px",
              borderBottom: "1px solid var(--color-border)",
              fontWeight: 900,
              fontSize: 13,
              color: "var(--color-text-primary)",
            }}
          >
            <span>{lang === "ar" ? "الإشعارات" : "Notifications"}</span>
            {unread > 0 && (
              <button
                className="btn btn-outline btn-sm"
                onClick={markAllRead}
                style={{ fontSize: 11 }}
              >
                {lang === "ar" ? "تحديد الكل كمقروء" : "Mark all read"}
              </button>
            )}
          </div>

          <div style={{ overflowY: "auto", flex: 1 }}>
            {loading && items.length === 0 && (
              <div style={{ padding: 24, textAlign: "center", color: "var(--color-text-muted)", fontSize: 12 }}>
                {lang === "ar" ? "جارِ التحميل..." : "Loading..."}
              </div>
            )}
            {!loading && items.length === 0 && (
              <div style={{ padding: 28, textAlign: "center", color: "var(--color-text-muted)", fontSize: 13 }}>
                🔕 {lang === "ar" ? "لا توجد إشعارات" : "No notifications"}
              </div>
            )}
            {items.map((n) => (
              <div
                key={n.id}
                onClick={() => openNotification(n)}
                style={{
                  display: "flex",
                  gap: 10,
                  padding: "11px 14px",
                  cursor: "pointer",
                  borderBottom: "1px solid var(--color-border)",
                  background: n.is_read ? "transparent" : "var(--color-primary-light)",
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    minWidth: 34,
                    borderRadius: 10,
                    background: "var(--color-primary)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                  }}
                >
                  {ICON_BY_TYPE[n.event_type] || "🔔"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12.5,
                      fontWeight: 800,
                      color: "var(--color-text-primary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {lang === "ar" ? n.title_ar : n.title_en}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--color-text-secondary)",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {lang === "ar" ? n.body_ar : n.body_en}
                  </div>
                  <div
                    style={{
                      marginTop: 2,
                      fontSize: 10,
                      color: "var(--color-text-muted)",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span>{timeAgo(n.created_at)}</span>
                    {n.ticket_number && <span>· {n.ticket_number}</span>}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    archive(n.id);
                  }}
                  title={lang === "ar" ? "أرشفة" : "Archive"}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--color-text-muted)",
                    cursor: "pointer",
                    fontSize: 12,
                    padding: 4,
                  }}
                >
                  🗑
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
