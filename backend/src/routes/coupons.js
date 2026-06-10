const express = require('express');
const { pool } = require('../lib/supabase');
const { authenticate } = require('../middleware/authenticate');
const { adminOnly } = require('../middleware/adminOnly');

const router = express.Router();

// ─── POST /api/coupons/apply ──────────────────────────────────────────────────
router.post('/apply', authenticate, async (req, res) => {
  try {
    const { code, order_total } = req.body;

    if (!code) return res.status(400).json({ error: 'Coupon code is required.' });

    const result = await pool.query(
      'SELECT * FROM coupons WHERE code = $1 AND active = true',
      [code.toUpperCase()]
    );
    const coupon = result.rows[0];

    if (!coupon)
      return res.status(404).json({ error: 'Invalid or expired coupon code.' });

    if (coupon.expires_at && new Date(coupon.expires_at) < new Date())
      return res.status(400).json({ error: 'This coupon has expired.' });

    if (coupon.used_count >= coupon.max_uses)
      return res.status(400).json({ error: 'This coupon has reached its usage limit.' });

    if (order_total < coupon.min_order_value)
      return res.status(400).json({
        error: `Minimum order value for this coupon is ₹${coupon.min_order_value}.`,
      });

    let discount = 0;
    if (coupon.discount_type === 'percent') {
      discount = (order_total * coupon.discount_value) / 100;
    } else {
      discount = Number(coupon.discount_value);
    }
    discount = Math.min(discount, order_total);

    res.json({
      valid: true,
      discount,
      coupon_id: coupon.id,
      message: `Coupon applied! You save ₹${discount.toFixed(2)}`,
    });
  } catch (err) {
    console.error('Apply coupon error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── GET /api/coupons — admin only ────────────────────────────────────────────
router.get('/', authenticate, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM coupons ORDER BY created_at DESC'
    );
    res.json({ coupons: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch coupons.' });
  }
});

// ─── POST /api/coupons — admin only ───────────────────────────────────────────
router.post('/', authenticate, adminOnly, async (req, res) => {
  try {
    const { code, discount_type, discount_value, min_order_value, max_uses, expires_at } = req.body;

    if (!code || !discount_type || discount_value === undefined)
      return res.status(400).json({ error: 'Code, discount_type and discount_value are required.' });

    const result = await pool.query(
      `INSERT INTO coupons
        (code, discount_type, discount_value, min_order_value, max_uses, expires_at, active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING *`,
      [
        code.toUpperCase(),
        discount_type,
        discount_value,
        min_order_value || 0,
        max_uses || 100,
        expires_at || null,
      ]
    );

    res.status(201).json({ coupon: result.rows[0] });
  } catch (err) {
    if (err.code === '23505')
      return res.status(409).json({ error: 'Coupon code already exists.' });
    console.error('Create coupon error:', err);
    res.status(500).json({ error: 'Could not create coupon.' });
  }
});

// ─── PUT /api/coupons/:id — admin only ────────────────────────────────────────
router.put('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const { active, discount_value, max_uses, expires_at } = req.body;

    const result = await pool.query(
      `UPDATE coupons
       SET active = $1, discount_value = $2, max_uses = $3, expires_at = $4
       WHERE id = $5
       RETURNING *`,
      [active, discount_value, max_uses, expires_at || null, req.params.id]
    );

    if (!result.rows[0]) return res.status(404).json({ error: 'Coupon not found.' });
    res.json({ coupon: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Could not update coupon.' });
  }
});

// ─── DELETE /api/coupons/:id — admin only ─────────────────────────────────────
router.delete('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    await pool.query('DELETE FROM coupons WHERE id = $1', [req.params.id]);
    res.json({ message: 'Coupon deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Could not delete coupon.' });
  }
});

module.exports = router;