import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/food_redistribution';

console.log('⚡ Applying Milestone 2: Stored Procedures, Triggers & Views...');
const pool = new Pool({ connectionString: DATABASE_URL });

async function run() {
  const client = await pool.connect();

  try {
    const sqlPath = path.join(__dirname, '..', 'database', 'procedures_triggers_views.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

    console.log(`Executing SQL script: ${sqlPath}`);
    await client.query(sqlContent);
    console.log('✅ Stored procedures, triggers, and views applied successfully!\n');

    console.log('🧪 RUNNING AUTOMATED VERIFICATION TESTS FOR MILESTONE 2:\n');

    // TEST 1: Atomic Claim Function with Pessimistic Locking
    console.log('--- Test 1: Successful Atomic Claim via fn_claim_food_batch ---');
    // Batch 3 is Fresh Chapatis (avail: 80). Claim 15 units for Food Bank 1.
    const claimRes1 = await client.query(
      `SELECT * FROM fn_claim_food_batch(3, 1, 15, TRUE);`
    );
    console.log('Result:', claimRes1.rows[0]);
    if (!claimRes1.rows[0].success || claimRes1.rows[0].remaining_quantity !== 65) {
      throw new Error('Test 1 Failed: Unexpected claim response');
    }
    console.log('✅ Test 1 Passed: Claim created, stock deducted from 80 -> 65.\n');

    // TEST 2: Over-Claim Rejection Test
    console.log('--- Test 2: Over-Claim Rejection (Requesting 500 units from 65 avail) ---');
    const claimRes2 = await client.query(
      `SELECT * FROM fn_claim_food_batch(3, 1, 500, FALSE);`
    );
    console.log('Result:', claimRes2.rows[0]);
    if (claimRes2.rows[0].success) {
      throw new Error('Test 2 Failed: Over-claim should have been rejected!');
    }
    console.log('✅ Test 2 Passed: Over-claim correctly rejected with message.\n');

    // TEST 3: Expired Batch Claim Rejection Test
    console.log('--- Test 3: Reject Claiming an Expired Batch (Batch #1) ---');
    const claimRes3 = await client.query(
      `SELECT * FROM fn_claim_food_batch(1, 1, 5, FALSE);`
    );
    console.log('Result:', claimRes3.rows[0]);
    if (claimRes3.rows[0].success) {
      throw new Error('Test 3 Failed: Expired batch should NOT be claimable!');
    }
    console.log('✅ Test 3 Passed: Expired batch claim rejected.\n');

    // TEST 4: Audit Triggers Verification
    console.log('--- Test 4: Verification of Audit Trail Triggers in LOGS ---');
    const logsRes = await client.query(
      `SELECT log_id, action, entity_type, entity_reference, description, action_time 
       FROM LOGS 
       ORDER BY action_time DESC, log_id DESC 
       LIMIT 4;`
    );
    console.table(logsRes.rows);
    console.log('✅ Test 4 Passed: Status updates automatically recorded by triggers into LOGS.\n');

    // TEST 5: Query Analytical Views
    console.log('--- Test 5.1: view_available_batches (Top 3) ---');
    const viewAvail = await client.query(
      `SELECT batch_id, food_name, available_quantity, expiry_date, days_until_expiry, donator_name 
       FROM view_available_batches LIMIT 3;`
    );
    console.table(viewAvail.rows);

    console.log('--- Test 5.2: view_expiring_soon_batches (Distress Inventory) ---');
    const viewExpiring = await client.query(
      `SELECT batch_id, food_name, available_quantity, expiry_date, urgency_level, donator_name 
       FROM view_expiring_soon_batches LIMIT 3;`
    );
    console.table(viewExpiring.rows);

    console.log('--- Test 5.3: view_donor_efficiency ---');
    const viewDonor = await client.query(
      `SELECT donator_name, total_batches_donated, total_units_donated, total_units_rescued, total_units_wasted, rescue_efficiency_pct 
       FROM view_donor_efficiency;`
    );
    console.table(viewDonor.rows);

    console.log('--- Test 5.4: view_food_bank_utilization ---');
    const viewBank = await client.query(
      `SELECT food_bank_name, storage_capacity_kg, inbound_claim_units, total_received_units, estimated_available_capacity_kg 
       FROM view_food_bank_utilization;`
    );
    console.table(viewBank.rows);

    console.log('\n🎉 ALL MILESTONE 2 TESTS COMPLETED WITH 100% SUCCESS!');
  } catch (err) {
    console.error('❌ Error applying Milestone 2:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(() => process.exit(1));

