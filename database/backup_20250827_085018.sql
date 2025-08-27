-- MySQL dump 10.13  Distrib 8.0.40, for macos12.7 (arm64)
--
-- Host: localhost    Database: classreflect
-- ------------------------------------------------------
-- Server version	8.0.43

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `analysis_criteria`
--

DROP TABLE IF EXISTS `analysis_criteria`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `analysis_criteria` (
  `id` int NOT NULL AUTO_INCREMENT,
  `school_id` int NOT NULL,
  `criteria_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `criteria_description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `weight` decimal(3,2) DEFAULT '1.00',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_school_id` (`school_id`),
  KEY `idx_is_active` (`is_active`),
  CONSTRAINT `analysis_criteria_ibfk_1` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `analysis_criteria`
--

LOCK TABLES `analysis_criteria` WRITE;
/*!40000 ALTER TABLE `analysis_criteria` DISABLE KEYS */;
INSERT INTO `analysis_criteria` VALUES (1,1,'Student Engagement','Measures how well the teacher engages students',1.50,1,'2025-08-17 18:28:09','2025-08-17 18:28:09'),(2,1,'Clear Instructions','Evaluates clarity of instructions and explanations',1.20,1,'2025-08-17 18:28:09','2025-08-17 18:28:09'),(3,1,'Question Techniques','Assesses questioning strategies and wait time',1.30,1,'2025-08-17 18:28:09','2025-08-17 18:28:09'),(4,1,'Classroom Management','Reviews classroom control and time management',1.00,1,'2025-08-17 18:28:09','2025-08-17 18:28:09'),(5,1,'Inclusive Teaching','Checks for inclusive practices and differentiation',1.10,1,'2025-08-17 18:28:09','2025-08-17 18:28:09');
/*!40000 ALTER TABLE `analysis_criteria` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `analysis_results`
--

DROP TABLE IF EXISTS `analysis_results`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `analysis_results` (
  `id` int NOT NULL AUTO_INCREMENT,
  `transcript_id` int NOT NULL,
  `job_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `teacher_id` int NOT NULL,
  `school_id` int NOT NULL,
  `overall_score` decimal(5,2) DEFAULT NULL,
  `strengths` json DEFAULT NULL,
  `improvements` json DEFAULT NULL,
  `detailed_feedback` json DEFAULT NULL,
  `ai_model` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'gpt-4',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `job_id` (`job_id`),
  KEY `school_id` (`school_id`),
  KEY `idx_transcript_id` (`transcript_id`),
  KEY `idx_teacher_id` (`teacher_id`),
  KEY `idx_overall_score` (`overall_score`),
  CONSTRAINT `analysis_results_ibfk_1` FOREIGN KEY (`transcript_id`) REFERENCES `transcripts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `analysis_results_ibfk_2` FOREIGN KEY (`job_id`) REFERENCES `audio_jobs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `analysis_results_ibfk_3` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `analysis_results_ibfk_4` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `analysis_results`
--

LOCK TABLES `analysis_results` WRITE;
/*!40000 ALTER TABLE `analysis_results` DISABLE KEYS */;
/*!40000 ALTER TABLE `analysis_results` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `api_keys`
--

DROP TABLE IF EXISTS `api_keys`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `api_keys` (
  `id` int NOT NULL AUTO_INCREMENT,
  `school_id` int DEFAULT NULL,
  `key_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `key_prefix` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `permissions` json DEFAULT NULL,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `key_hash` (`key_hash`),
  KEY `school_id` (`school_id`),
  KEY `idx_key_prefix` (`key_prefix`),
  KEY `idx_is_active` (`is_active`),
  CONSTRAINT `api_keys_ibfk_1` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `api_keys`
--

LOCK TABLES `api_keys` WRITE;
/*!40000 ALTER TABLE `api_keys` DISABLE KEYS */;
/*!40000 ALTER TABLE `api_keys` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audio_jobs`
--

DROP TABLE IF EXISTS `audio_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audio_jobs` (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `teacher_id` int NOT NULL,
  `school_id` int NOT NULL,
  `file_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` bigint DEFAULT NULL,
  `file_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `s3_key` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `duration_seconds` int DEFAULT NULL,
  `status` enum('pending','uploading','queued','processing','completed','failed') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `error_message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `sqs_message_id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `processing_started_at` timestamp NULL DEFAULT NULL,
  `processing_completed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_teacher_id` (`teacher_id`),
  KEY `idx_school_id` (`school_id`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `audio_jobs_ibfk_1` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `audio_jobs_ibfk_2` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audio_jobs`
--

LOCK TABLES `audio_jobs` WRITE;
/*!40000 ALTER TABLE `audio_jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `audio_jobs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `schools`
--

DROP TABLE IF EXISTS `schools`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `schools` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `domain` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subscription_status` enum('trial','active','suspended','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'trial',
  `subscription_expires` date DEFAULT NULL,
  `max_teachers` int DEFAULT '10',
  `max_monthly_uploads` int DEFAULT '100',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_subscription_status` (`subscription_status`),
  KEY `idx_domain` (`domain`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `schools`
--

LOCK TABLES `schools` WRITE;
/*!40000 ALTER TABLE `schools` DISABLE KEYS */;
INSERT INTO `schools` VALUES (1,'Demo Elementary School','demo.classreflect.gdwd.co.uk','demo@classreflect.gdwd.co.uk','trial',NULL,5,50,'2025-08-17 18:28:09','2025-08-26 20:37:56'),(2,'Test Elementary School',NULL,NULL,'trial',NULL,10,100,'2025-08-26 20:22:25','2025-08-26 20:22:25'),(3,'ClassReflect Platform',NULL,NULL,'trial',NULL,10,100,'2025-08-26 20:22:25','2025-08-26 20:22:25');
/*!40000 ALTER TABLE `schools` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `teacher_progress`
--

DROP TABLE IF EXISTS `teacher_progress`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `teacher_progress` (
  `id` int NOT NULL AUTO_INCREMENT,
  `teacher_id` int NOT NULL,
  `school_id` int NOT NULL,
  `month_year` varchar(7) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_uploads` int DEFAULT '0',
  `average_score` decimal(5,2) DEFAULT NULL,
  `total_duration_minutes` int DEFAULT '0',
  `strengths_summary` json DEFAULT NULL,
  `improvements_summary` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_teacher_month` (`teacher_id`,`month_year`),
  KEY `school_id` (`school_id`),
  KEY `idx_teacher_id` (`teacher_id`),
  KEY `idx_month_year` (`month_year`),
  CONSTRAINT `teacher_progress_ibfk_1` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `teacher_progress_ibfk_2` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `teacher_progress`
--

LOCK TABLES `teacher_progress` WRITE;
/*!40000 ALTER TABLE `teacher_progress` DISABLE KEYS */;
/*!40000 ALTER TABLE `teacher_progress` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `teachers`
--

DROP TABLE IF EXISTS `teachers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `teachers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `school_id` int NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `first_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` enum('teacher','admin','super_admin') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'teacher',
  `status` enum('active','inactive','pending') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `last_login` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_email` (`email`),
  KEY `idx_school_id` (`school_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `teachers_ibfk_1` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `teachers`
--

LOCK TABLES `teachers` WRITE;
/*!40000 ALTER TABLE `teachers` DISABLE KEYS */;
INSERT INTO `teachers` VALUES (1,1,'admin@classreflect.gdwd.co.uk','$2b$10$YourHashedPasswordHere','Admin','User','super_admin','active',NULL,'2025-08-17 18:28:09','2025-08-17 18:28:09');
/*!40000 ALTER TABLE `teachers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transcripts`
--

DROP TABLE IF EXISTS `transcripts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transcripts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `job_id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `teacher_id` int NOT NULL,
  `school_id` int NOT NULL,
  `transcript_text` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `word_count` int DEFAULT NULL,
  `language` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'en',
  `confidence_score` decimal(3,2) DEFAULT NULL,
  `processing_time_seconds` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `school_id` (`school_id`),
  KEY `idx_job_id` (`job_id`),
  KEY `idx_teacher_id` (`teacher_id`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `transcripts_ibfk_1` FOREIGN KEY (`job_id`) REFERENCES `audio_jobs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `transcripts_ibfk_2` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `transcripts_ibfk_3` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transcripts`
--

LOCK TABLES `transcripts` WRITE;
/*!40000 ALTER TABLE `transcripts` DISABLE KEYS */;
/*!40000 ALTER TABLE `transcripts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `first_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('teacher','school_manager','super_admin') COLLATE utf8mb4_unicode_ci NOT NULL,
  `school_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `subjects` json DEFAULT NULL,
  `grades` json DEFAULT NULL,
  `cognito_username` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `last_login` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_email` (`email`),
  KEY `idx_role` (`role`),
  KEY `idx_school_id` (`school_id`),
  KEY `idx_cognito_username` (`cognito_username`),
  KEY `idx_is_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'superadmin@test.local','Super','Admin','super_admin','3',NULL,NULL,'superadmin-test',NULL,1,'2025-08-26 20:23:22','2025-08-26 20:20:54','2025-08-26 20:37:56'),(2,'manager@test.local','School','Manager','school_manager','1',NULL,NULL,'manager-test',NULL,1,'2025-08-26 20:23:23','2025-08-26 20:20:54','2025-08-26 20:37:56'),(3,'teacher@test.local','Test','Teacher','teacher','1','[\"Math\", \"Science\"]','[\"3\", \"4\", \"5\"]','teacher-test',NULL,1,'2025-08-26 20:23:48','2025-08-26 20:20:54','2025-08-26 20:37:56'),(4,'testadmin@classreflect.local','Test','Admin','super_admin','2',NULL,NULL,'testadmin',NULL,1,NULL,'2025-08-26 20:20:54','2025-08-26 20:22:36'),(5,'manager@demo.local','Demo','Manager','school_manager','1',NULL,NULL,'manager-demo',NULL,1,NULL,'2025-08-26 20:37:56','2025-08-26 20:37:56'),(6,'teacher@demo.local','Demo','Teacher','teacher','1','[\"Math\", \"English\"]','[\"1\", \"2\", \"3\"]','teacher-demo',NULL,1,NULL,'2025-08-26 20:37:56','2025-08-26 20:37:56');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-08-27  8:50:18
