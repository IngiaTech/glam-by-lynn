"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MessageCircle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { API_BASE_URL, API_ENDPOINTS } from "@/config/api";
import { cn } from "@/lib/utils";

export type WhatsAppContext =
  | { type: "product"; product_id: string; quantity?: number }
  | { type: "service"; service_id: string; preferred_date?: string }
  | { type: "cart"; items: Array<{ product_id: string; quantity: number }> }
  | { type: "general" };

type Variant = "primary" | "outline" | "icon" | "link";

interface WhatsAppButtonProps {
  context: WhatsAppContext;
  variant?: Variant;
  label?: string;
  className?: string;
  size?: "sm" | "default" | "lg";
  disabled?: boolean;
  onContextError?: (message: string) => void;
}

const WhatsAppGlyph = ({ className }: { className?: string }) => (
  <MessageCircle className={className} aria-hidden="true" />
);

export function WhatsAppButton({
  context,
  variant = "outline",
  label = "Chat on WhatsApp",
  className,
  size = "default",
  disabled,
  onContextError,
}: WhatsAppButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loading || disabled) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.WHATSAPP.LINK}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(context),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        const message =
          (detail && (detail.detail as string)) ||
          "Unable to open WhatsApp right now. Please try again.";
        if (res.status === 503) {
          onContextError?.(message);
        }
        toast.error(message);
        return;
      }
      const data = (await res.json()) as { url: string };
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("WhatsApp link error", error);
      toast.error("Unable to open WhatsApp right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={loading || disabled}
        aria-label={label}
        className={cn(
          "inline-flex items-center justify-center rounded-full bg-[#25D366] text-white shadow-sm transition hover:bg-[#1ebe57] disabled:opacity-60",
          "h-9 w-9",
          className,
        )}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <WhatsAppGlyph className="h-4 w-4" />
        )}
      </button>
    );
  }

  if (variant === "link") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={loading || disabled}
        className={cn(
          "inline-flex items-center gap-1.5 text-sm font-medium text-[#1ebe57] hover:underline disabled:opacity-60",
          className,
        )}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <WhatsAppGlyph className="h-3.5 w-3.5" />
        )}
        {label}
      </button>
    );
  }

  const isPrimary = variant === "primary";

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={loading || disabled}
      size={size}
      variant={isPrimary ? "default" : "outline"}
      className={cn(
        isPrimary
          ? "bg-[#25D366] text-white hover:bg-[#1ebe57]"
          : "border-[#25D366] text-[#1ebe57] hover:bg-[#25D366]/10",
        className,
      )}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <WhatsAppGlyph className="h-4 w-4" />
      )}
      {label}
    </Button>
  );
}

export default WhatsAppButton;
