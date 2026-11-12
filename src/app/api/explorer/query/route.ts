import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

// Keywords that indicate a write/destructive operation
const FORBIDDEN_KEYWORDS = [
  'INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'CREATE',
  'TRUNCATE', 'GRANT', 'REVOKE', 'COPY', 'EXECUTE',
];

function isReadOnlyQuery(sql: string): boolean {
  const trimmed = sql.trim().toUpperCase();

  // Must start with SELECT or WITH (CTEs)
  if (!trimmed.startsWith('SELECT') && !trimmed.startsWith('WITH')) {
    return false;
  }

  // Check for forbidden keywords as standalone words using word boundaries
  for (const keyword of FORBIDDEN_KEYWORDS) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(sql)) {
      return false;
    }
  }

  return true;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin privileges required' }, { status: 403 });
    }

    const body = await request.json();
    const { sql } = body;

    if (!sql || typeof sql !== 'string' || sql.trim().length === 0) {
      return NextResponse.json({ error: 'SQL query is required' }, { status: 400 });
    }

    if (!isReadOnlyQuery(sql)) {
      return NextResponse.json(
        { error: 'Only read-only queries (SELECT / WITH) are allowed. Write operations are forbidden.' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      // Set a 5-second timeout for the query
      await client.query("SET statement_timeout = '5000'");

      const start = Date.now();
      const result = await client.query(sql);
      const executionTimeMs = Date.now() - start;

      const columns = result.fields.map((f) => f.name);
      const rows = result.rows.slice(0, 100);

      return NextResponse.json({
        rows,
        columns,
        rowCount: result.rowCount,
        executionTimeMs,
      });
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error('Error executing explorer query:', err);

    // Surface timeout errors clearly
    if (err.message?.includes('statement timeout')) {
      return NextResponse.json(
        { error: 'Query timed out. Maximum execution time is 5 seconds.' },
        { status: 408 }
      );
    }

    return NextResponse.json(
      { error: err.message || 'Failed to execute query' },
      { status: 500 }
    );
  }
}
