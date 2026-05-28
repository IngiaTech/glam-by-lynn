/**
 * OpenGraph Image Templates
 *
 * Reusable templates rendered by @vercel/og's `ImageResponse`. JSX here is
 * a small Yoga-style subset — no flex `gap`, `display: 'flex'` required on
 * every container, no nested text spans without explicit display, etc.
 */

import { CSSProperties } from "react";

export const brandColors = {
  background: "#000000",
  surface: "#0F0F10",
  surfaceMuted: "#1A1A1C",
  foreground: "#FFFFFF",
  secondary: "#FFB6C1", // Light Pink
  secondaryDeep: "#E091A6",
  muted: "#D7D7D7",
  mutedSubtle: "#9C9C9E",
  success: "#22C55E",
  danger: "#F87171",
};

export const OG_SIZE = { width: 1200, height: 630 } as const;

const fontStack = "Inter, system-ui, -apple-system, sans-serif";

/**
 * Trim a description to a sentence-boundary near `max` characters. Avoids
 * the classic "cut mid-word" ugliness in social previews.
 */
export function trimDescription(text: string | undefined | null, max = 160): string {
  if (!text) return "";
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const slice = clean.slice(0, max + 1);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice.slice(0, max);
  return cut.replace(/[,;:.\-–—]+$/, "") + "…";
}

/** Brand wordmark used in the corner of every template. */
function Wordmark({ size = 36 }: { size?: number }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        fontSize: size,
        fontWeight: 700,
        letterSpacing: "-0.02em",
        color: brandColors.foreground,
      }}
    >
      <span style={{ display: "flex" }}>Glam by&nbsp;</span>
      <span style={{ display: "flex", color: brandColors.secondary }}>Lynn</span>
    </div>
  );
}

function LocationStrip() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        fontSize: 22,
        color: brandColors.mutedSubtle,
      }}
    >
      <span style={{ display: "flex" }}>📍 Kitui &amp; Nairobi, Kenya</span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Product template — left half: hero image; right half: name/price/desc.    */
/* -------------------------------------------------------------------------- */

interface ProductTemplateProps {
  name: string;
  description: string;
  price: string;
  comparePrice?: string;
  category?: string;
  brand?: string;
  inStock: boolean;
  imageUrl?: string;
}

const productStyles: Record<string, CSSProperties> = {
  root: {
    display: "flex",
    flexDirection: "row",
    width: "100%",
    height: "100%",
    backgroundColor: brandColors.background,
    fontFamily: fontStack,
  },
  imagePane: {
    display: "flex",
    width: 540,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: brandColors.surfaceMuted,
    position: "relative",
    overflow: "hidden",
  },
  imageGlow: {
    position: "absolute",
    top: -180,
    left: -180,
    width: 600,
    height: 600,
    borderRadius: 600,
    background: `radial-gradient(circle, ${brandColors.secondary}33 0%, transparent 70%)`,
    display: "flex",
  },
  productImage: {
    display: "flex",
    width: "92%",
    height: "92%",
    objectFit: "contain" as const,
    zIndex: 1,
  },
  imagePlaceholder: {
    display: "flex",
    fontSize: 140,
    color: brandColors.secondary,
    zIndex: 1,
  },
  infoPane: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    padding: "56px 60px",
    backgroundColor: brandColors.background,
  },
  headerRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 36,
  },
  pillRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 18,
    flexShrink: 0,
  },
  categoryPill: {
    display: "flex",
    padding: "8px 18px",
    backgroundColor: brandColors.secondary,
    color: brandColors.background,
    fontSize: 22,
    fontWeight: 600,
    borderRadius: 999,
    marginRight: 12,
  },
  brandPill: {
    display: "flex",
    padding: "8px 18px",
    backgroundColor: "transparent",
    border: `2px solid ${brandColors.surfaceMuted}`,
    color: brandColors.muted,
    fontSize: 22,
    fontWeight: 600,
    borderRadius: 999,
  },
  productName: {
    display: "flex",
    fontSize: 54,
    fontWeight: 700,
    letterSpacing: "-0.02em",
    color: brandColors.foreground,
    lineHeight: 1.1,
    marginBottom: 22,
    flexShrink: 0,
    maxHeight: 144,
    overflow: "hidden",
  },
  description: {
    display: "flex",
    fontSize: 24,
    color: brandColors.muted,
    lineHeight: 1.4,
    marginBottom: 28,
    flexShrink: 0,
    maxHeight: 138,
    overflow: "hidden",
  },
  priceRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 12,
    flexShrink: 0,
  },
  priceMain: {
    display: "flex",
    fontSize: 60,
    fontWeight: 700,
    letterSpacing: "-0.02em",
    color: brandColors.secondary,
    marginRight: 18,
  },
  priceCompare: {
    display: "flex",
    fontSize: 30,
    color: brandColors.mutedSubtle,
    textDecoration: "line-through",
  },
  footerRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: "auto",
    paddingTop: 28,
    borderTop: `1px solid ${brandColors.surfaceMuted}`,
  },
  stockBadgeOK: {
    display: "flex",
    padding: "8px 18px",
    backgroundColor: `${brandColors.success}26`,
    color: brandColors.success,
    fontSize: 22,
    fontWeight: 600,
    borderRadius: 999,
  },
  stockBadgeOut: {
    display: "flex",
    padding: "8px 18px",
    backgroundColor: `${brandColors.danger}26`,
    color: brandColors.danger,
    fontSize: 22,
    fontWeight: 600,
    borderRadius: 999,
  },
};

