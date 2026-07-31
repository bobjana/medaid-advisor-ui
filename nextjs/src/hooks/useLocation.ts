import { useState,  } from "react";

export interface LocationData {
  address: string;
  lat: number;
  lng: number;
  city?: string;
  province?: string;
  postalCode?: string;
}

export function useLocation() {
  const [location, _setLocation] = useState<LocationData | null>(null);
  const [isLoading, _setIsLoading] = useState(false);
  const [error, _setError] = useState<string | null>(null);

  return { location, isLoading, error };
}
