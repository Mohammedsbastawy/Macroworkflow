-- Migration: Ticket Target Audience (Target Business Groups / Target Departments)
-- Enforces workflow-level visibility on tickets. These two columns store the
-- source workflow's Target Business Groups / Target Departments so that
-- canUserAccessTicket() can gate who may view a ticket.
-- Applied to: emacro_dashboard (MySQL)

ALTER TABLE tickets
  ADD COLUMN target_group_ids_json TEXT NULL,
  ADD COLUMN target_department_ids_json TEXT NULL;
