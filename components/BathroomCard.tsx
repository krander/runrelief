import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Bathroom } from '../lib/overpass';

type Props = {
  bathroom: Bathroom & { distanceMiles: number };
};

function StatusBadge({ isOpen }: { isOpen: boolean | null }) {
  const label = isOpen === true ? 'Open' : isOpen === false ? 'Closed' : 'Status Unknown';
  const badgeStyle =
    isOpen === true ? styles.badgeOpen : isOpen === false ? styles.badgeClosed : styles.badgeUnknown;
  return (
    <View style={[styles.badge, badgeStyle]}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

export default function BathroomCard({ bathroom }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
        {bathroom.name}
      </Text>
      {bathroom.source === 'community' && (
        <View style={styles.communityBadge}>
          <MaterialCommunityIcons name="account-group" size={12} color="#FFD60A" />
          <Text style={styles.communityLabel}>Community Reported</Text>
        </View>
      )}
      <View style={styles.meta}>
        <Text style={styles.distance}>{bathroom.distanceMiles} mi</Text>
        <StatusBadge isOpen={bathroom.isOpen} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 8,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  communityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
    opacity: 0.7,
  },
  communityLabel: {
    fontSize: 11,
    color: '#FFD60A',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  distance: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFD60A',
  },
  badge: {
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  badgeOpen: {
    backgroundColor: 'rgba(52,199,89,0.3)',
  },
  badgeClosed: {
    backgroundColor: 'rgba(255,59,48,0.3)',
  },
  badgeUnknown: {
    backgroundColor: 'rgba(142,142,147,0.25)',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
