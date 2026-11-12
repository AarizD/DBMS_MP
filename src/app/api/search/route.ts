import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { pipeline } from '@xenova/transformers';

export const dynamic = 'force-dynamic';

// Singleton embedding extractor
let extractorPromise: any = null;
async function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return extractorPromise;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { searchQuery, categoryFilter, maxResults = 8 } = body;

    if (!searchQuery || typeof searchQuery !== 'string' || searchQuery.trim().length === 0) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    const trimmedQuery = searchQuery.trim();

    // =========================================================================
    // 1. SEMANTIC VECTOR SEARCH (PostgreSQL + pgvector HNSW Index)
    // =========================================================================
    const vectorStart = Date.now();
    const extractor = await getExtractor();
    const modelOutput = await extractor(trimmedQuery, { pooling: 'mean', normalize: true });
    const queryVector = `[${Array.from(modelOutput.data).join(',')}]`;

    let semanticSql = `
      SELECT 
        fb.batch_id,
        f.food_id,
        f.food_name,
        f.category,
        f.unit,
        f.storage_requirement,
        fb.quantity AS original_quantity,
        fb.available_quantity,
        fb.expiry_date,
        (fb.expiry_date - CURRENT_DATE) AS days_until_expiry,
        fb.storage_condition,
        d.donator_id,
        d.name AS donator_name,
        d.city AS donator_city,
        d.phone AS donator_phone,
        ROUND(((1 - (fb.embedding <=> $1)) * 100)::numeric, 1) AS match_percentage
      FROM FOOD_BATCHES fb
      JOIN FOOD f ON fb.food_id = f.food_id
      JOIN FOOD_DONATORS d ON fb.donator_id = d.donator_id
      WHERE fb.status IN ('AVAILABLE', 'PARTIALLY_CLAIMED')
        AND fb.available_quantity > 0
        AND fb.expiry_date >= CURRENT_DATE
    `;

    const semanticParams: any[] = [queryVector];

    if (categoryFilter && categoryFilter !== 'ALL') {
      semanticParams.push(categoryFilter);
      semanticSql += ` AND f.category = $${semanticParams.length}`;
    }

    semanticParams.push(maxResults);
    semanticSql += ` ORDER BY fb.embedding <=> $1 LIMIT $${semanticParams.length};`;

    const semanticRes = await query(semanticSql, semanticParams);
    const vectorDuration = Date.now() - vectorStart;

    // =========================================================================
    // 2. TRADITIONAL KEYWORD SEARCH (SQL LIKE / ILIKE) FOR SIDE-BY-SIDE PROOF
    // =========================================================================
    const keywordStart = Date.now();
    const words = trimmedQuery
      .split(/\s+/)
      .filter((w: string) => w.length > 2)
      .map((w: string) => `%${w}%`);

    let keywordRes = { rows: [] };
    if (words.length > 0) {
      let keywordSql = `
        SELECT 
          fb.batch_id,
          f.food_id,
          f.food_name,
          f.category,
          f.unit,
          fb.available_quantity,
          fb.expiry_date,
          (fb.expiry_date - CURRENT_DATE) AS days_until_expiry,
          d.name AS donator_name
        FROM FOOD_BATCHES fb
        JOIN FOOD f ON fb.food_id = f.food_id
        JOIN FOOD_DONATORS d ON fb.donator_id = d.donator_id
        WHERE fb.status IN ('AVAILABLE', 'PARTIALLY_CLAIMED')
          AND fb.available_quantity > 0
          AND fb.expiry_date >= CURRENT_DATE
          AND (
      `;

      const conditions: string[] = [];
      const keywordParams: any[] = [];

      words.forEach((w: string, idx: number) => {
        keywordParams.push(w);
        conditions.push(`f.food_name ILIKE $${keywordParams.length} OR f.description ILIKE $${keywordParams.length}`);
      });

      keywordSql += conditions.join(' OR ') + `) LIMIT 8;`;
      keywordRes = await query(keywordSql, keywordParams);
    }
    const keywordDuration = Date.now() - keywordStart;

    return NextResponse.json({
      query: trimmedQuery,
      vectorLatencyMs: vectorDuration,
      keywordLatencyMs: keywordDuration,
      semanticResults: semanticRes.rows,
      keywordResults: keywordRes.rows,
      totalSemanticMatches: semanticRes.rowCount,
      totalKeywordMatches: keywordRes.rows.length,
    });
  } catch (err: any) {
    console.error('Error running semantic search:', err);
    return NextResponse.json({ error: err?.message || 'Semantic search execution failed' }, { status: 500 });
  }
}

