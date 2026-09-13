import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { hasAnyCredential } from '@/lib/webauthn';
import { isLocation, type Book } from '@/lib/types';
import BooksApp from '@/components/BooksApp';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const [rows, authenticated, hasCredentials] = await Promise.all([
    prisma.book.findMany({
      orderBy: { title: 'asc' },
      include: { _count: { select: { moves: true } } },
    }),
    getSession(),
    hasAnyCredential(),
  ]);

  const books: Book[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    subject: row.subject,
    location: isLocation(row.location) ? row.location : 'home',
    isbn: row.isbn,
    coverUrl: row.coverUrl,
    hidden: row.hidden,
    createdAt: row.createdAt.toISOString(),
    moveCount: row._count.moves,
  }));

  return (
    <BooksApp
      initialBooks={books}
      initialAuthenticated={authenticated}
      hasCredentials={hasCredentials}
    />
  );
}
