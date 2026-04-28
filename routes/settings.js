const router = require('express').Router();
const Settings = require('../models/Settings');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const imageProcessor = require('../utils/imageProcessor');

router.use(requireAuth, requireAdmin);

router.get('/', async (req, res) => {
  const settings = await Settings.getAll();
  const imgDefaults = imageProcessor.getDefaults();
  const imgSettings = settings.imageOptimization || imgDefaults;

  res.render('admin/settings/index', {
    settings,
    imgSettings,
    sharpAvailable: imageProcessor.isAvailable()
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

module.exports = router;
