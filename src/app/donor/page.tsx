'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Building2, 
  Plus, 
  Clock, 
  Package, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles,
  RefreshCw,
  X
} from 'lucide-react';

interface Batch {
  batch_id: number;
  food_name: string;
  category: string;
  unit: string;
  quantity: number;
  available_quantity: number;
  donation_date: string;
  expiry_date: string;
  days_until_expiry: number;
  storage_condition: string;
  status: string;
}

interface FoodItem {
  food_id: number;
  food_name: string;
  category: string;
  unit: string;
  storage_requirement: string;
}

export default function DonorDashboard() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();

  const [batches, setBatches] = useState<Batch[]>([]);
  const [catalog, setCatalog] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [selectedFoodId, setSelectedFoodId] = useState<number | ''>('');
  const [quantity, setQuantity] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [storageCondition, setStorageCondition] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Redirect unauthorized
  useEffect(() => {
    if (authStatus === 'unauthenticated') {
      router.push('/login');
    }
  }, [authStatus, router]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [batchesRes, catalogRes] = await Promise.all([
        fetch('/api/donor/batches'),
        fetch('/api/donor/catalog'),
      ]);

      if (batchesRes.ok && catalogRes.ok) {
        const [batchesData, catalogData] = await Promise.all([
          batchesRes.json(),
          catalogRes.json(),
        ]);
        setBatches(batchesData);
        setCatalog(catalogData);
      }
    } catch (err) {
      console.error('Failed to load donor data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      loadData();
    }
  }, [session]);

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormMsg(null);

    try {
      const res = await fetch('/api/donor/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          foodId: selectedFoodId,
          quantity: parseInt(quantity, 10),
          expiryDate,
          storageCondition,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to list food batch');
      }

      setFormMsg({ type: 'success', text: 'Batch created & 384-dim AI embedding indexed!' });
      setTimeout(() => {
        setShowModal(false);
        setFormMsg(null);
        setSelectedFoodId('');
        setQuantity('');
        setExpiryDate('');
        setStorageCondition('');
        loadData();
      }, 1000);
    } catch (err: any) {
      setFormMsg({ type: 'error', text: err?.message || 'Failed to list batch' });
    } finally {
      setSubmitting(false);
    }
  };

  if (authStatus === 'loading' || loading) {
    return (
      <div className="max-w-7xl mx-auto p-6 sm:p-8 flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3 text-slate-500">
          <span className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <span>Loading donor portal...</span>
        </div>
      </div>
    );
  }

  const totalDonated = batches.reduce((acc, b) => acc + Number(b.quantity), 0);
  const activeBatches = batches.filter((b) => b.status === 'AVAILABLE' || b.status === 'PARTIALLY_CLAIMED');
  const expiringSoonCount = activeBatches.filter((b) => b.days_until_expiry <= 2).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
              <Building2 className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {session?.user?.org || 'Food Donor Portal'}
              </h1>
              <p className="text-xs text-slate-500">
                Logged in as <span className="font-semibold">{session?.user?.name}</span> ({session?.user?.email})
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-sm font-medium transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            List Surplus Food Batch
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Batches</span>
            <Package className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{activeBatches.length}</div>
          <div className="text-xs text-slate-500 mt-1">Available for food bank claims</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Expiring Soon (≤ 48h)</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-amber-600">{expiringSoonCount}</div>
          <div className="text-xs text-slate-500 mt-1">High-priority distress alert active</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Donated Units</span>
            <Sparkles className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{totalDonated}</div>
          <div className="text-xs text-slate-500 mt-1">Lifetime contribution tracked</div>
        </div>
      </div>

      {/* Batches Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-sm font-bold text-slate-800">Your Listed Food Batches</h2>
          <span className="text-xs text-slate-500 font-mono">{batches.length} total entries</span>
        </div>

        {batches.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Package className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <p className="font-semibold text-slate-700">No batches listed yet</p>
            <p className="text-xs mt-1 text-slate-400">Click "List Surplus Food Batch" to add fresh surplus food</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase font-bold text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Batch ID</th>
                  <th className="py-3 px-4">Food Item</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Available / Total</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4">Countdown</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batches.map((b) => {
                  const isExpired = b.days_until_expiry < 0;
                  const isExpiringSoon = b.days_until_expiry >= 0 && b.days_until_expiry <= 2;

                  return (
                    <tr key={b.batch_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-500">
                        #{b.batch_id}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{b.food_name}</div>
                        <div className="text-xs text-slate-400">{b.storage_condition}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                          {b.category}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-800">{b.available_quantity}</span>
                        <span className="text-slate-400 text-xs"> / {b.quantity} {b.unit}</span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 font-mono">
                        {new Date(b.expiry_date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4">
                        {isExpired ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600">
                            <Clock className="w-3.5 h-3.5" /> Expired
                          </span>
                        ) : isExpiringSoon ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            {b.days_until_expiry === 0 ? 'Expires Today' : `${b.days_until_expiry}d remaining`}
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-slate-600">
                            {b.days_until_expiry} days
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            b.status === 'AVAILABLE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : b.status === 'PARTIALLY_CLAIMED'
                              ? 'bg-blue-100 text-blue-800'
                              : b.status === 'FULLY_CLAIMED'
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Add Batch */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">List Surplus Food Batch</h3>
                <p className="text-xs text-slate-500">AI vector embeddings are computed automatically on submission</p>
              </div>
            </div>

            {formMsg && (
              <div
                className={`mb-4 p-3 rounded-lg text-sm flex items-start gap-2 ${
                  formMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {formMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                )}
                <span>{formMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleCreateBatch} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Food Catalog Item *
                </label>
                <select
                  required
                  value={selectedFoodId}
                  onChange={(e) => setSelectedFoodId(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                >
                  <option value="">-- Choose Indian food item --</option>
                  {catalog.map((f) => (
                    <option key={f.food_id} value={f.food_id}>
                      [{f.category}] {f.food_name} ({f.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Available Quantity *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="e.g. 50"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Expiry Date *
                  </label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Storage Condition / Packaging Notes
                </label>
                <input
                  type="text"
                  value={storageCondition}
                  onChange={(e) => setStorageCondition(e.target.value)}
                  placeholder="e.g. Chilled catering trays 3C, packed fresh today"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Computing Embeddings...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Publish Batch
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

