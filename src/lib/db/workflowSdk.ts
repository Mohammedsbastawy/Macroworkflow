import { dbGet, dbCreate } from './mysqlClient';

/**
 * Fetch Authorized Service Catalog Workflows from local MySQL
 */
export async function getAuthorizedWorkflows(currentUserRoleId?: string) {
  try {
    const workflows = await dbGet('Workflows');
    return workflows;
  } catch (err) {
    console.warn('[DB SDK Workflows Query Warning]', err);
    return [];
  }
}

/**
 * Submit New Ticket to local MySQL 'tickets' and 'ticket_values' tables
 */
export async function submitWorkflowTicket(workflowId: string, title: string, formValues: Record<string, any>) {
  try {
    const ticketNumber = `TKT-${Date.now()}`;
    const ticketId = `tkt-${Date.now()}`;
    const payload = {
      TicketID: ticketId,
      TicketNumber: ticketNumber,
      WorkflowID: workflowId,
      WorkflowVersion: 1,
      Title: title,
      RequesterUserID: 'user-ahmed', // Default mock requester matching local profile simulation
      RequesterName: 'Ahmed Mohamed',
      RequesterDepartmentID: 'dept-it',
      Status: 'pending_approval',
    };
    
    const ticket = await dbCreate('Tickets', payload);
    
    // Save fields values relationally to ticket_values table
    for (const key of Object.keys(formValues)) {
      if (key === 'title') continue;
      await dbCreate('TicketValues', {
        TicketValueID: `val-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        TicketID: ticket.TicketID ?? ticketId,
        FieldKey: key,
        ValueText: typeof formValues[key] === 'object' ? JSON.stringify(formValues[key]) : String(formValues[key]),
      });
    }

    return ticket;
  } catch (err) {
    console.warn('[DB SDK Ticket Submission Warning]', err);
    return null;
  }
}
