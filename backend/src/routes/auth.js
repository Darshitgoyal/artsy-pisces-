const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../lib/supabase');
const { authenticate } = require('../middleware/authenticate');
const { sendOTPEmail } = require('../lib/email');
require('dotenv').config();

const router = express.Router();

const makeToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Generate a random 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ─── POST /api/auth/send-otp ──────────────────────────────────────────────────
// Step 1 of signup: validate details + send OTP to email
router.post('/send-otp', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name)
      return res.status(400).json({ error: 'Email, password and name are required.' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    // Check if email already registered
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    if (existing.rows.length > 0)
      return res.status(409).json({ error: 'An account with this email already exists.' });

    // Delete any previous OTPs for this email
    await pool.query('DELETE FROM otp_verifications WHERE email = $1', [email.toLowerCase()]);

    // Generate OTP and store it (expires in 10 minutes)
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins from now

    await pool.query(
      `INSERT INTO otp_verifications (email, otp, expires_at)
       VALUES ($1, $2, $3)`,
      [email.toLowerCase(), otp, expiresAt]
    );

    // Send OTP email
    await sendOTPEmail(email, name, otp);

    res.json({ message: 'OTP sent to your email. Please verify to complete signup.' });
  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({ error: 'Could not send OTP. Please try again.' });
  }
});

// ─── POST /api/auth/signup ────────────────────────────────────────────────────
// Step 2 of signup: verify OTP + create account
router.post('/signup', async (req, res) => {
  try {
    const { email, password, name, otp } = req.body;

    if (!email || !password || !name || !otp)
      return res.status(400).json({ error: 'All fields including OTP are required.' });

    // Find the OTP record
    const otpRecord = await pool.query(
      `SELECT * FROM otp_verifications
       WHERE email = $1 AND used = false
       ORDER BY created_at DESC LIMIT 1`,
      [email.toLowerCase()]
    );

    if (otpRecord.rows.length === 0)
      return res.status(400).json({ error: 'No OTP found for this email. Please request a new one.' });

    const record = otpRecord.rows[0];

    // Check if OTP expired
    if (new Date() > new Date(record.expires_at))
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });

    // Check if OTP matches
    if (record.otp !== otp.trim())
      return res.status(400).json({ error: 'Incorrect OTP. Please check your email.' });

    // Mark OTP as used
    await pool.query('UPDATE otp_verifications SET used = true WHERE id = $1', [record.id]);

    // Check again if email was registered while OTP was pending
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    if (existing.rows.length > 0)
      return res.status(409).json({ error: 'An account with this email already exists.' });

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (email, password, name, role)
       VALUES ($1, $2, $3, 'user')
       RETURNING id, email, name, role`,
      [email.toLowerCase(), hashedPassword, name.trim()]
    );

    const newUser = result.rows[0];
    const token = makeToken(newUser);

    res.status(201).json({
      token,
      user: { id: newUser.id, name: newUser.name, email: newUser.email },
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required.' });

    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    const user = result.rows[0];

    if (!user)
      return res.status(401).json({ error: 'Invalid email or password.' });

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch)
      return res.status(401).json({ error: 'Invalid email or password.' });

    const token = makeToken(user);
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, name, role FROM users WHERE id = $1',
      [req.user.id]
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;