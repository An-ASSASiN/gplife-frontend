'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '../../../components/Header';
import { api } from '../../../utils/api';
import { useAuthStore } from '../../../store/useAuthStore';
import { 
  ClipboardList, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  Truck, 
  AlertTriangle, 
  Search,
  ChevronRight,
  PackageCheck
} from 'lucide-react';

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product: {
    title: string;
    sku: string;
  };
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  subtotal: number;
  deliveryFee: number;
  taxAmount: number;
  totalAmount: number;
  createdAt: string;
  storeId?: string;
  store?: {
    name: string;
    code: string;
    address: string;
  };
  items: OrderItem[];
}

function OrderTrackingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const orderIdParam = searchParams.get('orderId');

  const [loading, setLoading] = useState(false);
  const [searchId, setSearchId] = useState('');
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (orderIdParam) {
      loadSingleOrder(orderIdParam);
    } else if (isAuthenticated) {
      loadMyOrders();
    }
  }, [orderIdParam, isAuthenticated]);

  const loadSingleOrder = async (id: string) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.get(`/orders/${id}`);
      setActiveOrder(res.data);
    } catch (err: any) {
      setErrorMsg('Failed to find order. Please verify the ID.');
      setActiveOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const loadMyOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get('/orders/my-orders');
      setMyOrders(res.data);
    } catch (err) {
      console.error('Failed to load past orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchId.trim()) return;
    router.push(`/orders/track?orderId=${searchId.trim()}`);
  };

  const getStatusStep = (status: string) => {
    switch (status) {
      case 'PENDING': return 1;
      case 'ASSIGNED': return 2;
      case 'PREPARING': return 3;
      case 'OUT_FOR_DELIVERY': return 4;
      case 'DELIVERED': return 5;
      case 'CANCELLED': return -1;
      default: return 1;
    }
  };

  const currentStep = activeOrder ? getStatusStep(activeOrder.status) : 1;

  const timelineSteps = [
    { step: 1, label: 'Pending', desc: 'Order placed, analyzing routes', icon: Clock },
    { step: 2, label: 'Assigned', desc: 'Routed to regional store', icon: MapPin },
    { step: 3, label: 'Preparing', desc: 'Franchise packing stock', icon: ClipboardList },
    { step: 4, label: 'Dispatched', desc: 'Out for delivery locally', icon: Truck },
    { step: 5, label: 'Delivered', desc: 'Received and completed', icon: CheckCircle2 },
  ];

  return (
    <div className="min-h-screen bg-[#090c0a] text-white flex flex-col">
      <Header />

      <main className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-10 space-y-8">
        
        {/* Search Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 border-b border-white/5 pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Order Tracking System</h1>
            <p className="text-xs text-[#889e8b] mt-1">Track geocoded checkout dispatch routes and franchise status</p>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-md w-full">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 text-white/40" size={14} />
              <input
                type="text"
                required
                value={searchId}
                onChange={e => setSearchId(e.target.value)}
                placeholder="Enter Order ID (e.g. 550e8400...)"
                className="w-full rounded-lg border border-white/5 bg-white/[0.01] pl-9 pr-3 py-2 text-xs outline-none focus:border-white/10"
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-black hover:opacity-90 active:scale-[0.98] transition-all"
            >
              Track
            </button>
          </form>
        </div>

        {errorMsg && (
          <div className="rounded-xl border border-red-500/10 bg-red-500/5 p-4 text-xs text-red-400">
            {errorMsg}
          </div>
        )}

        {/* LOADING STATE */}
        {loading && (
          <div className="text-center py-16 text-[#889e8b] animate-pulse">
            <PackageCheck size={36} className="mx-auto text-emerald-400 mb-3" />
            <p className="text-xs font-semibold">Updating order tracking metrics...</p>
          </div>
        )}

        {/* SINGLE ORDER TIMELINE & DETAILS */}
        {!loading && activeOrder && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Timeline */}
            <div className="lg:col-span-2 rounded-2xl border border-white/5 bg-[#0f1210] p-6 space-y-8">
              <div className="flex justify-between items-start border-b border-white/5 pb-4">
                <div>
                  <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Active Timeline</span>
                  <h3 className="font-bold text-lg mt-0.5">Order {activeOrder.orderNumber}</h3>
                  <span className="text-[10px] text-white/30 font-mono block mt-1">ID: {activeOrder.id}</span>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                  activeOrder.status === 'DELIVERED' ? 'bg-green-500/10 text-green-400' :
                  activeOrder.status === 'CANCELLED' ? 'bg-red-500/10 text-red-400' :
                  activeOrder.status === 'ROUTING_FAILED' ? 'bg-amber-500/10 text-amber-400 animate-pulse' :
                  'bg-blue-500/10 text-blue-400 animate-pulse'
                }`}>{activeOrder.status}</span>
              </div>

              {/* Cancelled State */}
              {currentStep === -1 && (
                <div className="rounded-xl border border-red-500/10 bg-red-500/5 p-4 flex gap-3 text-xs text-red-400">
                  <AlertTriangle size={16} />
                  <div>
                    <strong className="block font-semibold">Order Cancelled</strong>
                    <span className="text-white/60 mt-1 block">This order was cancelled. Reserved franchise warehouse inventory has been restocked automatically.</span>
                  </div>
                </div>
              )}

              {/* Routing Failed State */}
              {activeOrder.status === 'ROUTING_FAILED' && (
                <div className="rounded-xl border border-amber-500/10 bg-amber-500/5 p-4 flex gap-3 text-xs text-amber-400">
                  <AlertTriangle size={16} />
                  <div>
                    <strong className="block font-semibold">Intelligent Routing Failed</strong>
                    <span className="text-white/60 mt-1 block">No regional franchise store could be found to serve your shipping coordinates within active range that has available stock.</span>
                  </div>
                </div>
              )}

              {/* Vertical Timeline Progression */}
              {currentStep !== -1 && activeOrder.status !== 'ROUTING_FAILED' && (
                <div className="relative pl-6 border-l border-white/5 space-y-8 ml-3">
                  {timelineSteps.map((step) => {
                    const StepIcon = step.icon;
                    const isPassed = currentStep >= step.step;
                    const isActive = currentStep === step.step;

                    return (
                      <div key={step.step} className="relative">
                        {/* Dot indicator */}
                        <div className={`absolute left-[-35px] top-0 flex h-6 w-6 items-center justify-center rounded-full border transition-all ${
                          isPassed ? 'bg-emerald-500 border-emerald-500 text-black' : 'bg-[#090c0a] border-white/10 text-white/40'
                        } ${isActive ? 'ring-4 ring-emerald-500/20' : ''}`}>
                          <StepIcon size={12} />
                        </div>
                        <div>
                          <h4 className={`font-semibold text-xs ${isPassed ? 'text-white font-bold' : 'text-white/40'}`}>{step.label}</h4>
                          <p className="text-[10px] text-[#889e8b] mt-0.5">{step.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Mapped Store Details */}
              {activeOrder.store && (
                <div className="rounded-xl border border-white/5 bg-white/[0.01] p-4 space-y-3">
                  <span className="text-[10px] text-white/40 block uppercase font-bold tracking-wider">Fulfilling Store Node</span>
                  <div className="text-xs">
                    <strong className="text-white block font-semibold">{activeOrder.store.name} ({activeOrder.store.code})</strong>
                    <p className="text-[#889e8b] mt-1">{activeOrder.store.address}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Billing details */}
            <div className="rounded-2xl border border-white/5 bg-[#0f1210] p-6 h-fit space-y-6">
              <h3 className="font-bold text-sm text-white">Invoice Summary</h3>
              
              <div className="space-y-4 text-xs">
                {activeOrder.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center gap-4">
                    <div>
                      <strong className="text-white block font-semibold">{item.product.title}</strong>
                      <span className="text-white/40 block mt-0.5">Qty: {item.quantity} × ₹{item.price.toFixed(2)}</span>
                    </div>
                    <strong className="font-mono text-emerald-400">₹{(item.price * item.quantity).toFixed(2)}</strong>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/5 pt-4 space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#889e8b]">Subtotal</span>
                  <span className="font-mono">₹{activeOrder.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#889e8b]">Delivery Fee</span>
                  <span className="font-mono">₹{activeOrder.deliveryFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#889e8b]">GST Tax</span>
                  <span className="font-mono">₹{activeOrder.taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-white/5 pt-3 text-sm">
                  <span className="font-bold text-white">Grand Total Paid</span>
                  <strong className="font-mono text-emerald-400 text-base">₹{activeOrder.totalAmount.toFixed(2)}</strong>
                </div>
              </div>

              <div className="border-t border-white/5 pt-4 text-[10px] text-white/30 space-y-1">
                <p>Placed: {new Date(activeOrder.createdAt).toLocaleString()}</p>
                <p>Address: {activeOrder.shippingAddress}</p>
              </div>
            </div>

          </div>
        )}

        {/* CUSTOMER PROFILE ORDERS LIST */}
        {!loading && !activeOrder && isAuthenticated && myOrders.length > 0 && (
          <div className="rounded-2xl border border-white/5 bg-[#0f1210] p-6 space-y-6">
            <h3 className="font-bold text-base text-white">Order History</h3>

            <div className="space-y-4">
              {myOrders.map((ord) => (
                <div key={ord.id} className="rounded-xl border border-white/5 bg-white/[0.01] p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-white/[0.02] transition-all">
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="font-bold text-sm text-white">{ord.orderNumber}</strong>
                      <span className="rounded bg-white/5 border border-white/5 px-1.5 py-0.5 text-[9px] font-mono text-white/55">{ord.items.length} items</span>
                      <span className={`h-2 w-2 rounded-full ${
                        ord.status === 'DELIVERED' ? 'bg-green-500' :
                        ord.status === 'CANCELLED' ? 'bg-red-500' :
                        'bg-blue-500'
                      }`}></span>
                    </div>
                    <p className="text-[10px] text-[#889e8b] mt-1">Date: {new Date(ord.createdAt).toLocaleDateString()} | Node: {ord.store?.name || 'Central Catalog'}</p>
                  </div>

                  <div className="flex items-center gap-6 self-stretch sm:self-auto justify-between">
                    <div>
                      <span className="text-[10px] text-white/40 block">Amount</span>
                      <strong className="text-xs font-mono text-emerald-400">₹{ord.totalAmount.toFixed(2)}</strong>
                    </div>

                    <Link 
                      href={`/orders/track?orderId=${ord.id}`}
                      className="rounded-lg border border-white/5 bg-white/[0.02] p-2 hover:text-emerald-400"
                    >
                      <ChevronRight size={16} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && !activeOrder && (!isAuthenticated || myOrders.length === 0) && (
          <div className="rounded-2xl border border-white/5 bg-[#0f1210] p-12 text-center">
            <ClipboardList size={40} className="mx-auto text-[#889e8b] mb-4" />
            <h3 className="font-bold text-base">Track Order</h3>
            <p className="text-xs text-[#889e8b] mt-1 max-w-sm mx-auto">
              No active tracking coordinates selected. Enter an Order ID in the search bar above or log in to view your profile order history.
            </p>
          </div>
        )}

      </main>
    </div>
  );
}

export default function OrderTrackingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#090c0a] text-white flex flex-col justify-center items-center">
        <div className="animate-pulse text-emerald-400 font-semibold text-xs">Loading tracking console...</div>
      </div>
    }>
      <OrderTrackingContent />
    </Suspense>
  );
}
