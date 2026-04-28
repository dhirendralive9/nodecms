const router = require('express').Router();
const Post = require('../models/Post');
const Page = require('../models/Page');
const Settings = require('../models/Settings');

// ── Homepage ─────────────────────────────────────────────
router.get('/', async (req, res) => {
  const perPage = req.theme.components?.postsPerPage || 10;
  const page = parseInt(req.query.page) || 1;

  const [posts, total] = await Promise.all([
    Post.find({ status: 'published' })
      .sort({ publishedAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .populate('author', 'displayName username avatar'),
    Post.countDocuments({ status: 'published' })
  ]);

  // Sidebar data
  const sidebar = await getSidebarData();

  res.render('themes/default/home', {
    posts, sidebar,
    pagination: {
      current: page,
      total: Math.ceil(total / perPage),
      hasNext: page * perPage < total,
      hasPrev: page > 1
    }
  });
});

// ── Search ───────────────────────────────────────────────
router.get('/search', async (req, res) => {
  const { q } = req.query;
  let posts = [];
  if (q) {
    posts = await Post.find({
      status: 'published',
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { content: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } }
      ]
    }).sort({ publishedAt: -1 }).limit(20).populate('author', 'displayName username avatar');
  }
  const sidebar = await getSidebarData();
  res.render('themes/default/search', { posts, query: q || '', sidebar });
});

// ── Category ─────────────────────────────────────────────
router.get('/category/:category', async (req, res) => {
  const posts = await Post.find({
    status: 'published',
    categories: req.params.category
  }).sort({ publishedAt: -1 }).populate('author', 'displayName username avatar');

  const sidebar = await getSidebarData();
  res.render('themes/default/archive', {
    posts,
    archiveTitle: `Category: ${req.params.category}`,
    sidebar
  });
});

// ── Tag ──────────────────────────────────────────────────
router.get('/tag/:tag', async (req, res) => {
  const posts = await Post.find({
    status: 'published',
    tags: req.params.tag
  }).sort({ publishedAt: -1 }).populate('author', 'displayName username avatar');

  const sidebar = await getSidebarData();
  res.render('themes/default/archive', {
    posts,
    archiveTitle: `Tag: ${req.params.tag}`,
    sidebar
  });
});

// ── Single Post ──────────────────────────────────────────
router.get('/post/:slug', async (req, res) => {
  const post = await Post.findOne({ slug: req.params.slug, status: 'published' })
    .populate('author', 'displayName username avatar bio');

  if (!post) return res.status(404).render('themes/default/404', {
    theme: req.theme, site: req.site, menus: req.menus, page: { title: '404' }
  });

  // Related posts
  let relatedPosts = [];
  if (req.theme.components?.showRelatedPosts && post.categories.length) {
    relatedPosts = await Post.find({
      status: 'published',
      _id: { $ne: post._id },
      categories: { $in: post.categories }
    }).sort({ publishedAt: -1 }).limit(3);
  }

  const sidebar = await getSidebarData();
  res.render('themes/default/single', { post, relatedPosts, sidebar });
});

// ── Static Page (catch-all, must be last) ────────────────
router.get('/:slug', async (req, res, next) => {
  const page = await Page.findOne({ slug: req.params.slug, status: 'published' })
    .populate('author', 'displayName username');

  if (!page) return next(); // fall through to 404

  const sidebar = await getSidebarData();
  res.render('themes/default/page', { page, sidebar });
});

// ── Sidebar Helper ───────────────────────────────────────
async function getSidebarData() {
  const [recentPosts, categories, tags] = await Promise.all([
    Post.find({ status: 'published' }).sort({ publishedAt: -1 }).limit(5).select('title slug publishedAt'),
    Post.distinct('categories', { status: 'published' }),
    Post.distinct('tags', { status: 'published' })
  ]);
  return { recentPosts, categories, tags };
}

module.exports = router;
