import { useEffect, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../../lib/theme';

type TabBarProps = NonNullable<Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0]>;

function CustomTabBar({ state, descriptors, navigation, insets }: TabBarProps) {
  const pillX = useRef(new Animated.Value(0)).current;
  const [pillWidth, setPillWidth] = useState(0);
  const tabLayouts = useRef<Array<{ x: number; width: number } | null>>(
    Array.from({ length: state.routes.length }, () => null),
  );
  const initialized = useRef(false);

  const snapPill = (index: number, animate: boolean) => {
    const layout = tabLayouts.current[index];
    if (!layout) return;
    if (animate) {
      Animated.spring(pillX, {
        toValue: layout.x,
        useNativeDriver: false,
        tension: 68,
        friction: 12,
      }).start();
    } else {
      pillX.setValue(layout.x);
    }
  };

  useEffect(() => {
    snapPill(state.index, true);
  }, [state.index]);

  const onTabLayout = (index: number) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    tabLayouts.current[index] = { x, width };
    if (!initialized.current && tabLayouts.current.every(l => l !== null)) {
      initialized.current = true;
      setPillWidth(width);
      snapPill(state.index, false);
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: Math.max(16, insets.bottom) }]}>
      <View style={styles.tabBar}>
        {pillWidth > 0 && (
          <Animated.View
            style={[styles.pill, { left: pillX, width: pillWidth }]}
            pointerEvents="none"
            importantForAccessibility="no"
          />
        )}
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          const color = isFocused ? colors.accent : colors.muted;
          const label = typeof options.title === 'string' ? options.title : route.name;
          const icon = options.tabBarIcon?.({ focused: isFocused, color, size: 22 });

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name as never);
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };

          return (
            <TouchableOpacity
              key={route.key}
              onPress={onPress}
              onLongPress={onLongPress}
              onLayout={onTabLayout(index)}
              style={styles.tabItem}
              activeOpacity={0.75}
              accessibilityRole="tab"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
            >
              <View style={styles.tabContent}>
                {icon}
                <Text style={isFocused ? styles.labelActive : styles.labelInactive}>
                  {label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="index"
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Finder',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="map-search" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Add',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="map-marker-plus" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-circle" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bg,
    paddingHorizontal: 16,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  pill: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    backgroundColor: colors.bg,
    borderRadius: 20,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
  },
  tabContent: {
    width: '100%',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  labelActive: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.accent,
  },
  labelInactive: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.muted,
  },
});
