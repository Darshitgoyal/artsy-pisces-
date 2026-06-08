const express = require('express');
const { pool } = require('../lib/supabase');
const { authenticate } = require('../middleware/authenticate');
const { adminOnly } = require('../middleware/adminOnly');
const { cloudinary, upload } = require('../lib/cloudinary');

const router = express.Router();

// ─── GET /api/artworks ── public ─────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM artworks WHERE available = true ORDER BY created_at DESC`
    );
    res.json({ artworks: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch artworks.' });
  }
});

// ─── GET /api/artworks/:id ── public ─────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM artworks WHERE id = $1`, [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Artwork not found.' });
    res.json({ artwork: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── POST /api/artworks ── admin only + image upload ─────────────────────────
router.post('/', authenticate, adminOnly, upload.single('image'), async (req, res) => {
  try {
    const { title, description, my_quote, category, price } = req.body;
    if (!title || price === undefined) {
      return res.status(400).json({ error: 'Title and price are required.' });
    }

    // If image uploaded → use Cloudinary URL, otherwise use URL from body
    const image_url = req.file ? req.file.path : req.body.image_url;

    const result = await pool.query(
      `INSERT INTO artworks (title, description, my_quote, category, price, image_url, available)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING *`,
      [title, description, my_quote, category, parseFloat(price), image_url]
    );
    res.status(201).json({ artwork: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not add artwork.' });
  }
});

// ─── PUT /api/artworks/:id ── admin only + optional image update ──────────────
router.put('/:id', authenticate, adminOnly, upload.single('image'), async (req, res) => {
  try {
    const { title, description, my_quote, category, price, available } = req.body;

    // Get existing artwork first (to delete old Cloudinary image if replacing)
    const existing = await pool.query(`SELECT * FROM artworks WHERE id = $1`, [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'Artwork not found.' });

    let image_url = existing.rows[0].image_url; // keep old image by default

    if (req.file) {
      // New image uploaded — delete old one from Cloudinary if it was a Cloudinary URL
      if (image_url && image_url.includes('cloudinary.com')) {
        const publicId = image_url.split('/').slice(-2).join('/').split('.')[0];
        await cloudinary.uploader.destroy(`artsy-pisces/${publicId.split('/').pop()}`);
      }
      image_url = req.file.path; // use new Cloudinary URL
    }

    const result = await pool.query(
      `UPDATE artworks
       SET title=$1, description=$2, my_quote=$3, category=$4,
           price=$5, image_url=$6, available=$7
       WHERE id=$8 RETURNING *`,
      [
        title ?? existing.rows[0].title,
        description ?? existing.rows[0].description,
        my_quote ?? existing.rows[0].my_quote,
        category ?? existing.rows[0].category,
        price ? parseFloat(price) : existing.rows[0].price,
        image_url,
        available !== undefined ? available : existing.rows[0].available,
        req.params.id,
      ]
    );
    res.json({ artwork: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update artwork.' });
  }
});

// ─── DELETE /api/artworks/:id ── admin only ───────────────────────────────────
router.delete('/:id', authenticate, adminOnly, async (req, res) => {
  try {
    const existing = await pool.query(`SELECT image_url FROM artworks WHERE id = $1`, [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'Artwork not found.' });

    // Delete image from Cloudinary too
    const image_url = existing.rows[0].image_url;
    if (image_url && image_url.includes('cloudinary.com')) {
      const publicId = image_url.split('/').slice(-2).join('/').split('.')[0];
      await cloudinary.uploader.destroy(`artsy-pisces/${publicId.split('/').pop()}`);
    }

    await pool.query(`DELETE FROM artworks WHERE id = $1`, [req.params.id]);
    res.json({ message: 'Artwork deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Could not delete artwork.' });
  }
});

module.exports = router;