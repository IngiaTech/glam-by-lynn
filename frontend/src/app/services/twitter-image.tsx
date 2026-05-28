/**
 * Services Twitter Card Image — same artwork as the OG image. Route
 * segment config must be declared directly (re-exports cannot be
 * statically parsed by Next.js).
 */

import { OG_SIZE } from "@/lib/og-templates";
import OpenGraphImage from "./opengraph-image";

export const runtime = "edge";
export const alt = "Makeup Services - Glam by Lynn";
export const size = OG_SIZE;
export const contentType = "image/png";

export default OpenGraphImage;
