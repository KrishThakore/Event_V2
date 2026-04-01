"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/client/report-client-error";

export default function ErrorReporter() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      reportClientError({
        source: "window.error",
        message: event.error?.message ?? event.message,
        stack: event.error?.stack,
        extra: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason as any;
      reportClientError({
        source: "unhandledrejection",
        message: typeof reason === "string" ? reason : reason?.message ?? "Unhandled promise rejection",
        stack: reason?.stack,
        extra: { reason },
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}

