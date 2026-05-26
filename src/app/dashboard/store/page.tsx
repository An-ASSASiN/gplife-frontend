'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../../../components/Header';
import { useAuthStore } from '../../../store/useAuthStore';
import { api } from '../../../utils/api';
import { 
  ClipboardList, 
  MapPin, 
  RefreshCw, 
  Plus, 
  AlertCircle, 
  Package, 
  TrendingUp, 
  Truck, 
  CheckCircle, 
  Slash,
  ChevronRight,
  Send,
  XCircle,
  FileSpreadsheet
} from 'lucide-react';

interface ProductInventory {
  id: string; // productId
  sku: string;
  title: string;
  category: string;
  basePriceMSRP: number;
  localPrice: number;
  stockQuantity: number;
  isAvailable: boolean;
  lowStockAlert: number;
}

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product: {
    title: string;
  };
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  totalAmount: number;
  createdAt: string;
  items: OrderItem[];
}

interface RestockRequest {
  id: string;
  status: string;
  createdAt: string;
  items: {
    id: string;
    quantity: number;
    product: {
      title: string;
    };
  }[];
}

interface LedgerLine {
  id: string;
  entry: {
    description: string;
    createdAt: string;
    referenceId?: string;
  };
  account: {
    code: string;
    name: string;
  };
  debit: number;
  credit: number;
}

