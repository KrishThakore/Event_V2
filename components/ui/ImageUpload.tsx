'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string | null) => void;
  required?: boolean;
  variant?: 'light' | 'dark';
  className?: string;
  category?: string;
}

export function ImageUpload({ 
  value, 
  onChange, 
  required = false, 
  variant = 'light',
  className = '',
  category = 'general'
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync preview with value prop changes
  useEffect(() => {
    if (value !== preview) {
      setPreview(value || null);
    }
  }, [value]);

  const isLight = variant === 'light';
  const containerClass = isLight 
    ? 'border-gray-300 bg-white text-gray-700' 
    : 'border-slate-600 bg-slate-800 text-white';
  const textClass = isLight ? 'text-gray-600' : 'text-slate-400';

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.');
      return;
    }

    // Validate file size (20MB max)
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      toast.error('File too large. Maximum size is 20MB.');
      return;
    }

    setUploading(true);
    const toastId = toast.loading('Uploading image...');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      // Handle non-JSON or error responses gracefully
      const contentType = response.headers.get('content-type');
      if (!response.ok || !contentType?.includes('application/json')) {
        const errorText = await response.text();
        console.error('Upload failed with status:', response.status, 'Content:', errorText);
        
        if (response.status === 413) {
          throw new Error('File too large for the server. Please try a smaller image (under 1MB).');
        }
        throw new Error(`Upload failed (${response.status}). The server might be misconfigured.`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      setPreview(result.url);
      onChange(result.url);
      toast.success('Image uploaded successfully', { id: toastId });
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload image', { id: toastId });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onChange(null);
    toast.info('Image removed');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium">
        Event Image {required && <span className="text-red-400">*</span>}
      </label>
      
      {preview ? (
        <div className="relative">
          <div className="relative rounded-lg overflow-hidden border-2 border-dashed border-gray-300">
            <img
              src={preview}
              alt="Event preview"
              className="w-full h-48 object-cover"
              onError={(e) => {
                // Fallback to placeholder if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const placeholder = target.nextElementSibling as HTMLElement;
                if (placeholder) {
                  placeholder.classList.remove('hidden');
                }
              }}
            />
            <div className="w-full h-48 bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center hidden">
              <ImageIcon className="w-8 h-8 text-purple-400" />
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="relative">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id="image-upload"
            disabled={uploading}
          />
          <label
            htmlFor="image-upload"
            className={`flex flex-col items-center justify-center w-full h-48 rounded-lg border-2 border-dashed ${containerClass} cursor-pointer hover:opacity-80 transition-opacity`}
          >
            {uploading ? (
              <div className="flex flex-col items-center space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className={`text-sm ${textClass}`}>Uploading...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-2">
                <ImageIcon className="w-8 h-8" />
                <Upload className="w-6 h-6" />
                <div className="text-center">
                  <p className={`text-sm ${textClass}`}>
                    Click to upload event image
                  </p>
                  <p className={`text-xs ${textClass} mt-1`}>
                    PNG, JPG, WebP, GIF up to 20MB
                  </p>
                </div>
              </div>
            )}
          </label>
        </div>
      )}
      
      {required && !preview && (
        <p className="text-sm text-red-400">Event image is required</p>
      )}
    </div>
  );
}
