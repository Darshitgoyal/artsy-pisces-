import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle, Clock, Package, Truck, Home } from 'lucide-react';

interface Order {
  id: string;
  items: any[];
  address: any;
  total_amount: number;
  discount: number;
  final_amount: number;
  coupon_code: string | null;
  payment_method: string;
  payment_status: string;
  order_status: string;
  created_at: string;
}

const STEPS = ['placed', 'confirmed', 'processing', 'shipped', 'delivered'];

const stepIcon = (step: string) => {
  const icons: Record<string, any> = {
    placed:     <Clock className="h-5 w-5" />,
    confirmed:  <CheckCircle className="h-5 w-5" />,
    processing: <Package className="h-5 w-5" />,
    shipped:    <Truck className="h-5 w-5" />,
    delivered:  <Home className="h-5 w-5" />,
  };
  return icons[step] || <Clock className="h-5 w-5" />;
};

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'summary' | 'tracking'>('summary');

  useEffect(() => {
    if (!id) return;
    api.get(`/orders/${id}`)
      .then(res => setOrder(res.data.order))
      .catch(() => navigate('/orders'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!order) return null;

  const currentStep = STEPS.indexOf(order.order_status);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/orders')} className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-1 transition-colors">
            <ArrowLeft className="h-4 w-4" /> My Orders
          </button>
          <span className="text-muted-foreground">/</span>
          <span className="font-mono text-sm">#{order.id.slice(0, 8).toUpperCase()}</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        
        {/* Sleek Custom Tabs */}
        <div className="flex border-b border-border bg-card/50 backdrop-blur rounded-t-xl p-1 gap-1">
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex-1 py-3 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'summary'
                ? 'bg-primary text-primary-foreground shadow-lg'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            📋 Order Summary
          </button>
          <button
            onClick={() => setActiveTab('tracking')}
            className={`flex-1 py-3 text-sm font-semibold rounded-lg transition-all ${
              activeTab === 'tracking'
                ? 'bg-primary text-primary-foreground shadow-lg'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            📍 Track Order
          </button>
        </div>

        {activeTab === 'tracking' ? (
          /* TRACKING VIEW */
          <section className="bg-card border border-border rounded-2xl p-8 shadow-sm space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-xl">Order Status Tracker</h2>
              <span className="text-xs text-muted-foreground">Managed by Admin</span>
            </div>

            {order.order_status === 'cancelled' ? (
              <div className="text-center py-8 text-red-500 font-semibold border-2 border-dashed border-red-200 rounded-xl bg-red-50/50">
                This order has been cancelled.
              </div>
            ) : (
              <div className="relative pl-8 border-l border-muted space-y-8 py-2 ml-4">
                {STEPS.map((step, index) => {
                  const done = index <= currentStep;
                  const current = index === currentStep;
                  return (
                    <div key={step} className="relative">
                      {/* Step Indicator Dot */}
                      <div className={`absolute -left-[43px] top-1 w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all ${
                        done
                          ? 'bg-primary border-primary text-primary-foreground shadow-md'
                          : 'bg-background border-muted text-muted-foreground'
                      } ${current ? 'ring-4 ring-primary/20 scale-110' : ''}`}>
                        {stepIcon(step)}
                      </div>

                      {/* Step Text Info */}
                      <div className="pl-2">
                        <h3 className={`font-semibold capitalize text-base ${done ? 'text-primary' : 'text-muted-foreground'}`}>
                          {step}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {current 
                            ? 'Currently in this stage' 
                            : done 
                            ? 'Completed' 
                            : 'Pending processing'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          /* SUMMARY VIEW */
          <div className="space-y-6">
            {/* Items */}
            <section className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h2 className="font-semibold text-lg mb-4">Items Ordered</h2>
              <div className="space-y-4">
                {order.items.map((item: any, i: number) => (
                  <div key={i} className="flex gap-4 items-center border-b border-border/50 pb-4 last:border-b-0 last:pb-0">
                    <img src={item.image_url} alt={item.title} className="w-16 h-16 object-cover rounded-lg flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{item.title}</p>
                      <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <span className="font-semibold text-sm">₹{Number(item.price || 0).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Delivery Address */}
            <section className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h2 className="font-semibold text-lg mb-3">Delivery Address</h2>
              {order.address && (
                <div className="text-sm text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground text-base">{order.address.name}</p>
                  <p>{order.address.line1}</p>
                  <p>{order.address.city}, {order.address.state} — {order.address.pincode}</p>
                  <p className="mt-2 text-foreground/80">📞 {order.address.phone}</p>
                </div>
              )}
            </section>

            {/* Payment Summary */}
            <section className="bg-card border border-border rounded-2xl p-6 shadow-sm">
              <h2 className="font-semibold text-lg mb-4">Payment Summary</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>₹{Number(order.total_amount || 0).toLocaleString('en-IN')}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-green-600 font-medium">
                    <span>Coupon ({order.coupon_code})</span>
                    <span>−₹{Number(order.discount || 0).toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-3">
                  <span className="text-muted-foreground">Payment Method</span>
                  <span className="font-medium">{order.payment_method === 'cod' ? '💵 Cash on Delivery' : '💳 Online Payment'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Status</span>
                  <span className={`font-semibold capitalize ${order.payment_status === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>
                    {order.payment_status}
                  </span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-3 border-t text-foreground">
                  <span>Total Amount Paid</span>
                  <span className="text-primary text-xl">₹{Number(order.final_amount || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </section>
          </div>
        )}

        <Button variant="outline" className="w-full h-11" onClick={() => navigate('/')}>
          Continue Shopping
        </Button>
      </div>
    </div>
  );
}