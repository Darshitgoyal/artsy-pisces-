const express = require('express');
const { supabase } = require('../lib/supabase');
const { authenticate } = require('../middleware/authenticate');
const { adminOnly } = require('../middleware/adminOnly');

const router = express.Router();

// ─── POST /api/orders ────────────────────────────────────────────────────────
// User places an order (cart items + address + payment method)
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      items,           // array: [{ id, title, price, image_url, quantity }]
      address,         // { name, phone, line1, city, state, pincode }
      payment_method,  // 'online' | 'cod'
      coupon_code,
      total_amount,
      discount,
      final_amount,
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty.' });
    }
    if (!address || !payment_method) {
      return res.status(400).json({ error: 'Address and payment method are required.' });
    }

    const { data, error } = await supabase
      .from('orders')
      .insert({
        user_id: req.user.id,
        items,
        address,
        payment_method,
        coupon_code: coupon_code || null,
        total_amount,
        discount: discount || 0,
        final_amount,
        payment_status: payment_method === 'cod' ? 'pending' : 'pending',
        order_status: 'placed',
      })
      .select()
      .single();

    if (error) throw error;

    // If coupon was used, increment its used_count
    if (coupon_code) {
      await supabase.rpc('increment_coupon_use', { coupon_code_input: coupon_code });
    }

    res.status(201).json({ order: data });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Could not place order.' });
  }
});

// ─── GET /api/orders/mine ────────────────────────────────────────────────────
// Logged-in user sees their own orders
router.get('/mine', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ orders: data });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch orders.' });
  }
});

// ─── GET /api/orders ─────────── admin only ───────────────────────────────────
// Admin sees ALL orders
router.get('/', authenticate, adminOnly, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*, users(name, email)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ orders: data });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch orders.' });
  }
});

// ─── GET /api/orders/:id ─────────────────────────────────────────────────────
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Order not found.' });

    // Users can only see their own orders; admin can see any
    if (req.user.role !== 'admin' && data.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    res.json({ order: data });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── PUT /api/orders/:id/status ─ admin only ─────────────────────────────────
router.put('/:id/status', authenticate, adminOnly, async (req, res) => {
  try {
    const { order_status, payment_status } = req.body;

    const updateData = { updated_at: new Date().toISOString() };
    if (order_status) updateData.order_status = order_status;
    if (payment_status) updateData.payment_status = payment_status;

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error || !data) return res.status(404).json({ error: 'Order not found.' });
    res.json({ order: data });
  } catch (err) {
    res.status(500).json({ error: 'Could not update order status.' });
  }
});

module.exports = router;