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

    const [
      tablesRes,
      columnsRes,
      constraintsRes,
      indexesRes,
      proceduresRes,
      triggersRes,
      viewsRes,
    ] = await Promise.all([
      // 1. Table info with live row counts
      query(`
        SELECT 
          t.table_name,
          (xpath('/row/cnt/text()', xml_count))[1]::text::int AS row_count
        FROM information_schema.tables t
        LEFT JOIN LATERAL (
          SELECT query_to_xml(
            format('SELECT COUNT(*) AS cnt FROM %I.%I', t.table_schema, t.table_name),
            false, true, ''
          ) AS xml_count
        ) x ON true
        WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
        ORDER BY t.table_name
      `),

      // 2. Column info per table
      query(`
        SELECT table_name, column_name, data_type, is_nullable,
               column_default, character_maximum_length
        FROM information_schema.columns
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position
      `),

      // 3. Constraints (PK, FK, CHECK, UNIQUE)
      query(`
        SELECT tc.table_name, tc.constraint_name, tc.constraint_type,
               kcu.column_name,
               ccu.table_name AS foreign_table,
               ccu.column_name AS foreign_column
        FROM information_schema.table_constraints tc
        LEFT JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        LEFT JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name
          AND tc.table_schema = ccu.table_schema
        WHERE tc.table_schema = 'public'
        ORDER BY tc.table_name, tc.constraint_type
      `),

      // 4. Indexes
      query(`
        SELECT tablename, indexname, indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
        ORDER BY tablename
      `),

      // 5. Stored procedures / functions
      query(`
        SELECT routine_name, routine_type, data_type AS return_type,
               pg_get_functiondef(p.oid) AS definition
        FROM information_schema.routines r
        JOIN pg_proc p ON p.proname = r.routine_name
        WHERE r.specific_schema = 'public' AND r.routine_schema = 'public'
        ORDER BY routine_name
      `),

      // 6. Triggers
      query(`
        SELECT trigger_name, event_manipulation, event_object_table,
               action_timing, action_statement
        FROM information_schema.triggers
        WHERE trigger_schema = 'public'
        ORDER BY event_object_table, trigger_name
      `),

      // 7. Views
      query(`
        SELECT table_name AS view_name, view_definition
        FROM information_schema.views
        WHERE table_schema = 'public'
        ORDER BY table_name
      `),
    ]);

    return NextResponse.json({
      tables: tablesRes.rows,
      columns: columnsRes.rows,
      constraints: constraintsRes.rows,
      indexes: indexesRes.rows,
      procedures: proceduresRes.rows,
      triggers: triggersRes.rows,
      views: viewsRes.rows,
    });
  } catch (err: any) {
    console.error('Error fetching database schema:', err);
    return NextResponse.json({ error: 'Failed to fetch database schema' }, { status: 500 });
  }
}
