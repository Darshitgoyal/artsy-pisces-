const express = require('express');
const { supabase } = require('../lib/supabase');
const { authenticate } = require('../middleware/authenticate');
const { adminOnly } = require('../middleware/adminOnly');

const router = express.Router();

// ─── POST /api/coupons/apply ─────────────────────────────────────────────────
// User applies a coupon — validates it and returns the discount
router.post('/apply', authenticate, async (req, res) => {
  try {
    const { code, order_total } = req.body;

    if (!code) return res.status(400).json({ error: 'Coupon code is required.' });

    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('active', true)
      .single();

    if (error || !coupon) {
      return res.status(404).json({ error: 'Invalid or expired coupon code.' });
    }

    // Check expiry
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return res.status(400).json({ error: 'This coupon has expired.' });
    }

    // Check max uses
    if (coupon.used_count >= coupon.max_uses) {
      return res.status(400).json({ error: 'This coupon has reached its usage limit.' });
    }

    // Check minimum order value
    if (order_total < coupon.min_order_value) {
      return res.status(400).json({
        error: `Minimum order value for this coupon is ₹${coupon.min_order_value}.`,
      });
    }

    // Calculate discount
    let discount = 0;
    if (coupon.discount_type === 'percent') {
      discount = (order_total * coupon.discount_value) / 100;
    } else {
      discount = coupon.discount_value;
    }

    res.json({
      valid: true,
      discount: Math.min(discount, order_total), // can't discount more than total
      coupon_id: coupon.id,
      message: `Coupon applied! You save ₹${discount.toFixed(2)}`,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── GET /api/coupons ─────────── admin only ──────────────────────────────────
router.get('/', authenticate, adminOnly, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ coupons: data });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch coupons.' });
  }
});

// ─── POST /api/coupons ────────── admin only ──────────────────────────────────
router.post('/', authenticate, adminOnly, async (req, res) => {
  try {
    const { code, discount_type, discount_value, min_order_value, max_uses, expires_at } = req.body;

    if (!code || !discount_type || discount_value === undefined) {
      return res.status(400).json({ error: 'Code, discount_type and discount_value are required.' });
    }

    const { data, error } = await supabase
      .from('coupons')
      .insert({
        code: code.toUpperCase(),
        discount_type,
        discount_value,
        min_order_value: min_order_value || 0,
        max_uses: max_uses || 100,
        expires_at: expires_at || null,
        active: true,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'Coupon code already exists.' });
      throw error;
    }

    res.status(201).json({ coupon: data });
  } catch (err) {
    res.status(500).json({ error: 'Could not create coupon.' });
  }
});

// ─── PUT /api/coupons/:id ─────── admin only ──────────────────────────────────
router.put('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const { active, discount_value, max_uses, expires_at } = req.body;

    const { data, error } = await supabase
      .from('coupons')
      .update({ active, discount_value, max_uses, expires_at })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error || !data) return res.status(404).json({ error: 'Coupon not found.' });
    res.json({ coupon: data });
  } catch (err) {
    res.status(500).json({ error: 'Could not update coupon.' });
  }
});

// ─── DELETE /api/coupons/:id ──── admin only ──────────────────────────────────
router.delete('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const { error } = await supabase.from('coupons').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Coupon deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Could not delete coupon.' });
  }
});

module.exports = router;