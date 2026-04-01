import { Suspense } from 'react';
import OtpClient from './OtpClient';

export default function OtpPage() {
  return (
    <Suspense>
      <OtpClient />
    </Suspense>
  );
}
