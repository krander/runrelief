import { useEffect, useRef, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
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
const MAX_DISTANCE_MILES = 1.0;

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
  isOffline: boolean;
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
  const [isOffline, setIsOffline] = useState(false);

  // Cache OSM results so a manual refresh (refreshKey change) can reuse them
  // instead of hitting the Overpass API again. Overpass rate-limits rapid
  // re-requests, which caused setBathrooms([]) via the catch block.
  const osmCacheRef   = useRef<Bathroom[]>([]);
  const osmCoordsRef  = useRef<{ lat: number; lon: number } | null>(null);

  // Cache last successful bathroom list so it can be served while offline.
  const resultsCacheRef = useRef<Array<Bathroom & { distanceMiles: number }>>([]);

  // Track whether we went offline so we know when to auto-refresh on reconnect.
  const wasOfflineRef = useRef(false);

  const refresh = () => setRefreshKey((k) => k + 1);

  // Auto-refresh when connectivity is restored after an offline period.
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && wasOfflineRef.current) {
        wasOfflineRef.current = false;
        setIsOffline(false);
        setRefreshKey((k) => k + 1);
      } else if (!state.isConnected) {
        wasOfflineRef.current = true;
        setIsOffline(true);
      }
    });
    return unsubscribe;
  }, []);

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
        // Fetch OSM and community pins independently so a failure in one
        // never discards or blocks results already fetched from the other.
        const osmPromise: Promise<Bathroom[]> = coordsChanged
          ? fetchBathroomsFromOSM(latitude, longitude).then((osmResponse) => {
              const parsed = parseBathroomsFromOSM(osmResponse.elements);
              osmCacheRef.current = parsed;
              osmCoordsRef.current = { lat: latitude, lon: longitude };
              return parsed;
            })
          : Promise.resolve(osmCacheRef.current);

        const [osmSettled, communitySettled] = await Promise.allSettled([
          osmPromise,
          fetchCommunityPins(latitude, longitude),
        ]);

        if (cancelled) return;

        const osmFailed = osmSettled.status === 'rejected';
        const communityFailed = communitySettled.status === 'rejected';

        if (osmFailed && communityFailed) {
          // Check connectivity to distinguish network failures from API errors.
          const netState = await NetInfo.fetch();
          const offline = !netState.isConnected;

          setIsOffline(offline);

          if (offline && resultsCacheRef.current.length > 0) {
            // Serve cached results while offline.
            setBathrooms(resultsCacheRef.current);
          } else {
            const err = osmSettled.reason;
            setError(err instanceof Error ? err.message : 'Failed to load bathrooms');
            if (coordsChanged) setBathrooms([]);
          }
          return;
        }

        if (osmFailed) {
          const reason = osmSettled.reason;
          console.warn(
            '[useBathrooms] OSM fetch failed, falling back to cached OSM results:',
            reason instanceof Error ? reason.message : String(reason),
          );
        }
        if (communityFailed) {
          const reason = communitySettled.reason;
          console.warn(
            '[useBathrooms] community pins fetch failed, proceeding with OSM results only:',
            reason instanceof Error ? reason.message : String(reason),
          );
        }

        // Fall back to the last successful OSM cache rather than an empty set.
        const osmBathrooms = osmFailed ? osmCacheRef.current : osmSettled.value;
        const communityPins = communityFailed ? [] : communitySettled.value;

        const merged = deduplicateBathrooms(osmBathrooms, communityPins);
        const sorted = sortBathroomsByDistance(merged, latitude, longitude);
        const results = sorted
          .filter((b) => b.distanceMiles <= MAX_DISTANCE_MILES)
          .slice(0, MAX_RESULTS);

        // Update the results cache for offline fallback.
        resultsCacheRef.current = results;
        setIsOffline(false);
        setBathrooms(results);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [latitude, longitude, refreshKey]);

  return { bathrooms, loading, error, isOffline, refresh };
}
