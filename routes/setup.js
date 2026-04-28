const router = require('express').Router();
const User = require('../models/User');
const Settings = require('../models/Settings');
const Menu = require('../models/Menu');

/**
 * One-time setup wizard
 * 
 * Automatically shown when no users exist in the database.
 * After the admin account is created, this route becomes inaccessible.
 * Replaces the need for `npm run seed` entirely.
 */

// Middleware: block access if setup is already done
async function setupGuard(req, res, next) {
  const userCount = await User.countDocuments();
  if (userCount > 0) {
    return res.redirect('/admin/login');
  }
  next();
}

// ── Setup Page ───────────────────────────────────────────
router.get('/', setupGuard, (req, res) => {
  res.render('admin/setup', { error: null });
});

// ── Process Setup ────────────────────────────────────────
router.post('/', setupGuard, async (req, res) => {
  try {
    const { username, email, password, confirmPassword, siteTitle, siteTagline } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.render('admin/setup', { error: 'All fields are required' });
    }
    if (username.length < 3) {
      return res.render('admin/setup', { error: 'Username must be at least 3 characters' });
    }
    if (password.length < 6) {
      return res.render('admin/setup', { error: 'Password must be at least 6 characters' });
    }
    if (password !== confirmPassword) {
      return res.render('admin/setup', { error: 'Passwords do not match' });
    }

    // Create admin user
    const admin = new User({
      username: username.trim().toLowerCase(),
      email: email.trim().toLowerCase(),
      password,
      role: 'admin',
      displayName: username.trim()
    });
    await admin.save();

    // Create default settings
    await Promise.all([
      Settings.set('siteTitle', siteTitle || 'NodeCMS'),
      Settings.set('siteTagline', siteTagline || ''),
      Settings.set('activeTheme', 'default'),
      Settings.set('footerText', `© ${new Date().getFullYear()} ${siteTitle || 'NodeCMS'}. All rights reserved.`),
      Settings.set('postsPerPage', 10),
      Settings.set('globalHeadCode', ''),
      Settings.set('globalBodyCode', '')
    ]);

    // Create default menus
    const menuCount = await Menu.countDocuments();
    if (menuCount === 0) {
      await Menu.create([
        {
          name: 'Primary',
          location: 'primary',
          items: [
            { label: 'Home', url: '/', target: '_self', order: 0, children: [] }
          ]
        },
        {
          name: 'Footer',
          location: 'footer',
          items: [
            { label: 'Home', url: '/', target: '_self', order: 0, children: [] }
          ]
        }
      ]);
    }

    // Auto-login the new admin
    req.session.user = {
      _id: admin._id,
      username: admin.username,
      email: admin.email,
      role: admin.role,
      displayName: admin.displayName,
      avatar: ''
    };

    res.redirect('/admin');
  } catch (err) {
    console.error('Setup error:', err);
    let errorMsg = 'Setup failed: ' + err.message;
    if (err.code === 11000) {
      errorMsg = 'That username or email is already taken';
    }
    res.render('admin/setup', { error: errorMsg });
  }
});

module.exports = router;
