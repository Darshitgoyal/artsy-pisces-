import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  LayoutDashboard, 
  LogOut, 
  ArrowLeft, 
  TrendingUp, 
  ShoppingBag, 
  CheckCircle,
  Truck,
  Edit,
  Trash2,
  Plus,
  Tag,
  Palette,
  Eye,
  Settings,
  X,
  PlusCircle,
  User,
  MapPin,
  RefreshCw,
  ShieldAlert,
  FolderSync,
  Sparkles
} from 'lucide-react';
import api from '@/lib/api';

interface Artwork {
  id: string;
  title: string;
  description: string;
  my_quote: string;
  category: string;
  price: number;
  image_url: string;
  available: boolean;
}

interface Order {
  id: string;
  items: any[];
  address: any;
  payment_method: 'online' | 'cod';
  payment_status: 'pending' | 'paid' | 'refunded';
  order_status: 'placed' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total_amount: number;
  discount: number;
  final_amount: number;
  created_at: string;
  user_name?: string;
  user_email?: string;
  users?: {
    name: string;
    email: string;
  };
}

interface Coupon {
  id: string;
  code: string;
  discount_type: 'percent' | 'flat';
  discount_value: number;
  min_order_value: number;
  max_uses: number;
  used_count: number;
  expires_at: string | null;
  active: boolean;
  created_at: string;
}

type TabType = 'dashboard' | 'artworks' | 'orders' | 'past_orders' | 'customizations' | 'coupons';

