'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  HeartHandshake, 
  AlertTriangle, 
  Package, 
  Clock, 
  CheckCircle2, 
  RefreshCw, 
  X,
  Search,
  MapPin,
  ClipboardList
} from 'lucide-react';

interface AvailableBatch {
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
}

interface ExpiringBatch {
  batch_id: number;
  food_name: string;
  category: string;
  unit: string;
  available_quantity: number;
  days_until_expiry: number;
  urgency_level: string;
  donator_name: string;
  donator_phone: string;
}

interface Claim {
  claim_id: number;
  food_name: string;
  category: string;
  unit: string;
  quantity_claimed: number;
  claim_date: string;
  status: string;
  donator_name: string;
}

export default function FoodBankPortal() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'inventory' | 'claims'>('inventory');
  const [availableBatches, setAvailableBatches] = useState<AvailableBatch[]>([]);
  const [expiringSoon, setExpiringSoon] = useState<ExpiringBatch[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Claim Modal
  const [claimingBatch, setClaimingBatch] = useState<AvailableBatch | null>(null);
  const [claimQty, setClaimQty] = useState('');
  const [pickupRequired, setPickupRequired] = useState(false);
  const [claimSubmitting, setClaimSubmitting] = useState(false);
  const [claimResult, setClaimResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/login');
    }
  }, [authStatus, router]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [invRes, claimsRes] = await Promise.all([
        fetch('/api/food-bank/inventory'),
        fetch('/api/food-bank/claims'),
      ]);

      if (invRes.ok && claimsRes.ok) {
        const invData = await invRes.json();
        const claimsData = await claimsRes.json();
        setAvailableBatches(invData.available || []);
        setExpiringSoon(invData.expiringSoon || []);
        setClaims(claimsData || []);
      }
    } catch (err) {
      console.error('Failed to load food bank data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      loadData();
    }
  }, [session]);

  const handleClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimingBatch) return;

    setClaimSubmitting(true);
    setClaimResult(null);

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
        throw new Error(data.error || 'Failed to claim batch');
      }

      setClaimResult({
        type: 'success',
        text: `Claim #${data.claimId} placed! Stored procedure updated stock atomically.`,
      });

      setTimeout(() => {
        setClaimingBatch(null);
        setClaimResult(null);
        setClaimQty('');
        loadData();
      }, 1200);
    } catch (err: any) {
      setClaimResult({ type: 'error', text: err?.message || 'Claim failed' });
    } finally {
      setClaimSubmitting(false);
    }
  };

  const categories = ['ALL', 'BAKERY', 'DAIRY', 'PRODUCE', 'PREPARED_MEALS', 'CANNED_GOODS', 'PACKAGED_SNACKS'];

  const filteredBatches = availableBatches.filter((b) => {
    const matchesSearch =
      b.food_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.donator_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || b.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (authStatus === 'loading' || loading) {
    return (
      <div className="max-w-7xl mx-auto p-6 sm:p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3 text-slate-500">
          <span className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>Loading Food Bank portal...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <span className="p-2 bg-blue-100 text-blue-800 rounded-lg">
            <HeartHandshake className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              {session?.user?.org || 'Food Bank & Shelter Portal'}
            </h1>
            <p className="text-xs text-slate-500">
              Welcome, <span className="font-semibold">{session?.user?.name}</span> ({session?.user?.email})
            </p>
          </div>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'inventory'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Available Surplus ({availableBatches.length})
          </button>
          <button
            onClick={() => setActiveTab('claims')}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'claims'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            My Claims ({claims.length})
          </button>
          <button
            onClick={loadData}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-sm font-medium transition-colors"
            title="Refresh Inventory"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {activeTab === 'inventory' ? (
        <>
          {/* Urgent Distress Banner (Expiring <= 48 Hours) */}
          {expiringSoon.length > 0 && (
            <div className="my-6 p-4 rounded-xl border border-amber-300 bg-amber-50/80 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-amber-900 font-extrabold text-sm uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Urgent Food Rescue Alerts (Expiring in ≤ 48 Hours)
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                  {expiringSoon.length} Batches in Distress
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {expiringSoon.map((b) => (
                  <div
                    key={b.batch_id}
                    className="p-3 bg-white rounded-lg border border-amber-200 shadow-xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                          {b.urgency_level}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-600">
                          {b.available_quantity} {b.unit}
                        </span>
                      </div>
                      <div className="font-bold text-slate-900 text-sm mt-1.5 truncate">
                        {b.food_name}
                      </div>
                      <div className="text-xs text-slate-500 truncate">Donor: {b.donator_name}</div>
                    </div>
                    <button
                      onClick={() => {
                        const target = availableBatches.find((ab) => ab.batch_id === b.batch_id);
                        if (target) setClaimingBatch(target);
                      }}
                      className="mt-3 w-full py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold transition-colors"
                    >
                      Fast Claim
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search & Category Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 my-6">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search food item or donor name..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedCategory(c)}
                  className={`px-2.5 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors ${
                    selectedCategory === c
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {c.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Available Batches Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBatches.map((b) => (
              <div
                key={b.batch_id}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-blue-200 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                      {b.category}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {b.days_until_expiry}d left
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-base mt-2">{b.food_name}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-1">{b.storage_condition}</p>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Available Stock:</span>
                      <span className="font-extrabold text-slate-900">
                        {b.available_quantity} {b.unit}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Donor:</span>
                      <span className="font-semibold text-slate-700 truncate max-w-[170px]">
                        {b.donator_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{b.donator_city}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setClaimingBatch(b);
                    setClaimQty(String(Math.min(25, b.available_quantity)));
                  }}
                  className="mt-5 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <HeartHandshake className="w-4 h-4" />
                  Claim Batch
                </button>
              </div>
            ))}
          </div>

          {filteredBatches.length === 0 && (
            <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
              <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700">No surplus food batches found</p>
              <p className="text-xs text-slate-400 mt-1">Try resetting your search query or filters</p>
            </div>
          )}
        </>
      ) : (
        /* My Claims Tab */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden my-6">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-blue-600" />
              Your Claim Requests
            </h2>
            <span className="text-xs text-slate-500 font-mono">{claims.length} total</span>
          </div>

          {claims.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <HeartHandshake className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-700">No claims placed yet</p>
              <p className="text-xs text-slate-400 mt-1">Browse available inventory and claim food</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Claim ID</th>
                    <th className="py-3 px-4">Food Item</th>
                    <th className="py-3 px-4">Quantity Claimed</th>
                    <th className="py-3 px-4">Donor Outlet</th>
                    <th className="py-3 px-4">Claim Date</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {claims.map((c) => (
                    <tr key={c.claim_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-500">
                        #{c.claim_id}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{c.food_name}</div>
                        <div className="text-xs text-slate-400">{c.category}</div>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {c.quantity_claimed} {c.unit}
                      </td>
                      <td className="py-3 px-4 text-xs font-medium text-slate-700">{c.donator_name}</td>
                      <td className="py-3 px-4 text-xs font-mono text-slate-500">
                        {new Date(c.claim_date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            c.status === 'DELIVERED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : c.status === 'APPROVED' || c.status === 'IN_TRANSIT'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
              <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Claim Food Batch</h3>
                <p className="text-xs text-slate-500">Protected by pessimistic database row locks</p>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60 mb-4 text-xs space-y-1">
              <div className="font-bold text-slate-900 text-sm">{claimingBatch.food_name}</div>
              <div className="text-slate-600">Donor: {claimingBatch.donator_name}</div>
              <div className="text-slate-600">
                Available Stock: <span className="font-bold">{claimingBatch.available_quantity} {claimingBatch.unit}</span>
              </div>
            </div>

            {claimResult && (
              <div
                className={`mb-4 p-3 rounded-lg text-sm flex items-start gap-2 ${
                  claimResult.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {claimResult.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                )}
                <span>{claimResult.text}</span>
              </div>
            )}

            <form onSubmit={handleClaimSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Claim Quantity ({claimingBatch.unit}) *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={claimingBatch.available_quantity}
                  value={claimQty}
                  onChange={(e) => setClaimQty(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Must be between 1 and {claimingBatch.available_quantity}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pickup"
                  checked={pickupRequired}
                  onChange={(e) => setPickupRequired(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <label htmlFor="pickup" className="text-xs text-slate-700 font-medium">
                  We will arrange self-pickup from donor location
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
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {claimSubmitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Locking & Claiming...
                    </>
                  ) : (
                    <>
                      <HeartHandshake className="w-4 h-4" />
                      Confirm Claim
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

