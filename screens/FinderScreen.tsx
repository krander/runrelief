import { useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, Animated, StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useLocation } from '../hooks/useLocation';
import { useBathrooms } from '../hooks/useBathrooms';
import BathroomCard from '../components/BathroomCard';
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

// Keyed from FinderScreen — remounting resets slideAnim and re-fires the spring.
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

  const latitude = location?.coords.latitude ?? null;
  const longitude = location?.coords.longitude ?? null;

  const { bathrooms, loading } = useBathrooms(latitude, longitude);

  const markers = useMemo(
    () =>
      bathrooms.map((bathroom, index) => (
        <Marker
          key={bathroom.id}
          coordinate={{ latitude: bathroom.latitude, longitude: bathroom.longitude }}
          tracksViewChanges={false}
        >
          <BathroomPin isNearest={index === 0} />
        </Marker>
      )),
    [bathrooms],
  );

  return (
    <>
      <MapView
        style={StyleSheet.absoluteFill}
        showsUserLocation
        followsUserLocation
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
      {bathrooms.length > 0 && (
        <BottomSheet key={bathrooms[0].id}>
          <BathroomCard bathroom={bathrooms[0]} />
          <TakeMeThereButton bathroom={bathrooms[0]} />
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
