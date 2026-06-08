import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, ArrowLeft } from 'lucide-react';

interface Order {
  id: string;
  final_amount: number;
  order_status: string;
  payment_method: string;
  payment_status: string;
  items: any[];
  created_at: string;
}

const statusColor: Record<string, string> = {
  placed:     'bg-yellow-100 text-yellow-800 border-yellow-200',
  confirmed:  'bg-blue-100 text-blue-800 border-blue-200',
  processing: 'bg-purple-100 text-purple-800 border-purple-200',
  shipped:    'bg-orange-100 text-orange-800 border-orange-200',
  delivered:  'bg-green-100 text-green-800 border-green-200',
  cancelled:  'bg-red-100 text-red-800 border-red-200',
};

export default function OrderHistory() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/orders/mine')
      .then(res => setOrders(res.data.orders))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Gallery
          </button>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium">My Orders</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-medium italic mb-8">My Orders</h1>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <Package className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No orders yet</h2>
            <p className="text-muted-foreground mb-6">Your order history will appear here.</p>
            <Button onClick={() => navigate('/')}>Browse Gallery</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <Link
                key={order.id}
                to={`/orders/${order.id}`}
                className="block border border-border rounded-2xl p-5 hover:border-primary/50 hover:shadow-md transition-all bg-card"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-mono text-sm text-muted-foreground">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColor[order.order_status]}`}>
                        {order.order_status.charAt(0).toUpperCase() + order.order_status.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {order.items.length} artwork{order.items.length > 1 ? 's' : ''} •{' '}
                      {order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online Payment'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-primary">
                      ₹{order.final_amount.toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">View details →</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}