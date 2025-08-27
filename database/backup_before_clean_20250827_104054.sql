-- MySQL dump 10.13  Distrib 8.0.40, for macos12.7 (arm64)
--
-- Host: gdwd.cluster-cjjl7f5jormj.eu-west-2.rds.amazonaws.com    Database: classreflect
-- ------------------------------------------------------
-- Server version	8.0.32

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
SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;
SET @@SESSION.SQL_LOG_BIN= 0;

--
-- GTID state at the beginning of the backup 
--

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ '';

--
-- Table structure for table `analysis_criteria`
--

DROP TABLE IF EXISTS `analysis_criteria`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `analysis_criteria` (
  `id` int NOT NULL AUTO_INCREMENT,
  `school_id` int NOT NULL,
  `criteria_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `criteria_description` text COLLATE utf8mb4_unicode_ci,
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
INSERT INTO `analysis_criteria` VALUES (1,1,'Student Engagement','Measures how well the teacher engages students',1.50,1,'2025-08-17 18:27:21','2025-08-17 18:27:21'),(2,1,'Clear Instructions','Evaluates clarity of instructions and explanations',1.20,1,'2025-08-17 18:27:21','2025-08-17 18:27:21'),(3,1,'Question Techniques','Assesses questioning strategies and wait time',1.30,1,'2025-08-17 18:27:21','2025-08-17 18:27:21'),(4,1,'Classroom Management','Reviews classroom control and time management',1.00,1,'2025-08-17 18:27:21','2025-08-17 18:27:21'),(5,1,'Inclusive Teaching','Checks for inclusive practices and differentiation',1.10,1,'2025-08-17 18:27:21','2025-08-17 18:27:21');
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
  `job_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `teacher_id` int NOT NULL,
  `school_id` int NOT NULL,
  `overall_score` decimal(5,2) DEFAULT NULL,
  `strengths` json DEFAULT NULL,
  `improvements` json DEFAULT NULL,
  `detailed_feedback` json DEFAULT NULL,
  `ai_model` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT 'gpt-4',
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
  `key_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `key_prefix` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
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
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `teacher_id` int NOT NULL,
  `school_id` int NOT NULL,
  `file_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` bigint DEFAULT NULL,
  `file_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `s3_key` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `duration_seconds` int DEFAULT NULL,
  `status` enum('pending','uploading','queued','processing','completed','failed') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `error_message` text COLLATE utf8mb4_unicode_ci,
  `sqs_message_id` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `processing_started_at` timestamp NULL DEFAULT NULL,
  `processing_completed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_teacher_id` (`teacher_id`),
  KEY `idx_school_id` (`school_id`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_audio_jobs_teacher_status` (`teacher_id`,`status`),
  CONSTRAINT `audio_jobs_ibfk_1` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `audio_jobs_ibfk_2` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audio_jobs`
--

LOCK TABLES `audio_jobs` WRITE;
/*!40000 ALTER TABLE `audio_jobs` DISABLE KEYS */;
INSERT INTO `audio_jobs` VALUES ('9ab0ee62-fb2c-4ee0-b392-aed9de0f56fd',1,1,'lakers-news.wav',71610446,'s3://classreflect-audio-files-573524060586/audio-files/1/1/9ab0ee62-fb2c-4ee0-b392-aed9de0f56fd.wav','audio-files/1/1/9ab0ee62-fb2c-4ee0-b392-aed9de0f56fd.wav',NULL,'completed',NULL,'00700269-a8d9-4932-a40d-f216a66ef42c','2025-08-18 00:02:02','2025-08-18 00:02:47','2025-08-18 00:00:07','2025-08-18 00:02:47'),('9df9caf5-1f07-4dc0-a1c8-274f30686e70',1,1,'youtube-test.wav',3649142,'s3://classreflect-audio-files-573524060586/audio-files/1/1/9df9caf5-1f07-4dc0-a1c8-274f30686e70.wav','audio-files/1/1/9df9caf5-1f07-4dc0-a1c8-274f30686e70.wav',NULL,'completed',NULL,'a70f6f28-a4ae-4b88-8679-106c0daabb74','2025-08-18 00:07:47','2025-08-18 00:07:49','2025-08-18 00:05:09','2025-08-18 00:07:49'),('d36a20f0-52e3-4801-aa03-3ca07084db9a',1,1,'lakers-news.wav',71610446,'s3://classreflect-audio-files-573524060586/audio-files/1/1/d36a20f0-52e3-4801-aa03-3ca07084db9a.wav','audio-files/1/1/d36a20f0-52e3-4801-aa03-3ca07084db9a.wav',NULL,'completed',NULL,'f388b31e-1934-4031-b51e-62050f7fdcd7','2025-08-18 00:07:02','2025-08-18 00:07:46','2025-08-18 00:04:59','2025-08-18 00:07:46');
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
  `name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `domain` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `contact_email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `subscription_status` enum('trial','active','suspended','cancelled') COLLATE utf8mb4_unicode_ci DEFAULT 'trial',
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
INSERT INTO `schools` VALUES (1,'Demo School','demo.classreflect.gdwd.co.uk','demo@classreflect.gdwd.co.uk','trial',NULL,5,50,'2025-08-17 18:27:21','2025-08-17 18:27:21'),(2,'Demo Elementary School',NULL,'demo@school.edu','trial',NULL,10,100,'2025-08-17 18:45:58','2025-08-17 18:45:58'),(3,'Demo Elementary School',NULL,'demo@school.edu','trial',NULL,10,100,'2025-08-17 18:46:10','2025-08-17 18:46:10');
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
  `month_year` varchar(7) COLLATE utf8mb4_unicode_ci NOT NULL,
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
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `first_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` enum('teacher','admin','super_admin') COLLATE utf8mb4_unicode_ci DEFAULT 'teacher',
  `status` enum('active','inactive','pending') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `last_login` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_email` (`email`),
  KEY `idx_school_id` (`school_id`),
  KEY `idx_status` (`status`),
  CONSTRAINT `teachers_ibfk_1` FOREIGN KEY (`school_id`) REFERENCES `schools` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `teachers`
--

LOCK TABLES `teachers` WRITE;
/*!40000 ALTER TABLE `teachers` DISABLE KEYS */;
INSERT INTO `teachers` VALUES (1,1,'admin@classreflect.gdwd.co.uk','$2b$10$YourHashedPasswordHere','Admin','User','super_admin','active',NULL,'2025-08-17 18:27:21','2025-08-17 18:27:21'),(2,1,'teacher@demo.edu','d3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791','Demo','Teacher','teacher','active',NULL,'2025-08-17 18:46:11','2025-08-17 18:46:11');
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
  `job_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `teacher_id` int NOT NULL,
  `school_id` int NOT NULL,
  `transcript_text` longtext COLLATE utf8mb4_unicode_ci,
  `word_count` int DEFAULT NULL,
  `language` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT 'en',
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
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transcripts`
--

LOCK TABLES `transcripts` WRITE;
/*!40000 ALTER TABLE `transcripts` DISABLE KEYS */;
INSERT INTO `transcripts` VALUES (6,'9ab0ee62-fb2c-4ee0-b392-aed9de0f56fd',1,1,' Welcome to Lakers News Channel! Don\'t forget to subscribe to the channel! Leave your like and activate the notification bell! Write in the comments which city you are watching! What if I told you that the NBA world is sitting on the edge of a potential earthquake? One so massive, so unbelievable, that it could completely rewrite the future of the Los Angeles Lakers and shake the entire league to its core. A shocking scenario is being whispered behind the curtains. A vision that could see legends torn apart, dynasties reborn, and a new era of power rising in Hollywood. Stay locked in, because what you\'re about to hear will leave you stunned. We are in the heart of the long, slow NBA off-season, that strange desert where rumors become storms and imagination runs wild. And this summer, Bleacher reports Eric Pinkis dropped a bombshell unlike anything fans have ever seen. A massive, five-team trade proposal so outrageous that it dares to ask a question no one ever thought possible. What if the Lakers actually let go of LeBron James? Yes, you heard that right. In this scenario, the king himself would leave Los Angeles. But in return, the Lakers could gain something even more powerful. The unstoppable force of Janisante de Cumpo, the Greek freak, teaming up with Luca Dantich in purple and gold. Imagine it, LeBron James, alongside his son Brony, heading to Dallas to join forces with the Mavericks. Brooklyn scooping up fresh young talent like Dalton Connect. Mill Waukey receiving a treasure chest of draft picks stretching all the way into the next decade. The Raptors reshaping their roster. And at the very center of this wild vision, the Lakers, who would trade away their past in exchange for their future. A future defined by Luca Dantich and Janisante de Cumpo standing shoulder to shoulder as the most terrifying duo the NBA has ever seen. Here\'s how the madness would break down. The Mavericks would secure LeBron James, Brony James, and a mix of young role players to fill their depth chart. The Lakers would land Janis on Tete Cumpo himself, Olivier Maxson\'s prosper, Tyrese Martin, and millions in trade exceptions. The Bucks would be handed RJ Barrett, PJ Washington, Caleb Martin, and more assets to keep their window alive. Toronto would claim Daniel Gafford, and Brooklyn would walk away with Dalton Connect, Jaden Hardy, and Dwight Powell. Five teams, dozens of moving parts, and one deal that could alter history forever. Now, let\'s pause for a moment. LeBron James, even at over 40 years old, still commands the spotlight like no one else. He remains an icon, a legend who defies time itself. But Janisante de Cumpo, he is the future. At just 30 years old, still in his prime, locked into a deal worth over $58 million in 2026 to 27 with a player option in 2027 to 28, he represents not just a star, but a long-term weapon for the Lakers Championship timeline. Think about it. Janis averaged a mind-blowing 30.4 points, 11.9 rebounds, and 6.5 assists last season. Those are not just numbers. They are domination, proof that he is one of the top three players alive on the planet today. Pair that with Luca Doncic, a generational talent already capable of dropping triple doubles with ease, and suddenly Los Angeles is staring at the creation of the greatest one-two punch the NBA has ever seen. A duo so lethal, so versatile, that opposing teams wouldn\'t even know where to begin. This is not just a hypothetical dream, it\'s a fever vision of what could be. Two international superstars uniting in the entertainment capital of the world. Hollywood lights shining on a pair of global icons. Statsheets exploding night after night. Opponents left broken, humiliated, and swept aside. Four Lakers fans, the mere thought of Luca and Janis together is enough to make the heart race and the imagination burn. But here\'s the painful truth. As jaw-dropping as it sounds, this blockbuster is still only an idea of what if living inside the mind of Eric Pinkis. The logistics of pulling off such a massive five-team deal are nearly impossible. The politics, the money, the egos. All of it makes this a fantasy more than a plan. And yet, the fact that it\'s even being discussed tells you something. The NBA is changing, the Lakers are evolving, and the future is never as far away as you think. So while fans should not count on Aunt Attacumpo wearing purple and gold just yet, one thing is clear. The seeds of a new era are being planted. And when those seeds take root, whether it\'s Janis, another superstar, or an even bigger surprise, the NBA landscape will never ever be the same. Because the question is no longer if the Lakers will reinvent themselves. The question is when, and who will rise with them when the next dynasty begins. And that\'s what makes this entire scenario so electrifying. Because even if it never happens, the idea alone plants doubt, excitement, and chaos across the league. Fans everywhere are asking themselves, what if? What if the Lakers really did pull the trigger? What if the Mavericks were bold enough to welcome LeBron and Bronnie into their future? And what if Janis, the most dominant player of this generation, actually chose to build his legacy in Los Angeles? Those three words, what if, are enough to keep the basketball world on fire? The truth is, the NBA thrives on drama, on moments that blur the line between fantasy and reality. And whether this trade comes to life or not, it fuels the narrative that the Lakers are always in the hunt, always one step away from shocking the world again. They are the franchise of legends, of miracles, of impossible comebacks. And now, whispers of Janis and Luca standing together in Lakers, gold keep that fire alive, reminding everyone that Los Angeles is never content with being ordinary. They were built for the extraordinary. So buckle up, because this offseason may just be the calm before a storm. A storm that could sweep across arenas, shatter expectations, and crown a new dynasty in the city of angels. For now, it\'s only a vision. But in the NBA, visions can become reality overnight. And if that day comes, the world will never forget the moment when the Greek freak and the Slovenian sensation join forces to turn Hollywood into the epicenter of basketball dominance once again.',1090,'en',0.95,NULL,'2025-08-18 00:02:47'),(7,'d36a20f0-52e3-4801-aa03-3ca07084db9a',1,1,' Welcome to Lakers News Channel! Don\'t forget to subscribe to the channel! Leave your like and activate the notification bell! Write in the comments which city you are watching! What if I told you that the NBA world is sitting on the edge of a potential earthquake? One so massive, so unbelievable, that it could completely rewrite the future of the Los Angeles Lakers and shake the entire league to its core. A shocking scenario is being whispered behind the curtains. A vision that could see legends torn apart, dynasties reborn, and a new era of power rising in Hollywood. Stay locked in, because what you\'re about to hear will leave you stunned. We are in the heart of the long, slow NBA off-season, that strange desert where rumors become storms and imagination runs wild. And this summer, Bleacher reports Eric Pinkis dropped a bombshell unlike anything fans have ever seen. A massive, five-team trade proposal so outrageous that it dares to ask a question no one ever thought possible. What if the Lakers actually let go of LeBron James? Yes, you heard that right. In this scenario, the king himself would leave Los Angeles. But in return, the Lakers could gain something even more powerful. The unstoppable force of Janisante de Cumpo, the Greek freak, teaming up with Luca Dantich in purple and gold. Imagine it, LeBron James, alongside his son Brony, heading to Dallas to join forces with the Mavericks. Brooklyn scooping up fresh young talent like Dalton Connect. Mill Waukey receiving a treasure chest of draft picks stretching all the way into the next decade. The Raptors reshaping their roster. And at the very center of this wild vision, the Lakers, who would trade away their past in exchange for their future. A future defined by Luca Dantich and Janisante de Cumpo standing shoulder to shoulder as the most terrifying duo the NBA has ever seen. Here\'s how the madness would break down. The Mavericks would secure LeBron James, Brony James, and a mix of young role players to fill their depth chart. The Lakers would land Janis on Tete Cumpo himself, Olivier Maxson\'s prosper, Tyrese Martin, and millions in trade exceptions. The Bucks would be handed RJ Barrett, PJ Washington, Caleb Martin, and more assets to keep their window alive. Toronto would claim Daniel Gafford, and Brooklyn would walk away with Dalton Connect, Jaden Hardy, and Dwight Powell. Five teams, dozens of moving parts, and one deal that could alter history forever. Now, let\'s pause for a moment. LeBron James, even at over 40 years old, still commands the spotlight like no one else. He remains an icon, a legend who defies time itself. But Janisante de Cumpo, he is the future. At just 30 years old, still in his prime, locked into a deal worth over $58 million in 2026 to 27 with a player option in 2027 to 28, he represents not just a star, but a long-term weapon for the Lakers Championship timeline. Think about it. Janis averaged a mind-blowing 30.4 points, 11.9 rebounds, and 6.5 assists last season. Those are not just numbers. They are domination, proof that he is one of the top three players alive on the planet today. Pair that with Luca Doncic, a generational talent already capable of dropping triple doubles with ease, and suddenly Los Angeles is staring at the creation of the greatest one-two punch the NBA has ever seen. A duo so lethal, so versatile, that opposing teams wouldn\'t even know where to begin. This is not just a hypothetical dream, it\'s a fever vision of what could be. Two international superstars uniting in the entertainment capital of the world. Hollywood lights shining on a pair of global icons. Statsheets exploding night after night. Opponents left broken, humiliated, and swept aside. Four Lakers fans, the mere thought of Luca and Janis together is enough to make the heart race and the imagination burn. But here\'s the painful truth. As jaw-dropping as it sounds, this blockbuster is still only an idea of what if living inside the mind of Eric Pinkis. The logistics of pulling off such a massive five-team deal are nearly impossible. The politics, the money, the egos. All of it makes this a fantasy more than a plan. And yet, the fact that it\'s even being discussed tells you something. The NBA is changing, the Lakers are evolving, and the future is never as far away as you think. So while fans should not count on Aunt Attacumpo wearing purple and gold just yet, one thing is clear. The seeds of a new era are being planted. And when those seeds take root, whether it\'s Janis, another superstar, or an even bigger surprise, the NBA landscape will never ever be the same. Because the question is no longer if the Lakers will reinvent themselves. The question is when, and who will rise with them when the next dynasty begins. And that\'s what makes this entire scenario so electrifying. Because even if it never happens, the idea alone plants doubt, excitement, and chaos across the league. Fans everywhere are asking themselves, what if? What if the Lakers really did pull the trigger? What if the Mavericks were bold enough to welcome LeBron and Bronnie into their future? And what if Janis, the most dominant player of this generation, actually chose to build his legacy in Los Angeles? Those three words, what if, are enough to keep the basketball world on fire? The truth is, the NBA thrives on drama, on moments that blur the line between fantasy and reality. And whether this trade comes to life or not, it fuels the narrative that the Lakers are always in the hunt, always one step away from shocking the world again. They are the franchise of legends, of miracles, of impossible comebacks. And now, whispers of Janis and Luca standing together in Lakers, gold keep that fire alive, reminding everyone that Los Angeles is never content with being ordinary. They were built for the extraordinary. So buckle up, because this offseason may just be the calm before a storm. A storm that could sweep across arenas, shatter expectations, and crown a new dynasty in the city of angels. For now, it\'s only a vision. But in the NBA, visions can become reality overnight. And if that day comes, the world will never forget the moment when the Greek freak and the Slovenian sensation join forces to turn Hollywood into the epicenter of basketball dominance once again.',1090,'en',0.95,NULL,'2025-08-18 00:07:46'),(8,'9df9caf5-1f07-4dc0-a1c8-274f30686e70',1,1,' Alright so here we are one of the elephants. The cool thing about these guys is that they have really, really, really long punks. And that\'s cool. And that\'s pretty much all there is to say.',36,'en',0.95,NULL,'2025-08-18 00:07:49');
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
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'superadmin@test.local','Super','Admin','super_admin','platform',NULL,NULL,'superadmin-test',NULL,1,'2025-08-26 20:22:45','2025-08-18 19:01:53','2025-08-26 20:22:45'),(2,'manager@test.local','School','Manager','school_manager','test-school-001',NULL,NULL,'manager-test',NULL,1,'2025-08-26 20:22:46','2025-08-26 20:01:11','2025-08-26 20:22:46'),(3,'teacher@test.local','Test','Teacher','teacher','test-school-001','[\"Math\", \"Science\"]','[\"3\", \"4\", \"5\"]','teacher-test',NULL,1,'2025-08-26 20:22:47','2025-08-26 20:01:45','2025-08-26 20:22:47');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-08-27 10:41:06
