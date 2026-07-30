DROP DATABASE IF EXISTS emacro_dashboard;
CREATE DATABASE emacro_dashboard CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE emacro_dashboard;

DROP TABLE IF EXISTS `departments`;
CREATE TABLE `departments` (
  `id` VARCHAR(255) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `code` VARCHAR(50),
  `parent_department_id` VARCHAR(255),
  `manager_id` VARCHAR(255),
  `created_at` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL,
  `head_user_id` VARCHAR(255),
  `deleted_at` TIMESTAMP NULL
);

DROP TABLE IF EXISTS `system_users`;
CREATE TABLE `system_users` (
  `id` VARCHAR(255) PRIMARY KEY,
  `name` VARCHAR(255),
  `email` VARCHAR(255),
  `department_id` VARCHAR(255),
  `group_ids_json` JSON,
  `role` VARCHAR(255),
  `avatar_initials` VARCHAR(255),
  `job_title` VARCHAR(255),
  `direct_manager_id` VARCHAR(255),
  `unit` VARCHAR(255),
  `is_active` TINYINT(1),
  `deleted_at` TIMESTAMP NULL
);

DROP TABLE IF EXISTS `business_groups`;
CREATE TABLE `business_groups` (
  `id` VARCHAR(255) PRIMARY KEY,
  `name` VARCHAR(255),
  `code` VARCHAR(255),
  `member_user_ids_json` JSON,
  `is_active` TINYINT(1),
  `deleted_at` TIMESTAMP NULL
);

DROP TABLE IF EXISTS `system_user_groups`;
CREATE TABLE `system_user_groups` (
  `id` VARCHAR(36) PRIMARY KEY,
  `user_id` VARCHAR(100) NOT NULL,
  `group_id` VARCHAR(100) NOT NULL,
  `joined_at` TIMESTAMP NULL
);

DROP TABLE IF EXISTS `workflows`;
CREATE TABLE `workflows` (
  `id` VARCHAR(36) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(100) NOT NULL,
  `category` VARCHAR(100),
  `description` TEXT,
  `icon` VARCHAR(100),
  `color` VARCHAR(50),
  `version` INT,
  `published_version` INT,
  `sla_total_hours` INT,
  `sla_breach_action` VARCHAR(50),
  `react_flow_graph_json` JSON,
  `date_created` TIMESTAMP NULL,
  `date_updated` TIMESTAMP NULL,
  `fields_json` JSON,
  `steps_json` JSON,
  `status` VARCHAR(50),
  `is_archived` TINYINT(1)
);

DROP TABLE IF EXISTS `tickets`;
CREATE TABLE `tickets` (
  `id` VARCHAR(36) PRIMARY KEY,
  `ticket_number` VARCHAR(100) NOT NULL,
  `workflow_id` VARCHAR(36) NOT NULL,
  `workflow_version` INT NOT NULL,
  `workflow_snapshot_json` JSON NOT NULL,
  `requester_id` VARCHAR(100) NOT NULL,
  `requester_name` VARCHAR(255) NOT NULL,
  `requester_department_id` VARCHAR(100),
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
  `date_created` TIMESTAMP NULL,
  `date_updated` TIMESTAMP NULL,
  `type` VARCHAR(30),
  `attachments` JSON,
  `subcategory_id` VARCHAR(100),
  `impact` VARCHAR(20),
  `urgency` VARCHAR(20),
  `location_id` VARCHAR(100),
  `requester_department` VARCHAR(100),
  `observer_id` VARCHAR(100),
  `pending_reason` VARCHAR(100),
  `sla_tto_deadline` TIMESTAMP NULL,
  `sla_ttr_deadline` TIMESTAMP NULL,
  `time_spent` INT,
  `approval_status` VARCHAR(30),
  `current_approver` VARCHAR(100),
  `solution_type` VARCHAR(100),
  `solution_description` TEXT,
  `solved_date` TIMESTAMP NULL,
  `direct_manager_id` VARCHAR(255),
  `budget_checked` TINYINT(1),
  `policy_checked` TINYINT(1),
  `unit` VARCHAR(255)
);

