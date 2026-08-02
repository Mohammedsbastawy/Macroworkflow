-- =====================================================================
-- Migration: Microsoft 365 SSO + local username/password login support
-- Date: 2026-08-02
-- Applies to: emacro_dashboard (MySQL 8.0)
-- Run: node scripts/migrate-auth-login.js
-- =====================================================================

-- 1) System settings key/value store (may not exist yet; used for the
--    dynamically-configured Microsoft Entra ID integration credentials)
CREATE TABLE IF NOT EXISTS `system_settings` (
  `key`         VARCHAR(255)   NOT NULL PRIMARY KEY,
  `value`       TEXT           NULL,
  `description` TEXT           NULL,
  `updated_at`  TIMESTAMP      NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2) system_users auth columns (added idempotently by the runner script)
ALTER TABLE `system_users`
  ADD COLUMN `username`          VARCHAR(255)     NULL AFTER `email`,
  ADD COLUMN `password_hash`     VARCHAR(255)     NULL AFTER `username`,
  ADD COLUMN `auth_type`         VARCHAR(20)      NULL DEFAULT 'password' AFTER `password_hash`,
  ADD COLUMN `azure_ad_id`       VARCHAR(255)     NULL AFTER `auth_type`,
  ADD COLUMN `m365_token_json`   JSON             NULL AFTER `azure_ad_id`,
  ADD COLUMN `m365_mail_enabled` TINYINT(1)       NOT NULL DEFAULT 0 AFTER `m365_token_json`;

UPDATE `system_users` SET `auth_type` = 'password' WHERE `auth_type` IS NULL;