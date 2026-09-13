'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
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
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Separator } from '@/components/ui/separator';
import { ScanLineIcon, EyeOffIcon, EyeIcon } from 'lucide-react';
import IsbnScanner from '@/components/IsbnScanner';
import PhotoCapture from '@/components/PhotoCapture';
import {
  deleteBookAction,
  getBookHistoryAction,
  lookupIsbnAction,
  setBookHiddenAction,
  updateBookAction,
} from '@/app/actions';
import { relativeTime } from '@/lib/format';
import { isValidIsbn } from '@/lib/isbn';
import type { Book, BookMove, Location } from '@/lib/types';

export default function EditBookModal({
  book,
  onOpenChange,
  onSaved,
  onDeleted,
}: {
  book: Book | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (book: Book) => void;
  onDeleted: (id: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [location, setLocation] = useState<Location>('home');
  const [isbn, setIsbn] = useState('');
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [looking, setLooking] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [togglingHidden, setTogglingHidden] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [history, setHistory] = useState<BookMove[] | null>(null);

  useEffect(() => {
    if (!book) return;
    setTitle(book.title);
    setSubject(book.subject ?? '');
    setLocation(book.location);
    setIsbn(book.isbn ?? '');
    setCoverUrl(book.coverUrl);
    setHidden(book.hidden);
    setScanning(false);
    setError('');
    setHistory(null);
    getBookHistoryAction(book.id)
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [book]);

  async function runLookup(code: string) {
    setLooking(true);
    setError('');
    try {
      const result = await lookupIsbnAction(code);
      if (!result) {
        setError("couldn't find that ISBN in any database — take a photo below instead");
        return;
      }
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

  async function handleSave() {
    if (!book) return;
    setError('');
    setSaving(true);
    try {
      const updated = await updateBookAction(book.id, {
        title,
        subject,
        location,
        isbn,
        coverUrl,
        hidden,
      });
      onSaved(updated);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleHidden() {
    if (!book) return;
    const next = !hidden;
    setHidden(next);
    setTogglingHidden(true);
    try {
      const updated = await setBookHiddenAction(book.id, next);
      onSaved(updated);
    } catch (err) {
      setHidden(!next);
      setError(err instanceof Error ? err.message : 'failed to update');
    } finally {
      setTogglingHidden(false);
    }
  }

  async function handleDelete() {
    if (!book) return;
    setDeleting(true);
    try {
      await deleteBookAction(book.id);
      onDeleted(book.id);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'failed to delete');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={book !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>edit book</DialogTitle>

        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
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
            <PhotoCapture onCapture={setCoverUrl} />
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

          <Button
            type="button"
            variant="outline"
            onClick={handleToggleHidden}
            disabled={togglingHidden}
            className="w-full"
          >
            {hidden ? <EyeIcon /> : <EyeOffIcon />}
            {hidden ? 'unhide this book' : 'hide this book'}
          </Button>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={!title.trim() || saving} className="w-full">
              {saving ? 'saving…' : 'save changes'}
            </Button>
          </DialogFooter>
        </form>

        <Separator />

        <div>
          <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            activity
          </h3>
          {book && (
            <p className="mb-2 text-xs text-muted-foreground">
              added {relativeTime(book.createdAt)} · moved {book.moveCount}{' '}
              time{book.moveCount === 1 ? '' : 's'}
            </p>
          )}
          {history === null ? (
            <p className="text-xs text-muted-foreground/70">loading…</p>
          ) : history.length === 0 ? (
            <p className="text-xs text-muted-foreground/70">no moves yet</p>
          ) : (
            <ul className="flex max-h-32 flex-col gap-1 overflow-y-auto text-xs text-muted-foreground">
              {history.map((move) => (
                <li key={move.id} className="flex justify-between gap-2">
                  <span>
                    {move.fromLocation} → {move.toLocation}
                  </span>
                  <span className="text-muted-foreground/70">{relativeTime(move.movedAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Separator />

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              delete book
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogTitle>delete &quot;{book?.title}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              this also deletes its move history. this can&apos;t be undone.
            </AlertDialogDescription>
            <AlertDialogFooter>
              <AlertDialogCancel>cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={deleting}>
                {deleting ? 'deleting…' : 'delete book'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
