import crypto from 'crypto';
import { cookies, headers } from 'next/headers';
import { prisma } from './prisma';

const COOKIE_NAME = 'books_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAX_ATTEMPTS = 10;
const ATTEMPT_WINDOW_MS = 5 * 60 * 1000;

const PIN = process.env.PIN;

export function assertPinConfigured() {
  if (!PIN || !/^\d{6}$/.test(PIN)) {
    throw new Error('PIN must be set to exactly 6 digits (env var PIN).');
  }
}

function pinMatches(candidate: string): boolean {
  if (!PIN || candidate.length !== PIN.length) return false;
  return crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(PIN));
}

// Naive in-memory rate limiting: a 6-digit PIN only has 1e6 possibilities.
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

async function clientKey(): Promise<string> {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
}

async function isRateLimited(): Promise<boolean> {
  const key = await clientKey();
  const entry = loginAttempts.get(key);
  if (!entry || entry.resetAt < Date.now()) return false;
  return entry.count >= MAX_ATTEMPTS;
}

async function recordFailedAttempt() {
  const key = await clientKey();
  const entry = loginAttempts.get(key);
  if (!entry || entry.resetAt < Date.now()) {
    loginAttempts.set(key, { count: 1, resetAt: Date.now() + ATTEMPT_WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

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

export type LoginResult = { ok: true } | { ok: false; error: string };

export async function login(pin: string): Promise<LoginResult> {
  assertPinConfigured();
  if (await isRateLimited()) {
    return { ok: false, error: 'too many attempts, try again in a few minutes' };
  }
  if (!/^\d{6}$/.test(pin) || !pinMatches(pin)) {
    await recordFailedAttempt();
    return { ok: false, error: 'wrong pin' };
  }

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

  return { ok: true };
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
