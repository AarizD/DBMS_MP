-- ==============================================================================
-- FOOD REDISTRIBUTION & EXPIRATION TRACKING
-- DBMS Level 3 Experiential Learning Project
-- Database: PostgreSQL 16 with pgvector extension
-- ==============================================================================

-- Enable pgvector extension for AI semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop existing tables in reverse dependency order if recreating
DROP TABLE IF EXISTS LOGS CASCADE;
DROP TABLE IF EXISTS FEEDBACK CASCADE;
DROP TABLE IF EXISTS WASTE_AUDIT_RECORDS CASCADE;
DROP TABLE IF EXISTS ROUTINES CASCADE;
DROP TABLE IF EXISTS DELIVERIES CASCADE;
DROP TABLE IF EXISTS CLAIMS CASCADE;
DROP TABLE IF EXISTS FOOD_BATCHES CASCADE;
DROP TABLE IF EXISTS TRANSPORT CASCADE;
DROP TABLE IF EXISTS FOOD_BANKS CASCADE;
DROP TABLE IF EXISTS FOOD CASCADE;
DROP TABLE IF EXISTS FOOD_DONATORS CASCADE;
DROP TABLE IF EXISTS USERS CASCADE;

-- ==============================================================================
-- 1. USERS TABLE (Authentication & Role-Based Access Control)
-- ==============================================================================
CREATE TABLE USERS (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('DONOR', 'FOOD_BANK', 'ADMIN', 'DRIVER')),
    phone VARCHAR(20),
    organization_name VARCHAR(150),
    reference_id INT, -- Links to donator_id, food_bank_id, or transport_id
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED'))
);

-- ==============================================================================
-- 2. FOOD_DONATORS TABLE
-- ==============================================================================
CREATE TABLE FOOD_DONATORS (
    donator_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    organization_name VARCHAR(150),
    donator_type VARCHAR(50) CHECK (donator_type IN ('SUPERMARKET', 'BAKERY', 'RESTAURANT', 'HOTEL', 'INDIVIDUAL', 'OTHER')),
    phone VARCHAR(20),
    email VARCHAR(100) UNIQUE,
    address TEXT,
    city VARCHAR(50),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    registration_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'PENDING_APPROVAL'))
);

-- ==============================================================================
-- 3. FOOD CATALOG TABLE
-- ==============================================================================
CREATE TABLE FOOD (
    food_id SERIAL PRIMARY KEY,
    food_name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('BAKERY', 'DAIRY', 'PRODUCE', 'PREPARED_MEALS', 'CANNED_GOODS', 'BEVERAGES', 'PACKAGED_SNACKS', 'OTHER')),
    description TEXT,
    unit VARCHAR(20) DEFAULT 'kg', -- 'kg', 'litres', 'packets', 'servings'
    storage_requirement VARCHAR(100), -- 'AMBIENT', 'REFRIGERATED', 'FROZEN', 'DRY'
    is_perishable BOOLEAN DEFAULT TRUE
);

-- ==============================================================================
-- 4. FOOD_BANKS TABLE
-- ==============================================================================
CREATE TABLE FOOD_BANKS (
    food_bank_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    registration_no VARCHAR(50) UNIQUE,
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100) UNIQUE,
    address TEXT,
    city VARCHAR(50),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    storage_capacity_kg INT DEFAULT 1000 CHECK (storage_capacity_kg >= 0),
    status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'PENDING_VERIFICATION'))
);

-- ==============================================================================
-- 5. TRANSPORT TABLE
-- ==============================================================================
CREATE TABLE TRANSPORT (
    transport_id SERIAL PRIMARY KEY,
    vehicle_number VARCHAR(50) UNIQUE NOT NULL,
    vehicle_type VARCHAR(50) CHECK (vehicle_type IN ('REFRIGERATED_VAN', 'VAN', 'PICKUP_TRUCK', 'CAR', 'MOTORCYCLE')),
    driver_name VARCHAR(100),
    driver_phone VARCHAR(20),
    capacity_kg INT DEFAULT 500 CHECK (capacity_kg > 0),
    availability_status VARCHAR(50) DEFAULT 'AVAILABLE' CHECK (availability_status IN ('AVAILABLE', 'IN_TRANSIT', 'MAINTENANCE', 'OFF_DUTY'))
);

