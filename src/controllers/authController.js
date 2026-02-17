import passport from 'passport';
import { v4 as uuidv4 } from 'uuid';
import User from '../models/User.js';
import Token from '../models/Token.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, revokeUserTokens } from '../utils/token.js';
import { registerSchema, loginSchema, passwordChangeSchema } from '../validators/authValidators.js';

export const register = async (req, res, next) => {
  try {
    const { value, error } = registerSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    const existing = await User.findOne({ email: value.email });
    if (existing) return res.status(409).json({ message: 'Email already registered' });

    const hashed = await hashPassword(value.password);
    const user = await User.create({ ...value, password: hashed, role: 'user' });

    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = await generateRefreshToken(user._id);

    res.status(201).json({ user: sanitizeUser(user), accessToken, refreshToken });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { value, error } = loginSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });

    const user = await User.findOne({ email: value.email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    if (user.isBlocked) return res.status(403).json({ message: 'Account blocked' });

    const isMatch = await comparePassword(value.password, user.password || '');
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = await generateRefreshToken(user._id);

    res.json({ user: sanitizeUser(user), accessToken, refreshToken });
  } catch (err) {
    next(err);
  }
};

export const googleAuth = passport.authenticate('google', { scope: ['profile', 'email'] });

export const googleCallback = (req, res, next) =>
  passport.authenticate('google', { session: false }, async (err, user) => {
    if (err || !user) return res.status(401).json({ message: 'Google authentication failed' });
    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = await generateRefreshToken(user._id);
    res.json({ user: sanitizeUser(user), accessToken, refreshToken });
  })(req, res, next);

export const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: 'Refresh token required' });
    const userId = await verifyRefreshToken(refreshToken);
    const user = await User.findById(userId);
    if (!user) return res.status(401).json({ message: 'Invalid token' });

    const accessToken = generateAccessToken(user._id, user.role);
    res.json({ accessToken });
  } catch (err) {
    err.status = 401;
    next(err);
  }
};

export const logout = async (req, res, next) => {
  try {
    await revokeUserTokens(req.user.id);
    res.json({ message: 'Logged out' });
  } catch (err) {
    next(err);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const resetToken = uuidv4();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await Token.create({ userId: user._id, token: resetToken, type: 'reset', expiresAt });

    // In production, send resetToken via email. Returning for demo/testing only.
    res.json({ message: 'Reset token generated', resetToken });
  } catch (err) {
    next(err);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    const { value, error } = passwordChangeSchema.validate({ password });
    if (error) return res.status(400).json({ message: error.message });

    const record = await Token.findOne({ token, type: 'reset' });
    if (!record || record.expiresAt < new Date()) return res.status(400).json({ message: 'Invalid or expired token' });

    const user = await User.findById(record.userId);
    user.password = await hashPassword(value.password);
    await user.save();
    await Token.deleteMany({ userId: user._id, type: 'reset' });

    res.json({ message: 'Password updated' });
  } catch (err) {
    next(err);
  }
};

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  isBlocked: user.isBlocked
});
