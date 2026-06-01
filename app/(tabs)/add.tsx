import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useLocation } from '../../hooks/useLocation';
import supabase from '../../lib/supabase';
import { colors } from '../../lib/theme';

type BathroomType = 'porta-potty' | 'restroom';

type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

const USER_ID_KEY = 'runrelief_user_id';

function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

async function getUserIdentifier(): Promise<string> {
  let id = await SecureStore.getItemAsync(USER_ID_KEY);
  if (!id) {
    id = uuidv4();
    await SecureStore.setItemAsync(USER_ID_KEY, id);
  }
  return id;
}

async function insertWithRetry(
  payload: object,
  maxRetries = 3,
  delayMs = 2000,
): Promise<void> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const { error } = await supabase.from('community_pins').insert(payload);
    if (!error) return;
    if (attempt < maxRetries - 1) {
      await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
    } else {
      console.error('[add] community_pins insert failed after', maxRetries, 'attempts:', error.message);
    }
  }
}

export default function AddScreen() {
  const { location } = useLocation(true);
  const [selectedType, setSelectedType] = useState<BathroomType>('porta-potty');
  const [mapRegion, setMapRegion] = useState<MapRegion | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [noLocation, setNoLocation] = useState(false);

  // Lock map preview to the first GPS fix — prevents jitter while non-interactive.
  useEffect(() => {
    if (!location || mapRegion !== null) return;
    setMapRegion({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    });
  }, [location, mapRegion]);

  const handleSubmit = () => {
    if (!location) {
      setNoLocation(true);
      return;
    }
    setNoLocation(false);

    const coords = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    };
    const type = selectedType;

    // Optimistic: show success immediately, then submit in the background.
    setSubmitted(true);
    setSelectedType('porta-potty');

    (async () => {
      const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
      const userIdentifier = await getUserIdentifier();
      await insertWithRetry({
        latitude: coords.latitude,
        longitude: coords.longitude,
        type,
        expires_at: expiresAt,
        user_identifier: userIdentifier,
      });
    })();
  };

  const handleBackToMap = () => {
    setSubmitted(false);
    router.navigate('/');
  };

  if (submitted) {
    return (
      <SafeAreaView style={[styles.screen, styles.successScreen]} edges={['top']}>
        <StatusBar style="light" />
        <View style={styles.successContent}>
          <Text style={styles.successTitle}>Thanks for helping runners! 🙌</Text>
          <Text style={styles.successSubtitle}>
            Your bathroom has been added to the map.
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={handleBackToMap} activeOpacity={0.85}>
            <Text style={styles.backButtonLabel}>Back to Map</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar style="light" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Report a Bathroom</Text>
        <Text style={styles.subtitle}>
          Spotted a bathroom on your route? Add it for other runners.
        </Text>

        <View style={styles.mapContainer}>
          {mapRegion ? (
            <MapView
              style={styles.map}
              region={mapRegion}
              userInterfaceStyle="dark"
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
              showsUserLocation={false}
              showsCompass={false}
              showsScale={false}
            >
              <Marker
                coordinate={{ latitude: mapRegion.latitude, longitude: mapRegion.longitude }}
                tracksViewChanges={false}
              >
                <View style={styles.pin} />
              </Marker>
            </MapView>
          ) : (
            <View style={styles.mapPlaceholder}>
              <Text style={styles.mapPlaceholderText}>Acquiring GPS…</Text>
            </View>
          )}
        </View>
        <Text style={styles.locationLabel}>
          Bathroom will be added at your current location
        </Text>

        <View style={styles.typeRow}>
          {(['porta-potty', 'restroom'] as BathroomType[]).map((type) => {
            const isActive = selectedType === type;
            return (
              <TouchableOpacity
                key={type}
                style={[styles.typeButton, isActive && styles.typeButtonActive]}
                onPress={() => setSelectedType(type)}
                activeOpacity={0.8}
              >
                <Text style={[styles.typeLabel, isActive && styles.typeLabelActive]}>
                  {type === 'porta-potty' ? 'Porta-Potty' : 'Restroom'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {noLocation && (
          <Text style={styles.noLocationMessage}>Waiting for your location…</Text>
        )}

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} activeOpacity={0.85}>
          <Text style={styles.submitLabel}>Submit</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  successScreen: {
    justifyContent: 'center',
  },
  successContent: {
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.white,
    textAlign: 'center',
    marginBottom: 12,
  },
  successSubtitle: {
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
  },
  backButton: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 14,
  },
  backButtonLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.surface,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 20,
    marginBottom: 24,
  },
  mapContainer: {
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
  },
  map: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPlaceholderText: {
    color: colors.muted,
    fontSize: 14,
  },
  pin: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.white,
  },
  locationLabel: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 32,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderMuted,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.accent,
  },
  typeLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.muted,
  },
  typeLabelActive: {
    color: colors.accent,
  },
  noLocationMessage: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: 12,
  },
  submitButton: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  submitLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.surface,
  },
});
