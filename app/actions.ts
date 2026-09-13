'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { createSession, getSession, logout as doLogout, requireAuth } from '@/lib/auth';
import {
  hasAnyCredential,
  listCredentials,
  removeCredential,
  startRegistration,
  finishRegistration,
  startAuthentication,
  finishAuthentication,
} from '@/lib/webauthn';
import { isLocation, type Book, type BookMove } from '@/lib/types';
import type { RegistrationResponseJSON, AuthenticationResponseJSON } from '@simplewebauthn/server';

type BookRow = {
  id: string;
  title: string;
  subject: string | null;
  location: string;
  isbn: string | null;
  coverUrl: string | null;
  hidden: boolean;
  createdAt: Date;
  _count: { moves: number };
};

function toBook(row: BookRow): Book {
  return {
    id: row.id,
    title: row.title,
    subject: row.subject,
    location: isLocation(row.location) ? row.location : 'home',
    isbn: row.isbn,
    coverUrl: row.coverUrl,
    hidden: row.hidden,
    createdAt: row.createdAt.toISOString(),
    moveCount: row._count.moves,
  };
}

const withMoveCount = { _count: { select: { moves: true } } } as const;

// --- auth (WebAuthn / security keys) ---

async function canRegister(): Promise<boolean> {
  if (!(await hasAnyCredential())) return true; // bootstrap: first key needs no auth
  return getSession();
}

export async function getRegistrationOptionsAction() {
  if (!(await canRegister())) throw new Error('not authenticated');
  return startRegistration();
}

export async function verifyRegistrationAction(response: RegistrationResponseJSON, label: string) {
  const wasBootstrap = !(await hasAnyCredential());
  if (!(await canRegister())) return { ok: false as const, error: 'not authenticated' };
  const result = await finishRegistration(response, label);
  if (result.ok && wasBootstrap) {
    // Registering the very first key doubles as logging in with it.
    await createSession();
  }
  revalidatePath('/');
  return result;
}

export async function getAuthenticationOptionsAction() {
  if (!(await hasAnyCredential())) {
    throw new Error('no security key registered yet');
  }
  return startAuthentication();
}

export async function verifyAuthenticationAction(response: AuthenticationResponseJSON) {
  const result = await finishAuthentication(response);
  revalidatePath('/');
  return result;
}

export async function logoutAction() {
  await doLogout();
  revalidatePath('/');
}

export async function listCredentialsAction() {
  await requireAuth();
  return listCredentials();
}

export async function removeCredentialAction(id: string) {
  await requireAuth();
  await removeCredential(id);
  revalidatePath('/');
}

// --- books ---

export async function addBookAction(input: {
  title: string;
  subject: string;
  location: string;
  isbn?: string | null;
  coverUrl?: string | null;
}): Promise<Book> {
  await requireAuth();

  const title = input.title.trim().slice(0, 200);
  const subject = input.subject.trim().slice(0, 200);
  if (!title) throw new Error('title is required');
  if (!isLocation(input.location)) throw new Error('invalid location');

  const book = await prisma.book.create({
    data: {
      title,
      subject: subject || null,
      location: input.location,
      isbn: input.isbn?.trim() || null,
      coverUrl: input.coverUrl || null,
    },
    include: withMoveCount,
  });
  revalidatePath('/');
  return toBook(book);
}

async function recordMove(bookId: string, from: string, to: string) {
  if (from === to) return;
  await prisma.bookMove.create({ data: { bookId, fromLocation: from, toLocation: to } });
}

export async function moveBookAction(id: string, location: string): Promise<Book> {
  await requireAuth();
  if (!isLocation(location)) throw new Error('invalid location');

  const existing = await prisma.book.findUniqueOrThrow({ where: { id } });
  const [, book] = await prisma.$transaction([
    prisma.bookMove.createMany({
      data:
        existing.location === location
          ? []
          : [{ bookId: id, fromLocation: existing.location, toLocation: location }],
    }),
    prisma.book.update({ where: { id }, data: { location }, include: withMoveCount }),
  ]);
  revalidatePath('/');
  return toBook(book);
}

