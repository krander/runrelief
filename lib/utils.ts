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
