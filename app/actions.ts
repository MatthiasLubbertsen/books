'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { login as doLogin, logout as doLogout, requireAuth } from '@/lib/auth';
import { isLocation, type Book } from '@/lib/types';

function toBook(row: { id: string; title: string; subject: string | null; location: string; createdAt: Date }): Book {
  return {
    id: row.id,
    title: row.title,
    subject: row.subject,
    location: isLocation(row.location) ? row.location : 'home',
    createdAt: row.createdAt.toISOString(),
  };
}

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
  });
  revalidatePath('/');
  return toBook(book);
}

export async function moveBookAction(id: string, location: string): Promise<Book> {
  await requireAuth();
  if (!isLocation(location)) throw new Error('invalid location');

  const book = await prisma.book.update({ where: { id }, data: { location } });
  revalidatePath('/');
  return toBook(book);
}

export async function deleteBookAction(id: string): Promise<void> {
  await requireAuth();
  await prisma.book.delete({ where: { id } });
  revalidatePath('/');
}
