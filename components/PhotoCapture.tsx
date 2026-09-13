'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CameraIcon } from 'lucide-react';
import { resizeImageToDataUrl } from '@/lib/image';

export default function PhotoCapture({ onCapture }: { onCapture: (dataUrl: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      onCapture(dataUrl);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={handleChange}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="take a photo"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        <CameraIcon />
      </Button>
    </>
  );
}
