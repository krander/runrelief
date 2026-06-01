import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { colors } from '../lib/theme';

type Props = {
  total: number;
  activeIndex: number;
};

function Dot({ isActive }: { isActive: boolean }) {
  // Single value drives both scale and opacity so one spring controls both.
  const anim = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: isActive ? 1 : 0,
      useNativeDriver: true,
      tension: 80,
      friction: 10,
    }).start();
  }, [isActive, anim]);

  const scale   = anim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

  return (
    <Animated.View
      style={[
        styles.dot,
        { backgroundColor: isActive ? colors.accent : colors.white },
        { transform: [{ scale }], opacity },
      ]}
    />
  );
}

export default function PaginationDots({ total, activeIndex }: Props) {
  if (total <= 1) return null;

  const count = Math.min(total, 5);

  return (
    <View style={styles.container}>
      {Array.from({ length: count }, (_, i) => (
        <Dot key={i} isActive={i === activeIndex} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
