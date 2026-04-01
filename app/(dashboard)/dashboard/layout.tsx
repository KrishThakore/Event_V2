import type { Metadata } from 'next';
import { ReactNode } from 'react';

import { BRAND_NAME, BRAND_PLATFORM_LABEL } from '@/lib/brand';

export const metadata: Metadata = {
  title: `${BRAND_NAME} Dashboard`,
  description: `Dashboard experience for ${BRAND_PLATFORM_LABEL}`,
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
