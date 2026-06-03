import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../lib/theme';

const BAR_HEIGHT = 3;
const BAR_WIDTH_RATIO = 0.35;

export default function LoadingScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const trackWidth = screenWidth * 0.6;
  const barWidth = trackWidth * BAR_WIDTH_RATIO;

  const barAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(barAnim, {
        toValue: 1,
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [barAnim]);

  const translateX = barAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-barWidth, trackWidth],
  });

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <MaterialCommunityIcons
        name="human-male-female"
        size={48}
        color={colors.accent}
        style={styles.icon}
      />
      <View style={styles.wordmarkRow}>
        <Text style={styles.wordmarkRun}>Run</Text>
        <Text style={styles.wordmarkRelief}>Relief</Text>
      </View>
      <View style={[styles.track, { width: trackWidth }]}>
        <Animated.View
          style={[styles.bar, { width: barWidth, transform: [{ translateX }] }]}
        />
      </View>
      <Text style={styles.tagline}>Finding your nearest relief...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginBottom: 16,
  },
  wordmarkRow: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  wordmarkRun: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.5,
  },
  wordmarkRelief: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 0.5,
  },
  track: {
    height: BAR_HEIGHT,
    backgroundColor: 'rgba(255,214,10,0.2)',
    borderRadius: BAR_HEIGHT / 2,
    overflow: 'hidden',
    marginBottom: 20,
  },
  bar: {
    height: BAR_HEIGHT,
    backgroundColor: colors.accent,
    borderRadius: BAR_HEIGHT / 2,
  },
  tagline: {
    fontSize: 14,
    color: colors.muted,
  },
});