export default function StoreOperatorDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, loadAuthFromStorage } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory' | 'restock' | 'ledger'>('orders');

  // Mapped store state
  const [myStore, setMyStore] = useState<any | null>(null);

  // Data states
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<ProductInventory[]>([]);
  const [restockRequests, setRestockRequests] = useState<RestockRequest[]>([]);
  const [ledgerLines, setLedgerLines] = useState<LedgerLine[]>([]);

  // Inventory adjustment form
  const [editingItem, setEditingItem] = useState<ProductInventory | null>(null);
  const [priceInput, setPriceInput] = useState('');
  const [stockInput, setStockInput] = useState('');

  // Submit restock state
  const [selectedProduct, setSelectedProduct] = useState('');
  const [restockQty, setRestockQty] = useState('');
  const [restockCart, setRestockCart] = useState<{ productId: string; title: string; quantity: number }[]>([]);

  useEffect(() => {
    loadAuthFromStorage();
  }, [loadAuthFromStorage]);

  useEffect(() => {
    // Only allow STORE_ADMIN, STORE_STAFF, or SUPERADMIN bypass
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user && user.role !== 'STORE_ADMIN' && user.role !== 'STORE_STAFF' && user.role !== 'SUPERADMIN') {
      router.push('/');
    } else {
      resolveStoreAndLoad();
    }
  }, [isAuthenticated, user]);

  const resolveStoreAndLoad = async () => {
    setLoading(true);
    try {
      const storesRes = await api.get('/stores');
      const allStores = storesRes.data;

      // Find store where active user id is mapped as staff
      const storeMatch = allStores.find((s: any) => 
        s.staff.some((member: any) => member.user.id === user?.id)
      ) || allStores[0]; // Fallback to first store for superadmin testing

      if (storeMatch) {
        setMyStore(storeMatch);
        loadStoreData(storeMatch.id);
      }
    } catch (err) {
      console.error('Failed to resolve store context:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStoreData = async (storeId: string) => {
    try {
      // 1. Fetch Store Orders Queue
      const ordersRes = await api.get(`/orders/store/${storeId}`);
      setOrders(ordersRes.data);

      // 2. Fetch Store Localized Stock catalog
      const invRes = await api.get(`/products/inventory/${storeId}`);
      setInventory(invRes.data);

      // 3. Fetch Restock requests
      const restockRes = await api.get(`/restock/store/${storeId}`);
      setRestockRequests(restockRes.data);

      // 4. Fetch Local Ledger accounting entries
      const ledgerRes = await api.get(`/accounting/entries?storeId=${storeId}`);
      
      // Flatten entries into journal lines
      const lines: LedgerLine[] = [];
      ledgerRes.data.forEach((entry: any) => {
        entry.journalLines.forEach((jl: any) => {
          lines.push({
            id: jl.id,
            entry: {
              description: entry.description,
              createdAt: entry.createdAt,
              referenceId: entry.referenceId,
            },
            account: jl.account,
            debit: jl.debit,
            credit: jl.credit,
          });
        });
      });
      setLedgerLines(lines);

    } catch (err) {
      console.error('Failed to load store console stats:', err);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, nextStatus: string) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status: nextStatus });
      alert(`Order status updated to ${nextStatus}`);
      if (myStore) loadStoreData(myStore.id);
    } catch (err: any) {
      alert('Failed to update status');
    }
  };

  const handleAdjustInventorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !myStore) return;

    try {
      await api.post(`/products/inventory/${myStore.id}/adjust`, {
        productId: editingItem.id,
        stockQuantity: parseInt(stockInput),
        localPrice: parseFloat(priceInput),
        performedBy: user?.name || 'STORE_OPERATOR',
      });
      alert('Local inventory overrides adjusted successfully!');
      setEditingItem(null);
      loadStoreData(myStore.id);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to adjust overrides');
    }
  };

  const handleAddRestockCart = () => {
    if (!selectedProduct || !restockQty) return;
    const prod = inventory.find(i => i.id === selectedProduct);
    if (!prod) return;

    // Check if already in cart
    const existing = restockCart.find(i => i.productId === selectedProduct);
    if (existing) {
      setRestockCart(restockCart.map(i => 
        i.productId === selectedProduct ? { ...i, quantity: i.quantity + parseInt(restockQty) } : i
      ));
    } else {
      setRestockCart([...restockCart, {
        productId: selectedProduct,
        title: prod.title,
        quantity: parseInt(restockQty),
      }]);
    }
    setRestockQty('');
  };

  const handleRemoveRestockCart = (prodId: string) => {
    setRestockCart(restockCart.filter(i => i.productId !== prodId));
  };

  const handleSubmitRestockRequest = async () => {
    if (restockCart.length === 0 || !myStore) return;

    try {
      await api.post('/restock/request', {
        storeId: myStore.id,
        items: restockCart.map(i => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
      });
      alert('Restock request submitted to HQ Warehouse!');
      setRestockCart([]);
      loadStoreData(myStore.id);
    } catch (err: any) {
      alert('Failed to submit restock request');
    }
  };

  return (
    <div className="min-h-screen bg-[#090c0a] text-white flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-10 space-y-8">
        
        {/* Dashboard Title banner */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-white/5 pb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Franchise Outlet Console</h1>
            <p className="text-xs text-[#889e8b] mt-1">
              {myStore ? `Operating Outlet: ${myStore.name} (${myStore.code})` : 'Resolving franchise node binding...'}
            </p>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={() => myStore && loadStoreData(myStore.id)}
              className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2 text-xs font-semibold text-[#889e8b] hover:text-white"
            >
              <RefreshCw size={14} />
              <span>Sync Dashboard</span>
            </button>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-white/5 gap-6 text-sm">
          <button 
            onClick={() => setActiveTab('orders')}
            className={`pb-4 font-semibold transition-all border-b-2 ${activeTab === 'orders' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-[#889e8b] hover:text-white'}`}
          >
            Fulfillment Queue ({orders.filter(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED').length})
          </button>
          <button 
            onClick={() => setActiveTab('inventory')}
            className={`pb-4 font-semibold transition-all border-b-2 ${activeTab === 'inventory' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-[#889e8b] hover:text-white'}`}
          >
            Inventory Stockroom
          </button>
          <button 
            onClick={() => setActiveTab('restock')}
            className={`pb-4 font-semibold transition-all border-b-2 ${activeTab === 'restock' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-[#889e8b] hover:text-white'}`}
          >
            HQ ERP Restocking
          </button>
          <button 
            onClick={() => setActiveTab('ledger')}
            className={`pb-4 font-semibold transition-all border-b-2 ${activeTab === 'ledger' ? 'border-emerald-400 text-emerald-400' : 'border-transparent text-[#889e8b] hover:text-white'}`}
          >
            Double-Entry Ledger
          </button>
        </div>

        {/* TAB 1: ORDERS QUEUE */}
        {activeTab === 'orders' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {orders.map((ord) => (
                <div key={ord.id} className="rounded-2xl border border-white/5 bg-[#0f1210] p-6 space-y-4 hover:border-white/10 transition-all">
                  <div className="flex justify-between items-start border-b border-white/5 pb-3">
                    <div>
                      <strong className="font-bold text-sm text-white">{ord.orderNumber}</strong>
                      <span className="text-[10px] text-white/40 block mt-0.5">{new Date(ord.createdAt).toLocaleString()}</span>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold ${
                      ord.status === 'DELIVERED' ? 'bg-green-500/10 text-green-400' :
                      ord.status === 'CANCELLED' ? 'bg-red-500/10 text-red-400' :
                      'bg-blue-500/10 text-blue-400'
                    }`}>{ord.status}</span>
                  </div>

                  {/* Customer details */}
                  <div className="text-xs space-y-1 text-white/80">
                    <p><strong className="text-white">Customer:</strong> {ord.customerName} ({ord.customerPhone})</p>
                    <p><strong className="text-white">Address:</strong> {ord.shippingAddress}</p>
                  </div>

                  {/* Items list */}
                  <div className="rounded-xl bg-black/35 p-3 space-y-2 border border-white/5">
                    {ord.items.map(item => (
                      <div key={item.id} className="flex justify-between text-xs text-[#889e8b]">
                        <span>{item.product.title} × {item.quantity}</span>
                        <span className="font-mono">₹{(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between text-xs font-bold text-white pt-2 border-t border-white/5 mt-2">
                      <span>Grand Total Settlement</span>
                      <span className="text-emerald-400 font-mono">₹{ord.totalAmount.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Action transitions */}
                  <div className="flex justify-end gap-2 pt-2">
                    {ord.status === 'ASSIGNED' && (
                      <button
                        onClick={() => handleUpdateOrderStatus(ord.id, 'PREPARING')}
                        className="rounded-lg bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-black hover:opacity-90 active:scale-[0.98] transition-all"
                      >
                        Start Preparing
                      </button>
                    )}
                    {ord.status === 'PREPARING' && (
                      <button
                        onClick={() => handleUpdateOrderStatus(ord.id, 'OUT_FOR_DELIVERY')}
                        className="rounded-lg bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-black hover:opacity-90 active:scale-[0.98] transition-all flex items-center gap-1.5"
                      >
                        <Truck size={12} />
                        <span>Dispatch Order</span>
                      </button>
                    )}
                    {ord.status === 'OUT_FOR_DELIVERY' && (
                      <button
                        onClick={() => handleUpdateOrderStatus(ord.id, 'DELIVERED')}
                        className="rounded-lg bg-emerald-500 px-3.5 py-1.5 text-xs font-bold text-black hover:opacity-90 active:scale-[0.98] transition-all flex items-center gap-1.5"
                      >
                        <CheckCircle size={12} />
                        <span>Complete Delivery</span>
                      </button>
                    )}
                    {ord.status !== 'DELIVERED' && ord.status !== 'CANCELLED' && (
                      <button
                        onClick={() => handleUpdateOrderStatus(ord.id, 'CANCELLED')}
                        className="rounded-lg border border-red-500/10 bg-red-500/5 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/10"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                </div>
              ))}
              {orders.length === 0 && (
                <div className="col-span-full rounded-2xl border border-white/5 bg-[#0f1210] p-12 text-center text-[#889e8b]">
                  <ClipboardList size={36} className="mx-auto opacity-20 mb-3" />
                  <p className="text-xs">No orders assigned to your geocoded territory radiuses yet.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: INVENTORY STOCKROOM */}
        {activeTab === 'inventory' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            
            {/* Stock catalog table */}
            <div className="lg:col-span-2 rounded-2xl border border-white/5 bg-[#0f1210] p-6 space-y-4 h-fit">
              <h3 className="font-bold text-sm text-white">Local Inventory Catalog</h3>
              
              <div className="overflow-x-auto rounded-xl border border-white/5">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.01]">
                      <th className="p-3 font-bold text-[#889e8b] uppercase">SKU / Product</th>
                      <th className="p-3 font-bold text-[#889e8b] uppercase">Local Price (₹)</th>
                      <th className="p-3 font-bold text-[#889e8b] uppercase">Wholesale MSRP</th>
                      <th className="p-3 font-bold text-[#889e8b] uppercase">Available Stock</th>
                      <th className="p-3 font-bold text-[#889e8b] uppercase text-right">Overrides</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map((item) => (
                      <tr key={item.id} className="border-b border-white/5 hover:bg-white/[0.01]">
                        <td className="p-3">
                          <strong className="text-white block">{item.title}</strong>
                          <span className="text-[9px] text-[#889e8b] font-mono">{item.sku}</span>
                        </td>
                        <td className="p-3 font-mono text-emerald-400 font-bold">
                          ₹{item.localPrice.toFixed(2)}
                        </td>
                        <td className="p-3 font-mono text-white/50">
                          ₹{item.basePriceMSRP.toFixed(2)}
                        </td>
                        <td className="p-3">
                          <span className={`font-bold font-mono ${item.stockQuantity <= item.lowStockAlert ? 'text-red-400 animate-pulse' : 'text-white'}`}>
                            {item.stockQuantity}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              setEditingItem(item);
                              setPriceInput(item.localPrice.toString());
                              setStockInput(item.stockQuantity.toString());
                            }}
                            className="rounded bg-white/5 border border-white/5 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-white/[0.08]"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Price/Stock Override Form Panel */}
            <div className="space-y-6">
              {editingItem ? (
                <div className="rounded-2xl border border-white/5 bg-[#0f1210] p-6 space-y-4 animate-in zoom-in-95 duration-200">
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <h3 className="font-bold text-xs text-white">Adjust overrides: {editingItem.title}</h3>
                    <button onClick={() => setEditingItem(null)} className="text-white/40 hover:text-white"><Slash size={10} /></button>
                  </div>

                  <form onSubmit={handleAdjustInventorySubmit} className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-bold text-[#889e8b] uppercase">Checkout retail Price (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={priceInput}
                        onChange={e => setPriceInput(e.target.value)}
                        className="w-full rounded-lg border border-white/5 bg-white/[0.01] px-3 py-2 text-xs outline-none focus:border-white/10"
                      />
                      <span className="text-[8px] text-white/30 block">Global MSRP: ₹{editingItem.basePriceMSRP}</span>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-bold text-[#889e8b] uppercase">Absolute Stock quantity</label>
                      <input
                        type="number"
                        required
                        value={stockInput}
                        onChange={e => setStockInput(e.target.value)}
                        className="w-full rounded-lg border border-white/5 bg-white/[0.01] px-3 py-2 text-xs outline-none focus:border-white/10"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full rounded-lg bg-emerald-500 py-2 text-xs font-bold text-black hover:opacity-90 active:scale-[0.98] transition-all"
                    >
                      Apply Override parameters
                    </button>
                  </form>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/5 p-8 text-center text-[#889e8b]">
                  <Package size={32} className="mx-auto opacity-10 mb-3" />
                  <p className="text-xs">Select any product from inventory stock list to override checkout prices locally.</p>
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 3: HQ ERP RESTOCKING */}
        {activeTab === 'restock' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            
            {/* Restock Form Panel */}
            <div className="rounded-2xl border border-white/5 bg-[#0f1210] p-6 space-y-4 h-fit">
              <h3 className="font-bold text-sm text-white">Request Replenishment</h3>
              <p className="text-xs text-[#889e8b]">Add products and specify wholesale restocking counts for HQ approval.</p>

              <div className="space-y-4 border-t border-white/5 pt-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-[#889e8b] uppercase">Choose product</label>
                  <select
                    value={selectedProduct}
                    onChange={e => setSelectedProduct(e.target.value)}
                    className="w-full rounded-lg border border-white/5 bg-white/[0.01] px-3 py-2 text-xs outline-none text-white focus:bg-[#0f1210]"
                  >
                    <option value="" className="bg-[#0f1210]">-- Select Item --</option>
                    {inventory.map(item => (
                      <option key={item.id} value={item.id} className="bg-[#0f1210]">{item.title} (SKU: {item.sku})</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-[#889e8b] uppercase">Restock count</label>
                  <input
                    type="number"
                    min="1"
                    value={restockQty}
                    onChange={e => setRestockQty(e.target.value)}
                    placeholder="Enter Qty"
                    className="w-full rounded-lg border border-white/5 bg-white/[0.01] px-3 py-2 text-xs outline-none focus:border-white/10"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddRestockCart}
                  className="w-full rounded-lg border border-white/5 bg-white/[0.02] py-2 text-xs font-semibold hover:bg-white/[0.05]"
                >
                  Add to Restock list
                </button>
              </div>

              {/* Cart Items List */}
              {restockCart.length > 0 && (
                <div className="border-t border-white/5 pt-4 space-y-3">
                  <span className="text-[9px] font-bold text-[#889e8b] uppercase">Replenish basket items</span>
                  <div className="space-y-2 max-h-[20vh] overflow-y-auto pr-1">
                    {restockCart.map(item => (
                      <div key={item.productId} className="flex justify-between items-center text-xs rounded bg-white/[0.01] border border-white/5 p-2">
                        <span>{item.title} (x{item.quantity})</span>
                        <button onClick={() => handleRemoveRestockCart(item.productId)} className="text-red-400 font-bold hover:opacity-85">Remove</button>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleSubmitRestockRequest}
                    className="w-full rounded-lg bg-emerald-500 py-2.5 text-xs font-bold text-black hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                  >
                    <Send size={12} />
                    <span>Submit restock request</span>
                  </button>
                </div>
              )}
            </div>

            {/* Restock History Table */}
            <div className="lg:col-span-2 rounded-2xl border border-white/5 bg-[#0f1210] p-6 space-y-4">
              <h3 className="font-bold text-sm text-white">Replenishment Audit Log</h3>
              
              <div className="overflow-x-auto rounded-xl border border-white/5 max-h-[50vh]">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.01]">
                      <th className="p-3 font-bold text-[#889e8b] uppercase">Request ID</th>
                      <th className="p-3 font-bold text-[#889e8b] uppercase">Date Posted</th>
                      <th className="p-3 font-bold text-[#889e8b] uppercase">Items list</th>
                      <th className="p-3 font-bold text-[#889e8b] uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {restockRequests.map((req) => (
                      <tr key={req.id} className="border-b border-white/5 hover:bg-white/[0.01]">
                        <td className="p-3 font-mono text-purple-300">
                          {req.id.substring(0,8)}...
                        </td>
                        <td className="p-3 text-white/70">
                          {new Date(req.createdAt).toLocaleString()}
                        </td>
                        <td className="p-3">
                          {req.items.map(i => `${i.product.title} (${i.quantity})`).join(', ')}
                        </td>
                        <td className="p-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold ${
                            req.status === 'APPROVED' ? 'bg-green-500/10 text-green-400' :
                            req.status === 'REJECTED' ? 'bg-red-500/10 text-red-400' :
                            'bg-amber-500/10 text-amber-400'
                          }`}>{req.status}</span>
                        </td>
                      </tr>
                    ))}
                    {restockRequests.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center text-xs text-[#889e8b] py-8">
                          No restocking replenishment logs found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* TAB 4: DOUBLE-ENTRY LEDGER */}
        {activeTab === 'ledger' && (
          <div className="rounded-2xl border border-white/5 bg-[#0f1210] p-6 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm text-white">Store Ledger Journals</h3>
                <p className="text-xs text-[#889e8b] mt-0.5">Double-entry accounting audits for local cash and retail transactions</p>
              </div>
              <FileSpreadsheet className="text-emerald-400/30 animate-pulse" size={24} />
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/5">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.01]">
                    <th className="p-4 font-bold text-[#889e8b] uppercase">Date</th>
                    <th className="p-4 font-bold text-[#889e8b] uppercase">Journal Description</th>
                    <th className="p-4 font-bold text-[#889e8b] uppercase">Account Code / Name</th>
                    <th className="p-4 font-bold text-[#889e8b] uppercase">Debit (₹)</th>
                    <th className="p-4 font-bold text-[#889e8b] uppercase text-right">Credit (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerLines.map((line) => (
                    <tr key={line.id} className="border-b border-white/5 hover:bg-white/[0.01]">
                      <td className="p-4 text-white/50">
                        {new Date(line.entry.createdAt).toLocaleDateString()} <br/>
                        <span className="text-[9px] text-[#889e8b] font-mono">{new Date(line.entry.createdAt).toLocaleTimeString()}</span>
                      </td>
                      <td className="p-4">
                        <strong className="text-white block">{line.entry.description}</strong>
                        {line.entry.referenceId && (
                          <span className="text-[9px] text-white/30 font-mono">Ref ID: {line.entry.referenceId.substring(0,8)}...</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-mono text-purple-300 mr-2">{line.account.code}</span>
                        <strong className="text-white">{line.account.name}</strong>
                      </td>
                      <td className="p-4 font-mono font-semibold text-emerald-400">
                        {line.debit > 0 ? `₹${line.debit.toFixed(2)}` : '--'}
                      </td>
                      <td className="p-4 font-mono font-semibold text-red-400 text-right">
                        {line.credit > 0 ? `₹${line.credit.toFixed(2)}` : '--'}
                      </td>
                    </tr>
                  ))}
                  {ledgerLines.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center text-xs text-[#889e8b] py-8">
                        No ledger entries recorded for this store node yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
