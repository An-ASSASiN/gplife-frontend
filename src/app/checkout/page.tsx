'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../components/Header';
import { useCartStore } from '../../store/useCartStore';
import { api } from '../../utils/api';
import { ShoppingBag, ArrowLeft, Send } from 'lucide-react';
import Link from 'next/link';

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, location, referredByCode, setReferredByCode, clearCart } = useCartStore();

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [refCode, setRefCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (cart.length === 0) {
      router.push('/');
    }
    if (location) {
      setShippingAddress(location.address);
    }
    if (referredByCode) {
      setRefCode(referredByCode);
    }
  }, [cart, location, referredByCode, router]);

  const cartSubtotal = cart.reduce((sum, item) => sum + item.localPrice * item.quantity, 0);
  const deliveryFee = 50.0; // Flat ₹50
  const taxAmount = parseFloat((cartSubtotal * 0.18).toFixed(2)); // 18% GST
  const totalAmount = cartSubtotal + deliveryFee + taxAmount;

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location) {
      setErrorMsg('Please specify coordinates location on the homepage before checkout.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const payload = {
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress,
      latitude: location.latitude,
      longitude: location.longitude,
      items: cart.map(item => ({
        productId: item.id,
        quantity: item.quantity,
      })),
      referredByCode: refCode || undefined,
    };

    try {
      const res = await api.post('/orders/checkout', payload);
      // Success! Clear cart and route to track order page
      if (refCode) {
        setReferredByCode(refCode);
      }
      clearCart();
      router.push(`/orders/track?orderId=${res.data.id}`);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Checkout failed. Please check store stock and delivery radius.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090c0a] text-white flex flex-col">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-10 space-y-6">
        <Link href="/" className="flex items-center gap-2 text-xs text-[#889e8b] hover:text-white transition-all w-fit">
          <ArrowLeft size={14} />
          <span>Back to storefront catalog</span>
        </Link>

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Fulfillment Checkout</h1>
          <p className="text-xs text-[#889e8b] mt-1">Provide shipping address coordinates to route your order</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Checkout Form */}
          <div className="md:col-span-2 rounded-2xl border border-white/5 bg-[#0f1210] p-6 space-y-6">
            <h3 className="font-bold text-sm text-white">Delivery Coordinates & Info</h3>
            
            {errorMsg && (
              <div className="rounded-xl border border-red-500/10 bg-red-500/5 p-4 text-xs text-red-400">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCheckoutSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-[#889e8b] uppercase">Full Name</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full rounded-lg border border-white/5 bg-white/[0.01] px-3 py-2.5 text-xs outline-none focus:border-white/10"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-[#889e8b] uppercase">Email Address</label>
                  <input
                    type="email"
                    required
                    value={customerEmail}
                    onChange={e => setCustomerEmail(e.target.value)}
                    placeholder="john@example.com"
                    className="w-full rounded-lg border border-white/5 bg-white/[0.01] px-3 py-2.5 text-xs outline-none focus:border-white/10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-[#889e8b] uppercase">Mobile Number</label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    placeholder="+91 99999 88888"
                    className="w-full rounded-lg border border-white/5 bg-white/[0.01] px-3 py-2.5 text-xs outline-none focus:border-white/10"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-[#889e8b] uppercase">Referral / Affiliate Code (Optional)</label>
                  <input
                    type="text"
                    value={refCode}
                    onChange={e => setRefCode(e.target.value)}
                    placeholder="ALAN10"
                    className="w-full rounded-lg border border-white/5 bg-white/[0.01] px-3 py-2.5 text-xs outline-none focus:border-white/10"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-[#889e8b] uppercase">Fulfillment Shipping Address</label>
                <textarea
                  rows={3}
                  required
                  value={shippingAddress}
                  onChange={e => setShippingAddress(e.target.value)}
                  placeholder="Apartment/Flat, Street name, City"
                  className="w-full rounded-lg border border-white/5 bg-white/[0.01] px-3 py-2.5 text-xs outline-none focus:border-white/10 resize-none"
                />
              </div>

              {location && (
                <div className="rounded-xl border border-white/5 bg-white/[0.01] p-3 text-xs text-white/50 space-y-1">
                  <p className="font-semibold text-white/70">Geocoding Routing Parameters:</p>
                  <p className="font-mono">Latitude: {location.latitude}</p>
                  <p className="font-mono">Longitude: {location.longitude}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || cart.length === 0}
                className="w-full rounded-xl bg-emerald-500 py-3 text-xs font-bold text-black hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send size={14} />
                <span>{loading ? 'Routing Order to Nearest franchise...' : 'Place Order (Intelligent Route)'}</span>
              </button>
            </form>
          </div>

          {/* Cart Summary */}
          <div className="rounded-2xl border border-white/5 bg-[#0f1210] p-6 h-fit space-y-6">
            <h3 className="font-bold text-sm text-white">Order Items Summary</h3>

            <div className="space-y-4 max-h-[30vh] overflow-y-auto pr-2">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between items-center gap-4 text-xs">
                  <div>
                    <strong className="text-white block font-semibold max-w-[150px] truncate">{item.title}</strong>
                    <span className="text-white/40 block mt-0.5">Qty: {item.quantity} × ₹{item.localPrice.toFixed(2)}</span>
                  </div>
                  <strong className="font-mono text-emerald-400">₹{(item.localPrice * item.quantity).toFixed(2)}</strong>
                </div>
              ))}
            </div>

            <div className="border-t border-white/5 pt-4 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-[#889e8b]">Subtotal</span>
                <span className="font-mono">₹{cartSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#889e8b]">Fulfillment delivery fee</span>
                <span className="font-mono">₹{deliveryFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#889e8b]">Taxes (18% GST)</span>
                <span className="font-mono">₹{taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t border-white/5 pt-3 text-sm">
                <span className="font-bold text-white">Grand Total</span>
                <strong className="font-mono text-emerald-400 text-base">₹{totalAmount.toFixed(2)}</strong>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
