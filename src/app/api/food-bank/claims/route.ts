import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized: Please log in' }, { status: 401 });
    }

    const { role, referenceId } = session.user;
    const foodBankId = referenceId || 1;

    let res;
    if (role === 'ADMIN') {
      res = await query(
        `SELECT 
          c.claim_id,
          c.quantity_claimed,
          c.claim_date,
          c.status,
          c.pickup_required,
          f.food_name,
          f.category,
          f.unit,
          d.name AS donator_name,
          fb.name AS food_bank_name
         FROM CLAIMS c
         JOIN FOOD_BATCHES b ON c.batch_id = b.batch_id
         JOIN FOOD f ON b.food_id = f.food_id
         JOIN FOOD_DONATORS d ON b.donator_id = d.donator_id
         JOIN FOOD_BANKS fb ON c.food_bank_id = fb.food_bank_id
         ORDER BY c.claim_id DESC`
      );
    } else {
      res = await query(
        `SELECT 
          c.claim_id,
          c.quantity_claimed,
          c.claim_date,
          c.status,
          c.pickup_required,
          f.food_name,
          f.category,
          f.unit,
          d.name AS donator_name,
          d.phone AS donator_phone,
          d.address AS pickup_address
         FROM CLAIMS c
         JOIN FOOD_BATCHES b ON c.batch_id = b.batch_id
         JOIN FOOD f ON b.food_id = f.food_id
         JOIN FOOD_DONATORS d ON b.donator_id = d.donator_id
         WHERE c.food_bank_id = $1
         ORDER BY c.claim_id DESC`,
        [foodBankId]
      );
    }

    return NextResponse.json(res.rows);
  } catch (err: any) {
    console.error('Error fetching claims history:', err);
    return NextResponse.json({ error: 'Failed to fetch claims' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized: Please log in' }, { status: 401 });
    }

    const body = await req.json();
    const { claimId, status } = body;

    const validStatuses = ['PENDING', 'APPROVED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const res = await query(
      `UPDATE CLAIMS 
       SET status = $1 
       WHERE claim_id = $2
       RETURNING *;`,
      [status, claimId]
    );

    if (res.rowCount === 0) {
      return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, claim: res.rows[0] });
  } catch (err: any) {
    console.error('Error updating claim status:', err);
    return NextResponse.json({ error: err?.message || 'Failed to update claim status' }, { status: 500 });
  }
}
