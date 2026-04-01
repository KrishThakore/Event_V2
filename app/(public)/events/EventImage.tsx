'use client';

import Image from 'next/image';
import { parseEventImages } from '@/lib/utils';

interface EventImageProps {
  src?: string | null;
  alt: string;
  className?: string;
}

export default function EventImage({ src, alt, className }: EventImageProps) {
  const { coverUrl } = parseEventImages(src);

  if (!coverUrl) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
        <div className="text-purple-400 text-4xl">📅</div>
      </div>
    );
  }

  // Local uploads start with '/' — use Next.js Image for auto WebP/AVIF conversion.
  // External URLs (https://) are also handled via remotePatterns in next.config.mjs.
  return (
    <div className="relative w-full h-full">
      <Image
        src={coverUrl}
        alt={alt}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        className={`object-cover ${className ?? ''}`}
        onError={() => {/* handled by CSS fallback below */}}
      />
      <div className="fallback-placeholder absolute inset-0 w-full h-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center hidden">
        <div className="text-purple-400 text-4xl">📅</div>
      </div>
    </div>
  );
}
