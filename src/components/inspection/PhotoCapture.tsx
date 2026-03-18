'use client';

import React, { useRef, useState } from 'react';
import Spinner from '@/components/ui/spinner';

interface PhotoCaptureProps {
  photoType: string;
  label: string;
  existingUrl?: string;
  inspectionId: number;
  onUploaded: () => void;
}

export default function PhotoCapture({
  photoType,
  label,
  existingUrl,
  inspectionId,
  onUploaded,
}: PhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(existingUrl || null);
  const [error, setError] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('photo_type', photoType);

      const res = await fetch(`/api/inspections/${inspectionId}/photos`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');
      onUploaded();
    } catch {
      setError('Upload failed. Tap to retry.');
    } finally {
      setUploading(false);
      // Reset input so same file can be re-selected
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-neutral-600 truncate">{label}</span>
      <div
        className="relative aspect-[4/3] rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 overflow-hidden cursor-pointer hover:border-primary transition-colors touch-manipulation"
        onClick={() => !uploading && inputRef.current?.click()}
      >
        {preview ? (
          <>
            <img
              src={preview}
              alt={label}
              className="w-full h-full object-cover"
            />
            {!uploading && (
              <div className="absolute inset-0 bg-black/0 hover:bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-all">
                <span className="text-white text-xs font-medium bg-black/50 px-2 py-1 rounded">
                  Replace
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-neutral-400">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-xs">Tap to capture</span>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
            <Spinner size="md" />
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
