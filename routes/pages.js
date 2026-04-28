const router = require('express').Router();
const Page = require('../models/Page');
const { requireAuth } = require('../middleware/auth');
const slugify = require('slugify');

router.use(requireAuth);

router.get('/', async (req, res) => {
  const pages = await Page.find().sort({ order: 1, createdAt: -1 }).populate('author', 'displayName username');
  res.render('admin/pages/index', { pages });
});

router.get('/new', (req, res) => {
  res.render('admin/pages/edit', { page: null, action: 'new' });
});

router.post('/', async (req, res) => {
  try {
    const { title, content, status, template, metaTitle, metaDescription, featuredImage, headCode, bodyCode } = req.body;
    const page = new Page({
      title,
      slug: slugify(title, { lower: true, strict: true }),
      content, status, template, featuredImage,
      seo: { metaTitle, metaDescription },
      codeInjection: { headCode: headCode || '', bodyCode: bodyCode || '' },
      author: req.session.user._id
    });
    await page.save();
    req.flash('success', 'Page created');
    res.redirect('/admin/pages');
  } catch (err) {
    req.flash('error', 'Failed to create page: ' + err.message);
    res.redirect('/admin/pages/new');
  }
});

router.get('/:id/edit', async (req, res) => {
  const page = await Page.findById(req.params.id);
  if (!page) return res.redirect('/admin/pages');
  res.render('admin/pages/edit', { page, action: 'edit' });
});

router.post('/:id', async (req, res) => {
  try {
    const { title, slug, content, status, template, metaTitle, metaDescription, featuredImage, headCode, bodyCode } = req.body;
    await Page.findByIdAndUpdate(req.params.id, {
      title, content, status, template, featuredImage,
      slug: slug || slugify(title, { lower: true, strict: true }),
      seo: { metaTitle, metaDescription },
      codeInjection: { headCode: headCode || '', bodyCode: bodyCode || '' }
    });
    req.flash('success', 'Page updated');
    res.redirect('/admin/pages');
  } catch (err) {
    req.flash('error', 'Failed to update page');
    res.redirect(`/admin/pages/${req.params.id}/edit`);
  }
});

router.post('/:id/delete', async (req, res) => {
  await Page.findByIdAndDelete(req.params.id);
  req.flash('success', 'Page deleted');
  res.redirect('/admin/pages');
});

module.exports = router;
