/**
 * Service detail server layout — owns the per-service `<meta>` tags so
 * social previews unfurl with real title/description/starting price next
 * to the auto-generated OpenGraph image. The page body is the client
 * component in `./page.tsx`.
 */

import type { Metadata } from "next";
import type { ReactNode } from "react";

import { API_BASE_URL, API_ENDPOINTS } from "@/config/api";
import { siteConfig } from "@/lib/metadata";
import { trimDescription } from "@/lib/og-templates";
import { getPackageTypeName } from "@/lib/services";
import type { ServicePackage } from "@/types";

async function getService(id: string): Promise<ServicePackage | null> {
  try {
    const res = await fetch(
      `${API_BASE_URL}${API_ENDPOINTS.SERVICES.DETAIL(id)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    return (await res.json()) as ServicePackage;
  } catch (error) {
    console.error("metadata service fetch failed", error);
    return null;
  }
}

function startingPrice(pkg: ServicePackage): number | null {
  const candidates = [
    pkg.base_bride_price,
    pkg.base_maid_price,
    pkg.base_mother_price,
    pkg.base_other_price,
  ]
    .map((p) => (p ? Number.parseFloat(p) : NaN))
    .filter((n) => Number.isFinite(n) && n > 0);
  return candidates.length ? Math.min(...candidates) : null;
}

function formatKsh(n: number): string {
  return `KSh ${Math.round(n).toLocaleString("en-KE")}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const pkg = await getService(id);

  if (!pkg) {
    return {
      title: "Service not available",
      description:
        "This service may have been removed. Browse all Glam by Lynn service packages.",
      robots: { index: false, follow: true },
    };
  }

  const price = startingPrice(pkg);
  const priceLine = price !== null ? `From ${formatKsh(price)}.` : null;
  const trimmedDesc = trimDescription(pkg.description, 160);
  const description = [
    priceLine,
    trimmedDesc || "Professional makeup service from Glam by Lynn.",
  ]
    .filter(Boolean)
    .join(" ");

  const canonical = `${siteConfig.url}/services/${pkg.id}`;
  const title = `${pkg.name} — ${getPackageTypeName(pkg.package_type)}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      title,
      description,
      url: canonical,
      siteName: siteConfig.name,
      locale: "en_KE",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      creator: "@glambylynn",
    },
    other: {
      ...(price !== null
        ? {
            "og:price:amount": String(price),
            "og:price:currency": "KES",
            "product:price:amount": String(price),
            "product:price:currency": "KES",
          }
        : {}),
      "product:category": getPackageTypeName(pkg.package_type),
    },
  };
}

export default function ServiceLayout({ children }: { children: ReactNode }) {
  return children;
}
