/**
 * Transport Pricing Calculator
 * Calculate transport costs based on distance from Nairobi
 */

export interface TransportPricing {
  distanceKm: number;
  baseCost: number;
  perKmCost: number;
  totalCost: number;
}

/**
 * Transport pricing tiers based on distance from Nairobi
 *
 * Pricing strategy:
 * - Within Nairobi (0-20km): Base rate
 * - Nearby (20-50km): Base + moderate per km
 * - Regional (50-150km): Higher per km
 * - Long distance (150km+): Premium per km
 */
const PRICING_TIERS = [
  {
    name: "Within Nairobi",
    maxKm: 20,
    baseCost: 1000, // KSh
    perKmCost: 0, // Free within Nairobi
  },
  {
    name: "Greater Nairobi Area",
    maxKm: 50,
    baseCost: 2000,
    perKmCost: 50, // KSh per km beyond 20km
  },
  {
    name: "Regional",
    maxKm: 150,
    baseCost: 3000,
    perKmCost: 80, // KSh per km beyond 50km
  },
  {
    name: "Long Distance",
    maxKm: Infinity,
    baseCost: 5000,
    perKmCost: 100, // KSh per km beyond 150km
  },
];

/**
 * Calculate transport cost based on distance from Nairobi
 *
 * @param distanceKm - Distance in kilometers from Nairobi
 * @returns Transport pricing details
 */
export function calculateTransportCost(distanceKm: number): TransportPricing {
  // Find appropriate tier
  let tier = PRICING_TIERS[0];
  let previousTierMaxKm = 0;

  for (const t of PRICING_TIERS) {
    if (distanceKm <= t.maxKm) {
      tier = t;
      break;
    }
    previousTierMaxKm = t.maxKm;
  }

  // Calculate cost
  let totalCost = tier.baseCost;

  // Add per-km charges for distance beyond tier minimum
  if (distanceKm > previousTierMaxKm) {
    const extraKm = distanceKm - previousTierMaxKm;
    totalCost += extraKm * tier.perKmCost;
  }

  return {
    distanceKm: Math.round(distanceKm * 10) / 10, // Round to 1 decimal
    baseCost: tier.baseCost,
    perKmCost: tier.perKmCost,
    totalCost: Math.round(totalCost),
  };
}

/**
 * Format distance for display
 */
export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }
  return `${Math.round(km * 10) / 10}km`;
}

/**
 * Format currency (KES)
 */
export function formatCurrency(amount: number): string {
  return `KSh ${amount.toLocaleString()}`;
}

/**
 * Get pricing tier name for display
 */
export function getPricingTierName(distanceKm: number): string {
  for (const tier of PRICING_TIERS) {
    if (distanceKm <= tier.maxKm) {
      return tier.name;
    }
  }
  return PRICING_TIERS[PRICING_TIERS.length - 1].name;
}

/**
 * Calculate straight-line distance between two coordinates using Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// Nairobi coordinates (city center - KICC)
export const NAIROBI_COORDINATES = {
  latitude: -1.286389,
  longitude: 36.817223,
};
