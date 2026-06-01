import { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Bathroom } from '../lib/overpass';
import supabase from '../lib/supabase';
import { colors } from '../lib/theme';

type Props = {
  bathroom: Bathroom & { distanceMiles: number };
  onRefresh?: () => void;
};

type ReportState = 'idle' | 'reported' | 'error';

function StatusBadge({ isOpen }: { isOpen: boolean | null }) {
  const label = isOpen === true ? 'Open' : isOpen === false ? 'Closed' : 'Hours Unknown';
  const badgeStyle =
    isOpen === true ? styles.badgeOpen : isOpen === false ? styles.badgeClosed : styles.badgeUnknown;
  return (
    <View style={[styles.badge, badgeStyle]}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

export default function BathroomCard({ bathroom, onRefresh }: Props) {
  const [reportState, setReportState] = useState<ReportState>('idle');

  const handleReport = () => {
    Alert.alert(
      'Report an Issue',
      'Report this bathroom as incorrect or no longer there?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: () => {
            setReportState('reported'); // optimistic
            supabase
              .from('community_pins')
              .update({ is_flagged: true })
              .eq('id', bathroom.id)
              .then(({ error }) => {
                if (error) {
                  console.error('[report] flag error:', error.message);
                  setReportState('error');
                } else {
                  onRefresh?.();
                }
              });
          },
        },
      ],
    );
  };

  return (
    <View style={styles.card}>
      <Text style={styles.name} numberOfLines={1} ellipsizeMode="tail">
        {bathroom.name}
      </Text>
      {bathroom.source === 'community' && (
        <View style={styles.communityBadge}>
          <MaterialCommunityIcons name="account-group" size={12} color={colors.accent} />
          <Text style={styles.communityLabel}>Community Reported</Text>
        </View>
      )}
      <View style={styles.meta}>
        <Text style={styles.distance}>{bathroom.distanceMiles} mi</Text>
        <StatusBadge isOpen={bathroom.isOpen} />
      </View>
      {bathroom.source === 'community' && (
        <View style={styles.reportRow}>
          {reportState === 'idle' && (
            <TouchableOpacity onPress={handleReport} hitSlop={8}>
              <Text style={styles.reportLink}>Report an Issue</Text>
            </TouchableOpacity>
          )}
          {reportState === 'reported' && (
            <Text style={styles.reportSuccess}>Thanks for the report! 🙌</Text>
          )}
          {reportState === 'error' && (
            <Text style={styles.reportError}>Couldn't submit report. Please try again.</Text>
          )}
        </View>
      )}
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
    color: colors.white,
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
    color: colors.accent,
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
    color: colors.accent,
  },
  badge: {
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  badgeOpen: {
    backgroundColor: colors.statusOpen,
  },
  badgeClosed: {
    backgroundColor: colors.statusClosed,
  },
  badgeUnknown: {
    backgroundColor: colors.statusUnknown,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.white,
  },
  reportRow: {
    marginTop: 10,
  },
  reportLink: {
    fontSize: 12,
    color: colors.reportLink,
    textDecorationLine: 'underline',
  },
  reportSuccess: {
    fontSize: 12,
    color: colors.reportSuccess,
  },
  reportError: {
    fontSize: 12,
    color: colors.error,
  },
});
