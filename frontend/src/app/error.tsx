"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

/**
 * Global Error Page
 * Handles errors that occur during rendering in Next.js App Router
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console in development
    if (process.env.NODE_ENV === "development") {
      console.error("Global error:", error);
    }

    // TODO: Log error to error reporting service
    // logErrorToService(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        {/* Error Icon */}
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-6">
            <AlertTriangle className="h-16 w-16 text-destructive" />
          </div>
        </div>

        {/* Error Message */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Something Went Wrong
          </h1>
          <p className="text-muted-foreground">
            We encountered an unexpected error while loading this page. Please try again or return to the homepage.
          </p>
        </div>

        {/* Error Details (Development Only) */}
        {process.env.NODE_ENV === "development" && (
          <div className="rounded-lg border border-destructive bg-destructive/5 p-4 text-left">
            <p className="mb-2 text-sm font-semibold text-destructive">
              Error Details (Development Only):
            </p>
            <pre className="overflow-x-auto text-xs text-muted-foreground">
              {error.message}
            </pre>
            {error.digest && (
              <p className="mt-2 text-xs text-muted-foreground">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={reset} size="lg">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href="/">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </a>
          </Button>
        </div>

        {/* Help Text */}
        <div className="border-t border-border pt-6">
          <p className="text-sm text-muted-foreground">
            If this problem persists, please{" "}
            <a
              href="/contact"
              className="text-foreground underline underline-offset-4 hover:text-secondary"
            >
              contact support
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
