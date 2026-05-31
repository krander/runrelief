import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, PanResponder, StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useLocation } from '../hooks/useLocation';
import { useBathrooms } from '../hooks/useBathrooms';
import BathroomCard from '../components/BathroomCard';
import PaginationDots from '../components/PaginationDots';
import TakeMeThereButton from '../components/TakeMeThereButton';

function BathroomPin({ isNearest }: { isNearest: boolean }) {
  const size      = isNearest ? 48 : 38;
  const iconSize  = isNearest ? 28 : 22;
  const bg        = isNearest ? '#1A1A1A' : '#888888';
  const iconColor = isNearest ? '#FFD60A' : '#FFFFFF';

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
        borderColor: '#FFFFFF',
        shadowColor: '#000000',
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

export default function FinderScreen() {
  const { location } = useLocation(true);

  const latitude  = location?.coords.latitude  ?? null;
  const longitude = location?.coords.longitude ?? null;

  const { bathrooms, loading, refresh } = useBathrooms(latitude, longitude);

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
  // Reads bathroomsRef (not bathrooms) to avoid triggering on every data
  // refresh — the setSelectedIndex(0) above will trigger this via selectedIndex.
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
      // Claim the gesture only for clearly horizontal swipes.
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

  // Include selectedIndex in deps so the two affected markers remount when the
  // active selection changes — required because tracksViewChanges={false} takes
  // a one-time snapshot; embedding the active state in the key forces a fresh
  // snapshot for only the two pins whose appearance changed.
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
        <View style={styles.loadingOverlay} pointerEvents="none">
          <View style={styles.loadingBadge}>
            <ActivityIndicator size="small" color="#666666" />
          </View>
        </View>
      )}
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
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 64,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  loadingBadge: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
});
