import { dbGet, dbCreate } from './mysqlClient';

/**
 * Fetch Authorized Service Catalog Workflows from local MySQL
 */
export async function getAuthorizedWorkflows(currentUserRoleId?: string) {
  try {
    const workflows = await dbGet('workflows');
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
    const payload = {
      id: `tkt-${Date.now()}`,
      ticket_number: ticketNumber,
      workflow_id: workflowId,
      workflow_version: 1,
      title,
      requester_id: 'user-ahmed', // Default mock requester matching local profile simulation
      requester_name: 'Ahmed Mohamed',
      requester_department_id: 'dept-it',
      status: 'pending_approval',
    };
    
    const ticket = await dbCreate('tickets', payload);
    
    // Save fields values relationally to ticket_values table
    for (const key of Object.keys(formValues)) {
      if (key === 'title') continue;
      await dbCreate('ticket_values', {
        id: `val-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ticket_id: ticket.id,
        field_key: key,
        value_text: typeof formValues[key] === 'object' ? JSON.stringify(formValues[key]) : String(formValues[key]),
      });
    }

    return ticket;
  } catch (err) {
    console.warn('[DB SDK Ticket Submission Warning]', err);
    return null;
  }
}
