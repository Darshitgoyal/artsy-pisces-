const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { supabase } = require('../lib/supabase');
const { authenticate } = require('../middleware/authenticate');
require('dotenv').config();

const router = express.Router();

// Helper to make a JWT token
const makeToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' } // token lasts 7 days
  );
};

// ─── POST /api/auth/signup ───────────────────────────────────────────────────
// Anyone can call this. Role is ALWAYS set to 'user' — never from request body.
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Basic validation
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password and name are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    // Check if email already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // Hash the password (never store plain text)
    const hashedPassword = await bcrypt.hash(password, 12);

    // Insert user — role is hardcoded 'user', never from req.body
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase(),
        password: hashedPassword,
        name: name.trim(),
        role: 'user', // hardcoded — this is the only place role gets set for normal users
      })
      .select('id, email, name, role')
      .single();

    if (error) {
      console.error('Signup DB error:', error);
      return res.status(500).json({ error: 'Could not create account. Please try again.' });
    }

    const token = makeToken(newUser);

    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        // NOTE: we do NOT return role to the client on signup
      },
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── POST /api/auth/login ────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Find user by email
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !user) {
      // Don't reveal whether the email exists — generic message
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Compare password with hash
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = makeToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role, // role IS returned on login so frontend can redirect correctly
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── GET /api/auth/me ────────────────────────────────────────────────────────
// Frontend calls this on app load to restore the session from localStorage token
router.get('/me', authenticate, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, role')
      .eq('id', req.user.id)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ user });
  } catch (err) {
    console.error('/me error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;