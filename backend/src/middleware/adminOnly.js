const adminOnly = (req, res, next) => {
  // authenticate middleware must run first — it sets req.user
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin only.' });
  }
  next();
};

module.exports = { adminOnly };