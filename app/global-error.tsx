"use client";

import NextError from "next/error";
import posthog from "posthog-js";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  useEffect(() => {
    posthog.captureException(error);
  }, [error]);

  return (
    <html lang="fr">
      <body>
        <NextError statusCode={0} />
        <button type="button" onClick={reset}>
          Réessayer
        </button>
      </body>
    </html>
  );
}
