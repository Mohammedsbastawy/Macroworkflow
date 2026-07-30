USE emacro_dashboard;

-- Add targeting columns to policies table
ALTER TABLE `policies`
ADD COLUMN `department_ids_json` JSON DEFAULT NULL,
ADD COLUMN `group_ids_json` JSON DEFAULT NULL,
ADD COLUMN `apply_to_all` TINYINT(1) DEFAULT 1;
