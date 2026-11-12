import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await query(
      `SELECT food_id, food_name, category, description, unit, storage_requirement 
       FROM FOOD 
       ORDER BY category ASC, food_name ASC`
    );
    return NextResponse.json(res.rows);
  } catch (err: any) {
    console.error('Error fetching food catalog:', err);
    return NextResponse.json({ error: 'Failed to fetch catalog' }, { status: 500 });
  }
}
