'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '../components/Header';
import { useCartStore } from '../store/useCartStore';
import { api } from '../utils/api';
import { 
  MapPin, 
  ShoppingBag, 
  Trash2, 
  X, 
  Plus, 
  Minus, 
  Info,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import Link from 'next/link';

interface Product {
  id: string;
  sku: string;
  title: string;
  slug: string;
  description?: string;
  basePriceMSRP: number;
  wholesalePrice: number;
  imageUrl?: string;
  category: string;
  stockQuantity: number;
  localPrice: number;
  isAvailable: boolean;
}

interface StoreInfo {
  id: string;
  code: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

function StorefrontContent() {
  const { cart, location, addToCart, removeFromCart, updateQuantity, setLocation, setReferredByCode } = useCartStore();
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      setReferredByCode(ref);
    }
  }, [searchParams, setReferredByCode]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeStore, setActiveStore] = useState<StoreInfo | null>(null);
  const [storeDistance, setStoreDistance] = useState<number | null>(null);

  // UI state variables
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Location form
  const [latInput, setLatInput] = useState('40.7128'); // Times Square, NY
  const [lngInput, setLngInput] = useState('-74.0060');
  const [addressInput, setAddressInput] = useState('Times Square, Manhattan, NY');

  const presets = [
    { name: 'Manhattan (NY)', lat: '40.7128', lng: '-74.0060', address: 'Times Square, Manhattan, NY' },
    { name: 'Brooklyn (NY)', lat: '40.6782', lng: '-73.9442', address: 'Flatbush Ave, Brooklyn, NY' },
    { name: 'Queens (NY)', lat: '40.7282', lng: '-73.7949', address: 'Flushing, Queens, NY' },
    { name: 'Los Angeles (CA) - Out of Bounds', lat: '34.0522', lng: '-118.2437', address: 'Downtown Los Angeles, CA' },
  ];

  const handleApplyLocation = useCallback(async (lat: number, lng: number, address: string) => {
    setLoading(true);
    try {
      // Find nearest store geofencing the coordinates
      const res = await api.get(`/stores/public/nearest?latitude=${lat}&longitude=${lng}`);
      
      if (res.data) {
        const { store, distance } = res.data;
        setActiveStore(store);
        setStoreDistance(distance);
        setLocation({ latitude: lat, longitude: lng, address });
        
        // Fetch products localized for this store
        const prodRes = await api.get(`/products/inventory/${store.id}`);
        setProducts(prodRes.data);
      } else {
        // No store serves this location
        setActiveStore(null);
        setStoreDistance(null);
        setLocation({ latitude: lat, longitude: lng, address });
        
        // Fetch global products catalog (checkout will fail, showing global MSRP)
        const prodRes = await api.get('/products');
        // Map global products with zero localized stock
        const mapped = prodRes.data.map((p: any) => ({
          ...p,
          category: p.category.name,
          stockQuantity: 0,
          localPrice: p.basePriceMSRP,
          isAvailable: false,
        }));
        setProducts(mapped);
      }
      setIsLocationOpen(false);
    } catch (err) {
      console.error('Error applying coordinates location:', err);
    } finally {
      setLoading(false);
    }
  }, [setLocation]);

  useEffect(() => {
    if (location) {
      setLatInput(location.latitude.toString());
      setLngInput(location.longitude.toString());
      setAddressInput(location.address);
      handleApplyLocation(location.latitude, location.longitude, location.address);
    } else {
      // Open location selector by default if not set
      setIsLocationOpen(true);
    }
  }, [location, handleApplyLocation]);

  const handlePresetSelect = (preset: typeof presets[0]) => {
    setLatInput(preset.lat);
    setLngInput(preset.lng);
    setAddressInput(preset.address);
    handleApplyLocation(parseFloat(preset.lat), parseFloat(preset.lng), preset.address);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleApplyLocation(parseFloat(latInput), parseFloat(lngInput), addressInput);
  };

  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cart.reduce((sum, item) => sum + item.localPrice * item.quantity, 0);

  return (
    <div className="min-h-screen bg-[#090c0a] text-white flex flex-col">
      {/* HEADER BAR */}
      <Header 
        onOpenCart={() => setIsCartOpen(true)} 
        onOpenLocation={() => setIsLocationOpen(true)} 
      />

      {/* CORE DISPLAY */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-10 space-y-8">
        
        {/* Banner Section */}
        <div className="relative rounded-3xl border border-white/5 bg-[#0f1210] p-8 md:p-12 overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-4 max-w-xl z-10">
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">Centrally Dispatched Franchise OS</span>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Central Catalog. <br/>
              <span className="bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">Local Franchise Delivery.</span>
            </h1>
            <p className="text-[#889e8b] text-sm md:text-base leading-relaxed">
              We leverage geofencing coordinates to assign your orders to the closest physical store node. Final checkouts are settled 100% locally.
            </p>
          </div>

          <div className="z-10 rounded-2xl border border-white/5 bg-white/[0.01] p-6 max-w-sm w-full space-y-4 backdrop-blur-md">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <MapPin size={16} className="text-emerald-400" />
              <span>Current Delivery Zone</span>
            </h3>
            {activeStore ? (
              <div className="space-y-2 text-xs">
                <p className="text-white/60">Fulfilling Store:</p>
                <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3">
                  <strong className="text-emerald-400 block font-semibold">{activeStore.name} ({activeStore.code})</strong>
                  <span className="text-[#889e8b] mt-1 block">{activeStore.address}</span>
                  <span className="text-[10px] text-white/40 block mt-2 font-mono">Distance: {storeDistance?.toFixed(2)} km away</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                <p className="text-white/60">Fulfilling Store:</p>
                <div className="rounded-lg bg-red-500/5 border border-red-500/10 p-3 text-red-400">
                  <strong className="block font-semibold">Outside Delivery Radius</strong>
                  <span className="text-[#889e8b] mt-1 block">No active franchise store covers the location: "{location?.address || 'LA'}". Showing catalog with disabled checkout.</span>
                </div>
              </div>
            )}
          </div>
          <div className="absolute right-[-10%] top-[-20%] w-[350px] h-[350px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none"></div>
        </div>

        {/* PRODUCTS CATALOG SECTION */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">Local Inventory</h2>
              <p className="text-xs text-[#889e8b] mt-1">Available products near your geocoded zone</p>
            </div>
            <span className="text-xs text-[#889e8b] font-mono">{products.length} Products Available</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((prod) => (
              <div key={prod.id} className="group rounded-2xl border border-white/5 bg-[#0f1210] p-4 flex flex-col justify-between hover:border-emerald-500/20 hover:bg-white/[0.01] transition-all duration-300">
                <div>
                  {/* Image wrapper */}
                  <div className="relative w-full aspect-square rounded-xl border border-white/5 bg-white/[0.01] overflow-hidden flex items-center justify-center mb-4">
                    {prod.imageUrl ? (
                      <img src={prod.imageUrl} alt={prod.title} className="object-cover w-full h-full group-hover:scale-105 transition-all duration-300" />
                    ) : (
                      <ShoppingBag size={32} className="text-white/10 group-hover:text-emerald-400/20 transition-all" />
                    )}
                    <span className="absolute top-2 left-2 rounded-md bg-white/5 border border-white/5 px-2 py-0.5 text-[9px] font-bold text-[#889e8b] uppercase tracking-wider">
                      {prod.category}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm tracking-tight text-white group-hover:text-emerald-400 transition-all">{prod.title}</h3>
                  <p className="text-xs text-[#889e8b] mt-1 line-clamp-2">{prod.description || 'No description provided.'}</p>
                </div>

                <div className="mt-4 pt-4 border-t border-white/5 space-y-4">
                  <div className="flex justify-between items-baseline">
                    <div>
                      <span className="text-[10px] text-white/40 block">Price</span>
                      <strong className="text-sm font-extrabold text-emerald-400">₹{prod.localPrice.toFixed(2)}</strong>
                      {prod.localPrice !== prod.basePriceMSRP && (
                        <span className="text-[9px] text-[#889e8b] line-through ml-2 font-mono">₹{prod.basePriceMSRP}</span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-white/40 block">Stock</span>
                      {prod.stockQuantity > 0 ? (
                        <span className="text-[10px] font-semibold text-emerald-400">{prod.stockQuantity} in stock</span>
                      ) : (
                        <span className="text-[10px] font-semibold text-red-400">Out of Stock</span>
                      )}
                    </div>
                  </div>

                  {prod.stockQuantity > 0 ? (
                    <button
                      onClick={() => addToCart({
                        id: prod.id,
                        sku: prod.sku,
                        title: prod.title,
                        localPrice: prod.localPrice,
                        category: prod.category,
                        imageUrl: prod.imageUrl
                      })}
                      className="w-full rounded-xl bg-emerald-500 py-2.5 text-xs font-bold text-black hover:opacity-90 active:scale-[0.98] transition-all"
                    >
                      Add to Cart
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full rounded-xl bg-white/5 border border-white/5 py-2.5 text-xs font-semibold text-white/20 cursor-not-allowed"
                    >
                      Out of Stock
                    </button>
                  )}
                </div>
              </div>
            ))}

            {products.length === 0 && (
              <div className="col-span-full rounded-2xl border border-white/5 bg-[#0f1210] p-12 text-center">
                <HelpCircle size={40} className="mx-auto text-[#889e8b] mb-4" />
                <h3 className="font-bold text-base">No Products Seeded</h3>
                <p className="text-xs text-[#889e8b] mt-1 max-w-sm mx-auto">
                  Ask the Super Admin to load products in the global catalog, and configure inventory override mappings for regional stores.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* LOCATION SELECTION OVERLAY */}
      {isLocationOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/5 bg-[#0f1210] p-6 space-y-6 shadow-2xl relative">
            <button 
              onClick={() => setIsLocationOpen(false)}
              className="absolute top-4 right-4 text-white/60 hover:text-white"
            >
              <X size={18} />
            </button>

            <div>
              <h3 className="text-lg font-bold">Select Delivery Zone</h3>
              <p className="text-xs text-[#889e8b] mt-1">Select a coordinate profile to test our geofenced routing engine</p>
            </div>

            {/* Presets */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-[#889e8b] uppercase tracking-wider">Test Coordinate Presets</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {presets.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => handlePresetSelect(preset)}
                    className="text-left rounded-xl border border-white/5 bg-white/[0.01] p-3 text-xs hover:bg-white/[0.03] hover:border-emerald-500/20 transition-all"
                  >
                    <strong className="block font-semibold text-white">{preset.name}</strong>
                    <span className="text-[10px] text-[#889e8b] font-mono mt-1 block">Coords: {preset.lat}, {preset.lng}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-white/5"></div>
              <span className="flex-shrink mx-4 text-[10px] font-bold text-white/20 uppercase tracking-widest">Or Enter Custom Coordinates</span>
              <div className="flex-grow border-t border-white/5"></div>
            </div>

            {/* Form */}
            <form onSubmit={handleCustomSubmit} className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-[#889e8b] uppercase">Street Address</label>
                <input
                  type="text"
                  required
                  value={addressInput}
                  onChange={e => setAddressInput(e.target.value)}
                  placeholder="Street name, landmark, city"
                  className="w-full rounded-lg border border-white/5 bg-white/[0.01] px-3 py-2.5 text-xs outline-none focus:border-white/10"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-[#889e8b] uppercase">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={latInput}
                    onChange={e => setLatInput(e.target.value)}
                    className="w-full rounded-lg border border-white/5 bg-white/[0.01] px-3 py-2.5 text-xs outline-none focus:border-white/10"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-[#889e8b] uppercase">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={lngInput}
                    onChange={e => setLngInput(e.target.value)}
                    className="w-full rounded-lg border border-white/5 bg-white/[0.01] px-3 py-2.5 text-xs outline-none focus:border-white/10"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-emerald-500 py-3 text-xs font-bold text-black hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? 'Initializing Geofences...' : 'Apply Location Coordinates'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SHOPPING CART SLIDE OUT DRAWER */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md h-full bg-[#0f1210] border-l border-white/5 p-6 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-300">
            <div>
              <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
                <h3 className="text-base font-bold flex items-center gap-2">
                  <ShoppingBag size={18} className="text-emerald-400" />
                  <span>Your Cart ({totalCartItems})</span>
                </h3>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="text-white/60 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Cart Items List */}
              <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-2">
                {cart.map((item) => (
                  <div key={item.id} className="rounded-xl border border-white/5 bg-white/[0.01] p-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-lg border border-white/5 bg-white/[0.01] flex items-center justify-center overflow-hidden">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.title} className="object-cover w-full h-full" />
                        ) : (
                          <ShoppingBag size={16} className="text-white/20" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-xs max-w-[150px] truncate">{item.title}</h4>
                        <span className="text-[10px] text-white/40 block">Price: ₹{item.localPrice.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Quantity Toggles */}
                      <div className="flex items-center gap-2 border border-white/5 bg-black/20 rounded-lg p-1">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="h-6 w-6 rounded-md bg-white/[0.02] flex items-center justify-center hover:bg-white/[0.05]"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="text-xs font-mono font-bold w-4 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="h-6 w-6 rounded-md bg-white/[0.02] flex items-center justify-center hover:bg-white/[0.05]"
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      {/* Trash */}
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-400/60 hover:text-red-400 hover:bg-red-500/5 rounded-lg p-1.5"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}

                {cart.length === 0 && (
                  <div className="text-center py-12 text-[#889e8b] space-y-2">
                    <ShoppingBag size={32} className="mx-auto opacity-20" />
                    <p className="text-xs">Your shopping cart is currently empty.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Total Block */}
            <div className="border-t border-white/5 pt-6 space-y-4">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-[#889e8b]">Cart Subtotal</span>
                <strong className="text-lg font-extrabold text-white">₹{cartSubtotal.toFixed(2)}</strong>
              </div>

              {cart.length > 0 ? (
                <Link
                  href="/checkout"
                  onClick={() => setIsCartOpen(false)}
                  className="w-full text-center block rounded-xl bg-emerald-500 py-3.5 text-xs font-bold text-black hover:opacity-90 active:scale-[0.98] transition-all"
                >
                  Proceed to Checkout
                </Link>
              ) : (
                <button
                  disabled
                  className="w-full rounded-xl bg-white/5 border border-white/5 py-3.5 text-xs font-semibold text-white/20 cursor-not-allowed text-center"
                >
                  Proceed to Checkout
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StorefrontPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#090c0a] text-white flex flex-col justify-center items-center">
        <div className="animate-pulse text-emerald-400 font-semibold text-xs">Initializing storefront console...</div>
      </div>
    }>
      <StorefrontContent />
    </Suspense>
  );
}
