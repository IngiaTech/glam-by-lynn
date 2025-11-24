/**
 * OpenGraph Image Templates
 * Reusable templates for generating social media preview images
 */

import { CSSProperties } from 'react';

export const brandColors = {
  background: '#000000',
  foreground: '#FFFFFF',
  secondary: '#FFB6C1', // Light Pink
  muted: '#F5F5F5',
};

export const baseStyles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    height: '100%',
    backgroundColor: brandColors.background,
    padding: '60px',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  header: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: '40px',
  },
  logo: {
    display: 'flex',
    fontSize: '48px',
    fontWeight: 'bold',
    color: brandColors.foreground,
  },
  logoAccent: {
    color: brandColors.secondary,
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: '72px',
    fontWeight: 'bold',
    color: brandColors.foreground,
    lineHeight: 1.2,
    marginBottom: '20px',
  },
  description: {
    fontSize: '36px',
    color: brandColors.muted,
    lineHeight: 1.4,
    marginBottom: '30px',
  },
  footer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
    paddingTop: '40px',
    borderTop: `2px solid ${brandColors.secondary}`,
  },
  location: {
    display: 'flex',
    fontSize: '24px',
    color: brandColors.secondary,
  },
  badge: {
    display: 'flex',
    padding: '12px 24px',
    backgroundColor: brandColors.secondary,
    color: brandColors.background,
    fontSize: '24px',
    fontWeight: '600',
    borderRadius: '8px',
  },
  price: {
    fontSize: '48px',
    fontWeight: 'bold',
    color: brandColors.secondary,
    marginTop: '20px',
  },
};

interface BaseOGTemplateProps {
  title: string;
  description?: string;
  badge?: string;
  price?: string;
  showLocation?: boolean;
}

/**
 * Base OG Image Template
 * Can be customized for different page types
 */
export function BaseOGTemplate({
  title,
  description,
  badge,
  price,
  showLocation = true,
}: BaseOGTemplateProps) {
  return (
    <div style={baseStyles.container}>
      {/* Header with Logo */}
      <div style={baseStyles.header}>
        <div style={baseStyles.logo}>
          Glam by <span style={baseStyles.logoAccent}>Lynn</span>
        </div>
      </div>

      {/* Main Content */}
      <div style={baseStyles.content}>
        {badge && <div style={baseStyles.badge}>{badge}</div>}
        <div style={baseStyles.title}>{title}</div>
        {description && <div style={baseStyles.description}>{description}</div>}
        {price && <div style={baseStyles.price}>{price}</div>}
      </div>

      {/* Footer */}
      <div style={baseStyles.footer}>
        {showLocation && (
          <div style={baseStyles.location}>📍 Nairobi & Kitui, Kenya</div>
        )}
      </div>
    </div>
  );
}

/**
 * Product OG Template
 */
export function ProductOGTemplate({
  name,
  description,
  price,
  category,
  inStock,
}: {
  name: string;
  description: string;
  price: string;
  category?: string;
  inStock: boolean;
}) {
  return (
    <BaseOGTemplate
      title={name}
      description={description}
      badge={category || 'Beauty Product'}
      price={price}
    />
  );
}

/**
 * Service OG Template
 */
export function ServiceOGTemplate({
  name,
  description,
  packageType,
  basePrice,
}: {
  name: string;
  description: string;
  packageType: string;
  basePrice?: string;
}) {
  return (
    <BaseOGTemplate
      title={name}
      description={description}
      badge={packageType}
      price={basePrice}
    />
  );
}

/**
 * Homepage OG Template
 */
export function HomepageOGTemplate() {
  return (
    <BaseOGTemplate
      title="Premier Makeup Artistry & Beauty Services"
      description="Professional makeup, beauty products, and comprehensive salon services in Nairobi and Kitui, Kenya"
      badge="✨ Glam by Lynn"
    />
  );
}

/**
 * Generic Page OG Template
 */
export function GenericPageOGTemplate({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return <BaseOGTemplate title={title} description={description} />;
}
