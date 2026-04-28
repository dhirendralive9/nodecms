const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  key:   { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true }
});

// Static helper to get a setting
settingsSchema.statics.get = async function(key, defaultVal = null) {
  const doc = await this.findOne({ key });
  return doc ? doc.value : defaultVal;
};

// Static helper to set a setting
settingsSchema.statics.set = async function(key, value) {
  return this.findOneAndUpdate({ key }, { key, value }, { upsert: true, new: true });
};

// Get all settings as an object
settingsSchema.statics.getAll = async function() {
  const docs = await this.find();
  const obj = {};
  docs.forEach(d => { obj[d.key] = d.value; });
  return obj;
};

module.exports = mongoose.model('Settings', settingsSchema);
