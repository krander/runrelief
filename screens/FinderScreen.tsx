import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, PanResponder, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocation } from '../hooks/useLocation';
import { useBathrooms } from '../hooks/useBathrooms';
import BathroomCard from '../components/BathroomCard';
import PaginationDots from '../components/PaginationDots';
import TakeMeThereButton from '../components/TakeMeThereButton';
import { colors } from '../lib/theme';

function BathroomPin({ isNearest }: { isNearest: boolean }) {
  const size      = isNearest ? 48 : 38;
  const iconSize  = isNearest ? 28 : 22;
  const bg        = isNearest ? colors.surface : colors.muted;
  const iconColor = isNearest ? colors.accent  : colors.white;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.white,
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      }}
    >
      <MaterialCommunityIcons name="human-male-female" size={iconSize} color={iconColor} />
    </View>
  );
}

// Keyed on bathrooms[0].id — remounts (and re-fires the spring) only when GPS
// delivers a new nearest result, not on every swipe.
function BottomSheet({ children }: { children: React.ReactNode }) {
  const slideAnim = useRef(new Animated.Value(180)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 60,
      friction: 11,
    }).start();
  }, [slideAnim]);

  return (
    <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: slideAnim }] }]}>
      {children}
    </Animated.View>
  );
}

function LocateMeButton({ onPress, isOffline }: { onPress: () => void; isOffline: boolean }) {
  const { top } = useSafeAreaInsets();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const spring = (toValue: number) =>
    Animated.spring(scaleAnim, { toValue, useNativeDriver: true, tension: 300, friction: 20 }).start();

  // Sit below the status bar, plus the offline banner height when visible.
  const OFFLINE_BANNER_HEIGHT = 30;
  const buttonTop = top + (isOffline ? OFFLINE_BANNER_HEIGHT + 8 : 16);

  return (
    <Pressable
      style={[styles.locateMe, { top: buttonTop }]}
      onPressIn={() => spring(0.88)}
      onPressOut={() => spring(1)}
      onPress={onPress}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <MaterialCommunityIcons name="crosshairs-gps" size={22} color={colors.accent} />
      </Animated.View>
    </Pressable>
  );
}

function OfflineBanner() {
  const { top } = useSafeAreaInsets();
  return (
    <View style={[styles.offlineBanner, { top }]} pointerEvents="none">
      <MaterialCommunityIcons name="wifi-off" size={14} color={colors.accent} style={styles.offlineIcon} />
      <Text style={styles.offlineText}>Offline — showing last known results</Text>
    </View>
  );
}

function EmptyState({ isOffline }: { isOffline: boolean }) {
  return (
    <View style={styles.emptySheet}>
      <MaterialCommunityIcons name="map-search" size={36} color={colors.muted} style={styles.emptyIcon} />
      <Text style={styles.emptyTitle}>No bathrooms found nearby</Text>
      <Text style={styles.emptySubtitle}>
        {isOffline
          ? 'No connection — move to an area with signal to find bathrooms'
          : 'Try moving to a busier area or add one yourself'}
      </Text>
      {!isOffline && (
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => router.navigate('/add')}
          activeOpacity={0.85}
        >
          <Text style={styles.emptyButtonLabel}>Report a Bathroom</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function FinderScreen() {
  const { location } = useLocation(true);

  const latitude  = location?.coords.latitude  ?? null;
  const longitude = location?.coords.longitude ?? null;

  const { bathrooms, loading, isOffline, refresh } = useBathrooms(latitude, longitude);

  const [selectedIndex, setSelectedIndex] = useState(0);

  // Refs so PanResponder callbacks never capture stale values.
  const selectedIndexRef = useRef(0);
  const bathroomsRef     = useRef(bathrooms);
  selectedIndexRef.current = selectedIndex;
  bathroomsRef.current     = bathrooms;

  const mapRef = useRef<MapView>(null);

  // Return to nearest result whenever fresh bathroom data arrives.
  useEffect(() => {
    setSelectedIndex(0);
  }, [bathrooms]);

  // Animate the map to the selected bathroom on every index change.
  useEffect(() => {
    const bathroom = bathroomsRef.current[selectedIndex];
    if (!bathroom) return;
    mapRef.current?.animateToRegion(
      {
        latitude: bathroom.latitude,
        longitude: bathroom.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      500,
    );
  }, [selectedIndex]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.5,
      onPanResponderRelease: (_, { dx }) => {
        const idx = selectedIndexRef.current;
        const len = bathroomsRef.current.length;
        if (dx < -50 && idx < len - 1) setSelectedIndex(idx + 1);
        else if (dx > 50 && idx > 0)   setSelectedIndex(idx - 1);
      },
    }),
  ).current;

  const markers = useMemo(
    () =>
      bathrooms.map((bathroom, index) => (
        <Marker
          key={`${bathroom.id}-${index === selectedIndex}`}
          coordinate={{ latitude: bathroom.latitude, longitude: bathroom.longitude }}
          tracksViewChanges={false}
          onPress={() => {
            if (index === selectedIndex) return;
            setSelectedIndex(index);
          }}
        >
          <BathroomPin isNearest={index === selectedIndex} />
        </Marker>
      )),
    [bathrooms, selectedIndex],
  );

  const selected = bathrooms[selectedIndex] ?? bathrooms[0];

  const handleLocateMe = () => {
    if (!location) return;
    mapRef.current?.animateToRegion(
      {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      500,
    );
  };

  return (
    <>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        showsUserLocation
        showsCompass={false}
        showsScale={false}
        initialRegion={
          location
            ? {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }
            : undefined
        }
      >
        {markers}
      </MapView>

      {loading && (
        <View style={styles.loadingCenter} pointerEvents="none">
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      )}

      <LocateMeButton onPress={handleLocateMe} isOffline={isOffline} />
      {isOffline && <OfflineBanner />}
      {!loading && bathrooms.length === 0 && <EmptyState isOffline={isOffline} />}

      {bathrooms.length > 0 && selected && (
        <BottomSheet key={bathrooms[0].id}>
          <View {...panResponder.panHandlers}>
            <BathroomCard bathroom={selected} onRefresh={refresh} />
          </View>
          <PaginationDots total={bathrooms.length} activeIndex={selectedIndex} />
          <TakeMeThereButton bathroom={selected} />
        </BottomSheet>
      )}

      <StatusBar style="dark" />
    </>
  );
}

const styles = StyleSheet.create({
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.overlay,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  loadingCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.overlay,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 44,
    alignItems: 'center',
  },
  emptyIcon: {
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 12,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  emptyButtonLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.surface,
  },
  offlineBanner: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    paddingVertical: 7,
    gap: 6,
  },
  offlineIcon: {
    opacity: 0.85,
  },
  locateMe: {
    position: 'absolute',
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
  },
  offlineText: {
    fontSize: 12,
    color: colors.accent,
    opacity: 0.85,
  },
});
