const mongoose = require('mongoose');
const slugify = require('slugify');

const postSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  slug:        { type: String, unique: true, index: true },
  content:     { type: String, default: '' },
  excerpt:     { type: String, default: '' },
  featuredImage: { type: String, default: '' },
  status:      { type: String, enum: ['draft', 'published', 'scheduled'], default: 'draft' },
  author:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  categories:  [{ type: String, trim: true }],
  tags:        [{ type: String, trim: true }],
  seo: {
    metaTitle:       { type: String, default: '' },
    metaDescription: { type: String, default: '' },
    ogImage:         { type: String, default: '' }
  },
  codeInjection: {
    headCode: { type: String, default: '' },
    bodyCode: { type: String, default: '' }
  },
  publishedAt: { type: Date },
  commentCount: { type: Number, default: 0 }
}, { timestamps: true });

postSchema.pre('save', function(next) {
  if (this.isModified('title') && !this.slug) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  if (this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  if (!this.excerpt && this.content) {
    const stripped = this.content.replace(/<[^>]*>/g, '');
    this.excerpt = stripped.substring(0, 200) + (stripped.length > 200 ? '...' : '');
  }
  next();
});

postSchema.index({ status: 1, publishedAt: -1 });
postSchema.index({ categories: 1 });
postSchema.index({ tags: 1 });

module.exports = mongoose.model('Post', postSchema);
