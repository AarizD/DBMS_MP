import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [availableRes, expiringSoonRes] = await Promise.all([
      query(`SELECT * FROM view_available_batches`),
      query(`SELECT * FROM view_expiring_soon_batches`),
    ]);

    return NextResponse.json({
      available: availableRes.rows,
      expiringSoon: expiringSoonRes.rows,
    });
  } catch (err: any) {
    console.error('Error fetching food bank inventory:', err);
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 });
  }
}
