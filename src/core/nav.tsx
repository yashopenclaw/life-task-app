import { ComponentType, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { features } from '../features';
import { colors } from './theme';

export function NavShell() {
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const [selectedKey, setSelectedKey] = useState(features[0]?.key || '');
  const selected = useMemo(() => features.find(f => f.key === selectedKey) || features[0], [selectedKey]);
  const Screen = selected?.component as ComponentType;
  const iconFor = (icon: string) => ({
    mic: '🎙️',
    'checkmark-circle': '✓',
    flame: '🔥',
    journal: '📓',
    'document-text': '✍️',
    newspaper: '🗞️',
    book: '📚',
  }[icon] || icon);

  return <View style={styles.app}>
    <View style={styles.header}>
      <Text style={styles.title}>Life Task</Text>
      <Text style={styles.subtitle}>Talk, log, finish the next thing.</Text>
    </View>
    <View style={[styles.layout, compact && styles.layoutCompact]}>
      <ScrollView horizontal={compact} showsHorizontalScrollIndicator={false} style={[styles.nav, compact && styles.navCompact]} contentContainerStyle={compact ? styles.navCompactContent : undefined}>
        {features.map(f => <TouchableOpacity
          key={f.key}
          accessibilityRole="button"
          onPress={() => setSelectedKey(f.key)}
          {...({ onClick: () => setSelectedKey(f.key) } as object)}
          style={[styles.navItem, compact && styles.navItemCompact, selectedKey === f.key && styles.navItemActive]}
        >
          <Text style={[styles.navIcon, selectedKey === f.key && styles.navTextActive]}>{iconFor(f.icon)}</Text>
          <Text style={[styles.navText, selectedKey === f.key && styles.navTextActive]}>{f.title}</Text>
        </TouchableOpacity>)}
      </ScrollView>
      <View style={[styles.content, compact && styles.contentCompact]}>
        {Screen ? <><Text style={styles.pageTitle}>{selected.title}</Text><Screen /></> : <Text>No screen.</Text>}
      </View>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.bg, paddingTop: 36 },
  header: { paddingHorizontal: 18, paddingBottom: 14, borderBottomWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  title: { fontSize: 28, fontWeight: '900', color: colors.ink },
  subtitle: { color: colors.muted, fontWeight: '700', marginTop: 2 },
  layout: { flex: 1, flexDirection: 'row' },
  layoutCompact: { flexDirection: 'column' },
  nav: { width: 158, flexGrow: 0, flexShrink: 0, backgroundColor: colors.surface, borderRightWidth: 1, borderColor: colors.line },
  navCompact: { width: '100%', maxHeight: 76, flexGrow: 0, flexShrink: 0, borderRightWidth: 0, borderBottomWidth: 1 },
  navCompactContent: { paddingHorizontal: 10, alignItems: 'center' },
  navItem: { padding: 14, borderBottomWidth: 1, borderColor: '#f1f5f9' },
  navItemCompact: { borderBottomWidth: 0, borderRadius: 18, marginRight: 8, marginVertical: 10, minWidth: 92, alignItems: 'center' },
  navItemActive: { backgroundColor: colors.ink },
  navIcon: { fontSize: 18, marginBottom: 4, color: colors.ink },
  navText: { fontWeight: '900', color: colors.ink, fontSize: 12 },
  navTextActive: { color: '#fff' },
  content: { flex: 1, padding: 16 },
  contentCompact: { padding: 14 },
  pageTitle: { fontSize: 24, fontWeight: '900', marginBottom: 8, color: colors.ink },
});
