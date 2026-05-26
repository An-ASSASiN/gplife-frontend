'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../store/useAuthStore';
import { api } from '../../../utils/api';
import { 
  MapPin, 
  ShoppingBag, 
  Layout, 
  Users, 
  RefreshCw, 
  Plus, 
  Check, 
  Menu,
  ShieldAlert,
  Sliders,
  DollarSign,
  Package,
  FileSpreadsheet
} from 'lucide-react';

interface StoreStaff {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: {
      name: string;
    };
  };
}

interface Store {
  id: string;
  code: string;
  name: string;
  type: string;
  isActive: boolean;
  address: string;
  latitude: number;
  longitude: number;
  deliveryRadiusKm: number;
  operatingHoursOpen: string;
  operatingHoursClose: string;
  fulfillmentCapacity: number;
  taxRegistrationNo?: string;
  staff: StoreStaff[];
}

interface User {
  id: string;
  name: string;
  email: string;
  role: {
    id: string;
    name: string;
  };
  storeStaff: {
    store: {
      id: string;
      name: string;
    };
  }[];
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, loadAuthFromStorage, clearAuth } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'main' | 'stores' | 'accounts' | 'payouts' | 'restocks' | 'ledger'>('main');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(false);

  // Loaded DB lists
  const [stores, setStores] = useState<Store[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [restocks, setRestocks] = useState<any[]>([]);
  const [ledgerLines, setLedgerLines] = useState<any[]>([]);

  // Form states
  const [newStore, setNewStore] = useState({
    code: '',
    name: '',
    type: 'FRANCHISE',
    address: '',
    latitude: 40.7128,
    longitude: -74.0060,
    deliveryRadiusKm: 15.0,
    operatingHoursOpen: '09:00',
    operatingHoursClose: '21:00',
    fulfillmentCapacity: 100,
    taxRegistrationNo: '',
  });

  const [assignUser, setAssignUser] = useState('');
  const [assignStore, setAssignStore] = useState('');

  useEffect(() => {
    loadAuthFromStorage();
  }, [loadAuthFromStorage]);

  useEffect(() => {
    // Restrict access to SUPERADMIN only
    if (!isAuthenticated) {
      router.push('/login');
    } else if (user && user.role !== 'SUPERADMIN') {
      router.push('/');
    } else {
      loadData();
    }
  }, [isAuthenticated, user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const storesRes = await api.get('/stores');
      setStores(storesRes.data);

      const usersRes = await api.get('/auth/users');
      setUsers(usersRes.data);

      const withdrawalsRes = await api.get('/affiliates/admin/withdrawals');
      setWithdrawals(withdrawalsRes.data);

      const restocksRes = await api.get('/restock/admin/requests');
      setRestocks(restocksRes.data);

      const ledgerRes = await api.get('/accounting/entries');
      const lines: any[] = [];
      ledgerRes.data.forEach((entry: any) => {
        entry.journalLines.forEach((jl: any) => {
          lines.push({
            id: jl.id,
            description: entry.description,
            createdAt: entry.createdAt,
            referenceId: entry.referenceId,
            store: entry.store,
            account: jl.account,
            debit: jl.debit,
            credit: jl.credit,
          });
        });
      });
      setLedgerLines(lines);

    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPayout = async (id: string, status: 'PAID' | 'REJECTED') => {
    if (!confirm(`Are you sure you want to transition this payout to ${status}?`)) return;
    try {
      await api.post(`/affiliates/admin/withdrawals/${id}/payout`, { status });
      alert(`Payout request ${status === 'PAID' ? 'disbursed' : 'rejected'}`);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to process payout');
    }
  };

  const handleProcessRestock = async (id: string, action: 'approve' | 'reject') => {
    if (!confirm(`Are you sure you want to ${action} this restocking request?`)) return;
    try {
      await api.post(`/restock/admin/requests/${id}/${action}`);
      alert(`Restock request ${action}d successfully`);
      loadData();
    } catch (err: any) {
      alert('Failed to process restock');
    }
  };

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/stores', {
        ...newStore,
        latitude: parseFloat(newStore.latitude.toString()),
        longitude: parseFloat(newStore.longitude.toString()),
        deliveryRadiusKm: parseFloat(newStore.deliveryRadiusKm.toString()),
        fulfillmentCapacity: parseInt(newStore.fulfillmentCapacity.toString()),
      });
      alert('Store registered and geocoding parameters initialized!');
      setNewStore({
        code: '',
        name: '',
        type: 'FRANCHISE',
        address: '',
        latitude: 40.7128,
        longitude: -74.0060,
        deliveryRadiusKm: 15.0,
        operatingHoursOpen: '09:00',
        operatingHoursClose: '21:00',
        fulfillmentCapacity: 100,
        taxRegistrationNo: '',
      });
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to register store');
    }
  };

  const handleAssignOperator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignUser || !assignStore) return;

    try {
      await api.post(`/stores/${assignStore}/assign-operator`, {
        userId: assignUser,
      });
      alert('User successfully promoted to STORE_ADMIN and assigned to outlet!');
      setAssignUser('');
      setAssignStore('');
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to assign operator');
    }
  };

  const handleDeactivateStore = async (id: string) => {
    if (!confirm('Are you sure you want to suspend this store node?')) return;
    try {
      await api.delete(`/stores/${id}`);
      alert('Store suspended');
      loadData();
    } catch (err: any) {
      alert('Failed to suspend store');
    }
  };

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-[#090c0a] text-white">
      <div className={`grid min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'grid-cols-[80px_1fr]' : 'grid-cols-[240px_1fr]'}`}>
        
        {/* SIDEBAR NAVIGATION */}
        <aside className="border-r border-white/5 bg-[#0f1210] p-6 flex flex-col justify-between">
          <div className="space-y-8">
            <div className="flex items-center gap-3 pl-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 shadow-md shadow-purple-500/20">
                <span className="font-extrabold text-xs">HQ</span>
              </div>
              {!sidebarCollapsed && <span className="font-bold tracking-tight text-white">HQ Console</span>}
            </div>

            <nav className="flex flex-col gap-2">
              <button 
                onClick={() => setActiveTab('main')}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${activeTab === 'main' ? 'bg-white/[0.05] text-purple-400' : 'text-[#889e8b] hover:bg-white/[0.02] hover:text-white'}`}
              >
                <Layout size={18} />
                {!sidebarCollapsed && <span>Summary</span>}
              </button>

              <button 
                onClick={() => setActiveTab('stores')}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${activeTab === 'stores' ? 'bg-white/[0.05] text-purple-400' : 'text-[#889e8b] hover:bg-white/[0.02] hover:text-white'}`}
              >
                <MapPin size={18} />
                {!sidebarCollapsed && <span>Store Outlets</span>}
              </button>

              <button 
                onClick={() => setActiveTab('accounts')}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${activeTab === 'accounts' ? 'bg-white/[0.05] text-purple-400' : 'text-[#889e8b] hover:bg-white/[0.02] hover:text-white'}`}
              >
                <Users size={18} />
                {!sidebarCollapsed && <span>Operator Admin</span>}
              </button>

              <button 
                onClick={() => setActiveTab('payouts')}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${activeTab === 'payouts' ? 'bg-white/[0.05] text-purple-400' : 'text-[#889e8b] hover:bg-white/[0.02] hover:text-white'}`}
              >
                <DollarSign size={18} />
                {!sidebarCollapsed && <span>Affiliate Payouts</span>}
              </button>

              <button 
                onClick={() => setActiveTab('restocks')}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${activeTab === 'restocks' ? 'bg-white/[0.05] text-purple-400' : 'text-[#889e8b] hover:bg-white/[0.02] hover:text-white'}`}
              >
                <Package size={18} />
                {!sidebarCollapsed && <span>Restock Requests</span>}
              </button>

              <button 
                onClick={() => setActiveTab('ledger')}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${activeTab === 'ledger' ? 'bg-white/[0.05] text-purple-400' : 'text-[#889e8b] hover:bg-white/[0.02] hover:text-white'}`}
              >
                <FileSpreadsheet size={18} />
                {!sidebarCollapsed && <span>Corporate Ledger</span>}
              </button>
            </nav>
          </div>

          <div className="space-y-4">
            <button 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-[#889e8b] hover:bg-white/[0.02]"
            >
              <Menu size={18} />
              {!sidebarCollapsed && <span>Collapse Sidebar</span>}
            </button>
            <button 
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-red-400 hover:bg-red-500/5"
            >
              <ShieldAlert size={18} />
              {!sidebarCollapsed && <span>Sign Out</span>}
            </button>
          </div>
        </aside>

        {/* MAIN PANEL DISPLAY */}
        <main className="p-10 overflow-y-auto">
          <header className="mb-10 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">HQ Enterprise Console</h2>
              <p className="text-sm text-[#889e8b]">Centralized Franchise Commerce Operating System</p>
            </div>
            <button 
              onClick={loadData}
              className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2 text-xs font-semibold text-[#889e8b] hover:text-white"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Sync DB
            </button>
          </header>

          {/* TAB 1: MAIN SUMMARY */}
          {activeTab === 'main' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="grid grid-cols-4 gap-6">
                <div className="rounded-2xl border border-white/5 bg-[#0f1210] p-6">
                  <span className="text-xs font-semibold text-[#889e8b] uppercase tracking-wider">Active Stores</span>
                  <h3 className="mt-2 text-3xl font-extrabold">{stores.filter(s => s.isActive).length} Hubs</h3>
                </div>
                <div className="rounded-2xl border border-white/5 bg-[#0f1210] p-6">
                  <span className="text-xs font-semibold text-[#889e8b] uppercase tracking-wider">Registered Operators</span>
                  <h3 className="mt-2 text-3xl font-extrabold">{users.filter(u => u.role.name === 'STORE_ADMIN').length} Operators</h3>
                </div>
                <div className="rounded-2xl border border-white/5 bg-[#0f1210] p-6">
                  <span className="text-xs font-semibold text-[#889e8b] uppercase tracking-wider">Retail Customer Profiles</span>
                  <h3 className="mt-2 text-3xl font-extrabold">{users.filter(u => u.role.name === 'CUSTOMER').length} Users</h3>
                </div>
                <div className="rounded-2xl border border-white/5 bg-[#0f1210] p-6">
                  <span className="text-xs font-semibold text-[#889e8b] uppercase tracking-wider">Platform Staff</span>
                  <h3 className="mt-2 text-3xl font-extrabold">{users.filter(u => u.role.name === 'SUPERADMIN').length} Admins</h3>
                </div>
              </div>

              {/* Bento Grid */}
              <div className="grid grid-cols-3 gap-6">
                
                {/* Geofencing Radius map card */}
                <div className="col-span-2 rounded-2xl border border-white/5 bg-[#0f1210] p-8">
                  <h4 className="text-lg font-bold">Outlet Geofencing Coverages</h4>
                  <p className="text-xs text-[#889e8b] mt-1 mb-6">Fulfillment radiuses mapping for geocoded deliveries</p>
                  
                  <div className="h-64 rounded-xl border border-white/5 bg-white/[0.01] flex items-center justify-center">
                    <div className="text-center">
                      <MapPin size={32} className="mx-auto text-purple-400 mb-3" />
                      <p className="text-sm font-semibold">Active Geofences Map Loaded</p>
                      <p className="text-xs text-[#889e8b] mt-1">Spatial grids initialized for {stores.length} outlets</p>
                    </div>
                  </div>
                </div>

                {/* Corporate ERP summary */}
                <div className="rounded-2xl border border-white/5 bg-[#0f1210] p-8 flex flex-col justify-between">
                  <div>
                    <h4 className="text-lg font-bold">HQ Warehouse ERP</h4>
                    <p className="text-xs text-[#889e8b] mt-1">Franchise supply chain stock ledger</p>
                  </div>
                  <div className="py-6 border-y border-white/5 my-6 space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#889e8b]">Wholesale SKU Catalog</span>
                      <strong className="text-white">0 SKUs</strong>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#889e8b]">Pending Restock Requests</span>
                      <strong className="text-white">0 Orders</strong>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-[#889e8b] tracking-widest text-center">ERP System Online</span>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: STORES */}
          {activeTab === 'stores' && (
            <div className="grid grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              
              {/* Register Store Form */}
              <div className="rounded-2xl border border-white/5 bg-[#0f1210] p-6 h-fit">
                <h3 className="text-lg font-bold mb-6">Register New Franchise</h3>
                
                <form onSubmit={handleCreateStore} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-[#889e8b] uppercase">Store Code</label>
                      <input
                        type="text"
                        required
                        value={newStore.code}
                        onChange={e => setNewStore({...newStore, code: e.target.value})}
                        placeholder="ST-NY-01"
                        className="w-full rounded-lg border border-white/5 bg-white/[0.01] px-3 py-2 text-xs outline-none focus:border-white/10"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-[#889e8b] uppercase">Brand Name</label>
                      <input
                        type="text"
                        required
                        value={newStore.name}
                        onChange={e => setNewStore({...newStore, name: e.target.value})}
                        placeholder="Manhattan Hub"
                        className="w-full rounded-lg border border-white/5 bg-white/[0.01] px-3 py-2 text-xs outline-none focus:border-white/10"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-[#889e8b] uppercase">Street Address</label>
                    <input
                      type="text"
                      required
                      value={newStore.address}
                      onChange={e => setNewStore({...newStore, address: e.target.value})}
                      placeholder="Times Square, New York, NY"
                      className="w-full rounded-lg border border-white/5 bg-white/[0.01] px-3 py-2 text-xs outline-none focus:border-white/10"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-[#889e8b] uppercase">Latitude</label>
                      <input
                        type="number"
                        step="0.0001"
                        required
                        value={newStore.latitude}
                        onChange={e => setNewStore({...newStore, latitude: parseFloat(e.target.value)})}
                        className="w-full rounded-lg border border-white/5 bg-white/[0.01] px-3 py-2 text-xs outline-none focus:border-white/10"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-[#889e8b] uppercase">Longitude</label>
                      <input
                        type="number"
                        step="0.0001"
                        required
                        value={newStore.longitude}
                        onChange={e => setNewStore({...newStore, longitude: parseFloat(e.target.value)})}
                        className="w-full rounded-lg border border-white/5 bg-white/[0.01] px-3 py-2 text-xs outline-none focus:border-white/10"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-[#889e8b] uppercase">Fulfillment Radius (KM)</label>
                    <input
                      type="number"
                      required
                      value={newStore.deliveryRadiusKm}
                      onChange={e => setNewStore({...newStore, deliveryRadiusKm: parseFloat(e.target.value)})}
                      className="w-full rounded-lg border border-white/5 bg-white/[0.01] px-3 py-2 text-xs outline-none focus:border-white/10"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-lg bg-gradient-to-tr from-purple-500 to-indigo-500 py-2.5 text-xs font-semibold text-white shadow-md hover:opacity-90 active:scale-[0.98]"
                  >
                    Register Store Node
                  </button>
                </form>
              </div>

              {/* Stores List */}
              <div className="col-span-2 rounded-2xl border border-white/5 bg-[#0f1210] p-6">
                <h3 className="text-lg font-bold mb-6">Active Fulfillment Outlets</h3>
                
                <div className="space-y-4">
                  {stores.map(store => (
                    <div key={store.id} className="rounded-xl border border-white/5 bg-white/[0.01] p-4 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm">{store.name}</h4>
                          <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] font-mono text-purple-300">{store.code}</span>
                          <span className={`h-2 w-2 rounded-full ${store.isActive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        </div>
                        <p className="text-xs text-[#889e8b] mt-1">{store.address}</p>
                        <p className="text-[10px] font-mono text-white/40 mt-1">Geo: {store.latitude}, {store.longitude} | Radius: {store.deliveryRadiusKm} KM</p>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="block text-[10px] text-[#889e8b] uppercase">Operator Assigned</span>
                          <strong className="text-xs text-white">
                            {store.staff?.[0]?.user?.name || 'Unassigned'}
                          </strong>
                        </div>
                        {store.isActive && (
                          <button 
                            onClick={() => handleDeactivateStore(store.id)}
                            className="rounded-lg border border-red-500/10 bg-red-500/5 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-500/10"
                          >
                            Suspend
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {stores.length === 0 && (
                    <p className="text-center text-xs text-[#889e8b] py-8">No stores registered in the franchise OS yet.</p>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: ACCOUNTS & ELEVATION */}
          {activeTab === 'accounts' && (
            <div className="grid grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              
              {/* Operator Assign Form */}
              <div className="rounded-2xl border border-white/5 bg-[#0f1210] p-6 h-fit">
                <h3 className="text-lg font-bold mb-6">Assign Store Operator</h3>
                
                <form onSubmit={handleAssignOperator} className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-[#889e8b] uppercase">Select User Account</label>
                    <select
                      required
                      value={assignUser}
                      onChange={e => setAssignUser(e.target.value)}
                      className="w-full rounded-lg border border-white/5 bg-white/[0.01] px-3 py-2 text-xs outline-none text-white focus:bg-[#0f1210]"
                    >
                      <option value="" className="bg-[#0f1210]">-- Choose Operator --</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id} className="bg-[#0f1210]">{u.name} ({u.email}) [{u.role.name}]</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-[#889e8b] uppercase">Select Franchise Store</label>
                    <select
                      required
                      value={assignStore}
                      onChange={e => setAssignStore(e.target.value)}
                      className="w-full rounded-lg border border-white/5 bg-white/[0.01] px-3 py-2 text-xs outline-none text-white focus:bg-[#0f1210]"
                    >
                      <option value="" className="bg-[#0f1210]">-- Choose Store --</option>
                      {stores.map(s => (
                        <option key={s.id} value={s.id} className="bg-[#0f1210]">{s.name} ({s.code})</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-lg bg-gradient-to-tr from-purple-500 to-indigo-500 py-2.5 text-xs font-semibold text-white shadow-md hover:opacity-90 active:scale-[0.98]"
                  >
                    Elevate & Map Operator
                  </button>
                </form>
              </div>

              {/* User Roles Directory */}
              <div className="col-span-2 rounded-2xl border border-white/5 bg-[#0f1210] p-6">
                <h3 className="text-lg font-bold mb-6">User Accounts Registry</h3>
                
                <div className="overflow-x-auto rounded-xl border border-white/5">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/[0.01]">
                        <th className="p-4 font-bold text-[#889e8b] uppercase">Name / Email</th>
                        <th className="p-4 font-bold text-[#889e8b] uppercase">Current Role</th>
                        <th className="p-4 font-bold text-[#889e8b] uppercase">Assigned Outlets</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.01]">
                          <td className="p-4">
                            <strong className="text-white block">{u.name}</strong>
                            <span className="text-[10px] text-[#889e8b]">{u.email}</span>
                          </td>
                          <td className="p-4">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              u.role.name === 'SUPERADMIN' ? 'bg-red-500/10 text-red-400' :
                              u.role.name === 'STORE_ADMIN' ? 'bg-amber-500/10 text-amber-400' :
                              u.role.name === 'COMPANY_STAFF' ? 'bg-blue-500/10 text-blue-400' :
                              'bg-green-500/10 text-green-400'
                            }`}>{u.role.name}</span>
                          </td>
                          <td className="p-4 font-mono text-white/55">
                            {u.storeStaff?.map(ss => ss.store.name).join(', ') || '--'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: AFFILIATE PAYOUTS */}
          {activeTab === 'payouts' && (
            <div className="rounded-2xl border border-white/5 bg-[#0f1210] p-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <h3 className="text-lg font-bold">Affiliate Withdrawal Payouts</h3>
                <p className="text-xs text-[#889e8b] mt-1">Review, approve or reject affiliate partner withdrawal requests</p>
              </div>

              <div className="overflow-x-auto rounded-xl border border-white/5">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.01]">
                      <th className="p-4 font-bold text-[#889e8b] uppercase">Partner Profile</th>
                      <th className="p-4 font-bold text-[#889e8b] uppercase">Ref Code</th>
                      <th className="p-4 font-bold text-[#889e8b] uppercase">Requested Amount</th>
                      <th className="p-4 font-bold text-[#889e8b] uppercase">Date Requested</th>
                      <th className="p-4 font-bold text-[#889e8b] uppercase">Status</th>
                      <th className="p-4 font-bold text-[#889e8b] uppercase text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawals.map((w) => (
                      <tr key={w.id} className="border-b border-white/5 hover:bg-white/[0.01]">
                        <td className="p-4">
                          <strong className="text-white block">{w.affiliate.user.name}</strong>
                          <span className="text-[10px] text-[#889e8b]">{w.affiliate.user.email}</span>
                        </td>
                        <td className="p-4 font-mono text-purple-300">
                          {w.affiliate.referralCode}
                        </td>
                        <td className="p-4 font-mono text-white font-semibold">
                          ₹{w.amount.toFixed(2)}
                        </td>
                        <td className="p-4 text-white/60">
                          {new Date(w.createdAt).toLocaleString()}
                        </td>
                        <td className="p-4">
                          <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                            w.status === 'PAID' ? 'bg-green-500/10 text-green-400' :
                            w.status === 'REJECTED' ? 'bg-red-500/10 text-red-400' :
                            'bg-amber-500/10 text-amber-400'
                          }`}>{w.status}</span>
                        </td>
                        <td className="p-4 text-right space-x-2">
                          {w.status === 'PENDING' ? (
                            <>
                              <button
                                onClick={() => handleProcessPayout(w.id, 'PAID')}
                                className="rounded-lg bg-green-500 px-3 py-1.5 text-[10px] font-bold text-black hover:opacity-90 active:scale-[0.98] transition-all"
                              >
                                Approve Payout
                              </button>
                              <button
                                onClick={() => handleProcessPayout(w.id, 'REJECTED')}
                                className="rounded-lg border border-red-500/10 bg-red-500/5 px-3 py-1.5 text-[10px] font-bold text-red-400 hover:bg-red-500/10 transition-all"
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] text-white/30 font-semibold uppercase">Processed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {withdrawals.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center text-xs text-[#889e8b] py-8">
                          No affiliate withdrawal requests have been posted yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: WAREHOUSE RESTOCK REQUESTS */}
          {activeTab === 'restocks' && (
            <div className="rounded-2xl border border-white/5 bg-[#0f1210] p-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <h3 className="text-lg font-bold">Franchise Restock Replenishments</h3>
                <p className="text-xs text-[#889e8b] mt-1">Approve warehouse stock transfers and record ERP accounts ledgers</p>
              </div>

              <div className="overflow-x-auto rounded-xl border border-white/5">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.01]">
                      <th className="p-4 font-bold text-[#889e8b] uppercase">Outlet Node</th>
                      <th className="p-4 font-bold text-[#889e8b] uppercase">Date Requested</th>
                      <th className="p-4 font-bold text-[#889e8b] uppercase">Products requested</th>
                      <th className="p-4 font-bold text-[#889e8b] uppercase">Fulfillment Status</th>
                      <th className="p-4 font-bold text-[#889e8b] uppercase text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {restocks.map((req) => (
                      <tr key={req.id} className="border-b border-white/5 hover:bg-white/[0.01]">
                        <td className="p-4">
                          <strong className="text-white block">{req.store.name}</strong>
                          <span className="text-[10px] font-mono text-purple-300">{req.store.code}</span>
                        </td>
                        <td className="p-4 text-white/60">
                          {new Date(req.createdAt).toLocaleString()}
                        </td>
                        <td className="p-4">
                          <ul className="list-disc pl-4 space-y-1">
                            {req.items.map((item: any) => (
                              <li key={item.id} className="text-white/80">
                                {item.product.title} (x{item.quantity})
                              </li>
                            ))}
                          </ul>
                        </td>
                        <td className="p-4">
                          <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold ${
                            req.status === 'APPROVED' ? 'bg-green-500/10 text-green-400' :
                            req.status === 'REJECTED' ? 'bg-red-500/10 text-red-400' :
                            'bg-amber-500/10 text-amber-400'
                          }`}>{req.status}</span>
                        </td>
                        <td className="p-4 text-right space-x-2">
                          {req.status === 'PENDING' ? (
                            <>
                              <button
                                onClick={() => handleProcessRestock(req.id, 'approve')}
                                className="rounded-lg bg-green-500 px-3 py-1.5 text-[10px] font-bold text-black hover:opacity-90 active:scale-[0.98] transition-all"
                              >
                                Approve Restock
                              </button>
                              <button
                                onClick={() => handleProcessRestock(req.id, 'reject')}
                                className="rounded-lg border border-red-500/10 bg-red-500/5 px-3 py-1.5 text-[10px] font-bold text-red-400 hover:bg-red-500/10 transition-all"
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] text-white/30 font-semibold uppercase">Processed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {restocks.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center text-xs text-[#889e8b] py-8">
                          No restocking requests submitted by franchise nodes.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: DOUBLE-ENTRY CORPORATE LEDGER */}
          {activeTab === 'ledger' && (
            <div className="rounded-2xl border border-white/5 bg-[#0f1210] p-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <h3 className="text-lg font-bold">HQ Enterprise Ledger Journals</h3>
                <p className="text-xs text-[#889e8b] mt-1">Audit double-entry ledger lines for corporate inventory and wholesale sales</p>
              </div>

              <div className="overflow-x-auto rounded-xl border border-white/5">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.01]">
                      <th className="p-4 font-bold text-[#889e8b] uppercase">Date</th>
                      <th className="p-4 font-bold text-[#889e8b] uppercase">Journal Description</th>
                      <th className="p-4 font-bold text-[#889e8b] uppercase">Store Mapped</th>
                      <th className="p-4 font-bold text-[#889e8b] uppercase">Account Code / Name</th>
                      <th className="p-4 font-bold text-[#889e8b] uppercase">Debit (₹)</th>
                      <th className="p-4 font-bold text-[#889e8b] uppercase text-right">Credit (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerLines.map((line) => (
                      <tr key={line.id} className="border-b border-white/5 hover:bg-white/[0.01]">
                        <td className="p-4 text-white/50">
                          {new Date(line.createdAt).toLocaleDateString()} <br/>
                          <span className="text-[9px] text-[#889e8b] font-mono">{new Date(line.createdAt).toLocaleTimeString()}</span>
                        </td>
                        <td className="p-4">
                          <strong className="text-white block">{line.description}</strong>
                          {line.referenceId && (
                            <span className="text-[9px] text-white/30 font-mono">Ref ID: {line.referenceId.substring(0,8)}...</span>
                          )}
                        </td>
                        <td className="p-4">
                          {line.store ? (
                            <>
                              <strong className="text-white block">{line.store.name}</strong>
                              <span className="text-[9px] font-mono text-purple-300">{line.store.code}</span>
                            </>
                          ) : (
                            <span className="text-white/40 italic">HQ Central</span>
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
                        <td colSpan={6} className="text-center text-xs text-[#889e8b] py-8">
                          No corporate ledger entries generated.
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
    </div>
  );
}
