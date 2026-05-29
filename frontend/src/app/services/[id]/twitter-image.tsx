/**
 * Service Detail Twitter Card Image — reuses the OG artwork. Route segment
 * config is declared here directly because Next.js must statically parse
 * it (re-exports break the build).
 */

import { OG_SIZE } from "@/lib/og-templates";
import OpenGraphImage from "./opengraph-image";

export const runtime = "edge";
export const alt = "Service - Glam by Lynn";
export const size = OG_SIZE;
export const contentType = "image/png";

export default OpenGraphImage;
