const express = require('express');
const { pool } = require('../lib/supabase');
const { authenticate } = require('../middleware/authenticate');
const { adminOnly } = require('../middleware/adminOnly');
const { cloudinary, upload } = require('../lib/cloudinary');

const router = express.Router();

// ─── POST /api/customizations — user creates custom request ─────────────────────
router.post('/', authenticate, upload.single('image'), async (req, res) => {
  try {
    const { description } = req.body;
    if (!description || !description.trim()) {
      return res.status(400).json({ error: 'Description is required.' });
    }
    const reference_image_url = req.file ? req.file.path : (req.body.reference_image_url || null);

    const result = await pool.query(
      `INSERT INTO customization_requests (user_id, description, reference_image_url, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING *`,
      [req.user.id, description.trim(), reference_image_url]
    );
    res.status(201).json({ request: result.rows[0] });
  } catch (err) {
    console.error('Create customization error:', err);
    res.status(500).json({ error: 'Could not create request.' });
  }
});

// ─── GET /api/customizations/mine — fetch user's own requests ────────────────────
router.get('/mine', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM customization_requests WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json({ requests: result.rows });
  } catch (err) {
    console.error('Fetch my customizations error:', err);
    res.status(500).json({ error: 'Could not fetch requests.' });
  }
});

// ─── GET /api/customizations — fetch all requests (Admin only) ───────────────────
router.get('/', authenticate, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, u.name as user_name, u.email as user_email
       FROM customization_requests c
       JOIN users u ON c.user_id = u.id
       ORDER BY c.created_at DESC`
    );
    res.json({ requests: result.rows });
  } catch (err) {
    console.error('Fetch all customizations error:', err);
    res.status(500).json({ error: 'Could not fetch requests.' });
  }
});

// ─── PUT /api/customizations/:id/quote — set price and approve (Admin only) ──────
router.put('/:id/quote', authenticate, adminOnly, async (req, res) => {
  try {
    const { price } = req.body;
    if (price === undefined || isNaN(parseFloat(price)) || parseFloat(price) < 0) {
      return res.status(400).json({ error: 'Valid quote price is required.' });
    }

    const result = await pool.query(
      `UPDATE customization_requests 
       SET price = $1, status = 'approved', updated_at = NOW() 
       WHERE id = $2 
       RETURNING *`,
      [parseFloat(price), req.params.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Request not found.' });
    }

    const finalResult = await pool.query(
      `SELECT c.*, u.name as user_name, u.email as user_email
       FROM customization_requests c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = $1`,
      [req.params.id]
    );

    res.json({ request: finalResult.rows[0] });
  } catch (err) {
    console.error('Set quote error:', err);
    res.status(500).json({ error: 'Could not set quote.' });
  }
});

// ─── PUT /api/customizations/:id/status — update status (Admin only) ─────────────
router.put('/:id/status', authenticate, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status is required.' });
    }

    const result = await pool.query(
      `UPDATE customization_requests 
       SET status = $1, updated_at = NOW() 
       WHERE id = $2 
       RETURNING *`,
      [status, req.params.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Request not found.' });
    }

    const finalResult = await pool.query(
      `SELECT c.*, u.name as user_name, u.email as user_email
       FROM customization_requests c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = $1`,
      [req.params.id]
    );

    res.json({ request: finalResult.rows[0] });
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ error: 'Could not update status.' });
  }
});

module.exports = router;
