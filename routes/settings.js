const router = require('express').Router();
const Settings = require('../models/Settings');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const imageProcessor = require('../utils/imageProcessor');
const mailer = require('../utils/mailer');

router.use(requireAuth, requireAdmin);

router.get('/', async (req, res) => {
  const settings = await Settings.getAll();
  const imgDefaults = imageProcessor.getDefaults();
  const imgSettings = settings.imageOptimization || imgDefaults;
  const smtpConfig = await mailer.getSmtpConfig();
  const smtpConfigured = await mailer.isConfigured();
  // Check if SMTP is set via ENV (so we show read-only in admin)
  const smtpFromEnv = !!(process.env.SMTP_HOST && process.env.SMTP_USER);

  res.render('admin/settings/index', {
    settings,
    imgSettings,
    sharpAvailable: imageProcessor.isAvailable(),
    smtpConfig,
    smtpConfigured,
    smtpFromEnv
  });
});

router.post('/', async (req, res) => {
  try {
    const {
      siteTitle, siteTagline, siteLogo, siteFavicon, footerText, postsPerPage,
      globalHeadCode, globalBodyCode
    } = req.body;

    await Promise.all([
      Settings.set('siteTitle', siteTitle),
      Settings.set('siteTagline', siteTagline),
      Settings.set('siteLogo', siteLogo || ''),
      Settings.set('siteFavicon', siteFavicon || ''),
      Settings.set('footerText', footerText),
      Settings.set('postsPerPage', parseInt(postsPerPage) || 10),
      Settings.set('globalHeadCode', globalHeadCode || ''),
      Settings.set('globalBodyCode', globalBodyCode || '')
    ]);

    req.flash('success', 'Settings saved');
    res.redirect('/admin/settings');
  } catch (err) {
    req.flash('error', 'Failed to save settings');
    res.redirect('/admin/settings');
  }
});

// Image optimization settings (separate form)
router.post('/image-optimization', async (req, res) => {
  try {
    const {
      enabled, generateThumbnails, generateWebP, compressOriginal,
      quality, webpQuality
    } = req.body;

    await Settings.set('imageOptimization', {
      enabled: enabled === 'on',
      generateThumbnails: generateThumbnails === 'on',
      generateWebP: generateWebP === 'on',
      compressOriginal: compressOriginal === 'on',
      quality: parseInt(quality) || 80,
      webpQuality: parseInt(webpQuality) || 80
    });

    req.flash('success', 'Image optimization settings saved');
    res.redirect('/admin/settings');
  } catch (err) {
    req.flash('error', 'Failed to save image settings');
    res.redirect('/admin/settings');
  }
});

// SMTP / Email settings
router.post('/smtp', async (req, res) => {
  try {
    const { host, port, secure, user, pass, fromName, fromEmail } = req.body;

    await Settings.set('smtp', {
      host: host || '',
      port: parseInt(port) || 587,
      secure: secure === 'on',
      user: user || '',
      pass: pass || '',
      fromName: fromName || 'NodeCMS',
      fromEmail: fromEmail || ''
    });

    mailer.invalidateCache();
    req.flash('success', 'SMTP settings saved');
    res.redirect('/admin/settings');
  } catch (err) {
    req.flash('error', 'Failed to save SMTP settings');
    res.redirect('/admin/settings');
  }
});

// Test SMTP connection
router.post('/smtp/test', async (req, res) => {
  try {
    const { host, port, secure, user, pass, fromName, fromEmail, testEmail } = req.body;

    const config = {
      host, port, secure: secure === 'on', user, pass, fromName, fromEmail
    };

    // Test connection first
    const connResult = await mailer.testConnection(config);
    if (!connResult.success) {
      return res.json({ success: false, error: 'Connection failed: ' + connResult.error });
    }

    // Send test email
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: parseInt(config.port) || 587,
      secure: config.secure,
      auth: { user: config.user, pass: config.pass },
      tls: { rejectUnauthorized: false }
    });

    const from = config.fromName
      ? `"${config.fromName}" <${config.fromEmail || config.user}>`
      : config.fromEmail || config.user;

    await transporter.sendMail({
      from,
      to: testEmail || req.session.user.email,
      subject: 'NodeCMS — SMTP Test Email',
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:500px;margin:0 auto;padding:2rem">
          <h2 style="color:#16a34a">SMTP is working!</h2>
          <p style="color:#475569">This is a test email from your NodeCMS installation.</p>
          <p style="color:#475569">Your SMTP settings are correctly configured.</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:1.5rem 0">
          <p style="color:#94a3b8;font-size:0.8rem">Host: ${config.host}:${config.port} | From: ${from}</p>
        </div>
      `
    });

    res.json({ success: true, message: 'Test email sent to ' + (testEmail || req.session.user.email) });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

module.exports = router;
