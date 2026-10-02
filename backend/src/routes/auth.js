const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../lib/supabase');
const { authenticate } = require('../middleware/authenticate');
const { sendOTPEmail, isEmailConfigured } = require('../lib/email');
require('dotenv').config();

const router = express.Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

const makeToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const formatAuthError = (err, defaultMsg = 'An unexpected error occurred.') => {
  if (!err) return defaultMsg;
  if (err.code === 'ENETUNREACH' || err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
    return 'Database network unreachable. If hosted on Render, you must use the Supabase IPv4 Pooler URL (aws-0-...pooler.supabase.com:6543) instead of direct connection.';
  }
  if (err.code === '28P01') {
    return 'Database password authentication failed for user "postgres". Please reset or check your Supabase DB password.';
  }
  if (err.responseCode === 535 || (err.message && (err.message.includes('5.7.8') || err.message.includes('Username and Password not accepted')))) {
    return 'Email authentication failed: Google rejected the App Password for artsy.picese@gmail.com. Please verify your 16-character App Password.';
  }
  return err.message || defaultMsg;
};

// ─── POST /api/auth/send-otp ──────────────────────────────────────────────────
// Step 1 of signup — validate details and send OTP to email
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
    await pool.query(
      'DELETE FROM otp_verifications WHERE email = $1',
      [email.toLowerCase()]
    );

    // Generate OTP and store it (expires in 10 minutes)
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      'INSERT INTO otp_verifications (email, otp, expires_at) VALUES ($1, $2, $3)',
      [email.toLowerCase(), otp, expiresAt]
    );

    // Send OTP email
    await sendOTPEmail(email, name, otp, 'signup');

    res.json({
      message: 'OTP sent to your email. Please verify to complete signup.',
      ...(process.env.NODE_ENV !== 'production' && !isEmailConfigured()
        ? { otp }
        : {}),
    });
  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({ error: formatAuthError(err, 'Could not send OTP. Please try again.') });
  }
});

// ─── POST /api/auth/signup ────────────────────────────────────────────────────
// Step 2 of signup — verify OTP and create account
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

    // Check expiry
    if (new Date() > new Date(record.expires_at))
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });

    // Check OTP matches
    if (record.otp !== otp.trim())
      return res.status(400).json({ error: 'Incorrect OTP. Please check your email.' });

    // Mark OTP as used
    await pool.query(
      'UPDATE otp_verifications SET used = true WHERE id = $1',
      [record.id]
    );

    // Final check — email not registered while OTP was pending
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
      user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role },
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: formatAuthError(err, 'Server error during signup.') });
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
// Email + password only (OTP is used only for signup and password reset)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required.' });

    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    const user = result.rows[0];

    if (!user)
      return res.status(401).json({ error: 'Invalid email or password.' });

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch)
      return res.status(401).json({ error: 'Invalid email or password.' });

    const token = makeToken(user);

    return res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during sign in.' });
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
    console.error('/me error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────
// Send OTP to email for password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const result = await pool.query(
      'SELECT id, name, email FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    const user = result.rows[0];

    if (!user) {
      return res.json({ message: 'If this email exists, a verification code has been sent.' });
    }

    const recent = await pool.query(
      `SELECT created_at FROM otp_verifications 
       WHERE email = $1 
       ORDER BY created_at DESC LIMIT 1`,
      [email.toLowerCase()]
    );
    if (recent.rows.length > 0) {
      const elapsed = Date.now() - new Date(recent.rows[0].created_at).getTime();
      if (elapsed < 30 * 1000) {
        const wait = Math.ceil((30 * 1000 - elapsed) / 1000);
        return res.status(429).json({ error: `Please wait ${wait}s before requesting a new code.` });
      }
    }

    await pool.query(
      'DELETE FROM otp_verifications WHERE email = $1',
      [email.toLowerCase()]
    );

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      'INSERT INTO otp_verifications (email, otp, expires_at) VALUES ($1, $2, $3)',
      [email.toLowerCase(), otp, expiresAt]
    );

    await sendOTPEmail(user.email, user.name, otp, 'reset');

    res.json({
      message: 'If this email exists, a verification code has been sent.',
      ...(process.env.NODE_ENV !== 'production' && !isEmailConfigured()
        ? { otp }
        : {}),
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── POST /api/auth/resend-forgot-otp ─────────────────────────────────────────
router.post('/resend-forgot-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const result = await pool.query(
      'SELECT id, name, email FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ error: 'No account found with this email.' });
    }

    const recent = await pool.query(
      `SELECT created_at FROM otp_verifications 
       WHERE email = $1 
       ORDER BY created_at DESC LIMIT 1`,
      [email.toLowerCase()]
    );
    if (recent.rows.length > 0) {
      const elapsed = Date.now() - new Date(recent.rows[0].created_at).getTime();
      if (elapsed < 30 * 1000) {
        const wait = Math.ceil((30 * 1000 - elapsed) / 1000);
        return res.status(429).json({ error: `Please wait ${wait}s before requesting a new code.` });
      }
    }

    await pool.query('DELETE FROM otp_verifications WHERE email = $1', [email.toLowerCase()]);

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      'INSERT INTO otp_verifications (email, otp, expires_at) VALUES ($1, $2, $3)',
      [email.toLowerCase(), otp, expiresAt]
    );

    await sendOTPEmail(user.email, user.name, otp, 'reset');

    res.json({
      message: 'New password reset code sent to your email.',
      ...(process.env.NODE_ENV !== 'production' && !isEmailConfigured()
        ? { otp }
        : {}),
    });
  } catch (err) {
    console.error('Resend forgot OTP error:', err);
    res.status(500).json({ error: 'Could not resend code. Please try again.' });
  }
});

// ─── POST /api/auth/reset-password ───────────────────────────────────────────
// Verify OTP and set new password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword)
      return res.status(400).json({ error: 'Email, OTP and new password are required.' });
    if (newPassword.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    const otpRecord = await pool.query(
      `SELECT * FROM otp_verifications
       WHERE email = $1 AND used = false
       ORDER BY created_at DESC LIMIT 1`,
      [email.toLowerCase()]
    );

    if (otpRecord.rows.length === 0)
      return res.status(400).json({ error: 'No OTP found. Please request a new one.' });

    const record = otpRecord.rows[0];

    if (new Date() > new Date(record.expires_at))
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });

    if (record.otp !== otp.trim())
      return res.status(400).json({ error: 'Incorrect OTP.' });

    await pool.query(
      'UPDATE otp_verifications SET used = true WHERE id = $1',
      [record.id]
    );

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await pool.query(
      'UPDATE users SET password = $1 WHERE email = $2',
      [hashedPassword, email.toLowerCase()]
    );

    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── PUT /api/auth/change-password ───────────────────────────────────────────
// For logged-in admin (or any user) to change their own password
router.put('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword)
      return res.status(400).json({ error: 'Current and new password are required.' });
    if (newPassword.length < 6)
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });

    // Get user from DB
    const result = await pool.query(
      'SELECT * FROM users WHERE id = $1',
      [req.user.id]
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found.' });

    // Verify current password
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match)
      return res.status(401).json({ error: 'Current password is incorrect.' });

    // Hash and save new password
    const hashed = await bcrypt.hash(newPassword, 12);
    await pool.query(
      'UPDATE users SET password = $1 WHERE id = $2',
      [hashed, req.user.id]
    );

    res.json({ message: 'Password changed successfully.' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;