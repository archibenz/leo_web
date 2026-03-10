import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {randomBytes} from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me';

type JwtPayload = {
  userId: string;
  email: string;
};

export function signJwt(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, {expiresIn: '30d'});
}

export function verifyJwt(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateVerificationToken(): string {
  return randomBytes(32).toString('hex');
}
