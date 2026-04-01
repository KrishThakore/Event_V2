import type { Metadata } from 'next';
import { ReactNode } from 'react';

import { BRAND_NAME, BRAND_PLATFORM_LABEL } from '@/lib/brand';

export const metadata: Metadata = {
  title: `${BRAND_NAME} Organizer`,
  description: `Organizer tools for ${BRAND_PLATFORM_LABEL}`,
};

export default function OrganizerLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
