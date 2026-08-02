import crypto from 'crypto';
import { dbGet, dbUpdate, dbCreate } from '@/lib/db/mysqlClient';
import { normalizeTicket, normalizeApprovalLog } from './store';
import { SYSTEM_USERS, SystemUser } from './iamStore';
import { WorkflowRequest, ApprovalLogEntry } from '@/types/workflow';
import { notify } from '@/lib/notifications/notifier';

export interface DocTypeDefinition {
  id: string;
  name: string;
  slug: string;
  module: string;
  description: string;
  icon: string;
  color: string;
  is_submittable: boolean;
  version: number;
}

export interface TicketTask {
  id: string;
  ticket_id: string;
  title: string;
  assigned_to: string;
  status: 'pending' | 'in_progress' | 'completed';
  due_date?: string;
  date_created: string;
}

export interface TicketSlaLog {
  id: string;
  ticket_id: string;
  step_node_id?: string;
  event_type: 'started' | 'paused_rfi' | 'resumed_rfi' | 'breached' | 'escalated' | 'solved';
  event_time: string;
  notes: string;
}

/**
 * Generate Cryptographic SHA256 Hash for Audit Trail Integrity (GLPI / Frappe Style Ledger)
 */
export function generateAuditHash(ticketId: string, actorId: string, action: string, timestamp: string): string {
  const raw = `${ticketId}:${actorId}:${action}:${timestamp}:ENTERPRISE_SECRET_KEY`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

/**
 * Process GLPI Ticket RFI (Request For Information) — Pauses OLA Clock
 * Now reads/writes from database instead of local JSON.
 */
export async function pauseTicketOlaClockForRfi(ticketId: string, actorName: string, rfiQuestion: string) {
  // Find ticket in database
  let ticket = await findTicket(ticketId);
  if (!ticket) throw new Error(`Ticket ${ticketId} not found in database`);

  const now = new Date().toISOString();

// Update ticket status in database
  const updatedTicket = await dbUpdate('Tickets', ticket.TicketID ?? ticket.id, {
    Status: 'pending_info',
    OlaClockPausedAt: now,
    DateUpdated: now,
  });

  const auditHash = generateAuditHash(ticket.TicketID ?? ticket.id, actorName, 'rfi_sent', now);

  // Create approval log in database
  const logPayload = {
    TicketID: ticket.TicketID ?? ticket.id,
    ActorUserID: actorName,
    ActorUserName: actorName,
    Action: 'rfi_sent',
    Comments: `RFI Question: ${rfiQuestion}`,
    DecisionAt: now,
    HashSha256: auditHash,
  };

  const log = await dbCreate('ApprovalLog', logPayload);

  // Log OLA clock paused separately for Activity Timeline
  await dbCreate('ApprovalLog', {
    ApprovalLogID: `log_ola_pause_${Date.now()}`,
    TicketID: ticket.TicketID ?? ticket.id,
    ActorUserID: 'System',
    ActorUserName: 'OLA Tracker',
    Action: 'ola_paused',
    Comments: `[OLA Tracker]: OLA clock paused due to RFI (Request For Information).`,
    DecisionAt: now,
  });

  // ── Notification: RFI sent → announce to everyone on the ticket
  // (requester, tech group/assignee, CC'd observers).
  void notify({
    eventType: 'rfi_sent',
    ticket: updatedTicket || ticket,
    ticketId: ticket.TicketID ?? ticket.id,
    ticketNumber: ticket.TicketNumber ?? ticket.ticket_number,
    actorId: actorName,
    actorName,
    metadata: { rfiQuestion },
  });

  return { ticket: normalizeTicket(updatedTicket), log: normalizeApprovalLog(log) };
}

/**
 * Process GLPI Ticket RFI Answer — Resumes OLA Clock
 * Now reads/writes from database instead of local JSON.
 */
export async function resumeTicketOlaClockAfterRfi(ticketId: string, requesterName: string, answerText: string) {
  let ticket = await findTicket(ticketId);
  if (!ticket) throw new Error(`Ticket ${ticketId} not found in database`);

  const now = new Date().toISOString();
  const updatePayload: Record<string, any> = {
    Status: 'pending',
    DateUpdated: now,
  };

  if (ticket.OlaClockPausedAt ?? ticket.ola_clock_paused_at) {
    const pausedMs = Date.now() - new Date(ticket.OlaClockPausedAt ?? ticket.ola_clock_paused_at).getTime();
    updatePayload.OlaAccumulatedPauseMs = ((ticket.OlaAccumulatedPauseMs ?? ticket.ola_accumulated_pause_ms) || 0) + pausedMs;
    updatePayload.OlaClockPausedAt = null;

    // Extend OLA deadline by paused duration
    if (ticket.OlaDeadline ?? ticket.ola_deadline) {
      const oldDeadline = new Date(ticket.OlaDeadline ?? ticket.ola_deadline).getTime();
      updatePayload.OlaDeadline = new Date(oldDeadline + pausedMs).toISOString();
    }
  }

  const updatedTicket = await dbUpdate('Tickets', ticket.TicketID ?? ticket.id, updatePayload);

  const auditHash = generateAuditHash(ticket.TicketID ?? ticket.id, requesterName, 'rfi_answered', now);

  const logPayload = {
    TicketID: ticket.TicketID ?? ticket.id,
    ActorUserID: requesterName,
    ActorUserName: requesterName,
    Action: 'rfi_answered',
    Comments: `RFI Answer: ${answerText}`,
    DecisionAt: now,
    HashSha256: auditHash,
  };

  const log = await dbCreate('ApprovalLog', logPayload);

  // Log OLA clock resumed separately for Activity Timeline
  await dbCreate('ApprovalLog', {
    ApprovalLogID: `log_ola_resume_${Date.now()}`,
    TicketID: ticket.TicketID ?? ticket.id,
    ActorUserID: 'System',
    ActorUserName: 'OLA Tracker',
    Action: 'ola_resumed',
    Comments: `[OLA Tracker]: OLA clock resumed.`,
    DecisionAt: now,
  });

  // ── Notification: RFI answered → announce to everyone on the ticket.
  void notify({
    eventType: 'rfi_answered',
    ticket: updatedTicket || ticket,
    ticketId: ticket.TicketID ?? ticket.id,
    ticketNumber: ticket.TicketNumber ?? ticket.ticket_number,
    actorId: requesterName,
    actorName: requesterName,
    metadata: { answerText },
  });

  return { ticket: normalizeTicket(updatedTicket), log: normalizeApprovalLog(log) };
}

/**
 * Helper: find a ticket by id or ticket_number in database
 */
async function findTicket(ticketId: string): Promise<any | null> {
  // Try by direct ID first
  try {
    const rows = await dbGet('Tickets', { TicketID: { _eq: ticketId } }, undefined, 1);
    if (rows.length > 0) return rows[0];
  } catch {}

  // Try by ticket_number
  const byNumber = await dbGet('Tickets', { TicketNumber: { _eq: ticketId } }, undefined, 1);
  if (byNumber.length > 0) return byNumber[0];

  return null;
}

