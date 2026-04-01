import type { Metadata } from 'next';
import { ReactNode } from 'react';

import { BRAND_DESCRIPTION, BRAND_NAME, BRAND_PLATFORM_LABEL } from '@/lib/brand';

export const metadata: Metadata = {
  title: BRAND_NAME,
  description: BRAND_DESCRIPTION || BRAND_PLATFORM_LABEL,
};

export default function PublicLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
