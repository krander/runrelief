import { useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';

type PermissionStatus = 'loading' | 'granted' | 'denied';

export default function RootLayout() {
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('loading');

  useEffect(() => {
    (async () => {
      // Check existing grant first — avoids re-prompting on every launch.
      const { status: existing } = await Location.getForegroundPermissionsAsync();
      if (existing === Location.PermissionStatus.GRANTED) {
        setPermissionStatus('granted');
        return;
      }
      const { status: requested } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(
        requested === Location.PermissionStatus.GRANTED ? 'granted' : 'denied',
      );
    })();
  }, []);

  if (permissionStatus === 'loading') {
    return <View style={styles.container}><StatusBar style="light" /></View>;
  }

  if (permissionStatus === 'denied') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Location Access Required</Text>
        <Text style={styles.message}>
          RunRelief needs access to your location to find public bathrooms nearby.
          Please enable location access in iOS Settings.
        </Text>
        <TouchableOpacity style={styles.button} onPress={() => Linking.openSettings()}>
          <Text style={styles.buttonText}>Open Settings</Text>
        </TouchableOpacity>
        <StatusBar style="light" />
      </View>
    );
  }

  return <Slot />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#FFD60A',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 10,
  },
  buttonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
});
