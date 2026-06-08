const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { pool } = require('../lib/supabase');
const { authenticate } = require('../middleware/authenticate');
require('dotenv').config();

const router = express.Router();

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ─── POST /api/payments/create-order ─────────────────────────────────────────
// Called when user clicks "Pay Online" — creates a Razorpay order
router.post('/create-order', authenticate, async (req, res) => {
  try {
    const { amount } = req.body; // amount in rupees

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount.' });
    }

    const options = {
      amount: Math.round(amount * 100), // Razorpay takes paise (1 rupee = 100 paise)
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    res.json({
      razorpay_order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID, // frontend needs this to open the payment modal
    });
  } catch (err) {
    console.error('Razorpay create order error:', err);
    res.status(500).json({ error: 'Could not create payment order.' });
  }
});

// ─── POST /api/payments/verify ────────────────────────────────────────────────
// Called after Razorpay payment succeeds — verifies the signature is genuine
router.post('/verify', authenticate, async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      order_id, // our DB order id
    } = req.body;

    // Verify the signature using HMAC SHA256
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Payment verification failed. Invalid signature.' });
    }

    // Payment is genuine — update order status in DB
    await pool.query(
      `UPDATE orders
       SET payment_status = 'paid',
           order_status = 'confirmed',
           razorpay_order_id = $1,
           razorpay_payment_id = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [razorpay_order_id, razorpay_payment_id, order_id]
    );

    res.json({ success: true, message: 'Payment verified successfully.' });
  } catch (err) {
    console.error('Payment verify error:', err);
    res.status(500).json({ error: 'Payment verification failed.' });
  }
});

module.exports = router;