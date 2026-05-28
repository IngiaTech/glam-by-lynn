/**
 * Services OpenGraph Image
 *
 * Pulls the live service catalogue so the preview can quote a real
 * "from KSh X" starting price. Falls back to a static brand panel if the
 * API is unreachable.
 */

import { ImageResponse } from "@vercel/og";

import { API_BASE_URL, API_ENDPOINTS } from "@/config/api";
import {
  OG_SIZE,
  ServiceOGTemplate,
  GenericPageOGTemplate,
} from "@/lib/og-templates";
import type { ServicePackage } from "@/types";

export const runtime = "edge";
export const alt = "Makeup Services - Glam by Lynn";
export const size = OG_SIZE;
export const contentType = "image/png";

function lowestPrice(pkg: ServicePackage): number | null {
  const prices = [
    pkg.base_bride_price,
    pkg.base_maid_price,
    pkg.base_mother_price,
    pkg.base_other_price,
  ]
    .map((p) => (p ? Number.parseFloat(p) : NaN))
    .filter((n) => Number.isFinite(n) && n > 0);
  return prices.length ? Math.min(...prices) : null;
}

function formatKsh(n: number): string {
  return `KSh ${Math.round(n).toLocaleString("en-KE")}`;
}

async function getStartingPrice(): Promise<number | null> {
  try {
    const res = await fetch(`${API_BASE_URL}${API_ENDPOINTS.SERVICES.LIST}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const payload = (await res.json()) as ServicePackage[] | { items: ServicePackage[] };
    const items = Array.isArray(payload) ? payload : payload.items;
    if (!items?.length) return null;
    const all = items
      .filter((p) => p.is_active)
      .map(lowestPrice)
      .filter((p): p is number => p !== null);
    return all.length ? Math.min(...all) : null;
  } catch (error) {
    console.error("OG services fetch failed", error);
    return null;
  }
}

export default async function Image() {
  const startingPrice = await getStartingPrice();

  if (startingPrice === null) {
    return new ImageResponse(
      (
        <GenericPageOGTemplate
          title="Professional Makeup Services"
          description="Bridal, special-occasion, and editorial makeup in Kitui & Nairobi."
        />
      ),
      { ...size },
    );
  }

  return new ImageResponse(
    (
      <ServiceOGTemplate
        name="Professional Makeup Services"
        description="Bridal, special-occasion, and editorial makeup tailored to your day. Trusted by clients across Kitui and Nairobi."
        packageType="Services"
        startingPrice={formatKsh(startingPrice)}
        durationLabel="On-location available"
      />
    ),
    { ...size },
  );
}
