'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { KeyRoundIcon, TrashIcon } from 'lucide-react';
import RegisterKeyDialog from '@/components/RegisterKeyDialog';
import { listCredentialsAction, removeCredentialAction } from '@/app/actions';

type CredentialRow = { id: string; name: string | null; createdAt: string };

export default function ManageKeysDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [keys, setKeys] = useState<CredentialRow[] | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  function refresh() {
    listCredentialsAction()
      .then((rows) => setKeys(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))))
      .catch(() => setKeys([]));
  }

  useEffect(() => {
    if (open) refresh();
  }, [open]);

  async function handleRemove(id: string) {
    await removeCredentialAction(id);
    refresh();
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogTitle>security keys</DialogTitle>
          <DialogDescription>keys that can log in to this books app.</DialogDescription>

          <div className="flex flex-col gap-2">
            {keys === null ? (
              <p className="text-sm text-muted-foreground">loading…</p>
            ) : keys.length === 0 ? (
              <p className="text-sm text-muted-foreground">no keys registered</p>
            ) : (
              keys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2"
                >
                  <KeyRoundIcon className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-foreground">{key.name || 'unnamed key'}</div>
                    <div className="text-xs text-muted-foreground">
                      added {new Date(key.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label="remove key">
                        <TrashIcon className="size-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogTitle>remove this key?</AlertDialogTitle>
                      <AlertDialogDescription>
                        you won&apos;t be able to log in with &quot;{key.name || 'unnamed key'}&quot;
                        anymore. make sure another registered key still works before removing your
                        last one.
                      </AlertDialogDescription>
                      <AlertDialogFooter>
                        <AlertDialogCancel>cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleRemove(key.id)}>
                          remove key
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))
            )}
          </div>

          <Button variant="secondary" onClick={() => setAddOpen(true)} className="w-full">
            + add another key
          </Button>
        </DialogContent>
      </Dialog>

      <RegisterKeyDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onRegistered={refresh}
        title="add a backup key"
        description="register another security key so you're not locked out if you lose one."
      />
    </>
  );
}
