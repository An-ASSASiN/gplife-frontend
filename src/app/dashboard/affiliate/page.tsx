'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../../components/Header';
import { useAuthStore } from '../../../store/useAuthStore';
import { api } from '../../../utils/api';
import { 
  Coins, 
  Award, 
  Copy, 
  Send, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  ShoppingBag,
  Info
} from 'lucide-react';

interface ReferralOrder {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  commissionAmt: number;
  createdAt: string;
}

interface WithdrawalRequest {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
}

interface AffiliateProfile {
  id: string;
  referralCode: string;
  commissionRate: number;
  balanceEarned: number;
  balanceWithdrawn: number;
  level: number;
  pendingWithdrawalsSum: number;
  availableBalance: number;
  referrals: ReferralOrder[];
  withdrawals: WithdrawalRequest[];
}

export default function AffiliateDashboard() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<AffiliateProfile | null>(null);
  
  // Registration form
  const [registering, setRegistering] = useState(false);

  // Withdrawal form
  const [withdrawAmt, setWithdrawAmt] = useState('');
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [payoutSuccess, setPayoutSuccess] = useState(false);
  const [payoutError, setPayoutError] = useState('');

  // Copy status
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else {
      loadProfileData();
    }
  }, [isAuthenticated]);

  const loadProfileData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/affiliates/me');
      setProfile(res.data);
    } catch (err) {
      console.error('Failed to load affiliate profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBecomePartner = async () => {
    setRegistering(true);
    try {
      const res = await api.post('/affiliates/register');
      setProfile(res.data);
      loadProfileData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Partner registration failed');
    } finally {
      setRegistering(false);
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    
    const amt = parseFloat(withdrawAmt);
    if (isNaN(amt) || amt < 500) {
      setPayoutError('Minimum withdrawal amount is ₹500.');
      return;
    }

    if (amt > profile.availableBalance) {
      setPayoutError('Withdrawal request exceeds your available balance.');
      return;
    }

    setPayoutLoading(true);
    setPayoutError('');
    setPayoutSuccess(false);

    try {
      await api.post('/affiliates/withdraw', { amount: amt });
      setPayoutSuccess(true);
      setWithdrawAmt('');
      loadProfileData();
    } catch (err: any) {
      setPayoutError(err.response?.data?.message || 'Failed to submit request.');
    } finally {
      setPayoutLoading(false);
    }
  };

  const copyReferralLink = () => {
    if (!profile) return;
    const shareUrl = `${window.location.origin}/?ref=${profile.referralCode}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#090c0a] text-white flex flex-col">
      <Header />

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-10 space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Affiliate Partner Center</h1>
          <p className="text-xs text-[#889e8b] mt-1">Monetize referrals, track commissions, and request payouts</p>
        </div>

        {/* LOADING STATE */}
        {loading && !profile && (
          <div className="text-center py-16 text-[#889e8b] animate-pulse">
            <Coins size={36} className="mx-auto text-emerald-400 mb-3" />
            <p className="text-xs font-semibold">Syncing partner ledgers...</p>
          </div>
        )}

        {/* NOT REGISTERED STATE */}
        {!loading && !profile && (
          <div className="rounded-3xl border border-white/5 bg-[#0f1210] p-8 md:p-12 text-center max-w-2xl mx-auto space-y-6 relative overflow-hidden">
            <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Award size={24} />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl md:text-2xl font-bold">Become a Gp Life Affiliate Partner</h2>
              <p className="text-xs text-[#889e8b] leading-relaxed max-w-md mx-auto">
                Promote Gp Life centrally dispatched health & wellness products. Earn a starting 5.0% commission on checkouts routed through your referral links.
              </p>
            </div>

            <div className="rounded-xl border border-white/5 bg-white/[0.01] p-4 text-left text-xs max-w-md mx-auto space-y-3">
              <div className="flex gap-2.5">
                <div className="h-5 w-5 rounded bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-[10px]">1</div>
                <div>
                  <strong className="text-white">Central Referral Links</strong>
                  <span className="text-[#889e8b] block mt-0.5">Share your code link. Customers are geofenced and routed to closest hubs.</span>
                </div>
              </div>
              <div className="flex gap-2.5">
                <div className="h-5 w-5 rounded bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-[10px]">2</div>
                <div>
                  <strong className="text-white">Milestone Commission Boost</strong>
                  <span className="text-[#889e8b] block mt-0.5">Earn 5% on sales. Reach ₹10,000 in earnings to unlock Level 2 (8% commission).</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleBecomePartner}
              disabled={registering}
              className="rounded-xl bg-emerald-500 px-8 py-3 text-xs font-bold text-black hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {registering ? 'Activating Profile...' : 'Activate Affiliate Account'}
            </button>
            <div className="absolute left-[-20%] top-[-20%] w-[250px] h-[250px] bg-emerald-500/5 blur-[90px] rounded-full pointer-events-none"></div>
          </div>
        )}

        {/* ACTIVE PARTNER STATE */}
        {!loading && profile && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Bento stats row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              <div className="rounded-2xl border border-white/5 bg-[#0f1210] p-6 relative overflow-hidden">
                <span className="text-[10px] font-bold text-[#889e8b] uppercase tracking-wider block">Wallet Balance</span>
                <h3 className="mt-2 text-2xl font-extrabold text-white">₹{profile.availableBalance.toFixed(2)}</h3>
                <span className="text-[9px] text-white/40 block mt-1">Pending approval: ₹{profile.pendingWithdrawalsSum.toFixed(2)}</span>
                <div className="absolute right-3 bottom-3 text-emerald-500/10"><Coins size={32} /></div>
              </div>

              <div className="rounded-2xl border border-white/5 bg-[#0f1210] p-6 relative overflow-hidden">
                <span className="text-[10px] font-bold text-[#889e8b] uppercase tracking-wider block">Commission Tier</span>
                <h3 className="mt-2 text-2xl font-extrabold text-emerald-400">Level {profile.level}</h3>
                <span className="text-[9px] text-white/40 block mt-1">Active Rate: {profile.commissionRate}%</span>
                <div className="absolute right-3 bottom-3 text-emerald-500/10"><Award size={32} /></div>
              </div>

              <div className="rounded-2xl border border-white/5 bg-[#0f1210] p-6">
                <span className="text-[10px] font-bold text-[#889e8b] uppercase tracking-wider block">Lifetime Earned</span>
                <h3 className="mt-2 text-2xl font-extrabold text-white">₹{profile.balanceEarned.toFixed(2)}</h3>
                <span className="text-[9px] text-white/40 block mt-1">All-time sales commission</span>
              </div>

              <div className="rounded-2xl border border-white/5 bg-[#0f1210] p-6">
                <span className="text-[10px] font-bold text-[#889e8b] uppercase tracking-wider block">Paid Out</span>
                <h3 className="mt-2 text-2xl font-extrabold text-white">₹{profile.balanceWithdrawn.toFixed(2)}</h3>
                <span className="text-[9px] text-white/40 block mt-1">Disbursed to bank account</span>
              </div>
            </div>

            {/* Link copier & withdrawal forms */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Copy Referral Link */}
              <div className="md:col-span-2 rounded-2xl border border-white/5 bg-[#0f1210] p-6 space-y-4">
                <h3 className="font-bold text-sm text-white">Your Partner Referral Link</h3>
                <p className="text-xs text-[#889e8b]">Share this link with retail customers. When checkouts route to local stores, you earn commission credit.</p>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/?ref=${profile.referralCode}`}
                    className="flex-1 rounded-lg border border-white/5 bg-black/45 px-3 py-2 text-xs outline-none text-emerald-400 font-mono"
                  />
                  <button
                    onClick={copyReferralLink}
                    className="rounded-lg bg-emerald-500 px-4 text-xs font-bold text-black hover:opacity-90 active:scale-[0.98] transition-all flex items-center gap-1.5"
                  >
                    {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Request Payout */}
              <div className="rounded-2xl border border-white/5 bg-[#0f1210] p-6 space-y-4 h-fit">
                <h3 className="font-bold text-sm text-white">Submit Payout Request</h3>

                {payoutError && (
                  <div className="rounded-lg border border-red-500/10 bg-red-500/5 p-3 text-[10px] text-red-400 flex gap-2">
                    <AlertCircle size={14} className="flex-shrink-0" />
                    <span>{payoutError}</span>
                  </div>
                )}

                {payoutSuccess && (
                  <div className="rounded-lg border border-green-500/10 bg-green-500/5 p-3 text-[10px] text-green-400 flex gap-2">
                    <CheckCircle size={14} className="flex-shrink-0" />
                    <span>Request submitted successfully. Waiting for Admin payout approval.</span>
                  </div>
                )}

                <form onSubmit={handleWithdrawSubmit} className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold text-[#889e8b] uppercase">Payout Amount (₹)</label>
                    <input
                      type="number"
                      required
                      min="500"
                      value={withdrawAmt}
                      onChange={e => setWithdrawAmt(e.target.value)}
                      placeholder="Min ₹500"
                      className="w-full rounded-lg border border-white/5 bg-white/[0.01] px-3 py-2 text-xs outline-none focus:border-white/10"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={payoutLoading || profile.availableBalance < 500}
                    className="w-full rounded-lg bg-gradient-to-tr from-green-400 to-emerald-500 py-2 text-xs font-bold text-black hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-30"
                  >
                    {payoutLoading ? 'Posting request...' : 'Request Payout'}
                  </button>
                </form>
              </div>

            </div>

            {/* Referrals & Withdrawals Tables */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Referrals Table */}
              <div className="rounded-2xl border border-white/5 bg-[#0f1210] p-6 space-y-4">
                <h3 className="font-bold text-sm text-white">Referred Order Ledgers</h3>
                
                <div className="overflow-x-auto rounded-xl border border-white/5 max-h-[40vh]">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/[0.01]">
                        <th className="p-3 font-bold text-[#889e8b] uppercase">Order #</th>
                        <th className="p-3 font-bold text-[#889e8b] uppercase">Sales (₹)</th>
                        <th className="p-3 font-bold text-[#889e8b] uppercase">Earned (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profile.referrals.map((ref) => (
                        <tr key={ref.id} className="border-b border-white/5 hover:bg-white/[0.01]">
                          <td className="p-3">
                            <span className="font-bold text-white block">{ref.orderNumber}</span>
                            <span className="text-[9px] text-[#889e8b]">{new Date(ref.createdAt).toLocaleDateString()}</span>
                          </td>
                          <td className="p-3 font-mono text-white/70">
                            ₹{ref.subtotal.toFixed(2)}
                          </td>
                          <td className="p-3 font-mono text-emerald-400 font-bold">
                            ₹{ref.commissionAmt.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                      {profile.referrals.length === 0 && (
                        <tr>
                          <td colSpan={3} className="text-center text-xs text-[#889e8b] py-8">
                            No orders placed with your referral code yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Withdrawals Table */}
              <div className="rounded-2xl border border-white/5 bg-[#0f1210] p-6 space-y-4">
                <h3 className="font-bold text-sm text-white">Payout Withdrawal Audits</h3>
                
                <div className="overflow-x-auto rounded-xl border border-white/5 max-h-[40vh]">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/[0.01]">
                        <th className="p-3 font-bold text-[#889e8b] uppercase">Requested</th>
                        <th className="p-3 font-bold text-[#889e8b] uppercase">Amount (₹)</th>
                        <th className="p-3 font-bold text-[#889e8b] uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profile.withdrawals.map((w) => (
                        <tr key={w.id} className="border-b border-white/5 hover:bg-white/[0.01]">
                          <td className="p-3">
                            <span className="text-[9px] text-[#889e8b] block">{new Date(w.createdAt).toLocaleString()}</span>
                            <span className="text-[8px] text-white/30 font-mono mt-0.5 block">{w.id.substring(0,8)}...</span>
                          </td>
                          <td className="p-3 font-mono text-white font-semibold">
                            ₹{w.amount.toFixed(2)}
                          </td>
                          <td className="p-3">
                            <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                              w.status === 'PAID' ? 'bg-green-500/10 text-green-400' :
                              w.status === 'REJECTED' ? 'bg-red-500/10 text-red-400' :
                              'bg-amber-500/10 text-amber-400'
                            }`}>{w.status}</span>
                          </td>
                        </tr>
                      ))}
                      {profile.withdrawals.length === 0 && (
                        <tr>
                          <td colSpan={3} className="text-center text-xs text-[#889e8b] py-8">
                            No withdrawal request history found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

          </div>
        )}
      </main>
    </div>
  );
}
