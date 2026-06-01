import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../../lib/theme';

export default function ProfileScreen() {
  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <Text style={styles.wordmark}>RunRelief</Text>
      <Text style={styles.soon}>Profile coming soon</Text>
      <Text style={styles.note}>
        Contribution stats and achievements will live here
      </Text>
    </View>
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
  wordmark: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.accent,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  soon: {
    fontSize: 16,
    color: colors.muted,
    marginBottom: 8,
  },
  note: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 19,
  },
});
