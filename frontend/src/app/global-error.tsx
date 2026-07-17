"use client";

import { useEffect } from "react";

/**
 * Root error boundary.
 *
 * Catches errors thrown in the root layout itself — the one place the normal
 * app/error.tsx cannot cover. It replaces the entire document, so it renders
 * its own <html>/<body> with self-contained inline styles (the app shell may
 * be the thing that failed).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error("Root layout error:", error);
    }
    // TODO: report to error tracking service
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          background: "#ffffff",
          color: "#171717",
          padding: "1rem",
        }}
      >
        <div style={{ maxWidth: "28rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            Something went wrong
          </h1>
          <p style={{ color: "#6b7280", marginBottom: "1.5rem", lineHeight: 1.5 }}>
            We hit an unexpected error. Please try again, or return to the
            homepage.
          </p>
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={reset}
              style={{
                cursor: "pointer",
                borderRadius: "0.5rem",
                border: "none",
                background: "#171717",
                color: "#ffffff",
                padding: "0.625rem 1.25rem",
                fontSize: "0.95rem",
              }}
            >
              Try Again
            </button>
            <a
              href="/"
              style={{
                borderRadius: "0.5rem",
                border: "1px solid #d1d5db",
                color: "#171717",
                padding: "0.625rem 1.25rem",
                fontSize: "0.95rem",
                textDecoration: "none",
              }}
            >
              Go Home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
