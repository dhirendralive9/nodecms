const fs = require('fs');
const path = require('path');
const Settings = require('../models/Settings');
const Menu = require('../models/Menu');

// Cache theme config, refresh every 5s in dev
let themeCache = null;
let themeCacheTime = 0;
const CACHE_TTL = process.env.NODE_ENV === 'production' ? 60000 : 5000;

function loadTheme(themeName = 'default') {
  const now = Date.now();
  if (themeCache && (now - themeCacheTime) < CACHE_TTL) {
    return themeCache;
  }

  const themePath = path.join(__dirname, '..', 'public', 'themes', themeName, 'theme.json');
  try {
    const raw = fs.readFileSync(themePath, 'utf8');
    themeCache = JSON.parse(raw);
    themeCacheTime = now;
    return themeCache;
  } catch (err) {
    console.error(`Failed to load theme "${themeName}":`, err.message);
    // Return minimal defaults
    return {
      name: 'Default',
      version: '1.0.0',
      colors: { primary: '#2563eb', secondary: '#64748b', accent: '#f59e0b', background: '#ffffff', surface: '#f8fafc', text: '#0f172a', textMuted: '#64748b' },
      typography: { headingFont: 'Georgia, serif', bodyFont: 'system-ui, sans-serif', baseSize: '16px', lineHeight: '1.6' },
      layout: { maxWidth: '1200px', sidebarPosition: 'right', sidebarWidth: '320px', headerStyle: 'standard' },
      components: { showAuthor: true, showDate: true, showCategories: true, showTags: true, showRelatedPosts: true, showComments: false, postsPerPage: 10 },
      widgets: { sidebar: [], footer: [] },
      custom: {}
    };
  }
}

// Invalidate cache (called when theme is updated via admin)
function invalidateThemeCache() {
  themeCache = null;
  themeCacheTime = 0;
}

async function themeEngine(req, res, next) {
  try {
    const themeName = await Settings.get('activeTheme', 'default');
    const theme = loadTheme(themeName);

    // Load site settings
    const site = {
      title: await Settings.get('siteTitle', 'NodeCMS'),
      tagline: await Settings.get('siteTagline', 'A lightweight CMS'),
      logo: await Settings.get('siteLogo', ''),
      favicon: await Settings.get('siteFavicon', ''),
      url: process.env.SITE_URL || 'http://localhost:3000',
      footer: await Settings.get('footerText', '© ' + new Date().getFullYear() + ' NodeCMS'),
      globalHeadCode: await Settings.get('globalHeadCode', ''),
      globalBodyCode: await Settings.get('globalBodyCode', '')
    };

    // Load menus
    const menus = await Menu.find().lean();
    const menuMap = {};
    menus.forEach(m => {
      menuMap[m.location] = m.items.sort((a, b) => a.order - b.order);
    });

    // Inject into request and response locals
    req.theme = theme;
    req.site = site;
    req.menus = menuMap;

    res.locals.theme = theme;
    res.locals.site = site;
    res.locals.menus = menuMap;
    res.locals.currentPath = req.path;
    res.locals.user = req.session.user || null;

    next();
  } catch (err) {
    console.error('Theme engine error:', err);
    next(err);
  }
}

module.exports = themeEngine;
module.exports.invalidateThemeCache = invalidateThemeCache;
module.exports.loadTheme = loadTheme;
