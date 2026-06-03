import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, AppState, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { colors } from '../lib/theme';
import { AppReadyContext } from '../lib/appReady';
import LoadingScreen from '../components/LoadingScreen';

type PermissionStatus = 'loading' | 'granted' | 'denied';

async function checkPermission(): Promise<PermissionStatus> {
  const { status } = await Location.getForegroundPermissionsAsync();
  return status === Location.PermissionStatus.GRANTED ? 'granted' : 'denied';
}

export default function RootLayout() {
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('loading');
  const [bathroomsReady, setBathroomsReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [showLoading, setShowLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Initial permission request on mount.
  useEffect(() => {
    (async () => {
      const { status: existing } = await Location.getForegroundPermissionsAsync();
      if (existing === Location.PermissionStatus.GRANTED) {
        setPermissionStatus('granted');
        return;
      }
      const { status: requested } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(requested === Location.PermissionStatus.GRANTED ? 'granted' : 'denied');
    })();
  }, []);

  // Re-check when the app returns to foreground — recovers if user granted permission in Settings.
  useEffect(() => {
    if (permissionStatus !== 'denied') return;

    const subscription = AppState.addEventListener('change', async (nextState) => {
      if (nextState === 'active') {
        const status = await checkPermission();
        if (status === 'granted') setPermissionStatus('granted');
      }
    });

    return () => subscription.remove();
  }, [permissionStatus]);

  // 5-second safety net: if permission is still pending, fall back to denied.
  // If permission is granted but bathrooms haven't loaded, proceed anyway.
  useEffect(() => {
    const timer = setTimeout(() => {
      setTimedOut(true);
      setPermissionStatus((prev) => (prev === 'loading' ? 'denied' : prev));
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleBathroomsReady = useCallback(() => setBathroomsReady(true), []);

  const isReady =
    permissionStatus === 'denied' ||
    (permissionStatus === 'granted' && (bathroomsReady || timedOut));

  // Fade out the loading overlay once everything is ready.
  useEffect(() => {
    if (!isReady || !showLoading) return;
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setShowLoading(false);
    });
  }, [isReady, fadeAnim]);

  return (
    <>
      {permissionStatus !== 'loading' && (
        permissionStatus === 'denied' ? (
          <View style={styles.screen}>
            <StatusBar style="light" />
            <MaterialCommunityIcons
              name="map-marker-off"
              size={56}
              color={colors.accent}
              style={styles.icon}
            />
            <Text style={styles.title}>Location Required</Text>
            <Text style={styles.message}>
              RunRelief needs your location to find nearby bathrooms. Please enable
              location access in Settings.
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => Linking.openSettings()}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Open iOS Settings to enable location access"
            >
              <Text style={styles.buttonText}>Open Settings</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <AppReadyContext.Provider value={{ onBathroomsReady: handleBathroomsReady }}>
            <Slot />
          </AppReadyContext.Provider>
        )
      )}

      {showLoading && (
        <Animated.View
          style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}
          pointerEvents={isReady ? 'none' : 'auto'}
        >
          <LoadingScreen />
        </Animated.View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  icon: {
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.white,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  button: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: 14,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.black,
  },
});
