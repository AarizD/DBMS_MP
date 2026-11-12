import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { pipeline } from '@xenova/transformers';

export const dynamic = 'force-dynamic';

// Singleton extractor for fast server-side vector generation
let extractorPromise: any = null;
async function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return extractorPromise;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized: Please log in' }, { status: 401 });
    }

    const { role, referenceId } = session.user;

    let res;
    if (role === 'ADMIN') {
      res = await query(
        `SELECT 
          fb.batch_id,
          f.food_name,
          f.category,
          f.unit,
          fb.quantity,
          fb.available_quantity,
          fb.donation_date,
          fb.expiry_date,
          (fb.expiry_date - CURRENT_DATE) AS days_until_expiry,
          fb.storage_condition,
          fb.status,
          d.name AS donator_name
         FROM FOOD_BATCHES fb
         JOIN FOOD f ON fb.food_id = f.food_id
         JOIN FOOD_DONATORS d ON fb.donator_id = d.donator_id
         ORDER BY fb.batch_id DESC`
      );
    } else if (role === 'DONOR' && referenceId) {
      res = await query(
        `SELECT 
          fb.batch_id,
          f.food_name,
          f.category,
          f.unit,
          fb.quantity,
          fb.available_quantity,
          fb.donation_date,
          fb.expiry_date,
          (fb.expiry_date - CURRENT_DATE) AS days_until_expiry,
          fb.storage_condition,
          fb.status
         FROM FOOD_BATCHES fb
         JOIN FOOD f ON fb.food_id = f.food_id
         WHERE fb.donator_id = $1
         ORDER BY fb.batch_id DESC`,
        [referenceId]
      );
    } else {
      return NextResponse.json({ error: 'Forbidden: Donor access required' }, { status: 403 });
    }

    return NextResponse.json(res.rows);
  } catch (err: any) {
    console.error('Error fetching donor batches:', err);
    return NextResponse.json({ error: 'Failed to fetch batches' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== 'DONOR' && session.user.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden: Donor privileges required' }, { status: 403 });
    }

    const donatorId = session.user.referenceId || 1; // Default to 1 if Admin
    const body = await req.json();
    const { foodId, quantity, expiryDate, storageCondition } = body;

    const parsedQty = parseInt(quantity, 10);
    if (!foodId || isNaN(parsedQty) || parsedQty <= 0 || !expiryDate) {
      return NextResponse.json(
        { error: 'Valid food item, positive quantity, and expiry date are required' },
        { status: 400 }
      );
    }

    // 1. Fetch Food Item Details for Semantic Description
    const foodRes = await query('SELECT food_name, category, description FROM FOOD WHERE food_id = $1', [foodId]);
    if (foodRes.rowCount === 0) {
      return NextResponse.json({ error: 'Selected food item does not exist' }, { status: 404 });
    }
    const food = foodRes.rows[0];

    // 2. Compute 384-dimensional vector embedding on the server
    const semanticText = `${food.food_name}. Category: ${food.category}. Description: ${food.description || ''}. Storage: ${storageCondition || ''}`;
    const extractor = await getExtractor();
    const output = await extractor(semanticText, { pooling: 'mean', normalize: true });
    const vectorString = `[${Array.from(output.data).join(',')}]`;

    // 3. Insert into FOOD_BATCHES (triggers will automatically fire)
    const insertRes = await query(
      `INSERT INTO FOOD_BATCHES 
        (food_id, donator_id, quantity, available_quantity, donation_date, expiry_date, storage_condition, status, embedding)
       VALUES ($1, $2, $3, $3, CURRENT_DATE, $4, $5, 'AVAILABLE', $6)
       RETURNING batch_id, food_id, quantity, available_quantity, expiry_date, status`,
      [foodId, donatorId, parsedQty, expiryDate, storageCondition || 'Standard ambient / cold storage', vectorString]
    );

    return NextResponse.json(
      { message: 'Food batch listed successfully with AI vector embedding', batch: insertRes.rows[0] },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('Error creating batch:', err);
    return NextResponse.json({ error: err?.message || 'Failed to list food batch' }, { status: 500 });
  }
}
