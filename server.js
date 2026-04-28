require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const mongoose = require('mongoose');
const path = require('path');
const themeEngine = require('./middleware/themeEngine');
const flash = require('./middleware/flash');

const app = express();
const PORT = process.env.PORT || 3000;

// ── MongoDB ──────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nodecms')
  .then(() => console.log('✓ MongoDB connected'))
  .catch(err => console.error('✗ MongoDB error:', err));

// ── Middleware ────────────────────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'nodecms-secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/nodecms',
    ttl: 24 * 60 * 60
  }),
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

app.use(flash);
app.use(themeEngine);

// ── Routes ───────────────────────────────────────────────
app.use('/admin/setup', require('./routes/setup'));
app.use('/admin', require('./routes/admin'));
app.use('/admin/posts', require('./routes/posts'));
app.use('/admin/pages', require('./routes/pages'));
app.use('/admin/media', require('./routes/media'));
app.use('/admin/menus', require('./routes/menus'));
app.use('/admin/theme', require('./routes/theme'));
app.use('/admin/settings', require('./routes/settings'));
app.use('/', require('./routes/frontend'));

// ── Error Handling ───────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('themes/default/404', {
    theme: req.theme,
    site: req.site,
    menus: req.menus,
    page: { title: '404 - Not Found' }
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('themes/default/error', {
    theme: req.theme,
    site: req.site || {},
    menus: req.menus || [],
    page: { title: 'Error' },
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

app.listen(PORT, () => {
  console.log(`\n  ╔══════════════════════════════════════╗`);
  console.log(`  ║   NodeCMS running on port ${PORT}        ║`);
  console.log(`  ║   http://localhost:${PORT}              ║`);
  console.log(`  ║   Admin: http://localhost:${PORT}/admin  ║`);
  console.log(`  ╚══════════════════════════════════════╝\n`);
});
