import { ComponentType, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { features } from '../features';
import { colors } from './theme';
import { loadJson, saveJson } from './storage';

const visibleTabs = ['assistant', 'tasks', 'calories', 'summaries'];
const SELECTED_TAB_KEY = 'life-task:selected-tab:v1';

export function NavShell() {
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const primaryFeatures = useMemo(() => features.filter(f => visibleTabs.includes(f.key)), []);
  const [selectedKey, setSelectedKey] = useState(primaryFeatures[0]?.key || 'assistant');

  useEffect(() => {
    loadJson<string>(SELECTED_TAB_KEY, primaryFeatures[0]?.key || 'assistant').then(saved => {
      if (primaryFeatures.some(feature => feature.key === saved)) setSelectedKey(saved);
    });
  }, [primaryFeatures]);

  function selectTab(key: string) {
    setSelectedKey(key);
    saveJson(SELECTED_TAB_KEY, key);
  }

  return <View style={styles.app}>
    <View style={[styles.content, compact && styles.contentCompact]}>
      {primaryFeatures.map(feature => {
        const Screen = feature.component as ComponentType;
        const active = selectedKey === feature.key;
        return <View key={feature.key} pointerEvents={active ? 'auto' : 'none'} style={[styles.screenSlot, !active && styles.screenHidden]}>
          <Screen />
        </View>;
      })}
    </View>
    <View style={styles.bottomWrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {primaryFeatures.map(f => <Pressable key={f.key} accessibilityRole="button" onPress={() => selectTab(f.key)} style={[styles.tab, selectedKey === f.key && styles.tabActive]}>
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
  screenSlot: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, paddingHorizontal: 18, paddingTop: 36, paddingBottom: 92 },
  screenHidden: { opacity: 0, display: 'none' },
  bottomWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 16, backgroundColor: 'rgba(8,9,10,0.94)', borderTopWidth: 1, borderColor: colors.line },
  tabs: { alignItems: 'center', justifyContent: 'center', flexGrow: 1 },
  tab: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: 'transparent', marginHorizontal: 4, backgroundColor: 'transparent' },
  tabActive: { backgroundColor: 'rgba(255,255,255,0.06)', borderColor: colors.line },
  tabText: { color: colors.muted, fontWeight: '700', fontSize: 13 },
  tabTextActive: { color: colors.ink },
});
