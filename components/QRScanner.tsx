"use client";

import React, { useEffect, useRef } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';

type BarcodeDetectorResult = {
  rawValue?: string;
};

type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => {
  detect: (source: CanvasImageSource) => Promise<BarcodeDetectorResult[]>;
};

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorCtor;
  }
}

export type QRScannerProps = {
  onScan: (text: string) => void;
  onDetect?: (text: string) => void;
  onError?: (err: Error) => void;
  paused?: boolean;
  constraints?: MediaTrackConstraints;
  preferredDeviceId?: string | null;
};

const DEFAULT_CONSTRAINTS: MediaTrackConstraints = {
  facingMode: { ideal: 'environment' },
  width: { ideal: 1280 },
  height: { ideal: 720 },
  frameRate: { ideal: 30, min: 24 },
};

type ScanRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export default function QRScanner({
  onScan,
  onDetect,
  onError,
  paused,
  constraints,
  preferredDeviceId,
}: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const onScanRef = useRef(onScan);
  const onDetectRef = useRef(onDetect);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    onDetectRef.current = onDetect;
  }, [onDetect]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    if (paused) return;

    let active = true;
    let stream: MediaStream | null = null;
    let animationFrameId = 0;
    let detectionInFlight = false;
    const scanCanvas = document.createElement('canvas');
    const scanContext = scanCanvas.getContext('2d', { willReadFrequently: true });

    const emitError = (error: unknown) => {
      const nextError = error instanceof Error ? error : new Error('QR scanner failed');
      onErrorRef.current?.(nextError);
    };

    const startNativeDetector = async () => {
      if (!videoRef.current || !window.BarcodeDetector) return false;

      const videoConstraints = preferredDeviceId
        ? { ...DEFAULT_CONSTRAINTS, ...constraints, deviceId: { exact: preferredDeviceId } }
        : { ...DEFAULT_CONSTRAINTS, ...constraints };

      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: videoConstraints,
      });

      videoRef.current.srcObject = stream;
      videoRef.current.muted = true;
      videoRef.current.playsInline = true;
      await videoRef.current.play();

      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });

      const scanFrame = async () => {
        if (!active || !videoRef.current) return;

        if (detectionInFlight) {
          animationFrameId = window.requestAnimationFrame(scanFrame);
          return;
        }

        try {
          if (videoRef.current.readyState >= 2) {
            const video = videoRef.current;
            const sourceWidth = video.videoWidth || 0;
            const sourceHeight = video.videoHeight || 0;

            if (!sourceWidth || !sourceHeight || !scanContext) {
              animationFrameId = window.requestAnimationFrame(scanFrame);
              return;
            }

            detectionInFlight = true;
            const regions: ScanRegion[] = [
              { x: 0, y: 0, width: sourceWidth, height: sourceHeight },
              {
                x: Math.round(sourceWidth * 0.08),
                y: Math.round(sourceHeight * 0.08),
                width: Math.round(sourceWidth * 0.84),
                height: Math.round(sourceHeight * 0.84),
              },
              {
                x: Math.round(sourceWidth * 0.18),
                y: Math.round(sourceHeight * 0.16),
                width: Math.round(sourceWidth * 0.64),
                height: Math.round(sourceHeight * 0.68),
              },
            ];

            let code: string | undefined;

            for (const region of regions) {
              scanCanvas.width = region.width;
              scanCanvas.height = region.height;
              scanContext.clearRect(0, 0, region.width, region.height);
              scanContext.drawImage(
                video,
                region.x,
                region.y,
                region.width,
                region.height,
                0,
                0,
                region.width,
                region.height,
              );

              const barcodes = await detector.detect(scanCanvas);
              code = barcodes.find((item) => item.rawValue?.trim())?.rawValue?.trim();
              if (code) break;
            }

            if (code) {
              onDetectRef.current?.(code);
              onScanRef.current(code);
            }
          }
        } catch (error) {
          emitError(error);
        } finally {
          detectionInFlight = false;
        }

        if (active) {
          animationFrameId = window.requestAnimationFrame(scanFrame);
        }
      };

      animationFrameId = window.requestAnimationFrame(scanFrame);
      return true;
    };

    const startZxingFallback = async () => {
      if (!videoRef.current) return;

      const codeReader = new BrowserMultiFormatReader();
      codeReaderRef.current = codeReader;

      await codeReader.decodeFromVideoDevice(preferredDeviceId ?? undefined, videoRef.current, (result, error) => {
        if (!active) return;

        if (result) {
          const text = result.getText().trim();
          if (text) {
            onDetectRef.current?.(text);
            onScanRef.current(text);
          }
        }

        if (error && error.name !== 'NotFoundException') {
          emitError(error);
        }
      });
    };

    const start = async () => {
      try {
        const startedNative = await startNativeDetector().catch(() => false);
        if (!startedNative) {
          await startZxingFallback();
        }
      } catch (error) {
        emitError(error);
      }
    };

    void start();

    return () => {
      active = false;
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (codeReaderRef.current) {
        try {
          codeReaderRef.current.reset();
        } catch {
          // Ignore teardown failures.
        }
      }
    };
  }, [paused, constraints, preferredDeviceId]);

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <video ref={videoRef} className="h-full w-full rounded-md object-cover" />

      <div className="pointer-events-none absolute inset-0">
        <div className="relative h-full w-full">
          <div className="absolute left-4 top-4 h-12 w-12 rounded-tl-lg border-l-4 border-t-4 border-white" />
          <div className="absolute right-4 top-4 h-12 w-12 rounded-tr-lg border-r-4 border-t-4 border-white" />
          <div className="absolute bottom-4 left-4 h-12 w-12 rounded-bl-lg border-b-4 border-l-4 border-white" />
          <div className="absolute bottom-4 right-4 h-12 w-12 rounded-br-lg border-b-4 border-r-4 border-white" />

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="rounded-full bg-black/50 px-3 py-1 text-sm text-white">
              Position QR code here
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
