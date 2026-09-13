import crypto from 'crypto';
import { cookies } from 'next/headers';
import { prisma } from './prisma';

const COOKIE_NAME = 'books_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function getSession(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const session = await prisma.session.findUnique({ where: { token } });
  if (!session) return false;
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { token } }).catch(() => {});
    return false;
  }
  return true;
}

export async function createSession(): Promise<void> {
  const token = crypto.randomBytes(32).toString('hex');
  await prisma.session.create({
    data: { token, expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
  });

  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: SESSION_TTL_MS / 1000,
    path: '/',
  });
}

export async function logout() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (token) {
    await prisma.session.delete({ where: { token } }).catch(() => {});
  }
  jar.delete(COOKIE_NAME);
}

export async function requireAuth() {
  const authenticated = await getSession();
  if (!authenticated) {
    throw new Error('not authenticated');
  }
}
