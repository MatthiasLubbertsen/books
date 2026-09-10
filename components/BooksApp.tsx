'use client';

import { useState } from 'react';
import type { Book, Location } from '@/lib/types';
import MenuBar from './MenuBar';
import Board from './Board';
import LoginModal from './LoginModal';
import AddBookModal from './AddBookModal';
import { logoutAction, moveBookAction, deleteBookAction } from '@/app/actions';

export default function BooksApp({
  initialBooks,
  initialAuthenticated,
}: {
  initialBooks: Book[];
  initialAuthenticated: boolean;
}) {
  const [books, setBooks] = useState(initialBooks);
  const [authenticated, setAuthenticated] = useState(initialAuthenticated);
  const [loginOpen, setLoginOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [pendingMove, setPendingMove] = useState<{ bookId: string; location: Location } | null>(
    null,
  );

  function applyMove(bookId: string, location: Location) {
    const previous = books;
    setBooks((prev) => prev.map((b) => (b.id === bookId ? { ...b, location } : b)));
    moveBookAction(bookId, location).catch(() => setBooks(previous));
  }

  function handleDrop(bookId: string, location: Location) {
    if (authenticated) {
      applyMove(bookId, location);
    } else {
      setPendingMove({ bookId, location });
      setLoginOpen(true);
    }
  }

  function handleDelete(id: string) {
    const previous = books;
    setBooks((prev) => prev.filter((b) => b.id !== id));
    deleteBookAction(id).catch(() => setBooks(previous));
  }

  async function handleLogout() {
    setAuthenticated(false);
    await logoutAction();
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <MenuBar
        authenticated={authenticated}
        onAdd={() => setAddOpen(true)}
        onLogin={() => setLoginOpen(true)}
        onLogout={handleLogout}
      />

      <Board books={books} authenticated={authenticated} onDelete={handleDelete} onDrop={handleDrop} />

      <LoginModal
        open={loginOpen}
        onOpenChange={(open) => {
          setLoginOpen(open);
          if (!open) setPendingMove(null);
        }}
        onSuccess={() => {
          setAuthenticated(true);
          setLoginOpen(false);
          if (pendingMove) {
            applyMove(pendingMove.bookId, pendingMove.location);
            setPendingMove(null);
          }
        }}
      />

      <AddBookModal
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdded={(book) => setBooks((prev) => [...prev, book])}
      />
    </div>
  );
}
