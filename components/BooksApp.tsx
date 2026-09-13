'use client';

import { useEffect, useState } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';
import type { Book, Location } from '@/lib/types';
import MenuBar from './MenuBar';
import Board from './Board';
import AddBookModal from './AddBookModal';
import EditBookModal from './EditBookModal';
import RegisterKeyDialog from './RegisterKeyDialog';
import ManageKeysDialog from './ManageKeysDialog';
import { Button } from '@/components/ui/button';
import { EyeOffIcon, EyeIcon } from 'lucide-react';
import {
  logoutAction,
  moveBookAction,
  getAuthenticationOptionsAction,
  verifyAuthenticationAction,
} from '@/app/actions';

export default function BooksApp({
  initialBooks,
  initialAuthenticated,
  hasCredentials,
}: {
  initialBooks: Book[];
  initialAuthenticated: boolean;
  hasCredentials: boolean;
}) {
  const [books, setBooks] = useState(initialBooks);
  const [authenticated, setAuthenticated] = useState(initialAuthenticated);
  const [keysRegistered, setKeysRegistered] = useState(hasCredentials);
  const [addOpen, setAddOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [manageKeysOpen, setManageKeysOpen] = useState(false);
  const [loginBusy, setLoginBusy] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [showHidden, setShowHidden] = useState(false);
  const [insecureContext, setInsecureContext] = useState(false);
  const [pendingMove, setPendingMove] = useState<{ bookId: string; location: Location } | null>(
    null,
  );

  useEffect(() => {
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setInsecureContext(true);
    }
  }, []);

  function applyMove(bookId: string, location: Location) {
    const previous = books;
    setBooks((prev) => prev.map((b) => (b.id === bookId ? { ...b, location } : b)));
    moveBookAction(bookId, location)
      .then((updated) => setBooks((prev) => prev.map((b) => (b.id === bookId ? updated : b))))
      .catch(() => setBooks(previous));
  }

  async function handleLogin() {
    setLoginBusy(true);
    setLoginError('');
    try {
      const options = await getAuthenticationOptionsAction();
      const response = await startAuthentication({ optionsJSON: options });
      const result = await verifyAuthenticationAction(response);
      if (!result.ok) {
        setLoginError(result.error);
        return;
      }
      setAuthenticated(true);
      if (pendingMove) {
        applyMove(pendingMove.bookId, pendingMove.location);
        setPendingMove(null);
      }
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'login failed');
    } finally {
      setLoginBusy(false);
    }
  }

  function handleDrop(bookId: string, location: Location) {
    if (authenticated) {
      applyMove(bookId, location);
      return;
    }
    setPendingMove({ bookId, location });
    if (keysRegistered) {
      handleLogin();
    } else {
      setRegisterOpen(true);
    }
  }

  async function handleLogout() {
    setAuthenticated(false);
    await logoutAction();
  }

  const hiddenCount = books.filter((b) => b.hidden).length;
  const visibleBooks = showHidden ? books : books.filter((b) => !b.hidden);

  return (
    <div className="flex min-h-dvh flex-col">
      {insecureContext && (
        <div className="bg-destructive/15 px-4 py-2 text-center text-xs text-destructive">
          this page isn&apos;t served over https, so security keys won&apos;t work here — see the
          README for how to fix that.
        </div>
      )}

      <MenuBar
        authenticated={authenticated}
        hasCredentials={keysRegistered}
        loginBusy={loginBusy}
        loginError={loginError}
        onAdd={() => setAddOpen(true)}
        onLogin={handleLogin}
        onRegister={() => setRegisterOpen(true)}
        onManageKeys={() => setManageKeysOpen(true)}
        onLogout={handleLogout}
      />

      <Board
        books={visibleBooks}
        authenticated={authenticated}
        onEdit={setEditingBook}
        onDrop={handleDrop}
      />

      {hiddenCount > 0 && (
        <div className="flex justify-center pb-6">
          <Button variant="ghost" size="sm" onClick={() => setShowHidden((v) => !v)}>
            {showHidden ? <EyeOffIcon /> : <EyeIcon />}
            {showHidden ? 'hide hidden books' : `show ${hiddenCount} hidden book${hiddenCount === 1 ? '' : 's'}`}
          </Button>
        </div>
      )}

      <AddBookModal
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdded={(book) => setBooks((prev) => [...prev, book])}
      />

      <EditBookModal
        book={editingBook}
        onOpenChange={(open) => {
          if (!open) setEditingBook(null);
        }}
        onSaved={(updated) => {
          setBooks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
        }}
        onDeleted={(id) => {
          setBooks((prev) => prev.filter((b) => b.id !== id));
        }}
      />

      <RegisterKeyDialog
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        onRegistered={() => {
          setKeysRegistered(true);
          setAuthenticated(true);
          if (pendingMove) {
            applyMove(pendingMove.bookId, pendingMove.location);
            setPendingMove(null);
          }
        }}
      />

      <ManageKeysDialog open={manageKeysOpen} onOpenChange={setManageKeysOpen} />
    </div>
  );
}
