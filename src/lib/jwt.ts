import jwt from 'jsonwebtoken';
import { env } from '../env.js';
import type { Role } from '../generated/prisma/client.js';

export interface TokenPayload {
  userId: string;
  role: Role;
}

const EXPIRES_IN = '7d';

export const signToken = (payload: TokenPayload): string =>
  jwt.sign(payload, env.JWT_SECRET, { expiresIn: EXPIRES_IN });

export const verifyToken = (token: string): TokenPayload => {
  const decoded = jwt.verify(token, env.JWT_SECRET);
  if (typeof decoded === 'string' || !decoded || typeof decoded !== 'object') {
    throw new Error('Invalid token payload');
  }
  const { userId, role } = decoded as Record<string, unknown>;
  if (typeof userId !== 'string' || (role !== 'USER' && role !== 'ADMIN')) {
    throw new Error('Invalid token payload');
  }
  return { userId, role };
};
