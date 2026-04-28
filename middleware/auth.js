const User = require('../models/User');

async function requireAuth(req, res, next) {
  if (!req.session.user) {
    // Check if setup is needed (no users in DB)
    const userCount = await User.countDocuments();
    if (userCount === 0) return res.redirect('/admin/setup');
    return res.redirect('/admin/login');
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/admin/login');
  }
  if (req.session.user.role !== 'admin') {
    return res.status(403).render('admin/error', {
      message: 'Access denied. Admin privileges required.'
    });
  }
  next();
}

function requireEditor(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/admin/login');
  }
  if (!['admin', 'editor'].includes(req.session.user.role)) {
    return res.status(403).render('admin/error', {
      message: 'Access denied. Editor privileges required.'
    });
  }
  next();
}

module.exports = { requireAuth, requireAdmin, requireEditor };
