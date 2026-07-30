USE emacro_dashboard;

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
  CONSTRAINT `fk_policy_travel_rates_policy` FOREIGN KEY (`policy_id`) REFERENCES `policies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_travel_rates_zone_from` FOREIGN KEY (`zone_from_id`) REFERENCES `travel_zones` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_travel_rates_zone_to` FOREIGN KEY (`zone_to_id`) REFERENCES `travel_zones` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
