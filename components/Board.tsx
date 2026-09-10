'use client';

import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import type { Book } from '@/lib/types';
import Column from './Column';
import { BookCardVisual } from './BookCard';

export default function Board({
  books,
  authenticated,
  onDelete,
  onDrop,
}: {
  books: Book[];
  authenticated: boolean;
  onDelete: (id: string) => void;
  onDrop: (bookId: string, location: 'school' | 'home') => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const activeBook = books.find((b) => b.id === activeId) ?? null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const location = over.id as 'school' | 'home';
    const book = books.find((b) => b.id === active.id);
    if (!book || book.location === location) return;
    onDrop(String(active.id), location);
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex flex-1 flex-col gap-4 p-4 md:flex-row">
        <Column
          location="school"
          label="school"
          books={books.filter((b) => b.location === 'school')}
          authenticated={authenticated}
          onDelete={onDelete}
        />
        <Column
          location="home"
          label="home"
          books={books.filter((b) => b.location === 'home')}
          authenticated={authenticated}
          onDelete={onDelete}
        />
      </div>
      <DragOverlay dropAnimation={{ duration: 180, easing: 'ease-out' }}>
        {activeBook ? (
          <div className="rotate-2 scale-105">
            <BookCardVisual book={activeBook} authenticated={authenticated} dragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
