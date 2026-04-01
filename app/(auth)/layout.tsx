import type { Metadata } from 'next';
import { ReactNode } from 'react';

import { BRAND_NAME, BRAND_PLATFORM_LABEL } from '@/lib/brand';

export const metadata: Metadata = {
  title: `${BRAND_NAME} Auth`,
  description: `Authentication pages for ${BRAND_PLATFORM_LABEL}`,
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
