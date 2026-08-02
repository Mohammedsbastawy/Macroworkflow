/**
 * Notification System — TypeScript interfaces (Interfaces ONLY, no data).
 *
 * One row = one (recipient, event) delivery in the `notifications` collection.
 */

export type NotificationEventType =
  | 'request_submitted'
  | 'assigned_to_you'
  | 'assignment_changed'
  | 'approval_requested'
  | 'approved'
  | 'rejected'
  | 'returned_for_revision'
  | 'rfi_sent'
  | 'rfi_answered'
  | 'comment_added'
  | 'internal_note_added'
  | 'ticket_closed'
  | 'sla_breached'
  | 'ola_breached'
  | 'ola_escalated'
  | 'delegated';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';
export type NotificationChannel = 'in_app' | 'email';

export interface NotificationMetadata {
  entity?: 'ticket' | 'system';
  entityId?: string;
  route?: string;
  workflowName?: string;
  stepName?: string;
  stepNodeId?: string;
  actionStep?: number;
  observers?: string[];
  amount?: number;
  [key: string]: unknown;
}

export interface NotificationRecord {
  id: string;
  event_type: NotificationEventType;
  recipient_id: string;
  ticket_id?: string;
  ticket_number?: string;
  actor_id?: string;
  actor_name?: string;
  title_ar: string;
  title_en: string;
  body_ar: string;
  body_en: string;
  priority: NotificationPriority;
  channel: NotificationChannel;
  is_read: boolean;
  is_archived: boolean;
  metadata_json?: NotificationMetadata;
  created_at: string;
  read_at?: string | null;
}

/** Normalize a raw DB `notifications` row into a typed record. */
export function normalizeNotification(raw: any): NotificationRecord {
  return {
    id: raw.id,
    event_type: raw.event_type || 'request_submitted',
    recipient_id: raw.recipient_id || '',
    ticket_id: raw.ticket_id || undefined,
    ticket_number: raw.ticket_number || undefined,
    actor_id: raw.actor_id || undefined,
    actor_name: raw.actor_name || undefined,
    title_ar: raw.title_ar || '',
    title_en: raw.title_en || '',
    body_ar: raw.body_ar || '',
    body_en: raw.body_en || '',
    priority: raw.priority || 'normal',
    channel: raw.channel || 'in_app',
    is_read: raw.is_read === true || raw.is_read === 1,
    is_archived: raw.is_archived === true || raw.is_archived === 1,
    metadata_json: raw.metadata_json || undefined,
    created_at: raw.created_at || new Date().toISOString(),
    read_at: raw.read_at || null,
  };
}

/**
 * Context passed to the notifier when an engine event occurs.
 * Targeting hints are optional — if omitted they are derived from the
 * resolved ticket via the routing matrix in targeting.ts.
 */
export interface NotificationContext {
  eventType: NotificationEventType;
  ticket?: any; // raw ticket row (or normalized) — used for targeting + content
  ticketId?: string;
  ticketNumber?: string;
  actorId: string;
  actorName: string;
  priority?: NotificationPriority;
  /** Explicit recipient user ids. If provided, overrides matrix resolution. */
  recipients?: string[];
  /** Extra metadata attached to delivery. */
  metadata?: NotificationMetadata;
  /** Workflow step snapshot for context (approval steps). */
  step?: any;
}
