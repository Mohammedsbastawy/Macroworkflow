USE emacro_dashboard;

INSERT INTO directus_collections (collection, icon, note) VALUES
('workflows', 'bolt', 'Workflows Directory'),
('tickets', 'confirmation_number', 'Tickets Store'),
('ticket_values', 'list_alt', 'EAV Values Store'),
('role_permissions', 'security', 'Role Permissions Config'),
('external_api_endpoints', 'api', 'External APIs registry'),
('approval_log', 'history', 'Approval Trail Logs'),
('travel_zones', 'place', 'Travel Zones Directory'),
('system_users', 'people', 'System Users Directory'),
('business_groups', 'group', 'Business Groups Directory'),
('policies', 'gavel', 'System and Department Policies'),
('budgets', 'monetization_on', 'Department Budgets Matrix'),
('departments', 'corporate_fare', 'Departments Directory')
ON DUPLICATE KEY UPDATE icon = VALUES(icon), note = VALUES(note);
