import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await User.findById(decoded.sub);
    if (!user) {
      console.error('Auth Error: User not found for ID', decoded.sub);
      return res.status(401).json({ message: 'Unauthorized: User not found' });
    }
    if (user.isBlocked) {
      console.error('Auth Error: User is blocked', user._id);
      return res.status(401).json({ message: 'Unauthorized: Account blocked' });
    }

    req.user = { id: user._id, role: user.role };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      console.error('Auth Error: Token expired at', err.expiredAt);
      return res.status(401).json({ message: 'Token expired' });
    }
    console.error('Auth Error:', err.message);
    return res.status(401).json({ message: 'Invalid token' });
  }
};

export const authorizeRoles = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
};
