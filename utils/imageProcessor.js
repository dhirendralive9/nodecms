/**
 * Image Processor - Optional image optimization using Sharp
 * 
 * If Sharp is not installed, all methods gracefully return the original file.
 * Enable/disable via Settings: imageOptimization (boolean)
 * 
 * Features:
 *   - Auto-generate thumbnails (small: 300px, medium: 800px)
 *   - WebP conversion alongside original
 *   - Quality compression
 *   - All optional and toggleable from admin
 */

const path = require('path');
const fs = require('fs');

let sharp = null;
try {
  sharp = require('sharp');
  console.log('✓ Sharp available — image optimization enabled');
} catch (e) {
  console.log('• Sharp not installed — image optimization disabled (install with: npm install sharp)');
}

const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads');
const THUMB_SIZES = {
  small:  { width: 300,  suffix: '-sm' },
  medium: { width: 800,  suffix: '-md' }
};

/**
 * Check if Sharp is available and optimization is wanted
 */
function isAvailable() {
  return sharp !== null;
}

/**
 * Process an uploaded image file
 * @param {string} filename - The filename in uploads/
 * @param {object} options - Processing options from settings
 * @returns {object} - { thumbnails: [], webp: string|null, original: string }
 */
async function processImage(filename, options = {}) {
  const result = {
    original: `/uploads/${filename}`,
    thumbnails: {},
    webp: null
  };

  // If Sharp not available or optimization disabled, return as-is
  if (!sharp || !options.enabled) {
    return result;
  }

  const filePath = path.join(UPLOAD_DIR, filename);
  const ext = path.extname(filename).toLowerCase();
  const baseName = path.basename(filename, ext);

  // Only process raster images
  if (!['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) {
    return result;
  }

  try {
    // Generate thumbnails
    if (options.generateThumbnails !== false) {
      for (const [sizeName, config] of Object.entries(THUMB_SIZES)) {
        const thumbFilename = `${baseName}${config.suffix}${ext}`;
        const thumbPath = path.join(UPLOAD_DIR, thumbFilename);

        await sharp(filePath)
          .resize(config.width, null, {
            withoutEnlargement: true,
            fit: 'inside'
          })
          .jpeg({ quality: options.quality || 80 })
          .toFile(thumbPath);

        result.thumbnails[sizeName] = `/uploads/${thumbFilename}`;
      }
    }

    // Generate WebP version
    if (options.generateWebP !== false && ext !== '.webp') {
      const webpFilename = `${baseName}.webp`;
      const webpPath = path.join(UPLOAD_DIR, webpFilename);

      await sharp(filePath)
        .webp({ quality: options.webpQuality || 80 })
        .toFile(webpPath);

      result.webp = `/uploads/${webpFilename}`;
    }

    // Compress original (optional)
    if (options.compressOriginal && ['.jpg', '.jpeg', '.png'].includes(ext)) {
      const tempPath = filePath + '.tmp';
      
      if (ext === '.png') {
        await sharp(filePath).png({ quality: options.quality || 80 }).toFile(tempPath);
      } else {
        await sharp(filePath).jpeg({ quality: options.quality || 80 }).toFile(tempPath);
      }

      // Replace original with compressed version
      fs.renameSync(tempPath, filePath);
    }

  } catch (err) {
    console.error(`Image processing error for ${filename}:`, err.message);
    // Non-fatal — return what we have
  }

  return result;
}

/**
 * Delete all variants of an image (thumbnails + webp)
 * @param {string} filename - Original filename
 */
function deleteVariants(filename) {
  if (!filename) return;

  const ext = path.extname(filename);
  const baseName = path.basename(filename, ext);

  // Delete thumbnails
  for (const config of Object.values(THUMB_SIZES)) {
    const thumbPath = path.join(UPLOAD_DIR, `${baseName}${config.suffix}${ext}`);
    if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
  }

  // Delete WebP
  const webpPath = path.join(UPLOAD_DIR, `${baseName}.webp`);
  if (fs.existsSync(webpPath)) fs.unlinkSync(webpPath);
}

/**
 * Get default optimization settings
 */
function getDefaults() {
  return {
    enabled: false,
    generateThumbnails: true,
    generateWebP: true,
    compressOriginal: false,
    quality: 80,
    webpQuality: 80
  };
}

module.exports = { isAvailable, processImage, deleteVariants, getDefaults };
