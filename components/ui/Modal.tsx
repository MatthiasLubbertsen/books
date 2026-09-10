'use client';

import * as Dialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';

export default function Modal({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 data-[state=open]:animate-pop-in" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 w-[90vw] max-w-sm -translate-x-1/2 -translate-y-1/2
                     rounded-xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl
                     focus:outline-none data-[state=open]:animate-pop-in"
        >
          <Dialog.Title className="mb-4 text-sm font-medium text-zinc-100">
            {title}
          </Dialog.Title>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
