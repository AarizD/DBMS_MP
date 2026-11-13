import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { pipeline, env } from '@xenova/transformers';

export const dynamic = 'force-dynamic';

// Enforce 100% offline local model execution to prevent network stalls
env.allowRemoteModels = false;

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

    // Hard distance cutoff (< 0.65) rejects weak/unrelated tail results at the database level
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
        (fb.embedding <=> $1) AS cosine_distance,
        ROUND(((1 - (fb.embedding <=> $1)) * 100)::numeric, 1) AS raw_match_percentage
      FROM FOOD_BATCHES fb
      JOIN FOOD f ON fb.food_id = f.food_id
      JOIN FOOD_DONATORS d ON fb.donator_id = d.donator_id
      WHERE fb.status IN ('AVAILABLE', 'PARTIALLY_CLAIMED')
        AND fb.available_quantity > 0
        AND fb.expiry_date >= CURRENT_DATE
        AND (fb.embedding <=> $1) < 0.65
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

    // Helper: Calibrate raw cosine similarity (0.35 to 0.72 for all-MiniLM-L6-v2) into intuitive confidence (50% to 98%)
    const calibrateScore = (rawDistance: number): number => {
      const sim = 1 - rawDistance;
      const minBase = 0.35;
      const maxBase = 0.72;
      const normalized = Math.max(0, (sim - minBase) / (maxBase - minBase));
      const score = 50 + normalized * 48;
      return Math.min(99, Math.max(25, Math.round(score * 10) / 10));
    };

    // Adaptive Delta-Clustering: Discard distant tail items relative to the top hit
    let finalSemanticRows: any[] = [];
    if (semanticRes.rows.length > 0) {
      const bestDistance = parseFloat(semanticRes.rows[0].cosine_distance);
      finalSemanticRows = semanticRes.rows
        .filter((row: any) => {
          const dist = parseFloat(row.cosine_distance);
          // Keep only items within delta of +0.16 from the best match and under 0.62 absolute distance
          return dist <= bestDistance + 0.16 && dist < 0.62;
        })
        .map((row: any) => ({
          ...row,
          match_percentage: calibrateScore(parseFloat(row.cosine_distance)),
          cosine_distance: parseFloat(row.cosine_distance),
        }));
    }

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
      semanticResults: finalSemanticRows,
      keywordResults: keywordRes.rows,
      totalSemanticMatches: finalSemanticRows.length,
      totalKeywordMatches: keywordRes.rows.length,
    });
  } catch (err: any) {
    console.error('Error running semantic search:', err);
    return NextResponse.json({ error: err?.message || 'Semantic search execution failed' }, { status: 500 });
  }
}

