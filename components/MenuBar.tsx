'use client';

import { Button } from '@/components/ui/button';
import { PlusIcon, KeyRoundIcon } from 'lucide-react';

export default function MenuBar({
  authenticated,
  hasCredentials,
  loginBusy,
  loginError,
  onAdd,
  onLogin,
  onRegister,
  onManageKeys,
  onLogout,
}: {
  authenticated: boolean;
  hasCredentials: boolean;
  loginBusy: boolean;
  loginError: string;
  onAdd: () => void;
  onLogin: () => void;
  onRegister: () => void;
  onManageKeys: () => void;
  onLogout: () => void;
}) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/90 px-4 py-3 backdrop-blur">
      <h1 className="text-sm font-semibold tracking-wide text-foreground">books</h1>
      <div className="flex items-center gap-2">
        {authenticated ? (
          <>
            <Button onClick={onAdd} aria-label="add a book">
              <PlusIcon />
              <span className="hidden sm:inline">add</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={onManageKeys} aria-label="manage security keys">
              <KeyRoundIcon />
            </Button>
            <Button variant="ghost" onClick={onLogout}>
              log out
            </Button>
          </>
        ) : hasCredentials ? (
          <div className="flex items-center gap-3">
            {loginError && <span className="text-xs text-destructive">{loginError}</span>}
            <Button variant="secondary" onClick={onLogin} disabled={loginBusy}>
              {loginBusy ? 'waiting for key…' : 'log in'}
            </Button>
          </div>
        ) : (
          <Button variant="secondary" onClick={onRegister}>
            register security key
          </Button>
        )}
      </div>
    </header>
  );
}
