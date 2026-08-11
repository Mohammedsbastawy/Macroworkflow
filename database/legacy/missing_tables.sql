USE emacro_dashboard;

CREATE TABLE IF NOT EXISTS `TicketValues` (
  `TicketValueID` VARCHAR(36) PRIMARY KEY,
  `TicketID` VARCHAR(36) NOT NULL,
  `FieldKey` VARCHAR(100) NOT NULL,
  `ValueText` TEXT,
  `ValueNumber` DECIMAL(15, 2),
  `ValueDate` TIMESTAMP NULL,
  `ValueJson` JSON,
  `FileAttachmentID` VARCHAR(36),
  FOREIGN KEY (`TicketID`) REFERENCES `Tickets` (`TicketID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `TicketObservers` (
  `TicketObserverID` VARCHAR(36) PRIMARY KEY,
  `TicketID` VARCHAR(100) NOT NULL,
  `UserID` VARCHAR(100) NOT NULL,
  `AddedAt` TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS `TicketAssignees` (
  `TicketAssigneeID` VARCHAR(36) PRIMARY KEY,
  `TicketID` VARCHAR(100) NOT NULL,
  `UserID` VARCHAR(100),
  `BusinessGroupID` VARCHAR(100),
  `RoleCode` VARCHAR(100),
  `StepNodeID` VARCHAR(255),
  `AssignedAt` TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS `TicketComments` (
  `TicketCommentID` VARCHAR(36) PRIMARY KEY,
  `TicketID` VARCHAR(100) NOT NULL,
  `AuthorUserID` VARCHAR(100) NOT NULL,
  `AuthorUserName` VARCHAR(255),
  `Type` VARCHAR(20),
  `Content` TEXT NOT NULL,
  `DateCreated` TIMESTAMP NULL,
  `UpdatedAt` TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS `ApprovalLog` (
  `ApprovalLogID` VARCHAR(36) PRIMARY KEY,
  `TicketID` VARCHAR(36) NOT NULL,
  `StepNodeID` VARCHAR(100),
  `StepOrderSnapshot` INT,
  `ActorUserID` VARCHAR(100) NOT NULL,
  `ActorUserName` VARCHAR(255) NOT NULL,
  `Action` VARCHAR(50) NOT NULL,
  `Comments` TEXT,
  `DecisionAt` TIMESTAMP NULL,
  `OlaElapsedMs` BIGINT,
  `HashSha256` VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS `ExternalApiEndpoints` (
  `ExternalApiEndpointID` VARCHAR(36) PRIMARY KEY,
  `Slug` VARCHAR(100) NOT NULL,
  `ExternalApiEndpointName` VARCHAR(255) NOT NULL,
  `BaseUrl` TEXT NOT NULL,
  `AuthType` VARCHAR(50),
  `AuthConfigJson` JSON,
  `ResponsePath` VARCHAR(255),
  `TimeoutMs` INT,
  `Status` VARCHAR(20),
  `DateCreated` TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS `Policies` (
  `PolicyID` VARCHAR(100) PRIMARY KEY,
  `PolicyName` VARCHAR(255) NOT NULL,
  `DepartmentID` VARCHAR(100),
  `WorkflowSlug` VARCHAR(255),
  `MaxAmountLimit` DECIMAL(15, 2),
  `ErrorMessageAr` TEXT,
  `IsActive` TINYINT(1),
  `CreatedAt` TIMESTAMP NULL,
  `DeletedAt` TIMESTAMP NULL,
  `Description` TEXT,
  `RulesJson` JSON,
  `PolicyCode` VARCHAR(100),
  `DepartmentIDsJson` JSON,
  `GroupIDsJson` JSON,
  `ApplyToAll` TINYINT(1) DEFAULT 1
);

CREATE TABLE IF NOT EXISTS `Budgets` (
  `BudgetID` VARCHAR(36) PRIMARY KEY,
  `DepartmentID` VARCHAR(255),
  `FiscalYear` INT NOT NULL,
  `Quarter` VARCHAR(10) NOT NULL,
  `AllocatedAmount` DECIMAL(15, 2) NOT NULL,
  `SpentAmount` DECIMAL(15, 2) NOT NULL,
  `Currency` VARCHAR(10),
  `CreatedAt` TIMESTAMP NULL,
  `DeletedAt` TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS `TravelZones` (
  `TravelZoneID` VARCHAR(255) PRIMARY KEY,
  `TravelZoneName` VARCHAR(255),
  `TravelZoneCode` VARCHAR(255),
  `IsActive` TINYINT(1)
);

CREATE TABLE IF NOT EXISTS `notifications` (
  `id` VARCHAR(64) PRIMARY KEY,
  `event_type` VARCHAR(50) NOT NULL,
  `recipient_id` VARCHAR(100) NOT NULL,
  `ticket_id` VARCHAR(100),
  `ticket_number` VARCHAR(50),
  `actor_id` VARCHAR(100),
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
  `created_at` TIMESTAMP NULL,
  `read_at` TIMESTAMP NULL,
  KEY `idx_notif_recipient` (`recipient_id`),
  KEY `idx_notif_ticket` (`ticket_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `system_settings` (
  `key` VARCHAR(255) NOT NULL PRIMARY KEY,
  `value` TEXT NULL,
  `description` TEXT NULL,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `policy_travel_rates` (
  `id` VARCHAR(100) PRIMARY KEY,
  `policy_id` VARCHAR(100) NOT NULL,
  `zone_from_id` VARCHAR(255) NOT NULL,
  `zone_to_id` VARCHAR(255) NOT NULL,
  `meal_price` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `meal_overnight_price` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `transport_allowance` DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`policy_id`) REFERENCES `Policies` (`PolicyID`) ON DELETE CASCADE,
  FOREIGN KEY (`zone_from_id`) REFERENCES `TravelZones` (`TravelZoneID`) ON DELETE CASCADE,
  FOREIGN KEY (`zone_to_id`) REFERENCES `TravelZones` (`TravelZoneID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `workflow_simulations` (
  `id` VARCHAR(36) PRIMARY KEY,
  `workflow_id` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `trigger_rules_json` JSON,
  `initial_form_data` JSON,
  `execution_path_json` JSON,
  `created_by` VARCHAR(100) DEFAULT 'System Admin',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`workflow_id`) REFERENCES `Workflows` (`WorkflowID`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `role_permissions` (
  `id` VARCHAR(64) PRIMARY KEY,
  `role_code` VARCHAR(50) NOT NULL,
  `modules_json` JSON,
  `actions_json` JSON,
  `ticket_scope` VARCHAR(20) DEFAULT 'own',
  `date_created` TIMESTAMP NULL,
  `date_updated` TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `business_rules` (
  `id` VARCHAR(64) PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `is_active` TINYINT(1) DEFAULT 1,
  `execution_order` INT DEFAULT 0,
  `match_type` VARCHAR(10) DEFAULT 'AND',
  `stop_on_match` TINYINT(1) DEFAULT 0,
  `date_created` TIMESTAMP NULL,
  `date_updated` TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `rule_criteria` (
  `id` VARCHAR(64) PRIMARY KEY,
  `rule_id` VARCHAR(64) NOT NULL,
  `field` VARCHAR(100),
  `operator` VARCHAR(30),
  `value` TEXT,
  FOREIGN KEY (`rule_id`) REFERENCES `business_rules` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `rule_actions` (
  `id` VARCHAR(64) PRIMARY KEY,
  `rule_id` VARCHAR(64) NOT NULL,
  `action_type` VARCHAR(50),
  `target_value` TEXT,
  `execution_order` INT DEFAULT 0,
  FOREIGN KEY (`rule_id`) REFERENCES `business_rules` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
