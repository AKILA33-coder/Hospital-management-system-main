const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  const auth = req.headers['authorization'];
  if (!auth?.startsWith('Bearer '))
    return res.status(401).json({ success: false, message: 'No token' });
  try {
    req.user = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

const role = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role))
    return res.status(403).json({ success: false, message: 'Access denied' });
  next();
};

module.exports = { protect, role };
