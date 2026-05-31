import { useEffect, useState } from 'react';
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
};

export function useBathrooms(
  latitude: number | null,
  longitude: number | null,
): UseBathroomsResult {
  const [bathrooms, setBathrooms] = useState<Array<Bathroom & { distanceMiles: number }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (latitude === null || longitude === null) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const [osmResponse, communityPins] = await Promise.all([
          fetchBathroomsFromOSM(latitude, longitude),
          fetchCommunityPins(latitude, longitude),
        ]);

        if (cancelled) return;

        const osmBathrooms = parseBathroomsFromOSM(osmResponse.elements);
        const merged = deduplicateBathrooms(osmBathrooms, communityPins);
        const sorted = sortBathroomsByDistance(merged, latitude, longitude);

        setBathrooms(sorted.slice(0, MAX_RESULTS));
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load bathrooms');
        setBathrooms([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [latitude, longitude]);

  return { bathrooms, loading, error };
}
