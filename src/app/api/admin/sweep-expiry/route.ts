import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin privileges required' }, { status: 403 });
    }

    // Call Milestone 2 Stored Procedure
    const res = await query(`SELECT * FROM fn_process_expired_batches();`);
    const { batches_expired_count, total_quantity_wasted } = res.rows[0];

    return NextResponse.json({
      message: 'Daily expiration sweeper executed successfully',
      batchesExpiredCount: Number(batches_expired_count),
      totalQuantityWasted: Number(total_quantity_wasted),
    });
  } catch (err: any) {
    console.error('Error running expiry sweeper:', err);
    return NextResponse.json({ error: err?.message || 'Failed to sweep expired batches' }, { status: 500 });
  }
}

