'use client';

import { useDroppable } from '@dnd-kit/core';
import type { Book, Location } from '@/lib/types';
import BookCard from './BookCard';

export default function Column({
  location,
  label,
  books,
  authenticated,
  onEdit,
}: {
  location: Location;
  label: string;
  books: Book[];
  authenticated: boolean;
  onEdit: (book: Book) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: location });

  return (
    <section
      ref={setNodeRef}
      className={
        'flex min-h-40 flex-1 flex-col gap-2 rounded-xl border p-3 transition-colors ' +
        (isOver
          ? 'border-zinc-500 bg-zinc-700'
          : 'border-zinc-700/60 bg-zinc-800')
      }
    >
      <h2 className="px-1 text-xs font-medium tracking-wide text-zinc-400 uppercase">
        {label}
      </h2>
      <div className="flex flex-1 flex-col gap-2">
        {books.length === 0 ? (
          <p className="px-1 py-2 text-sm text-zinc-600">nothing here</p>
        ) : (
          books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              authenticated={authenticated}
              onEdit={() => onEdit(book)}
            />
          ))
        )}
      </div>
    </section>
  );
}
