const router = require('express').Router();
const User = require('../models/User');
const Post = require('../models/Post');
const Page = require('../models/Page');
const Media = require('../models/Media');
const { requireAuth } = require('../middleware/auth');

// ── Login ────────────────────────────────────────────────
router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/admin');
  res.render('admin/login', { error: null });
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({
      $or: [{ username }, { email: username }]
    });

    if (!user || !(await user.comparePassword(password))) {
      return res.render('admin/login', { error: 'Invalid credentials' });
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
    res.render('admin/login', { error: 'Login failed' });
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