-- ==============================================================================
-- 6. FOOD_BATCHES TABLE (Includes pgvector Embedding for AI Semantic Search)
-- ==============================================================================
CREATE TABLE FOOD_BATCHES (
    batch_id SERIAL PRIMARY KEY,
    food_id INT NOT NULL,
    donator_id INT NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    available_quantity INT NOT NULL CHECK (available_quantity >= 0),
    donation_date DATE DEFAULT CURRENT_DATE,
    manufacturing_date DATE,
    expiry_date DATE NOT NULL,
    storage_condition VARCHAR(100),
    status VARCHAR(50) DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'PARTIALLY_CLAIMED', 'FULLY_CLAIMED', 'EXPIRED', 'DISCARDED')),
    embedding vector(384), -- 384-dimensional dense vector (all-MiniLM-L6-v2)
    CONSTRAINT fk_batches_food FOREIGN KEY (food_id) REFERENCES FOOD(food_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_batches_donator FOREIGN KEY (donator_id) REFERENCES FOOD_DONATORS(donator_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_batch_available_lte_total CHECK (available_quantity <= quantity),
    CONSTRAINT chk_batch_expiry_after_donation CHECK (expiry_date >= donation_date)
);

-- HNSW Vector Index for ultra-fast cosine similarity search
CREATE INDEX idx_food_batches_embedding ON FOOD_BATCHES USING hnsw (embedding vector_cosine_ops);

-- ==============================================================================
-- 7. CLAIMS TABLE
-- ==============================================================================
CREATE TABLE CLAIMS (
    claim_id SERIAL PRIMARY KEY,
    batch_id INT NOT NULL,
    food_bank_id INT NOT NULL,
    claim_date DATE DEFAULT CURRENT_DATE,
    quantity_claimed INT NOT NULL CHECK (quantity_claimed > 0),
    status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED', 'REJECTED')),
    approved_date DATE,
    pickup_required BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_claims_batch FOREIGN KEY (batch_id) REFERENCES FOOD_BATCHES(batch_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_claims_food_bank FOREIGN KEY (food_bank_id) REFERENCES FOOD_BANKS(food_bank_id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- ==============================================================================
-- 8. DELIVERIES TABLE
-- ==============================================================================
CREATE TABLE DELIVERIES (
    delivery_id SERIAL PRIMARY KEY,
    claim_id INT UNIQUE NOT NULL, -- 1:1 relationship with Claim
    transport_id INT,
    pickup_date DATE,
    pickup_time TIME,
    delivery_date DATE,
    delivery_time TIME,
    pickup_location TEXT,
    delivery_location TEXT,
    status VARCHAR(50) DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'CANCELLED')),
    CONSTRAINT fk_deliveries_claim FOREIGN KEY (claim_id) REFERENCES CLAIMS(claim_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_deliveries_transport FOREIGN KEY (transport_id) REFERENCES TRANSPORT(transport_id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- ==============================================================================
-- 9. ROUTINES TABLE
-- ==============================================================================
CREATE TABLE ROUTINES (
    routine_id SERIAL PRIMARY KEY,
    transport_id INT NOT NULL,
    scheduled_day VARCHAR(20) CHECK (scheduled_day IN ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY', 'DAILY')),
    scheduled_time TIME,
    frequency VARCHAR(50) DEFAULT 'WEEKLY',
    source_location TEXT,
    destination_location TEXT,
    status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAUSED', 'COMPLETED')),
    CONSTRAINT fk_routines_transport FOREIGN KEY (transport_id) REFERENCES TRANSPORT(transport_id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- ==============================================================================
-- 10. WASTE_AUDIT_RECORDS TABLE
-- ==============================================================================
CREATE TABLE WASTE_AUDIT_RECORDS (
    waste_id SERIAL PRIMARY KEY,
    batch_id INT NOT NULL,
    quantity_wasted INT NOT NULL CHECK (quantity_wasted > 0),
    waste_date DATE DEFAULT CURRENT_DATE,
    reason TEXT NOT NULL,
    disposal_method VARCHAR(100), -- 'COMPOST', 'BIOFUEL', 'LANDFILL', 'ANIMAL_FEED'
    remarks TEXT,
    CONSTRAINT fk_waste_batch FOREIGN KEY (batch_id) REFERENCES FOOD_BATCHES(batch_id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- ==============================================================================
-- 11. FEEDBACK TABLE
-- ==============================================================================
CREATE TABLE FEEDBACK (
    feedback_id SERIAL PRIMARY KEY,
    claim_id INT NOT NULL,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    comments TEXT,
    feedback_date DATE DEFAULT CURRENT_DATE,
    response TEXT,
    status VARCHAR(50) DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'ACKNOWLEDGED', 'RESOLVED')),
    CONSTRAINT fk_feedback_claim FOREIGN KEY (claim_id) REFERENCES CLAIMS(claim_id) ON DELETE CASCADE ON UPDATE CASCADE
);

-- ==============================================================================
-- 12. LOGS TABLE (Comprehensive Audit Trail for All Operations)
-- ==============================================================================
CREATE TABLE LOGS (
    log_id SERIAL PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    action_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    description TEXT,
    entity_type VARCHAR(50),
    entity_reference INT,
    old_status VARCHAR(50),
    new_status VARCHAR(50)
);

-- Create performance indexes for common lookups
CREATE INDEX idx_food_batches_status ON FOOD_BATCHES(status);
CREATE INDEX idx_food_batches_expiry ON FOOD_BATCHES(expiry_date);
CREATE INDEX idx_claims_status ON CLAIMS(status);
CREATE INDEX idx_deliveries_status ON DELIVERIES(status);
CREATE INDEX idx_logs_action_time ON LOGS(action_time DESC);
