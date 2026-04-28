const router = require('express').Router();
const Media = require('../models/Media');
const Settings = require('../models/Settings');
const upload = require('../middleware/upload');
const { requireAuth } = require('../middleware/auth');
const imageProcessor = require('../utils/imageProcessor');
const fs = require('fs');
const path = require('path');

router.use(requireAuth);

router.get('/', async (req, res) => {
  const media = await Media.find().sort({ createdAt: -1 }).populate('uploadedBy', 'displayName username');
  const imgSettings = await Settings.get('imageOptimization', imageProcessor.getDefaults());
  res.render('admin/media/index', { media, imgSettings, sharpAvailable: imageProcessor.isAvailable() });
});

router.post('/upload', upload.array('files', 20), async (req, res) => {
  try {
    // Get image optimization settings
    const imgSettings = await Settings.get('imageOptimization', imageProcessor.getDefaults());

    const mediaItems = [];

    for (const file of req.files) {
      const item = {
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: `/uploads/${file.filename}`,
        url: `/uploads/${file.filename}`,
        uploadedBy: req.session.user._id,
        thumbnails: { small: '', medium: '' },
        webpUrl: '',
        optimized: false
      };

      // Process image if it's an image and optimization is enabled
      if (file.mimetype.startsWith('image/') && imgSettings.enabled && imageProcessor.isAvailable()) {
        const result = await imageProcessor.processImage(file.filename, imgSettings);
        item.thumbnails = {
          small:  result.thumbnails.small || '',
          medium: result.thumbnails.medium || ''
        };
        item.webpUrl = result.webp || '';
        item.optimized = true;
      }

      mediaItems.push(item);
    }

    await Media.insertMany(mediaItems);
    req.flash('success', `${req.files.length} file(s) uploaded${mediaItems.some(m => m.optimized) ? ' & optimized' : ''}`);

    if (req.xhr || req.headers.accept?.includes('json')) {
      return res.json({ success: true, files: mediaItems });
    }
    res.redirect('/admin/media');
  } catch (err) {
    req.flash('error', 'Upload failed: ' + err.message);
    res.redirect('/admin/media');
  }
});

router.post('/:id/delete', async (req, res) => {
  try {
    const media = await Media.findById(req.params.id);
    if (media) {
      // Delete original file
      const filePath = path.join(__dirname, '..', 'public', media.path);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

      // Delete variants (thumbnails + webp)
      imageProcessor.deleteVariants(media.filename);

      await Media.findByIdAndDelete(req.params.id);
    }
    req.flash('success', 'File deleted');
    res.redirect('/admin/media');
  } catch (err) {
    req.flash('error', 'Delete failed');
    res.redirect('/admin/media');
  }
});

// API endpoint for media picker in editor
router.get('/api/list', async (req, res) => {
  const media = await Media.find({ mimeType: /^image/ }).sort({ createdAt: -1 }).limit(50);
  res.json(media);
});

module.exports = router;
