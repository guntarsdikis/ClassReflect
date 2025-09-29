-- Production Migration Script
-- Applied: 2025-09-29
-- Purpose: Add prompt management tables

-- 1. Create prompts table first (referenced by other tables)
CREATE TABLE IF NOT EXISTS `prompts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `provider` enum('lemur','openai') COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `prompt_template` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `version` int NOT NULL DEFAULT '1',
  `is_active` tinyint(1) DEFAULT '0',
  `created_by` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `metadata` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_provider_name_version` (`provider`,`name`,`version`),
  KEY `idx_provider_active` (`provider`,`is_active`),
  KEY `idx_provider_name_version` (`provider`,`name`,`version`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Create prompt_history table
CREATE TABLE IF NOT EXISTS `prompt_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `prompt_id` int NOT NULL,
  `provider` enum('lemur','openai') COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `prompt_template` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `version` int NOT NULL,
  `change_description` text COLLATE utf8mb4_unicode_ci,
  `changed_by` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `changed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `metadata` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_prompt_id` (`prompt_id`),
  KEY `idx_changed_at` (`changed_at`),
  CONSTRAINT `prompt_history_ibfk_1` FOREIGN KEY (`prompt_id`) REFERENCES `prompts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Create prompt_test_results table
CREATE TABLE IF NOT EXISTS `prompt_test_results` (
  `id` int NOT NULL AUTO_INCREMENT,
  `prompt_id` int NOT NULL,
  `test_input` text COLLATE utf8mb4_unicode_ci,
  `test_output` text COLLATE utf8mb4_unicode_ci,
  `score` decimal(5,2) DEFAULT NULL,
  `feedback` text COLLATE utf8mb4_unicode_ci,
  `tested_by` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tested_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `prompt_id` (`prompt_id`),
  CONSTRAINT `prompt_test_results_ibfk_1` FOREIGN KEY (`prompt_id`) REFERENCES `prompts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Create migration tracking table for future use
CREATE TABLE IF NOT EXISTS `migration_history` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `filename` varchar(255) NOT NULL,
  `applied_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `checksum` varchar(32),
  UNIQUE KEY `unique_migration` (`filename`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Record this migration
INSERT IGNORE INTO `migration_history` (`filename`, `checksum`)
VALUES ('migration-production.sql', MD5(CONCAT('prompts-', NOW())));