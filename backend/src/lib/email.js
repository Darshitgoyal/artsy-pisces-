const { Resend } = require('resend');
require('dotenv').config();

const resend = new Resend(process.env.RESEND_API_KEY);

const sendOTPEmail = async (email, name, otp) => {
  // In development with onboarding@resend.dev, emails can only go to
  // your verified address. In production with a custom domain, use `email` directly.
  const recipient = process.env.NODE_ENV === 'production'
    ? email
    : (process.env.RESEND_TEST_EMAIL || email);

  const result = await resend.emails.send({
    from: 'Artsy Pisces <onboarding@resend.dev>',
    to: recipient,
    subject: 'Your Artsy Pisces verification code',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h1 style="font-size: 28px; font-style: italic; margin-bottom: 8px;">Artsy Pisces</h1>
        <p style="color: #666; margin-bottom: 32px;">Welcome, ${name}!</p>
        <p style="color: #333; margin-bottom: 16px;">Your verification code is:</p>
        <div style="background: #f4f4f5; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 40px; font-weight: 800; letter-spacing: 12px; color: #1a1a1a;">${otp}</span>
        </div>
        <p style="color: #999; font-size: 13px;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
        <p style="color: #bbb; font-size: 12px; margin-top: 24px;">If you didn't request this, ignore this email.</p>
      </div>
    `,
  });

  if (result.error) {
    console.error('Email send error:', result.error);
    throw new Error(result.error.message);
  }

  console.log('OTP email sent to:', recipient, '| ID:', result.data?.id);
};

module.exports = { sendOTPEmail };