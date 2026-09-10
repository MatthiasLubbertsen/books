'use client';

import { useDraggable } from '@dnd-kit/core';
import type { Book } from '@/lib/types';

export function BookCardVisual({
  book,
  authenticated,
  onEdit,
  dragging,
}: {
  book: Book;
  authenticated: boolean;
  onEdit?: () => void;
  dragging?: boolean;
}) {
  return (
    <div
      className={
        'flex items-center gap-2 rounded-lg border border-zinc-600/60 bg-zinc-700 px-3 py-2.5 ' +
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
      {authenticated && onEdit && (
        <button
          type="button"
          aria-label="edit book"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onEdit}
          className="shrink-0 rounded-md px-2 py-1 text-zinc-400 transition-colors
                     hover:bg-zinc-600 hover:text-zinc-100 focus-visible:outline-none
                     focus-visible:ring-2 focus-visible:ring-zinc-400"
        >
          ⋯
        </button>
      )}
    </div>
  );
}

export default function BookCard({
  book,
  authenticated,
  onEdit,
}: {
  book: Book;
  authenticated: boolean;
  onEdit: () => void;
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
      <BookCardVisual book={book} authenticated={authenticated} onEdit={onEdit} />
    </div>
  );
}
