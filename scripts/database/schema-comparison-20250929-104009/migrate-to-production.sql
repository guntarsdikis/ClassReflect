-- Migration script to sync production with local
-- Generated: Mon Sep 29 10:40:32 EEST 2025
-- ⚠️  REVIEW CAREFULLY BEFORE APPLYING!

-- ════════════════════════════════════════
-- Tables to CREATE in production
-- ════════════════════════════════════════

-- Creating table: prompt_history
/*M!999999\- enable the sandbox mode */ 
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `prompt_history` (
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
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

-- Creating table: prompt_test_results
/*M!999999\- enable the sandbox mode */ 
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `prompt_test_results` (
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
/*!40101 SET character_set_client = @saved_cs_client */;

-- Creating table: prompts
/*M!999999\- enable the sandbox mode */ 
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `prompts` (
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
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

