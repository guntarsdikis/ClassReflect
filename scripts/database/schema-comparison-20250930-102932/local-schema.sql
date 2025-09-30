  1 AS `applied_by_first_name`,
  1 AS `applied_by_last_name`,
  1 AS `class_name`,
  1 AS `completed_at`,
  1 AS `error_message`,
  1 AS `grade` ;
  1 AS `overall_score`,
  1 AS `progress_percent`,
  1 AS `queued_at`,
  1 AS `started_at`,
  1 AS `status`,
  1 AS `subject`,
  1 AS `teacher_first_name`,
  1 AS `teacher_last_name`,
  1 AS `template_category`,
  1 AS `template_name`,
  1 AS `word_count`,
  CONSTRAINT `analysis_jobs_ibfk_1` FOREIGN KEY (`transcript_id`) REFERENCES `transcripts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `analysis_jobs_ibfk_2` FOREIGN KEY (`template_id`) REFERENCES `templates` (`id`) ON DELETE CASCADE,
  CONSTRAINT `analysis_jobs_ibfk_3` FOREIGN KEY (`teacher_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `analysis_jobs_ibfk_4` FOREIGN KEY (`job_id`) REFERENCES `audio_jobs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `analysis_jobs_ibfk_5` FOREIGN KEY (`applied_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
  CONSTRAINT `analysis_results_ibfk_1` FOREIGN KEY (`transcript_id`) REFERENCES `transcripts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `analysis_results_ibfk_2` FOREIGN KEY (`job_id`) REFERENCES `audio_jobs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `analysis_results_ibfk_4` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE,
  CONSTRAINT `api_keys_ibfk_1` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE
  CONSTRAINT `audio_jobs_ibfk_2` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_analysis_results_teacher_id` FOREIGN KEY (`teacher_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
  CONSTRAINT `fk_audio_jobs_school_id` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_audio_jobs_teacher_id` FOREIGN KEY (`teacher_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
  CONSTRAINT `fk_templates_openrouter_prompt` FOREIGN KEY (`openrouter_prompt_id`) REFERENCES `prompts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_templates_vertex_prompt` FOREIGN KEY (`vertex_prompt_id`) REFERENCES `prompts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_transcripts_job_id` FOREIGN KEY (`job_id`) REFERENCES `audio_jobs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_transcripts_school_id` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_transcripts_teacher_id` FOREIGN KEY (`teacher_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_users_school_id` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE
  CONSTRAINT `password_reset_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
  CONSTRAINT `prompt_history_ibfk_1` FOREIGN KEY (`prompt_id`) REFERENCES `prompts` (`id`) ON DELETE CASCADE
  CONSTRAINT `prompt_test_results_ibfk_1` FOREIGN KEY (`prompt_id`) REFERENCES `prompts` (`id`) ON DELETE CASCADE
  CONSTRAINT `school_subjects_ibfk_1` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE,
  CONSTRAINT `school_subjects_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
  CONSTRAINT `system_subjects_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
  CONSTRAINT `template_categories_ibfk_1` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`),
  CONSTRAINT `template_categories_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
  CONSTRAINT `template_criteria_ibfk_1` FOREIGN KEY (`template_id`) REFERENCES `templates` (`id`) ON DELETE CASCADE,
  CONSTRAINT `template_criteria_ibfk_2` FOREIGN KEY (`criteria_id`) REFERENCES `analysis_criteria` (`id`) ON DELETE SET NULL
  CONSTRAINT `template_usage_ibfk_1` FOREIGN KEY (`template_id`) REFERENCES `templates` (`id`) ON DELETE CASCADE,
  CONSTRAINT `template_usage_ibfk_2` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE,
  CONSTRAINT `template_usage_ibfk_3` FOREIGN KEY (`applied_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
  CONSTRAINT `templates_ibfk_1` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE,
  CONSTRAINT `templates_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `templates_ibfk_3` FOREIGN KEY (`category_id`) REFERENCES `template_categories` (`id`),
  CONSTRAINT `templates_ibfk_4` FOREIGN KEY (`category_id`) REFERENCES `template_categories` (`id`)
  CONSTRAINT `transcripts_ibfk_1` FOREIGN KEY (`job_id`) REFERENCES `audio_jobs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `transcripts_ibfk_3` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE
  CONSTRAINT `word_timestamps_ibfk_1` FOREIGN KEY (`job_id`) REFERENCES `audio_jobs` (`id`)
  KEY `applied_by` (`applied_by`),
  KEY `created_by` (`created_by`),
  KEY `created_by` (`created_by`),
  KEY `created_by` (`created_by`),
  KEY `created_by` (`created_by`),
  KEY `criteria_id` (`criteria_id`),
  KEY `fk_template_category` (`category_id`),
  KEY `fk_templates_openrouter_prompt` (`openrouter_prompt_id`),
  KEY `fk_templates_vertex_prompt` (`vertex_prompt_id`),
  KEY `idx_active` (`is_active`),
  KEY `idx_active` (`is_active`),
  KEY `idx_analysis_jobs_progress` (`status`,`progress_percent`,`updated_at`),
  KEY `idx_analysis_jobs_queue` (`status`,`queued_at`),
  KEY `idx_analysis_status` (`analysis_status`),
  KEY `idx_applied_by` (`applied_by`),
  KEY `idx_applied_by` (`applied_by`),
  KEY `idx_category` (`category`),
  KEY `idx_category` (`category`),
  KEY `idx_changed_at` (`changed_at`),
  KEY `idx_cognito_username` (`cognito_username`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_domain` (`domain`)
  KEY `idx_email` (`email`),
  KEY `idx_expires` (`expires_at`),
  KEY `idx_external_id` (`external_id`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_is_global` (`is_global`),
  KEY `idx_job_id` (`job_id`),
  KEY `idx_job_id` (`job_id`),
  KEY `idx_key_prefix` (`key_prefix`),
  KEY `idx_order` (`order_index`),
  KEY `idx_overall_score` (`overall_score`),
  KEY `idx_prompt_id` (`prompt_id`),
  KEY `idx_provider_active` (`provider`,`is_active`),
  KEY `idx_provider_name_version` (`provider`,`name`,`version`)
  KEY `idx_role` (`role`),
  KEY `idx_school_id` (`school_id`),
  KEY `idx_school_id` (`school_id`),
  KEY `idx_school_id` (`school_id`),
  KEY `idx_school_id` (`school_id`),
  KEY `idx_school_id` (`school_id`),
  KEY `idx_school_id` (`school_id`),
  KEY `idx_school_subjects_category` (`category`),
  KEY `idx_school_template_active` (`school_id`,`is_active`),
  KEY `idx_status_created` (`status`,`created_at`),
  KEY `idx_status` (`status`),
  KEY `idx_status` (`status`),
  KEY `idx_subscription_status` (`subscription_status`),
  KEY `idx_teacher_id` (`teacher_id`),
  KEY `idx_teacher_id` (`teacher_id`),
  KEY `idx_teacher_id` (`teacher_id`),
  KEY `idx_teacher_id` (`teacher_id`),
  KEY `idx_template_category_name` (`category_name`),
  KEY `idx_template_id` (`template_id`),
  KEY `idx_template_id` (`template_id`),
  KEY `idx_template_id` (`template_id`),
  KEY `idx_template_id` (`template_id`),
  KEY `idx_template_id` (`template_id`),
  KEY `idx_timestamps` (`start_time`,`end_time`),
  KEY `idx_token` (`token`),
  KEY `idx_transcript_id` (`transcript_id`),
  KEY `idx_transcript_id` (`transcript_id`),
  KEY `job_id` (`job_id`),
  KEY `job_id` (`job_id`),
  KEY `prompt_id` (`prompt_id`),
  KEY `school_id` (`school_id`),
  KEY `school_id` (`school_id`),
  KEY `school_id` (`school_id`),
  KEY `user_id` (`user_id`),
  PRIMARY KEY (`id`),
  PRIMARY KEY (`id`),
  PRIMARY KEY (`id`),
  PRIMARY KEY (`id`),
  PRIMARY KEY (`id`),
  PRIMARY KEY (`id`),
  PRIMARY KEY (`id`),
  PRIMARY KEY (`id`),
  PRIMARY KEY (`id`),
  PRIMARY KEY (`id`),
  PRIMARY KEY (`id`),
  PRIMARY KEY (`id`),
  PRIMARY KEY (`id`),
  PRIMARY KEY (`id`),
  PRIMARY KEY (`id`),
  PRIMARY KEY (`id`),
  PRIMARY KEY (`id`),
  PRIMARY KEY (`id`),
  PRIMARY KEY (`key`)
  SQL SECURITY DEFINER
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `key_hash` (`key_hash`),
  UNIQUE KEY `subject_name` (`subject_name`),
  UNIQUE KEY `token` (`token`),
  UNIQUE KEY `unique_provider_name_version` (`provider`,`name`,`version`),
  UNIQUE KEY `unique_school_subject` (`school_id`,`subject_name`),
  UNIQUE KEY `unique_template_category_per_school` (`school_id`,`category_name`),
  `ai_model` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'gpt-4',
  `ai_model` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'anthropic/claude-sonnet-4-20250514',
  `analysis_completed_at` timestamp NULL DEFAULT NULL,
  `analysis_started_at` timestamp NULL DEFAULT NULL,
  `analysis_status` enum('pending','queued','processing','completed','failed','skipped') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `applied_by` int DEFAULT NULL,
  `applied_by` int DEFAULT NULL,
  `applied_by` int NOT NULL,
  `assemblyai_transcript_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `assemblyai_upload_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  `category_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Custom',
  `category` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'General',
  `change_description` text COLLATE utf8mb4_unicode_ci,
  `changed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `changed_by` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `class_duration_minutes` int DEFAULT NULL,
  `class_name` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cognito_username` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `color` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `confidence_score` decimal(3,2) DEFAULT NULL,
  `confidence` decimal(5,4) NOT NULL,
  `contact_email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_by` int DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_by` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `criteria_added` int DEFAULT '0',
  `criteria_description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `criteria_id` int DEFAULT NULL,
  `criteria_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `description` text COLLATE utf8mb4_unicode_ci,
  `description` text COLLATE utf8mb4_unicode_ci,
  `description` text COLLATE utf8mb4_unicode_ci,
  `description` text COLLATE utf8mb4_unicode_ci,
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `detailed_feedback` json DEFAULT NULL,
  `detailed_feedback` json DEFAULT NULL,
  `domain` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `duration_seconds` int DEFAULT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `end_time` decimal(10,3) NOT NULL,
  `error_message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `error_message` text COLLATE utf8mb4_unicode_ci,
  `expires_at` timestamp NOT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `external_id` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `feedback` text COLLATE utf8mb4_unicode_ci,
  `file_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` bigint DEFAULT NULL,
  `first_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `gemini_prompt_id` int DEFAULT NULL,
  `grade_levels` json DEFAULT NULL,
  `grade` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `grades` json DEFAULT NULL,
  `id` int NOT NULL AUTO_INCREMENT,
  `id` int NOT NULL AUTO_INCREMENT,
  `id` int NOT NULL AUTO_INCREMENT,
  `id` int NOT NULL AUTO_INCREMENT,
  `id` int NOT NULL AUTO_INCREMENT,
  `id` int NOT NULL AUTO_INCREMENT,
  `id` int NOT NULL AUTO_INCREMENT,
  `id` int NOT NULL AUTO_INCREMENT,
  `id` int NOT NULL AUTO_INCREMENT,
  `id` int NOT NULL AUTO_INCREMENT,
  `id` int NOT NULL AUTO_INCREMENT,
  `id` int NOT NULL AUTO_INCREMENT,
  `id` int NOT NULL AUTO_INCREMENT,
  `id` int NOT NULL AUTO_INCREMENT,
  `id` int NOT NULL AUTO_INCREMENT,
  `id` int NOT NULL AUTO_INCREMENT,
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT (uuid()),
  `improvements` json DEFAULT NULL,
  `improvements` json DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '0',
  `is_active` tinyint(1) DEFAULT '1',
  `is_active` tinyint(1) DEFAULT '1',
  `is_active` tinyint(1) DEFAULT '1',
  `is_active` tinyint(1) DEFAULT '1',
  `is_active` tinyint(1) DEFAULT '1',
  `is_active` tinyint(1) DEFAULT '1',
  `is_active` tinyint(1) DEFAULT '1',
  `is_active` tinyint(1) DEFAULT '1',
  `is_global` tinyint(1) DEFAULT '0',
  `job_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `job_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `job_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `job_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `key_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `key_prefix` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `language` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'en',
  `last_login` timestamp NULL DEFAULT NULL,
  `last_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `lemur_prompt_id` int DEFAULT NULL,
  `max_monthly_uploads` int DEFAULT '100',
  `max_teachers` int DEFAULT '10',
  `metadata` json DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `openai_prompt_id` int DEFAULT NULL,
  `openrouter_prompt_id` int DEFAULT NULL,
  `order_index` int DEFAULT '0',
  `overall_score` decimal(5,2) DEFAULT NULL,
  `overall_score` decimal(5,2) DEFAULT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `permissions` json DEFAULT NULL,
  `processing_completed_at` timestamp NULL DEFAULT NULL,
  `processing_started_at` timestamp NULL DEFAULT NULL,
  `processing_time_seconds` int DEFAULT NULL,
  `progress_percent` int DEFAULT '0',
  `prompt_id` int NOT NULL,
  `prompt_id` int NOT NULL,
  `prompt_template` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `prompt_template` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `provider` enum('lemur','openai','gemini') COLLATE utf8mb4_unicode_ci NOT NULL,
  `provider` enum('lemur','openai','gemini','vertex','openrouter') COLLATE utf8mb4_unicode_ci NOT NULL,
  `queued_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `role` enum('teacher','school_manager','super_admin') COLLATE utf8mb4_unicode_ci NOT NULL,
  `s3_key` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `school_id` int DEFAULT NULL,
  `school_id` int DEFAULT NULL,
  `school_id` int DEFAULT NULL,
  `school_id` int NOT NULL,
  `school_id` int NOT NULL,
  `school_id` int NOT NULL,
  `school_id` int NOT NULL,
  `school_id` int NOT NULL,
  `school_id` int NOT NULL,
  `school_id` int NOT NULL,
  `score` decimal(5,2) DEFAULT NULL,
  `start_time` decimal(10,3) NOT NULL,
  `started_at` timestamp NULL DEFAULT NULL,
  `status` enum('pending','uploading','queued','processing','completed','failed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `status` enum('queued','processing','completed','failed') COLLATE utf8mb4_unicode_ci DEFAULT 'queued',
  `strengths` json DEFAULT NULL,
  `strengths` json DEFAULT NULL,
  `subject_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `subject_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `subject` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subjects` json DEFAULT NULL,
  `subjects` json DEFAULT NULL,
  `subscription_expires` date DEFAULT NULL,
  `subscription_status` enum('trial','active','suspended','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'trial',
  `teacher_id` int NOT NULL,
  `teacher_id` int NOT NULL,
  `teacher_id` int NOT NULL,
  `teacher_id` int NOT NULL,
  `template_id` int DEFAULT NULL,
  `template_id` int DEFAULT NULL,
  `template_id` int NOT NULL,
  `template_id` int NOT NULL,
  `template_id` int NOT NULL,
  `template_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `test_input` text COLLATE utf8mb4_unicode_ci,
  `test_output` text COLLATE utf8mb4_unicode_ci,
  `tested_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `tested_by` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(255) NOT NULL,
  `transcript_id` int NOT NULL,
  `transcript_id` int NOT NULL,
  `transcript_text` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `usage_count` int DEFAULT '0',
  `used` tinyint(1) DEFAULT '0',
  `user_id` int NOT NULL,
  `value` json NOT NULL,
  `version` int NOT NULL DEFAULT '1',
  `version` int NOT NULL,
  `vertex_prompt_id` int DEFAULT NULL,
  `weight` decimal(5,2) DEFAULT '1.00' COMMENT 'Weight as percentage (0.00-100.00), template total should equal 100.00',
  `word_count` int DEFAULT NULL,
  `word_index` int NOT NULL,
  `word_text` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
 1 AS `id`,
 CREATE ALGORITHM=UNDEFINED
 CREATE VIEW `analysis_job_status` AS SELECT
 DROP VIEW IF EXISTS `analysis_job_status`;
 SET @saved_col_connection     = @@collation_connection ;
 SET @saved_cs_client          = @@character_set_client ;
 SET @saved_cs_client     = @@character_set_client ;
 SET @saved_cs_client     = @@character_set_client ;
 SET @saved_cs_client     = @@character_set_client ;
 SET @saved_cs_client     = @@character_set_client ;
 SET @saved_cs_client     = @@character_set_client ;
 SET @saved_cs_client     = @@character_set_client ;
 SET @saved_cs_client     = @@character_set_client ;
 SET @saved_cs_client     = @@character_set_client ;
 SET @saved_cs_client     = @@character_set_client ;
 SET @saved_cs_client     = @@character_set_client ;
 SET @saved_cs_client     = @@character_set_client ;
 SET @saved_cs_client     = @@character_set_client ;
 SET @saved_cs_client     = @@character_set_client ;
 SET @saved_cs_client     = @@character_set_client ;
 SET @saved_cs_client     = @@character_set_client ;
 SET @saved_cs_client     = @@character_set_client ;
 SET @saved_cs_client     = @@character_set_client ;
 SET @saved_cs_client     = @@character_set_client ;
 SET @saved_cs_client     = @@character_set_client ;
 SET @saved_cs_results         = @@character_set_results ;
 SET character_set_client      = @saved_cs_client ;
 SET character_set_client      = utf8mb4 ;
 SET character_set_client = @saved_cs_client ;
 SET character_set_client = @saved_cs_client ;
 SET character_set_client = @saved_cs_client ;
 SET character_set_client = @saved_cs_client ;
 SET character_set_client = @saved_cs_client ;
 SET character_set_client = @saved_cs_client ;
 SET character_set_client = @saved_cs_client ;
 SET character_set_client = @saved_cs_client ;
 SET character_set_client = @saved_cs_client ;
 SET character_set_client = @saved_cs_client ;
 SET character_set_client = @saved_cs_client ;
 SET character_set_client = @saved_cs_client ;
 SET character_set_client = @saved_cs_client ;
 SET character_set_client = @saved_cs_client ;
 SET character_set_client = @saved_cs_client ;
 SET character_set_client = @saved_cs_client ;
 SET character_set_client = @saved_cs_client ;
 SET character_set_client = @saved_cs_client ;
 SET character_set_client = @saved_cs_client ;
 SET character_set_client = utf8mb4 ;
 SET character_set_client = utf8mb4 ;
 SET character_set_client = utf8mb4 ;
 SET character_set_client = utf8mb4 ;
 SET character_set_client = utf8mb4 ;
 SET character_set_client = utf8mb4 ;
 SET character_set_client = utf8mb4 ;
 SET character_set_client = utf8mb4 ;
 SET character_set_client = utf8mb4 ;
 SET character_set_client = utf8mb4 ;
 SET character_set_client = utf8mb4 ;
 SET character_set_client = utf8mb4 ;
 SET character_set_client = utf8mb4 ;
 SET character_set_client = utf8mb4 ;
 SET character_set_client = utf8mb4 ;
 SET character_set_client = utf8mb4 ;
 SET character_set_client = utf8mb4 ;
 SET character_set_client = utf8mb4 ;
 SET character_set_client = utf8mb4 ;
 SET character_set_results     = @saved_cs_results ;
 SET character_set_results     = utf8mb4 ;
 SET collation_connection      = @saved_col_connection ;
 SET collation_connection      = utf8mb4_0900_ai_ci ;
 VIEW `analysis_job_status` AS select `aj`.`id` AS `id`,`aj`.`status` AS `status`,`aj`.`progress_percent` AS `progress_percent`,`aj`.`queued_at` AS `queued_at`,`aj`.`started_at` AS `started_at`,`aj`.`completed_at` AS `completed_at`,`aj`.`error_message` AS `error_message`,`aj`.`overall_score` AS `overall_score`,`t`.`template_name` AS `template_name`,`t`.`category` AS `template_category`,`u1`.`first_name` AS `teacher_first_name`,`u1`.`last_name` AS `teacher_last_name`,`u2`.`first_name` AS `applied_by_first_name`,`u2`.`last_name` AS `applied_by_last_name`,`tr`.`word_count` AS `word_count`,`auj`.`class_name` AS `class_name`,`auj`.`subject` AS `subject`,`auj`.`grade` AS `grade` from (((((`analysis_jobs` `aj` left join `templates` `t` on((`aj`.`template_id` = `t`.`id`))) left join `users` `u1` on((`aj`.`teacher_id` = `u1`.`id`))) left join `users` `u2` on((`aj`.`applied_by` = `u2`.`id`))) left join `transcripts` `tr` on((`aj`.`transcript_id` = `tr`.`id`))) left join `audio_jobs` `auj` on((`aj`.`job_id` = `auj`.`id`))) ;
) ENGINE=InnoDB AUTO_INCREMENT=XXX DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
) ENGINE=InnoDB AUTO_INCREMENT=XXX DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
) ENGINE=InnoDB AUTO_INCREMENT=XXX DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
) ENGINE=InnoDB AUTO_INCREMENT=XXX DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
) ENGINE=InnoDB AUTO_INCREMENT=XXX DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
) ENGINE=InnoDB AUTO_INCREMENT=XXX DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
) ENGINE=InnoDB AUTO_INCREMENT=XXX DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
) ENGINE=InnoDB AUTO_INCREMENT=XXX DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
) ENGINE=InnoDB AUTO_INCREMENT=XXX DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
) ENGINE=InnoDB AUTO_INCREMENT=XXX DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
) ENGINE=InnoDB AUTO_INCREMENT=XXX DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
) ENGINE=InnoDB AUTO_INCREMENT=XXX DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*M!999999\- enable the sandbox mode
CREATE TABLE `analysis_jobs` (
CREATE TABLE `analysis_results` (
CREATE TABLE `api_keys` (
CREATE TABLE `audio_jobs` (
CREATE TABLE `password_reset_tokens` (
CREATE TABLE `prompt_history` (
CREATE TABLE `prompt_test_results` (
CREATE TABLE `prompts` (
CREATE TABLE `school_subjects` (
CREATE TABLE `schools` (
CREATE TABLE `system_settings` (
CREATE TABLE `system_subjects` (
CREATE TABLE `template_categories` (
CREATE TABLE `template_criteria` (
CREATE TABLE `template_usage` (
CREATE TABLE `templates` (
CREATE TABLE `transcripts` (
CREATE TABLE `users` (
CREATE TABLE `word_timestamps` (
SET @saved_cs_client     = @@character_set_client;
SET character_set_client = @saved_cs_client;
SET character_set_client = utf8mb4;
