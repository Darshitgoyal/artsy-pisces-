const nodemailer = require('nodemailer');
require('dotenv').config();

const smtpConfigured = Boolean(
  process.env.SMTP_HOST &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASSWORD
);

const transporter = smtpConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    })
  : null;

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const sendEmail = async ({ to, subject, html }) => {
  if (!transporter) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SMTP_HOST, SMTP_USER and SMTP_PASSWORD are required in production.');
    }
    return false;
  }

  const result = await transporter.sendMail({
    from: process.env.SMTP_FROM || `Artsy Pisces <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });

  console.log('Email sent to:', to, '| ID:', result.messageId);
  return true;
};

const sendOTPEmail = async (email, name, otp) => {
  if (!transporter) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SMTP_HOST, SMTP_USER and SMTP_PASSWORD are required in production.');
    }
    console.log('Development OTP for', email, ':', otp);
    return;
  }

  await sendEmail({
    to: email,
    subject: 'Your Artsy Pisces verification code',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h1 style="font-size: 28px; font-style: italic; margin-bottom: 8px;">Artsy Pisces</h1>
        <p style="color: #666; margin-bottom: 32px;">Welcome, ${escapeHtml(name)}!</p>
        <p style="color: #333; margin-bottom: 16px;">Your verification code is:</p>
        <div style="background: #f4f4f5; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 40px; font-weight: 800; letter-spacing: 12px; color: #1a1a1a;">${escapeHtml(otp)}</span>
        </div>
        <p style="color: #999; font-size: 13px;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
        <p style="color: #bbb; font-size: 12px; margin-top: 24px;">If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
};

const sendLoginEmail = async (email, name) => {
  await sendEmail({
    to: email,
    subject: 'New login to your Artsy Pisces account',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h1 style="font-size: 28px; font-style: italic; margin-bottom: 8px;">Artsy Pisces</h1>
        <p style="color: #333;">Hi ${escapeHtml(name)},</p>
        <p style="color: #666;">Your account was just used to sign in. If this was not you, reset your password immediately.</p>
      </div>
    `,
  });
};

module.exports = { sendOTPEmail, sendLoginEmail };