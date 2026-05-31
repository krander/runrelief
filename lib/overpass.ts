const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

export type Bathroom = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  openingHours: string | null;
  isOpen: boolean | null;
  source: 'osm' | 'community';
  distanceMiles?: number;
};

export function parseBathroomsFromOSM(elements: OverpassNode[]): Bathroom[] {
  return elements.map((node) => {
    const openingHours = node.tags?.opening_hours ?? null;
    return {
      id: String(node.id),
      name: node.tags?.name ?? 'Public Restroom',
      latitude: node.lat,
      longitude: node.lon,
      openingHours,
      isOpen: null, // full hours parsing deferred to Story 4.5
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
    `node[amenity=toilets](around:${radiusInMeters},${latitude},${longitude});`,
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
