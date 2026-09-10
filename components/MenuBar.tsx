'use client';

import Button from '@/components/ui/Button';

export default function MenuBar({
  authenticated,
  onAdd,
  onLogin,
  onLogout,
}: {
  authenticated: boolean;
  onAdd: () => void;
  onLogin: () => void;
  onLogout: () => void;
}) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800 bg-zinc-950/90 px-4 py-3 backdrop-blur">
      <h1 className="text-sm font-semibold tracking-wide text-zinc-100">books</h1>
      <div className="flex items-center gap-2">
        {authenticated ? (
          <>
            <Button variant="primary" onClick={onAdd} aria-label="add a book">
              <span aria-hidden className="text-base leading-none">+</span>
              <span className="hidden sm:inline">add</span>
            </Button>
            <Button variant="ghost" onClick={onLogout}>
              log out
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={onLogin}>
            log in
          </Button>
        )}
      </div>
    </header>
  );
}
