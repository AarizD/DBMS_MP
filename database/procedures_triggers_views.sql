-- ==============================================================================
-- FOOD REDISTRIBUTION & EXPIRATION TRACKING
-- DBMS Level 3 Experiential Learning Project
-- Milestone 2: Stored Procedures, Triggers & Analytical Views
-- Database: PostgreSQL 16
-- ==============================================================================

-- ==============================================================================
-- SECTION 1: AUDIT TRAIL TRIGGERS
-- ==============================================================================

-- 1.1 Trigger Function: Log Batch Status & Inventory Transitions
CREATE OR REPLACE FUNCTION fn_trg_log_batch_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) OR (OLD.available_quantity IS DISTINCT FROM NEW.available_quantity) THEN
        INSERT INTO LOGS (action, description, entity_type, entity_reference, old_status, new_status)
        VALUES (
            'BATCH_UPDATE',
            FORMAT('Batch #%s stock changed from %s to %s (Status: %s -> %s)', 
                   NEW.batch_id, OLD.available_quantity, NEW.available_quantity, OLD.status, NEW.status),
            'FOOD_BATCHES',
            NEW.batch_id,
            OLD.status,
            NEW.status
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_batch_status_change ON FOOD_BATCHES;
CREATE TRIGGER trg_log_batch_status_change
AFTER UPDATE ON FOOD_BATCHES
FOR EACH ROW
EXECUTE FUNCTION fn_trg_log_batch_status_change();


-- 1.2 Trigger Function: Log Claim Status Transitions
CREATE OR REPLACE FUNCTION fn_trg_log_claim_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO LOGS (action, description, entity_type, entity_reference, old_status, new_status)
        VALUES (
            'CLAIM_STATUS_UPDATE',
            FORMAT('Claim #%s status transitioned from %s to %s', NEW.claim_id, OLD.status, NEW.status),
            'CLAIMS',
            NEW.claim_id,
            OLD.status,
            NEW.status
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_claim_status_change ON CLAIMS;
CREATE TRIGGER trg_log_claim_status_change
AFTER UPDATE ON CLAIMS
FOR EACH ROW
EXECUTE FUNCTION fn_trg_log_claim_status_change();


-- 1.3 Trigger: Prevent Negative Available Quantity
CREATE OR REPLACE FUNCTION fn_trg_prevent_negative_inventory()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.available_quantity < 0 THEN
        RAISE EXCEPTION 'Data Integrity Violation: available_quantity cannot be negative (Attempted: %)', NEW.available_quantity;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_negative_inventory ON FOOD_BATCHES;
CREATE TRIGGER trg_prevent_negative_inventory
BEFORE INSERT OR UPDATE ON FOOD_BATCHES
FOR EACH ROW
EXECUTE FUNCTION fn_trg_prevent_negative_inventory();


-- ==============================================================================
-- SECTION 2: CONCURRENCY CONTROL & STORED PROCEDURES
-- ==============================================================================

-- 2.1 Atomic Claim Procedure with Pessimistic Locking (SELECT ... FOR UPDATE)
-- Prevents race conditions when multiple food banks attempt to claim the same batch
CREATE OR REPLACE FUNCTION fn_claim_food_batch(
    p_batch_id INT,
    p_food_bank_id INT,
    p_quantity INT,
    p_pickup_required BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    success BOOLEAN,
    claim_id INT,
    remaining_quantity INT,
    batch_status VARCHAR,
    message VARCHAR
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_batch RECORD;
    v_food_bank_exists BOOLEAN;
    v_claim_id INT;
    v_new_avail INT;
    v_new_status VARCHAR;
BEGIN
    -- Validation 1: Quantity must be positive
    IF p_quantity <= 0 THEN
        RETURN QUERY SELECT FALSE, NULL::INT, 0, NULL::VARCHAR, 'Claim quantity must be greater than zero'::VARCHAR;
        RETURN;
    END IF;

    -- Validation 2: Food Bank must exist and be active
    SELECT EXISTS (SELECT 1 FROM FOOD_BANKS WHERE food_bank_id = p_food_bank_id AND status = 'ACTIVE') INTO v_food_bank_exists;
    IF NOT v_food_bank_exists THEN
        RETURN QUERY SELECT FALSE, NULL::INT, 0, NULL::VARCHAR, 'Food bank not found or is not active'::VARCHAR;
        RETURN;
    END IF;

    -- Validation 3: Acquire pessimistic row lock (SELECT ... FOR UPDATE)
    -- Any concurrent transaction attempting to claim this same batch will block until this transaction completes
    SELECT batch_id, available_quantity, expiry_date, status 
    INTO v_batch
    FROM FOOD_BATCHES
    WHERE batch_id = p_batch_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::INT, 0, NULL::VARCHAR, 'Batch not found'::VARCHAR;
        RETURN;
    END IF;

    -- Validation 4: Check expiration date
    IF v_batch.expiry_date < CURRENT_DATE THEN
        RETURN QUERY SELECT FALSE, NULL::INT, v_batch.available_quantity, v_batch.status, 'Cannot claim expired batch'::VARCHAR;
        RETURN;
    END IF;

    -- Validation 5: Check availability status
    IF v_batch.status NOT IN ('AVAILABLE', 'PARTIALLY_CLAIMED') OR v_batch.available_quantity <= 0 THEN
        RETURN QUERY SELECT FALSE, NULL::INT, v_batch.available_quantity, v_batch.status, 'Batch is no longer available for claiming'::VARCHAR;
        RETURN;
    END IF;

    -- Validation 6: Check sufficient remaining stock
    IF v_batch.available_quantity < p_quantity THEN
        RETURN QUERY SELECT FALSE, NULL::INT, v_batch.available_quantity, v_batch.status, 
            FORMAT('Insufficient stock: %s available, %s requested', v_batch.available_quantity, p_quantity)::VARCHAR;
        RETURN;
    END IF;

    -- Deduct stock atomically and determine new batch status
    v_new_avail := v_batch.available_quantity - p_quantity;
    IF v_new_avail = 0 THEN
        v_new_status := 'FULLY_CLAIMED';
    ELSE
        v_new_status := 'PARTIALLY_CLAIMED';
    END IF;

    UPDATE FOOD_BATCHES
    SET available_quantity = v_new_avail,
        status = v_new_status
    WHERE batch_id = p_batch_id;

    -- Insert new claim record
    INSERT INTO CLAIMS (batch_id, food_bank_id, claim_date, quantity_claimed, status, pickup_required)
    VALUES (p_batch_id, p_food_bank_id, CURRENT_DATE, p_quantity, 'PENDING', p_pickup_required)
    RETURNING CLAIMS.claim_id INTO v_claim_id;

    -- Return success response
    RETURN QUERY SELECT TRUE, v_claim_id, v_new_avail, v_new_status, 'Claim placed successfully'::VARCHAR;
END;
$$;


-- 2.2 Automated Expiration Sweeper & Waste Auditor
-- Automatically detects expired batches, transfers remaining stock to WASTE_AUDIT_RECORDS,
-- and updates status to 'EXPIRED'
CREATE OR REPLACE FUNCTION fn_process_expired_batches()
RETURNS TABLE (
    batches_expired_count INT,
    total_quantity_wasted INT
)
LANGUAGE plpgsql
AS $$
DECLARE
    r RECORD;
    v_batches_count INT := 0;
    v_total_units INT := 0;
BEGIN
    FOR r IN 
        SELECT batch_id, available_quantity, expiry_date 
        FROM FOOD_BATCHES 
        WHERE expiry_date < CURRENT_DATE 
          AND status != 'EXPIRED' 
          AND available_quantity > 0
        FOR UPDATE
    LOOP
        -- Insert into WASTE_AUDIT_RECORDS
        INSERT INTO WASTE_AUDIT_RECORDS (batch_id, quantity_wasted, waste_date, reason, disposal_method, remarks)
        VALUES (
            r.batch_id,
            r.available_quantity,
            CURRENT_DATE,
            FORMAT('Automated Daily Sweeper: Expired on %s prior to claim', r.expiry_date),
            'COMPOST',
            'Transferred automatically by fn_process_expired_batches'
        );

        -- Mark batch as EXPIRED with zero available quantity
        UPDATE FOOD_BATCHES 
        SET status = 'EXPIRED',
            available_quantity = 0
        WHERE batch_id = r.batch_id;

        -- Log event
        INSERT INTO LOGS (action, description, entity_type, entity_reference, old_status, new_status)
        VALUES (
            'AUTO_WASTE_AUDIT',
            FORMAT('Batch #%s expired with %s units remaining; transferred to waste audit', r.batch_id, r.available_quantity),
            'FOOD_BATCHES',
            r.batch_id,
            'AVAILABLE',
            'EXPIRED'
        );

        v_batches_count := v_batches_count + 1;
        v_total_units := v_total_units + r.available_quantity;
    END LOOP;

    RETURN QUERY SELECT v_batches_count, v_total_units;
END;
$$;


-- ==============================================================================
-- SECTION 3: ANALYTICAL SQL VIEWS
-- ==============================================================================

-- 3.1 View: Live Available Food Inventory (Ready for Claiming)
CREATE OR REPLACE VIEW view_available_batches AS
SELECT 
    fb.batch_id,
    f.food_id,
    f.food_name,
    f.category,
    f.unit,
    f.storage_requirement,
    fb.quantity AS original_quantity,
    fb.available_quantity,
    fb.donation_date,
    fb.expiry_date,
    (fb.expiry_date - CURRENT_DATE) AS days_until_expiry,
    fb.storage_condition,
    fb.status,
    d.donator_id,
    d.name AS donator_name,
    d.organization_name AS donator_org,
    d.city AS donator_city,
    d.phone AS donator_phone
FROM FOOD_BATCHES fb
JOIN FOOD f ON fb.food_id = f.food_id
JOIN FOOD_DONATORS d ON fb.donator_id = d.donator_id
WHERE fb.status IN ('AVAILABLE', 'PARTIALLY_CLAIMED')
  AND fb.available_quantity > 0
  AND fb.expiry_date >= CURRENT_DATE
ORDER BY fb.expiry_date ASC, fb.available_quantity DESC;


-- 3.2 View: Urgent Distress Batches (Expiring in <= 48 Hours)
CREATE OR REPLACE VIEW view_expiring_soon_batches AS
SELECT 
    fb.batch_id,
    f.food_name,
    f.category,
    f.unit,
    fb.available_quantity,
    fb.expiry_date,
    (fb.expiry_date - CURRENT_DATE) AS days_until_expiry,
    CASE 
        WHEN (fb.expiry_date - CURRENT_DATE) = 0 THEN 'CRITICAL - EXPIRES TODAY'
        WHEN (fb.expiry_date - CURRENT_DATE) = 1 THEN 'HIGH PRIORITY - EXPIRES TOMORROW'
        ELSE 'URGENT - 2 DAYS REMAINING'
    END AS urgency_level,
    d.name AS donator_name,
    d.phone AS donator_phone,
    d.address AS pickup_address
FROM FOOD_BATCHES fb
JOIN FOOD f ON fb.food_id = f.food_id
JOIN FOOD_DONATORS d ON fb.donator_id = d.donator_id
WHERE fb.status IN ('AVAILABLE', 'PARTIALLY_CLAIMED')
  AND fb.available_quantity > 0
  AND fb.expiry_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '2 days')
ORDER BY fb.expiry_date ASC;


-- 3.3 View: Donor Rescue & Waste Efficiency Analytics
-- Computes total food rescued vs wasted per donor using nested subqueries & aggregations
CREATE OR REPLACE VIEW view_donor_efficiency AS
SELECT 
    d.donator_id,
    d.name AS donator_name,
    d.donator_type,
    d.city,
    COUNT(DISTINCT fb.batch_id) AS total_batches_donated,
    COALESCE(SUM(fb.quantity), 0) AS total_units_donated,
    -- Rescued: Delivered claim quantities
    COALESCE(
        (SELECT SUM(c.quantity_claimed) 
         FROM CLAIMS c 
         JOIN FOOD_BATCHES b2 ON c.batch_id = b2.batch_id 
         WHERE b2.donator_id = d.donator_id AND c.status = 'DELIVERED'), 
        0
    ) AS total_units_rescued,
    -- Wasted: Total recorded waste
    COALESCE(
        (SELECT SUM(w.quantity_wasted) 
         FROM WASTE_AUDIT_RECORDS w 
         JOIN FOOD_BATCHES b3 ON w.batch_id = b3.batch_id 
         WHERE b3.donator_id = d.donator_id), 
        0
    ) AS total_units_wasted,
    -- Efficiency percentage
    ROUND(
        COALESCE(
            (SELECT SUM(c.quantity_claimed) 
             FROM CLAIMS c 
             JOIN FOOD_BATCHES b2 ON c.batch_id = b2.batch_id 
             WHERE b2.donator_id = d.donator_id AND c.status = 'DELIVERED') * 100.0 / 
            NULLIF(SUM(fb.quantity), 0),
            0.0
        ), 
        1
    ) AS rescue_efficiency_pct
FROM FOOD_DONATORS d
LEFT JOIN FOOD_BATCHES fb ON d.donator_id = fb.donator_id
GROUP BY d.donator_id, d.name, d.donator_type, d.city
ORDER BY total_units_rescued DESC;


-- 3.4 View: Food Bank Capacity & Inbound Queue
-- Uses correlated subqueries to monitor storage saturation and incoming logistics
CREATE OR REPLACE VIEW view_food_bank_utilization AS
SELECT 
    fb.food_bank_id,
    fb.name AS food_bank_name,
    fb.city,
    fb.storage_capacity_kg,
    -- Pending inbound claims
    COALESCE(
        (SELECT SUM(c.quantity_claimed) 
         FROM CLAIMS c 
         WHERE c.food_bank_id = fb.food_bank_id AND c.status IN ('PENDING', 'APPROVED', 'IN_TRANSIT')), 
        0
    ) AS inbound_claim_units,
    -- Total successfully received claims
    COALESCE(
        (SELECT SUM(c.quantity_claimed) 
         FROM CLAIMS c 
         WHERE c.food_bank_id = fb.food_bank_id AND c.status = 'DELIVERED'), 
        0
    ) AS total_received_units,
    -- Remaining capacity estimation
    GREATEST(
        fb.storage_capacity_kg - COALESCE(
            (SELECT SUM(c.quantity_claimed) 
             FROM CLAIMS c 
             WHERE c.food_bank_id = fb.food_bank_id AND c.status IN ('APPROVED', 'IN_TRANSIT')), 
            0
        ), 
        0
    ) AS estimated_available_capacity_kg
FROM FOOD_BANKS fb
WHERE fb.status = 'ACTIVE'
ORDER BY fb.storage_capacity_kg DESC;

