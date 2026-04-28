const router = require('express').Router();
const Menu = require('../models/Menu');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', async (req, res) => {
  const menus = await Menu.find().sort({ location: 1 });
  res.render('admin/menus/index', { menus });
});

router.post('/', async (req, res) => {
  try {
    const { name, location, items } = req.body;
    const parsedItems = JSON.parse(items || '[]');
    
    await Menu.findOneAndUpdate(
      { location },
      { name, location, items: parsedItems },
      { upsert: true, new: true }
    );
    
    req.flash('success', 'Menu saved');
    res.redirect('/admin/menus');
  } catch (err) {
    req.flash('error', 'Failed to save menu: ' + err.message);
    res.redirect('/admin/menus');
  }
});

router.post('/:id/delete', requireAdmin, async (req, res) => {
  await Menu.findByIdAndDelete(req.params.id);
  req.flash('success', 'Menu deleted');
  res.redirect('/admin/menus');
});

module.exports = router;
