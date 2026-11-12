import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin privileges required' }, { status: 403 });
    }

    const [donorEffRes, bankUtilRes, logsRes, countsRes] = await Promise.all([
      query(`SELECT * FROM view_donor_efficiency`),
      query(`SELECT * FROM view_food_bank_utilization`),
      query(`SELECT * FROM LOGS ORDER BY action_time DESC LIMIT 15`),
      query(`
        SELECT 
          (SELECT COUNT(*) FROM FOOD_BATCHES) AS total_batches,
          (SELECT COALESCE(SUM(quantity), 0) FROM FOOD_BATCHES) AS total_donated_units,
          (SELECT COALESCE(SUM(quantity_claimed), 0) FROM CLAIMS WHERE status = 'DELIVERED') AS total_rescued_units,
          (SELECT COALESCE(SUM(quantity_wasted), 0) FROM WASTE_AUDIT_RECORDS) AS total_wasted_units,
          (SELECT COUNT(*) FROM CLAIMS WHERE status IN ('PENDING', 'APPROVED', 'IN_TRANSIT')) AS active_claims
      `),
    ]);

    return NextResponse.json({
      kpis: countsRes.rows[0],
      donorEfficiency: donorEffRes.rows,
      bankUtilization: bankUtilRes.rows,
      logs: logsRes.rows,
    });
  } catch (err: any) {
    console.error('Error fetching admin statistics:', err);
    return NextResponse.json({ error: 'Failed to fetch admin stats' }, { status: 500 });
  }
}
