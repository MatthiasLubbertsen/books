import crypto from 'crypto';
import { cookies } from 'next/headers';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type VerifiedRegistrationResponse,
  type VerifiedAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/server';
import { prisma } from './prisma';
import { createSession } from './auth';

const CHALLENGE_COOKIE = 'webauthn_challenge';
const CHALLENGE_TTL_SEC = 5 * 60;
const RP_NAME = 'books';

function rpID(): string {
  return process.env.RP_ID || 'localhost';
}

function expectedOrigin(): string {
  return process.env.ORIGIN || 'http://localhost:8312';
}

// Single-owner app: every credential belongs to the same fixed "user handle".
function ownerUserId() {
  return new Uint8Array(crypto.createHash('sha256').update('books-app-owner').digest()).slice();
}

async function setChallenge(challenge: string) {
  const jar = await cookies();
  jar.set(CHALLENGE_COOKIE, challenge, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: CHALLENGE_TTL_SEC,
    path: '/',
  });
}

async function takeChallenge(): Promise<string | null> {
  const jar = await cookies();
  const value = jar.get(CHALLENGE_COOKIE)?.value ?? null;
  jar.delete(CHALLENGE_COOKIE);
  return value;
}

function parseTransports(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function hasAnyCredential(): Promise<boolean> {
  const count = await prisma.credential.count();
  return count > 0;
}

export async function listCredentials() {
  return prisma.credential.findMany({
    select: { id: true, name: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
}

export async function removeCredential(id: string) {
  await prisma.credential.delete({ where: { id } });
}

export async function startRegistration(): Promise<PublicKeyCredentialCreationOptionsJSON> {
  const existing = await prisma.credential.findMany({
    select: { credentialId: true, transports: true },
  });
  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: rpID(),
    userName: 'owner',
    userID: ownerUserId(),
    attestationType: 'none',
    excludeCredentials: existing.map((c) => ({
      id: c.credentialId,
      transports: parseTransports(c.transports),
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  });
  await setChallenge(options.challenge);
  return options;
}

export async function finishRegistration(
  response: RegistrationResponseJSON,
  label: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const expectedChallenge = await takeChallenge();
  if (!expectedChallenge) return { ok: false, error: 'registration expired, try again' };

  let verification: VerifiedRegistrationResponse;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: expectedOrigin(),
      expectedRPID: rpID(),
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'verification failed' };
  }

  if (!verification.verified || !verification.registrationInfo) {
    return { ok: false, error: 'could not verify security key' };
  }

  const { credential } = verification.registrationInfo;
  await prisma.credential.create({
    data: {
      credentialId: credential.id,
      publicKey: new Uint8Array(credential.publicKey).slice(),
      counter: credential.counter,
      transports: JSON.stringify(credential.transports ?? []),
      name: label.trim().slice(0, 60) || null,
    },
  });

  return { ok: true };
}

export async function startAuthentication(): Promise<PublicKeyCredentialRequestOptionsJSON> {
  const existing = await prisma.credential.findMany({
    select: { credentialId: true, transports: true },
  });
  const options = await generateAuthenticationOptions({
    rpID: rpID(),
    userVerification: 'preferred',
    allowCredentials: existing.map((c) => ({
      id: c.credentialId,
      transports: parseTransports(c.transports),
    })),
  });
  await setChallenge(options.challenge);
  return options;
}

export async function finishAuthentication(
  response: AuthenticationResponseJSON,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const expectedChallenge = await takeChallenge();
  if (!expectedChallenge) return { ok: false, error: 'login expired, try again' };

  const stored = await prisma.credential.findUnique({ where: { credentialId: response.id } });
  if (!stored) return { ok: false, error: 'unrecognized security key' };

  let verification: VerifiedAuthenticationResponse;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: expectedOrigin(),
      expectedRPID: rpID(),
      credential: {
        id: stored.credentialId,
        publicKey: new Uint8Array(stored.publicKey).slice(),
        counter: stored.counter,
        transports: parseTransports(stored.transports),
      },
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'verification failed' };
  }

  if (!verification.verified) {
    return { ok: false, error: 'could not verify security key' };
  }

  await prisma.credential.update({
    where: { credentialId: stored.credentialId },
    data: { counter: verification.authenticationInfo.newCounter },
  });

  await createSession();
  return { ok: true };
}
