const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
  filename:     { type: String, required: true },
  originalName: { type: String, required: true },
  mimeType:     { type: String, required: true },
  size:         { type: Number, required: true },
  path:         { type: String, required: true },
  url:          { type: String, required: true },
  alt:          { type: String, default: '' },
  uploadedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Image optimization fields (populated when Sharp is enabled)
  thumbnails: {
    small:  { type: String, default: '' },
    medium: { type: String, default: '' }
  },
  webpUrl:    { type: String, default: '' },
  optimized:  { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Media', mediaSchema);
