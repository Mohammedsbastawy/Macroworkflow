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
  `DeletedAt` TIMESTAMP NULL
);

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
  `DeletedAt` TIMESTAMP NULL
);

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
  `WorkflowID` VARCHAR(36) PRIMARY KEY,
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
  `WorkflowID` VARCHAR(36) NOT NULL,
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
  `Unit` VARCHAR(255)
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
  `FileAttachmentID` VARCHAR(36)
);

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
  `RulesJson` JSON
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
