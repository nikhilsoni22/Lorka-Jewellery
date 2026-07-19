'use client';

import { useRef, useState } from 'react';
import { Loader2, UploadCloud, X } from 'lucide-react';
import { toast } from 'sonner';
import type { ApiResponse } from '@lorka/types';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { extractMessage } from '@/lib/api-utils';

const MAX_IMAGES = 6;

export function ImageUpload({
  value,
  onChange,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const remaining = MAX_IMAGES - value.length;
    if (remaining <= 0) {
      toast.error(`You can add up to ${MAX_IMAGES} images per product`);
      return;
    }

    const formData = new FormData();
    Array.from(files)
      .slice(0, remaining)
      .forEach((file) => formData.append('images', file));

    setIsUploading(true);
    try {
      const { data } = await api.post<ApiResponse<{ urls: string[] }>>(
        '/uploads/products',
        formData,
      );
      if (data.success) {
        onChange([...value, ...data.data.urls]);
      }
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to upload images'));
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removeAt = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={(e) => uploadFiles(e.target.files)}
      />
      <Button
        type="button"
        variant="outline"
        disabled={isUploading || value.length >= MAX_IMAGES}
        onClick={() => inputRef.current?.click()}
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <UploadCloud className="h-4 w-4" />
        )}
        {isUploading ? 'Uploading…' : 'Upload images'}
      </Button>

      {value.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {value.map((url, index) => (
            <div key={`${url}-${index}`} className="group relative aspect-square overflow-hidden rounded-md border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeAt(index)}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Remove image"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        JPG, PNG, WEBP or GIF, up to 5MB each. Max {MAX_IMAGES} images per product.
      </p>
    </div>
  );
}
