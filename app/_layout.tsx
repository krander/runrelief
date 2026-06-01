import { useEffect, useState } from 'react';
import { AppState, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';

type PermissionStatus = 'loading' | 'granted' | 'denied';

async function checkPermission(): Promise<PermissionStatus> {
  const { status } = await Location.getForegroundPermissionsAsync();
  return status === Location.PermissionStatus.GRANTED ? 'granted' : 'denied';
}

export default function RootLayout() {
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('loading');

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

  // Re-check when the app returns to the foreground — recovers automatically
  // if the user granted permission in iOS Settings and switched back.
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

  if (permissionStatus === 'loading') {
    return <View style={styles.screen}><StatusBar style="light" /></View>;
  }

  if (permissionStatus === 'denied') {
    return (
      <View style={styles.screen}>
        <StatusBar style="light" />
        <MaterialCommunityIcons name="map-marker-off" size={56} color="#FFD60A" style={styles.icon} />
        <Text style={styles.title}>Location Required</Text>
        <Text style={styles.message}>
          RunRelief needs your location to find nearby bathrooms. Please enable
          location access in Settings.
        </Text>
        <TouchableOpacity style={styles.button} onPress={() => Linking.openSettings()} activeOpacity={0.85}>
          <Text style={styles.buttonText}>Open Settings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <Slot />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0A0A0A',
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
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#FFD60A',
    paddingVertical: 16,
    borderRadius: 14,
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
  },
});
