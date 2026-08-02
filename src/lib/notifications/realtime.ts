/**
 * Real-time SSE hub for the Notification System.
 *
 * Maintains, in-memory, the open Server-Sent Events connections per recipient.
 * When a new notification is inserted (notifier.ts), we broadcast a `refresh`
 * event to that recipient's open connections so the UI updates instantly —
 * no page refresh, no polling wait.
 *
 * NOTE: in-memory hub is scoped to a single Node process (appropriate for the
 * local/dev setup). For multi-instance production, swap this for Redis pub/sub.
 */

export type SseController = {
  enqueue: (chunk: Uint8Array | string) => void;
  error?: (e?: unknown) => void;
};

// Global singleton so the route handler and the notifier always share the same
// connection map — even if the module is bundled into separate instances in dev.
const HUB_KEY = "__workflow_sse_notifications_hub__";
const globalAny = globalThis as any;
if (!globalAny[HUB_KEY]) {
  globalAny[HUB_KEY] = new Map<string, Map<string, SseController>>();
}
const clientsByUser: Map<string, Map<string, SseController>> = globalAny[HUB_KEY];

export function hubAdd(userId: string, clientId: string, controller: SseController): void {
  if (!clientsByUser.has(userId)) clientsByUser.set(userId, new Map());
  clientsByUser.get(userId)!.set(clientId, controller);
}

export function hubRemove(userId: string, clientId: string): void {
  const userClients = clientsByUser.get(userId);
  if (!userClients) return;
  userClients.delete(clientId);
  if (userClients.size === 0) clientsByUser.delete(userId);
}

/** Push a `refresh` event to a recipient's open SSE connections. */
export function hubBroadcast(userId: string, data: unknown): void {
  const userClients = clientsByUser.get(userId);
  if (!userClients || userClients.size === 0) return;
  const payload = `event: refresh\ndata: ${JSON.stringify(data)}\n\n`;
  for (const [id, controller] of userClients) {
    try {
      controller.enqueue(payload);
    } catch {
      userClients.delete(id); // dead connection — drop it
    }
  }
}
