"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Loader2 } from "lucide-react";

interface Location {
  address: string;
  latitude: number;
  longitude: number;
  placeName?: string;
  placeType?: string;
}

interface LocationResult extends Location {
  distanceFromNairobi: number;
}

interface LocationAutocompleteProps {
  onLocationSelect: (location: LocationResult) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  error?: string;
}

interface MapboxFeature {
  id: string;
  place_name: string;
  center: [number, number]; // [longitude, latitude]
  place_type: string[];
  text: string;
}

/**
 * Location autocomplete component using Mapbox Geocoding API
 *
 * Features:
 * - Address autocomplete for Kenya
 * - Returns coordinates for distance calculation
 * - Calculates distance from Nairobi
 * - Free tier: 100,000 requests/month
 *
 * Setup:
 * 1. Sign up at https://www.mapbox.com/
 * 2. Get API token from https://account.mapbox.com/access-tokens/
 * 3. Add NEXT_PUBLIC_MAPBOX_TOKEN to .env.local
 */
export function LocationAutocomplete({
  onLocationSelect,
  placeholder = "Search for your location...",
  label,
  required = false,
  error,
}: LocationAutocompleteProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<MapboxFeature[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Nairobi coordinates (city center)
  const NAIROBI_COORDS = {
    latitude: -1.286389,
    longitude: 36.817223,
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Calculate distance using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const toRad = (degrees: number): number => {
    return degrees * (Math.PI / 180);
  };

  // Fetch suggestions from Mapbox
  const fetchSuggestions = async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 3) {
      setSuggestions([]);
      return;
    }

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) {
      console.error("Mapbox token not configured. Add NEXT_PUBLIC_MAPBOX_TOKEN to .env.local");
      return;
    }

    setLoading(true);

    try {
      // Restrict search to Kenya using bbox (bounding box)
      // Kenya bbox: [33.9098987, -4.6789513, 41.899578, 5.506]
      const bbox = "33.9098987,-4.6789513,41.899578,5.506";

      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        searchQuery
      )}.json?access_token=${token}&country=KE&bbox=${bbox}&limit=5&types=place,locality,neighborhood,address`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.features) {
        setSuggestions(data.features);
        setShowSuggestions(true);
      }
    } catch (err) {
      console.error("Error fetching location suggestions:", err);
    } finally {
      setLoading(false);
    }
  };

  // Handle input change with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);

    // Clear existing timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new timer
    debounceTimer.current = setTimeout(() => {
      fetchSuggestions(newQuery);
    }, 300);
  };

  // Handle suggestion selection
  const handleSuggestionClick = (suggestion: MapboxFeature) => {
    const [longitude, latitude] = suggestion.center;

    // Calculate distance from Nairobi
    const distance = calculateDistance(
      NAIROBI_COORDS.latitude,
      NAIROBI_COORDS.longitude,
      latitude,
      longitude
    );

    const locationResult: LocationResult = {
      address: suggestion.place_name,
      latitude,
      longitude,
      placeName: suggestion.text,
      placeType: suggestion.place_type[0],
      distanceFromNairobi: distance,
    };

    setQuery(suggestion.place_name);
    setShowSuggestions(false);
    onLocationSelect(locationResult);
  };

  return (
    <div ref={wrapperRef} className="relative">
      {label && (
        <Label htmlFor="location-search">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="location-search"
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={`pl-9 ${error ? "border-destructive" : ""}`}
          required={required}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          <ul className="max-h-60 overflow-auto py-1">
            {suggestions.map((suggestion) => (
              <li
                key={suggestion.id}
                onClick={() => handleSuggestionClick(suggestion)}
                className="cursor-pointer px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
              >
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{suggestion.text}</p>
                    <p className="text-xs text-muted-foreground">
                      {suggestion.place_name}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* No Mapbox token warning */}
      {!process.env.NEXT_PUBLIC_MAPBOX_TOKEN && (
        <p className="mt-1 text-xs text-muted-foreground">
          ⚠️ Mapbox token not configured. Add NEXT_PUBLIC_MAPBOX_TOKEN to .env.local
        </p>
      )}
    </div>
  );
}
