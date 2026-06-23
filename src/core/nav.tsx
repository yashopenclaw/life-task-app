import { ComponentType, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { features } from '../features';
import { colors } from './theme';
import { loadJson, saveJson } from './storage';
import { TabIcon, TabIconName } from './ui/TabIcon';
import { AuroraBackground } from './ui/AuroraBackground';
import { GlassCard } from './ui/GlassCard';

const visibleTabs = ['assistant', 'tasks', 'calories', 'notes', 'summaries', 'brief', 'books'];
const iconMap: Record<string, TabIconName> = {
  assistant: 'mic', tasks: 'check-square', calories: 'zap', notes: 'feather', summaries: 'file-text', brief: 'file', books: 'book-open',
};
const accentMap: Record<string, { accent: string; accent2: string }> = {
  assistant: { accent: colors.primary, accent2: colors.blue },
  tasks: { accent: colors.blue, accent2: colors.primary },
  calories: { accent: '#f3be65', accent2: colors.lime },
  notes: { accent: '#d7bbff', accent2: colors.primary },
  summaries: { accent: '#34d7bd', accent2: colors.blue },
  brief: { accent: '#34d7bd', accent2: colors.primary },
  books: { accent: '#f0b981', accent2: colors.primary },
};
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

  function selectTab(key: string) { setSelectedKey(key); saveJson(SELECTED_TAB_KEY, key); }

  const aurora = accentMap[selectedKey] || accentMap.assistant;

  return <View style={styles.app}>
    <AuroraBackground accent={aurora.accent} accent2={aurora.accent2} />
    <View style={[styles.content, compact && styles.contentCompact]}>
      {primaryFeatures.map(feature => {
        const Screen = feature.component as ComponentType;
        const active = selectedKey === feature.key;
        return <View key={feature.key} pointerEvents={active ? 'auto' : 'none'} style={[styles.screenSlot, !active && styles.screenHidden]}><Screen /></View>;
      })}
    </View>
    <View style={styles.bottomWrap}>
      <GlassCard style={styles.rail} contentStyle={styles.railContent}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.railScroller}>
          {primaryFeatures.map(f => {
            const active = selectedKey === f.key;
            const accent = (accentMap[f.key] || accentMap.assistant).accent;
            return <Pressable key={f.key} accessibilityRole="button" onPress={() => selectTab(f.key)} style={[styles.iconButton, active && { backgroundColor: accent, shadowColor: accent }]}>
              <TabIcon name={iconMap[f.key] || 'file-text'} active={active} color={active ? '#050608' : '#747985'} size={22} />
            </Pressable>;
          })}
        </ScrollView>
      </GlassCard>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.bg, overflow: 'hidden' },
  content: { flex: 1, maxWidth: 560, width: '100%', alignSelf: 'center' },
  contentCompact: {},
  screenSlot: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, paddingHorizontal: 24, paddingTop: 54, paddingBottom: 92 },
  screenHidden: { opacity: 0, display: 'none' },
  bottomWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 28, paddingBottom: 18, paddingTop: 8 },
  rail: { height: 58, borderRadius: 29, shadowColor: '#000', shadowOpacity: 0.42, shadowRadius: 22, elevation: 16 },
  railContent: { flex: 1 },
  railScroller: { minWidth: '100%', flexGrow: 1, alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 8, gap: 8 },
  iconButton: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.30, shadowRadius: 10, elevation: 6 },
});
