const mongoose = require('mongoose');
const slugify = require('slugify');

const pageSchema = new mongoose.Schema({
  title:    { type: String, required: true, trim: true },
  slug:     { type: String, unique: true, index: true },
  content:  { type: String, default: '' },
  template: { type: String, default: 'default' },
  status:   { type: String, enum: ['draft', 'published'], default: 'draft' },
  order:    { type: Number, default: 0 },
  parent:   { type: mongoose.Schema.Types.ObjectId, ref: 'Page', default: null },
  author:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  seo: {
    metaTitle:       { type: String, default: '' },
    metaDescription: { type: String, default: '' }
  },
  codeInjection: {
    headCode: { type: String, default: '' },
    bodyCode: { type: String, default: '' }
  },
  featuredImage: { type: String, default: '' }
}, { timestamps: true });

pageSchema.pre('save', function(next) {
  if (this.isModified('title') && !this.slug) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  next();
});

module.exports = mongoose.model('Page', pageSchema);
