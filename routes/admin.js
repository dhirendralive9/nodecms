const router = require('express').Router();
const crypto = require('crypto');
const User = require('../models/User');
const Post = require('../models/Post');
const Page = require('../models/Page');
const Media = require('../models/Media');
const Settings = require('../models/Settings');
const { requireAuth } = require('../middleware/auth');
const mailer = require('../utils/mailer');

// ── Login ────────────────────────────────────────────────
router.get('/login', async (req, res) => {
  if (req.session.user) return res.redirect('/admin');

  // If no users exist, redirect to setup wizard
  const userCount = await User.countDocuments();
  if (userCount === 0) return res.redirect('/admin/setup');

  res.render('admin/login', { error: null, success: null });
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({
      $or: [{ username }, { email: username }]
    });

    if (!user || !(await user.comparePassword(password))) {
      return res.render('admin/login', { error: 'Invalid credentials', success: null });
    }

    req.session.user = {
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      displayName: user.displayName || user.username,
      avatar: user.avatar
    };

    res.redirect('/admin');
  } catch (err) {
    res.render('admin/login', { error: 'Login failed', success: null });
  }
});

// ── Forgot Password ─────────────────────────────────────
router.get('/forgot-password', (req, res) => {
  res.render('admin/forgot-password', { error: null, success: null });
});

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.trim().toLowerCase() });

    // Always show success message (don't reveal if email exists)
    const successMsg = 'If an account with that email exists, a reset link has been sent.';

    if (!user) {
      return res.render('admin/forgot-password', { error: null, success: successMsg });
    }

    // Generate token
    const token = crypto.randomBytes(32).toString('hex');
    user.resetToken = crypto.createHash('sha256').update(token).digest('hex');
    user.resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    // Send email
    const siteUrl = process.env.SITE_URL || `${req.protocol}://${req.get('host')}`;
    const resetUrl = `${siteUrl}/admin/reset-password/${token}`;
    const siteName = await Settings.get('siteTitle', 'NodeCMS');

    await mailer.sendPasswordReset(user, resetUrl, siteName);

    res.render('admin/forgot-password', { error: null, success: successMsg });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.render('admin/forgot-password', { error: 'Something went wrong. Please try again.', success: null });
  }
});

// ── Reset Password ──────────────────────────────────────
router.get('/reset-password/:token', async (req, res) => {
  const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const user = await User.findOne({
    resetToken: hashedToken,
    resetExpires: { $gt: new Date() }
  });

  if (!user) {
    return res.render('admin/reset-password', { error: 'Reset link is invalid or has expired.', token: null });
  }

  res.render('admin/reset-password', { error: null, token: req.params.token });
});

router.post('/reset-password/:token', async (req, res) => {
  try {
    const { password, confirmPassword } = req.body;

    if (!password || password.length < 6) {
      return res.render('admin/reset-password', { error: 'Password must be at least 6 characters.', token: req.params.token });
    }
    if (password !== confirmPassword) {
      return res.render('admin/reset-password', { error: 'Passwords do not match.', token: req.params.token });
    }

    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
      resetToken: hashedToken,
      resetExpires: { $gt: new Date() }
    });

    if (!user) {
      return res.render('admin/reset-password', { error: 'Reset link is invalid or has expired.', token: null });
    }

    user.password = password;
    user.resetToken = null;
    user.resetExpires = null;
    await user.save();

    res.render('admin/login', { error: null, success: 'Password reset successful. You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.render('admin/reset-password', { error: 'Something went wrong.', token: req.params.token });
  }
});

// ── Logout ───────────────────────────────────────────────
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

// ── Dashboard ────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const [postCount, pageCount, mediaCount, draftCount, recentPosts] = await Promise.all([
      Post.countDocuments({ status: 'published' }),
      Page.countDocuments({ status: 'published' }),
      Media.countDocuments(),
      Post.countDocuments({ status: 'draft' }),
      Post.find().sort({ createdAt: -1 }).limit(5).populate('author', 'displayName username')
    ]);

    res.render('admin/dashboard', {
      stats: { postCount, pageCount, mediaCount, draftCount },
      recentPosts
    });
  } catch (err) {
    console.error(err);
    res.render('admin/dashboard', {
      stats: { postCount: 0, pageCount: 0, mediaCount: 0, draftCount: 0 },
      recentPosts: []
    });
  }
});

module.exports = router;
