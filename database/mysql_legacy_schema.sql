-- MySQL dump 10.13  Distrib 9.7.1, for macos26.4 (arm64)
--
-- Host: localhost    Database: dbms_mini_project
-- ------------------------------------------------------
-- Server version	9.7.1

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

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ '24a3fd08-8f14-11f1-af55-b2443a57071e:1-241';

--
-- Table structure for table `CLAIMS`
--

DROP TABLE IF EXISTS `CLAIMS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `CLAIMS` (
  `claim_id` int NOT NULL AUTO_INCREMENT,
  `batch_id` int NOT NULL,
  `food_bank_id` int NOT NULL,
  `claim_date` date DEFAULT NULL,
  `quantity_claimed` int NOT NULL,
  `status` varchar(50) DEFAULT NULL,
  `approved_date` date DEFAULT NULL,
  `pickup_required` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`claim_id`),
  KEY `fk_claims_batch` (`batch_id`),
  KEY `fk_claims_food_bank` (`food_bank_id`),
  CONSTRAINT `fk_claims_batch` FOREIGN KEY (`batch_id`) REFERENCES `FOOD_BATCHES` (`batch_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_claims_food_bank` FOREIGN KEY (`food_bank_id`) REFERENCES `FOOD_BANKS` (`food_bank_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `DELIVERIES`
--

DROP TABLE IF EXISTS `DELIVERIES`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `DELIVERIES` (
  `delivery_id` int NOT NULL AUTO_INCREMENT,
  `claim_id` int NOT NULL,
  `transport_id` int DEFAULT NULL,
  `pickup_date` date DEFAULT NULL,
  `pickup_time` time DEFAULT NULL,
  `delivery_date` date DEFAULT NULL,
  `delivery_time` time DEFAULT NULL,
  `pickup_location` text,
  `delivery_location` text,
  `status` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`delivery_id`),
  KEY `fk_deliveries_claim` (`claim_id`),
  KEY `fk_deliveries_transport` (`transport_id`),
  CONSTRAINT `fk_deliveries_claim` FOREIGN KEY (`claim_id`) REFERENCES `CLAIMS` (`claim_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_deliveries_transport` FOREIGN KEY (`transport_id`) REFERENCES `TRANSPORT` (`transport_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `FEEDBACK`
--

DROP TABLE IF EXISTS `FEEDBACK`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `FEEDBACK` (
  `feedback_no` int NOT NULL,
  `claim_id` int NOT NULL,
  `rating` int DEFAULT NULL,
  `comments` text,
  `feedback_date` date DEFAULT NULL,
  `response` text,
  `status` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`claim_id`,`feedback_no`),
  CONSTRAINT `fk_feedback_claim` FOREIGN KEY (`claim_id`) REFERENCES `CLAIMS` (`claim_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `FOOD`
--

DROP TABLE IF EXISTS `FOOD`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `FOOD` (
  `food_id` int NOT NULL AUTO_INCREMENT,
  `food_name` varchar(100) NOT NULL,
  `category` varchar(50) DEFAULT NULL,
  `description` text,
  `unit` varchar(20) DEFAULT NULL,
  `storage_requirement` varchar(100) DEFAULT NULL,
  `is_perishable` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`food_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `FOOD_BANKS`
--

DROP TABLE IF EXISTS `FOOD_BANKS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `FOOD_BANKS` (
  `food_bank_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `registration_no` varchar(50) DEFAULT NULL,
  `contact_person` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `address` text,
  `city` varchar(50) DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `storage_capacity` varchar(50) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`food_bank_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `FOOD_BATCHES`
--

DROP TABLE IF EXISTS `FOOD_BATCHES`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `FOOD_BATCHES` (
  `batch_id` int NOT NULL AUTO_INCREMENT,
  `food_id` int NOT NULL,
  `donator_id` int NOT NULL,
  `quantity` int NOT NULL,
  `available_quantity` int NOT NULL,
  `donation_date` date DEFAULT NULL,
  `manufacturing_date` date DEFAULT NULL,
  `expiry_date` date DEFAULT NULL,
  `storage_condition` varchar(100) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`batch_id`),
  KEY `fk_batches_food` (`food_id`),
  KEY `fk_batches_donator` (`donator_id`),
  CONSTRAINT `fk_batches_donator` FOREIGN KEY (`donator_id`) REFERENCES `FOOD_DONATORS` (`donator_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_batches_food` FOREIGN KEY (`food_id`) REFERENCES `FOOD` (`food_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `FOOD_DONATORS`
--

DROP TABLE IF EXISTS `FOOD_DONATORS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `FOOD_DONATORS` (
  `donator_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `organization_name` varchar(150) DEFAULT NULL,
  `donator_type` varchar(50) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `address` text,
  `city` varchar(50) DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `registration_date` date DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`donator_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `LOGS`
--

DROP TABLE IF EXISTS `LOGS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `LOGS` (
  `log_no` int NOT NULL AUTO_INCREMENT,
  `action` varchar(100) NOT NULL,
  `action_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `description` text,
  `entity_type` varchar(50) DEFAULT NULL,
  `entity_reference` int DEFAULT NULL,
  `old_status` varchar(50) DEFAULT NULL,
  `new_status` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`log_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ROUTINES`
--

DROP TABLE IF EXISTS `ROUTINES`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ROUTINES` (
  `routine_no` int NOT NULL,
  `transport_id` int NOT NULL,
  `scheduled_day` varchar(20) DEFAULT NULL,
  `scheduled_time` time DEFAULT NULL,
  `frequency` varchar(50) DEFAULT NULL,
  `source_location` text,
  `destination_location` text,
  `status` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`transport_id`,`routine_no`),
  CONSTRAINT `fk_routines_transport` FOREIGN KEY (`transport_id`) REFERENCES `TRANSPORT` (`transport_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TRANSPORT`
--

DROP TABLE IF EXISTS `TRANSPORT`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TRANSPORT` (
  `transport_id` int NOT NULL AUTO_INCREMENT,
  `vehicle_number` varchar(50) NOT NULL,
  `vehicle_type` varchar(50) DEFAULT NULL,
  `driver_name` varchar(100) DEFAULT NULL,
  `driver_phone` varchar(20) DEFAULT NULL,
  `capacity` varchar(50) DEFAULT NULL,
  `availability_status` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`transport_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `WASTE_AUDIT_RECORDS`
--

DROP TABLE IF EXISTS `WASTE_AUDIT_RECORDS`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `WASTE_AUDIT_RECORDS` (
  `waste_no` int NOT NULL,
  `batch_id` int NOT NULL,
  `quantity_wasted` int NOT NULL,
  `waste_date` date DEFAULT NULL,
  `reason` text,
  `disposal_method` varchar(100) DEFAULT NULL,
  `remarks` text,
  PRIMARY KEY (`batch_id`,`waste_no`),
  CONSTRAINT `fk_waste_batch` FOREIGN KEY (`batch_id`) REFERENCES `FOOD_BATCHES` (`batch_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping routines for database 'dbms_mini_project'
--
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-31  0:11:46
