const express = require('express');
const { authenticate } = require('../middleware/authenticate');
const { supabase } = require('../lib/supabase');

const router = express.Router();

// NOTE: Razorpay integration is Phase 3.
// For now these are placeholder routes so the server doesn't crash.
// We will fill these in during Phase 3 when we build the checkout page.

// ─── POST /api/payments/create-order ─────────────────────────────────────────
router.post('/create-order', authenticate, async (req, res) => {
  res.json({ message: 'Payment gateway coming in Phase 3.' });
});

// ─── POST /api/payments/verify ───────────────────────────────────────────────
router.post('/verify', authenticate, async (req, res) => {
  res.json({ message: 'Payment verification coming in Phase 3.' });
});

module.exports = router;