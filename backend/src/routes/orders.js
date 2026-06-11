const express = require('express');
const { pool } = require('../lib/supabase');
const { authenticate } = require('../middleware/authenticate');
const { adminOnly } = require('../middleware/adminOnly');

const router = express.Router();

// ─── POST /api/orders ─────────────────────────────────────────────────────────
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      items, address, payment_method,
      coupon_code, total_amount, discount, final_amount,
    } = req.body;

    if (!items || items.length === 0)
      return res.status(400).json({ error: 'Cart is empty.' });
    if (!address || !payment_method)
      return res.status(400).json({ error: 'Address and payment method are required.' });

    const result = await pool.query(
      `INSERT INTO orders
        (user_id, items, address, payment_method, coupon_code,
         total_amount, discount, final_amount, payment_status, order_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', 'placed')
       RETURNING *`,
      [
        req.user.id,
        JSON.stringify(items),
        JSON.stringify(address),
        payment_method,
        coupon_code || null,
        total_amount,
        discount || 0,
        final_amount,
      ]
    );

    const order = result.rows[0];

    // Increment coupon usage if one was applied
    if (coupon_code) {
      await pool.query(
        'UPDATE coupons SET used_count = used_count + 1 WHERE code = $1',
        [coupon_code.toUpperCase()]
      );
    }

    // Mark associated customization requests as completed (ordered)
    try {
      if (items && Array.isArray(items)) {
        for (const item of items) {
          if (item.id && String(item.id).startsWith('custom_')) {
            const reqIdStr = String(item.id).replace('custom_', '');
            const requestId = parseInt(reqIdStr, 10);
            if (!isNaN(requestId)) {
              await pool.query(
                "UPDATE customization_requests SET status = 'completed' WHERE id = $1",
                [requestId]
              );
            }
          }
        }
      }
    } catch (custErr) {
      console.error('Failed to update customization status during order placement:', custErr);
    }

    res.status(201).json({ order });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Could not place order.' });
  }
});

// ─── GET /api/orders/mine ─────────────────────────────────────────────────────
router.get('/mine', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ orders: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch orders.' });
  }
});

// ─── GET /api/orders — admin only ─────────────────────────────────────────────
router.get('/', authenticate, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*, u.name as user_name, u.email as user_email
       FROM orders o
       JOIN users u ON o.user_id = u.id
       ORDER BY o.created_at DESC`
    );
    res.json({ orders: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch orders.' });
  }
});

// ─── GET /api/orders/:id ──────────────────────────────────────────────────────
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM orders WHERE id = $1',
      [req.params.id]
    );
    const order = result.rows[0];

    if (!order) return res.status(404).json({ error: 'Order not found.' });

    // Users can only see their own orders; admin can see any
    if (req.user.role !== 'admin' && order.user_id !== req.user.id)
      return res.status(403).json({ error: 'Access denied.' });

    res.json({ order });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── PUT /api/orders/:id/status — admin only ──────────────────────────────────
router.put('/:id/status', authenticate, adminOnly, async (req, res) => {
  try {
    const { order_status, payment_status } = req.body;

    // Build update query dynamically based on what was sent
    const fields = [];
    const values = [];
    let i = 1;

    if (order_status)   { fields.push(`order_status = $${i++}`);   values.push(order_status); }
    if (payment_status) { fields.push(`payment_status = $${i++}`); values.push(payment_status); }
    fields.push(`updated_at = NOW()`);

    values.push(req.params.id);

    const result = await pool.query(
      `UPDATE orders SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );

    if (!result.rows[0]) return res.status(404).json({ error: 'Order not found.' });
    res.json({ order: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Could not update order status.' });
  }
});

module.exports = router;