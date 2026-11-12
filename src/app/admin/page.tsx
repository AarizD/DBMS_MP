'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, 
  BarChart3, 
  Trash2, 
  CheckCircle2, 
  RefreshCw, 
  Activity, 
  Building2, 
  HeartHandshake, 
  PackageCheck,
  AlertOctagon
} from 'lucide-react';

export default function AdminDashboard() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sweeping, setSweeping] = useState(false);
  const [sweepResult, setSweepResult] = useState<string | null>(null);

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/login');
    }
  }, [authStatus, router]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load admin stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      loadData();
    }
  }, [session]);

  const handleSweepExpiry = async () => {
    setSweeping(true);
    setSweepResult(null);
    try {
      const res = await fetch('/api/admin/sweep-expiry', { method: 'POST' });
      const json = await res.json();
      if (res.ok) {
        setSweepResult(
          `Sweeper executed! ${json.batchesExpiredCount} batches expired, ${json.totalQuantityWasted} units transferred to waste audit.`
        );
        loadData();
      } else {
        setSweepResult(`Error: ${json.error}`);
      }
    } catch (err: any) {
      setSweepResult(`Failed: ${err?.message}`);
    } finally {
      setSweeping(false);
    }
  };

  if (authStatus === 'loading' || loading) {
    return (
      <div className="max-w-7xl mx-auto p-6 sm:p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3 text-slate-500">
          <span className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
          <span>Loading admin analytics...</span>
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
          This portal requires System Administrator privileges. Please sign in with an Admin account.
        </p>
      </div>
    );
  }

  const kpis = data?.kpis || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <span className="p-2 bg-purple-100 text-purple-800 rounded-lg">
            <ShieldCheck className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              System Administration & Analytics
            </h1>
            <p className="text-xs text-slate-500">
              Platform-wide views, audit trails, and concurrency verification
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-sm font-medium transition-colors"
            title="Refresh Analytics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleSweepExpiry}
            disabled={sweeping}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-sm disabled:opacity-50"
          >
            {sweeping ? (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5 text-amber-400" />
            )}
            Run Daily Expiry Sweeper
          </button>
        </div>
      </div>

      {sweepResult && (
        <div className="my-4 p-3 rounded-lg bg-purple-50 border border-purple-200 text-purple-900 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-purple-600 flex-shrink-0" />
          <span>{sweepResult}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 my-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Total Batches Donated
          </div>
          <div className="text-2xl font-black text-slate-900">{kpis.total_batches || 0}</div>
          <div className="text-xs text-slate-500 mt-1">{kpis.total_donated_units || 0} total units</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Food Rescued (Delivered)
          </div>
          <div className="text-2xl font-black text-emerald-600">{kpis.total_rescued_units || 0}</div>
          <div className="text-xs text-emerald-700 mt-1 font-medium">Successfully distributed</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Food Wasted (Logged)
          </div>
          <div className="text-2xl font-black text-red-600">{kpis.total_wasted_units || 0}</div>
          <div className="text-xs text-red-700 mt-1 font-medium">Recorded in waste audits</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Inbound Active Claims
          </div>
          <div className="text-2xl font-black text-blue-600">{kpis.active_claims || 0}</div>
          <div className="text-xs text-blue-700 mt-1 font-medium">Pending or in-transit</div>
        </div>
      </div>

      {/* Two-Column Analytics Views */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 my-6">
        {/* Donor Efficiency Table (view_donor_efficiency) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-emerald-600" />
              view_donor_efficiency
            </h2>
            <span className="text-[11px] font-mono text-slate-400">Aggregated via SQL Subqueries</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Donor Name</th>
                  <th className="py-2.5 px-3">Batches</th>
                  <th className="py-2.5 px-3">Rescued</th>
                  <th className="py-2.5 px-3">Wasted</th>
                  <th className="py-2.5 px-3">Efficiency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.donorEfficiency?.map((d: any) => (
                  <tr key={d.donator_id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{d.donator_name}</td>
                    <td className="py-2.5 px-3">{d.total_batches_donated}</td>
                    <td className="py-2.5 px-3 font-bold text-emerald-600">{d.total_units_rescued}</td>
                    <td className="py-2.5 px-3 font-bold text-red-500">{d.total_units_wasted}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700">
                        {d.rescue_efficiency_pct}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Food Bank Utilization (view_food_bank_utilization) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <HeartHandshake className="w-4 h-4 text-blue-600" />
              view_food_bank_utilization
            </h2>
            <span className="text-[11px] font-mono text-slate-400">Correlated Inbound Calculations</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Food Bank</th>
                  <th className="py-2.5 px-3">Capacity</th>
                  <th className="py-2.5 px-3">Inbound Units</th>
                  <th className="py-2.5 px-3">Available Cap</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data?.bankUtilization?.map((b: any) => (
                  <tr key={b.food_bank_id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{b.food_bank_name}</td>
                    <td className="py-2.5 px-3 font-mono">{b.storage_capacity_kg} kg</td>
                    <td className="py-2.5 px-3 font-bold text-blue-600">{b.inbound_claim_units}</td>
                    <td className="py-2.5 px-3 font-bold text-emerald-600">
                      {b.estimated_available_capacity_kg} kg
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Live Audit Trail (LOGS Table) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden my-6">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-purple-600" />
            Live Database Audit Trail (LOGS Table)
          </h2>
          <span className="text-[11px] text-slate-400">Trigger & Procedure Generated Events</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
              <tr>
                <th className="py-2.5 px-3">ID</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Entity</th>
                <th className="py-2.5 px-3">Reference</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {data?.logs?.map((l: any) => (
                <tr key={l.log_id} className="hover:bg-slate-50/70">
                  <td className="py-2.5 px-3 font-bold text-slate-400">#{l.log_id}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                      {l.action}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">{l.entity_type}</td>
                  <td className="py-2.5 px-3 text-slate-500">#{l.entity_reference}</td>
                  <td className="py-2.5 px-3 font-sans text-xs text-slate-800 truncate max-w-md">
                    {l.description}
                  </td>
                  <td className="py-2.5 px-3 text-[11px] text-slate-400">
                    {new Date(l.action_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

