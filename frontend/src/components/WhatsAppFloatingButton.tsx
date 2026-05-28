"use client";

import { usePathname } from "next/navigation";

import { WhatsAppButton } from "@/components/WhatsAppButton";

export function WhatsAppFloatingButton() {
  const pathname = usePathname() ?? "";

  if (pathname.startsWith("/admin")) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 sm:bottom-6 sm:right-6">
      <WhatsAppButton
        context={{ type: "general" }}
        variant="icon"
        label="Chat with Glam by Lynn on WhatsApp"
        className="h-14 w-14 shadow-lg [&_svg]:h-6 [&_svg]:w-6"
      />
    </div>
  );
}

export default WhatsAppFloatingButton;
