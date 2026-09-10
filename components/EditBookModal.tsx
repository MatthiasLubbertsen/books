'use client';

import { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import SegmentedControl from '@/components/ui/SegmentedControl';
import { deleteBookAction, getBookHistoryAction, updateBookAction } from '@/app/actions';
import { relativeTime } from '@/lib/format';
import type { Book, BookMove, Location } from '@/lib/types';

const inputClass =
  'w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 ' +
  'placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400';

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
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteStage, setDeleteStage] = useState<'idle' | 'confirm' | 'deleting'>('idle');
  const [history, setHistory] = useState<BookMove[] | null>(null);

  useEffect(() => {
    if (!book) return;
    setTitle(book.title);
    setSubject(book.subject ?? '');
    setLocation(book.location);
    setError('');
    setDeleteStage('idle');
    setHistory(null);
    getBookHistoryAction(book.id)
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [book]);

  async function handleSave() {
    if (!book) return;
    setError('');
    setSaving(true);
    try {
      const updated = await updateBookAction(book.id, { title, subject, location });
      onSaved(updated);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!book) return;
    if (deleteStage !== 'confirm') {
      setDeleteStage('confirm');
      return;
    }
    setDeleteStage('deleting');
    try {
      await deleteBookAction(book.id);
      onDeleted(book.id);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'failed to delete');
      setDeleteStage('idle');
    }
  }

  return (
    <Modal open={book !== null} onOpenChange={onOpenChange} title="edit book">
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
      >
        <input
          autoFocus
          type="text"
          placeholder="title"
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
        />
        <input
          type="text"
          placeholder="subject (optional)"
          maxLength={200}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className={inputClass}
        />
        <SegmentedControl
          value={location}
          onChange={setLocation}
          options={[
            { value: 'home', label: 'home' },
            { value: 'school', label: 'school' },
          ]}
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button type="submit" disabled={!title.trim() || saving} className="mt-1 w-full">
          {saving ? 'saving…' : 'save changes'}
        </Button>
      </form>

      <div className="mt-5 border-t border-zinc-800 pt-4">
        <h3 className="mb-2 text-xs font-medium tracking-wide text-zinc-500 uppercase">
          activity
        </h3>
        {book && (
          <p className="mb-2 text-xs text-zinc-400">
            added {relativeTime(book.createdAt)} · moved {book.moveCount}{' '}
            time{book.moveCount === 1 ? '' : 's'}
          </p>
        )}
        {history === null ? (
          <p className="text-xs text-zinc-600">loading…</p>
        ) : history.length === 0 ? (
          <p className="text-xs text-zinc-600">no moves yet</p>
        ) : (
          <ul className="flex max-h-32 flex-col gap-1 overflow-y-auto text-xs text-zinc-400">
            {history.map((move) => (
              <li key={move.id} className="flex justify-between gap-2">
                <span>
                  {move.fromLocation} → {move.toLocation}
                </span>
                <span className="text-zinc-600">{relativeTime(move.movedAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 border-t border-zinc-800 pt-4">
        <Button
          type="button"
          variant={deleteStage === 'confirm' ? 'primary' : 'ghost'}
          onClick={handleDelete}
          disabled={deleteStage === 'deleting'}
          className={
            deleteStage === 'confirm'
              ? 'w-full !bg-red-500 !text-white hover:!bg-red-600'
              : 'w-full text-red-400 hover:bg-red-500/10 hover:text-red-300'
          }
        >
          {deleteStage === 'confirm'
            ? 'click again to permanently delete'
            : deleteStage === 'deleting'
              ? 'deleting…'
              : 'delete book'}
        </Button>
      </div>
    </Modal>
  );
}
