import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ShoppingBag, Tag, Truck, CreditCard } from 'lucide-react';
import api from '@/lib/api';

declare global {
  interface Window { Razorpay: any; }
}

export default function Checkout() {
  const { cart, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [address, setAddress] = useState({
    name: user?.name || '',
    phone: '',
    line1: '',
    city: '',
    state: '',
    pincode: '',
  });
  const [couponCode, setCouponCode]   = useState('');
  const [couponApplied, setCouponApplied] = useState(false);
  const [discount, setDiscount]       = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cod'>('online');
  const [loading, setLoading]         = useState(false);
  const [couponLoading, setCouponLoading] = useState(false);

  const subtotal   = cart.reduce((sum, item) => sum + Number(item.price || 0), 0);
  const finalTotal = Math.max(0, subtotal - discount);

  // Redirect to gallery if cart is empty
  if (cart.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <ShoppingBag className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-2xl font-semibold">Your cart is empty</h2>
        <Button onClick={() => navigate('/')}>Browse Gallery</Button>
      </div>
    );
  }

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    try {
      const res = await api.post('/coupons/apply', {
        code: couponCode.trim(),
        order_total: subtotal,
      });
      setDiscount(res.data.discount);
      setCouponApplied(true);
      toast({ title: '🎉 Coupon applied!', description: res.data.message });
    } catch (err: any) {
      toast({
        title: 'Invalid coupon',
        description: err.response?.data?.error || 'Could not apply coupon.',
        variant: 'destructive',
      });
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setCouponCode('');
    setCouponApplied(false);
    setDiscount(0);
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddress({ ...address, [e.target.name]: e.target.value });
  };

  const validateAddress = () => {
    const { name, phone, line1, city, state, pincode } = address;
    if (!name || !phone || !line1 || !city || !state || !pincode) {
      toast({ title: 'Missing details', description: 'Please fill in all address fields.', variant: 'destructive' });
      return false;
    }
    if (phone.length < 10) {
      toast({ title: 'Invalid phone', description: 'Enter a valid 10-digit phone number.', variant: 'destructive' });
      return false;
    }
    return true;
  };

  // ── COD Order ──────────────────────────────────────────────────────────────
  const placeCODOrder = async () => {
    if (!validateAddress()) return;
    setLoading(true);
    try {
      const res = await api.post('/orders', {
        items: cart.map(item => ({
          id: item.id,
          title: item.title,
          price: item.price,
          image_url: item.image_url,
          quantity: 1,
        })),
        address,
        payment_method: 'cod',
        coupon_code: couponApplied ? couponCode : null,
        total_amount: subtotal,
        discount,
        final_amount: finalTotal,
      });
      clearCart();
      toast({ title: 'Order placed!', description: 'Your COD order has been placed successfully.' });
      navigate(`/orders/${res.data.order.id}`);
    } catch (err: any) {
      toast({ title: 'Order failed', description: err.response?.data?.error || 'Could not place order.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // ── Online Payment via Razorpay ────────────────────────────────────────────
  const placeOnlineOrder = async () => {
    if (!validateAddress()) return;
    setLoading(true);
    try {
      // Step 1: Create Razorpay order from backend
      const paymentRes = await api.post('/payments/create-order', { amount: finalTotal });
      const { razorpay_order_id, key_id } = paymentRes.data;

      // Step 2: Open Razorpay payment modal
      const options = {
        key: key_id,
        amount: Math.round(finalTotal * 100),
        currency: 'INR',
        name: 'Artsy Pisces',
        description: `${cart.length} artwork(s)`,
        order_id: razorpay_order_id,
        prefill: {
          name: address.name,
          contact: address.phone,
        },
        theme: { color: '#6366f1' },
        handler: async (response: any) => {
          try {
            // Step 3: Save order in DB first
            const orderRes = await api.post('/orders', {
              items: cart.map(item => ({
                id: item.id,
                title: item.title,
                price: item.price,
                image_url: item.image_url,
                quantity: 1,
              })),
              address,
              payment_method: 'online',
              coupon_code: couponApplied ? couponCode : null,
              total_amount: subtotal,
              discount,
              final_amount: finalTotal,
            });

            // Step 4: Verify payment
            await api.post('/payments/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              order_id: orderRes.data.order.id,
            });

            clearCart();
            toast({ title: '✅ Payment successful!', description: 'Your order has been confirmed.' });
            navigate(`/orders/${orderRes.data.order.id}`);
          } catch (err) {
            toast({ title: 'Payment error', description: 'Payment succeeded but order saving failed. Contact support.', variant: 'destructive' });
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            toast({ title: 'Payment cancelled', description: 'You cancelled the payment.' });
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      toast({ title: 'Payment failed', description: err.response?.data?.error || 'Could not initiate payment.', variant: 'destructive' });
      setLoading(false);
    }
  };

  const handlePlaceOrder = () => {
    if (paymentMethod === 'cod') {
      placeCODOrder();
    } else {
      placeOnlineOrder();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground text-sm">
            ← Back to Gallery
          </button>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium">Checkout</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-2 gap-10">

        {/* LEFT — Address + Payment */}
        <div className="space-y-8">

          {/* Delivery Address */}
          <section>
            <div className="flex items-center gap-2 mb-5">
              <Truck className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Delivery Address</h2>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" name="name" value={address.name} onChange={handleAddressChange} placeholder="Your name" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" name="phone" value={address.phone} onChange={handleAddressChange} placeholder="10-digit number" maxLength={10} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="line1">Address</Label>
                <Input id="line1" name="line1" value={address.line1} onChange={handleAddressChange} placeholder="House/flat no, street, area" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" name="city" value={address.city} onChange={handleAddressChange} placeholder="City" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="state">State</Label>
                  <Input id="state" name="state" value={address.state} onChange={handleAddressChange} placeholder="State" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pincode">Pincode</Label>
                  <Input id="pincode" name="pincode" value={address.pincode} onChange={handleAddressChange} placeholder="6-digit" maxLength={6} />
                </div>
              </div>
            </div>
          </section>

          {/* Coupon Code */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Tag className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Coupon Code</h2>
            </div>
            {couponApplied ? (
              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <span className="text-green-700 font-medium flex-1">"{couponCode}" applied — saving ₹{discount.toLocaleString('en-IN')}</span>
                <button onClick={removeCoupon} className="text-sm text-red-500 hover:underline">Remove</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="Enter coupon code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && applyCoupon()}
                />
                <Button variant="outline" onClick={applyCoupon} disabled={couponLoading || !couponCode.trim()}>
                  {couponLoading ? 'Checking...' : 'Apply'}
                </Button>
              </div>
            )}
          </section>

          {/* Payment Method */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Payment Method</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPaymentMethod('online')}
                className={`p-4 border-2 rounded-xl text-left transition-all ${
                  paymentMethod === 'online'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                <div className="font-medium mb-1">💳 Pay Online</div>
                <div className="text-sm text-muted-foreground">UPI, Cards, Net Banking</div>
              </button>
              <button
                onClick={() => setPaymentMethod('cod')}
                className={`p-4 border-2 rounded-xl text-left transition-all ${
                  paymentMethod === 'cod'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                <div className="font-medium mb-1">💵 Cash on Delivery</div>
                <div className="text-sm text-muted-foreground">Pay when it arrives</div>
              </button>
            </div>
          </section>
        </div>

        {/* RIGHT — Order Summary */}
        <div>
          <div className="sticky top-6 bg-card border border-border rounded-2xl p-6 space-y-5">
            <h2 className="text-lg font-semibold">Order Summary</h2>

            {/* Items */}
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {cart.map(item => (
                <div key={item.id} className="flex gap-3 items-center">
                  <img src={item.image_url} alt={item.title} className="w-14 h-14 object-cover rounded-lg flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.category}</p>
                  </div>
                  <span className="font-semibold text-sm whitespace-nowrap">₹{item.price.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal ({cart.length} items)</span>
                <span>₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Coupon discount</span>
                  <span>−₹{discount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Delivery</span>
                <span className="text-green-600">Free</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t">
                <span>Total</span>
                <span className="text-primary">₹{finalTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <Button
              className="w-full h-12 text-base"
              onClick={handlePlaceOrder}
              disabled={loading}
            >
              {loading
                ? 'Processing...'
                : paymentMethod === 'cod'
                ? `Place COD Order • ₹${finalTotal.toLocaleString('en-IN')}`
                : `Pay ₹${finalTotal.toLocaleString('en-IN')} Online`}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              By placing an order you agree to our terms of service.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}