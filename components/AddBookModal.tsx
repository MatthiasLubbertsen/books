'use client';

import { useState, useTransition } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ScanLineIcon } from 'lucide-react';
import IsbnScanner from '@/components/IsbnScanner';
import { addBookAction, lookupIsbnAction } from '@/app/actions';
import { isValidIsbn } from '@/lib/isbn';
import type { Book, Location } from '@/lib/types';

export default function AddBookModal({
  open,
  onOpenChange,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: (book: Book) => void;
}) {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [location, setLocation] = useState<Location>('home');
  const [isbn, setIsbn] = useState('');
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [looking, setLooking] = useState(false);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  function reset() {
    setTitle('');
    setSubject('');
    setLocation('home');
    setIsbn('');
    setCoverUrl(null);
    setScanning(false);
    setError('');
  }

  async function runLookup(code: string) {
    setLooking(true);
    setError('');
    try {
      const result = await lookupIsbnAction(code);
      if (!result) {
        setError("couldn't find that ISBN — you can still fill in the details manually");
        return;
      }
      setTitle((prev) => prev || result.title);
      setCoverUrl(result.coverUrl);
    } finally {
      setLooking(false);
    }
  }

  function handleScan(code: string) {
    setIsbn(code);
    setScanning(false);
    runLookup(code);
  }

  function submit() {
    setError('');
    startTransition(async () => {
      try {
        const book = await addBookAction({ title, subject, location, isbn, coverUrl });
        onAdded(book);
        reset();
        onOpenChange(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'failed to add book');
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogTitle>add a book</DialogTitle>

        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="flex gap-2">
            <Input
              placeholder="ISBN"
              maxLength={20}
              value={isbn}
              onChange={(e) => setIsbn(e.target.value)}
              className="flex-1"
            />
            <Button
              type="button"
              variant="secondary"
              disabled={!isValidIsbn(isbn) || looking}
              onClick={() => runLookup(isbn)}
            >
              {looking ? 'looking up…' : 'look up'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="scan barcode"
              onClick={() => setScanning((v) => !v)}
            >
              <ScanLineIcon />
            </Button>
          </div>

          {scanning && <IsbnScanner onScan={handleScan} />}

          {coverUrl && (
            <img
              src={coverUrl}
              alt=""
              className="h-24 w-16 self-start rounded object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}

          <Input
            autoFocus
            placeholder="title"
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Input
            placeholder="subject (optional)"
            maxLength={200}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <ToggleGroup
            type="single"
            value={location}
            onValueChange={(v) => v && setLocation(v as Location)}
          >
            <ToggleGroupItem value="home">home</ToggleGroupItem>
            <ToggleGroupItem value="school">school</ToggleGroupItem>
          </ToggleGroup>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={!title.trim() || pending} className="w-full">
              {pending ? 'adding…' : 'add book'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