const statusColor: Record<string, string> = {
  placed:     'bg-yellow-100 text-yellow-800 border-yellow-200',
  confirmed:  'bg-blue-100 text-blue-800 border-blue-200',
  processing: 'bg-purple-100 text-purple-800 border-purple-200',
  shipped:    'bg-orange-100 text-orange-800 border-orange-200',
  delivered:  'bg-green-100 text-green-800 border-green-200',
  cancelled:  'bg-red-100 text-red-800 border-red-200',
};

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  // Shared Data States
  const [orders, setOrders] = useState<Order[]>([]);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [customizations, setCustomizations] = useState<any[]>([]);
  
  // Loading states
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingArtworks, setLoadingArtworks] = useState(true);
  const [loadingCoupons, setLoadingCoupons] = useState(true);
  const [loadingCustomizations, setLoadingCustomizations] = useState(true);

  // Modals & form state for Artwork
  const [showAddArtworkModal, setShowAddArtworkModal] = useState(false);
  const [showEditArtworkModal, setShowEditArtworkModal] = useState(false);
  const [currentArtwork, setCurrentArtwork] = useState<Artwork | null>(null);
  
  const [artTitle, setArtTitle] = useState('');
  const [artDesc, setArtDesc] = useState('');
  const [artQuote, setArtQuote] = useState('');
  const [artCategory, setArtCategory] = useState('');
  const [artPrice, setArtPrice] = useState('');
  const [artAvailable, setArtAvailable] = useState(true);
  const [artImageFile, setArtImageFile] = useState<File | null>(null);
  const [artImageUrl, setArtImageUrl] = useState('');
  const [artSubmitting, setArtSubmitting] = useState(false);

  // Modals & form state for Coupons
  const [showAddCouponModal, setShowAddCouponModal] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponType, setCouponType] = useState<'percent' | 'flat'>('percent');
  const [couponValue, setCouponValue] = useState('');
  const [couponMinOrder, setCouponMinOrder] = useState('');
  const [couponMaxUses, setCouponMaxUses] = useState('');
  const [couponExpiry, setCouponExpiry] = useState('');
  const [couponSubmitting, setCouponSubmitting] = useState(false);

  // Modals & form state for Orders
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editOrderStatus, setEditOrderStatus] = useState<string>('');
  const [editPaymentStatus, setEditPaymentStatus] = useState<string>('');
  const [orderSubmitting, setOrderSubmitting] = useState(false);

  // Fetch functions
  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const res = await api.get('/orders');
      const parsed = (res.data.orders || []).map((o: any) => {
        let items = o.items;
        if (typeof items === 'string') {
          try { items = JSON.parse(items); } catch (e) { items = []; }
        }
        let address = o.address;
        if (typeof address === 'string') {
          try { address = JSON.parse(address); } catch (e) { address = null; }
        }
        return { ...o, items, address };
      });
      setOrders(parsed);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const fetchArtworks = async () => {
    setLoadingArtworks(true);
    try {
      // NOTE: Get all artworks including unavailable
      const res = await api.get('/artworks');
      setArtworks(res.data.artworks);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingArtworks(false);
    }
  };

  const fetchCoupons = async () => {
    setLoadingCoupons(true);
    try {
      const res = await api.get('/coupons');
      setCoupons(res.data.coupons);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCoupons(false);
    }
  };

  const fetchCustomizations = async () => {
    setLoadingCustomizations(true);
    try {
      const res = await api.get('/customizations');
      setCustomizations(res.data.requests || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCustomizations(false);
    }
  };

  const handleApproveCustomRequest = async (id: number, price: number) => {
    try {
      const res = await api.put(`/customizations/${id}/quote`, { price });
      toast({ title: 'Approved', description: 'Request approved and quote set successfully.' });
      setCustomizations(customizations.map(c => c.id === id ? res.data.request : c));
    } catch (err: any) {
      toast({ title: 'Failed to approve', description: err.response?.data?.error || 'Error setting quote.', variant: 'destructive' });
    }
  };

  const handleDeclineCustomRequest = async (id: number) => {
    if (!confirm('Are you sure you want to decline this request?')) return;
    try {
      const res = await api.put(`/customizations/${id}/status`, { status: 'declined' });
      toast({ title: 'Declined', description: 'Request status set to declined.' });
      setCustomizations(customizations.map(c => c.id === id ? res.data.request : c));
    } catch (err: any) {
      toast({ title: 'Failed to update', description: 'Could not decline request.', variant: 'destructive' });
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchArtworks();
    fetchCoupons();
    fetchCustomizations();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // ── ARTWORKS ACTION HANDLERS ──────────────────────────────────────────────────
  const openAddArtModal = () => {
    setArtTitle('');
    setArtDesc('');
    setArtQuote('');
    setArtCategory('');
    setArtPrice('');
    setArtAvailable(true);
    setArtImageFile(null);
    setArtImageUrl('');
    setShowAddArtworkModal(true);
  };

  const handleAddArtwork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!artTitle || !artPrice) {
      toast({ title: 'Validation error', description: 'Title and price are required.', variant: 'destructive' });
      return;
    }
    setArtSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', artTitle);
      formData.append('description', artDesc);
      formData.append('my_quote', artQuote);
      formData.append('category', artCategory);
      formData.append('price', artPrice);
      
      if (artImageFile) {
        formData.append('image', artImageFile);
      } else {
        formData.append('image_url', artImageUrl || 'https://via.placeholder.com/600x400');
      }

      await api.post('/artworks', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast({ title: 'Success', description: 'Artwork uploaded successfully!' });
      setShowAddArtworkModal(false);
      fetchArtworks();
    } catch (err: any) {
      toast({ 
        title: 'Error adding artwork', 
        description: err.response?.data?.error || 'Could not save artwork.', 
        variant: 'destructive' 
      });
    } finally {
      setArtSubmitting(false);
    }
  };

  const openEditArtModal = (art: Artwork) => {
    setCurrentArtwork(art);
    setArtTitle(art.title);
    setArtDesc(art.description || '');
    setArtQuote(art.my_quote || '');
    setArtCategory(art.category || '');
    setArtPrice(String(art.price));
    setArtAvailable(art.available);
    setArtImageFile(null);
    setArtImageUrl(art.image_url);
    setShowEditArtworkModal(true);
  };

  const handleEditArtwork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentArtwork) return;
    setArtSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('title', artTitle);
      formData.append('description', artDesc);
      formData.append('my_quote', artQuote);
      formData.append('category', artCategory);
      formData.append('price', artPrice);
      formData.append('available', String(artAvailable));

      if (artImageFile) {
        formData.append('image', artImageFile);
      }

      await api.put(`/artworks/${currentArtwork.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast({ title: 'Success', description: 'Artwork details updated successfully!' });
      setShowEditArtworkModal(false);
      fetchArtworks();
    } catch (err: any) {
      toast({ 
        title: 'Update failed', 
        description: err.response?.data?.error || 'Could not update artwork details.', 
        variant: 'destructive' 
      });
    } finally {
      setArtSubmitting(false);
    }
  };

  const handleDeleteArtwork = async (id: string) => {
    if (!confirm('Are you sure you want to delete this artwork? This action is permanent.')) return;
    try {
      await api.delete(`/artworks/${id}`);
      toast({ title: 'Success', description: 'Artwork deleted.' });
      fetchArtworks();
    } catch (err: any) {
      toast({ title: 'Deletion failed', description: err.response?.data?.error || 'Could not delete artwork.', variant: 'destructive' });
    }
  };

  // ── COUPONS ACTION HANDLERS ────────────────────────────────────────────────────
  const openAddCouponModal = () => {
    setCouponCode('');
    setCouponType('percent');
    setCouponValue('');
    setCouponMinOrder('');
    setCouponMaxUses('100');
    setCouponExpiry('');
    setShowAddCouponModal(true);
  };

  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode || !couponValue) {
      toast({ title: 'Validation error', description: 'Code and Value are required.', variant: 'destructive' });
      return;
    }
    setCouponSubmitting(true);
    try {
      await api.post('/coupons', {
        code: couponCode.trim(),
        discount_type: couponType,
        discount_value: parseFloat(couponValue),
        min_order_value: parseFloat(couponMinOrder || '0'),
        max_uses: parseInt(couponMaxUses || '100'),
        expires_at: couponExpiry ? new Date(couponExpiry).toISOString() : null,
      });

      toast({ title: 'Success', description: 'Coupon created successfully!' });
      setShowAddCouponModal(false);
      fetchCoupons();
    } catch (err: any) {
      toast({ 
        title: 'Coupon failed', 
        description: err.response?.data?.error || 'Could not create coupon.', 
        variant: 'destructive' 
      });
    } finally {
      setCouponSubmitting(false);
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;
    try {
      await api.delete(`/coupons/${id}`);
      toast({ title: 'Deleted', description: 'Coupon code deleted successfully.' });
      fetchCoupons();
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.error || 'Could not delete coupon.', variant: 'destructive' });
    }
  };

  const handleToggleCouponActive = async (coupon: Coupon) => {
    try {
      await api.put(`/coupons/${coupon.id}`, { active: !coupon.active });
      toast({ title: 'Updated', description: `Coupon ${coupon.code} status updated.` });
      fetchCoupons();
    } catch (err: any) {
      toast({ title: 'Error', description: 'Could not change coupon status.', variant: 'destructive' });
    }
  };

  // ── ORDERS ACTION HANDLERS ─────────────────────────────────────────────────────
  const selectOrder = (order: Order) => {
    setSelectedOrder(order);
    setEditOrderStatus(order.order_status);
    setEditPaymentStatus(order.payment_status);
  };

  const handleUpdateOrderStatus = async () => {
    if (!selectedOrder) return;
    setOrderSubmitting(true);
    try {
      const res = await api.put(`/orders/${selectedOrder.id}/status`, {
        order_status: editOrderStatus,
        payment_status: editPaymentStatus,
      });
      const updated = res.data.order;
      let items = updated.items;
      if (typeof items === 'string') {
        try { items = JSON.parse(items); } catch (e) { items = []; }
      }
      let address = updated.address;
      if (typeof address === 'string') {
        try { address = JSON.parse(address); } catch (e) { address = null; }
      }
      const finalUpdated = {
        ...updated,
        items,
        address,
        user_name: selectedOrder.user_name,
        user_email: selectedOrder.user_email,
        users: selectedOrder.users
      };
      toast({ title: 'Success', description: 'Order status updated successfully!' });
      setOrders(orders.map(o => o.id === selectedOrder.id ? finalUpdated : o));
      setSelectedOrder(finalUpdated);
    } catch (err: any) {
      toast({ title: 'Update failed', description: err.response?.data?.error || 'Could not save updates.', variant: 'destructive' });
    } finally {
      setOrderSubmitting(false);
    }
  };

  // Calculations
  const revenueTotal = orders
    .filter(o => o.payment_status === 'paid')
    .reduce((sum, o) => sum + Number(o.final_amount), 0);

  const netProfit = orders.reduce((sum, o) => {
    const amount = Number(o.final_amount || 0);
    if (o.payment_status === 'paid') {
      return sum + amount;
    } else if (o.payment_status === 'refunded') {
      if (o.order_status === 'cancelled') {
        return sum; // cancel and refund: no profit, no loss (0)
      } else {
        return sum - amount; // any other step refund: loss (-amount)
      }
    }
    return sum; // pending/failed: 0
  }, 0);

  const activeOrdersList = orders.filter(o => ['placed', 'confirmed', 'processing', 'shipped'].includes(o.order_status));
  const pastOrdersList = orders.filter(o => ['delivered', 'cancelled'].includes(o.order_status));

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
      
      {/* HEADER NAVBAR */}
      <header className="border-b bg-white px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-5 w-5 text-primary" />
          <h1 className="font-semibold text-lg text-slate-800">Artsy Pisces — Control Panel</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">Admin: <strong className="text-slate-800">{user?.name}</strong></span>
          <Button variant="outline" size="sm" onClick={() => navigate('/')} className="gap-1.5 shadow-sm border-slate-200">
            <Eye className="h-4 w-4" /> Guest Gallery View
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1.5 text-red-500 hover:text-red-600 hover:bg-red-50">
            <LogOut className="h-4 w-4" /> Logout
          </Button>
        </div>
      </header>

      {/* DASHBOARD SPLIT VIEW CONTAINER */}
      <div className="flex-1 flex flex-col md:flex-row">
        
        {/* SIDEBAR NAVIGATION BAR */}
        <aside className="w-full md:w-64 bg-white border-r border-slate-100 p-5 space-y-2 flex-shrink-0">
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-semibold px-3 mb-4">Management</p>
          
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'dashboard'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard className="h-4 w-4" /> Dashboard Overview
          </button>

          <button
            onClick={() => setActiveTab('artworks')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'artworks'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Palette className="h-4 w-4" /> Manage Artworks
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'orders'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <ShoppingBag className="h-4 w-4" /> Active Orders
          </button>

          <button
            onClick={() => setActiveTab('past_orders')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'past_orders'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <FolderSync className="h-4 w-4" /> Past Orders
          </button>

          <button
            onClick={() => setActiveTab('customizations')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'customizations'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Sparkles className="h-4 w-4" /> Custom Demands
          </button>

          <button
            onClick={() => setActiveTab('coupons')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'coupons'
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Tag className="h-4 w-4" /> Promo Coupons
          </button>
        </aside>

        {/* ACTIVE PANEL VIEWPORT */}
        <main className="flex-1 p-8 overflow-y-auto">
          
          {/* TAB 1: DASHBOARD OVERVIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Dashboard Overview</h2>
                <p className="text-slate-500 text-sm">Quick business metrics and system status.</p>
              </div>

              {/* Stats Cards Row */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm flex items-center gap-4">
                  <div className="p-4 bg-green-50 text-green-600 rounded-xl">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Revenue Collected</p>
                    <p className="text-2xl font-extrabold text-slate-800">₹{revenueTotal.toLocaleString('en-IN')}</p>
                  </div>
                </div>

                <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm flex items-center gap-4">
                  <div className={`p-4 rounded-xl ${netProfit >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Net Profit / Loss</p>
                    <p className={`text-2xl font-extrabold ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {netProfit >= 0 ? '₹' : '-₹'}{Math.abs(netProfit).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm flex items-center gap-4">
                  <div className="p-4 bg-blue-50 text-blue-600 rounded-xl">
                    <ShoppingBag className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Sales Count</p>
                    <p className="text-2xl font-extrabold text-slate-800">{orders.length}</p>
                  </div>
                </div>

                <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm flex items-center gap-4">
                  <div className="p-4 bg-yellow-50 text-yellow-600 rounded-xl">
                    <Palette className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Artworks Hosted</p>
                    <p className="text-2xl font-extrabold text-slate-800">{artworks.length}</p>
                  </div>
                </div>
              </div>

              {/* Quick Actions Panel */}
              <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
                <h3 className="font-semibold text-lg">Quick Creator Shortcuts</h3>
                <div className="flex flex-wrap gap-4">
                  <Button onClick={openAddArtModal} className="gap-1.5 shadow-sm">
                    <Plus className="h-4 w-4" /> Upload New Artwork
                  </Button>
                  <Button onClick={openAddCouponModal} variant="outline" className="gap-1.5 shadow-sm border-slate-200">
                    <Tag className="h-4 w-4" /> Create Discount Coupon
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MANAGE ARTWORKS */}
          {activeTab === 'artworks' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Manage Gallery Artworks</h2>
                  <p className="text-slate-500 text-sm">Add, edit details, or remove artwork listings.</p>
                </div>
                <Button onClick={openAddArtModal} className="gap-1.5 shadow-md">
                  <Plus className="h-4.5 w-4.5" /> Add Artwork
                </Button>
              </div>

              {loadingArtworks ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 py-6">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-80 rounded-2xl bg-white border border-slate-100 animate-pulse" />
                  ))}
                </div>
              ) : artworks.length === 0 ? (
                <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center text-slate-500 shadow-sm">
                  No artworks in gallery yet. Click "Add Artwork" to publish one!
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {artworks.map(art => (
                    <div key={art.id} className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm flex flex-col hover:shadow-md transition-shadow">
                      <div className="relative h-48 bg-slate-100 flex-shrink-0">
                        <img src={art.image_url} alt={art.title} className="w-full h-full object-cover" />
                        <span className={`absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-sm ${
                          art.available 
                            ? 'bg-green-50 border-green-200 text-green-700' 
                            : 'bg-red-50 border-red-200 text-red-700'
                        }`}>
                          {art.available ? 'Available' : 'Sold Out'}
                        </span>
                      </div>
                      <div className="p-5 flex-1 flex flex-col justify-between">
                        <div className="space-y-1.5">
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider bg-slate-50 px-2 py-0.5 rounded-full border">
                            {art.category || 'Uncategorized'}
                          </span>
                          <h3 className="font-bold text-slate-800 text-base leading-tight truncate">{art.title}</h3>
                          <p className="text-xs text-slate-400 line-clamp-1 italic font-medium">"{art.my_quote}"</p>
                          <p className="font-bold text-primary text-sm mt-1">₹{Number(art.price).toLocaleString('en-IN')}</p>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2 mt-4 pt-3 border-t">
                          <Button 
                            onClick={() => openEditArtModal(art)} 
                            size="sm" 
                            variant="outline" 
                            className="flex-1 gap-1 border-slate-200"
                          >
                            <Edit className="h-3.5 w-3.5" /> Edit
                          </Button>
                          <Button 
                            onClick={() => handleDeleteArtwork(art.id)} 
                            size="sm" 
                            variant="ghost" 
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MANAGE ORDERS */}
          {activeTab === 'orders' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Order List Col */}
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Manage Active Orders</h2>
                  <p className="text-slate-500 text-sm">Monitor active sales and update dispatch tracking.</p>
                </div>

                <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-base text-slate-800">Active Order Logs</h3>
                    <Button size="sm" variant="ghost" onClick={fetchOrders} className="gap-1">
                      <RefreshCw className="h-4 w-4" /> Refresh
                    </Button>
                  </div>

                  {loadingOrders ? (
                    <div className="space-y-4 py-4">
                      {[1, 2].map(i => (
                        <div key={i} className="h-16 rounded-xl bg-slate-50 animate-pulse" />
                      ))}
                    </div>
                  ) : activeOrdersList.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">No active orders.</div>
                  ) : (
                    <div className="overflow-x-auto border rounded-xl border-slate-100">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="p-3 font-semibold text-slate-600">Order ID</th>
                            <th className="p-3 font-semibold text-slate-600">Customer</th>
                            <th className="p-3 font-semibold text-slate-600">Amount</th>
                            <th className="p-3 font-semibold text-slate-600">Method</th>
                            <th className="p-3 font-semibold text-slate-600">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeOrdersList.map(order => (
                            <tr 
                              key={order.id} 
                              onClick={() => selectOrder(order)}
                              className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer last:border-0 ${
                                selectedOrder?.id === order.id ? 'bg-primary/5 hover:bg-primary/10' : ''
                              }`}
                            >
                              <td className="p-3 font-mono font-medium text-slate-700">
                                #{String(order.id).slice(0, 8).toUpperCase()}
                              </td>
                              <td className="p-3">
                                <p className="font-semibold text-slate-800">{order.user_name || order.users?.name || 'Customer'}</p>
                                <p className="text-xs text-slate-400">{order.user_email || order.users?.email || 'N/A'}</p>
                              </td>
                              <td className="p-3 font-semibold text-slate-800">
                                ₹{Number(order.final_amount || 0).toLocaleString('en-IN')}
                              </td>
                              <td className="p-3 capitalize text-slate-600">{order.payment_method}</td>
                              <td className="p-3">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold capitalize ${statusColor[order.order_status]}`}>
                                  {order.order_status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Detail Editor Panel Col */}
              <div>
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm sticky top-24 space-y-6">
                  <h3 className="font-semibold text-lg text-slate-800 border-b pb-3 flex items-center gap-2">
                    <Settings className="h-5 w-5 text-primary" /> Tracking Management
                  </h3>

                  {selectedOrder ? (
                    <div className="space-y-6 text-sm">
                      <div>
                        <h4 className="font-semibold text-slate-700 font-mono text-sm">ORDER #{String(selectedOrder.id).slice(0, 8).toUpperCase()}</h4>
                        <div className="bg-slate-50 p-3 rounded-xl mt-2 flex gap-3 items-center">
                          <User className="h-4 w-4 text-slate-400" />
                          <div>
                            <p className="font-semibold text-slate-800">{selectedOrder.user_name || selectedOrder.users?.name || 'Guest User'}</p>
                            <p className="text-xs text-slate-400">{selectedOrder.user_email || selectedOrder.users?.email || 'N/A'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Items */}
                      <div className="space-y-1.5">
                        <h5 className="font-semibold text-slate-400 text-xs uppercase tracking-wider">Purchased Items</h5>
                        <div className="space-y-1.5 max-h-32 overflow-y-auto bg-slate-50/50 p-3 rounded-lg border border-slate-50">
                          {selectedOrder.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-xs">
                              <span className="truncate font-medium text-slate-700">{item.title}</span>
                              <span className="font-semibold text-slate-800">₹{Number(item.price || 0).toLocaleString('en-IN')}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Delivery address details */}
                      <div className="space-y-1.5">
                        <h5 className="font-semibold text-slate-400 text-xs uppercase tracking-wider">Delivery Details</h5>
                        {selectedOrder.address ? (
                          <div className="bg-slate-50/50 border border-slate-50 p-3 rounded-lg text-xs text-slate-500 space-y-1">
                            <p className="font-semibold text-slate-700">{selectedOrder.address.name}</p>
                            <p>{selectedOrder.address.line1}</p>
                            <p>{selectedOrder.address.city}, {selectedOrder.address.state} — {selectedOrder.address.pincode}</p>
                            <p className="mt-1 text-slate-800 font-bold">📞 {selectedOrder.address.phone}</p>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400">No address details available.</p>
                        )}
                      </div>

                      {/* Select state */}
                      <div className="border-t border-slate-100 pt-4 space-y-4">
                        <h4 className="font-semibold text-slate-800 text-sm">Update State</h4>
                        
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-400 font-semibold">Tracking Status</Label>
                          <select 
                            value={editOrderStatus} 
                            onChange={(e) => setEditOrderStatus(e.target.value)}
                            className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-primary focus:outline-none"
                          >
                            <option value="placed">Placed</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="processing">Processing</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs text-slate-400 font-semibold">Payment Status</Label>
                          <select 
                            value={editPaymentStatus} 
                            onChange={(e) => setEditPaymentStatus(e.target.value)}
                            className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-primary focus:outline-none"
                          >
                            <option value="pending">Pending</option>
                            <option value="paid">Paid</option>
                            <option value="refunded">Refunded</option>
                          </select>
                        </div>

                        <Button onClick={handleUpdateOrderStatus} disabled={orderSubmitting} className="w-full h-10 shadow-sm mt-1">
                          {orderSubmitting ? 'Updating...' : 'Save Tracking Update'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-16 text-slate-400 text-sm flex flex-col items-center justify-center gap-2">
                      <ShieldAlert className="h-8 w-8 text-slate-300" />
                      <p>Select a customer order from the table list to inspect or modify its shipping state.</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB: PAST ORDERS */}
          {activeTab === 'past_orders' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Order List Col */}
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Archived Past Orders</h2>
                  <p className="text-slate-500 text-sm">History of delivered and cancelled customer orders.</p>
                </div>

                <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-base text-slate-800">Archived Logs</h3>
                    <Button size="sm" variant="ghost" onClick={fetchOrders} className="gap-1">
                      <RefreshCw className="h-4 w-4" /> Refresh
                    </Button>
                  </div>

                  {loadingOrders ? (
                    <div className="space-y-4 py-4">
                      {[1, 2].map(i => (
                        <div key={i} className="h-16 rounded-xl bg-slate-50 animate-pulse" />
                      ))}
                    </div>
                  ) : pastOrdersList.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">No past orders.</div>
                  ) : (
                    <div className="overflow-x-auto border rounded-xl border-slate-100">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="p-3 font-semibold text-slate-600">Order ID</th>
                            <th className="p-3 font-semibold text-slate-600">Customer</th>
                            <th className="p-3 font-semibold text-slate-600">Amount</th>
                            <th className="p-3 font-semibold text-slate-600">Method</th>
                            <th className="p-3 font-semibold text-slate-600">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pastOrdersList.map(order => (
                            <tr 
                              key={order.id} 
                              onClick={() => selectOrder(order)}
                              className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer last:border-0 ${
                                selectedOrder?.id === order.id ? 'bg-primary/5 hover:bg-primary/10' : ''
                              }`}
                            >
                              <td className="p-3 font-mono font-medium text-slate-700">
                                #{String(order.id).slice(0, 8).toUpperCase()}
                              </td>
                              <td className="p-3">
                                <p className="font-semibold text-slate-800">{order.user_name || order.users?.name || 'Customer'}</p>
                                <p className="text-xs text-slate-400">{order.user_email || order.users?.email || 'N/A'}</p>
                              </td>
                              <td className="p-3 font-semibold text-slate-800">
                                ₹{Number(order.final_amount || 0).toLocaleString('en-IN')}
                              </td>
                              <td className="p-3 capitalize text-slate-600">{order.payment_method}</td>
                              <td className="p-3">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold capitalize ${statusColor[order.order_status]}`}>
                                  {order.order_status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Detail Editor Panel Col */}
              <div>
                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm sticky top-24 space-y-6">
                  <h3 className="font-semibold text-lg text-slate-800 border-b pb-3 flex items-center gap-2">
                    <Settings className="h-5 w-5 text-primary" /> Tracking Management
                  </h3>

                  {selectedOrder ? (
                    <div className="space-y-6 text-sm">
                      <div>
                        <h4 className="font-semibold text-slate-700 font-mono text-sm">ORDER #{String(selectedOrder.id).slice(0, 8).toUpperCase()}</h4>
                        <div className="bg-slate-50 p-3 rounded-xl mt-2 flex gap-3 items-center">
                          <User className="h-4 w-4 text-slate-400" />
                          <div>
                            <p className="font-semibold text-slate-800">{selectedOrder.user_name || selectedOrder.users?.name || 'Guest User'}</p>
                            <p className="text-xs text-slate-400">{selectedOrder.user_email || selectedOrder.users?.email || 'N/A'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Items */}
                      <div className="space-y-1.5">
                        <h5 className="font-semibold text-slate-400 text-xs uppercase tracking-wider">Purchased Items</h5>
                        <div className="space-y-1.5 max-h-32 overflow-y-auto bg-slate-50/50 p-3 rounded-lg border border-slate-50">
                          {selectedOrder.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center text-xs">
                              <span className="truncate font-medium text-slate-700">{item.title}</span>
                              <span className="font-semibold text-slate-800">₹{Number(item.price || 0).toLocaleString('en-IN')}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Delivery address details */}
                      <div className="space-y-1.5">
                        <h5 className="font-semibold text-slate-400 text-xs uppercase tracking-wider">Delivery Details</h5>
                        {selectedOrder.address ? (
                          <div className="bg-slate-50/55 border border-slate-50 p-3 rounded-lg text-xs text-slate-500 space-y-1">
                            <p className="font-semibold text-slate-700">{selectedOrder.address.name}</p>
                            <p>{selectedOrder.address.line1}</p>
                            <p>{selectedOrder.address.city}, {selectedOrder.address.state} — {selectedOrder.address.pincode}</p>
                            <p className="mt-1 text-slate-800 font-bold">📞 {selectedOrder.address.phone}</p>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400">No address details available.</p>
                        )}
                      </div>

                      {/* Select state */}
                      <div className="border-t border-slate-100 pt-4 space-y-4">
                        <h4 className="font-semibold text-slate-800 text-sm">Update State</h4>
                        
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-400 font-semibold">Tracking Status</Label>
                          <select 
                            value={editOrderStatus} 
                            onChange={(e) => setEditOrderStatus(e.target.value)}
                            className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-primary focus:outline-none"
                          >
                            <option value="placed">Placed</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="processing">Processing</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs text-slate-400 font-semibold">Payment Status</Label>
                          <select 
                            value={editPaymentStatus} 
                            onChange={(e) => setEditPaymentStatus(e.target.value)}
                            className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-primary focus:outline-none"
                          >
                            <option value="pending">Pending</option>
                            <option value="paid">Paid</option>
                            <option value="refunded">Refunded</option>
                          </select>
                        </div>

                        <Button onClick={handleUpdateOrderStatus} disabled={orderSubmitting} className="w-full h-10 shadow-sm mt-1">
                          {orderSubmitting ? 'Updating...' : 'Save Tracking Update'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-16 text-slate-400 text-sm flex flex-col items-center justify-center gap-2">
                      <ShieldAlert className="h-8 w-8 text-slate-300" />
                      <p>Select a customer order from the table list to inspect or modify its shipping state.</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB: CUSTOM DEMANDS */}
          {activeTab === 'customizations' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Custom Artwork Demands</h2>
                <p className="text-slate-500 text-sm">Review user ideas, check reference images, and submit custom pricing quotes.</p>
              </div>

              {loadingCustomizations ? (
                <div className="space-y-4 py-4">
                  {[1, 2].map(i => (
                    <div key={i} className="h-24 bg-white rounded-2xl animate-pulse border" />
                  ))}
                </div>
              ) : customizations.length === 0 ? (
                <div className="bg-white border rounded-2xl p-12 text-center text-slate-500 shadow-sm">
                  No customization demands submitted yet.
                </div>
              ) : (
                <div className="bg-white border rounded-2xl shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="p-4 font-semibold text-slate-600">Request ID</th>
                        <th className="p-4 font-semibold text-slate-600">Customer</th>
                        <th className="p-4 font-semibold text-slate-600">Requirements Description</th>
                        <th className="p-4 font-semibold text-slate-600">Reference Image</th>
                        <th className="p-4 font-semibold text-slate-600">Status</th>
                        <th className="p-4 font-semibold text-slate-600">Quote Price</th>
                        <th className="p-4 font-semibold text-right text-slate-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customizations.map(req => (
                        <CustomRequestRow 
                          key={req.id} 
                          request={req} 
                          onApprove={handleApproveCustomRequest}
                          onDecline={handleDeclineCustomRequest}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PROMO COUPONS */}
          {activeTab === 'coupons' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Promo Coupons</h2>
                  <p className="text-slate-500 text-sm">Add active coupon discount policies and specify usage limitations.</p>
                </div>
                <Button onClick={openAddCouponModal} className="gap-1.5 shadow-md">
                  <PlusCircle className="h-4.5 w-4.5" /> Create Coupon
                </Button>
              </div>

              {loadingCoupons ? (
                <div className="space-y-4 py-4">
                  {[1, 2].map(i => (
                    <div key={i} className="h-16 rounded-xl bg-white border border-slate-100 animate-pulse" />
                  ))}
                </div>
              ) : coupons.length === 0 ? (
                <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center text-slate-500 shadow-sm">
                  No active coupon campaigns yet. Click "Create Coupon" to launch one!
                </div>
              ) : (
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="p-4 font-semibold text-slate-600">Promo Code</th>
                        <th className="p-4 font-semibold text-slate-600">Type</th>
                        <th className="p-4 font-semibold text-slate-600">Value</th>
                        <th className="p-4 font-semibold text-slate-600">Min Order Limit</th>
                        <th className="p-4 font-semibold text-slate-600">Usage Tracker</th>
                        <th className="p-4 font-semibold text-slate-600">Expires At</th>
                        <th className="p-4 font-semibold text-slate-600">Status</th>
                        <th className="p-4 font-semibold text-right text-slate-600">Delete</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coupons.map(coupon => (
                        <tr key={coupon.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/20">
                          <td className="p-4 font-bold text-primary font-mono text-base uppercase">
                            {coupon.code}
                          </td>
                          <td className="p-4 capitalize text-slate-600">{coupon.discount_type}</td>
                          <td className="p-4 font-semibold text-slate-800">
                            {coupon.discount_type === 'percent' ? `${coupon.discount_value}%` : `₹${coupon.discount_value}`}
                          </td>
                          <td className="p-4 text-slate-600">₹{coupon.min_order_value}</td>
                          <td className="p-4 text-slate-600 font-medium">
                            {coupon.used_count} / {coupon.max_uses} used
                          </td>
                          <td className="p-4 text-slate-400 text-xs">
                            {coupon.expires_at 
                              ? new Date(coupon.expires_at).toLocaleDateString('en-IN', {
                                  day: 'numeric', month: 'short', year: 'numeric'
                                })
                              : 'Forever'}
                          </td>
                          <td className="p-4">
                            <button
                              onClick={() => handleToggleCouponActive(coupon)}
                              className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border shadow-sm transition-all ${
                                coupon.active
                                  ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                              }`}
                            >
                              {coupon.active ? 'Active' : 'Disabled'}
                            </button>
                          </td>
                          <td className="p-4 text-right">
                            <Button 
                              onClick={() => handleDeleteCoupon(coupon.id)} 
                              variant="ghost" 
                              size="sm" 
                              className="text-red-500 hover:text-red-600 hover:bg-red-50 p-2 h-8"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {/* ── ADD ARTWORK MODAL ────────────────────────────────────────────────────────── */}
      {showAddArtworkModal && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border rounded-2xl w-full max-w-lg shadow-2xl p-6 relative flex flex-col max-h-[90vh]">
            <button 
              onClick={() => setShowAddArtworkModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-1.5">
              <Palette className="h-5 w-5 text-primary" /> Upload New Artwork
            </h3>
            
            <form onSubmit={handleAddArtwork} className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div className="space-y-1.5">
                <Label htmlFor="add-title">Title *</Label>
                <Input id="add-title" value={artTitle} onChange={(e) => setArtTitle(e.target.value)} placeholder="Artwork title" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="add-category">Category</Label>
                  <Input id="add-category" value={artCategory} onChange={(e) => setArtCategory(e.target.value)} placeholder="Abstract, Traditional..." />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="add-price">Price (₹) *</Label>
                  <Input id="add-price" type="number" value={artPrice} onChange={(e) => setArtPrice(e.target.value)} placeholder="Price in Rupees" required />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-quote">Quote (Displayed in gallery hover)</Label>
                <Input id="add-quote" value={artQuote} onChange={(e) => setArtQuote(e.target.value)} placeholder="e.g. 'A soft metallic whisper.'" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="add-desc">Description</Label>
                <textarea 
                  id="add-desc"
                  value={artDesc}
                  onChange={(e) => setArtDesc(e.target.value)}
                  placeholder="Artwork description..."
                  rows={3}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-white focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              {/* Upload file selector */}
              <div className="border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center bg-slate-50 gap-2 border-slate-200">
                <Label className="text-slate-600 font-semibold cursor-pointer text-center w-full">
                  📁 Click to Select Image File
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => setArtImageFile(e.target.files?.[0] || null)}
                    className="hidden" 
                  />
                </Label>
                {artImageFile ? (
                  <p className="text-xs text-primary font-bold">Selected: {artImageFile.name}</p>
                ) : (
                  <div className="w-full text-center space-y-2">
                    <span className="text-[10px] text-slate-400">or provide image URL below</span>
                    <Input value={artImageUrl} onChange={(e) => setArtImageUrl(e.target.value)} placeholder="https://image-url.com/image.jpg" className="h-8 text-xs bg-white" />
                  </div>
                )}
              </div>

              <Button type="submit" disabled={artSubmitting} className="w-full h-11 mt-4">
                {artSubmitting ? 'Uploading image and publishing...' : 'Publish to Gallery'}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT ARTWORK MODAL ───────────────────────────────────────────────────────── */}
      {showEditArtworkModal && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border rounded-2xl w-full max-w-lg shadow-2xl p-6 relative flex flex-col max-h-[90vh]">
            <button 
              onClick={() => setShowEditArtworkModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-1.5">
              <Edit className="h-5 w-5 text-primary" /> Edit Artwork Details
            </h3>
            
            <form onSubmit={handleEditArtwork} className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div className="space-y-1.5">
                <Label htmlFor="edit-title">Title *</Label>
                <Input id="edit-title" value={artTitle} onChange={(e) => setArtTitle(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-category">Category</Label>
                  <Input id="edit-category" value={artCategory} onChange={(e) => setArtCategory(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-price">Price (₹) *</Label>
                  <Input id="edit-price" type="number" value={artPrice} onChange={(e) => setArtPrice(e.target.value)} required />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-quote">Quote</Label>
                <Input id="edit-quote" value={artQuote} onChange={(e) => setArtQuote(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-desc">Description</Label>
                <textarea 
                  id="edit-desc"
                  value={artDesc}
                  onChange={(e) => setArtDesc(e.target.value)}
                  rows={3}
                  className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-white focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              {/* Toggle availability checkbox */}
              <div className="flex items-center gap-2.5 p-3 border rounded-xl bg-slate-50">
                <input 
                  type="checkbox" 
                  id="edit-available" 
                  checked={artAvailable} 
                  onChange={(e) => setArtAvailable(e.target.checked)}
                  className="h-4 w-4 text-primary rounded border-slate-300 focus:ring-primary"
                />
                <Label htmlFor="edit-available" className="font-semibold text-slate-700 cursor-pointer">
                  Available for Purchase (If unchecked, displays as Sold Out)
                </Label>
              </div>

              <div className="border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center bg-slate-50 gap-2 border-slate-200">
                <Label className="text-slate-600 font-semibold cursor-pointer text-center w-full">
                  📁 Click to Replace Image File (Optional)
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={(e) => setArtImageFile(e.target.files?.[0] || null)}
                    className="hidden" 
                  />
                </Label>
                {artImageFile ? (
                  <p className="text-xs text-primary font-bold">Replacement: {artImageFile.name}</p>
                ) : (
                  <p className="text-[10px] text-slate-400">Keep blank to preserve existing image URL</p>
                )}
              </div>

              <Button type="submit" disabled={artSubmitting} className="w-full h-11 mt-4">
                {artSubmitting ? 'Updating and uploading replacement...' : 'Save Changes'}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* ── CREATE DISCOUNT COUPON MODAL ────────────────────────────────────────────────── */}
      {showAddCouponModal && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border rounded-2xl w-full max-w-md shadow-2xl p-6 relative flex flex-col">
            <button 
              onClick={() => setShowAddCouponModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-1.5">
              <PlusCircle className="h-5 w-5 text-primary" /> Create Promo Coupon
            </h3>

            <form onSubmit={handleAddCoupon} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="cp-code">Promo Code *</Label>
                <Input 
                  id="cp-code" 
                  value={couponCode} 
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())} 
                  placeholder="e.g. SUMMER20" 
                  required 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cp-type">Discount Type</Label>
                  <select 
                    id="cp-type"
                    value={couponType}
                    onChange={(e) => setCouponType(e.target.value as any)}
                    className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-white focus:ring-2 focus:ring-primary focus:outline-none"
                  >
                    <option value="percent">Percentage (%)</option>
                    <option value="flat">Flat Amount (₹)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cp-val">Discount Value *</Label>
                  <Input 
                    id="cp-val" 
                    type="number" 
                    value={couponValue} 
                    onChange={(e) => setCouponValue(e.target.value)} 
                    placeholder="e.g. 20 or 500" 
                    required 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cp-min">Min Order Value (₹)</Label>
                  <Input id="cp-min" type="number" value={couponMinOrder} onChange={(e) => setCouponMinOrder(e.target.value)} placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cp-uses">Usage Limit (Max Uses)</Label>
                  <Input id="cp-uses" type="number" value={couponMaxUses} onChange={(e) => setCouponMaxUses(e.target.value)} placeholder="100" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cp-expiry">Expiration Date</Label>
                <Input id="cp-expiry" type="date" value={couponExpiry} onChange={(e) => setCouponExpiry(e.target.value)} />
              </div>

              <Button type="submit" disabled={couponSubmitting} className="w-full h-11 mt-4">
                {couponSubmitting ? 'Creating campaign...' : 'Activate Coupon'}
              </Button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

interface CustomRequestRowProps {
  request: any;
  onApprove: (id: number, price: number) => void;
  onDecline: (id: number) => void;
}

function CustomRequestRow({ request, onApprove, onDecline }: CustomRequestRowProps) {
  const [quotePrice, setQuotePrice] = useState(request.price ? String(request.price) : '');
  
  return (
    <tr className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/20">
      <td className="p-4 font-mono font-medium text-slate-500">#{request.id}</td>
      <td className="p-4">
        <p className="font-semibold text-slate-800">{request.user_name || 'Customer'}</p>
        <p className="text-xs text-slate-400">{request.user_email || 'N/A'}</p>
      </td>
      <td className="p-4 max-w-xs">
        <p className="text-slate-700 whitespace-pre-wrap leading-relaxed text-xs line-clamp-3 hover:line-clamp-none transition-all">{request.description}</p>
      </td>
      <td className="p-4">
        {request.reference_image_url ? (
          <a href={request.reference_image_url} target="_blank" rel="noopener noreferrer" className="inline-block relative group">
            <img src={request.reference_image_url} alt="Ref" className="w-12 h-12 object-cover rounded border group-hover:scale-110 transition-transform" />
          </a>
        ) : (
          <span className="text-xs text-slate-400 italic">None</span>
        )}
      </td>
      <td className="p-4">
        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border capitalize ${
          request.status === 'pending'   ? 'bg-yellow-50 border-yellow-200 text-yellow-700' :
          request.status === 'approved'  ? 'bg-green-50 border-green-200 text-green-700' :
          request.status === 'declined'  ? 'bg-red-50 border-red-200 text-red-700' :
          'bg-blue-50 border-blue-200 text-blue-700'
        }`}>
          {request.status}
        </span>
      </td>
      <td className="p-4">
        {request.status === 'completed' || request.status === 'approved' ? (
          <span className="font-bold text-slate-800">₹{Number(request.price).toLocaleString('en-IN')}</span>
        ) : request.status === 'declined' ? (
          <span className="text-xs text-slate-400 italic">—</span>
        ) : (
          <div className="flex items-center gap-1.5 w-24">
            <span className="text-slate-400">₹</span>
            <input 
              type="number"
              placeholder="Price"
              value={quotePrice}
              onChange={(e) => setQuotePrice(e.target.value)}
              className="w-full border border-slate-200 rounded p-1 text-xs focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>
        )}
      </td>
      <td className="p-4 text-right">
        {request.status === 'pending' && (
          <div className="flex justify-end gap-1.5">
            <Button 
              size="sm" 
              onClick={() => {
                const p = parseFloat(quotePrice);
                if (isNaN(p) || p <= 0) {
                  alert('Please enter a valid price quote.');
                  return;
                }
                onApprove(request.id, p);
              }}
              className="h-7 text-xs px-2.5 bg-green-600 hover:bg-green-700"
            >
              Quote & Approve
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => onDecline(request.id)}
              className="h-7 text-xs px-2 text-red-500 hover:text-red-600 hover:bg-red-50 border-slate-200"
            >
              Decline
            </Button>
          </div>
        )}
        {request.status === 'approved' && (
          <span className="text-xs text-slate-400 italic">Waiting for customer checkout</span>
        )}
        {request.status === 'completed' && (
          <span className="text-xs text-green-600 font-bold">Ordered & Completed</span>
        )}
        {request.status === 'declined' && (
          <span className="text-xs text-red-500 italic">Declined</span>
        )}
      </td>
    </tr>
  );
}
