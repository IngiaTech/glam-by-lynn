/**
 * Hook to fetch public site settings from the backend.
 * Used to conditionally render features like newsletter subscription.
 */

"use client";

import { useState, useEffect } from "react";
import { API_BASE_URL, API_ENDPOINTS } from "@/config/api";

interface PublicSettings {
  enable_newsletter?: boolean;
  social_facebook?: string;
  social_instagram?: string;
  social_twitter?: string;
  social_tiktok?: string;
  social_youtube?: string;
  [key: string]: any;
}

let cachedSettings: PublicSettings | null = null;
let fetchPromise: Promise<PublicSettings> | null = null;

async function fetchPublicSettings(): Promise<PublicSettings> {
  try {
    const response = await fetch(
      `${API_BASE_URL}${API_ENDPOINTS.SETTINGS.PUBLIC}`,
      { cache: "no-store" }
    );
    if (!response.ok) return {};
    return await response.json();
  } catch {
    return {};
  }
}

export function usePublicSettings() {
  const [settings, setSettings] = useState<PublicSettings>(
    cachedSettings || {}
  );
  const [loading, setLoading] = useState(!cachedSettings);

  useEffect(() => {
    if (cachedSettings) {
      setSettings(cachedSettings);
      setLoading(false);
      return;
    }

    if (!fetchPromise) {
      fetchPromise = fetchPublicSettings();
    }

    fetchPromise.then((data) => {
      cachedSettings = data;
      setSettings(data);
      setLoading(false);
    });
  }, []);

  return { settings, loading };
}
