"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, Clock3, ScanLine, User, X } from 'lucide-react';
import { toast } from 'sonner';

const QRScanner = dynamic(() => import('./QRScanner'), { ssr: false });

type ScanFeedback = {
  kind: 'success' | 'warning' | 'error';
  title: string;
  detail: string;
  timestamp: number;
};

type ScanPreview = {
  scannedText: string;
  registrationId: string;
  registrationStatus: string;
  entryCode?: string | null;
  event: {
    id: string;
    title: string;
  } | null;
  user: {
    id: string;
    full_name: string;
    email: string | null;
    phone_number: string | null;
    university: string | null;
  } | null;
  alreadyCheckedIn: boolean;
};

const REFRESH_EVERY_SUCCESSFUL_SCANS = 10;
const SCAN_COOLDOWN_MS = 450;
const FEEDBACK_VISIBLE_MS = 2200;

export default function QRModalButton({
  eventId,
  scanMode = 'fast',
  buttonLabel,
  className,
}: {
  eventId?: string | null;
  scanMode?: 'fast' | 'slow';
  buttonLabel?: string;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<ScanFeedback | null>(null);
  const [preview, setPreview] = useState<ScanPreview | null>(null);
  const [selectedEventName, setSelectedEventName] = useState<string | null>(null);
  const [successfulScans, setSuccessfulScans] = useState(0);
  const scanLockRef = useRef(false);
  const lastScanRef = useRef<{ text: string; expiresAt: number } | null>(null);

  const btnLabel = buttonLabel ?? 'Scan QR';
  const btnClass =
    className ?? 'rounded-full bg-purple-600 px-4 py-1 text-sm font-medium text-white hover:bg-purple-700';

  const resetScanState = useCallback(() => {
    scanLockRef.current = false;
    setBusy(false);
  }, []);

  const closeScanner = useCallback(() => {
    setOpen(false);
    setBusy(false);
    setCameraError(null);
    scanLockRef.current = false;
  }, []);

  useEffect(() => {
    if (!open) {
      setFeedback(null);
      setPreview(null);
      setCameraError(null);
      setSelectedEventName(null);
      resetScanState();
    }
  }, [open, resetScanState]);

  useEffect(() => {
    if (!feedback) return;
    const timeoutId = window.setTimeout(() => setFeedback(null), FEEDBACK_VISIBLE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [feedback]);

  useEffect(() => {
    if (!open) return;
    if (successfulScans > 0 && successfulScans % REFRESH_EVERY_SUCCESSFUL_SCANS === 0) {
      router.refresh();
    }
  }, [open, router, successfulScans]);

  const playTone = useCallback((mode: 'success' | 'warning' | 'error') => {
    try {
      const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const config =
        mode === 'success'
          ? { frequency: 1040, duration: 120 }
          : mode === 'warning'
            ? { frequency: 640, duration: 180 }
            : { frequency: 360, duration: 240 };

      oscillator.type = 'sine';
      oscillator.frequency.value = config.frequency;
      gain.gain.value = 0.05;
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();

      window.setTimeout(() => {
        oscillator.stop();
        void ctx.close();
      }, config.duration);
    } catch {
      // Ignore audio issues and keep the scan loop moving.
    }
  }, []);

  const vibrate = useCallback((mode: 'success' | 'warning' | 'error') => {
    if (!('vibrate' in navigator)) return;
    if (mode === 'success') navigator.vibrate([35, 20, 35]);
    else if (mode === 'warning') navigator.vibrate([40]);
    else navigator.vibrate([20, 20, 20]);
  }, []);

  const setCooldownForText = useCallback((text: string) => {
    lastScanRef.current = { text, expiresAt: Date.now() + SCAN_COOLDOWN_MS };
  }, []);

  const handleScan = useCallback(
    async (text: string) => {
      const trimmedText = text.trim();
      if (!trimmedText) return;

      const lastScan = lastScanRef.current;
      if (scanLockRef.current) return;
      if (lastScan && lastScan.text === trimmedText && lastScan.expiresAt > Date.now()) return;

      scanLockRef.current = true;
      setBusy(true);
      setCameraError(null);

      try {
        const response = await fetch('/api/checkin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: scanMode === 'slow' ? 'preview' : 'scan',
            text: trimmedText,
            eventId,
          }),
        });

        const result = await response.json();
        setCooldownForText(trimmedText);

        if (!response.ok) {
          throw new Error(result?.message || 'Scan failed');
        }

        if (scanMode === 'slow') {
          setSelectedEventName(result?.event?.title || 'Selected event');
          setPreview({
            scannedText: trimmedText,
            registrationId: result.registrationId,
            registrationStatus: result.registrationStatus,
            entryCode: result.entryCode,
            event: result.event ?? null,
            user: result.user ?? null,
            alreadyCheckedIn: !!result.alreadyCheckedIn,
          });
          return;
        }

        const attendeeName = result?.user?.full_name || 'Attendee';
        const eventTitle = result?.event?.title || 'Selected event';
        setSelectedEventName(eventTitle);

        if (result.status === 'checked_in') {
          setSuccessfulScans((count) => count + 1);
          setFeedback({
            kind: 'success',
            title: attendeeName,
            detail: `Checked in for ${eventTitle}`,
            timestamp: Date.now(),
          });
          playTone('success');
          vibrate('success');
        } else {
          setFeedback({
            kind: 'warning',
            title: attendeeName,
            detail: `Already checked in for ${eventTitle}`,
            timestamp: Date.now(),
          });
          playTone('warning');
          vibrate('warning');
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to scan QR code';
        setFeedback({
          kind: 'error',
          title: 'Scan failed',
          detail: message,
          timestamp: Date.now(),
        });
        playTone('error');
        vibrate('error');
        toast.error(message);
      } finally {
        window.setTimeout(() => {
          resetScanState();
        }, 75);
      }
    },
    [eventId, playTone, resetScanState, scanMode, setCooldownForText, vibrate],
  );

  const handleScannerError = useCallback((error: Error) => {
    setCameraError(error.message);
  }, []);

  const handleCancelPreview = useCallback(() => {
    if (!preview) return;
    setCooldownForText(preview.scannedText);
    setPreview(null);
    window.setTimeout(() => {
      resetScanState();
    }, 75);
  }, [preview, resetScanState, setCooldownForText]);

  const handleConfirmPreview = useCallback(async () => {
    if (!preview || preview.alreadyCheckedIn) return;

    try {
      const response = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm',
          registrationId: preview.registrationId,
        }),
      });

      const result = await response.json();
      setCooldownForText(preview.scannedText);

      if (!response.ok) {
        if (response.status === 409) {
          setFeedback({
            kind: 'warning',
            title: preview.user?.full_name || 'Attendee',
            detail: `Already checked in for ${preview.event?.title || 'Selected event'}`,
            timestamp: Date.now(),
          });
          playTone('warning');
          vibrate('warning');
        } else {
          throw new Error(result?.message || 'Failed to mark attendance');
        }
      } else {
        setSuccessfulScans((count) => count + 1);
        setFeedback({
          kind: 'success',
          title: result?.user?.full_name || preview.user?.full_name || 'Attendee',
          detail: `Checked in for ${result?.event?.title || preview.event?.title || 'Selected event'}`,
          timestamp: Date.now(),
        });
        playTone('success');
        vibrate('success');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to mark attendance';
      setFeedback({
        kind: 'error',
        title: 'Scan failed',
        detail: message,
        timestamp: Date.now(),
      });
      playTone('error');
      vibrate('error');
      toast.error(message);
    } finally {
      setPreview(null);
      window.setTimeout(() => {
        resetScanState();
      }, 75);
    }
  }, [playTone, preview, resetScanState, setCooldownForText, vibrate]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={btnClass}
      >
        {btnLabel}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 md:p-6">
          <div className="flex h-full w-full max-w-3xl flex-col overflow-hidden rounded-none bg-white shadow-2xl md:h-auto md:rounded-3xl">
            <div className="sticky top-0 z-20 flex items-start justify-between gap-4 border-b border-gray-100 bg-white px-4 py-4 md:static md:mb-4 md:border-b-0 md:p-6 md:pb-0">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Continuous QR Scanner</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Keep this window open and keep scanning. The camera stays live after each attendee.
                </p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-purple-600">
                  {eventId ? 'Locked to selected event' : 'Scanning across all visible events'}
                </p>
              </div>
              <button
                type="button"
                className="rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
                onClick={closeScanner}
                aria-label="Close scanner"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-24 pt-4 md:px-6 md:pb-6 md:pt-0">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="relative h-[56vh] min-h-[320px] overflow-hidden rounded-3xl bg-gray-950 sm:h-[60vh] sm:min-h-[360px]">
                <QRScanner
                  onScan={handleScan}
                  onError={handleScannerError}
                  paused={busy || !!preview}
                />
                <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent p-4 text-white">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <ScanLine className="h-4 w-4" />
                    {busy ? 'Processing scan...' : 'Ready for next attendee'}
                  </div>
                  <div className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                    {successfulScans} checked in
                  </div>
                </div>
                </div>

                <div className="flex flex-col gap-4 rounded-3xl border border-gray-100 bg-gray-50 p-4">
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Current mode</p>
                    <p className="mt-2 text-sm font-semibold text-gray-900">
                      {eventId ? 'Single event fast lane' : 'All events'}
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      {selectedEventName
                        ? `Last match: ${selectedEventName}`
                        : eventId
                          ? 'Only attendees from the selected event will be accepted.'
                          : 'Any valid attendee QR can be processed.'}
                    </p>
                  </div>

                  <div
                    className={`hidden rounded-2xl border p-4 lg:block ${
                      feedback?.kind === 'success'
                        ? 'border-emerald-200 bg-emerald-50'
                        : feedback?.kind === 'warning'
                          ? 'border-amber-200 bg-amber-50'
                          : feedback?.kind === 'error'
                            ? 'border-red-200 bg-red-50'
                            : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {feedback?.kind === 'success' ? (
                        <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                      ) : feedback?.kind === 'warning' ? (
                        <Clock3 className="mt-0.5 h-5 w-5 text-amber-600" />
                      ) : feedback?.kind === 'error' ? (
                        <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
                      ) : (
                        <ScanLine className="mt-0.5 h-5 w-5 text-purple-600" />
                      )}
                      <div>
                        <p className="text-sm font-bold text-gray-900">
                          {feedback?.title ?? 'Scanner is live'}
                        </p>
                        <p className="mt-1 text-sm text-gray-600">
                          {feedback?.detail ?? 'Show each attendee QR once. The scanner is ready for continuous use.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {cameraError && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                      Camera error: {cameraError}
                    </div>
                  )}

                  <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
                    <p className="font-semibold text-gray-900">Queue-speed tips</p>
                    <ul className="mt-2 space-y-2">
                      <li>Keep this scanner open for the entire event.</li>
                      <li>Use one device per entry lane while staying signed into the same admin account.</li>
                      <li>Hold each QR in frame for about 1 second, then move to the next attendee.</li>
                    </ul>
                  </div>
                </div>

                {preview && (
                  <div className="absolute inset-0 z-10 flex items-end bg-black/55 p-3 pb-24 md:p-4 md:pb-4">
                    <div className="w-full rounded-3xl bg-white p-5 shadow-2xl">
                      <div className="flex items-start gap-3">
                        <div className="rounded-2xl bg-purple-50 p-3 text-purple-600">
                          <User className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black uppercase tracking-[0.18em] text-purple-600">Confirm attendee</p>
                          <p className="mt-1 text-xl font-bold text-gray-900">
                            {preview.user?.full_name || 'Attendee'}
                          </p>
                          <p className="mt-1 text-sm text-gray-600">{preview.user?.email || 'No email provided'}</p>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl bg-gray-50 p-3">
                          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-400">Event</p>
                          <p className="mt-1 text-sm font-semibold text-gray-900">{preview.event?.title || 'Selected event'}</p>
                        </div>
                        <div className="rounded-2xl bg-gray-50 p-3">
                          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-400">Entry code</p>
                          <p className="mt-1 break-all text-sm font-semibold text-gray-900">{preview.entryCode || 'N/A'}</p>
                        </div>
                        <div className="rounded-2xl bg-gray-50 p-3">
                          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-400">Phone</p>
                          <p className="mt-1 text-sm font-semibold text-gray-900">{preview.user?.phone_number || 'Not provided'}</p>
                        </div>
                        <div className="rounded-2xl bg-gray-50 p-3">
                          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-gray-400">University</p>
                          <p className="mt-1 text-sm font-semibold text-gray-900">{preview.user?.university || 'Not provided'}</p>
                        </div>
                      </div>

                      {preview.alreadyCheckedIn && (
                        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
                          This attendee is already checked in.
                        </div>
                      )}

                      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <button
                          type="button"
                          onClick={handleCancelPreview}
                          className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleConfirmPreview}
                          disabled={preview.alreadyCheckedIn}
                          className="rounded-2xl bg-purple-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                        >
                          {preview.alreadyCheckedIn ? 'Already Marked Present' : 'Mark Present'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className={`fixed inset-x-3 bottom-3 z-[70] lg:hidden ${preview ? 'hidden' : ''}`}>
              <button
                type="button"
                onClick={closeScanner}
                className="w-full rounded-2xl bg-gray-950 px-4 py-3 text-sm font-bold text-white shadow-2xl"
              >
                Close Scanner
              </button>
            </div>

            {feedback && (
              <div className="pointer-events-none fixed inset-x-3 bottom-20 z-[60] lg:hidden">
                <div
                  className={`mx-auto max-w-xl rounded-3xl border px-4 py-4 shadow-2xl backdrop-blur ${
                    feedback.kind === 'success'
                      ? 'border-emerald-200 bg-emerald-500 text-white'
                      : feedback.kind === 'warning'
                        ? 'border-amber-200 bg-amber-400 text-gray-950'
                        : 'border-red-200 bg-red-500 text-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {feedback.kind === 'success' ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                    ) : feedback.kind === 'warning' ? (
                      <Clock3 className="mt-0.5 h-5 w-5 shrink-0" />
                    ) : (
                      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-black uppercase tracking-[0.16em]">
                        {feedback.kind === 'success'
                          ? 'Attendance marked'
                          : feedback.kind === 'warning'
                            ? 'Already checked in'
                            : 'Scan error'}
                      </p>
                      <p className="mt-1 text-base font-semibold leading-tight">{feedback.title}</p>
                      <p className="mt-1 text-sm opacity-95">{feedback.detail}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
