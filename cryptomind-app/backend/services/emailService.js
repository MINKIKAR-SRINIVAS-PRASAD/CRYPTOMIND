const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  async sendOTP(email, otp, name) {
    const html = `
      <div style="font-family:DM Sans,sans-serif;max-width:520px;margin:0 auto;background:#0d1220;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);">
        <div style="background:linear-gradient(135deg,#1d4ed8,#3b82f6);padding:32px;text-align:center;">
          <h1 style="color:#fff;font-size:24px;margin:0;">₿ CryptoMind</h1>
          <p style="color:rgba(255,255,255,0.8);margin-top:8px;">AI Trading Platform</p>
        </div>
        <div style="padding:36px 32px;">
          <h2 style="color:#e2e8f0;font-size:20px;margin-bottom:12px;">Hello ${name}! 👋</h2>
          <p style="color:#94a3b8;font-size:15px;line-height:1.6;">Your One-Time Password (OTP) for CryptoMind login is:</p>
          <div style="background:#111827;border:2px solid rgba(59,130,246,0.4);border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
            <div style="font-family:Space Mono,monospace;font-size:42px;font-weight:700;letter-spacing:12px;color:#3b82f6;">${otp}</div>
          </div>
          <p style="color:#94a3b8;font-size:13px;">⏰ This OTP expires in <strong style="color:#e2e8f0;">10 minutes</strong>.</p>
          <p style="color:#94a3b8;font-size:13px;margin-top:8px;">🔒 Never share this code with anyone. CryptoMind will never ask for your OTP.</p>
        </div>
        <div style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
          <p style="color:#475569;font-size:12px;">© 2024 CryptoMind AI Trading Platform. All rights reserved.</p>
        </div>
      </div>
    `;

    await this.transporter.sendMail({
      from: process.env.EMAIL_FROM || 'CryptoMind <noreply@cryptomind.ai>',
      to: email,
      subject: `${otp} — Your CryptoMind OTP`,
      html
    });
  }

  async sendTradeAlert(email, name, signal) {
    const isUp = signal.action === 'BUY';
    const color = isUp ? '#00e676' : '#ff3d57';
    const emoji = isUp ? '🟢' : '🔴';

    const html = `
      <div style="font-family:DM Sans,sans-serif;max-width:520px;margin:0 auto;background:#0d1220;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);">
        <div style="background:linear-gradient(135deg,#1d4ed8,#3b82f6);padding:32px;text-align:center;">
          <h1 style="color:#fff;font-size:24px;margin:0;">₿ CryptoMind</h1>
          <p style="color:rgba(255,255,255,0.8);margin-top:8px;">AI Trade Signal Alert</p>
        </div>
        <div style="padding:36px 32px;">
          <h2 style="color:#e2e8f0;">${emoji} New Trade Signal: ${signal.pair}</h2>
          <div style="background:#111827;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:20px;margin:20px 0;">
            <div style="display:flex;justify-content:space-between;margin-bottom:12px;">
              <span style="color:#94a3b8;">Action</span>
              <span style="color:${color};font-weight:700;font-size:18px;">${signal.action}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
              <span style="color:#94a3b8;">Entry Price</span>
              <span style="color:#e2e8f0;font-family:monospace;">$${signal.entryPrice?.toLocaleString()}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
              <span style="color:#94a3b8;">Take Profit</span>
              <span style="color:#00e676;font-family:monospace;">$${signal.takeProfitPrice?.toLocaleString()}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
              <span style="color:#94a3b8;">Stop Loss</span>
              <span style="color:#ff3d57;font-family:monospace;">$${signal.stopLossPrice?.toLocaleString()}</span>
            </div>
            <div style="display:flex;justify-content:space-between;">
              <span style="color:#94a3b8;">Confidence</span>
              <span style="color:#3b82f6;font-weight:700;">${signal.confidence}%</span>
            </div>
          </div>
          <p style="color:#94a3b8;font-size:13px;">⚠️ This is an AI-generated signal for educational purposes only. Always do your own research before trading.</p>
        </div>
        <div style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
          <p style="color:#475569;font-size:12px;">© 2024 CryptoMind AI Trading Platform</p>
        </div>
      </div>
    `;

    await this.transporter.sendMail({
      from: process.env.EMAIL_FROM || 'CryptoMind <noreply@cryptomind.ai>',
      to: email,
      subject: `${emoji} ${signal.action} Signal: ${signal.pair} — CryptoMind`,
      html
    });
  }

  async sendWelcome(email, name) {
    const html = `
      <div style="font-family:DM Sans,sans-serif;max-width:520px;margin:0 auto;background:#0d1220;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);">
        <div style="background:linear-gradient(135deg,#1d4ed8,#3b82f6);padding:40px;text-align:center;">
          <div style="font-size:48px;">₿</div>
          <h1 style="color:#fff;font-size:28px;margin:12px 0 0;">Welcome to CryptoMind!</h1>
        </div>
        <div style="padding:36px 32px;">
          <h2 style="color:#e2e8f0;">Hey ${name}! 🎉</h2>
          <p style="color:#94a3b8;font-size:15px;line-height:1.7;">Your account has been created. You now have access to:</p>
          <ul style="color:#94a3b8;font-size:14px;line-height:2;padding-left:20px;">
            <li>🤖 <strong style="color:#e2e8f0;">AI Multi-Agent Trade Signals</strong></li>
            <li>📊 <strong style="color:#e2e8f0;">Real-time Binance Price Data</strong></li>
            <li>💹 <strong style="color:#e2e8f0;">Dummy Trade Simulator</strong></li>
            <li>📈 <strong style="color:#e2e8f0;">Performance Analytics</strong></li>
            <li>🔁 <strong style="color:#e2e8f0;">Backtesting Engine</strong></li>
          </ul>
          <p style="color:#94a3b8;font-size:13px;margin-top:20px;">Happy trading! Remember to always manage your risk. 🚀</p>
        </div>
        <div style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
          <p style="color:#475569;font-size:12px;">© 2024 CryptoMind AI Trading Platform</p>
        </div>
      </div>
    `;

    await this.transporter.sendMail({
      from: process.env.EMAIL_FROM || 'CryptoMind <noreply@cryptomind.ai>',
      to: email,
      subject: `🎉 Welcome to CryptoMind, ${name}!`,
      html
    });
  }

  // Verify connection
  async verify() {
    try {
      await this.transporter.verify();
      console.log('✅ Email service connected');
      return true;
    } catch (err) {
      console.log('⚠️  Email service not connected (check credentials):', err.message);
      return false;
    }
  }
}

module.exports = new EmailService();
