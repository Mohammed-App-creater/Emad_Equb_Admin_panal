'use client';

import React from 'react';
import { FileText, Eye, X, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

// A value we can preview: a freshly-picked File, a stored URL string, or nothing.
export type PreviewValue = File | string | null | undefined;

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|svg|avif)(\?|#|$)/i;

// Best-effort "is this an image?" for both File objects and URL strings.
function isImage(value: PreviewValue): boolean {
  if (value instanceof File) return value.type.startsWith('image/');
  if (typeof value === 'string') return IMAGE_EXT.test(value);
  return false;
}

// A human-friendly name for the file chip.
function fileName(value: PreviewValue): string {
  if (value instanceof File) return value.name;
  if (typeof value === 'string') {
    try {
      const path = value.startsWith('http') ? new URL(value).pathname : value;
      return decodeURIComponent(path.split('/').pop() || 'file');
    } catch {
      return value.split('/').pop() || 'file';
    }
  }
  return 'file';
}

interface FilePreviewProps {
  value: PreviewValue;
  /** Optional handler to remove/clear the selected file. Renders an X button. */
  onClear?: () => void;
  className?: string;
}

/**
 * Shows a preview of a selected/stored file. Images render a thumbnail that
 * opens a full-screen lightbox on click; other files (PDF, docs) render a chip
 * with an "open in new tab" action. Object URLs created for File previews are
 * revoked on unmount to avoid leaks.
 */
export function FilePreview({ value, onClear, className }: FilePreviewProps) {
  const [lightboxOpen, setLightboxOpen] = React.useState(false);

  // Resolve a displayable src: object URL for File, or the string as-is.
  const src = React.useMemo(() => {
    if (value instanceof File) return URL.createObjectURL(value);
    if (typeof value === 'string' && value) return value;
    return '';
  }, [value]);

  React.useEffect(() => {
    return () => {
      if (src.startsWith('blob:')) URL.revokeObjectURL(src);
    };
  }, [src]);

  if (!src) return null;

  const image = isImage(value);
  const name = fileName(value);

  return (
    <>
      <div
        className={cn(
          'mt-2 flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-2',
          className
        )}
      >
        {image ? (
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg ring-1 ring-border group"
            aria-label="Preview image"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={name} className="h-full w-full object-cover" />
            <span className="absolute inset-0 hidden items-center justify-center bg-foreground/40 group-hover:flex">
              <Eye className="h-4 w-4 text-background" />
            </span>
          </button>
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText className="h-6 w-6" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{name}</p>
          <div className="mt-0.5 flex items-center gap-3">
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              {image ? <Eye className="h-3 w-3" /> : <Download className="h-3 w-3" />}
              {image ? 'View' : 'Open'}
            </a>
          </div>
        </div>

        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Remove file"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Lightbox for images */}
      {lightboxOpen && image && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute right-4 top-4 rounded-full bg-muted p-2 text-foreground hover:bg-muted/80"
            aria-label="Close preview"
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={name}
            className="max-h-full max-w-full rounded-lg object-contain shadow-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
