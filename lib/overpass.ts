import { parseIsOpen } from './utils';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

export type Bathroom = {
  id: string;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  openingHours: string | null;
  isOpen: boolean | null;
  source: 'osm' | 'community';
  distanceMiles?: number;
};

// Tags consumed from OSM: name, operator, addr:housenumber, addr:street, addr:full,
// opening_hours, access, fee.  All are returned by `out body;` without query changes.
export function parseBathroomsFromOSM(elements: OverpassNode[]): Bathroom[] {
  return elements
    .filter((node) => {
      const tags = node.tags ?? {};
      return tags.access !== 'private' && tags.access !== 'no' && tags.foot !== 'no';
    })
    .map((node) => {
      const tags = node.tags ?? {};
      const openingHours = tags.opening_hours ?? null;

      // Name fallback chain: name → operator → house+street → addr:full → default
      const houseStreet =
        tags['addr:housenumber'] && tags['addr:street']
          ? `${tags['addr:housenumber']} ${tags['addr:street']}`
          : null;
      const name =
        tags.name ??
        tags.operator ??
        houseStreet ??
        tags['addr:full'] ??
        'Public Restroom';

      // Street address stored separately so it can be shown as a subtitle
      const address = houseStreet ?? tags['addr:full'] ?? undefined;

      return {
        id: String(node.id),
        name,
        address,
        latitude: node.lat,
        longitude: node.lon,
        openingHours,
        isOpen: openingHours !== null ? parseIsOpen(openingHours) : null,
        source: 'osm',
      };
    });
}

export type OverpassNode = {
  type: 'node';
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
};

export type OverpassResponse = {
  version: number;
  generator: string;
  elements: OverpassNode[];
};

export async function fetchBathroomsFromOSM(
  latitude: number,
  longitude: number,
  radiusInMeters: number = 1600,
): Promise<OverpassResponse> {
  const query = [
    '[out:json][timeout:25];',
    `node[amenity=toilets][access!=private][access!=no][foot!=no](around:${radiusInMeters},${latitude},${longitude});`,
    'out body;',
  ].join('\n');

  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<OverpassResponse>;
}