DROP TABLE IF EXISTS `ticket_values`;
CREATE TABLE `ticket_values` (
  `id` VARCHAR(36) PRIMARY KEY,
  `ticket_id` VARCHAR(36) NOT NULL,
  `field_key` VARCHAR(100) NOT NULL,
  `value_text` TEXT,
  `value_number` DECIMAL(15, 2),
  `value_date` TIMESTAMP NULL,
  `value_json` JSON,
  `file_attachment_id` VARCHAR(36)
);

DROP TABLE IF EXISTS `ticket_observers`;
CREATE TABLE `ticket_observers` (
  `id` VARCHAR(36) PRIMARY KEY,
  `ticket_id` VARCHAR(100) NOT NULL,
  `user_id` VARCHAR(100) NOT NULL,
  `added_at` TIMESTAMP NULL
);

DROP TABLE IF EXISTS `ticket_assignees`;
CREATE TABLE `ticket_assignees` (
  `id` VARCHAR(36) PRIMARY KEY,
  `ticket_id` VARCHAR(100) NOT NULL,
  `user_id` VARCHAR(100),
  `group_id` VARCHAR(100),
  `role_code` VARCHAR(100),
  `step_node_id` VARCHAR(255),
  `assigned_at` TIMESTAMP NULL
);

DROP TABLE IF EXISTS `ticket_comments`;
CREATE TABLE `ticket_comments` (
  `id` VARCHAR(36) PRIMARY KEY,
  `ticket_id` VARCHAR(100) NOT NULL,
  `author_id` VARCHAR(100) NOT NULL,
  `author_name` VARCHAR(255),
  `type` VARCHAR(20),
  `content` TEXT NOT NULL,
  `date_created` TIMESTAMP NULL,
  `updated_at` TIMESTAMP NULL
);

DROP TABLE IF EXISTS `approval_log`;
CREATE TABLE `approval_log` (
  `id` VARCHAR(36) PRIMARY KEY,
  `ticket_id` VARCHAR(36) NOT NULL,
  `step_node_id` VARCHAR(100),
  `step_order_snapshot` INT,
  `actor_id` VARCHAR(100) NOT NULL,
  `actor_name` VARCHAR(255) NOT NULL,
  `action` VARCHAR(50) NOT NULL,
  `comments` TEXT,
  `decision_at` TIMESTAMP NULL,
  `ola_elapsed_ms` BIGINT,
  `hash_sha256` VARCHAR(64)
);

DROP TABLE IF EXISTS `external_api_endpoints`;
CREATE TABLE `external_api_endpoints` (
  `id` VARCHAR(36) PRIMARY KEY,
  `slug` VARCHAR(100) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `base_url` TEXT NOT NULL,
  `auth_type` VARCHAR(50),
  `auth_config_json` JSON,
  `response_path` VARCHAR(255),
  `timeout_ms` INT,
  `status` VARCHAR(20),
  `date_created` TIMESTAMP NULL
);

DROP TABLE IF EXISTS `policies`;
CREATE TABLE `policies` (
  `id` VARCHAR(100) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `department_id` VARCHAR(100),
  `workflow_slug` VARCHAR(255),
  `max_amount_limit` DECIMAL(15, 2),
  `error_message_ar` TEXT,
  `is_active` TINYINT(1),
  `created_at` TIMESTAMP NULL,
  `deleted_at` TIMESTAMP NULL,
  `description` TEXT,
  `rules_json` JSON
);

DROP TABLE IF EXISTS `budgets`;
CREATE TABLE `budgets` (
  `id` VARCHAR(36) PRIMARY KEY,
  `department_id` VARCHAR(255),
  `fiscal_year` INT NOT NULL,
  `quarter` VARCHAR(10) NOT NULL,
  `allocated_amount` DECIMAL(15, 2) NOT NULL,
  `spent_amount` DECIMAL(15, 2) NOT NULL,
  `currency` VARCHAR(10),
  `created_at` TIMESTAMP NULL,
  `deleted_at` TIMESTAMP NULL
);

DROP TABLE IF EXISTS `travel_zones`;
CREATE TABLE `travel_zones` (
  `id` VARCHAR(255) PRIMARY KEY,
  `name` VARCHAR(255),
  `code` VARCHAR(255),
  `is_active` TINYINT(1)
);

