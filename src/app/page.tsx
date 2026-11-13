import React from 'react';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { 
  Building2, 
  HeartHandshake, 
  ShieldCheck, 
  Sparkles, 
  Lock, 
  Database, 
  Cpu, 
  TrendingUp,
  ArrowRight,
  Clock,
  MapPin,
  AlertTriangle,
  Package,
  Layers,
  ChevronRight,
  LogIn
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const session = await getServerSession(authOptions);

  // Fetch live stats & inventory preview from PostgreSQL
  let liveBatches: any[] = [];
  let stats = {
    totalBatches: 0,
    urgentCount: 0,
    donorsCount: 0,
    foodBanksCount: 0,
  };

  try {
    const [batchesRes, countsRes] = await Promise.all([
      query(`
        SELECT 
          fb.batch_id,
          f.food_name,
          f.category,
          f.unit,
          fb.available_quantity,
          fb.expiry_date,
          (fb.expiry_date - CURRENT_DATE) AS days_left,
          d.name AS donor_name,
          d.city AS donor_city
        FROM FOOD_BATCHES fb
        JOIN FOOD f ON fb.food_id = f.food_id
        JOIN FOOD_DONATORS d ON fb.donator_id = d.donator_id
        WHERE fb.status IN ('AVAILABLE', 'PARTIALLY_CLAIMED')
          AND fb.available_quantity > 0
          AND fb.expiry_date >= CURRENT_DATE
        ORDER BY fb.expiry_date ASC
        LIMIT 6;
      `),
      query(`
        SELECT 
          (SELECT COUNT(*) FROM FOOD_BATCHES WHERE status IN ('AVAILABLE', 'PARTIALLY_CLAIMED')) AS total_batches,
          (SELECT COUNT(*) FROM FOOD_BATCHES WHERE status IN ('AVAILABLE', 'PARTIALLY_CLAIMED') AND expiry_date <= CURRENT_DATE + INTERVAL '2 days') AS urgent_count,
          (SELECT COUNT(*) FROM FOOD_DONATORS) AS donors_count,
          (SELECT COUNT(*) FROM FOOD_BANKS) AS food_banks_count;
      `),
    ]);

    liveBatches = batchesRes.rows;
    if (countsRes.rows[0]) {
      stats = {
        totalBatches: Number(countsRes.rows[0].total_batches),
        urgentCount: Number(countsRes.rows[0].urgent_count),
        donorsCount: Number(countsRes.rows[0].donors_count),
        foodBanksCount: Number(countsRes.rows[0].food_banks_count),
      };
    }
  } catch (err) {
    console.error('Database connection error in homepage:', err);
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50/60 via-slate-50 to-slate-50 border-b border-slate-200/80 pt-12 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            {/* Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200/80 shadow-xs mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>DBMS Level 3 Project — Section 5-F</span>
              <span className="text-emerald-400">•</span>
              <span className="font-mono">PostgreSQL 16 + pgvector</span>
            </div>

            {/* Title */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.15]">
              Smart Food Rescue & <br />
              <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 bg-clip-text text-transparent">
                Expiration Tracking
              </span>
            </h1>

            {/* Description */}
            <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
              A multi-paradigm database system bridging food donors (bakeries, supermarkets, banquets)
              with food banks across Bangalore. Built with atomic concurrency control, automated waste auditing, and AI semantic vector search.
            </p>

            {/* CTA Buttons */}
            <div className="mt-8 flex flex-wrap justify-center items-center gap-3">
              {session?.user ? (
                <div className="p-3 bg-white border border-emerald-200 rounded-xl shadow-xs flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-sm font-medium text-slate-700">
                    Logged in as <strong className="text-slate-900">{session.user.name}</strong> ({session.user.role})
                  </span>
                  <Link
                    href={
                      session.user.role === 'DONOR'
                        ? '/donor'
                        : session.user.role === 'FOOD_BANK'
                        ? '/food-bank'
                        : session.user.role === 'ADMIN'
                        ? '/admin'
                        : '/'
                    }
                    className="inline-flex items-center gap-1 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                  >
                    Open Portal <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-md shadow-emerald-600/20 hover:shadow-lg transition-all"
                  >
                    <LogIn className="w-4 h-4" />
                    Launch Interactive Demo
                  </Link>
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-sm font-semibold shadow-xs transition-all"
                  >
                    Register Organization
                  </Link>
                  <Link
                    href="/smart-match"
                    className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-600/20 transition-all"
                  >
                    <Sparkles className="w-4 h-4" />
                    AI Smart Match
                  </Link>
                </>
              )}
            </div>

            {/* Live KPI Metric Chips */}
            <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto">
              <div className="bg-white/90 backdrop-blur p-3.5 rounded-xl border border-slate-200 shadow-xs">
                <div className="text-2xl font-black text-slate-900">{stats.totalBatches}</div>
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
                  Available Batches
                </div>
              </div>

              <div className="bg-white/90 backdrop-blur p-3.5 rounded-xl border border-amber-200 shadow-xs">
                <div className="text-2xl font-black text-amber-600">{stats.urgentCount}</div>
                <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider mt-0.5">
                  Distress (&le; 48h)
                </div>
              </div>

              <div className="bg-white/90 backdrop-blur p-3.5 rounded-xl border border-slate-200 shadow-xs">
                <div className="text-2xl font-black text-slate-900">{stats.donorsCount}</div>
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
                  Registered Donors
                </div>
              </div>

              <div className="bg-white/90 backdrop-blur p-3.5 rounded-xl border border-slate-200 shadow-xs">
                <div className="text-2xl font-black text-slate-900">{stats.foodBanksCount}</div>
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
                  Food Banks / Shelters
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1 space-y-14">
        {/* Role Portals Grid */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Role-Based Portals & Workflows
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Select a portal to explore role-specific database transactions and views
              </p>
            </div>
            {!session && (
              <Link
                href="/login"
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                1-Click Demo Logins <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Donor Portal Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between hover:border-emerald-300 hover:shadow-md transition-all">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-inner">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                    DONOR
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">Food Donor Portal</h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Supermarkets, restaurants, and bakeries publish surplus batches. When listed, local server embeddings (384 dims) are generated automatically.
                </p>
                <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Inventory tracking & countdowns</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Real-time vector generation</span>
                  </div>
                </div>
              </div>
              <Link
                href="/donor"
                className="mt-6 w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 border border-emerald-200"
              >
                <span>Enter Donor Portal</span>
                <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
              </Link>
            </div>

            {/* Food Bank Portal Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between hover:border-blue-300 hover:shadow-md transition-all">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-inner">
                    <HeartHandshake className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                    FOOD_BANK
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">Food Bank & Shelter Portal</h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Browse available Indian catalog surplus and urgent distress alerts (&le; 48h). Atomic claims execute stored procedures with row locks.
                </p>
                <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span>Pessimistic locking (<code className="font-mono text-[10px]">FOR UPDATE</code>)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span>Direct claim requests & history</span>
                  </div>
                </div>
              </div>
              <Link
                href="/food-bank"
                className="mt-6 w-full py-2.5 px-4 bg-blue-50 hover:bg-blue-100 text-blue-900 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 border border-blue-200"
              >
                <span>Enter Food Bank Portal</span>
                <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
              </Link>
            </div>

            {/* Admin Portal Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between hover:border-purple-300 hover:shadow-md transition-all">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-inner">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold font-mono px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200">
                    ADMIN
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-900">Admin Analytics & Audit</h3>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Inspect SQL views (<code className="font-mono text-[10px]">view_donor_efficiency</code>), trigger automated daily expiration sweepers, and review live audit trails.
                </p>
                <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                    <span>Analytical SQL Views</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                    <span>Automated waste audit sweeper</span>
                  </div>
                </div>
              </div>
              <Link
                href="/admin"
                className="mt-6 w-full py-2.5 px-4 bg-purple-50 hover:bg-purple-100 text-purple-900 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 border border-purple-200"
              >
                <span>Enter Admin Portal</span>
                <ArrowRight className="w-3.5 h-3.5 text-purple-600" />
              </Link>
            </div>
          </div>
        </section>

        {/* AI Semantic Search Feature Card (Milestone 4) */}
        <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-6 sm:p-8 shadow-lg overflow-hidden">
          {/* Background decorative grid */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
          </div>

          <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="flex-1 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white/15 text-blue-100 border border-white/20 mb-4 backdrop-blur-sm">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Milestone 4 — AI Vector Database Feature</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                AI Semantic Distress Matching
              </h2>

              <p className="mt-3 text-sm sm:text-base text-blue-100 leading-relaxed max-w-xl">
                Express food bank needs in natural language. Our pgvector HNSW engine ranks surplus batches by <strong className="text-white">semantic meaning</strong>—not just keywords—discovering matches traditional SQL can never find.
              </p>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-center gap-2.5 text-xs text-blue-100">
                  <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                    <Cpu className="w-3.5 h-3.5 text-blue-200" />
                  </div>
                  <span><strong className="text-white">all-MiniLM-L6-v2</strong> 384-dim embeddings</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-blue-100">
                  <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                    <Database className="w-3.5 h-3.5 text-blue-200" />
                  </div>
                  <span><strong className="text-white">HNSW Index</strong> cosine similarity</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-blue-100">
                  <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-200" />
                  </div>
                  <span><strong className="text-white">Side-by-side</strong> AI vs SQL proof</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-start lg:items-end gap-3 flex-shrink-0">
              <Link
                href="/smart-match"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-blue-50 text-blue-700 rounded-xl text-sm font-bold shadow-lg shadow-blue-900/30 hover:shadow-xl transition-all"
              >
                <Sparkles className="w-4 h-4" />
                Launch Smart Match
                <ArrowRight className="w-4 h-4" />
              </Link>
              <span className="text-[11px] text-blue-200 font-medium">
                No login required • Try the evaluation prompts
              </span>
            </div>
          </div>
        </section>

        {/* Live Database Inventory Preview */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
                <Package className="w-4 h-4" />
                Live Database Snapshot
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight mt-1">
                Surplus Food Available in Bangalore Right Now
              </h2>
            </div>
            <Link
              href="/food-bank"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold transition-colors"
            >
              Browse Full Inventory ({stats.totalBatches}) <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {liveBatches.map((b) => {
              const isUrgent = b.days_left <= 2;
              return (
                <div
                  key={b.batch_id}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                    isUrgent
                      ? 'bg-amber-50/50 border-amber-200'
                      : 'bg-slate-50/60 border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                        {b.category}
                      </span>
                      {isUrgent ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          {b.days_left === 0 ? 'Expires Today' : `${b.days_left}d left`}
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-slate-500">
                          {b.days_left} days left
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-slate-900 text-sm">{b.food_name}</h4>
                    <div className="text-xs text-slate-500 mt-1 truncate">
                      Donor: {b.donor_name}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Available:</span>
                    <span className="font-extrabold text-slate-900">
                      {b.available_quantity} {b.unit}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Level 3 Architecture & Justification */}
        <section className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2">
            <Database className="w-4 h-4" />
            Evaluation Rubric Architecture (Level 3)
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            Relational ACID Core + Native PostgreSQL Vector Database
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-6">
            <div className="border-l-2 border-emerald-500 pl-4">
              <h4 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                Pessimistic Concurrency Control
              </h4>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Stored procedure <code className="text-emerald-300">fn_claim_food_batch</code> enforces <code className="text-emerald-300">SELECT ... FOR UPDATE</code> to atomically eliminate race conditions during concurrent food bank claims.
              </p>
            </div>

            <div className="border-l-2 border-blue-500 pl-4">
              <h4 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-blue-400" />
                AI Vector Embeddings (<code className="text-blue-300">pgvector</code>)
              </h4>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Dense 384-dimensional embeddings generated with <code className="text-blue-300">all-MiniLM-L6-v2</code> indexed via PostgreSQL HNSW cosine distance (<code className="text-blue-300">&lt;=&gt;</code>) for sub-2ms semantic search.
              </p>
            </div>

            <div className="border-l-2 border-purple-500 pl-4">
              <h4 className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
                Analytical SQL Views & Triggers
              </h4>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Automated database triggers populate <code className="text-purple-300">LOGS</code>, while analytical views aggregate donor efficiency and food bank capacity using subqueries.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
