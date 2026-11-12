import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import pool from '@/lib/db';

export async function POST(req: Request) {
  const client = await pool.connect();
  try {
    const body = await req.json();
    const { name, email, password, role, organizationName, phone, city, address } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: 'Name, email, password, and role are required' },
        { status: 400 }
      );
    }

    if (!['DONOR', 'FOOD_BANK'].includes(role)) {
      return NextResponse.json(
        { error: 'Registration is only available for DONOR or FOOD_BANK roles' },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existing = await client.query('SELECT user_id FROM USERS WHERE email = $1', [cleanEmail]);
    if (existing.rowCount && existing.rowCount > 0) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Begin atomic registration transaction
    await client.query('BEGIN');

    let referenceId: number | null = null;

    if (role === 'DONOR') {
      const donorRes = await client.query(
        `INSERT INTO FOOD_DONATORS (name, organization_name, donator_type, phone, email, address, city)
         VALUES ($1, $2, 'OTHER', $3, $4, $5, $6)
         RETURNING donator_id`,
        [name, organizationName || name, phone || null, cleanEmail, address || null, city || 'Bangalore']
      );
      referenceId = donorRes.rows[0].donator_id;
    } else if (role === 'FOOD_BANK') {
      const bankRes = await client.query(
        `INSERT INTO FOOD_BANKS (name, contact_person, phone, email, address, city, storage_capacity_kg)
         VALUES ($1, $2, $3, $4, $5, $6, 1000)
         RETURNING food_bank_id`,
        [organizationName || name, name, phone || null, cleanEmail, address || null, city || 'Bangalore']
      );
      referenceId = bankRes.rows[0].food_bank_id;
    }

    // Insert user into USERS table
    const userRes = await client.query(
      `INSERT INTO USERS (name, email, password_hash, role, phone, organization_name, reference_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING user_id, name, email, role`,
      [name, cleanEmail, passwordHash, role, phone || null, organizationName || name, referenceId]
    );

    // Log registration
    await client.query(
      `INSERT INTO LOGS (action, description, entity_type, entity_reference, new_status)
       VALUES ('USER_REGISTERED', $1, 'USERS', $2, 'ACTIVE')`,
      [`New ${role} registered: ${name} (${cleanEmail})`, userRes.rows[0].user_id]
    );

    await client.query('COMMIT');

    return NextResponse.json(
      { message: 'User registered successfully', user: userRes.rows[0] },
      { status: 201 }
    );
  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('Registration error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error during registration' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

