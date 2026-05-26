'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../store/useAuthStore';
import { useCartStore } from '../store/useCartStore';
import { ShoppingBag, MapPin, Shield, LogOut, ClipboardList } from 'lucide-react';

interface HeaderProps {
  onOpenCart?: () => void;
  onOpenLocation?: () => void;
}

export default function Header({ onOpenCart, onOpenLocation }: HeaderProps) {
  const router = useRouter();
  const { user, clearAuth, isAuthenticated } = useAuthStore();
  const { cart, location } = useCartStore();

  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-[#090c0a]/90 backdrop-blur-md px-6 py-4">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-green-400 to-emerald-600 shadow-md shadow-emerald-500/20">
            <span className="font-extrabold text-sm text-black">GP</span>
          </div>
          <span className="font-bold tracking-tight text-white text-lg">Gp Life <span className="text-xs font-normal text-emerald-400">Franchise</span></span>
        </Link>

        {/* Location Selector Trigger */}
        <button
          onClick={onOpenLocation}
          className="hidden md:flex items-center gap-2 rounded-full border border-white/5 bg-white/[0.02] px-4 py-2 text-xs font-semibold text-[#889e8b] hover:text-white transition-all hover:bg-white/[0.04]"
        >
          <MapPin size={14} className="text-emerald-400" />
          <span>
            {location ? (
              <span className="text-white max-w-[200px] truncate block">
                Deliver to: {location.address}
              </span>
            ) : (
              'Set Delivery Location'
            )}
          </span>
        </button>

        {/* Action Controls */}
        <div className="flex items-center gap-4">
          {/* Admin Dashboard redirect */}
          {isAuthenticated && user && (user.role === 'SUPERADMIN' || user.role === 'STORE_ADMIN') && (
            <Link
              href={user.role === 'SUPERADMIN' ? '/dashboard/super' : '/dashboard/store'}
              className="flex items-center gap-1.5 rounded-lg border border-purple-500/20 bg-purple-500/5 px-3 py-1.5 text-xs font-semibold text-purple-300 hover:bg-purple-500/10"
            >
              <Shield size={13} />
              <span>Console</span>
            </Link>
          )}

          {/* User Account / Orders / Logged in state */}
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <Link
                href="/orders/track"
                className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-1.5 text-xs font-semibold text-[#889e8b] hover:text-white"
              >
                <ClipboardList size={13} />
                <span>My Orders</span>
              </Link>
              <button
                onClick={handleLogout}
                className="rounded-lg border border-red-500/10 bg-red-500/5 px-2.5 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/10"
              >
                <LogOut size={13} />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-black hover:opacity-90 active:scale-[0.98] transition-all"
            >
              Sign In
            </Link>
          )}

          {/* Cart Trigger */}
          <button
            onClick={onOpenCart}
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] text-white transition-all"
          >
            <ShoppingBag size={18} />
            {totalCartItems > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-extrabold text-black animate-in zoom-in">
                {totalCartItems}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
