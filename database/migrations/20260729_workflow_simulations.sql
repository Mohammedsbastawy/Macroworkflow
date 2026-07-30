USE emacro_dashboard;

DROP TABLE IF EXISTS `workflow_simulations`;
CREATE TABLE `workflow_simulations` (
  `id` VARCHAR(36) PRIMARY KEY,
  `workflow_id` VARCHAR(100) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `trigger_rules_json` JSON,
  `initial_form_data` JSON,
  `execution_path_json` JSON,
  `created_by` VARCHAR(100) DEFAULT 'System Admin',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`workflow_id`) REFERENCES `workflows`(`id`) ON DELETE CASCADE
);
