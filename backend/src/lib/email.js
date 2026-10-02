const nodemailer = require('nodemailer');
require('dotenv').config();

// Determine if any email credentials have been configured
const isEmailConfigured = () => {
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.EMAIL_PASS || process.env.SMTP_PASSWORD;
  const host = process.env.SMTP_HOST;
  const service = process.env.EMAIL_SERVICE || (user && user.endsWith('@gmail.com') ? 'gmail' : null);

  return Boolean((host || service) && user && pass);
};

// Create transporter dynamically based on configured settings
const getTransporter = () => {
  const user = (process.env.EMAIL_USER || process.env.SMTP_USER || '').trim();
  // Strip spaces if user copied Google App Password as "abcd efgh ijkl mnop"
  const pass = (process.env.EMAIL_PASS || process.env.SMTP_PASSWORD || '').replace(/\s+/g, '');
  const host = (process.env.SMTP_HOST || '').trim();
  const service = (process.env.EMAIL_SERVICE || (user.endsWith('@gmail.com') ? 'gmail' : '')).trim();

  if (!user || !pass) {
    return null;
  }

  // 1. If explicit service (like 'gmail', 'outlook', 'yahoo')
  if (service) {
    return nodemailer.createTransport({
      service,
      auth: { user, pass },
    });
  }

  // 2. If standard SMTP host/port
  if (host) {
    const port = Number(process.env.SMTP_PORT || 587);
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;

    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== 'false',
      },
    });
  }

  // Default fallback to gmail service if not specified
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
};

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

/**
 * Generic email sending function with error catching and detailed logging
 */
const sendEmail = async ({ to, subject, html, text }) => {
  if (process.env.MAIL_RELAY_URL) {
    // Fire-and-forget: don't make the user wait for Google's slow relay
    fetch(process.env.MAIL_RELAY_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        secret: process.env.MAIL_RELAY_SECRET,
        to, subject, html, text,
      }),
      signal: AbortSignal.timeout(60000),
    })
      .then((r) => r.text())
      .then((raw) => {
        let data = null;
        try { data = JSON.parse(raw); } catch (_) {}
        if (data && data.ok === false) {
          console.error(`❌ [EMAIL RELAY REFUSED] ${to}:`, data.error);
        } else {
          console.log(`✅ [EMAIL SENT via relay] ${to}`);
        }
      })
      .catch((err) => console.error(`❌ [EMAIL RELAY ERROR] ${to}:`, err.message));

    return true; // respond to the website immediately
  }

  const user = (process.env.EMAIL_USER || process.env.SMTP_USER || '').trim();
  const from = process.env.SMTP_FROM || process.env.EMAIL_FROM || (user ? `Artsy Pisces <${user}>` : 'Artsy Pisces');

  const transporter = getTransporter();

  if (!transporter) {
    console.log('---------------------------------------------------------');
    console.log(`⚠️ [EMAIL NOTICE] No email credentials configured.`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    if (text) console.log(`Text: ${text}`);
    console.log('To send real emails, set EMAIL_USER & EMAIL_PASS in backend/.env');
    console.log('---------------------------------------------------------');

    if (process.env.NODE_ENV === 'production') {
      throw new Error('Email credentials (EMAIL_USER & EMAIL_PASS or SMTP_*) are required in production.');
    }
    return false;
  }

  try {
    const result = await transporter.sendMail({
      from,
      to,
      subject,
      text: text || html.replace(/<[^>]+>/g, ' '),
      html,
    });

    console.log(`✅ [EMAIL SENT] Delivered to ${to} | Message ID: ${result.messageId}`);
    return true;
  } catch (error) {
    console.error(`❌ [EMAIL ERROR] Failed to send email to ${to}:`, error.message);
    if (user.endsWith('@gmail.com')) {
      console.error('💡 [Gmail Tip] When using a personal Gmail account, use a 16-character Google App Password (not your normal password). Generate one at: https://myaccount.google.com/apppasswords');
    }
    throw error;
  }
};

/**
 * Send OTP Email for Login, Signup, or Password Reset
 * @param {string} email - Recipient email
 * @param {string} name - Recipient name
 * @param {string} otp - 6 digit verification code
 * @param {'login'|'signup'|'reset'} purpose - Flow purpose
 */
