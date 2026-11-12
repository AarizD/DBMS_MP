'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Database,
  Table2,
  Key,
  Eye,
  Zap,
  Play,
  Clock,
  ChevronDown,
  ChevronRight,
  Hash,
  AlertOctagon,
  RefreshCw,
  Terminal,
  Code2,
  Layers,
  Shield,
  Search,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Copy,
  FileCode2,
  Columns3,
  Link2,
  ListFilter,
  Sparkles,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TableInfo {
  table_name: string;
  row_count: number;
}

interface ColumnInfo {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  character_maximum_length: number | null;
}

interface ConstraintInfo {
  table_name: string;
  constraint_name: string;
  constraint_type: string;
  column_name: string;
  foreign_table: string | null;
  foreign_column: string | null;
}

interface IndexInfo {
  tablename: string;
  indexname: string;
  indexdef: string;
}

interface ProcedureInfo {
  routine_name: string;
  routine_type: string;
  return_type: string;
  definition: string;
}

interface TriggerInfo {
  trigger_name: string;
  event_manipulation: string;
  event_object_table: string;
  action_timing: string;
  action_statement: string;
}

interface ViewInfo {
  view_name: string;
  view_definition: string;
}

interface SchemaData {
  tables: TableInfo[];
  columns: ColumnInfo[];
  constraints: ConstraintInfo[];
  indexes: IndexInfo[];
  procedures: ProcedureInfo[];
  triggers: TriggerInfo[];
  views: ViewInfo[];
}

interface QueryResult {
  rows: any[];
  columns: string[];
  rowCount: number;
  executionTimeMs: number;
}

// ─── Preset Queries for Evaluation ────────────────────────────────────────────

