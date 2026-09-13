'use client';

import { useDraggable } from '@dnd-kit/core';
import { EllipsisIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
        'flex items-center gap-3 rounded-lg border border-border bg-secondary px-3 py-2.5 ' +
        'shadow-sm transition-shadow ' +
        (dragging ? 'shadow-lg ring-1 ring-ring' : '')
      }
    >
      {book.coverUrl && (
        <img
          src={book.coverUrl}
          alt=""
          className="h-10 w-7 shrink-0 rounded-sm object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium text-foreground">{book.title}</span>
          {book.hidden && (
            <Badge variant="outline" className="shrink-0 text-muted-foreground">
              hidden
            </Badge>
          )}
        </div>
        {book.subject && <div className="truncate text-xs text-muted-foreground">{book.subject}</div>}
      </div>
      {authenticated && onEdit && (
        <button
          type="button"
          aria-label="edit book"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onEdit}
          className="shrink-0 rounded-md px-2 py-1 text-muted-foreground transition-colors
                     hover:bg-accent hover:text-foreground focus-visible:outline-none
                     focus-visible:ring-2 focus-visible:ring-ring"
        >
          <EllipsisIcon className="size-4" />
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
