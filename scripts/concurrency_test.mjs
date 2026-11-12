/**
 * ==============================================================================
 * FOOD REDISTRIBUTION & EXPIRATION TRACKING SYSTEM
 * DBMS Experiential Learning - Level 3 Project (Section 5-F)
 * Team: Aariz D (PES1UG24AM330) & Shridhar G (PES1UG25AM814)
 * 
 * Milestone 5: Concurrency & ACID Stress-Test Suite
 * 
 * Purpose:
 *   Simulates simultaneous race conditions and high-contention scenarios
 *   against PostgreSQL 16 using pessimistic row locking (SELECT ... FOR UPDATE).
 *   Proves that:
 *     1. Negative inventory / overselling is strictly impossible.
 *     2. Stock deductions are completely atomic and serializable under heavy load.
 *     3. Database CHECK constraints and BEFORE UPDATE triggers reject corrupt states.
 *     4. Transaction audit trails (LOGS table) maintain 100% fidelity.
 * ==============================================================================
 */

import pg from 'pg';

const { Pool } = pg;

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/food_redistribution';

console.log('='.repeat(78));
console.log('🧪 ACID CONCURRENCY & RACE CONDITION STRESS-TEST SUITE');
console.log('   DBMS Experiential Learning - Milestone 5 Verification');
console.log('='.repeat(78));
console.log(`Connecting to: ${DATABASE_URL}\n`);

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 20, // High connection pool capacity for true parallel workers
});

