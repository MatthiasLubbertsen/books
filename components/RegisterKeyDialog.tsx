'use client';

import { useState } from 'react';
import { startRegistration } from '@simplewebauthn/browser';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getRegistrationOptionsAction, verifyRegistrationAction } from '@/app/actions';

export default function RegisterKeyDialog({
  open,
  onOpenChange,
  onRegistered,
  title = 'register a security key',
  description = 'plug in or tap your yubikey (or other security key) and follow your browser’s prompt.',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegistered: () => void;
  title?: string;
  description?: string;
}) {
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleRegister() {
    setError('');
    setBusy(true);
    try {
      const options = await getRegistrationOptionsAction();
      const response = await startRegistration({ optionsJSON: options });
      const result = await verifyRegistrationAction(response, label);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setLabel('');
      onOpenChange(false);
      onRegistered();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'registration failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setLabel('');
          setError('');
        }
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>

        <div className="flex flex-col gap-2">
          <Label htmlFor="key-label">key name (optional)</Label>
          <Input
            id="key-label"
            placeholder="e.g. yubikey 5c"
            maxLength={60}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button onClick={handleRegister} disabled={busy} className="w-full">
            {busy ? 'waiting for key…' : 'register security key'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
