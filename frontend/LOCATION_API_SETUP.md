# Location API Setup Guide

## Overview

This guide shows how to set up location autocomplete with distance-based transport pricing for the Glam by Lynn booking system.

## Why This Approach?

Instead of manually adding every location in Kenya with fixed pricing, we:
1. Let users search for ANY location in Kenya
2. Calculate exact distance from Nairobi
3. Automatically calculate transport costs based on distance
4. Store exact coordinates with the booking

## API Options

### 🏆 Recommended: Mapbox (Best Free Tier)

**Free Tier:**
- 100,000 requests/month
- No credit card required
- Excellent Kenya coverage

**Setup:**

1. Sign up at https://www.mapbox.com/
2. Go to https://account.mapbox.com/access-tokens/
3. Copy your default public token (starts with `pk.`)
4. Add to `frontend/.env.local`:

```bash
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_token_here
```

### Alternative: Google Places Autocomplete

**Free Tier:**
- 28,000 requests/month (~900/day)
- Requires credit card (but won't charge within free tier)
- Most accurate for Kenya

**Setup:**

1. Go to https://console.cloud.google.com/
2. Enable Places API
3. Create API key with restrictions:
   - HTTP referrers: `localhost:3000/*`, `your-domain.com/*`
   - API restrictions: Places API only
4. Add to `frontend/.env.local`:

```bash
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
```

### Alternative: LocationIQ (OSM-based)

**Free Tier:**
- 5,000 requests/day
- No credit card required
- Uses OpenStreetMap data

**Setup:**

1. Sign up at https://locationiq.com/
2. Get API key from dashboard
3. Add to `frontend/.env.local`:

```bash
NEXT_PUBLIC_LOCATIONIQ_TOKEN=your_token_here
```

## Usage in Booking Form

Here's how to use the `LocationAutocomplete` component:

```typescript
import LocationAutocomplete from "@/components/LocationAutocomplete";
import { calculateTransportCost, formatCurrency, formatDistance } from "@/lib/transport-pricing";
import { useState } from "react";

export default function BookingForm() {
  const [location, setLocation] = useState(null);
  const [transportCost, setTransportCost] = useState(0);
  const [distance, setDistance] = useState(0);

  const handleLocationChange = (newLocation) => {
    setLocation(newLocation);
    // Location will be null if cleared
    if (!newLocation) {
      setTransportCost(0);
      setDistance(0);
    }
  };

  const handleDistanceCalculated = (distanceKm) => {
    setDistance(distanceKm);

    // Calculate transport cost based on distance
    const pricing = calculateTransportCost(distanceKm);
    setTransportCost(pricing.totalCost);

    console.log(`Distance from Nairobi: ${formatDistance(distanceKm)}`);
    console.log(`Transport cost: ${formatCurrency(pricing.totalCost)}`);
  };

  return (
    <form>
      {/* Other form fields */}

      <LocationAutocomplete
        value={location}
        onChange={handleLocationChange}
        onDistanceCalculated={handleDistanceCalculated}
        label="Service Location"
        placeholder="Search for your location in Kenya..."
        required
      />

      {/* Display transport cost breakdown */}
      {location && distance > 0 && (
        <div className="mt-4 rounded-md border p-4">
          <h3 className="font-semibold">Transport Details</h3>
          <div className="mt-2 space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Distance from Nairobi:</span>{" "}
              <strong>{formatDistance(distance)}</strong>
            </p>
            <p>
              <span className="text-muted-foreground">Transport cost:</span>{" "}
              <strong>{formatCurrency(transportCost)}</strong>
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {location.address}
            </p>
          </div>
        </div>
      )}

      {/* When submitting booking, send: */}
      {/*
        {
          location_address: location.address,
          location_latitude: location.latitude,
          location_longitude: location.longitude,
          transport_cost: transportCost,
          distance_from_nairobi_km: distance,
        }
      */}
    </form>
  );
}
```

## Transport Pricing Tiers

Distance is calculated as straight-line (Haversine formula) from Nairobi city center:

| Tier | Distance | Base Cost | Per KM Cost | Example Locations |
|------|----------|-----------|-------------|-------------------|
| Within Nairobi | 0-20km | KSh 1,000 | Free | Westlands, Parklands, CBD |
| Greater Nairobi | 20-50km | KSh 2,000 | KSh 50/km | Ruiru, Ngong, Athi River |
| Regional | 50-150km | KSh 3,000 | KSh 80/km | Thika, Machakos, Naivasha |
| Long Distance | 150km+ | KSh 5,000 | KSh 100/km | Nakuru, Mombasa, Kisumu |

### Example Calculations:

- **Karen (15km):** KSh 1,000 (within Nairobi tier)
- **Ruiru (30km):** KSh 2,000 + (10km × 50) = **KSh 2,500**
- **Machakos (65km):** KSh 3,000 + (15km × 80) = **KSh 4,200**
- **Nakuru (160km):** KSh 5,000 + (10km × 100) = **KSh 6,000**

You can adjust these tiers in `frontend/src/lib/transport-pricing.ts`.

## Backend Schema Update Needed

Update your booking model to store location data:

```python
# In backend/app/models/booking.py

class Booking(Base):
    # ... existing fields ...

    # New location fields
    location_address = Column(String, nullable=True)
    location_latitude = Column(Float, nullable=True)
    location_longitude = Column(Float, nullable=True)
    distance_from_nairobi_km = Column(Float, nullable=True)

    # transport_cost already exists
```

Then create an Alembic migration:

```bash
cd backend
alembic revision --autogenerate -m "add location coordinates to bookings"
alembic upgrade head
```

## Component Features

✅ **Autocomplete** - Search as you type
✅ **Kenya-focused** - Restricted to Kenyan locations
✅ **Distance calculation** - Automatic from Nairobi
✅ **Transport pricing** - Tier-based cost calculation
✅ **Coordinates storage** - Exact lat/long for future use
✅ **Mobile-friendly** - Responsive design
✅ **Accessible** - Keyboard navigation support

## Testing

1. Start the frontend: `npm run dev`
2. Add a Mapbox token to `.env.local`
3. Navigate to the booking form
4. Search for locations:
   - "Westlands" (should show ~KSh 1,000)
   - "Thika" (should show ~KSh 4,000)
   - "Nakuru" (should show ~KSh 6,000)

## Future Enhancements

1. **Road distance** - Use Mapbox Directions API for actual road distance (not straight-line)
2. **Traffic consideration** - Adjust pricing based on traffic conditions
3. **Multi-location** - Support for events with multiple service locations
4. **Saved locations** - Let users save frequently used addresses
5. **Location validation** - Verify location is within service area

## Cost Estimation

With 100 bookings/month:
- Location searches: ~300 requests (users trying different searches)
- Well within Mapbox free tier (100,000/month)
- **Cost: Free**

With 1,000 bookings/month:
- Location searches: ~3,000 requests
- Still within Mapbox free tier
- **Cost: Free**

Even at scale, location API costs are minimal compared to the value of serving customers anywhere in Kenya.
