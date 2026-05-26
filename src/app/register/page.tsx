'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../store/useAuthStore';
import { api } from '../../utils/api';

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/register', { name, email, password });
      const { accessToken, refreshToken, user: profile } = response.data;
      
      // Scaffolding returns direct payload if seeder runs
      const userPayload = profile || { id: 'new', name, email, role: 'CUSTOMER', permissions: [] };
      setAuth(userPayload, accessToken, refreshToken);
      router.push('/');
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#090c0a] px-4 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/5 bg-[#0f1210] p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 shadow-lg shadow-purple-500/30">
            <span className="font-extrabold text-white">GP</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Create Profile</h2>
          <p className="mt-1 text-sm text-[#889e8b]">Join the GP Life retail wellness catalog</p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-500/10 bg-red-500/5 p-3 text-center text-xs text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#889e8b]" htmlFor="name">Full Name</label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Carlic Bolomboy"
              className="w-full rounded-xl border border-white/5 bg-white/[0.01] px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-white/20 focus:border-white/10 focus:bg-white/[0.02]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#889e8b]" htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="carlic@example.com"
              className="w-full rounded-xl border border-white/5 bg-white/[0.01] px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-white/20 focus:border-white/10 focus:bg-white/[0.02]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#889e8b]" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-white/5 bg-white/[0.01] px-4 py-3 text-sm text-white outline-none transition-all placeholder:text-white/20 focus:border-white/10 focus:bg-white/[0.02]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-500 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 hover:opacity-90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-[#889e8b]">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-purple-400 hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
