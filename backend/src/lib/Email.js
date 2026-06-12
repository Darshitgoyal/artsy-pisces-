const { Resend } = require('resend');
require('dotenv').config();

const resend = new Resend(process.env.RESEND_API_KEY);

const sendOTPEmail = async (email, name, otp) => {
  await resend.emails.send({
    from: 'Artsy Pisces <onboarding@resend.dev>', // use this until you add your domain
    to: email,
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
};

module.exports = { sendOTPEmail };