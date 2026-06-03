import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { Bathroom } from '../lib/overpass';
import { colors } from '../lib/theme';

type Props = {
  bathroom: Bathroom & { distanceMiles: number };
  onReport?: () => void;
  reportState?: 'idle' | 'reported' | 'error';
};

function StatusText({ isOpen }: { isOpen: boolean | null }) {
  const label = isOpen === true ? 'Open now' : isOpen === false ? 'Closed' : 'Hours Unknown';
  const color =
    isOpen === true ? colors.statusOpenText : isOpen === false ? colors.error : colors.muted;
  return <Text style={[styles.status, { color }]}>{label}</Text>;
}

export default function BathroomCard({ bathroom, onReport, reportState }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.nameBlock}>
          <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
            {bathroom.name}
          </Text>
          {bathroom.address && (
            <Text style={styles.address} numberOfLines={1} ellipsizeMode="tail">
              {bathroom.address}
            </Text>
          )}
        </View>
        <Text style={styles.distance}>{bathroom.distanceMiles} mi</Text>
      </View>
      <View style={styles.statusRow}>
        <StatusText isOpen={bathroom.isOpen} />
        {bathroom.source === 'community' && (
          <>
            <Text style={styles.separator}> · </Text>
            <Text style={styles.communityLabel}>Community Reported</Text>
          </>
        )}
      </View>
      {bathroom.source === 'community' && onReport && (
        <View style={styles.reportSection}>
          {(!reportState || reportState === 'idle') && (
            <TouchableOpacity
              onPress={onReport}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Report an issue with this bathroom"
            >
              <Text style={styles.reportLink}>Report an Issue</Text>
            </TouchableOpacity>
          )}
          {reportState === 'reported' && (
            <Text style={styles.reportFeedback}>Thanks for the report!</Text>
          )}
          {reportState === 'error' && (
            <Text style={[styles.reportFeedback, { color: colors.error }]}>
              Couldn't submit. Try again.
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 80,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 6,
  },
  nameBlock: {
    flex: 1,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.white,
  },
  address: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  distance: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
    paddingTop: 3,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  status: {
    fontSize: 14,
    fontWeight: '500',
  },
  separator: {
    fontSize: 14,
    color: colors.muted,
  },
  communityLabel: {
    fontSize: 14,
    color: colors.muted,
  },
  reportSection: {
    marginTop: 8,
  },
  reportLink: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.reportLink,
  },
  reportFeedback: {
    fontSize: 12,
    color: colors.reportSuccess,
  },
});
