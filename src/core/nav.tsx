import { ComponentType, useEffect, useMemo, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { features } from '../features';
import { colors } from './theme';
import { loadJson, saveJson } from './storage';
import { TabIcon, TabIconName } from './ui/TabIcon';
import { AuroraBackground } from './ui/AuroraBackground';
import { GlassCard } from './ui/GlassCard';
import { fonts } from './fonts';

const visibleTabs = ['assistant', 'calories', 'tasks'];
const iconMap: Record<string, TabIconName> = {
  assistant: 'mic',
  calories: 'flame',
  tasks: 'check',
};
const accentMap: Record<string, { accent: string; accent2: string }> = {
  assistant: { accent: colors.primary, accent2: colors.blue },
  calories: { accent: '#f3be65', accent2: colors.lime },
  tasks: { accent: colors.blue, accent2: colors.primary },
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
      else saveJson(SELECTED_TAB_KEY, primaryFeatures[0]?.key || 'assistant');
    });
  }, [primaryFeatures]);

  function selectTab(key: string) { setSelectedKey(key); saveJson(SELECTED_TAB_KEY, key); }

  const aurora = accentMap[selectedKey] || accentMap.assistant;

  return <SafeAreaView style={styles.app}>
    <AuroraBackground accent={aurora.accent} accent2={aurora.accent2} />
    <View style={[styles.content, compact && styles.contentCompact]}>
      {primaryFeatures.map(feature => {
        const Screen = feature.component as ComponentType;
        const active = selectedKey === feature.key;
        return <View key={feature.key} style={[styles.screenSlot, !active && styles.screenHidden]}><Screen /></View>;
      })}
    </View>
    <View style={[styles.bottomWrap, compact && styles.bottomWrapCompact]}>
      <GlassCard style={styles.rail} contentStyle={styles.railContent}>
        <View style={styles.railScroller}>
          {primaryFeatures.map(f => {
            const active = selectedKey === f.key;
            const accent = (accentMap[f.key] || accentMap.assistant).accent;
            return <Pressable key={f.key} accessibilityRole="button" onPress={() => selectTab(f.key)} style={[styles.iconButton, active && styles.iconButtonActive, active && { backgroundColor: accent, shadowColor: accent }]}>
              {active ? <View style={styles.activeSheen} /> : null}
              <TabIcon name={iconMap[f.key] || 'square'} active={active} color={active ? '#050608' : '#7f8590'} size={21} />
              <Text numberOfLines={1} style={[styles.tabLabel, !active && styles.tabLabelMuted]}>{f.title}</Text>
            </Pressable>;
          })}
        </View>
      </GlassCard>
    </View>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.bg, overflow: 'hidden' },
  content: { flex: 1, maxWidth: 560, width: '100%', alignSelf: 'center' },
  contentCompact: {},
  screenSlot: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, paddingHorizontal: 24, paddingTop: 28, paddingBottom: 92 },
  screenHidden: { opacity: 0, display: 'none' },
  bottomWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 22, paddingBottom: 18, paddingTop: 8 },
  bottomWrapCompact: { paddingHorizontal: 16, paddingBottom: 14 },
  rail: { height: 68, borderRadius: 34, shadowColor: '#000', shadowOpacity: 0.42, shadowRadius: 22, elevation: 16 },
  railContent: { flex: 1 },
  railScroller: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 8, gap: 7 },
  iconButton: { flex: 1, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, paddingHorizontal: 8, shadowOpacity: 0.24, shadowRadius: 10, elevation: 5, overflow: 'hidden' },
  iconButtonActive: { flex: 1.12 },
  activeSheen: { position: 'absolute', left: 10, right: 10, top: 5, height: 1, backgroundColor: 'rgba(255,255,255,0.34)' },
  tabLabel: { color: '#050608', fontFamily: fonts.bodySemibold, fontSize: 11.5, letterSpacing: 0.1 },
  tabLabelMuted: { color: '#8f96a1' },
});
