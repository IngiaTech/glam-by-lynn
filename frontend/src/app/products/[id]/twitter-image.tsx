/**
 * Product Detail Twitter Card Image
 *
 * Same artwork as the OpenGraph image so X / Twitter previews stay
 * consistent with WhatsApp, Facebook, and LinkedIn. Route segment config
 * is declared here directly because Next.js must statically parse it
 * (re-exports break the build).
 */

import { OG_SIZE } from "@/lib/og-templates";
import OpenGraphImage from "./opengraph-image";

export const runtime = "edge";
export const alt = "Product - Glam by Lynn";
export const size = OG_SIZE;
export const contentType = "image/png";

export default OpenGraphImage;
