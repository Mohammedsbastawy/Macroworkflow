/**
 * Notification System — Dispatcher.
 *
 * Takes a NotificationContext, resolves recipients via the routing matrix,
 * and inserts one `notifications` row per resolved recipient.
 *
 * All writes go through dbCreate (the single MySQL database data layer).
 */

import { dbCreate } from '@/lib/db/mysqlClient';
import { NotificationContext, NotificationRecord } from './types';
import { resolveRecipients, buildNotificationContent } from './targeting';
import { hubBroadcast } from './realtime';

/** Insert one notification row into the `notifications` collection. */
async function insert(
  ctx: NotificationContext,
  recipientId: string,
  content: { title_ar: string; title_en: string; body_ar: string; body_en: string; priority: any; metadata: any }
): Promise<void> {
  const t = ctx.ticket;
  const ticketNumber = ctx.ticketNumber || t?.ticket_number || '';
  const now = new Date().toISOString();
  const record: NotificationRecord = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    event_type: ctx.eventType,
    recipient_id: recipientId,
    ticket_id: ctx.ticketId || t?.id || undefined,
    ticket_number: ticketNumber || undefined,
    actor_id: ctx.actorId || undefined,
    actor_name: ctx.actorName || undefined,
    title_ar: content.title_ar,
    title_en: content.title_en,
    body_ar: content.body_ar,
    body_en: content.body_en,
    priority: content.priority || 'normal',
    channel: 'in_app',
    is_read: false,
    is_archived: false,
    metadata_json: content.metadata || {},
    created_at: now,
    read_at: null,
  };
  try {
    await dbCreate('notifications', record as any);
    // Live push: notify this recipient's open SSE connections to refresh.
    try {
      hubBroadcast(recipientId, {
        event_type: ctx.eventType,
        ticket_id: record.ticket_id || null,
        created_at: now,
      });
    } catch (e) {
      console.warn('[notifier] broadcast failed', recipientId, e);
    }
  } catch (e) {
    console.warn('[notifier] insert failed', ctx.eventType, recipientId, e);
  }
}

/**
 * Notify — entry point for engine hooks. Fire-and-forget fan-out.
 * Never throws: notification failures must not block business logic.
 */
export async function notify(ctx: NotificationContext): Promise<void> {
  try {
    const recipients = await resolveRecipients(ctx);
    const content = buildNotificationContent(ctx);
    for (const recipientId of recipients) {
      await insert(ctx, recipientId, content);
    }
  } catch (e) {
    console.warn('[notifier] dispatch failed', ctx.eventType, e);
  }
}
