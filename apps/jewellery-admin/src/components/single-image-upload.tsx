'use client';

import { useRef, useState } from 'react';
import { Loader2, UploadCloud, X } from 'lucide-react';
import { toast } from 'sonner';
import { isVideoUrl, type ApiResponse } from '@lorka/types';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { extractMessage } from '@/lib/api-utils';

/** Uploads one image to the API (which stores it on Cloudinary) and reports back its URL. */
export function SingleImageUpload({
  value,
  onChange,
  uploadPath,
  previewClassName = 'aspect-video',
  fieldName = 'image',
  accept = 'image/jpeg,image/png,image/webp,image/gif',
  hint = 'JPG, PNG, WEBP or GIF, up to 5MB.',
  noun = 'image',
}: {
  value: string;
  onChange: (url: string) => void;
  /** API endpoint, e.g. '/uploads/banners' or '/uploads/categories'. */
  uploadPath: string;
  /** Aspect ratio class for the preview box. */
  previewClassName?: string;
  /** Multipart field name the endpoint expects ('image' for most, 'media' for festival uploads). */
  fieldName?: string;
  accept?: string;
  hint?: string;
  /** Word used in the button/toasts, e.g. 'image' or 'GIF / video'. */
  noun?: string;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append(fieldName, file);

    setIsUploading(true);
    try {
      const { data } = await api.post<ApiResponse<{ url: string }>>(uploadPath, formData);
      if (data.success) {
        onChange(data.data.url);
      }
    } catch (err) {
      toast.error(extractMessage(err, `Failed to upload ${noun}`));
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => uploadFile(e.target.files)}
      />

      {value && (
        <div className={`group relative ${previewClassName} w-full max-w-xs overflow-hidden rounded-md border border-border`}>
          {isVideoUrl(value) ? (
            <video src={value} autoPlay muted loop playsInline className="h-full w-full object-cover" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-full w-full object-cover" />
          )}
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
            aria-label="Remove image"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        disabled={isUploading}
        onClick={() => inputRef.current?.click()}
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <UploadCloud className="h-4 w-4" />
        )}
        {isUploading ? 'Uploading…' : value ? `Replace ${noun}` : `Upload ${noun}`}
      </Button>

      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
