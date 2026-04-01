"use client";

import { useEffect, useRef } from 'react';
import QRCode from 'qr-code-styling';

/** Size used on the ticket page (web display) */
const DISPLAY_SIZE = 280;

/** Size used when generating the PDF (higher res for print quality) */
const PRINT_SIZE = 400;

interface TicketQrProps {
  data: string;
  /** Pass size="print" when generating the PDF to get a larger, print-quality QR */
  size?: 'display' | 'print';
}

export function TicketQr({ data, size = 'display' }: TicketQrProps) {
  const px = size === 'print' ? PRINT_SIZE : DISPLAY_SIZE;
  const ref = useRef<HTMLDivElement | null>(null);
  const qrRef = useRef<any | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    // Always clear the container and recreate — ensures style changes
    // (color, type) always take effect and never get stuck on a cached instance.
    ref.current.innerHTML = '';
    qrRef.current = null;

    qrRef.current = new QRCode({
      width: px,
      height: px,
      type: 'svg',
      data: data,
      dotsOptions: {
        color: '#000000',
        type: 'square'
      },
      cornersSquareOptions: {
        color: '#000000',
        type: 'extra-rounded'
      },
      cornersDotOptions: {
        color: '#000000'
      },
      backgroundOptions: {
        color: '#ffffff'
      },
      qrOptions: {
        errorCorrectionLevel: 'M'
      }
    });
    qrRef.current.append(ref.current);
  }, [data, px]);

  return (
    <div
      ref={ref}
      style={{ width: px, height: px }}
      aria-label="Ticket QR code"
    />
  );
}
