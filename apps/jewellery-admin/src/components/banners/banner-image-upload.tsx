'use client';

import { useRef, useState } from 'react';
import { Loader2, UploadCloud, X } from 'lucide-react';
import { toast } from 'sonner';
import type { ApiResponse } from '@lorka/types';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { extractMessage } from '@/lib/api-utils';

export function BannerImageUpload({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    setIsUploading(true);
    try {
      const { data } = await api.post<ApiResponse<{ url: string }>>('/uploads/banners', formData);
      if (data.success) {
        onChange(data.data.url);
      }
    } catch (err) {
      toast.error(extractMessage(err, 'Failed to upload image'));
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
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => uploadFile(e.target.files)}
      />

      {value && (
        <div className="group relative aspect-video w-full max-w-xs overflow-hidden rounded-md border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="h-full w-full object-cover" />
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
        {isUploading ? 'Uploading…' : value ? 'Replace image' : 'Upload image'}
      </Button>

      <p className="text-xs text-muted-foreground">JPG, PNG, WEBP or GIF, up to 5MB.</p>
    </div>
  );
}
