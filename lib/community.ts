import supabase from './supabase';
import type { Bathroom } from './overpass';

type CommunityPinType = 'porta-potty' | 'restroom';

type CommunityPin = {
  id: string;
  latitude: number;
  longitude: number;
  type: CommunityPinType;
  expires_at: string | null;
  is_flagged: boolean;
};

const PIN_NAMES: Record<CommunityPinType, string> = {
  'porta-potty': 'Community Porta-Potty',
  restroom: 'Community Restroom',
};

export async function fetchCommunityPins(
  _latitude: number,
  _longitude: number,
): Promise<Bathroom[]> {
  try {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('community_pins')
      .select('id, latitude, longitude, type, expires_at, is_flagged')
      .eq('is_flagged', false)
      .or(`expires_at.is.null,expires_at.gt.${now}`);

    if (error) {
      console.error('[community] fetchCommunityPins error:', error.message);
      return [];
    }

    return (data as CommunityPin[]).map((pin): Bathroom => ({
      id: pin.id,
      name: PIN_NAMES[pin.type] ?? 'Community Restroom',
      latitude: pin.latitude,
      longitude: pin.longitude,
      openingHours: null,
      isOpen: null,
      source: 'community',
    }));
  } catch (err) {
    console.error('[community] fetchCommunityPins unexpected error:', err);
    return [];
  }
}