const sendOTPEmail = async (email, name, otp, purpose = 'login') => {
  const safeName = escapeHtml(name || 'Collector');
  const safeOtp = escapeHtml(otp);

  let title = 'Verification Code';
  let badgeText = 'Security Verification';
  let description = `Your verification code is ready. Use this code to complete your request.`;

  if (purpose === 'login') {
    title = 'Login Verification Code';
    badgeText = 'Account Sign In';
    description = `We received a request to sign in to your Artsy Pisces account. Please enter the verification code below to complete your login.`;
  } else if (purpose === 'signup') {
    title = 'Account Verification Code';
    badgeText = 'Welcome to Artsy Pisces';
    description = `Welcome to Artsy Pisces! Please enter the code below to verify your email address and activate your account.`;
  } else if (purpose === 'reset') {
    title = 'Password Reset Code';
    badgeText = 'Password Reset';
    description = `We received a request to reset your Artsy Pisces password. Use the verification code below to set a new password.`;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f7f7f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #18181b;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f7f7f8; padding: 40px 16px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e4e4e7; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); overflow: hidden;">
              <!-- Header -->
              <tr>
                <td style="padding: 32px 32px 20px 32px; text-align: center; border-bottom: 1px solid #f4f4f5;">
                  <h1 style="margin: 0; font-size: 26px; font-weight: 700; font-style: italic; letter-spacing: -0.5px; color: #09090b;">Artsy Pisces</h1>
                  <span style="display: inline-block; margin-top: 10px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #71717a; background: #f4f4f5; padding: 4px 12px; border-radius: 100px;">${badgeText}</span>
                </td>
              </tr>

              <!-- Content Body -->
              <tr>
                <td style="padding: 32px;">
                  <p style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #09090b;">Hello ${safeName},</p>
                  <p style="margin: 0 0 28px 0; font-size: 14px; line-height: 22px; color: #52525b;">${description}</p>

                  <!-- OTP Card -->
                  <div style="background-color: #09090b; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 28px;">
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #a1a1aa; margin-bottom: 8px;">Verification Code</div>
                    <div style="font-size: 38px; font-weight: 800; letter-spacing: 10px; color: #ffffff; font-family: monospace;">${safeOtp}</div>
                  </div>

                  <p style="margin: 0 0 16px 0; font-size: 13px; color: #71717a; line-height: 20px;">
                    ⏳ This code expires in <strong style="color: #09090b;">10 minutes</strong>. Never share this code with anyone.
                  </p>
                  <p style="margin: 0; font-size: 12px; color: #a1a1aa; line-height: 18px;">
                    If you did not make this request, you can safely disregard this email. Your account remains secure.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 20px 32px; background-color: #fafafa; border-top: 1px solid #f4f4f5; text-align: center;">
                  <p style="margin: 0; font-size: 12px; color: #a1a1aa;">
                    © ${new Date().getFullYear()} Artsy Pisces. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const text = `Artsy Pisces - ${title}\n\nHello ${name || 'there'},\n\nYour verification code is: ${otp}\n\nThis code expires in 10 minutes. Do not share it with anyone.`;

  return sendEmail({
    to: email,
    subject: `Your Artsy Pisces Verification Code: ${otp}`,
    html,
    text,
  });
};

/**
 * Send alert when a login succeeds
 */
const sendLoginEmail = async (email, name) => {
  const safeName = escapeHtml(name || 'Collector');
  const timeString = new Date().toUTCString();

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>New Login Notice</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f7f7f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #18181b;">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 16px;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #ffffff; border-radius: 14px; border: 1px solid #e4e4e7; padding: 32px;">
              <tr>
                <td>
                  <h1 style="margin: 0 0 16px 0; font-size: 24px; font-style: italic; font-weight: 700;">Artsy Pisces</h1>
                  <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: 600;">Hi ${safeName},</p>
                  <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 22px; color: #52525b;">
                    Your Artsy Pisces account was just signed into at <strong>${timeString}</strong>.
                  </p>
                  <p style="margin: 0; font-size: 12px; color: #a1a1aa; line-height: 18px;">
                    If this was you, you can ignore this notice. If you didn't sign in, please reset your password immediately.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'New login to your Artsy Pisces account',
    html,
  }).catch((err) => {
    // Non-critical notification error
    console.warn('[LOGIN NOTICE] Could not send login confirmation email:', err.message);
  });
};

module.exports = {
  sendOTPEmail,
  sendLoginEmail,
  sendEmail,
  isEmailConfigured,
};