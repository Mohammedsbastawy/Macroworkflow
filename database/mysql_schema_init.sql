DROP DATABASE IF EXISTS emacro_dashboard;
CREATE DATABASE emacro_dashboard CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE emacro_dashboard;

DROP TABLE IF EXISTS `Departments`;
CREATE TABLE `Departments` (
  `DepartmentID` VARCHAR(255) PRIMARY KEY,
  `DepartmentName` VARCHAR(255) NOT NULL,
  `DepartmentCode` VARCHAR(50),
  `ParentDepartmentID` VARCHAR(255),
  `ManagerUserID` VARCHAR(255),
  `CreatedAt` TIMESTAMP NULL,
  `UpdatedAt` TIMESTAMP NULL,
  `HeadUserID` VARCHAR(255),
  `DeletedAt` TIMESTAMP NULL,
  FOREIGN KEY (`ParentDepartmentID`) REFERENCES `Departments` (`DepartmentID`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `Users`;
CREATE TABLE `Users` (
  `UserID` VARCHAR(255) PRIMARY KEY,
  `UserName` VARCHAR(255),
  `UserEmail` VARCHAR(255),
  `DepartmentID` VARCHAR(255),
  `GroupIDsJson` JSON,
  `Role` VARCHAR(255),
  `RolesJson` JSON,
  `AvatarInitials` VARCHAR(255),
  `JobTitle` VARCHAR(255),
  `DirectManagerUserID` VARCHAR(255),
  `Unit` VARCHAR(255),
  `IsActive` TINYINT(1),
  `LoginName` VARCHAR(100),
  `Phone` VARCHAR(50),
  `PasswordHash` VARCHAR(255),
  `AuthType` VARCHAR(20),
  `AzureAdId` VARCHAR(255),
  `M365TokenJson` JSON,
  `M365MailEnabled` TINYINT(1),
  `DelegatedUserId` VARCHAR(255),
  `DelegationEnabled` TINYINT(1),
  `DelegationStartDate` TIMESTAMP NULL,
  `DelegationEndDate` TIMESTAMP NULL,
  `DelegationNotes` TEXT,
  `CanAssignGroupTickets` TINYINT(1),
  `DeletedAt` TIMESTAMP NULL,
  FOREIGN KEY (`DepartmentID`) REFERENCES `Departments` (`DepartmentID`) ON DELETE SET NULL,
  FOREIGN KEY (`DirectManagerUserID`) REFERENCES `Users` (`UserID`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS `BusinessGroups`;
CREATE TABLE `BusinessGroups` (
  `BusinessGroupID` VARCHAR(255) PRIMARY KEY,
  `BusinessGroupName` VARCHAR(255),
  `BusinessGroupCode` VARCHAR(255),
  `MemberUserIDsJson` JSON,
  `IsActive` TINYINT(1),
  `DeletedAt` TIMESTAMP NULL
);

DROP TABLE IF EXISTS `SystemUserGroups`;
CREATE TABLE `SystemUserGroups` (
  `SystemUserGroupID` VARCHAR(36) PRIMARY KEY,
  `UserID` VARCHAR(100) NOT NULL,
  `BusinessGroupID` VARCHAR(100) NOT NULL,
  `JoinedAt` TIMESTAMP NULL
);

DROP TABLE IF EXISTS `Workflows`;
CREATE TABLE `Workflows` (
  `WorkflowID` VARCHAR(255) PRIMARY KEY,
  `WorkflowName` VARCHAR(255) NOT NULL,
  `WorkflowSlug` VARCHAR(100) NOT NULL,
  `Category` VARCHAR(100),
  `Description` TEXT,
  `Icon` VARCHAR(100),
  `Color` VARCHAR(50),
  `Version` INT,
  `PublishedVersion` INT,
  `SlaTotalHours` INT,
  `SlaBreachAction` VARCHAR(50),
  `ReactFlowGraphJson` JSON,
  `DateCreated` TIMESTAMP NULL,
  `DateUpdated` TIMESTAMP NULL,
  `FieldsJson` JSON,
  `StepsJson` JSON,
  `Status` VARCHAR(50),
  `IsArchived` TINYINT(1)
);

DROP TABLE IF EXISTS `Tickets`;
CREATE TABLE `Tickets` (
  `TicketID` VARCHAR(36) PRIMARY KEY,
  `TicketNumber` VARCHAR(100) NOT NULL,
  `WorkflowID` VARCHAR(255) NOT NULL,
  `WorkflowVersion` INT NOT NULL,
  `WorkflowSnapshotJson` JSON NOT NULL,
  `RequesterUserID` VARCHAR(100) NOT NULL,
  `RequesterName` VARCHAR(255) NOT NULL,
  `RequesterDepartmentID` VARCHAR(100),
  `Title` VARCHAR(255) NOT NULL,
  `Priority` VARCHAR(20),
  `Status` VARCHAR(40),
  `CurrentStepNodeID` VARCHAR(100),
  `CurrentStepOrder` INT,
  `CurrentAssigneesJson` JSON,
  `SubmittedAt` TIMESTAMP NULL,
  `SlaDeadline` TIMESTAMP NULL,
  `OlaDeadline` TIMESTAMP NULL,
  `OlaClockPausedAt` TIMESTAMP NULL,
  `OlaAccumulatedPauseMs` BIGINT,
  `SolvedAt` TIMESTAMP NULL,
  `ClosedAt` TIMESTAMP NULL,
  `DateCreated` TIMESTAMP NULL,
  `DateUpdated` TIMESTAMP NULL,
  `Type` VARCHAR(30),
  `Attachments` JSON,
  `SubcategoryID` VARCHAR(100),
  `Impact` VARCHAR(20),
  `Urgency` VARCHAR(20),
  `LocationID` VARCHAR(100),
  `RequesterDepartment` VARCHAR(100),
  `ObserverUserID` VARCHAR(100),
  `PendingReason` VARCHAR(100),
  `SlaTtoDeadline` TIMESTAMP NULL,
  `SlaTtrDeadline` TIMESTAMP NULL,
  `TimeSpent` INT,
  `ApprovalStatus` VARCHAR(30),
  `CurrentApprover` VARCHAR(100),
  `SolutionType` VARCHAR(100),
  `SolutionDescription` TEXT,
  `SolvedDate` TIMESTAMP NULL,
  `DirectManagerUserID` VARCHAR(255),
  `BudgetChecked` TINYINT(1),
  `PolicyChecked` TINYINT(1),
  `Unit` VARCHAR(255),
  `TargetGroupIDsJson` JSON,
  `AssignedGroup` VARCHAR(255) NULL,
  `AssignedUser` VARCHAR(255) NULL,
  `TargetDepartmentIDsJson` JSON,
  FOREIGN KEY (`WorkflowID`) REFERENCES `Workflows` (`WorkflowID`) ON DELETE CASCADE,
  FOREIGN KEY (`RequesterUserID`) REFERENCES `Users` (`UserID`) ON DELETE CASCADE,
  FOREIGN KEY (`RequesterDepartmentID`) REFERENCES `Departments` (`DepartmentID`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
=======
  AssignedGroup VARCHAR(255) NULL,
  AssignedUser VARCHAR(255) NULL,
  `TargetDepartmentIDsJson` JSON
);

DROP TABLE IF EXISTS `TicketValues`;
CREATE TABLE `TicketValues` (
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

DROP TABLE IF EXISTS `TicketObservers`;
CREATE TABLE `TicketObservers` (
  `TicketObserverID` VARCHAR(36) PRIMARY KEY,
  `TicketID` VARCHAR(100) NOT NULL,
  `UserID` VARCHAR(100) NOT NULL,
  `AddedAt` TIMESTAMP NULL
);

DROP TABLE IF EXISTS `TicketAssignees`;
CREATE TABLE `TicketAssignees` (
  `TicketAssigneeID` VARCHAR(36) PRIMARY KEY,
  `TicketID` VARCHAR(100) NOT NULL,
  `UserID` VARCHAR(100),
  `BusinessGroupID` VARCHAR(100),
  `RoleCode` VARCHAR(100),
  `StepNodeID` VARCHAR(255),
  `AssignedAt` TIMESTAMP NULL
);

DROP TABLE IF EXISTS `TicketComments`;
CREATE TABLE `TicketComments` (
  `TicketCommentID` VARCHAR(36) PRIMARY KEY,
  `TicketID` VARCHAR(100) NOT NULL,
  `AuthorUserID` VARCHAR(100) NOT NULL,
  `AuthorUserName` VARCHAR(255),
  `Type` VARCHAR(20),
  `Content` TEXT NOT NULL,
  `DateCreated` TIMESTAMP NULL,
  `UpdatedAt` TIMESTAMP NULL
);

DROP TABLE IF EXISTS `ApprovalLog`;
CREATE TABLE `ApprovalLog` (
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

DROP TABLE IF EXISTS `ExternalApiEndpoints`;
CREATE TABLE `ExternalApiEndpoints` (
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

DROP TABLE IF EXISTS `Policies`;
CREATE TABLE `Policies` (
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

DROP TABLE IF EXISTS `Budgets`;
CREATE TABLE `Budgets` (
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

DROP TABLE IF EXISTS `TravelZones`;
CREATE TABLE `TravelZones` (
  `TravelZoneID` VARCHAR(255) PRIMARY KEY,
  `TravelZoneName` VARCHAR(255),
  `TravelZoneCode` VARCHAR(255),
  `IsActive` TINYINT(1)
);

DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
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
  FOREIGN KEY (`policy_id`) REFERENCES `Policies` (`PolicyID`) ON DELETE CASCADE,
  FOREIGN KEY (`zone_from_id`) REFERENCES `TravelZones` (`TravelZoneID`) ON DELETE CASCADE,
  FOREIGN KEY (`zone_to_id`) REFERENCES `TravelZones` (`TravelZoneID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
  FOREIGN KEY (`workflow_id`) REFERENCES `Workflows` (`WorkflowID`) ON DELETE CASCADE
);

DROP TABLE IF EXISTS `role_permissions`;
CREATE TABLE `role_permissions` (
  `id` VARCHAR(64) PRIMARY KEY,
  `role_code` VARCHAR(50) NOT NULL,
  `modules_json` JSON,
  `actions_json` JSON,
  `ticket_scope` VARCHAR(20) DEFAULT 'own',
  `date_created` TIMESTAMP NULL,
  `date_updated` TIMESTAMP NULL
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
  `date_created` TIMESTAMP NULL,
  `date_updated` TIMESTAMP NULL
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
