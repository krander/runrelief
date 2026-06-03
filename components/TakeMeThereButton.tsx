import { useRef } from 'react';
import { Animated, Linking, Pressable, StyleSheet, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Bathroom } from '../lib/overpass';
import { colors } from '../lib/theme';

type Props = {
  bathroom: Bathroom;
};

const APPLE_MAPS = (lat: number, lon: number) =>
  `maps://?daddr=${lat},${lon}&dirflg=w`;
const GOOGLE_MAPS = (lat: number, lon: number) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}&travelmode=walking`;

export default function TakeMeThereButton({ bathroom }: Props) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const spring = (toValue: number) =>
    Animated.spring(scaleAnim, {
      toValue,
      useNativeDriver: true,
      tension: 300,
      friction: 20,
    }).start();

  const handlePress = async () => {
    const { latitude, longitude } = bathroom;
    const appleUrl = APPLE_MAPS(latitude, longitude);
    const googleUrl = GOOGLE_MAPS(latitude, longitude);
    try {
      const canUseApple = await Linking.canOpenURL(appleUrl);
      await Linking.openURL(canUseApple ? appleUrl : googleUrl);
    } catch {
      await Linking.openURL(googleUrl);
    }
  };

  return (
    <Pressable
      onPressIn={() => spring(0.97)}
      onPressOut={() => spring(1)}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel="Get walking directions to this bathroom"
    >
      <Animated.View style={[styles.button, { transform: [{ scale: scaleAnim }] }]}>
        <MaterialCommunityIcons name="run" size={22} color={colors.black} />
        <Text style={styles.label}>Take Me There</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.accent,
    marginBottom: 0,
    marginTop: 8,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
label: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.black,
    letterSpacing: 0.2,
  },
});
