import { hubAdd, hubRemove } from "@/lib/notifications/realtime";

export const runtime = "nodejs";

/**
 * Server-Sent Events stream for live notifications.
 * Open: /api/notifications/stream?userId=user-xxx
 *
 * Emits a `refresh` event whenever a new notification is created for the user.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId") || "";
  const clientId = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      hubAdd(userId, clientId, controller);
      controller.enqueue(encoder.encode(`retry: 5000\n\n`));
      controller.enqueue(encoder.encode(`event: connected\ndata: {"ok":true,"userId":"${userId}"}\n\n`));
    },
    cancel() {
      hubRemove(userId, clientId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
