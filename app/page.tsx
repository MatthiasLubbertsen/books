import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { isLocation, type Book } from '@/lib/types';
import BooksApp from '@/components/BooksApp';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const [rows, authenticated] = await Promise.all([
    prisma.book.findMany({ orderBy: { title: 'asc' } }),
    getSession(),
  ]);

  const books: Book[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    subject: row.subject,
    location: isLocation(row.location) ? row.location : 'home',
    createdAt: row.createdAt.toISOString(),
  }));

  return <BooksApp initialBooks={books} initialAuthenticated={authenticated} />;
}