export function ProductOGTemplate({
  name,
  description,
  price,
  comparePrice,
  category,
  brand,
  inStock,
  imageUrl,
}: ProductTemplateProps) {
  return (
    <div style={productStyles.root}>
      {/* Image pane */}
      <div style={productStyles.imagePane}>
        <div style={productStyles.imageGlow} />
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" style={productStyles.productImage} />
        ) : (
          <div style={productStyles.imagePlaceholder}>✨</div>
        )}
      </div>

      {/* Info pane */}
      <div style={productStyles.infoPane}>
        <div style={productStyles.headerRow}>
          <Wordmark size={32} />
        </div>

        {(category || brand) && (
          <div style={productStyles.pillRow}>
            {category && <div style={productStyles.categoryPill}>{category}</div>}
            {brand && <div style={productStyles.brandPill}>{brand}</div>}
          </div>
        )}

        <div style={productStyles.productName}>{name}</div>

        {description && <div style={productStyles.description}>{description}</div>}

        <div style={productStyles.priceRow}>
          <div style={productStyles.priceMain}>{price}</div>
          {comparePrice && <div style={productStyles.priceCompare}>{comparePrice}</div>}
        </div>

        <div style={productStyles.footerRow}>
          <div style={inStock ? productStyles.stockBadgeOK : productStyles.stockBadgeOut}>
            {inStock ? "In Stock" : "Out of Stock"}
          </div>
          <LocationStrip />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Service template — single hero panel, no per-package image available.     */
/* -------------------------------------------------------------------------- */

interface ServiceTemplateProps {
  name: string;
  description: string;
  packageType?: string;
  startingPrice?: string;
  durationLabel?: string;
}

const serviceStyles: Record<string, CSSProperties> = {
  root: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    height: "100%",
    padding: 60,
    backgroundColor: brandColors.background,
    fontFamily: fontStack,
    position: "relative",
    overflow: "hidden",
  },
  glow: {
    position: "absolute",
    top: -200,
    right: -180,
    width: 720,
    height: 720,
    borderRadius: 720,
    background: `radial-gradient(circle, ${brandColors.secondary}33 0%, transparent 65%)`,
    display: "flex",
  },
  glowBL: {
    position: "absolute",
    bottom: -260,
    left: -240,
    width: 720,
    height: 720,
    borderRadius: 720,
    background: `radial-gradient(circle, ${brandColors.secondaryDeep}22 0%, transparent 65%)`,
    display: "flex",
  },
  headerRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
    zIndex: 1,
  },
  body: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    justifyContent: "center",
    zIndex: 1,
  },
  badge: {
    display: "flex",
    padding: "10px 22px",
    backgroundColor: brandColors.secondary,
    color: brandColors.background,
    fontSize: 26,
    fontWeight: 600,
    borderRadius: 999,
    alignSelf: "flex-start",
    marginBottom: 22,
    flexShrink: 0,
  },
  title: {
    display: "flex",
    fontSize: 72,
    fontWeight: 700,
    letterSpacing: "-0.02em",
    color: brandColors.foreground,
    lineHeight: 1.1,
    marginBottom: 26,
    maxWidth: 1000,
    flexShrink: 0,
  },
  description: {
    display: "flex",
    fontSize: 28,
    color: brandColors.muted,
    lineHeight: 1.4,
    marginBottom: 30,
    maxWidth: 980,
    flexShrink: 0,
    maxHeight: 160,
    overflow: "hidden",
  },
  priceRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "baseline",
    flexShrink: 0,
  },
  priceLabel: {
    display: "flex",
    fontSize: 26,
    color: brandColors.mutedSubtle,
    marginRight: 14,
  },
  priceValue: {
    display: "flex",
    fontSize: 72,
    fontWeight: 700,
    letterSpacing: "-0.02em",
    color: brandColors.secondary,
  },
  footer: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: "auto",
    paddingTop: 28,
    borderTop: `1px solid ${brandColors.surfaceMuted}`,
    zIndex: 1,
  },
  durationPill: {
    display: "flex",
    padding: "8px 18px",
    backgroundColor: brandColors.surfaceMuted,
    color: brandColors.muted,
    fontSize: 22,
    fontWeight: 600,
    borderRadius: 999,
  },
};

