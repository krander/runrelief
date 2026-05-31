import type { Bathroom } from './overpass';

const EARTH_RADIUS_MILES = 3958.8;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function calculateDistance(
  userLatitude: number,
  userLongitude: number,
  targetLatitude: number,
  targetLongitude: number,
): number {
  const dLat = toRadians(targetLatitude - userLatitude);
  const dLon = toRadians(targetLongitude - userLongitude);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(userLatitude)) *
      Math.cos(toRadians(targetLatitude)) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const miles = EARTH_RADIUS_MILES * c;

  return Math.round(miles * 10) / 10;
}

// Maps OSM two-letter day abbreviations to JS Date.getDay() values (0 = Sun).
const DAY_INDEX: Record<string, number> = {
  Mo: 1, Tu: 2, We: 3, Th: 4, Fr: 5, Sa: 6, Su: 0,
};

function timeToMinutes(time: string): number {
  if (time === '24:00') return 24 * 60;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function dayInRange(
  dayOfWeek: number,
  from: string,
  to: string | undefined,
): boolean {
  const fromIdx = DAY_INDEX[from];
  const toIdx   = to !== undefined ? DAY_INDEX[to] : fromIdx;
  if (fromIdx === undefined || toIdx === undefined) return false;
  if (fromIdx <= toIdx) return dayOfWeek >= fromIdx && dayOfWeek <= toIdx;
  // Wraps around end of week (e.g. Fr–Mo).
  return dayOfWeek >= fromIdx || dayOfWeek <= toIdx;
}

// Matches "Mo 08:00-20:00" or "Mo-Fr 08:00-20:00"
const SEGMENT_RE = /^([A-Z][a-z])(?:-([A-Z][a-z]))?\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/;

function parseSegment(segment: string, now: Date): boolean | null {
  const match = segment.trim().match(SEGMENT_RE);
  if (!match) return null;

  const [, dayFrom, dayTo, timeFrom, timeTo] = match;
  if (!(dayFrom in DAY_INDEX)) return null;
  if (dayTo && !(dayTo in DAY_INDEX)) return null;

  const currentDay     = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (!dayInRange(currentDay, dayFrom, dayTo)) return false;

  const open  = timeToMinutes(timeFrom);
  const close = timeToMinutes(timeTo);

  // Overnight range (e.g. 22:00–02:00)
  if (open > close) return currentMinutes >= open || currentMinutes < close;
  return currentMinutes >= open && currentMinutes < close;
}

/**
 * Parses a raw OSM opening_hours string and returns the current open/closed
 * status. Returns null for unrecognised or unparseable formats.
 */
export function parseIsOpen(openingHours: string): boolean | null {
  const s = openingHours.trim();
  if (s === '24/7') return true;

  const now = new Date();
  let anyParsed = false;

  for (const segment of s.split(';')) {
    const result = parseSegment(segment, now);
    if (result === null) continue;
    anyParsed = true;
    if (result) return true;
  }

  return anyParsed ? false : null;
}

export function sortBathroomsByDistance(
  bathrooms: Bathroom[],
  userLatitude: number,
  userLongitude: number,
): Array<Bathroom & { distanceMiles: number }> {
  return bathrooms
    .map((bathroom) => ({
      ...bathroom,
      distanceMiles: calculateDistance(
        userLatitude,
        userLongitude,
        bathroom.latitude,
        bathroom.longitude,
      ),
    }))
    .sort((a, b) => a.distanceMiles - b.distanceMiles);
}
