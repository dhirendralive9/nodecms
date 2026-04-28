function requireAuth(req, res, next) {
  if (!req.session.user) {
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