export function ServiceOGTemplate({
  name,
  description,
  packageType,
  startingPrice,
  durationLabel,
}: ServiceTemplateProps) {
  return (
    <div style={serviceStyles.root}>
      <div style={serviceStyles.glow} />
      <div style={serviceStyles.glowBL} />

      <div style={serviceStyles.headerRow}>
        <Wordmark size={36} />
      </div>

      <div style={serviceStyles.body}>
        {packageType && <div style={serviceStyles.badge}>{packageType}</div>}
        <div style={serviceStyles.title}>{name}</div>
        {description && <div style={serviceStyles.description}>{description}</div>}
        {startingPrice && (
          <div style={serviceStyles.priceRow}>
            <div style={serviceStyles.priceLabel}>from</div>
            <div style={serviceStyles.priceValue}>{startingPrice}</div>
          </div>
        )}
      </div>

      <div style={serviceStyles.footer}>
        {durationLabel ? <div style={serviceStyles.durationPill}>{durationLabel}</div> : <div />}
        <LocationStrip />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Generic / homepage / page-level fallback                                  */
/* -------------------------------------------------------------------------- */

interface BaseTemplateProps {
  title: string;
  description?: string;
  badge?: string;
}

const baseStyles: Record<string, CSSProperties> = {
  root: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    height: "100%",
    padding: 60,
    backgroundColor: brandColors.background,
    fontFamily: fontStack,
    position: "relative",
    overflow: "hidden",
  },
  glow: {
    position: "absolute",
    top: -200,
    right: -160,
    width: 640,
    height: 640,
    borderRadius: 640,
    background: `radial-gradient(circle, ${brandColors.secondary}33 0%, transparent 65%)`,
    display: "flex",
  },
  header: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 36,
    zIndex: 1,
  },
  body: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    justifyContent: "center",
    zIndex: 1,
    maxWidth: 1000,
  },
  badge: {
    display: "flex",
    padding: "10px 22px",
    backgroundColor: brandColors.secondary,
    color: brandColors.background,
    fontSize: 24,
    fontWeight: 600,
    borderRadius: 999,
    alignSelf: "flex-start",
    marginBottom: 22,
  },
  title: {
    display: "flex",
    fontSize: 68,
    fontWeight: 700,
    letterSpacing: "-0.02em",
    color: brandColors.foreground,
    lineHeight: 1.1,
    marginBottom: 26,
    flexShrink: 0,
  },
  description: {
    display: "flex",
    fontSize: 30,
    color: brandColors.muted,
    lineHeight: 1.4,
    flexShrink: 0,
  },
  footer: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: "auto",
    paddingTop: 28,
    borderTop: `1px solid ${brandColors.surfaceMuted}`,
    zIndex: 1,
  },
};

export function BaseOGTemplate({ title, description, badge }: BaseTemplateProps) {
  return (
    <div style={baseStyles.root}>
      <div style={baseStyles.glow} />
      <div style={baseStyles.header}>
        <Wordmark size={40} />
      </div>
      <div style={baseStyles.body}>
        {badge && <div style={baseStyles.badge}>{badge}</div>}
        <div style={baseStyles.title}>{title}</div>
        {description && <div style={baseStyles.description}>{description}</div>}
      </div>
      <div style={baseStyles.footer}>
        <LocationStrip />
      </div>
    </div>
  );
}

export function HomepageOGTemplate() {
  return (
    <BaseOGTemplate
      title="Premier Makeup Artistry & Beauty Services"
      description="Professional makeup, beauty products, and bridal services in Kitui and Nairobi, Kenya."
      badge="✨ Glam by Lynn"
    />
  );
}

export function GenericPageOGTemplate({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return <BaseOGTemplate title={title} description={description} />;
}
