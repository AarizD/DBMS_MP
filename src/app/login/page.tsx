'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { LogIn, Sparkles, AlertCircle, Building2, HeartHandshake, ShieldCheck, Truck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (res?.error) {
        setError(res.error);
        setLoading(false);
      } else {
        router.refresh();
        router.push('/');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to sign in');
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password123');
    setError(null);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-inner">
            <LogIn className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Sign in to FoodRescue
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Access your role-based food redistribution portal
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. donor.metro@freshmart.com"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Sign In
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-100 text-center text-xs text-slate-600">
          Need a new account?{' '}
          <Link href="/register" className="font-semibold text-emerald-600 hover:underline">
            Register here
          </Link>
        </div>

        {/* 1-Click Demo Accounts Switcher */}
        <div className="mt-6 pt-6 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Quick Demo Accounts (Password: password123)
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleQuickLogin('donor.metro@freshmart.com')}
              className="p-2 rounded-lg border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100 text-emerald-900 text-left transition-colors flex items-center gap-1.5"
            >
              <Building2 className="w-3.5 h-3.5 flex-shrink-0 text-emerald-600" />
              <div className="truncate">
                <div className="font-semibold truncate">Metro Mart</div>
                <div className="text-[10px] text-emerald-700 font-mono">DONOR</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('donor.artisan@bakery.com')}
              className="p-2 rounded-lg border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100 text-emerald-900 text-left transition-colors flex items-center gap-1.5"
            >
              <Building2 className="w-3.5 h-3.5 flex-shrink-0 text-emerald-600" />
              <div className="truncate">
                <div className="font-semibold truncate">Artisan Bakes</div>
                <div className="text-[10px] text-emerald-700 font-mono">DONOR</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('foodbank.central@feedingall.org')}
              className="p-2 rounded-lg border border-blue-200 bg-blue-50/60 hover:bg-blue-100 text-blue-900 text-left transition-colors flex items-center gap-1.5"
            >
              <HeartHandshake className="w-3.5 h-3.5 flex-shrink-0 text-blue-600" />
              <div className="truncate">
                <div className="font-semibold truncate">Central Bank</div>
                <div className="text-[10px] text-blue-700 font-mono">FOOD_BANK</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('admin@foodrescue.org')}
              className="p-2 rounded-lg border border-purple-200 bg-purple-50/60 hover:bg-purple-100 text-purple-900 text-left transition-colors flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0 text-purple-600" />
              <div className="truncate">
                <div className="font-semibold truncate">System Admin</div>
                <div className="text-[10px] text-purple-700 font-mono">ADMIN</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

