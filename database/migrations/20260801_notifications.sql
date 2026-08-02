-- ============================================================
-- Notification System — 2026-08-01
-- One row = one (recipient, event) delivery.
-- Fan-out is done by inserting one row per resolved recipient_id.
-- metadata_json is in mysqlClient JSON_KEYS (auto parse/serialize).
-- ============================================================
CREATE TABLE IF NOT EXISTS `notifications` (
  `id`           VARCHAR(64)   PRIMARY KEY,
  `event_type`   VARCHAR(50)   NOT NULL,
  `recipient_id` VARCHAR(100)  NOT NULL,
  `ticket_id`    VARCHAR(100),
  `ticket_number` VARCHAR(50),
  `actor_id`     VARCHAR(100),
  `actor_name`   VARCHAR(255),
  `title_ar`     VARCHAR(255),
  `title_en`     VARCHAR(255),
  `body_ar`      TEXT,
  `body_en`      TEXT,
  `priority`     VARCHAR(10)   DEFAULT 'normal',
  `channel`      VARCHAR(20)   DEFAULT 'in_app',
  `is_read`      TINYINT(1)    DEFAULT 0,
  `is_archived`  TINYINT(1)    DEFAULT 0,
  `metadata_json` JSON,
  `created_at`   TIMESTAMP     NULL,
  `read_at`      TIMESTAMP     NULL,
  KEY `idx_notif_recipient` (`recipient_id`),
  KEY `idx_notif_ticket`    (`ticket_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
