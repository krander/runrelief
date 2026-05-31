import { useEffect, useRef, useState } from 'react';
import {
  fetchBathroomsFromOSM,
  parseBathroomsFromOSM,
  type Bathroom,
} from '../lib/overpass';
import { fetchCommunityPins } from '../lib/community';
import { sortBathroomsByDistance } from '../lib/utils';

const EARTH_RADIUS_METERS = 6_371_000;
const DEDUP_THRESHOLD_METERS = 20;
const MAX_RESULTS = 5;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function distanceMeters(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// OSM results take priority — drop any community pin within 20 m of an OSM result.
function deduplicateBathrooms(
  osmResults: Bathroom[],
  communityResults: Bathroom[],
): Bathroom[] {
  const uniqueCommunity = communityResults.filter(
    (community) =>
      !osmResults.some(
        (osm) =>
          distanceMeters(osm.latitude, osm.longitude, community.latitude, community.longitude) <=
          DEDUP_THRESHOLD_METERS,
      ),
  );
  return [...osmResults, ...uniqueCommunity];
}

type UseBathroomsResult = {
  bathrooms: Array<Bathroom & { distanceMiles: number }>;
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

export function useBathrooms(
  latitude: number | null,
  longitude: number | null,
): UseBathroomsResult {
  const [bathrooms, setBathrooms] = useState<Array<Bathroom & { distanceMiles: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Cache OSM results so a manual refresh (refreshKey change) can reuse them
  // instead of hitting the Overpass API again. Overpass is slow and rate-limits
  // rapid re-requests, which caused setBathrooms([]) via the catch block.
  const osmCacheRef = useRef<Bathroom[]>([]);
  const osmCoordsRef = useRef<{ lat: number; lon: number } | null>(null);

  const refresh = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    if (latitude === null || longitude === null) return;

    const coordsChanged =
      osmCoordsRef.current === null ||
      osmCoordsRef.current.lat !== latitude ||
      osmCoordsRef.current.lon !== longitude;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        let osmBathrooms: Bathroom[];

        if (coordsChanged) {
          // New position — fetch fresh OSM data and update the cache.
          const osmResponse = await fetchBathroomsFromOSM(latitude, longitude);
          osmBathrooms = parseBathroomsFromOSM(osmResponse.elements);
          osmCacheRef.current = osmBathrooms;
          osmCoordsRef.current = { lat: latitude, lon: longitude };
        } else {
          // Same position, manual refresh — reuse cached OSM data and only
          // re-fetch community pins (the flagged pin will now be excluded).
          osmBathrooms = osmCacheRef.current;
        }

        const communityPins = await fetchCommunityPins(latitude, longitude);

        if (cancelled) return;

        const merged = deduplicateBathrooms(osmBathrooms, communityPins);
        const sorted = sortBathroomsByDistance(merged, latitude, longitude);

        setBathrooms(sorted.slice(0, MAX_RESULTS));
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load bathrooms');
        // Only clear the list when coordinates changed (fresh start).
        // On a manual refresh, keep existing pins visible rather than wiping them.
        if (coordsChanged) setBathrooms([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [latitude, longitude, refreshKey]);

  return { bathrooms, loading, error, refresh };
}
