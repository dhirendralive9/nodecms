/**
 * Mailer Utility
 * 
 * Sends emails via SMTP using Nodemailer.
 * SMTP config can come from:
 *   1. Environment variables (SMTP_HOST, SMTP_PORT, etc.) — set in .env or CPaaS
 *   2. Database settings (admin can override from Settings → Email)
 * 
 * ENV takes priority. If ENV is not set, falls back to DB settings.
 * If neither is configured, emails silently fail with a console warning.
 */

const nodemailer = require('nodemailer');
const Settings = require('../models/Settings');

let cachedTransporter = null;
let cachedConfig = null;

/**
 * Get SMTP config — merges ENV with DB settings, ENV wins
 */
async function getSmtpConfig() {
  // Load DB settings as base
  const dbSmtp = await Settings.get('smtp', {});

  const config = {
    host:      process.env.SMTP_HOST      || dbSmtp.host      || '',
    port:      parseInt(process.env.SMTP_PORT || dbSmtp.port)  || 587,
    secure:    (process.env.SMTP_SECURE === 'true') || dbSmtp.secure || false,
    user:      process.env.SMTP_USER      || dbSmtp.user      || '',
    pass:      process.env.SMTP_PASS      || dbSmtp.pass      || '',
    fromName:  process.env.SMTP_FROM_NAME  || dbSmtp.fromName  || 'NodeCMS',
    fromEmail: process.env.SMTP_FROM_EMAIL || dbSmtp.fromEmail || ''
  };

  return config;
}

/**
 * Check if SMTP is configured (from either source)
 */
async function isConfigured() {
  const config = await getSmtpConfig();
  return !!(config.host && config.user && config.pass);
}

/**
 * Get or create the Nodemailer transporter
 */
async function getTransporter() {
  const config = await getSmtpConfig();

  // Check if config changed (invalidate cache)
  const configKey = JSON.stringify({ h: config.host, p: config.port, u: config.user });
  if (cachedTransporter && cachedConfig === configKey) {
    return cachedTransporter;
  }

  if (!config.host || !config.user || !config.pass) {
    return null;
  }

  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass
    },
    tls: {
      rejectUnauthorized: false  // Allows self-signed certs
    }
  });

  cachedConfig = configKey;
  return cachedTransporter;
}

/**
 * Send an email
 * @param {object} options - { to, subject, html, text }
 * @returns {object} - { success, messageId, error }
 */
async function sendMail({ to, subject, html, text }) {
  try {
    const transporter = await getTransporter();
    if (!transporter) {
      console.warn('⚠ Mail not sent — SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in env or Settings.');
      return { success: false, error: 'SMTP not configured' };
    }

    const config = await getSmtpConfig();
    const from = config.fromName
      ? `"${config.fromName}" <${config.fromEmail || config.user}>`
      : config.fromEmail || config.user;

    const result = await transporter.sendMail({
      from,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, '')
    });

    console.log(`✉ Email sent to ${to}: ${subject} [${result.messageId}]`);
    return { success: true, messageId: result.messageId };
  } catch (err) {
    console.error(`✗ Email failed to ${to}:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Test SMTP connection
 */
async function testConnection(customConfig) {
  try {
    const config = customConfig || await getSmtpConfig();
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: parseInt(config.port) || 587,
      secure: config.secure === true || config.secure === 'true',
      auth: { user: config.user, pass: config.pass },
      tls: { rejectUnauthorized: false }
    });

    await transporter.verify();
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Invalidate cached transporter (call when SMTP settings change)
 */
function invalidateCache() {
  cachedTransporter = null;
  cachedConfig = null;
}

// ── Email Templates ──────────────────────────────────────

/**
 * Send password reset email
 */
async function sendPasswordReset(user, resetUrl, siteName) {
  return sendMail({
    to: user.email,
    subject: `Reset your password — ${siteName || 'NodeCMS'}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:500px;margin:0 auto;padding:2rem">
        <h2 style="color:#0f172a;margin-bottom:0.5rem">Password Reset</h2>
        <p style="color:#475569">Hi ${user.displayName || user.username},</p>
        <p style="color:#475569">You requested a password reset. Click the button below to set a new password:</p>
        <a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:0.75rem 1.5rem;border-radius:6px;text-decoration:none;font-weight:600;margin:1rem 0">
          Reset Password
        </a>
        <p style="color:#94a3b8;font-size:0.85rem">This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:1.5rem 0">
        <p style="color:#94a3b8;font-size:0.8rem">${siteName || 'NodeCMS'}</p>
      </div>
    `
  });
}

/**
 * Send welcome email after setup
 */
async function sendWelcome(user, loginUrl, siteName) {
  return sendMail({
    to: user.email,
    subject: `Welcome to ${siteName || 'NodeCMS'}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:500px;margin:0 auto;padding:2rem">
        <h2 style="color:#0f172a">Welcome to ${siteName || 'NodeCMS'}!</h2>
        <p style="color:#475569">Hi ${user.displayName || user.username},</p>
        <p style="color:#475569">Your site is live and ready. Here are your login details:</p>
        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:1rem;margin:1rem 0">
          <p style="margin:0.25rem 0;color:#334155"><strong>Admin URL:</strong> ${loginUrl}</p>
          <p style="margin:0.25rem 0;color:#334155"><strong>Username:</strong> ${user.username}</p>
        </div>
        <a href="${loginUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:0.75rem 1.5rem;border-radius:6px;text-decoration:none;font-weight:600;margin:0.5rem 0">
          Go to Dashboard
        </a>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:1.5rem 0">
        <p style="color:#94a3b8;font-size:0.8rem">${siteName || 'NodeCMS'}</p>
      </div>
    `
  });
}

/**
 * Send new post notification
 */
async function sendNewPostNotification(adminEmail, post, siteUrl, siteName) {
  return sendMail({
    to: adminEmail,
    subject: `New post published: ${post.title} — ${siteName || 'NodeCMS'}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:500px;margin:0 auto;padding:2rem">
        <h2 style="color:#0f172a">New Post Published</h2>
        <p style="color:#475569">The post "<strong>${post.title}</strong>" has been published.</p>
        <a href="${siteUrl}/post/${post.slug}" style="display:inline-block;background:#2563eb;color:#fff;padding:0.65rem 1.25rem;border-radius:6px;text-decoration:none;font-weight:600;margin:0.5rem 0">
          View Post
        </a>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:1.5rem 0">
        <p style="color:#94a3b8;font-size:0.8rem">${siteName || 'NodeCMS'}</p>
      </div>
    `
  });
}

module.exports = {
  sendMail,
  sendPasswordReset,
  sendWelcome,
  sendNewPostNotification,
  testConnection,
  isConfigured,
  getSmtpConfig,
  invalidateCache
};
