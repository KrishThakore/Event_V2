"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/client/report-client-error";

export default function NotFoundReporter() {
  useEffect(() => {
    reportClientError({
      source: "not-found",
      message: "404 Not Found",
      href: typeof location !== "undefined" ? location.href : undefined,
    });
  }, []);

  return null;
}