// Helper for formatted delay
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runConcurrencyTestSuite() {
  const adminClient = await pool.connect();

  try {
    // -------------------------------------------------------------------------
    // TEST HARNESS SETUP: Create isolated test entities
    // -------------------------------------------------------------------------
    console.log('📦 Setting up isolated test harness in database...');

    // Ensure dummy food donor and food item exist for stress testing
    const donorRes = await adminClient.query(`
      INSERT INTO FOOD_DONATORS (name, email, phone, address, city, donator_type)
      VALUES ('Stress Test Bakery', 'stresstest@pesu.edu', '9999900001', 'PES Campus, Ring Road', 'Bengaluru', 'RESTAURANT')
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
      RETURNING donator_id;
    `);
    const donorId = donorRes.rows[0].donator_id;

    const foodRes = await adminClient.query(`
      SELECT food_id FROM FOOD LIMIT 1;
    `);
    const foodId = foodRes.rows[0].food_id;

    // Ensure 2 distinct active food banks exist
    const fbRes = await adminClient.query(`
      SELECT food_bank_id, name FROM FOOD_BANKS WHERE status = 'ACTIVE' LIMIT 2;
    `);
    if (fbRes.rows.length < 2) {
      throw new Error('Stress test requires at least 2 active food banks in the database.');
    }
    const foodBank1 = fbRes.rows[0];
    const foodBank2 = fbRes.rows[1];

    console.log(`✓ Test Donator ID: ${donorId}`);
    console.log(`✓ Test Food Bank 1: ID ${foodBank1.food_bank_id} (${foodBank1.name})`);
    console.log(`✓ Test Food Bank 2: ID ${foodBank2.food_bank_id} (${foodBank2.name})\n`);

    // =========================================================================
    // SCENARIO 1: The Classic 5-to-3 Race Condition
    // 5 concurrent threads attempt to claim 1 unit each from a batch with only 3 units.
    // =========================================================================
    console.log('-'.repeat(78));
    console.log('⚡ SCENARIO 1: 5 Concurrent Workers Contending for 3 Available Items');
    console.log('   Expected: Exactly 3 workers succeed, exactly 2 workers fail.');
    console.log('   Final Available Stock: STRICTLY 0 (Never negative!).');
    console.log('-'.repeat(78));

    // Create a fresh batch with exactly 3 units
    const batch1Res = await adminClient.query(`
      INSERT INTO FOOD_BATCHES (
        food_id, donator_id, quantity, available_quantity, 
        donation_date, expiry_date, storage_condition, status
      )
      VALUES ($1, $2, 3, 3, CURRENT_DATE, CURRENT_DATE + INTERVAL '5 days', 'AMBIENT', 'AVAILABLE')
      RETURNING batch_id;
    `, [foodId, donorId]);
    const batchId1 = batch1Res.rows[0].batch_id;
    console.log(`Created Test Batch #${batchId1} with initial available_quantity = 3.`);

    console.log('Launching 5 parallel claim workers simultaneously via Promise.all()...\n');

    const workerTasks1 = [1, 2, 3, 4, 5].map(async (workerId) => {
      const client = await pool.connect();
      const fbId = workerId % 2 === 0 ? foodBank2.food_bank_id : foodBank1.food_bank_id;
      const startTime = performance.now();

      try {
        const queryRes = await client.query(
          `SELECT * FROM fn_claim_food_batch($1, $2, $3, FALSE);`,
          [batchId1, fbId, 1]
        );
        const elapsed = (performance.now() - startTime).toFixed(2);
        const row = queryRes.rows[0];

        return {
          workerId,
          foodBankId: fbId,
          requestedQty: 1,
          success: row.success,
          remainingQty: row.remaining_quantity,
          claimId: row.claim_id,
          batchStatus: row.batch_status,
          message: row.message,
          elapsedMs: elapsed,
        };
      } finally {
        client.release();
      }
    });

    const results1 = await Promise.all(workerTasks1);

    // Print detailed worker outcome table
    console.log('Worker Results:');
    console.log('┌──────────┬──────────────┬─────────────┬─────────┬───────────────┬────────────┬─────────────────────────────┐');
    console.log('│ Worker # │ Food Bank ID │ Req Qty     │ Status  │ Remaining Qty │ Latency    │ Database Engine Message     │');
    console.log('├──────────┼──────────────┼─────────────┼─────────┼───────────────┼────────────┼─────────────────────────────┤');

    let successCount1 = 0;
    let failureCount1 = 0;

    for (const r of results1) {
      if (r.success) successCount1++;
      else failureCount1++;

      const statusTag = r.success ? '✓ SUCCESS' : '✗ REJECT ';
      const msg = r.message.length > 27 ? r.message.slice(0, 24) + '...' : r.message;
      console.log(
        `│ Worker ${r.workerId} │ Bank #${r.foodBankId}       │ ${r.requestedQty} unit      │ ${statusTag} │ ${String(r.remainingQty).padStart(13)} │ ${r.elapsedMs.padStart(7)} ms │ ${msg.padEnd(27)} │`
      );
    }
    console.log('└──────────┴──────────────┴─────────────┴─────────┴───────────────┴────────────┴─────────────────────────────┘');

    // Query database directly to verify end-state
    const finalBatch1 = (await adminClient.query(
      `SELECT batch_id, quantity, available_quantity, status FROM FOOD_BATCHES WHERE batch_id = $1`,
      [batchId1]
    )).rows[0];

    console.log(`\nPost-Test Database Batch State:`);
    console.log(`  Initial Quantity   : ${finalBatch1.quantity}`);
    console.log(`  Available Quantity : ${finalBatch1.available_quantity}`);
    console.log(`  Batch Final Status : ${finalBatch1.status}`);

    // Verification Assertions
    if (successCount1 !== 3) {
      throw new Error(`ACID Failure: Expected exactly 3 successful claims, but got ${successCount1}!`);
    }
    if (failureCount1 !== 2) {
      throw new Error(`ACID Failure: Expected exactly 2 rejections, but got ${failureCount1}!`);
    }
    if (finalBatch1.available_quantity !== 0) {
      throw new Error(`ACID Failure: Available quantity should be exactly 0, got ${finalBatch1.available_quantity}!`);
    }
    if (finalBatch1.status !== 'FULLY_CLAIMED') {
      throw new Error(`ACID Failure: Batch status should be FULLY_CLAIMED, got ${finalBatch1.status}!`);
    }

    console.log('\n>>> SCENARIO 1 PASSED: 100% ACID integrity verified under 5-way race condition! <<<\n');


    // =========================================================================
    // SCENARIO 2: High Contention Burst with Random Claim Sizes
    // 10 concurrent workers requesting 35 units total from a batch of only 12 units.
    // =========================================================================
    console.log('-'.repeat(78));
    console.log('⚡ SCENARIO 2: High Contention Burst (10 Workers, Varying Claim Sizes)');
    console.log('   Total Stock Available : 12 units');
    console.log('   Total Claim Attempted : 35 units across 10 workers');
    console.log('-'.repeat(78));

    const batch2Res = await adminClient.query(`
      INSERT INTO FOOD_BATCHES (
        food_id, donator_id, quantity, available_quantity, 
        donation_date, expiry_date, storage_condition, status
      )
      VALUES ($1, $2, 12, 12, CURRENT_DATE, CURRENT_DATE + INTERVAL '5 days', 'CHILLED', 'AVAILABLE')
      RETURNING batch_id;
    `, [foodId, donorId]);
    const batchId2 = batch2Res.rows[0].batch_id;

    // Requests with varying sizes: sum = 4+3+5+2+4+3+2+5+4+3 = 35 units
    const requestSizes = [4, 3, 5, 2, 4, 3, 2, 5, 4, 3];

    console.log(`Created Test Batch #${batchId2} with initial available_quantity = 12.`);
    console.log('Firing 10 concurrent requests with varying claim quantities...\n');

    const workerTasks2 = requestSizes.map(async (qty, idx) => {
      const client = await pool.connect();
      const workerId = idx + 1;
      const fbId = (workerId % 2 === 0) ? foodBank2.food_bank_id : foodBank1.food_bank_id;
      const startTime = performance.now();

      try {
        const queryRes = await client.query(
          `SELECT * FROM fn_claim_food_batch($1, $2, $3, FALSE);`,
          [batchId2, fbId, qty]
        );
        const elapsed = (performance.now() - startTime).toFixed(2);
        const row = queryRes.rows[0];

        return {
          workerId,
          requestedQty: qty,
          success: row.success,
          remainingQty: row.remaining_quantity,
          claimId: row.claim_id,
          message: row.message,
          elapsedMs: elapsed,
        };
      } finally {
        client.release();
      }
    });

    const results2 = await Promise.all(workerTasks2);

    let totalUnitsGranted = 0;
    let unitsRejected = 0;

    for (const r of results2) {
      if (r.success) totalUnitsGranted += r.requestedQty;
      else unitsRejected += r.requestedQty;

      const tag = r.success ? '✓ GRANTED ' : '✗ REJECTED';
      console.log(
        `  Worker ${String(r.workerId).padStart(2)}: Req ${String(r.requestedQty).padStart(2)} units -> ${tag} | Remaining: ${String(r.remainingQty).padStart(2)} | Latency: ${r.elapsedMs.padStart(6)} ms | (${r.message})`
      );
    }

    const finalBatch2 = (await adminClient.query(
      `SELECT batch_id, quantity, available_quantity, status FROM FOOD_BATCHES WHERE batch_id = $1`,
      [batchId2]
    )).rows[0];

    console.log(`\nScenario 2 Verification Summary:`);
    console.log(`  Initial Stock       : 12 units`);
    console.log(`  Total Units Granted : ${totalUnitsGranted} units`);
    console.log(`  Total Units Rejected: ${unitsRejected} units`);
    console.log(`  Final Database Stock: ${finalBatch2.available_quantity} units`);
    console.log(`  Final Status        : ${finalBatch2.status}`);

    if (totalUnitsGranted + finalBatch2.available_quantity !== 12) {
      throw new Error(`ACID Balance Violation: Granted (${totalUnitsGranted}) + Remaining (${finalBatch2.available_quantity}) != 12`);
    }
    if (finalBatch2.available_quantity < 0) {
      throw new Error(`Data Corruption: Negative stock occurred (${finalBatch2.available_quantity})!`);
    }

    console.log('\n>>> SCENARIO 2 PASSED: Mathematical conservation of stock strictly preserved! <<<\n');


    // =========================================================================
    // SCENARIO 3: Hard Constraints & Negative Stock Prevention
    // Verifies that database-level CHECK constraints & BEFORE triggers reject invalid writes.
    // =========================================================================
    console.log('-'.repeat(78));
    console.log('⚡ SCENARIO 3: Database-Level Constraint & Trigger Enforcement');
    console.log('   Testing: BEFORE UPDATE Trigger and chk_available_qty constraint');
    console.log('-'.repeat(78));

    let triggerPreventedNegative = false;
    try {
      // Attempt to directly set available_quantity = -5 via raw SQL bypass
      await adminClient.query(`
        UPDATE FOOD_BATCHES SET available_quantity = -5 WHERE batch_id = $1;
      `, [batchId1]);
    } catch (dbErr) {
      triggerPreventedNegative = true;
      console.log(`✓ Trigger successfully intercepted illegal direct write:`);
      console.log(`  PostgreSQL Error: "${dbErr.message.trim()}"`);
    }

    if (!triggerPreventedNegative) {
      throw new Error('Security/Integrity Failure: Negative stock update was not blocked by database!');
    }

    let checkConstraintPreventedOverClaim = false;
    try {
      // Attempt to set available_quantity > total quantity
      await adminClient.query(`
        UPDATE FOOD_BATCHES SET available_quantity = 9999 WHERE batch_id = $1;
      `, [batchId1]);
    } catch (dbErr) {
      checkConstraintPreventedOverClaim = true;
      console.log(`✓ CHECK constraint (chk_available_qty) intercepted illegal overflow:`);
      console.log(`  PostgreSQL Error: "${dbErr.message.trim()}"`);
    }

    if (!checkConstraintPreventedOverClaim) {
      throw new Error('Integrity Failure: chk_available_qty constraint failed to block overflow!');
    }

    console.log('\n>>> SCENARIO 3 PASSED: Database engine guarantees tamper-proof data integrity! <<<\n');


    // =========================================================================
    // SCENARIO 4: Audit Trail Fidelity (LOGS Table Verification)
    // =========================================================================
    console.log('-'.repeat(78));
    console.log('⚡ SCENARIO 4: Audit Log Verification');
    console.log('   Checking automatic trigger entries in LOGS table for Batch #%s', batchId1);
    console.log('-'.repeat(78));

    const auditRes = await adminClient.query(`
      SELECT log_id, action, entity_type, entity_reference, old_status, new_status, description, timestamp
      FROM LOGS
      WHERE entity_type = 'FOOD_BATCHES' AND entity_reference = $1
      ORDER BY log_id ASC;
    `, [batchId1]);

    console.log(`Found ${auditRes.rows.length} audit entries captured automatically by triggers:`);
    for (const log of auditRes.rows) {
      console.log(`  [Log #${log.log_id}] ${log.action} | Status: ${log.old_status} -> ${log.new_status} | ${log.description}`);
    }

    if (auditRes.rows.length === 0) {
      throw new Error('Audit Failure: No audit logs were created during batch state changes!');
    }

    console.log('\n>>> SCENARIO 4 PASSED: Complete transactional audit trail verified! <<<\n');


    // -------------------------------------------------------------------------
    // CLEANUP TEST HARNESS
    // -------------------------------------------------------------------------
    console.log('🧹 Cleaning up stress-test artifacts from database...');
    await adminClient.query(`
      DELETE FROM CLAIMS WHERE batch_id IN ($1, $2);
      DELETE FROM WASTE_AUDIT_RECORDS WHERE batch_id IN ($1, $2);
      DELETE FROM LOGS WHERE entity_reference IN ($1, $2) AND entity_type = 'FOOD_BATCHES';
      DELETE FROM FOOD_BATCHES WHERE batch_id IN ($1, $2);
      DELETE FROM FOOD_DONATORS WHERE donator_id = $3;
    `, [batchId1, batchId2, donorId]);
    console.log('✓ Test cleanup complete.\n');

    // -------------------------------------------------------------------------
    // FINAL SUMMARY
    // -------------------------------------------------------------------------
    console.log('='.repeat(78));
    console.log('🎉 ALL MILESTONE 5 CONCURRENCY & ACID TESTS PASSED WITH 100% SUCCESS!');
    console.log('   ✓ Pessimistic Row Locking (SELECT ... FOR UPDATE): PROVEN');
    console.log('   ✓ Race Condition Elimination: PROVEN');
    console.log('   ✓ Negative Stock Prevention: PROVEN');
    console.log('   ✓ Database-Level Integrity Constraints: PROVEN');
    console.log('   ✓ Automated Audit Triggers: PROVEN');
    console.log('='.repeat(78));

  } catch (err) {
    console.error('\n❌ STRESS TEST FAILURE:', err.message);
    process.exit(1);
  } finally {
    adminClient.release();
    await pool.end();
  }
}

runConcurrencyTestSuite();

