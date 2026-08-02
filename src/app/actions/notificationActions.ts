"use server";

import { revalidatePath } from "next/cache";
import { dbGet, dbUpdate } from "@/lib/db/mysqlClient";
import { normalizeNotification } from "@/lib/notifications/types";

/**
 * Fetch notifications for a recipient, newest first.
 * Consumer-side privacy: the filter is by recipient_id, and the UI renders
 * only tickets the current user can access (see NotificationBell).
 */
export async function fetchMyNotificationsAction(userId: string) {
  if (!userId) return [];
  try {
    const rows = await dbGet(
      "notifications",
      { recipient_id: { _eq: userId }, is_archived: 0 },
      "-created_at"
    );
    return (rows || []).map(normalizeNotification);
  } catch (e) {
    console.error("[fetchMyNotificationsAction Error]", e);
    return [];
  }
}

/** Unread count for the bell badge. */
export async function fetchUnreadNotificationsCountAction(userId: string) {
  if (!userId) return 0;
  try {
    const rows = await dbGet(
      "notifications",
      { recipient_id: { _eq: userId }, is_read: 0, is_archived: 0 },
      undefined
    );
    return (rows || []).length;
  } catch (e) {
    return 0;
  }
}

/** Mark a single notification as read. */
export async function markNotificationReadAction(id: string) {
  try {
    await dbUpdate("notifications", id, {
      is_read: 1,
      read_at: new Date().toISOString(),
    });
  } catch (e) {
    console.warn("[markNotificationReadAction warning]", e);
  }
  return { success: true };
}

/** Mark all notifications for a recipient as read. */
export async function markAllNotificationsReadAction(userId: string) {
  if (!userId) return { success: true };
  try {
    const rows = await dbGet(
      "notifications",
      { recipient_id: { _eq: userId }, is_read: 0, is_archived: 0 }
    );
    for (const row of rows || []) {
      await dbUpdate("notifications", row.id, {
        is_read: 1,
        read_at: new Date().toISOString(),
      });
    }
  } catch (e) {
    console.warn("[markAllNotificationsReadAction warning]", e);
  }
  return { success: true };
}

/** Archive (soft delete) a notification for the recipient. */
export async function archiveNotificationAction(id: string) {
  try {
    await dbUpdate("notifications", id, { is_archived: 1 });
  } catch (e) {
    console.warn("[archiveNotificationAction warning]", e);
  }
  revalidatePath("/");
  return { success: true };
}
