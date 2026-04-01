'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, Share2, Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import * as htmlToImage from 'html-to-image';
import jsPDF from 'jspdf';
import { BRAND_NAME } from '@/lib/brand';

interface TicketActionsProps {
  registrationId: string;
  eventTitle: string;
}

export function TicketActions({ registrationId, eventTitle }: TicketActionsProps) {
  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const shareData = {
      title: `My Ticket for ${eventTitle}`,
      text: `Hey! I'm attending ${eventTitle}. Check out my ticket pass.`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard!');
      }
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Button 
        variant="outline" 
        className="hidden sm:flex rounded-xl gap-2 border-gray-200" 
        onClick={handlePrint}
      >
        <Printer className="w-4 h-4" />
        Print
      </Button>
      <Button 
        variant="outline" 
        className="rounded-xl gap-2 border-gray-200"
        onClick={handleShare}
      >
        <Share2 className="w-4 h-4" />
        Share
      </Button>
    </div>
  );
}

export function DownloadButton() {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      const toastId = toast.loading('Preparing your official PDF pass...');
      
      const element = document.getElementById('ticket-pass-container');
      if (!element) {
        throw new Error('Ticket container not found');
      }

      // ── Force desktop layout for capture ──────────────────────────────────
      // On mobile the container stacks vertically (flex-col). We snapshot the
      // element after temporarily forcing it to the desktop side-by-side layout
      // so the PDF always looks correct regardless of screen size.
      const CAPTURE_WIDTH = 960; // fixed capture width in px
      const prevStyles: Record<string, string> = {
        display:       element.style.display,
        flexDirection: element.style.flexDirection,
        width:         element.style.width,
        minWidth:      element.style.minWidth,
        boxShadow:     element.style.boxShadow,
        borderRadius:  element.style.borderRadius,
        border:        element.style.border,
      };

      element.style.display       = 'flex';
      element.style.flexDirection = 'row';
      element.style.width         = `${CAPTURE_WIDTH}px`;
      element.style.minWidth      = `${CAPTURE_WIDTH}px`;
      element.style.boxShadow     = 'none';
      element.style.borderRadius  = '0px';
      element.style.border        = '2px solid #e2e8f0';

      // Force all direct children (image panel + QR panel) to show side-by-side
      const children = Array.from(element.children) as HTMLElement[];
      const prevChildFlex = children.map(c => ({ 
        flex: c.style.flex, 
        display: c.style.display,
        width: c.style.width,
        minWidth: c.style.minWidth
      }));

      // Force Left panel (Details) to take 60% and Right panel (QR) to take 40%
      // This ensures nothing collapses on mobile viewport during capture
      if (children.length >= 2) {
        children[0].style.display  = 'flex';
        children[0].style.flex     = '0 0 62%'; // Details
        children[0].style.width    = '62%';
        
        // Skip separator if it exists (length might be 3)
        const qrPanel = children[children.length - 1];
        qrPanel.style.display      = 'flex';
        qrPanel.style.flex         = '0 0 38%'; // QR Panel
        qrPanel.style.width        = '38%';
        qrPanel.style.minWidth     = '38%';

        // If there's a middle child (separator), ensure it's visible but small
        if (children.length === 3) {
          children[1].style.display = 'flex';
          children[1].style.width = '2px';
        }
      } else {
        children.forEach(c => {
          c.style.display = 'flex';
        });
      }

      const filter = (node: HTMLElement) => {
        if (node.id === 'pdf-exclude-buttons') return false;
        return true;
      };

      // 1. "Freeze" images to Base64 to bypass CORS and ensure they are ready for capture
      const imagesInElement = Array.from(element.querySelectorAll('img'));
      await Promise.all(imagesInElement.map(async (img) => {
        if (!img.src || img.src.startsWith('data:')) return;
        try {
          // Attempt to fetch and convert to base64
          const response = await fetch(img.src, { mode: 'cors' });
          if (response.ok) {
            const blob = await response.blob();
            const base64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
            img.src = base64;
          }
        } catch (e) {
          console.warn('Capture: Failed to pre-fetch image', img.src, e);
          // If fetch fails, we still have the original src + crossOrigin="anonymous" as a fallback
        }
      }));

      // 2. Short wait for layout stabilization (reduced from 1500ms)
      await new Promise(r => setTimeout(r, 500));

      // 3. Capture with optimized settings
      const imgData = await htmlToImage.toPng(element, { 
        quality: 0.95, // Slightly reduced quality for faster processing
        backgroundColor: '#ffffff',
        pixelRatio: 2, // Reduced from 3 for 50% faster processing, still high resolution
        width: CAPTURE_WIDTH,
        cacheBust: false, // Not needed as we frozen the images
        includeQueryParams: true,
        filter: filter
      });

      // ── Restore original styles ────────────────────────────────────────────
      Object.assign(element.style, prevStyles);
      children.forEach((c, i) => {
        c.style.flex     = prevChildFlex[i].flex;
        c.style.display  = prevChildFlex[i].display;
        c.style.width    = prevChildFlex[i].width;
        c.style.minWidth = prevChildFlex[i].minWidth;
      });

      // ── Build the A4 PDF ──────────────────────────────────────────────────
      const pageWidth  = 210;  // mm
      const pageHeight = 297;  // mm
      const margin     = 12;

      const pdf = new jsPDF('p', 'mm', 'a4');

      // ── Header ————————————————————————————————————————————————————————————
      pdf.setFillColor(248, 250, 252);
      pdf.rect(0, 0, pageWidth, 42, 'F');

      // Add university logo if possible
      try {
        const logoImg = new Image();
        logoImg.src = '/icon/U.V.-Patel-College-of-Engineering.png';
        await new Promise((resolve) => {
          logoImg.onload = resolve;
          logoImg.onerror = resolve; // Continue even if logo fails
        });
        if (logoImg.complete && logoImg.naturalHeight > 0) {
          // Add logo at top left
          pdf.addImage(logoImg, 'PNG', margin, 8, 30, 22);
        }
      } catch (e) {
        console.warn('Could not add logo to PDF:', e);
      }

      pdf.setTextColor(15, 23, 42);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(20);
      pdf.text('OFFICIAL E-TICKET', pageWidth / 2 + 10, 22, { align: 'center' });

      pdf.setTextColor(100, 116, 139);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text('Please present this document for scanning at the venue.', pageWidth / 2, 29, { align: 'center' });

      // Ticket image — always captured at CAPTURE_WIDTH so aspect ratio is stable
      const pdfWidth  = pageWidth - margin * 2;
      // We know the capture was CAPTURE_WIDTH px wide; get actual rendered height
      const rect = element.getBoundingClientRect();
      // Use the forced desktop aspect ratio: height should be based on CAPTURE_WIDTH
      // The captured image is CAPTURE_WIDTH × (original height at that width)
      // jsPDF places the captured PNG; figure height from img dimensions
      const tempImg = new Image();
      tempImg.src = imgData;
      await new Promise(r => { tempImg.onload = r; });
      const aspectRatio = tempImg.naturalHeight / tempImg.naturalWidth;
      const pdfHeight = pdfWidth * aspectRatio;

      const ticketY = 46;
      pdf.addImage(imgData, 'PNG', margin, ticketY, pdfWidth, pdfHeight);

      // Instructions
      const termsY = ticketY + pdfHeight + 16;
      pdf.setTextColor(15, 23, 42);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(13);
      pdf.text('IMPORTANT INSTRUCTIONS', margin, termsY);

      pdf.setTextColor(71, 85, 105);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9.5);

      const terms = [
        '• Present this ticket (printed or on your mobile device) at the main entrance.',
        '• This pass admits one person only and is strictly non-transferable.',
        '• Please arrive at least 15–30 minutes prior to the scheduled start time.',
        '• Right of admission is reserved by the event organizers and venue management.',
        '• Ensure your phone brightness is up if scanning from a digital screen.',
        '• Any duplication or tampering with this e-ticket will render it invalid.',
      ];

      let currentY = termsY + 9;
      terms.forEach(term => {
        pdf.text(term, margin, currentY);
        currentY += 6.5;
      });

      pdf.setTextColor(148, 163, 184);
      pdf.setFontSize(7.5);
      pdf.text(`Powered by ${BRAND_NAME}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

      pdf.save('Official-Ticket-Pass.pdf');
      toast.success('Official PDF ticket generated successfully!', { id: toastId });
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast.error(`Failed: ${error?.message || 'Unknown error occurred'}`);
    } finally {
      setIsDownloading(false);
    }
  };


  return (
    <Button 
      className="w-full h-14 bg-gray-900 hover:bg-black text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-gray-200 transform transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
      onClick={handleDownload}
      disabled={isDownloading}
    >
      {isDownloading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <Download className="w-5 h-5" />
      )}
      {isDownloading ? 'Generating Print Pass...' : 'Download Official PDF'}
    </Button>
  );
}
