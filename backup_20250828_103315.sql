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
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `analysis_criteria`
--

LOCK TABLES `analysis_criteria` WRITE;
/*!40000 ALTER TABLE `analysis_criteria` DISABLE KEYS */;
INSERT INTO `analysis_criteria` VALUES (6,1,'Student Engagement','Measures how well the teacher engages students in learning',1.00,1,'2025-08-27 13:53:10','2025-08-27 13:53:10'),(7,1,'Vocabulary Understanding','Student demonstrates understanding of key vocabulary',1.50,1,'2025-08-27 14:11:49','2025-08-27 14:11:49'),(8,1,'Text Analysis','Student can analyze text structure and meaning',2.00,1,'2025-08-27 14:11:49','2025-08-27 14:11:49'),(9,3,'Student Engagement','Measures how well the teacher engages students in learning',1.00,1,'2025-08-27 19:44:39','2025-08-27 19:44:39');
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
  CONSTRAINT `analysis_results_ibfk_4` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_analysis_results_teacher_id` FOREIGN KEY (`teacher_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
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
  CONSTRAINT `audio_jobs_ibfk_2` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_audio_jobs_school_id` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_audio_jobs_teacher_id` FOREIGN KEY (`teacher_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audio_jobs`
--

LOCK TABLES `audio_jobs` WRITE;
/*!40000 ALTER TABLE `audio_jobs` DISABLE KEYS */;
INSERT INTO `audio_jobs` VALUES ('2cde5f8c-208f-4675-85f7-3608def70c7e',4,1,'lakers-news.wav',71610446,'file:///tmp/classreflect-audio/audio-files/1/4/2cde5f8c-208f-4675-85f7-3608def70c7e.wav','audio-files/1/4/2cde5f8c-208f-4675-85f7-3608def70c7e.wav',NULL,'failed','Invalid endpoint schema, please refer to documentation for examples.',NULL,'2025-08-28 06:11:05','2025-08-28 06:11:06','2025-08-28 06:11:05','2025-08-28 06:11:06'),('fae73efe-c5a0-4228-9272-f087ccfafe27',3,1,'youtube-test.wav',3649142,'file:///tmp/classreflect-audio/audio-files/1/3/fae73efe-c5a0-4228-9272-f087ccfafe27.wav','audio-files/1/3/fae73efe-c5a0-4228-9272-f087ccfafe27.wav',NULL,'failed','Invalid endpoint schema, please refer to documentation for examples.',NULL,'2025-08-28 06:14:02','2025-08-28 06:14:04','2025-08-28 06:14:02','2025-08-28 06:14:04');
/*!40000 ALTER TABLE `audio_jobs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `school_subjects`
--

DROP TABLE IF EXISTS `school_subjects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `school_subjects` (
  `id` int NOT NULL AUTO_INCREMENT,
  `school_id` int NOT NULL,
  `subject_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `category` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'Custom',
  `created_by` int DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_school_subject` (`school_id`,`subject_name`),
  KEY `idx_school_id` (`school_id`),
  KEY `idx_active` (`is_active`),
  KEY `idx_school_subjects_category` (`category`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `school_subjects_ibfk_1` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE,
  CONSTRAINT `school_subjects_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=61 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `school_subjects`
--

LOCK TABLES `school_subjects` WRITE;
/*!40000 ALTER TABLE `school_subjects` DISABLE KEYS */;
INSERT INTO `school_subjects` VALUES (45,1,'Mathematics','Basic mathematics subject','Core',1,0,'2025-08-28 05:00:44','2025-08-28 05:04:18'),(46,1,'English Language Arts','Default English Language Arts subject for testing','Core',1,1,'2025-08-28 05:02:06','2025-08-28 05:04:18'),(47,1,'Science','Default Science subject for testing','Core',1,1,'2025-08-28 05:02:06','2025-08-28 05:04:18'),(48,1,'Social Studies','Default Social Studies subject for testing','Core',1,1,'2025-08-28 05:02:06','2025-08-28 05:04:18'),(49,1,'History','Default History subject for testing','Core',1,1,'2025-08-28 05:02:06','2025-08-28 05:04:18'),(50,1,'Geography','Default Geography subject for testing','Core',1,1,'2025-08-28 05:02:06','2025-08-28 05:04:18'),(51,1,'Biology','Default Biology subject for testing','Core',1,1,'2025-08-28 05:02:06','2025-08-28 05:04:18'),(52,1,'Chemistry','Default Chemistry subject for testing','Core',1,1,'2025-08-28 05:02:06','2025-08-28 05:04:18'),(53,1,'Physics','Default Physics subject for testing','Core',1,1,'2025-08-28 05:02:06','2025-08-28 05:04:18'),(54,1,'Art','Default Art subject for testing','Core',1,1,'2025-08-28 05:02:06','2025-08-28 05:04:18'),(55,1,'Music','Default Music subject for testing','Core',1,1,'2025-08-28 05:02:06','2025-08-28 05:04:18'),(56,1,'Physical Education','Default Physical Education subject for testing','Core',1,1,'2025-08-28 05:02:06','2025-08-28 05:04:18'),(57,1,'Health','Default Health subject for testing','Core',1,0,'2025-08-28 05:02:06','2025-08-28 05:04:18'),(58,1,'Computer Science','Default Computer Science subject for testing','Core',1,1,'2025-08-28 05:02:06','2025-08-28 05:04:18'),(59,1,'Technology','Default Technology subject for testing','Core',1,1,'2025-08-28 05:02:06','2025-08-28 05:04:18'),(60,1,'Advanced Mathematics','Advanced calculus and algebra','Advanced Studies',1,1,'2025-08-28 05:07:58','2025-08-28 05:09:02');
/*!40000 ALTER TABLE `school_subjects` ENABLE KEYS */;
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
INSERT INTO `schools` VALUES (1,'Demo Elementary School','demo-school.local','admin@demo-school.local','active','1969-12-29',51,500,'2025-08-27 07:48:22','2025-08-27 13:23:39'),(2,'Updated Test High School','test-high.edu','admin@test-high.edu','active','2025-12-30',10,100,'2025-08-27 13:23:51','2025-08-27 18:40:24'),(3,'test','gdwd.co.uk','guntars@gdwd.co.uk','active','2025-10-30',10,100,'2025-08-27 17:15:36','2025-08-27 18:40:28');
/*!40000 ALTER TABLE `schools` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `system_subjects`
--

DROP TABLE IF EXISTS `system_subjects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `system_subjects` (
  `id` int NOT NULL AUTO_INCREMENT,
  `subject_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `category` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'General',
  `is_active` tinyint(1) DEFAULT '1',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `subject_name` (`subject_name`),
  KEY `created_by` (`created_by`),
  KEY `idx_active` (`is_active`),
  KEY `idx_category` (`category`),
  CONSTRAINT `system_subjects_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `system_subjects`
--

LOCK TABLES `system_subjects` WRITE;
/*!40000 ALTER TABLE `system_subjects` DISABLE KEYS */;
/*!40000 ALTER TABLE `system_subjects` ENABLE KEYS */;
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
  CONSTRAINT `fk_teacher_progress_school_id` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_teacher_progress_teacher_id` FOREIGN KEY (`teacher_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
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
-- Table structure for table `template_categories`
--

DROP TABLE IF EXISTS `template_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `template_categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `school_id` int NOT NULL,
  `category_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `color` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_template_category_per_school` (`school_id`,`category_name`),
  KEY `created_by` (`created_by`),
  KEY `idx_school_template_active` (`school_id`,`is_active`),
  KEY `idx_template_category_name` (`category_name`),
  CONSTRAINT `template_categories_ibfk_1` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`),
  CONSTRAINT `template_categories_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `template_categories`
--

LOCK TABLES `template_categories` WRITE;
/*!40000 ALTER TABLE `template_categories` DISABLE KEYS */;
INSERT INTO `template_categories` VALUES (1,3,'General Assessment','General teaching assessment templates',NULL,1,1,'2025-08-28 05:15:32','2025-08-28 05:15:32'),(2,2,'General Assessment','General teaching assessment templates',NULL,1,1,'2025-08-28 05:15:32','2025-08-28 05:15:32'),(3,1,'General Assessment','General teaching assessment templates',NULL,1,1,'2025-08-28 05:15:32','2025-08-28 05:15:32'),(4,3,'Lesson Observation','Classroom lesson observation templates',NULL,1,1,'2025-08-28 05:15:32','2025-08-28 05:15:32'),(5,2,'Lesson Observation','Classroom lesson observation templates',NULL,1,1,'2025-08-28 05:15:32','2025-08-28 05:15:32'),(6,1,'Lesson Observation','Classroom lesson observation templates',NULL,1,1,'2025-08-28 05:15:32','2025-08-28 05:15:32'),(7,3,'Student Engagement','Templates focused on student engagement and participation',NULL,1,1,'2025-08-28 05:15:32','2025-08-28 05:15:32'),(8,2,'Student Engagement','Templates focused on student engagement and participation',NULL,1,1,'2025-08-28 05:15:32','2025-08-28 05:15:32'),(9,1,'Student Engagement','Templates focused on student engagement and participation',NULL,1,1,'2025-08-28 05:15:32','2025-08-28 05:15:32'),(10,3,'Teaching Methods','Templates for evaluating teaching methodologies',NULL,1,1,'2025-08-28 05:15:32','2025-08-28 05:15:32'),(11,2,'Teaching Methods','Templates for evaluating teaching methodologies',NULL,1,1,'2025-08-28 05:15:32','2025-08-28 05:15:32'),(12,1,'Teaching Methods','Templates for evaluating teaching methodologies',NULL,1,1,'2025-08-28 05:15:32','2025-08-28 05:15:32'),(13,3,'Classroom Management','Templates for classroom organization and management',NULL,1,1,'2025-08-28 05:15:32','2025-08-28 05:15:32'),(14,2,'Classroom Management','Templates for classroom organization and management',NULL,1,1,'2025-08-28 05:15:32','2025-08-28 05:15:32'),(15,1,'Classroom Management','Templates for classroom organization and management',NULL,1,1,'2025-08-28 05:15:32','2025-08-28 05:15:32'),(16,3,'Curriculum Delivery','Templates for assessing curriculum implementation',NULL,1,1,'2025-08-28 05:15:32','2025-08-28 05:15:32'),(17,2,'Curriculum Delivery','Templates for assessing curriculum implementation',NULL,1,1,'2025-08-28 05:15:32','2025-08-28 05:15:32'),(18,1,'Curriculum Delivery','Templates for assessing curriculum implementation',NULL,1,1,'2025-08-28 05:15:32','2025-08-28 05:15:32'),(19,3,'Professional Development','Templates for teacher growth and development',NULL,1,1,'2025-08-28 05:15:32','2025-08-28 05:15:32'),(20,2,'Professional Development','Templates for teacher growth and development',NULL,1,1,'2025-08-28 05:15:32','2025-08-28 05:15:32'),(21,1,'Professional Development','Templates for teacher growth and development',NULL,1,1,'2025-08-28 05:15:32','2025-08-28 05:15:32'),(22,3,'Custom','Custom school-specific templates',NULL,1,1,'2025-08-28 05:15:32','2025-08-28 05:15:32'),(23,2,'Custom','Custom school-specific templates',NULL,1,1,'2025-08-28 05:15:32','2025-08-28 05:15:32'),(24,1,'Custom','Custom school-specific templates',NULL,1,1,'2025-08-28 05:15:32','2025-08-28 05:15:32'),(34,1,'Lesson Planning','Templates for lesson planning and preparation','#51cf66',1,1,'2025-08-28 05:23:30','2025-08-28 05:23:30');
/*!40000 ALTER TABLE `template_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `template_criteria`
--

DROP TABLE IF EXISTS `template_criteria`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `template_criteria` (
  `id` int NOT NULL AUTO_INCREMENT,
  `template_id` int NOT NULL,
  `criteria_id` int DEFAULT NULL,
  `criteria_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `criteria_description` text COLLATE utf8mb4_unicode_ci,
  `weight` decimal(3,2) DEFAULT '1.00',
  `is_active` tinyint(1) DEFAULT '1',
  `order_index` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `criteria_id` (`criteria_id`),
  KEY `idx_template_id` (`template_id`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_order` (`order_index`),
  CONSTRAINT `template_criteria_ibfk_1` FOREIGN KEY (`template_id`) REFERENCES `templates` (`id`) ON DELETE CASCADE,
  CONSTRAINT `template_criteria_ibfk_2` FOREIGN KEY (`criteria_id`) REFERENCES `analysis_criteria` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `template_criteria`
--

LOCK TABLES `template_criteria` WRITE;
/*!40000 ALTER TABLE `template_criteria` DISABLE KEYS */;
INSERT INTO `template_criteria` VALUES (27,6,NULL,'Student Engagement','Measures how well the teacher engages students in learning',1.00,0,0,'2025-08-27 13:53:02'),(28,7,NULL,'Vocabulary Understanding','Student demonstrates understanding of key vocabulary',1.50,0,0,'2025-08-27 13:53:29'),(29,7,NULL,'Text Analysis','Student can analyze text structure and meaning',2.00,0,0,'2025-08-27 13:53:29'),(30,6,NULL,'Student Engagement','Measures how well the teacher engages students in learning',1.00,0,0,'2025-08-27 19:43:59'),(31,7,NULL,'Text Analysis','Student can analyze text structure and meaning',2.00,0,0,'2025-08-27 19:44:04'),(32,7,NULL,'Vocabulary Understanding','Student demonstrates understanding of key vocabulary',1.50,0,0,'2025-08-27 19:44:04'),(33,6,NULL,'Student Engagement','Measures how well the teacher engages students in learning',1.00,1,0,'2025-08-27 19:44:28'),(34,7,NULL,'Text Analysis','Student can analyze text structure and meaning',2.00,0,0,'2025-08-27 19:46:04'),(35,7,NULL,'Vocabulary Understanding','Student demonstrates understanding of key vocabulary',1.50,0,0,'2025-08-27 19:46:04'),(36,7,NULL,'Text Analysis','Student can analyze text structure and meaning',2.00,1,0,'2025-08-28 05:31:46'),(37,7,NULL,'Vocabulary Understanding','Student demonstrates understanding of key vocabulary',1.50,1,0,'2025-08-28 05:31:46');
/*!40000 ALTER TABLE `template_criteria` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `template_usage`
--

DROP TABLE IF EXISTS `template_usage`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `template_usage` (
  `id` int NOT NULL AUTO_INCREMENT,
  `template_id` int NOT NULL,
  `school_id` int NOT NULL,
  `applied_by` int DEFAULT NULL,
  `criteria_added` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `applied_by` (`applied_by`),
  KEY `idx_template_id` (`template_id`),
  KEY `idx_school_id` (`school_id`),
  KEY `idx_created_at` (`created_at`),
  CONSTRAINT `template_usage_ibfk_1` FOREIGN KEY (`template_id`) REFERENCES `templates` (`id`) ON DELETE CASCADE,
  CONSTRAINT `template_usage_ibfk_2` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE,
  CONSTRAINT `template_usage_ibfk_3` FOREIGN KEY (`applied_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `template_usage`
--

LOCK TABLES `template_usage` WRITE;
/*!40000 ALTER TABLE `template_usage` DISABLE KEYS */;
/*!40000 ALTER TABLE `template_usage` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `templates`
--

DROP TABLE IF EXISTS `templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `templates` (
  `id` int NOT NULL AUTO_INCREMENT,
  `template_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `category_id` int DEFAULT NULL,
  `category` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `grade_levels` json DEFAULT NULL,
  `subjects` json DEFAULT NULL,
  `is_global` tinyint(1) DEFAULT '0',
  `school_id` int DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `usage_count` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  KEY `idx_category` (`category`),
  KEY `idx_is_global` (`is_global`),
  KEY `idx_school_id` (`school_id`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_created_at` (`created_at`),
  KEY `fk_template_category` (`category_id`),
  CONSTRAINT `templates_ibfk_1` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE,
  CONSTRAINT `templates_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `templates_ibfk_3` FOREIGN KEY (`category_id`) REFERENCES `template_categories` (`id`),
  CONSTRAINT `templates_ibfk_4` FOREIGN KEY (`category_id`) REFERENCES `template_categories` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `templates`
--

LOCK TABLES `templates` WRITE;
/*!40000 ALTER TABLE `templates` DISABLE KEYS */;
INSERT INTO `templates` VALUES (6,'test','',NULL,'General Teaching','[\"1\"]','[\"Mathematics\"]',1,3,1,1,0,'2025-08-27 13:49:50','2025-08-27 19:44:28'),(7,'Reading Comprehension Assessment','Comprehensive evaluation criteria for reading comprehension skills',NULL,'Classroom Management','[\"3\", \"4\", \"5\"]','[\"English\", \"Reading\"]',1,1,1,1,0,'2025-08-27 13:53:29','2025-08-28 05:31:46');
/*!40000 ALTER TABLE `templates` ENABLE KEYS */;
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
  CONSTRAINT `fk_transcripts_job_id` FOREIGN KEY (`job_id`) REFERENCES `audio_jobs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_transcripts_school_id` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_transcripts_teacher_id` FOREIGN KEY (`teacher_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `transcripts_ibfk_1` FOREIGN KEY (`job_id`) REFERENCES `audio_jobs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `transcripts_ibfk_3` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
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
  `school_id` int NOT NULL,
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
  KEY `idx_is_active` (`is_active`),
  CONSTRAINT `fk_users_school_id` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'superadmin@test.local','Super','Admin','super_admin',1,NULL,NULL,'superadmin-test',NULL,1,'2025-08-27 19:51:26','2025-08-27 07:48:22','2025-08-27 19:51:26'),(2,'manager@test.local','School','Manager','school_manager',1,NULL,NULL,'manager-test',NULL,1,'2025-08-27 19:52:45','2025-08-27 07:48:22','2025-08-27 19:52:45'),(3,'teacher@test.local','Test','Teacher','teacher',1,'[\"Math\", \"Science\"]','[\"3\", \"4\", \"5\"]','teacher-test',NULL,1,'2025-08-27 17:32:28','2025-08-27 07:48:22','2025-08-27 17:32:28'),(4,'teacher2@test.local','Jane','Smith','teacher',1,'[\"English\", \"Literature\", \"Science\"]','[\"1\", \"2\", \"10\"]','teacher2-test',NULL,1,NULL,'2025-08-27 07:48:22','2025-08-27 17:19:28'),(6,'guntars@gdwd.co.uk','ggg','ddd','teacher',3,'[\"Mathematics\"]','[\"2\", \"3\"]','gggddd15720457g7ia',NULL,1,'2025-08-27 19:30:32','2025-08-27 17:28:41','2025-08-28 04:25:47'),(7,'admin@test.com','Test','Admin','super_admin',1,NULL,NULL,'admin-test-new',NULL,1,NULL,'2025-08-27 18:42:42','2025-08-27 18:42:42'),(8,'guntars.dikis@gmail.com','ddd','ggg','teacher',3,NULL,NULL,'dddggg244663858jxr',NULL,1,NULL,'2025-08-27 19:54:27','2025-08-27 19:54:27');
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

-- Dump completed on 2025-08-28 10:33:16
