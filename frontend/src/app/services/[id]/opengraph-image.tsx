/**
 * Service Detail OpenGraph Image
 *
 * Renders a 1200×630 social preview with the service name, type badge,
 * starting price, and a sentence-trimmed description.
 */

import { ImageResponse } from "@vercel/og";

import { API_BASE_URL, API_ENDPOINTS } from "@/config/api";
import {
  OG_SIZE,
  ServiceOGTemplate,
  GenericPageOGTemplate,
  trimDescription,
} from "@/lib/og-templates";
import { getPackageTypeName } from "@/lib/services";
import type { ServicePackage } from "@/types";

export const runtime = "edge";
export const alt = "Service - Glam by Lynn";
export const size = OG_SIZE;
export const contentType = "image/png";

async function getService(id: string): Promise<ServicePackage | null> {
  try {
    const res = await fetch(
      `${API_BASE_URL}${API_ENDPOINTS.SERVICES.DETAIL(id)}`,
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    return (await res.json()) as ServicePackage;
  } catch (error) {
    console.error("OG service fetch failed", error);
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

function durationLabel(pkg: ServicePackage): string | undefined {
  if (!pkg.duration_minutes) return undefined;
  const m = pkg.duration_minutes;
  if (m >= 1440) {
    const days = Math.floor(m / 1440);
    return `${days} day${days > 1 ? "s" : ""}`;
  }
  const hours = Math.floor(m / 60);
  const minutes = m % 60;
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}min`;
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""}`;
  return `${minutes} min`;
}

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pkg = await getService(id);

  if (!pkg) {
    return new ImageResponse(
      (
        <GenericPageOGTemplate
          title="Service not available"
          description="This service may have been removed. Browse the full Glam by Lynn catalogue at glambylynn.com."
        />
      ),
      { ...size },
    );
  }

  const price = startingPrice(pkg);
  return new ImageResponse(
    (
      <ServiceOGTemplate
        name={pkg.name}
        description={trimDescription(pkg.description, 180)}
        packageType={getPackageTypeName(pkg.package_type)}
        startingPrice={price !== null ? formatKsh(price) : undefined}
        durationLabel={durationLabel(pkg)}
      />
    ),
    { ...size },
  );
}
