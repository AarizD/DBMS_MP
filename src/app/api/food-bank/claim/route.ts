import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'FOOD_BANK' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden: Food Bank privileges required' }, { status: 403 });
    }

    const foodBankId = session.user.referenceId || 1; // Default to 1 if Admin
    const body = await req.json();
    const { batchId, quantity, pickupRequired } = body;

    const parsedBatchId = parseInt(batchId, 10);
    const parsedQty = parseInt(quantity, 10);

    if (isNaN(parsedBatchId) || isNaN(parsedQty) || parsedQty <= 0) {
      return NextResponse.json(
        { error: 'Valid batch ID and positive claim quantity are required' },
        { status: 400 }
      );
    }

    // Call Milestone 2 Stored Procedure with Pessimistic Locking
    const claimRes = await query(
      `SELECT * FROM fn_claim_food_batch($1, $2, $3, $4);`,
      [parsedBatchId, foodBankId, parsedQty, Boolean(pickupRequired)]
    );

    const result = claimRes.rows[0];

    if (!result.success) {
      return NextResponse.json(
        { error: result.message || 'Claim was rejected by database procedure' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      claimId: result.claim_id,
      remainingQuantity: result.remaining_quantity,
      batchStatus: result.batch_status,
      message: result.message,
    });
  } catch (err: any) {
    console.error('Error claiming food batch:', err);
    return NextResponse.json({ error: err?.message || 'Internal claim failure' }, { status: 500 });
  }
}

