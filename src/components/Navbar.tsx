'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { 
  Building2, 
  HeartHandshake, 
  ShieldCheck, 
  Truck, 
  LogOut, 
  LogIn, 
  UserPlus, 
  Sparkles,
  Layers
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const role = session?.user?.role;

  const roleBadgeStyles = {
    ADMIN: 'bg-purple-100 text-purple-800 border-purple-200',
    DONOR: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    FOOD_BANK: 'bg-blue-100 text-blue-800 border-blue-200',
    DRIVER: 'bg-amber-100 text-amber-800 border-amber-200',
  };

  const roleIcons = {
    ADMIN: <ShieldCheck className="w-3.5 h-3.5" />,
    DONOR: <Building2 className="w-3.5 h-3.5" />,
    FOOD_BANK: <HeartHandshake className="w-3.5 h-3.5" />,
    DRIVER: <Truck className="w-3.5 h-3.5" />,
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold shadow-sm group-hover:bg-emerald-700 transition-colors">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="font-extrabold text-slate-900 tracking-tight text-lg">
                  Food<span className="text-emerald-600">Rescue</span>
                </span>
                <span className="hidden sm:inline-block ml-2 text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                  pgvector
                </span>
              </div>
            </Link>

            {/* Navigation Links based on authentication and role */}
            <nav className="hidden md:flex items-center gap-1 ml-6">
              <Link
                href="/"
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  pathname === '/'
                    ? 'text-emerald-700 bg-emerald-50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                Home
              </Link>

              {role === 'DONOR' && (
                <Link
                  href="/donor"
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    pathname.startsWith('/donor')
                      ? 'text-emerald-700 bg-emerald-50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Donor Portal
                </Link>
              )}

              {role === 'FOOD_BANK' && (
                <Link
                  href="/food-bank"
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    pathname.startsWith('/food-bank')
                      ? 'text-blue-700 bg-blue-50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Food Bank Portal
                </Link>
              )}

              {role === 'ADMIN' && (
                <Link
                  href="/admin"
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    pathname.startsWith('/admin')
                      ? 'text-purple-700 bg-purple-50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Admin Analytics & Audit
                </Link>
              )}

              <Link
                href="/smart-match"
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  pathname.startsWith('/smart-match')
                    ? 'text-blue-700 bg-blue-50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                AI Smart Match
              </Link>
            </nav>
          </div>

          {/* User info & Auth buttons */}
          <div className="flex items-center gap-3">
            {status === 'loading' ? (
              <div className="w-24 h-8 bg-slate-100 rounded animate-pulse" />
            ) : session?.user ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-semibold text-slate-900">
                    {session.user.name}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate max-w-[160px]">
                    {session.user.org || session.user.email}
                  </div>
                </div>

                {role && (
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${roleBadgeStyles[role]}`}
                  >
                    {roleIcons[role]}
                    {role}
                  </span>
                )}

                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