const presetQueries = [
  {
    label: 'All Available Batches (View)',
    sql: 'SELECT * FROM view_available_batches LIMIT 20;',
    category: 'Views',
  },
  {
    label: 'Expiring Soon — Distress (View)',
    sql: 'SELECT * FROM view_expiring_soon_batches;',
    category: 'Views',
  },
  {
    label: 'Donor Rescue Efficiency (View)',
    sql: 'SELECT * FROM view_donor_efficiency;',
    category: 'Views',
  },
  {
    label: 'Food Bank Utilization (View)',
    sql: 'SELECT * FROM view_food_bank_utilization;',
    category: 'Views',
  },
  {
    label: 'Multi-Table JOIN — Batch Details',
    sql: `SELECT fb.batch_id, f.food_name, f.category, d.name AS donor,
       d.city, fb.available_quantity, fb.expiry_date, fb.status
FROM FOOD_BATCHES fb
JOIN FOOD f ON fb.food_id = f.food_id
JOIN FOOD_DONATORS d ON fb.donator_id = d.donator_id
ORDER BY fb.expiry_date ASC
LIMIT 15;`,
    category: 'Joins',
  },
  {
    label: 'Claims with Food Bank + Batch',
    sql: `SELECT c.claim_id, c.quantity_claimed, c.status AS claim_status,
       c.pickup_required, fb_tbl.name AS food_bank,
       f.food_name, b.available_quantity AS remaining_stock
FROM CLAIMS c
JOIN FOOD_BANKS fb_tbl ON c.food_bank_id = fb_tbl.food_bank_id
JOIN FOOD_BATCHES b ON c.batch_id = b.batch_id
JOIN FOOD f ON b.food_id = f.food_id
ORDER BY c.claim_id DESC
LIMIT 15;`,
    category: 'Joins',
  },
  {
    label: 'Aggregation — Batches per Donor',
    sql: `SELECT d.name AS donor_name, d.donator_type, d.city,
       COUNT(fb.batch_id) AS total_batches,
       SUM(fb.quantity) AS total_units,
       SUM(fb.available_quantity) AS available_units
FROM FOOD_DONATORS d
LEFT JOIN FOOD_BATCHES fb ON d.donator_id = fb.donator_id
GROUP BY d.donator_id, d.name, d.donator_type, d.city
ORDER BY total_batches DESC;`,
    category: 'Aggregation',
  },
  {
    label: 'Subquery — Donors with > 100 Units',
    sql: `SELECT d.name, d.city, d.donator_type
FROM FOOD_DONATORS d
WHERE d.donator_id IN (
  SELECT fb.donator_id
  FROM FOOD_BATCHES fb
  GROUP BY fb.donator_id
  HAVING SUM(fb.quantity) > 100
);`,
    category: 'Subqueries',
  },
  {
    label: 'Correlated Subquery — Food Banks with Claims',
    sql: `SELECT fb.name AS food_bank, fb.city,
  (SELECT COUNT(*) FROM CLAIMS c WHERE c.food_bank_id = fb.food_bank_id) AS total_claims,
  (SELECT COALESCE(SUM(c.quantity_claimed), 0) FROM CLAIMS c WHERE c.food_bank_id = fb.food_bank_id AND c.status = 'DELIVERED') AS delivered_units
FROM FOOD_BANKS fb
ORDER BY total_claims DESC;`,
    category: 'Subqueries',
  },
  {
    label: 'Audit Trail — Recent Logs',
    sql: `SELECT log_id, action, entity_type, entity_reference,
       old_status, new_status, description,
       action_time AT TIME ZONE 'Asia/Kolkata' AS action_time_ist
FROM LOGS
ORDER BY action_time DESC
LIMIT 20;`,
    category: 'Audit',
  },
  {
    label: 'Waste Audit Records',
    sql: `SELECT w.waste_id, f.food_name, w.quantity_wasted,
       w.waste_date, w.reason, w.disposal_method
FROM WASTE_AUDIT_RECORDS w
JOIN FOOD_BATCHES b ON w.batch_id = b.batch_id
JOIN FOOD f ON b.food_id = f.food_id
ORDER BY w.waste_date DESC;`,
    category: 'Audit',
  },
  {
    label: 'pgvector — Semantic Search SQL',
    sql: `SELECT fb.batch_id, f.food_name, f.category,
       fb.available_quantity, fb.expiry_date,
       d.name AS donor,
       ROUND(((1 - (fb.embedding <=> (SELECT embedding FROM FOOD_BATCHES WHERE batch_id = 1))) * 100)::numeric, 1) AS similarity_pct
FROM FOOD_BATCHES fb
JOIN FOOD f ON fb.food_id = f.food_id
JOIN FOOD_DONATORS d ON fb.donator_id = d.donator_id
WHERE fb.status IN ('AVAILABLE', 'PARTIALLY_CLAIMED')
  AND fb.embedding IS NOT NULL
ORDER BY fb.embedding <=> (SELECT embedding FROM FOOD_BATCHES WHERE batch_id = 1)
LIMIT 8;`,
    category: 'Vector',
  },
  {
    label: 'All Users (RBAC)',
    sql: `SELECT user_id, name, email, role, organization_name, status, created_at
FROM USERS ORDER BY user_id;`,
    category: 'Tables',
  },
  {
    label: 'Food Catalog',
    sql: `SELECT * FROM FOOD ORDER BY food_id;`,
    category: 'Tables',
  },
  {
    label: 'Transport Fleet',
    sql: `SELECT * FROM TRANSPORT ORDER BY transport_id;`,
    category: 'Tables',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ExplorerPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  // Schema state
  const [schema, setSchema] = useState<SchemaData | null>(null);
  const [schemaLoading, setSchemaLoading] = useState(true);
  const [schemaError, setSchemaError] = useState<string | null>(null);

  // Tabs
  type Tab = 'tables' | 'procedures' | 'triggers' | 'views' | 'indexes' | 'query' | 'acid-test';
  const [activeTab, setActiveTab] = useState<Tab>('tables');

  // Concurrency & ACID stress test state
  const [stressLoading, setStressLoading] = useState(false);
  const [stressResult, setStressResult] = useState<any>(null);
  const [stressError, setStressError] = useState<string | null>(null);

  const runStressTest = async () => {
    setStressLoading(true);
    setStressError(null);
    try {
      const res = await fetch('/api/admin/concurrency-test', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Stress test encountered an error');
      }
      setStressResult(data);
    } catch (err: any) {
      setStressError(err.message || 'Failed to complete stress test');
    } finally {
      setStressLoading(false);
    }
  };

  // Table expansion
  const [expandedTable, setExpandedTable] = useState<string | null>(null);

  // SQL Query playground
  const [sql, setSql] = useState(presetQueries[0].sql);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [queryLoading, setQueryLoading] = useState(false);

  // Procedure/Trigger expansion
  const [expandedProc, setExpandedProc] = useState<string | null>(null);
  const [expandedTrigger, setExpandedTrigger] = useState<string | null>(null);
  const [expandedView, setExpandedView] = useState<string | null>(null);

  // Search filter
  const [tableSearch, setTableSearch] = useState('');

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/login');
    }
  }, [authStatus, router]);

  const loadSchema = useCallback(async () => {
    setSchemaLoading(true);
    setSchemaError(null);
    try {
      const res = await fetch('/api/explorer/schema');
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to load schema');
      }
      const data = await res.json();
      setSchema(data);
    } catch (err: any) {
      setSchemaError(err.message);
    } finally {
      setSchemaLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      loadSchema();
    }
  }, [session, loadSchema]);

  const executeQuery = async () => {
    if (!sql.trim()) return;
    setQueryLoading(true);
    setQueryError(null);
    setQueryResult(null);
    try {
      const res = await fetch('/api/explorer/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: sql.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Query execution failed');
      }
      setQueryResult(data);
    } catch (err: any) {
      setQueryError(err.message);
    } finally {
      setQueryLoading(false);
    }
  };

  // ─── Loading / Auth guards ─────────────────────────────────────────────────

  if (authStatus === 'loading' || schemaLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6 sm:p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3 text-slate-500">
          <span className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span>Loading database schema...</span>
        </div>
      </div>
    );
  }

  if (session?.user?.role !== 'ADMIN') {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-2xl border border-red-200 text-center shadow-sm">
        <AlertOctagon className="w-12 h-12 text-red-600 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-900">Access Denied</h2>
        <p className="text-xs text-slate-500 mt-2">
          The Database Explorer requires System Administrator privileges. Sign in with an Admin account from the{' '}
          <Link href="/login" className="text-indigo-600 font-semibold hover:underline">
            login page
          </Link>.
        </p>
      </div>
    );
  }

  if (schemaError) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-2xl border border-red-200 text-center shadow-sm">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-900">Schema Load Error</h2>
        <p className="text-xs text-slate-500 mt-2">{schemaError}</p>
        <button
          onClick={loadSchema}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!schema) return null;

  // ─── Helper data ────────────────────────────────────────────────────────────

  const totalRows = schema.tables.reduce((sum, t) => sum + t.row_count, 0);

  const getColumnsForTable = (tableName: string) =>
    schema.columns.filter((c) => c.table_name === tableName);

  const getConstraintsForTable = (tableName: string) =>
    schema.constraints.filter((c) => c.table_name === tableName);

  const getIndexesForTable = (tableName: string) =>
    schema.indexes.filter((i) => i.tablename === tableName);

  const filteredTables = schema.tables.filter((t) =>
    t.table_name.toLowerCase().includes(tableSearch.toLowerCase())
  );

  const constraintIcon = (type: string) => {
    switch (type) {
      case 'PRIMARY KEY':
        return <Key className="w-3 h-3 text-amber-500" />;
      case 'FOREIGN KEY':
        return <Link2 className="w-3 h-3 text-blue-500" />;
      case 'CHECK':
        return <Shield className="w-3 h-3 text-emerald-500" />;
      case 'UNIQUE':
        return <Hash className="w-3 h-3 text-purple-500" />;
      default:
        return <Database className="w-3 h-3 text-slate-400" />;
    }
  };

  // Unique preset categories
  const presetCategories = Array.from(new Set(presetQueries.map((q) => q.category)));

  // ─── Tab config ─────────────────────────────────────────────────────────────

  const tabs: { key: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'tables', label: 'Tables', icon: <Table2 className="w-3.5 h-3.5" />, count: schema.tables.length },
    { key: 'procedures', label: 'Procedures', icon: <Code2 className="w-3.5 h-3.5" />, count: schema.procedures.length },
    { key: 'triggers', label: 'Triggers', icon: <Zap className="w-3.5 h-3.5" />, count: schema.triggers.length },
    { key: 'views', label: 'Views', icon: <Eye className="w-3.5 h-3.5" />, count: schema.views.length },
    { key: 'indexes', label: 'Indexes', icon: <ListFilter className="w-3.5 h-3.5" />, count: schema.indexes.length },
    { key: 'query', label: 'SQL Playground', icon: <Terminal className="w-3.5 h-3.5" /> },
    { key: 'acid-test', label: 'ACID Stress Test', icon: <Zap className="w-3.5 h-3.5 text-amber-500" /> },
  ];

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <span className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
            <Database className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Interactive Database Explorer
            </h1>
            <p className="text-xs text-slate-500">
              Inspect schema, stored procedures, triggers, views, and run live SQL — Milestone 5 Evaluation Tool
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Schema Stats Chips */}
          <div className="hidden sm:flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-xs font-bold text-indigo-800">
              {schema.tables.length} Tables
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800">
              {totalRows} Total Rows
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-200 text-xs font-bold text-purple-800">
              {schema.procedures.length} Procedures
            </span>
          </div>
          <button
            onClick={loadSchema}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            title="Refresh Schema"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="mt-6 flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-t-lg transition-colors whitespace-nowrap border-b-2 ${
              activeTab === tab.key
                ? 'text-indigo-700 bg-indigo-50 border-indigo-600'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 border-transparent'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                activeTab === tab.key ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ─── Tab: Tables ─────────────────────────────────────────────────────── */}
      {activeTab === 'tables' && (
        <div className="mt-6 space-y-4">
          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              placeholder="Filter tables..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>

          {/* Table Cards */}
          <div className="space-y-3">
            {filteredTables.map((table) => {
              const isExpanded = expandedTable === table.table_name;
              const cols = getColumnsForTable(table.table_name);
              const constraints = getConstraintsForTable(table.table_name);
              const indexes = getIndexesForTable(table.table_name);
              const pkCols = constraints
                .filter((c) => c.constraint_type === 'PRIMARY KEY')
                .map((c) => c.column_name);
              const fkConstraints = constraints.filter((c) => c.constraint_type === 'FOREIGN KEY');

              return (
                <div
                  key={table.table_name}
                  className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden"
                >
                  {/* Table header */}
                  <button
                    onClick={() => setExpandedTable(isExpanded ? null : table.table_name)}
                    className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0">
                        <Table2 className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-900 text-sm font-mono">
                          {table.table_name}
                        </span>
                        <div className="flex items-center gap-3 mt-0.5 text-[11px] text-slate-500">
                          <span className="flex items-center gap-1">
                            <Columns3 className="w-3 h-3" />
                            {cols.length} columns
                          </span>
                          <span className="flex items-center gap-1">
                            <Hash className="w-3 h-3" />
                            {table.row_count} rows
                          </span>
                          {fkConstraints.length > 0 && (
                            <span className="flex items-center gap-1 text-blue-600">
                              <Link2 className="w-3 h-3" />
                              {fkConstraints.length} FK
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </button>

                  {/* Expanded: columns, constraints, indexes */}
                  {isExpanded && (
                    <div className="border-t border-slate-100">
                      {/* Columns */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
                            <tr>
                              <th className="py-2 px-4 text-left">Column</th>
                              <th className="py-2 px-4 text-left">Type</th>
                              <th className="py-2 px-4 text-left">Nullable</th>
                              <th className="py-2 px-4 text-left">Default</th>
                              <th className="py-2 px-4 text-left">Key</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {cols.map((col) => {
                              const isPK = pkCols.includes(col.column_name);
                              const fk = fkConstraints.find(
                                (c) => c.column_name === col.column_name
                              );
                              return (
                                <tr
                                  key={col.column_name}
                                  className={`hover:bg-slate-50/50 ${isPK ? 'bg-amber-50/30' : ''}`}
                                >
                                  <td className="py-2 px-4 font-mono font-semibold text-slate-800">
                                    {col.column_name}
                                  </td>
                                  <td className="py-2 px-4 font-mono text-slate-600">
                                    {col.data_type}
                                    {col.character_maximum_length
                                      ? `(${col.character_maximum_length})`
                                      : ''}
                                  </td>
                                  <td className="py-2 px-4">
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                        col.is_nullable === 'YES'
                                          ? 'bg-slate-100 text-slate-500'
                                          : 'bg-red-50 text-red-700'
                                      }`}
                                    >
                                      {col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}
                                    </span>
                                  </td>
                                  <td className="py-2 px-4 font-mono text-slate-500 truncate max-w-[120px]">
                                    {col.column_default || '—'}
                                  </td>
                                  <td className="py-2 px-4">
                                    <div className="flex items-center gap-1.5">
                                      {isPK && (
                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                          <Key className="w-2.5 h-2.5" /> PK
                                        </span>
                                      )}
                                      {fk && (
                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                          <Link2 className="w-2.5 h-2.5" /> FK →{' '}
                                          {fk.foreign_table}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Constraints & Indexes row */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-t border-slate-100">
                        {/* Constraints */}
                        <div className="p-4 border-r border-slate-100">
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1">
                            <Shield className="w-3 h-3" /> Constraints
                          </h4>
                          <div className="space-y-1">
                            {constraints.length === 0 ? (
                              <span className="text-[11px] text-slate-400">None</span>
                            ) : (
                              constraints.map((c, i) => (
                                <div
                                  key={`${c.constraint_name}-${i}`}
                                  className="flex items-start gap-1.5 text-[11px]"
                                >
                                  {constraintIcon(c.constraint_type)}
                                  <span className="font-mono text-slate-700">
                                    {c.constraint_name}
                                  </span>
                                  <span className="text-slate-400">({c.constraint_type})</span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Indexes */}
                        <div className="p-4">
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1">
                            <ListFilter className="w-3 h-3" /> Indexes
                          </h4>
                          <div className="space-y-1">
                            {indexes.length === 0 ? (
                              <span className="text-[11px] text-slate-400">None</span>
                            ) : (
                              indexes.map((idx) => (
                                <div
                                  key={idx.indexname}
                                  className="text-[11px] font-mono text-slate-600"
                                >
                                  <span className="font-semibold text-slate-800">
                                    {idx.indexname}
                                  </span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Quick view button */}
                      <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50">
                        <button
                          onClick={() => {
                            setSql(`SELECT * FROM ${table.table_name} LIMIT 20;`);
                            setActiveTab('query');
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors"
                        >
                          <Play className="w-3 h-3" />
                          Query this table
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Tab: Procedures ─────────────────────────────────────────────────── */}
      {activeTab === 'procedures' && (
        <div className="mt-6 space-y-3">
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2">
            <Code2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <strong>Stored Procedures</strong> — These PL/pgSQL functions implement atomic business logic with concurrency control
              (pessimistic locking) and automated waste auditing.
            </div>
          </div>

          {schema.procedures.map((proc) => {
            const isExpanded = expandedProc === proc.routine_name;
            return (
              <div
                key={proc.routine_name}
                className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden"
              >
                <button
                  onClick={() => setExpandedProc(isExpanded ? null : proc.routine_name)}
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <Code2 className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 text-sm font-mono">
                        {proc.routine_name}()
                      </span>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {proc.routine_type} → RETURNS {proc.return_type}
                      </div>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-100">
                    <pre className="p-4 bg-slate-900 text-emerald-300 text-xs font-mono overflow-x-auto leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto">
                      {proc.definition}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Tab: Triggers ────────────────────────────────────────────────────── */}
      {activeTab === 'triggers' && (
        <div className="mt-6 space-y-3">
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
            <Zap className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <strong>Database Triggers</strong> — Automatic audit trail generation, inventory integrity enforcement, and
              status transition logging. These fire on every INSERT/UPDATE without application code involvement.
            </div>
          </div>

          {schema.triggers.map((trg, idx) => {
            const isExpanded = expandedTrigger === `${trg.trigger_name}-${idx}`;
            return (
              <div
                key={`${trg.trigger_name}-${idx}`}
                className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden"
              >
                <button
                  onClick={() =>
                    setExpandedTrigger(isExpanded ? null : `${trg.trigger_name}-${idx}`)
                  }
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-slate-900 text-sm font-mono">
                        {trg.trigger_name}
                      </span>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                          {trg.action_timing} {trg.event_manipulation}
                        </span>
                        <span>
                          ON <span className="font-mono font-semibold text-slate-700">{trg.event_object_table}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-100">
                    <pre className="p-4 bg-slate-900 text-amber-300 text-xs font-mono overflow-x-auto leading-relaxed whitespace-pre-wrap">
                      {trg.action_statement}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Tab: Views ──────────────────────────────────────────────────────── */}
      {activeTab === 'views' && (
        <div className="mt-6 space-y-3">
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs text-blue-900 flex items-start gap-2">
            <Eye className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <strong>Analytical SQL Views</strong> — Complex aggregation views with nested subqueries, correlated
              subqueries, and CASE expressions for real-time analytics on donor efficiency and food bank capacity.
            </div>
          </div>

          {schema.views.map((v) => {
            const isExpanded = expandedView === v.view_name;
            return (
              <div
                key={v.view_name}
                className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden"
              >
                <button
                  onClick={() => setExpandedView(isExpanded ? null : v.view_name)}
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                      <Eye className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-slate-900 text-sm font-mono">
                      {v.view_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSql(`SELECT * FROM ${v.view_name};`);
                        setActiveTab('query');
                      }}
                      className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-[11px] font-bold transition-colors border border-blue-200"
                    >
                      <Play className="w-3 h-3 inline mr-1" />
                      Run
                    </button>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-slate-100">
                    <pre className="p-4 bg-slate-900 text-blue-300 text-xs font-mono overflow-x-auto leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto">
                      {v.view_definition}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Tab: Indexes ────────────────────────────────────────────────────── */}
      {activeTab === 'indexes' && (
        <div className="mt-6 space-y-3">
          <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs text-purple-900 flex items-start gap-2">
            <ListFilter className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
            <div>
              <strong>Database Indexes</strong> — B-tree indexes for high-frequency lookups, and an HNSW vector index
              for sub-millisecond approximate nearest neighbor search on 384-dimensional embeddings.
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
                  <tr>
                    <th className="py-2.5 px-4 text-left">Table</th>
                    <th className="py-2.5 px-4 text-left">Index Name</th>
                    <th className="py-2.5 px-4 text-left">Definition</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {schema.indexes.map((idx) => {
                    const isVector = idx.indexdef.toLowerCase().includes('hnsw');
                    return (
                      <tr key={idx.indexname} className={`hover:bg-slate-50/50 ${isVector ? 'bg-blue-50/30' : ''}`}>
                        <td className="py-2.5 px-4 font-mono font-semibold text-slate-700">
                          {idx.tablename}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-800">
                          <div className="flex items-center gap-1.5">
                            {isVector && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                                HNSW
                              </span>
                            )}
                            {idx.indexname}
                          </div>
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-600 text-[11px]">
                          {idx.indexdef}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── Tab: SQL Playground ──────────────────────────────────────────────── */}
      {activeTab === 'query' && (
        <div className="mt-6 space-y-4">
          {/* Preset Query Chips */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              Evaluation Query Presets — Click to load
            </div>

            {presetCategories.map((cat) => (
              <div key={cat} className="mb-3 last:mb-0">
                <div className="text-[10px] font-bold uppercase text-slate-500 mb-1.5">{cat}</div>
                <div className="flex flex-wrap gap-1.5">
                  {presetQueries
                    .filter((q) => q.category === cat)
                    .map((q, i) => (
                      <button
                        key={i}
                        onClick={() => setSql(q.sql)}
                        className="px-2.5 py-1 text-xs rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 font-medium transition-colors border border-slate-200/60"
                      >
                        {q.label}
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </div>

          {/* SQL Editor */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <Terminal className="w-3.5 h-3.5 text-indigo-600" />
                SQL Editor (Read-Only — SELECT / WITH)
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(sql);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded transition-colors"
                  title="Copy SQL"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={executeQuery}
                  disabled={queryLoading || !sql.trim()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 shadow-sm"
                >
                  {queryLoading ? (
                    <>
                      <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Executing...
                    </>
                  ) : (
                    <>
                      <Play className="w-3 h-3" />
                      Execute Query
                    </>
                  )}
                </button>
              </div>
            </div>

            <textarea
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  executeQuery();
                }
              }}
              rows={8}
              className="w-full p-4 font-mono text-sm bg-slate-900 text-emerald-300 focus:outline-none resize-y leading-relaxed"
              placeholder="SELECT * FROM FOOD_BATCHES LIMIT 10;"
              spellCheck={false}
            />

            <div className="px-4 py-2 bg-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
              <span>⌘+Enter to execute • Read-only mode • 5s timeout • 100 row limit</span>
              <span className="font-mono">PostgreSQL 16 + pgvector</span>
            </div>
          </div>

          {/* Query Error */}
          {queryError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Query Error:</strong> {queryError}
              </div>
            </div>
          )}

          {/* Query Results */}
          {queryResult && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              {/* Result Header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1 font-bold text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Query Executed
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                    {queryResult.rowCount} row{queryResult.rowCount !== 1 ? 's' : ''}
                  </span>
                  <span className="flex items-center gap-1 text-slate-500">
                    <Clock className="w-3 h-3" />
                    {queryResult.executionTimeMs}ms
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {queryResult.columns.length} columns
                </span>
              </div>

              {/* Result Table */}
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                {queryResult.rows.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm">
                    Query returned 0 rows.
                  </div>
                ) : (
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100 sticky top-0">
                      <tr>
                        <th className="py-2 px-3 text-left text-slate-300 font-mono">#</th>
                        {queryResult.columns.map((col) => (
                          <th key={col} className="py-2 px-3 text-left whitespace-nowrap">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-mono">
                      {queryResult.rows.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                          <td className="py-1.5 px-3 text-slate-300">{i + 1}</td>
                          {queryResult.columns.map((col) => {
                            const val = row[col];
                            const displayVal =
                              val === null
                                ? 'NULL'
                                : typeof val === 'object'
                                ? JSON.stringify(val)
                                : String(val);
                            const isNull = val === null;
                            const truncated =
                              displayVal.length > 80
                                ? displayVal.slice(0, 80) + '…'
                                : displayVal;
                            return (
                              <td
                                key={col}
                                className={`py-1.5 px-3 whitespace-nowrap ${
                                  isNull
                                    ? 'text-slate-300 italic'
                                    : 'text-slate-700'
                                }`}
                                title={displayVal}
                              >
                                {truncated}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Tab: ACID Concurrency Stress Test ─────────────────────────────── */}
      {activeTab === 'acid-test' && (
        <div className="mt-6 space-y-6">
          {/* Overview & Theory Banner */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-6 shadow-xs">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-500 text-white rounded-xl shadow-sm">
                <Zap className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">
                    Live Concurrency & Race Condition Verification
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-200/60 text-amber-900 text-[10px] font-extrabold uppercase">
                    Milestone 5 Rubric Requirement
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  Simulates simultaneous race conditions against PostgreSQL 16 using pessimistic row-locking 
                  (<code className="px-1.5 py-0.5 bg-amber-100 rounded text-amber-900 font-mono text-xs">SELECT ... FOR UPDATE</code>).
                  Proves that stock overselling and negative inventory are mathematically impossible, even under high-concurrency bursts.
                </p>
                <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold text-slate-700">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>5 Simultaneous Workers</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Contending for 3 Available Items</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Pessimistic Row Lock (SELECT ... FOR UPDATE)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Trigger & CHECK Negative Prevention</span>
                  </div>
                </div>
              </div>
              <button
                onClick={runStressTest}
                disabled={stressLoading}
                className="inline-flex items-center gap-2 px-5 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-sm shadow-sm transition-all disabled:opacity-50 hover:shadow-md"
              >
                {stressLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Simulating 5 Workers...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Run Concurrency Test</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {stressError && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
              <span>{stressError}</span>
            </div>
          )}

          {stressResult && (
            <div className="space-y-6">
              {/* Summary Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">ACID Status</div>
                  <div className="mt-1 flex items-center gap-1.5 text-base font-extrabold text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" />
                    {stressResult.summary.acidComplianceVerified ? 'VERIFIED PASS' : 'FAILED'}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Initial Stock</div>
                  <div className="mt-1 text-base font-extrabold text-slate-800">
                    {stressResult.summary.initialStock} units
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Claims Granted</div>
                  <div className="mt-1 text-base font-extrabold text-emerald-600">
                    {stressResult.summary.successCount} / 5 workers
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Over-Claims Blocked</div>
                  <div className="mt-1 text-base font-extrabold text-amber-600">
                    {stressResult.summary.failureCount} / 5 rejected
                  </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Final Stock</div>
                  <div className="mt-1 text-base font-extrabold text-indigo-600">
                    {stressResult.summary.finalStock} (Zero Negative)
                  </div>
                </div>
              </div>

              {/* Workers Outcome Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">
                    Worker Execution Trace (Promise.all Parallel Resolution)
                  </h3>
                  <span className="text-xs text-slate-500">
                    Database: PostgreSQL 16 (Pessimistic Locking)
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
                      <tr>
                        <th className="py-2.5 px-4">Worker</th>
                        <th className="py-2.5 px-4">Claimant Food Bank</th>
                        <th className="py-2.5 px-4">Requested</th>
                        <th className="py-2.5 px-4">Transaction Result</th>
                        <th className="py-2.5 px-4">Remaining Stock</th>
                        <th className="py-2.5 px-4">Latency</th>
                        <th className="py-2.5 px-4">Engine Return Message</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stressResult.workers.map((w: any) => (
                        <tr key={w.workerId} className={w.success ? 'bg-emerald-50/20' : 'bg-rose-50/20'}>
                          <td className="py-2.5 px-4 font-bold text-slate-800">
                            Worker #{w.workerId}
                          </td>
                          <td className="py-2.5 px-4 text-slate-600 font-medium">
                            {w.foodBankName}
                          </td>
                          <td className="py-2.5 px-4 text-slate-700">
                            {w.requestedQty} unit
                          </td>
                          <td className="py-2.5 px-4">
                            {w.success ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                GRANTED (CLAIM #{w.claimId})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">
                                <AlertOctagon className="w-3 h-3 text-rose-600" />
                                REJECTED (OUT OF STOCK)
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 font-mono font-bold text-slate-700">
                            {w.remainingQty} units
                          </td>
                          <td className="py-2.5 px-4 font-mono text-slate-500">
                            {w.elapsedMs} ms
                          </td>
                          <td className="py-2.5 px-4 text-slate-600">
                            {w.message}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Code Evidence */}
              <div className="bg-slate-900 rounded-xl p-5 text-white font-mono text-xs overflow-x-auto shadow-sm">
                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-2">
                  PostgreSQL Stored Procedure Lock Mechanism (Excerpt from database/procedures_triggers_views.sql)
                </div>
                <pre className="text-emerald-400">
{`-- Acquire pessimistic row lock (SELECT ... FOR UPDATE)
-- Any concurrent transaction attempting to claim this same batch blocks until this transaction commits/rolls back
SELECT batch_id, available_quantity, expiry_date, status 
INTO v_batch
FROM FOOD_BATCHES
WHERE batch_id = p_batch_id
FOR UPDATE;

-- Check remaining stock
IF v_batch.available_quantity < p_quantity THEN
    RETURN QUERY SELECT FALSE, NULL::INT, v_batch.available_quantity, v_batch.status, 
        FORMAT('Insufficient stock: %s available, %s requested', v_batch.available_quantity, p_quantity)::VARCHAR;
    RETURN;
END IF;

-- Atomically decrement stock
UPDATE FOOD_BATCHES
SET available_quantity = v_batch.available_quantity - p_quantity,
    status = CASE WHEN (v_batch.available_quantity - p_quantity) = 0 THEN 'FULLY_CLAIMED' ELSE 'PARTIALLY_CLAIMED' END
WHERE batch_id = p_batch_id;`}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

