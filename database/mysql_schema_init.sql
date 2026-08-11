DROP DATABASE IF EXISTS emacro_dashboard;
CREATE DATABASE emacro_dashboard CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE emacro_dashboard;

DROP TABLE IF EXISTS `departments`;
CREATE TABLE `departments` (
  `id` VARCHAR(255) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `code` VARCHAR(50),
  `parent_department_id` VARCHAR(255),
  `manager_user_id` VARCHAR(255),
  `head_user_id` VARCHAR(255),
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,
  FOREIGN KEY (`parent_department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `system_users`;
CREATE TABLE `system_users` (
  `id` VARCHAR(255) PRIMARY KEY,
  `name` VARCHAR(255),
  `email` VARCHAR(255),
  `phone` VARCHAR(50),
  `department_id` VARCHAR(255),
  `group_ids_json` JSON,
  `role` VARCHAR(255),
  `roles_json` JSON,
  `avatar_initials` VARCHAR(255),
  `job_title` VARCHAR(255),
  `direct_manager_id` VARCHAR(255),
  `unit` VARCHAR(255),
  `is_active` TINYINT(1) DEFAULT 1,
  `login_name` VARCHAR(100),
  `password_hash` VARCHAR(255),
  `auth_type` VARCHAR(20) DEFAULT 'password',
  `azure_ad_id` VARCHAR(255),
  `m365_token_json` JSON,
  `m365_mail_enabled` TINYINT(1) DEFAULT 0,
  `delegated_user_id` VARCHAR(255),
  `delegation_enabled` TINYINT(1) DEFAULT 0,
  `delegation_start_date` TIMESTAMP NULL,
  `delegation_end_date` TIMESTAMP NULL,
  `delegation_notes` TEXT,
  `can_assign_group_tickets` TINYINT(1) DEFAULT 0,
  `deleted_at` TIMESTAMP NULL,
  FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL,
  FOREIGN KEY (`direct_manager_id`) REFERENCES `system_users` (`id`) ON DELETE SET NULL,
  FOREIGN KEY (`delegated_user_id`) REFERENCES `system_users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE `departments` ADD CONSTRAINT `fk_dept_manager` FOREIGN KEY (`manager_user_id`) REFERENCES `system_users` (`id`) ON DELETE SET NULL;
ALTER TABLE `departments` ADD CONSTRAINT `fk_dept_head` FOREIGN KEY (`head_user_id`) REFERENCES `system_users` (`id`) ON DELETE SET NULL;

DROP TABLE IF EXISTS `business_groups`;
CREATE TABLE `business_groups` (
  `id` VARCHAR(255) PRIMARY KEY,
  `name` VARCHAR(255),
  `code` VARCHAR(255),
  `member_user_ids_json` JSON,
  `is_active` TINYINT(1) DEFAULT 1,
  `deleted_at` TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `system_user_groups`;
CREATE TABLE `system_user_groups` (
  `id` VARCHAR(36) PRIMARY KEY,
  `user_id` VARCHAR(255) NOT NULL,
  `group_id` VARCHAR(255) NOT NULL,
  `joined_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `system_users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`group_id`) REFERENCES `business_groups` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `workflows`;
CREATE TABLE `workflows` (
  `id` VARCHAR(255) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(100) NOT NULL UNIQUE,
  `category` VARCHAR(100),
  `description` TEXT,
  `icon` VARCHAR(100),
  `color` VARCHAR(50),
  `version` INT DEFAULT 1,
  `published_version` INT DEFAULT 1,
  `sla_total_hours` INT,
  `sla_breach_action` VARCHAR(50),
  `react_flow_graph_json` JSON,
  `fields_json` JSON,
  `steps_json` JSON,
  `visibility_rules_json` JSON,
  `status` VARCHAR(50) DEFAULT 'published',
  `is_archived` TINYINT(1) DEFAULT 0,
  `date_created` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `date_updated` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `tickets`;
CREATE TABLE `tickets` (
  `id` VARCHAR(36) PRIMARY KEY,
  `ticket_number` VARCHAR(100) NOT NULL UNIQUE,
  `workflow_id` VARCHAR(255) NOT NULL,
  `workflow_version` INT NOT NULL,
  `workflow_snapshot_json` JSON NOT NULL,
  `requester_id` VARCHAR(255) NOT NULL,
  `requester_name` VARCHAR(255) NOT NULL,
  `requester_department_id` VARCHAR(255),
  `title` VARCHAR(255) NOT NULL,
  `priority` VARCHAR(20),
  `status` VARCHAR(40),
  `current_step_node_id` VARCHAR(100),
  `current_step_order` INT,
  `current_assignees_json` JSON,
  `submitted_at` TIMESTAMP NULL,
  `sla_deadline` TIMESTAMP NULL,
  `ola_deadline` TIMESTAMP NULL,
  `ola_clock_paused_at` TIMESTAMP NULL,
  `ola_accumulated_pause_ms` BIGINT,
  `solved_at` TIMESTAMP NULL,
  `closed_at` TIMESTAMP NULL,
  `date_created` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `date_updated` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `type` VARCHAR(30),
  `attachments` JSON,
  `subcategory_id` VARCHAR(100),
  `impact` VARCHAR(20),
  `urgency` VARCHAR(20),
  `location_id` VARCHAR(100),
  `requester_department` VARCHAR(100),
  `observer_user_id` VARCHAR(255),
  `pending_reason` VARCHAR(100),
  `sla_tto_deadline` TIMESTAMP NULL,
  `sla_ttr_deadline` TIMESTAMP NULL,
  `time_spent` INT,
  `approval_status` VARCHAR(30),
  `current_approver` VARCHAR(255),
  `solution_type` VARCHAR(100),
  `solution_description` TEXT,
  `solved_date` TIMESTAMP NULL,
  `direct_manager_id` VARCHAR(255),
  `budget_checked` TINYINT(1) DEFAULT 0,
  `policy_checked` TINYINT(1) DEFAULT 0,
  `unit` VARCHAR(255),
  `target_group_ids_json` JSON,
  `assigned_group` VARCHAR(255) NULL,
  `assigned_user` VARCHAR(255) NULL,
  `target_department_ids_json` JSON,
  FOREIGN KEY (`workflow_id`) REFERENCES `workflows` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`requester_id`) REFERENCES `system_users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`requester_department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL,
  FOREIGN KEY (`direct_manager_id`) REFERENCES `system_users` (`id`) ON DELETE SET NULL,
  FOREIGN KEY (`assigned_user`) REFERENCES `system_users` (`id`) ON DELETE SET NULL,
  FOREIGN KEY (`assigned_group`) REFERENCES `business_groups` (`id`) ON DELETE SET NULL,
  FOREIGN KEY (`current_approver`) REFERENCES `system_users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `ticket_values`;
CREATE TABLE `ticket_values` (
  `id` VARCHAR(36) PRIMARY KEY,
  `ticket_id` VARCHAR(36) NOT NULL,
  `field_key` VARCHAR(100) NOT NULL,
  `value_text` TEXT,
  `value_number` DECIMAL(15, 2),
  `value_date` TIMESTAMP NULL,
  `value_json` JSON,
  `file_attachment_id` VARCHAR(36),
  FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `ticket_observers`;
CREATE TABLE `ticket_observers` (
  `id` VARCHAR(36) PRIMARY KEY,
  `ticket_id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(255) NOT NULL,
  `added_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `system_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `ticket_assignees`;
CREATE TABLE `ticket_assignees` (
  `id` VARCHAR(36) PRIMARY KEY,
  `ticket_id` VARCHAR(36) NOT NULL,
  `user_id` VARCHAR(255),
  `group_id` VARCHAR(255),
  `role_code` VARCHAR(100),
  `step_node_id` VARCHAR(255),
  `assigned_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `system_users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`group_id`) REFERENCES `business_groups` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `ticket_comments`;
CREATE TABLE `ticket_comments` (
  `id` VARCHAR(36) PRIMARY KEY,
  `ticket_id` VARCHAR(36) NOT NULL,
  `author_user_id` VARCHAR(255) NOT NULL,
  `author_user_name` VARCHAR(255),
  `type` VARCHAR(20),
  `content` TEXT NOT NULL,
  `date_created` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`author_user_id`) REFERENCES `system_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `approval_log`;
CREATE TABLE `approval_log` (
  `id` VARCHAR(36) PRIMARY KEY,
  `ticket_id` VARCHAR(36) NOT NULL,
  `step_node_id` VARCHAR(100),
  `step_order_snapshot` INT,
  `actor_user_id` VARCHAR(255) NOT NULL,
  `actor_user_name` VARCHAR(255) NOT NULL,
  `action` VARCHAR(50) NOT NULL,
  `comments` TEXT,
  `decision_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `ola_elapsed_ms` BIGINT,
  `hash_sha256` VARCHAR(64),
  FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`actor_user_id`) REFERENCES `system_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `external_api_endpoints`;
CREATE TABLE `external_api_endpoints` (
  `id` VARCHAR(36) PRIMARY KEY,
  `slug` VARCHAR(100) NOT NULL UNIQUE,
  `name` VARCHAR(255) NOT NULL,
  `base_url` TEXT NOT NULL,
  `auth_type` VARCHAR(50),
  `auth_config_json` JSON,
  `response_path` VARCHAR(255),
  `timeout_ms` INT,
  `status` VARCHAR(20),
  `date_created` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `policies`;
CREATE TABLE `policies` (
  `id` VARCHAR(100) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `code` VARCHAR(100),
  `department_id` VARCHAR(255),
  `workflow_slug` VARCHAR(255),
  `max_amount_limit` DECIMAL(15, 2),
  `error_message_ar` TEXT,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,
  `description` TEXT,
  `rules_json` JSON,
  `department_ids_json` JSON,
  `group_ids_json` JSON,
  `apply_to_all` TINYINT(1) DEFAULT 1,
  FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `budgets`;
CREATE TABLE `budgets` (
  `id` VARCHAR(36) PRIMARY KEY,
  `department_id` VARCHAR(255),
  `fiscal_year` INT NOT NULL,
  `quarter` VARCHAR(10) NOT NULL,
  `allocated_amount` DECIMAL(15, 2) NOT NULL,
  `spent_amount` DECIMAL(15, 2) NOT NULL,
  `currency` VARCHAR(10),
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL,
  FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `travel_zones`;
CREATE TABLE `travel_zones` (
  `id` VARCHAR(255) PRIMARY KEY,
  `name` VARCHAR(255),
  `code` VARCHAR(255),
  `is_active` TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` VARCHAR(64) PRIMARY KEY,
  `event_type` VARCHAR(50) NOT NULL,
  `recipient_id` VARCHAR(255) NOT NULL,
  `ticket_id` VARCHAR(36),
  `ticket_number` VARCHAR(50),
  `actor_id` VARCHAR(255),
  `actor_name` VARCHAR(255),
  `title_ar` VARCHAR(255),
  `title_en` VARCHAR(255),
  `body_ar` TEXT,
  `body_en` TEXT,
  `priority` VARCHAR(10) DEFAULT 'normal',
  `channel` VARCHAR(20) DEFAULT 'in_app',
  `is_read` TINYINT(1) DEFAULT 0,
  `is_archived` TINYINT(1) DEFAULT 0,
  `metadata_json` JSON,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `read_at` TIMESTAMP NULL,
  KEY `idx_notif_recipient` (`recipient_id`),
  KEY `idx_notif_ticket` (`ticket_id`),
  FOREIGN KEY (`recipient_id`) REFERENCES `system_users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`actor_id`) REFERENCES `system_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `system_settings`;
CREATE TABLE `system_settings` (
  `key` VARCHAR(255) NOT NULL PRIMARY KEY,
  `value` TEXT NULL,
  `description` TEXT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `policy_travel_rates`;
CREATE TABLE `policy_travel_rates` (
  `id` VARCHAR(100) PRIMARY KEY,
  `policy_id` VARCHAR(100) NOT NULL,
  `zone_from_id` VARCHAR(255) NOT NULL,
  `zone_to_id` VARCHAR(255) NOT NULL,
  `meal_price` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `meal_overnight_price` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `transport_allowance` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`policy_id`) REFERENCES `policies` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`zone_from_id`) REFERENCES `travel_zones` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`zone_to_id`) REFERENCES `travel_zones` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `workflow_simulations`;
CREATE TABLE `workflow_simulations` (
  `id` VARCHAR(36) PRIMARY KEY,
  `workflow_id` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `trigger_rules_json` JSON,
  `initial_form_data` JSON,
  `execution_path_json` JSON,
  `created_by` VARCHAR(100) DEFAULT 'System Admin',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`workflow_id`) REFERENCES `workflows` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `role_permissions`;
CREATE TABLE `role_permissions` (
  `id` VARCHAR(64) PRIMARY KEY,
  `role_code` VARCHAR(50) NOT NULL,
  `modules_json` JSON,
  `actions_json` JSON,
  `ticket_scope` VARCHAR(20) DEFAULT 'own',
  `date_created` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `date_updated` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `business_rules`;
CREATE TABLE `business_rules` (
  `id` VARCHAR(64) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `is_active` TINYINT(1) DEFAULT 1,
  `execution_order` INT DEFAULT 0,
  `match_type` VARCHAR(10) DEFAULT 'AND',
  `stop_on_match` TINYINT(1) DEFAULT 0,
  `date_created` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `date_updated` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `rule_criteria`;
CREATE TABLE `rule_criteria` (
  `id` VARCHAR(64) PRIMARY KEY,
  `rule_id` VARCHAR(64) NOT NULL,
  `field` VARCHAR(100),
  `operator` VARCHAR(30),
  `value` TEXT,
  FOREIGN KEY (`rule_id`) REFERENCES `business_rules` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `rule_actions`;
CREATE TABLE `rule_actions` (
  `id` VARCHAR(64) PRIMARY KEY,
  `rule_id` VARCHAR(64) NOT NULL,
  `action_type` VARCHAR(50),
  `target_value` TEXT,
  `execution_order` INT DEFAULT 0,
  FOREIGN KEY (`rule_id`) REFERENCES `business_rules` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
