'use client';

import { useDraggable } from '@dnd-kit/core';
import type { Book } from '@/lib/types';

export function BookCardVisual({
  book,
  authenticated,
  onDelete,
  dragging,
}: {
  book: Book;
  authenticated: boolean;
  onDelete?: () => void;
  dragging?: boolean;
}) {
  return (
    <div
      className={
        'group flex items-center gap-2 rounded-lg border border-zinc-600/60 bg-zinc-700 px-3 py-2.5 ' +
        'shadow-sm transition-shadow ' +
        (dragging ? 'shadow-lg ring-1 ring-zinc-500' : '')
      }
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-zinc-100">{book.title}</div>
        {book.subject && (
          <div className="truncate text-xs text-zinc-400">{book.subject}</div>
        )}
      </div>
      {authenticated && onDelete && (
        <button
          type="button"
          aria-label="delete book"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onDelete}
          className="shrink-0 rounded-md px-1.5 py-1 text-zinc-500 opacity-0 transition-opacity
                     hover:text-red-400 group-hover:opacity-100 focus-visible:opacity-100"
        >
          ✕
        </button>
      )}
    </div>
  );
}

export default function BookCard({
  book,
  authenticated,
  onDelete,
}: {
  book: Book;
  authenticated: boolean;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: book.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={
        'touch-none cursor-grab active:cursor-grabbing ' +
        (isDragging ? 'opacity-30' : '')
      }
    >
      <BookCardVisual book={book} authenticated={authenticated} onDelete={onDelete} />
    </div>
  );
}
