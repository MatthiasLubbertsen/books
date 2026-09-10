'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { login as doLogin, logout as doLogout, requireAuth } from '@/lib/auth';
import { isLocation, type Book, type BookMove } from '@/lib/types';

type BookRow = {
  id: string;
  title: string;
  subject: string | null;
  location: string;
  createdAt: Date;
  _count: { moves: number };
};

function toBook(row: BookRow): Book {
  return {
    id: row.id,
    title: row.title,
    subject: row.subject,
    location: isLocation(row.location) ? row.location : 'home',
    createdAt: row.createdAt.toISOString(),
    moveCount: row._count.moves,
  };
}

const withMoveCount = { _count: { select: { moves: true } } } as const;

export async function loginAction(pin: string) {
  return doLogin(pin);
}

export async function logoutAction() {
  await doLogout();
  revalidatePath('/');
}

export async function addBookAction(input: { title: string; subject: string; location: string }): Promise<Book> {
  await requireAuth();

  const title = input.title.trim().slice(0, 200);
  const subject = input.subject.trim().slice(0, 200);
  if (!title) throw new Error('title is required');
  if (!isLocation(input.location)) throw new Error('invalid location');

  const book = await prisma.book.create({
    data: { title, subject: subject || null, location: input.location },
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
  input: { title: string; subject: string; location: string },
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
    data: { title, subject: subject || null, location: input.location },
    include: withMoveCount,
  });
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
