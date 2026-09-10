'use client';

import { useState, useTransition } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { loginAction } from '@/app/actions';

export default function LoginModal({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  function reset() {
    setPin('');
    setError('');
  }

  function submit() {
    setError('');
    startTransition(async () => {
      const result = await loginAction(pin);
      if (result.ok) {
        reset();
        onSuccess();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
      title="log in"
    >
      <form
        className="flex flex-col items-center gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          autoFocus
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="······"
          className="w-[7ch] rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2
                     text-center font-mono text-lg tracking-[0.35em] text-zinc-100
                     placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-400"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button type="submit" disabled={pin.length !== 6 || pending} className="w-full">
          {pending ? 'checking…' : 'continue'}
        </Button>
      </form>
    </Modal>
  );
}
