import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    // Allow ADMIN or unauthenticated demo evaluation
    const adminClient = await pool.connect();

    try {
      // 1. Get test items
      const donorRes = await adminClient.query(`
        INSERT INTO FOOD_DONATORS (name, email, phone, address, city, donator_type)
        VALUES ('Interactive Stress Test Bakery', 'interactive-stress@pesu.edu', '9999900002', 'PES Campus, Ring Road', 'Bengaluru', 'RESTAURANT')
        ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
        RETURNING donator_id;
      `);
      const donorId = donorRes.rows[0].donator_id;

      const foodRes = await adminClient.query(`SELECT food_id FROM FOOD LIMIT 1;`);
      const foodId = foodRes.rows[0].food_id;

      const fbRes = await adminClient.query(`
        SELECT food_bank_id, name FROM FOOD_BANKS WHERE status = 'ACTIVE' LIMIT 2;
      `);
      if (fbRes.rows.length < 2) {
        return NextResponse.json({ error: 'Need at least 2 active food banks' }, { status: 400 });
      }
      const fb1 = fbRes.rows[0];
      const fb2 = fbRes.rows[1];

      // Create test batch with 3 units
      const batchRes = await adminClient.query(`
        INSERT INTO FOOD_BATCHES (
          food_id, donator_id, quantity, available_quantity, 
          donation_date, expiry_date, storage_condition, status
        )
        VALUES ($1, $2, 3, 3, CURRENT_DATE, CURRENT_DATE + INTERVAL '5 days', 'AMBIENT', 'AVAILABLE')
        RETURNING batch_id;
      `, [foodId, donorId]);
      const batchId = batchRes.rows[0].batch_id;

      // Launch 5 simultaneous requests
      const workerTasks = [1, 2, 3, 4, 5].map(async (workerId) => {
        const client = await pool.connect();
        const fbId = workerId % 2 === 0 ? fb2.food_bank_id : fb1.food_bank_id;
        const fbName = workerId % 2 === 0 ? fb2.name : fb1.name;
        const startTime = performance.now();

        try {
          const res = await client.query(
            `SELECT * FROM fn_claim_food_batch($1, $2, $3, FALSE);`,
            [batchId, fbId, 1]
          );
          const elapsed = (performance.now() - startTime).toFixed(2);
          const row = res.rows[0];
          return {
            workerId,
            foodBankId: fbId,
            foodBankName: fbName,
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

      const workerResults = await Promise.all(workerTasks);

      // Verify post-test state
      const finalBatch = (await adminClient.query(
        `SELECT batch_id, quantity, available_quantity, status FROM FOOD_BATCHES WHERE batch_id = $1`,
        [batchId]
      )).rows[0];

      // Cleanup
      await adminClient.query(`
        DELETE FROM CLAIMS WHERE batch_id = $1;
        DELETE FROM LOGS WHERE entity_reference = $1 AND entity_type = 'FOOD_BATCHES';
        DELETE FROM FOOD_BATCHES WHERE batch_id = $1;
        DELETE FROM FOOD_DONATORS WHERE donator_id = $2;
      `, [batchId, donorId]);

      const successCount = workerResults.filter((r) => r.success).length;
      const failureCount = workerResults.filter((r) => !r.success).length;

      return NextResponse.json({
        success: true,
        summary: {
          testName: '5 Concurrent Claims against 3 Available Items',
          initialStock: 3,
          finalStock: finalBatch.available_quantity,
          finalStatus: finalBatch.status,
          successCount,
          failureCount,
          negativeStockPrevented: finalBatch.available_quantity >= 0,
          acidComplianceVerified: successCount === 3 && failureCount === 2 && finalBatch.available_quantity === 0,
        },
        workers: workerResults,
      });
    } finally {
      adminClient.release();
    }
  } catch (err: any) {
    console.error('Error in concurrency test API:', err);
    return NextResponse.json({ error: err.message || 'Concurrency test failed' }, { status: 500 });
  }
}
