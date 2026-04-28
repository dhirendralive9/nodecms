const router = require('express').Router();
const Post = require('../models/Post');
const { requireAuth } = require('../middleware/auth');
const slugify = require('slugify');

router.use(requireAuth);

// ── List ─────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { status, search, page = 1 } = req.query;
  const perPage = 20;
  const filter = {};

  if (status) filter.status = status;
  if (search) filter.title = { $regex: search, $options: 'i' };

  const [posts, total] = await Promise.all([
    Post.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .populate('author', 'displayName username'),
    Post.countDocuments(filter)
  ]);

  res.render('admin/posts/index', {
    posts, total,
    page: parseInt(page),
    totalPages: Math.ceil(total / perPage),
    status: status || '',
    search: search || ''
  });
});

// ── Create ───────────────────────────────────────────────
router.get('/new', (req, res) => {
  res.render('admin/posts/edit', { post: null, action: 'new' });
});

router.post('/', async (req, res) => {
  try {
    const { title, content, excerpt, status, categories, tags, featuredImage, metaTitle, metaDescription, headCode, bodyCode } = req.body;

    const post = new Post({
      title,
      slug: slugify(title, { lower: true, strict: true }),
      content,
      excerpt,
      status: status || 'draft',
      featuredImage,
      categories: categories ? categories.split(',').map(c => c.trim()).filter(Boolean) : [],
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      seo: { metaTitle, metaDescription },
      codeInjection: { headCode: headCode || '', bodyCode: bodyCode || '' },
      author: req.session.user._id
    });

    await post.save();
    req.flash('success', 'Post created successfully');
    res.redirect('/admin/posts');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Failed to create post: ' + err.message);
    res.redirect('/admin/posts/new');
  }
});

// ── Edit ─────────────────────────────────────────────────
router.get('/:id/edit', async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.redirect('/admin/posts');
  res.render('admin/posts/edit', { post, action: 'edit' });
});

router.post('/:id', async (req, res) => {
  try {
    const { title, slug, content, excerpt, status, categories, tags, featuredImage, metaTitle, metaDescription, headCode, bodyCode } = req.body;

    await Post.findByIdAndUpdate(req.params.id, {
      title,
      slug: slug || slugify(title, { lower: true, strict: true }),
      content,
      excerpt,
      status,
      featuredImage,
      categories: categories ? categories.split(',').map(c => c.trim()).filter(Boolean) : [],
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      seo: { metaTitle, metaDescription },
      codeInjection: { headCode: headCode || '', bodyCode: bodyCode || '' },
      ...(status === 'published' ? { publishedAt: new Date() } : {})
    });

    req.flash('success', 'Post updated successfully');
    res.redirect('/admin/posts');
  } catch (err) {
    req.flash('error', 'Failed to update post');
    res.redirect(`/admin/posts/${req.params.id}/edit`);
  }
});

// ── Delete ───────────────────────────────────────────────
router.post('/:id/delete', async (req, res) => {
  await Post.findByIdAndDelete(req.params.id);
  req.flash('success', 'Post deleted');
  res.redirect('/admin/posts');
});

module.exports = router;
