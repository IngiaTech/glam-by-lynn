"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

/**
 * Admin segment error boundary.
 *
 * Catches render errors within any /admin page and shows a scoped fallback
 * inside the admin layout (the sidebar/chrome stay intact), rather than
 * replacing the whole screen with the root error page.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error("Admin error:", error);
    }
    // TODO: report to error tracking service
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md space-y-5 text-center">
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-5">
            <AlertTriangle className="h-12 w-12 text-destructive" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">
            Something went wrong
          </h2>
          <p className="text-muted-foreground">
            This admin page failed to load. You can retry, or navigate elsewhere
            using the sidebar.
          </p>
        </div>
        {process.env.NODE_ENV === "development" && (
          <div className="rounded-lg border border-destructive bg-destructive/5 p-4 text-left">
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
        <Button onClick={reset} size="lg">
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </div>
    </div>
  );
}