export async function updateBookAction(
  id: string,
  input: {
    title: string;
    subject: string;
    location: string;
    isbn?: string | null;
    coverUrl?: string | null;
    hidden?: boolean;
  },
): Promise<Book> {
  await requireAuth();

  const title = input.title.trim().slice(0, 200);
  const subject = input.subject.trim().slice(0, 200);
  if (!title) throw new Error('title is required');
  if (!isLocation(input.location)) throw new Error('invalid location');

  const existing = await prisma.book.findUniqueOrThrow({ where: { id } });
  await recordMove(id, existing.location, input.location);

  const book = await prisma.book.update({
    where: { id },
    data: {
      title,
      subject: subject || null,
      location: input.location,
      isbn: input.isbn?.trim() || null,
      coverUrl: input.coverUrl !== undefined ? input.coverUrl : existing.coverUrl,
      hidden: input.hidden ?? existing.hidden,
    },
    include: withMoveCount,
  });
  revalidatePath('/');
  return toBook(book);
}

export async function setBookHiddenAction(id: string, hidden: boolean): Promise<Book> {
  await requireAuth();
  const book = await prisma.book.update({ where: { id }, data: { hidden }, include: withMoveCount });
  revalidatePath('/');
  return toBook(book);
}

export async function deleteBookAction(id: string): Promise<void> {
  await requireAuth();
  await prisma.book.delete({ where: { id } });
  revalidatePath('/');
}

export async function getBookHistoryAction(id: string): Promise<BookMove[]> {
  await requireAuth();
  const moves = await prisma.bookMove.findMany({
    where: { bookId: id },
    orderBy: { movedAt: 'desc' },
    take: 20,
  });
  return moves.map((m) => ({
    id: m.id,
    fromLocation: isLocation(m.fromLocation) ? m.fromLocation : 'home',
    toLocation: isLocation(m.toLocation) ? m.toLocation : 'home',
    movedAt: m.movedAt.toISOString(),
  }));
}

// --- ISBN lookup ---
//
// Tried in order; first source that returns a title wins. Each is wrapped so
// one source being down, rate-limited, or wrong never breaks the others.

type IsbnResult = { title: string; coverUrl: string | null; source: string };

async function lookupOpenLibrary(isbn: string): Promise<IsbnResult | null> {
  try {
    const res = await fetch(`https://openlibrary.org/isbn/${isbn}.json`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const title = typeof data.title === 'string' ? data.title : null;
    if (!title) return null;
    return {
      title,
      coverUrl: `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`,
      source: 'Open Library',
    };
  } catch {
    return null;
  }
}

async function lookupGoogleBooks(isbn: string): Promise<IsbnResult | null> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const info = data.items?.[0]?.volumeInfo;
    const title = typeof info?.title === 'string' ? info.title : null;
    if (!title) return null;
    const thumbnail: string | undefined = info?.imageLinks?.thumbnail ?? info?.imageLinks?.smallThumbnail;
    return {
      title,
      coverUrl: thumbnail ? thumbnail.replace(/^http:/, 'https:') : null,
      source: 'Google Books',
    };
  } catch {
    return null;
  }
}

// Koninklijke Bibliotheek (Dutch national library) SRU catalog search — covers
// a lot of Dutch-market books that Open Library/Google Books miss. No API key,
// but it's a plain XML/SRU service, so this does light regex extraction rather
// than pulling in a full XML parser for one field.
async function lookupKb(isbn: string): Promise<IsbnResult | null> {
  try {
    const url =
      'http://jsru.kb.nl/sru/sru?version=1.2&operation=searchRetrieve' +
      '&x-collection=GGC&recordSchema=dcx&maximumRecords=1' +
      `&query=${encodeURIComponent(`isbn=${isbn}`)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const xml = await res.text();
    const match = xml.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/);
    const title = match?.[1]?.trim();
    if (!title) return null;
    return { title, coverUrl: null, source: 'KB' };
  } catch {
    return null;
  }
}

export async function lookupIsbnAction(
  rawIsbn: string,
): Promise<{ title: string; coverUrl: string | null; source: string } | null> {
  await requireAuth();
  const isbn = rawIsbn.replace(/[^0-9Xx]/g, '');
  if (isbn.length !== 10 && isbn.length !== 13) return null;

  for (const lookup of [lookupOpenLibrary, lookupGoogleBooks, lookupKb]) {
    const result = await lookup(isbn);
    if (result) return result;
  }
  return null;
}
