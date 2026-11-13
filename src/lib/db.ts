import { Pool, QueryResult, QueryResultRow } from 'pg';

// Global declaration to preserve connection pool across Next.js HMR reloads
declare global {
  // eslint-disable-next-line no-var
  var _postgresPool: Pool | undefined;
}

// Create or reuse singleton connection pool for PostgreSQL with pgvector
const pool =
  globalThis._postgresPool ||
  new Pool({
    connectionString:
      process.env.DATABASE_URL ||
      'postgresql://postgres:postgres@127.0.0.1:5432/food_redistribution',
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis._postgresPool = pool;
}

export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  const res = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV === 'development') {
    console.log(`[SQL Query] duration=${duration}ms rows=${res.rowCount}`);
  }
  return res;
}

export default pool;
