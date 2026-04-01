"use client";

import ErrorReporter from "@/components/ErrorReporter";
import { reportClientError } from "@/lib/client/report-client-error";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError({
      source: "global-error",
      message: error?.message,
      stack: error?.stack,
      digest: (error as any)?.digest,
    });
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        <ErrorReporter />
        <div className="mx-auto max-w-2xl px-6 py-16">
          <h1 className="text-2xl font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm text-gray-600">
            The error was logged. Try refreshing, or use the button below.
          </p>
          <button
            type="button"
            className="mt-6 rounded bg-black px-4 py-2 text-sm font-medium text-white"
            onClick={() => reset()}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}

