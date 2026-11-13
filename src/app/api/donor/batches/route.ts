import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { pipeline, env } from '@xenova/transformers';

export const dynamic = 'force-dynamic';

// Enforce 100% offline local model execution
env.allowRemoteModels = false;

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
    const { 
      foodId, 
      quantity, 
      expiryDate, 
      storageCondition,
      isNewFood,
      newFoodName,
      newCategory,
      newDescription,
      newUnit,
      newStorageRequirement
    } = body;

    const parsedQty = parseInt(quantity, 10);
    if (isNaN(parsedQty) || parsedQty <= 0 || !expiryDate) {
      return NextResponse.json(
        { error: 'Positive quantity and valid expiry date are required' },
        { status: 400 }
      );
    }

    let targetFoodId = foodId;
    let foodDetails: { food_name: string; category: string; description?: string } | null = null;
    let newlyCreatedFood: any = null;

    // 1. If user is adding a brand-new food commodity to the catalog
    if (isNewFood || foodId === 'NEW' || (!foodId && newFoodName)) {
      if (!newFoodName || !newCategory) {
        return NextResponse.json(
          { error: 'Food item name and category are required to create a new commodity' },
          { status: 400 }
        );
      }

      const insertFoodRes = await query(
        `INSERT INTO FOOD (food_name, category, description, unit, storage_requirement, is_perishable)
         VALUES ($1, $2, $3, $4, $5, TRUE)
         RETURNING food_id, food_name, category, description, unit, storage_requirement`,
        [
          newFoodName.trim(),
          newCategory,
          newDescription ? newDescription.trim() : '',
          newUnit || 'kg',
          newStorageRequirement || 'AMBIENT'
        ]
      );

      newlyCreatedFood = insertFoodRes.rows[0];
      targetFoodId = newlyCreatedFood.food_id;
      foodDetails = {
        food_name: newlyCreatedFood.food_name,
        category: newlyCreatedFood.category,
        description: newlyCreatedFood.description,
      };
    } else {
      // Fetch existing Food Item Details from catalog
      if (!targetFoodId) {
        return NextResponse.json({ error: 'Please select or specify a food item' }, { status: 400 });
      }

      const foodRes = await query(
        'SELECT food_name, category, description FROM FOOD WHERE food_id = $1',
        [targetFoodId]
      );
      if (foodRes.rowCount === 0) {
        return NextResponse.json({ error: 'Selected food item does not exist in catalog' }, { status: 404 });
      }
      foodDetails = foodRes.rows[0];
    }

    // 2. Compute 384-dimensional vector embedding on the server
    if (!foodDetails) {
      return NextResponse.json({ error: 'Failed to resolve food item details' }, { status: 400 });
    }

    const semanticText = `${foodDetails.food_name}. Category: ${foodDetails.category}. Description: ${foodDetails.description || ''}. Storage: ${storageCondition || ''}`;
    const extractor = await getExtractor();
    const output = await extractor(semanticText, { pooling: 'mean', normalize: true });
    const vectorString = `[${Array.from(output.data).join(',')}]`;

    // 3. Insert into FOOD_BATCHES (triggers will automatically fire)
    const insertRes = await query(
      `INSERT INTO FOOD_BATCHES 
        (food_id, donator_id, quantity, available_quantity, donation_date, expiry_date, storage_condition, status, embedding)
       VALUES ($1, $2, $3, $3, CURRENT_DATE, $4, $5, 'AVAILABLE', $6)
       RETURNING batch_id, food_id, quantity, available_quantity, expiry_date, status`,
      [targetFoodId, donatorId, parsedQty, expiryDate, storageCondition || 'Standard ambient / cold storage', vectorString]
    );

    return NextResponse.json(
      { 
        message: 'Food batch listed successfully with AI vector embedding', 
        batch: insertRes.rows[0],
        newFood: newlyCreatedFood
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error('Error creating batch:', err);
    return NextResponse.json({ error: err?.message || 'Failed to list food batch' }, { status: 500 });
  }
}
