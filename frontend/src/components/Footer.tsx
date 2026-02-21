"use client";

import Link from "next/link";
import { useState } from "react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Facebook, Instagram, Twitter, Youtube, Smartphone } from "lucide-react";
import { usePublicSettings } from "@/hooks/usePublicSettings";

export function Footer() {
  const currentYear = new Date().getFullYear();
  const [email, setEmail] = useState("");
  const [subscribeStatus, setSubscribeStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const { settings: publicSettings } = usePublicSettings();

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setSubscribeStatus("loading");
    // TODO: Implement newsletter subscription API call
    // For now, just simulate success
    setTimeout(() => {
      setSubscribeStatus("success");
      setEmail("");
      setTimeout(() => setSubscribeStatus("idle"), 3000);
    }, 1000);
  };

  return (
    <footer className="bg-black text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand & Newsletter */}
          <div className="space-y-4 md:col-span-1">
            <h3 className="text-lg font-bold">
              <span className="text-white">Glam by </span>
              <span className="text-[#FFB6C1]">Lynn</span>
            </h3>
            <p className="text-sm text-white/70">
              Professional makeup services and premium beauty products for every occasion.
            </p>

            {/* Newsletter Signup - only shown when enabled by admin */}
            {publicSettings.enable_newsletter && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-[#FFB6C1]">Subscribe to our newsletter</h4>
              <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/50"
                  disabled={subscribeStatus === "loading"}
                  required
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={subscribeStatus === "loading"}
                  className="shrink-0 bg-pink-gradient hover:opacity-90 text-white border-0"
                >
                  <Mail className="h-4 w-4" />
                </Button>
              </form>
              {subscribeStatus === "success" && (
                <p className="text-xs text-[#FFB6C1]">Successfully subscribed!</p>
              )}
              {subscribeStatus === "error" && (
                <p className="text-xs text-red-400">Failed to subscribe. Please try again.</p>
              )}
            </div>
            )}

            {/* Social Media Links - only shown when at least one URL is set */}
            {(publicSettings.social_facebook || publicSettings.social_instagram || publicSettings.social_twitter || publicSettings.social_youtube) && (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-[#FFB6C1]">Follow Us</h4>
              <div className="flex gap-3">
                {publicSettings.social_facebook && (
                <Link
                  href={publicSettings.social_facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/70 hover:text-[#FFB6C1] transition-colors"
                  aria-label="Facebook"
                >
                  <Facebook className="h-5 w-5" />
                </Link>
                )}
                {publicSettings.social_instagram && (
                <Link
                  href={publicSettings.social_instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/70 hover:text-[#FFB6C1] transition-colors"
                  aria-label="Instagram"
                >
                  <Instagram className="h-5 w-5" />
                </Link>
                )}
                {publicSettings.social_twitter && (
                <Link
                  href={publicSettings.social_twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/70 hover:text-[#FFB6C1] transition-colors"
                  aria-label="Twitter"
                >
                  <Twitter className="h-5 w-5" />
                </Link>
                )}
                {publicSettings.social_tiktok && (
                <Link
                  href={publicSettings.social_tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/70 hover:text-[#FFB6C1] transition-colors"
                  aria-label="TikTok"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V8.73a8.19 8.19 0 004.76 1.52v-3.4a4.85 4.85 0 01-1-.16z"/>
                  </svg>
                </Link>
                )}
                {publicSettings.social_youtube && (
                <Link
                  href={publicSettings.social_youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/70 hover:text-[#FFB6C1] transition-colors"
                  aria-label="YouTube"
                >
                  <Youtube className="h-5 w-5" />
                </Link>
                )}
              </div>
            </div>
            )}
          </div>

          {/* Services */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-[#FFB6C1]">Services</h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li>
                <Link href="/services#bridal" className="hover:text-[#FFB6C1] transition-colors">
                  Bridal Makeup
                </Link>
              </li>
              <li>
                <Link href="/services#events" className="hover:text-[#FFB6C1] transition-colors">
                  Special Events
                </Link>
              </li>
              <li>
                <Link href="/services#classes" className="hover:text-[#FFB6C1] transition-colors">
                  Makeup Classes
                </Link>
              </li>
              <li>
                <Link href="/services#consultations" className="hover:text-[#FFB6C1] transition-colors">
                  Consultations
                </Link>
              </li>
            </ul>
          </div>

          {/* Shop */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-[#FFB6C1]">Shop</h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li>
                <Link href="/products" className="hover:text-[#FFB6C1] transition-colors">
                  All Products
                </Link>
              </li>
              <li>
                <Link href="/products?category=makeup" className="hover:text-[#FFB6C1] transition-colors">
                  Makeup
                </Link>
              </li>
              <li>
                <Link href="/products?category=skincare" className="hover:text-[#FFB6C1] transition-colors">
                  Skincare
                </Link>
              </li>
              <li>
                <Link href="/products?category=tools" className="hover:text-[#FFB6C1] transition-colors">
                  Tools & Brushes
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-[#FFB6C1]">Company</h4>
            <ul className="space-y-2 text-sm text-white/70">
              <li>
                <Link href="/about" className="hover:text-[#FFB6C1] transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/gallery" className="hover:text-[#FFB6C1] transition-colors">
                  Gallery
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-[#FFB6C1] transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-[#FFB6C1] transition-colors">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <Separator className="my-8 bg-white/20" />

        {/* Bottom */}
        <div className="space-y-4">
          <div className="flex flex-col items-center justify-between gap-4 text-sm text-white/70 md:flex-row">
            <p>&copy; {currentYear} Glam by Lynn. All rights reserved.</p>
            <p className="text-white/50">Building the future of beauty in Kenya</p>
            <div className="flex gap-6">
              <Link href="/privacy" className="hover:text-[#FFB6C1] transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-[#FFB6C1] transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="flex flex-col items-center gap-3 border-t border-white/10 pt-4 md:flex-row md:justify-between">
            <p className="text-xs text-white/50">We accept:</p>
            <div className="flex items-center gap-4">
              {/* M-Pesa */}
              <div className="flex items-center gap-1.5 rounded-md border border-white/20 bg-white/5 px-3 py-1.5">
                <Smartphone className="h-4 w-4 text-green-400" />
                <span className="text-xs font-semibold text-green-400">M-PESA</span>
              </div>

              {/* Cash */}
              <div className="rounded-md border border-white/20 bg-white/5 px-3 py-1.5">
                <span className="text-xs font-medium text-white/70">Cash</span>
              </div>

              {/* Bank Transfer */}
              <div className="rounded-md border border-white/20 bg-white/5 px-3 py-1.5">
                <span className="text-xs font-medium text-white/70">Bank Transfer</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
