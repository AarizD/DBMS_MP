import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
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

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'DONOR' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden: Donor privileges required' }, { status: 403 });
    }

    const body = await req.json();
    const { foodName, category, description, unit, storageRequirement, isPerishable = true } = body;

    if (!foodName || typeof foodName !== 'string' || !foodName.trim() || !category) {
      return NextResponse.json({ error: 'Food name and category are required' }, { status: 400 });
    }

    const validCategories = [
      'BAKERY',
      'DAIRY',
      'PRODUCE',
      'PREPARED_MEALS',
      'CANNED_GOODS',
      'BEVERAGES',
      'PACKAGED_SNACKS',
      'OTHER',
    ];

    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: 'Invalid food category selected' }, { status: 400 });
    }

    const res = await query(
      `INSERT INTO FOOD (food_name, category, description, unit, storage_requirement, is_perishable)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING food_id, food_name, category, description, unit, storage_requirement, is_perishable`,
      [
        foodName.trim(),
        category,
        description ? description.trim() : '',
        unit || 'kg',
        storageRequirement || 'AMBIENT',
        Boolean(isPerishable),
      ]
    );

    return NextResponse.json(res.rows[0], { status: 201 });
  } catch (err: any) {
    console.error('Error creating food catalog item:', err);
    return NextResponse.json({ error: err?.message || 'Failed to create food item' }, { status: 500 });
  }
}
