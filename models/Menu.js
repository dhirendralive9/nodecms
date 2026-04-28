const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  label:    { type: String, required: true },
  url:      { type: String, required: true },
  target:   { type: String, enum: ['_self', '_blank'], default: '_self' },
  order:    { type: Number, default: 0 },
  parent:   { type: mongoose.Schema.Types.ObjectId, default: null },
  icon:     { type: String, default: '' },
  cssClass: { type: String, default: '' },
  children: [{
    label:    { type: String, required: true },
    url:      { type: String, required: true },
    target:   { type: String, enum: ['_self', '_blank'], default: '_self' },
    icon:     { type: String, default: '' },
    cssClass: { type: String, default: '' },
    order:    { type: Number, default: 0 }
  }]
});

const menuSchema = new mongoose.Schema({
  name:     { type: String, required: true, unique: true },
  location: { type: String, enum: ['primary', 'footer', 'sidebar'], default: 'primary' },
  items:    [menuItemSchema]
}, { timestamps: true });

module.exports = mongoose.model('Menu', menuSchema);
