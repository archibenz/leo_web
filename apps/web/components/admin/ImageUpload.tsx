'use client';

import {useState, useRef, useCallback} from 'react';
import {useTranslations} from 'next-intl';
import {apiFetch, getToken} from '../../lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8080';

interface ImageUploadProps {
  images: {src: string; alt: string}[];
  onChange: (images: {src: string; alt: string}[]) => void;
}

export default function ImageUpload({images, onChange}: ImageUploadProps) {
  const t = useTranslations('admin.upload');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);

    const newImages = [...images];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);

      try {
        const token = getToken();
        const res = await fetch(`${API_BASE}/api/admin/upload`, {
          method: 'POST',
          headers: token ? {Authorization: `Bearer ${token}`} : {},
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          newImages.push({src: data.url, alt: file.name.replace(/\.[^/.]+$/, '')});
        }
      } catch {
        // skip failed uploads
      }
    }

    onChange(newImages);
    setUploading(false);
  }, [images, onChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleUpload(e.dataTransfer.files);
  }, [handleUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const removeImage = useCallback((index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onChange(newImages);
  }, [images, onChange]);

  return (
    <div className="space-y-3">
      {/* Existing images */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {images.map((img, i) => (
            <div key={i} className="relative group">
              <div className="h-24 w-24 rounded-lg overflow-hidden bg-[var(--ink)]/5">
                {img.src ? (
                  <img
                    src={img.src.startsWith('/') ? `${API_BASE}${img.src}` : img.src}
                    alt={img.alt}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#3b1a2e] to-[#6b3a5e]">
                    <span className="text-[10px] text-white/50">No src</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-xs opacity-0 group-hover:opacity-100 transition"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current?.click()}
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--ink)]/20 p-8 text-center transition hover:border-[var(--accent)]/50 hover:bg-[var(--ink)]/3"
      >
        {uploading ? (
          <div className="flex items-center gap-2 text-sm text-[var(--ink-soft)]">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
            {t('uploading')}
          </div>
        ) : (
          <>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="text-[var(--ink-soft)]">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" />
            </svg>
            <p className="text-sm text-[var(--ink-soft)]">{t('dropzone')}</p>
            <p className="text-xs text-[var(--ink-soft)]/60">{t('maxSize')}</p>
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={e => handleUpload(e.target.files)}
      />
    </div>
  );
}
