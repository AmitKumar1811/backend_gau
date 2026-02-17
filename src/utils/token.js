import jwt from 'jsonwebtoken';
import Token from '../models/Token.js';

export const generateAccessToken = (userId, role) => {
  return jwt.sign({ sub: userId, role }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES || '15m'
  });
};

export const generateRefreshToken = async (userId) => {
  const token = jwt.sign({ sub: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d'
  });

  const decoded = jwt.decode(token);
  const expiresAt = new Date(decoded.exp * 1000);

  await Token.create({ userId, token, type: 'refresh', expiresAt });
  return token;
};

export const verifyRefreshToken = async (token) => {
  const stored = await Token.findOne({ token, type: 'refresh' });
  if (!stored) throw new Error('Invalid refresh token');
  jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  return stored.userId;
};

export const revokeUserTokens = async (userId) => {
  await Token.deleteMany({ userId, type: 'refresh' });
};
