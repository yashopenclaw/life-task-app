import { ComponentType, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { features } from '../features';
import { colors } from './theme';

const visibleTabs = ['assistant', 'tasks', 'calories', 'summaries'];

export function NavShell() {
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const primaryFeatures = features.filter(f => visibleTabs.includes(f.key));
  const [selectedKey, setSelectedKey] = useState(primaryFeatures[0]?.key || '');
  const selected = useMemo(() => features.find(f => f.key === selectedKey) || primaryFeatures[0], [selectedKey, primaryFeatures]);
  const Screen = selected?.component as ComponentType;
  return <View style={styles.app}>
    <View style={[styles.content, compact && styles.contentCompact]}>{Screen ? <Screen /> : <Text style={styles.title}>No screen.</Text>}</View>
    <View style={styles.bottomWrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {primaryFeatures.map(f => <Pressable key={f.key} accessibilityRole="button" onPress={() => setSelectedKey(f.key)} style={[styles.tab, selectedKey === f.key && styles.tabActive]}>
          <Text style={[styles.tabText, selectedKey === f.key && styles.tabTextActive]}>{f.title}</Text>
        </Pressable>)}
      </ScrollView>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1, paddingHorizontal: 18, paddingTop: 36, paddingBottom: 92, maxWidth: 760, width: '100%', alignSelf: 'center' },
  contentCompact: { paddingHorizontal: 14, paddingTop: 26 },
  title: { color: colors.ink, fontWeight: '800' },
  bottomWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 16, backgroundColor: 'rgba(8,9,10,0.94)', borderTopWidth: 1, borderColor: colors.line },
  tabs: { alignItems: 'center', justifyContent: 'center', flexGrow: 1 },
  tab: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: 'transparent', marginHorizontal: 4, backgroundColor: 'transparent' },
  tabActive: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: colors.line },
  tabText: { color: colors.muted, fontWeight: '700', fontSize: 13 },
  tabTextActive: { color: colors.ink },
});
