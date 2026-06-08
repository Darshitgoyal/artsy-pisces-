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

  useEffect(() => {
    if (!id) return;
    api.get(`/orders/${id}`)
      .then(res => setOrder(res.data.order))
      .catch(() => navigate('/orders'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
          <button onClick={() => navigate('/orders')} className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> My Orders
          </button>
          <span className="text-muted-foreground">/</span>
          <span className="font-mono text-sm">#{order.id.slice(0, 8).toUpperCase()}</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">

        {/* Order Status Tracker */}
        <section className="bg-card border border-border rounded-2xl p-6">
          <h2 className="font-semibold text-lg mb-6">Order Status</h2>
          {order.order_status === 'cancelled' ? (
            <div className="text-center py-4 text-red-500 font-medium">This order has been cancelled.</div>
          ) : (
            <div className="relative">
              {/* Progress line */}
              <div className="absolute top-5 left-5 right-5 h-0.5 bg-muted" />
              <div
                className="absolute top-5 left-5 h-0.5 bg-primary transition-all duration-700"
                style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
              />
              {/* Steps */}
              <div className="relative flex justify-between">
                {STEPS.map((step, index) => {
                  const done    = index <= currentStep;
                  const current = index === currentStep;
                  return (
                    <div key={step} className="flex flex-col items-center gap-2">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all z-10 ${
                        done
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'bg-background border-muted text-muted-foreground'
                      } ${current ? 'ring-4 ring-primary/20' : ''}`}>
                        {stepIcon(step)}
                      </div>
                      <span className={`text-xs font-medium capitalize text-center ${done ? 'text-primary' : 'text-muted-foreground'}`}>
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Items */}
        <section className="bg-card border border-border rounded-2xl p-6">
          <h2 className="font-semibold text-lg mb-4">Items Ordered</h2>
          <div className="space-y-4">
            {order.items.map((item: any, i: number) => (
              <div key={i} className="flex gap-4 items-center">
                <img src={item.image_url} alt={item.title} className="w-16 h-16 object-cover rounded-lg" />
                <div className="flex-1">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                </div>
                <span className="font-semibold">₹{item.price.toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Delivery Address */}
        <section className="bg-card border border-border rounded-2xl p-6">
          <h2 className="font-semibold text-lg mb-3">Delivery Address</h2>
          {order.address && (
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">{order.address.name}</p>
              <p>{order.address.line1}</p>
              <p>{order.address.city}, {order.address.state} — {order.address.pincode}</p>
              <p>📞 {order.address.phone}</p>
            </div>
          )}
        </section>

        {/* Payment Summary */}
        <section className="bg-card border border-border rounded-2xl p-6">
          <h2 className="font-semibold text-lg mb-4">Payment Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>₹{order.total_amount.toLocaleString('en-IN')}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Coupon ({order.coupon_code})</span>
                <span>−₹{order.discount.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment</span>
              <span>{order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online'}</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-2 border-t">
              <span>Total</span>
              <span className="text-primary">₹{order.final_amount.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </section>

        <Button variant="outline" className="w-full" onClick={() => navigate('/')}>
          Continue Shopping
        </Button>
      </div>
    </div>
  );
}