'use client';

import { useState, useTransition } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import SegmentedControl from '@/components/ui/SegmentedControl';
import { addBookAction } from '@/app/actions';
import type { Book, Location } from '@/lib/types';

const inputClass =
  'w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 ' +
  'placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400';

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
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  function reset() {
    setTitle('');
    setSubject('');
    setLocation('home');
    setError('');
  }

  function submit() {
    setError('');
    startTransition(async () => {
      try {
        const book = await addBookAction({ title, subject, location });
        onAdded(book);
        reset();
        onOpenChange(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'failed to add book');
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
      title="add a book"
    >
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
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
        <Button type="submit" disabled={!title.trim() || pending} className="mt-1 w-full">
          {pending ? 'adding…' : 'add book'}
        </Button>
      </form>
    </Modal>
  );
}
