const router = require('express').Router();
const fs = require('fs');
const path = require('path');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const Settings = require('../models/Settings');
const { invalidateThemeCache } = require('../middleware/themeEngine');

router.use(requireAuth, requireAdmin);

router.get('/', async (req, res) => {
  const themeName = await Settings.get('activeTheme', 'default');
  const themePath = path.join(__dirname, '..', 'public', 'themes', themeName, 'theme.json');
  let themeConfig = {};

  try {
    themeConfig = JSON.parse(fs.readFileSync(themePath, 'utf8'));
  } catch (err) {
    req.flash('error', 'Could not load theme config');
  }

  // List available themes
  const themesDir = path.join(__dirname, '..', 'public', 'themes');
  const themes = fs.readdirSync(themesDir).filter(f => {
    return fs.statSync(path.join(themesDir, f)).isDirectory() &&
           fs.existsSync(path.join(themesDir, f, 'theme.json'));
  });

  res.render('admin/theme/index', {
    themeConfig,
    themeJson: JSON.stringify(themeConfig, null, 2),
    activeTheme: themeName,
    themes
  });
});

// Save theme.json
router.post('/save', async (req, res) => {
  try {
    const { themeJson } = req.body;
    const parsed = JSON.parse(themeJson); // validate JSON

    const themeName = await Settings.get('activeTheme', 'default');
    const themePath = path.join(__dirname, '..', 'public', 'themes', themeName, 'theme.json');

    fs.writeFileSync(themePath, JSON.stringify(parsed, null, 2));
    invalidateThemeCache();

    req.flash('success', 'Theme updated successfully');
    res.redirect('/admin/theme');
  } catch (err) {
    req.flash('error', 'Invalid JSON: ' + err.message);
    res.redirect('/admin/theme');
  }
});

// Update individual sections via visual editor
router.post('/update-section', async (req, res) => {
  try {
    const { section, data } = req.body;
    const themeName = await Settings.get('activeTheme', 'default');
    const themePath = path.join(__dirname, '..', 'public', 'themes', themeName, 'theme.json');

    const config = JSON.parse(fs.readFileSync(themePath, 'utf8'));
    config[section] = JSON.parse(data);
    fs.writeFileSync(themePath, JSON.stringify(config, null, 2));
    invalidateThemeCache();

    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Switch active theme
router.post('/activate', async (req, res) => {
  const { theme } = req.body;
  await Settings.set('activeTheme', theme);
  invalidateThemeCache();
  req.flash('success', `Theme "${theme}" activated`);
  res.redirect('/admin/theme');
});

module.exports = router;
