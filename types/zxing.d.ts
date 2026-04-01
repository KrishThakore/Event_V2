declare module '@zxing/browser' {
  // Minimal type declarations for the pieces of @zxing/browser that we use.
  // These are intentionally small to avoid shipping a large handwritten typing.

  export class NotFoundException extends Error {}

  export interface Result {
    getText(): string;
    getRawBytes?(): Uint8Array;
  }

  export class BrowserMultiFormatReader {
    constructor(hints?: any);
    decodeFromVideoDevice(
      deviceIdOrConstraint?: MediaDeviceInfo | string | undefined,
      videoElement?: HTMLVideoElement | null,
      callback?: (result: Result | null, error: any) => void,
    ): Promise<void>;
    decodeFromImageElement(imageEl: HTMLImageElement): Promise<Result>;
    reset(): void;
  }

  export { BrowserMultiFormatReader as default };
}
