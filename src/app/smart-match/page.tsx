'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { 
  Sparkles, 
  Search, 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  MapPin, 
  HeartHandshake, 
  X,
  Zap,
  Info,
  ArrowRight,
  Lock
} from 'lucide-react';

interface SemanticResult {
  batch_id: number;
  food_name: string;
  category: string;
  unit: string;
  available_quantity: number;
  expiry_date: string;
  days_until_expiry: number;
  donator_name: string;
  donator_city: string;
  donator_phone: string;
  storage_condition: string;
  match_percentage: number;
}

interface KeywordResult {
  batch_id: number;
  food_name: string;
  category: string;
  unit: string;
  available_quantity: number;
  expiry_date: string;
  days_until_expiry: number;
  donator_name: string;
}

export default function SmartMatchPage() {
  const { data: session } = useSession();

  const [searchQuery, setSearchQuery] = useState('High protein emergency breakfast for youth shelter');
  const [categoryFilter, setSelectedCategory] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Results
  const [semanticResults, setSemanticResults] = useState<SemanticResult[]>([]);
  const [keywordResults, setKeywordResults] = useState<KeywordResult[]>([]);
  const [vectorLatency, setVectorLatency] = useState<number>(0);
  const [keywordLatency, setKeywordLatency] = useState<number>(0);

  // Claim Modal
  const [claimingBatch, setClaimingBatch] = useState<SemanticResult | null>(null);
  const [claimQty, setClaimQty] = useState('');
  const [pickupRequired, setPickupRequired] = useState(false);
  const [claimSubmitting, setClaimSubmitting] = useState(false);
  const [claimMessage, setClaimMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const samplePrompts = [
    'High protein emergency breakfast for youth shelter',
    'Warm cooked meal for night dinner distribution',
    'Emergency non-perishable flood relief rations and grains',
    'Fresh dairy and calcium for children morning nourishment',
    'Staple dry pulses and rice for community soup kitchen',
  ];

  const handleSearch = async (queryText?: string) => {
    const textToSearch = queryText || searchQuery;
    if (!textToSearch.trim()) return;

    setLoading(true);
    setHasSearched(true);

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          searchQuery: textToSearch,
          categoryFilter,
          maxResults: 6,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSemanticResults(data.semanticResults || []);
        setKeywordResults(data.keywordResults || []);
        setVectorLatency(data.vectorLatencyMs || 0);
        setKeywordLatency(data.keywordLatencyMs || 0);
      }
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimingBatch) return;

    setClaimSubmitting(true);
    setClaimMessage(null);

    try {
      const res = await fetch('/api/food-bank/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId: claimingBatch.batch_id,
          quantity: parseInt(claimQty, 10),
          pickupRequired,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to place claim');
      }

      setClaimMessage({
        type: 'success',
        text: `Claim #${data.claimId} placed! Stored procedure deducted stock atomically.`,
      });

      setTimeout(() => {
        setClaimingBatch(null);
        setClaimMessage(null);
        setClaimQty('');
        handleSearch();
      }, 1200);
    } catch (err: any) {
      setClaimMessage({ type: 'error', text: err?.message || 'Claim failed' });
    } finally {
      setClaimSubmitting(false);
    }
  };

  const categories = ['ALL', 'BAKERY', 'DAIRY', 'PRODUCE', 'PREPARED_MEALS', 'CANNED_GOODS', 'PACKAGED_SNACKS'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200/80 mb-3 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>PostgreSQL 16 + pgvector HNSW Engine</span>
          <span className="text-blue-300">•</span>
          <span className="font-mono">all-MiniLM-L6-v2 (384 dims)</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          AI Semantic Distress Matching
        </h1>
        <p className="mt-3 text-sm sm:text-base text-slate-600 leading-relaxed">
          Express distress requests in natural language. Our vector database ranks available batches by semantic meaning—not just keywords—while filtering for unexpired stock.
        </p>
      </div>

      {/* Search Input Box */}
      <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm mb-8">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="e.g. Urgent high-protein breakfast for youth shelter..."
              className="w-full pl-11 pr-4 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === 'ALL' ? 'All Categories' : c.replace('_', ' ')}
                </option>
              ))}
            </select>

            <button
              onClick={() => handleSearch()}
              disabled={loading}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 flex-shrink-0"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Matching...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Semantic Match</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Evaluation Prompt Chips */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            Try Evaluation Prompt Scenarios:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {samplePrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setSearchQuery(prompt);
                  handleSearch(prompt);
                }}
                className="px-2.5 py-1 text-xs rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-medium transition-colors border border-slate-200/60"
              >
                &ldquo;{prompt}&rdquo;
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Comparison Metrics Bar */}
      {hasSearched && (
        <div className="max-w-4xl mx-auto mb-6 p-4 rounded-xl bg-slate-900 text-white shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-200">
                Evaluation Proof: Semantic AI vs. Traditional SQL Keyword Search
              </div>
              <div className="text-[11px] text-slate-400">
                Notice how vector search understands intent (e.g. finding Paneer & Chikki for &ldquo;protein&rdquo;) even when the exact keyword is missing.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="text-right">
              <span className="text-slate-400">Vector Latency:</span>{' '}
              <span className="font-bold text-emerald-400">{vectorLatency}ms</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400">SQL Latency:</span>{' '}
              <span className="font-bold text-slate-300">{keywordLatency}ms</span>
            </div>
          </div>
        </div>
      )}

      {/* Side-by-Side Results Display */}
      {hasSearched && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Column A: Semantic Search Results (pgvector) - 8 cols */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                  <Sparkles className="w-4 h-4" />
                </span>
                <h2 className="text-base font-extrabold text-slate-900">
                  Semantic AI Matches (PostgreSQL + pgvector)
                </h2>
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                {semanticResults.length} Relevant Batches Ranked by Cosine Distance
              </span>
            </div>

            {semanticResults.length === 0 ? (
              <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
                No active surplus batches matched your criteria.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {semanticResults.map((b) => {
                  const isDistress = b.days_until_expiry <= 2;
                  return (
                    <div
                      key={b.batch_id}
                      className={`bg-white rounded-xl border p-4 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between ${
                        isDistress ? 'border-amber-200 hover:border-amber-300' : 'border-slate-200 hover:border-emerald-300'
                      }`}
                    >
                      <div>
                        {/* Match Score Badge */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className={`inline-flex items-center gap-1 text-xs font-black px-2.5 py-0.5 rounded-full border ${
                            b.match_percentage >= 70 
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                              : b.match_percentage >= 50 
                                ? 'bg-blue-100 text-blue-800 border-blue-300'
                                : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}>
                            <Sparkles className="w-3 h-3" />
                            {b.match_percentage}% Match
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                            {b.category}
                          </span>
                        </div>

                        <h3 className="font-bold text-slate-900 text-sm">{b.food_name}</h3>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">{b.storage_condition}</p>

                        <div className="mt-3 pt-2.5 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Available Stock:</span>
                            <span className="font-extrabold text-slate-900">
                              {b.available_quantity} {b.unit}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Donor:</span>
                            <span className="font-semibold text-slate-700 truncate max-w-[140px]">
                              {b.donator_name}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Location:</span>
                            <span className="font-medium text-slate-600 truncate max-w-[140px] flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {b.donator_city}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400">Expiry:</span>
                            <span className={`font-semibold flex items-center gap-1 ${isDistress ? 'text-amber-600' : 'text-slate-700'}`}>
                              {isDistress && <Clock className="w-3 h-3" />}
                              {b.days_until_expiry === 0 ? 'Today' : `${b.days_until_expiry}d left`}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Distress urgency bar */}
                      {isDistress && (
                        <div className="mt-3 px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-1.5 text-[11px] font-semibold text-amber-800">
                          <AlertTriangle className="w-3 h-3 text-amber-600 flex-shrink-0" />
                          Distress — rescue this batch before it expires!
                        </div>
                      )}

                      {session?.user?.role === 'FOOD_BANK' || session?.user?.role === 'ADMIN' ? (
                        <button
                          onClick={() => {
                            setClaimingBatch(b);
                            setClaimQty(String(Math.min(25, b.available_quantity)));
                          }}
                          className="mt-3 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5"
                        >
                          <HeartHandshake className="w-3.5 h-3.5" />
                          Claim from Semantic Match
                        </button>
                      ) : (
                        <Link
                          href="/login"
                          className="mt-3 w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 border border-slate-200"
                        >
                          <Lock className="w-3 h-3 text-slate-500" />
                          Sign in as Food Bank to Claim
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Column B: Traditional SQL Keyword Search (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-slate-200 text-slate-700">
                  <Database className="w-4 h-4" />
                </span>
                <h2 className="text-base font-extrabold text-slate-700">
                  SQL Keyword Search
                </h2>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                LIKE &apos;%word%&apos;
              </span>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
              <div className="font-bold flex items-center gap-1.5 text-amber-950 mb-1">
                <Info className="w-3.5 h-3.5 text-amber-600" />
                Why Keyword Search Fails:
              </div>
              Traditional SQL only matches literal characters. If the donor lists &ldquo;Fresh Malai Paneer&rdquo; or &ldquo;Toor Dal&rdquo;, SQL LIKE will <strong>never match &ldquo;protein&rdquo;</strong> because the letters p-r-o-t-e-i-n are not in the food title.
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
              <div className="text-xs font-bold text-slate-700">
                Keyword Matches Found: <span className="font-mono text-slate-900">{keywordResults.length}</span>
              </div>

              {keywordResults.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-lg">
                  <AlertTriangle className="w-6 h-6 mx-auto text-amber-400 mb-2" />
                  <strong>0 Keyword Matches.</strong>
                  <p className="mt-1">Traditional SQL missed all available food items!</p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100 text-xs">
                  {keywordResults.map((k) => (
                    <li key={k.batch_id} className="py-2">
                      <div className="font-semibold text-slate-800">{k.food_name}</div>
                      <div className="text-[11px] text-slate-500">
                        Stock: {k.available_quantity} {k.unit} • {k.donator_name}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Technical Architecture Explainer */}
            <div className="bg-slate-900 rounded-xl p-4 text-xs text-slate-300 space-y-3 mt-2">
              <div className="font-bold text-white text-sm flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-blue-400" />
                How Semantic Search Works
              </div>

              <div className="space-y-2.5">
                <div className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">1</span>
                  <div>
                    <div className="font-semibold text-slate-100">Encode Query</div>
                    <div className="text-slate-400">Your natural language query is converted into a 384-dim dense vector using <code className="text-blue-300">all-MiniLM-L6-v2</code>.</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">2</span>
                  <div>
                    <div className="font-semibold text-slate-100">HNSW Search</div>
                    <div className="text-slate-400">PostgreSQL pgvector compares the query vector with all batch embeddings using cosine distance (<code className="text-emerald-300">&lt;=&gt;</code> operator).</div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">3</span>
                  <div>
                    <div className="font-semibold text-slate-100">Rank &amp; Filter</div>
                    <div className="text-slate-400">Results are ranked by semantic similarity, filtered by status, expiry, and stock, then returned with match percentages.</div>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-700 text-[11px] text-slate-500">
                <strong className="text-slate-400">SQL Executed:</strong>
                <code className="block mt-1 text-blue-300 font-mono leading-relaxed">
                  ORDER BY embedding &lt;=&gt; $query_vector
                </code>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Claim Modal */}
      {claimingBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 relative">
            <button
              onClick={() => setClaimingBatch(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Claim Matched Food</h3>
                <p className="text-xs text-slate-500">
                  Semantic match score: <strong>{claimingBatch.match_percentage}%</strong>
                </p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60 mb-4 text-xs space-y-1">
              <div className="font-bold text-slate-900 text-sm">{claimingBatch.food_name}</div>
              <div className="text-slate-600">Donor: {claimingBatch.donator_name}</div>
              <div className="text-slate-600">
                Available Stock:{' '}
                <span className="font-bold text-slate-900">
                  {claimingBatch.available_quantity} {claimingBatch.unit}
                </span>
              </div>
            </div>

            {claimMessage && (
              <div
                className={`mb-4 p-3 rounded-lg text-sm flex items-start gap-2 ${
                  claimMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {claimMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                )}
                <span>{claimMessage.text}</span>
              </div>
            )}

            <form onSubmit={handleClaim} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Quantity to Claim ({claimingBatch.unit}) *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={claimingBatch.available_quantity}
                  value={claimQty}
                  onChange={(e) => setClaimQty(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="search-pickup"
                  checked={pickupRequired}
                  onChange={(e) => setPickupRequired(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <label htmlFor="search-pickup" className="text-xs text-slate-700 font-medium">
                  We will arrange self-pickup from {claimingBatch.donator_city}
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setClaimingBatch(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={claimSubmitting}
                  className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {claimSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Claiming...
                    </>
                  ) : (
                    <>
                      <HeartHandshake className="w-4 h-4" />
                      Confirm Atomic Claim
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

