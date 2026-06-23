import { ComponentType, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { features } from '../features';
import { colors } from './theme';
import { loadJson, saveJson } from './storage';
import { TabIcon, TabIconName } from './ui/TabIcon';

const visibleTabs = ['assistant', 'tasks', 'calories', 'notes', 'summaries', 'books'];
const iconMap: Record<string, TabIconName> = {
  assistant: 'mic',
  tasks: 'tasks',
  calories: 'calories',
  notes: 'notes',
  summaries: 'summary',
  books: 'square',
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

  function selectTab(key: string) {
    setSelectedKey(key);
    saveJson(SELECTED_TAB_KEY, key);
  }

  return <View style={styles.app}>
    <View style={[styles.aura, styles.auraPurple]} />
    <View style={[styles.aura, styles.auraGreen]} />
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
      <View style={styles.rail}>
        {primaryFeatures.map(f => {
          const active = selectedKey === f.key;
          return <Pressable key={f.key} accessibilityRole="button" onPress={() => selectTab(f.key)} style={[styles.iconButton, active && styles.iconButtonActive]}>
            <TabIcon name={iconMap[f.key] || 'square'} active={active} size={24} />
          </Pressable>;
        })}
      </View>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.bg, overflow: 'hidden' },
  aura: { position: 'absolute', width: 260, height: 260, borderRadius: 130, opacity: 0.16 },
  auraPurple: { top: 120, alignSelf: 'center', backgroundColor: '#8d7cff' },
  auraGreen: { right: -120, top: 210, backgroundColor: '#cfff45', opacity: 0.08 },
  content: { flex: 1, maxWidth: 760, width: '100%', alignSelf: 'center' },
  contentCompact: {},
  screenSlot: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, paddingHorizontal: 24, paddingTop: 56, paddingBottom: 104 },
  screenHidden: { opacity: 0, display: 'none' },
  bottomWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 22, paddingBottom: 18, paddingTop: 10 },
  rail: { height: 64, borderRadius: 30, backgroundColor: 'rgba(13,15,20,0.86)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', shadowColor: '#6d70ff', shadowOpacity: 0.25, shadowRadius: 20, elevation: 14 },
  iconButton: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  iconButtonActive: { backgroundColor: '#8f7cff', shadowColor: '#8f7cff', shadowOpacity: 0.45, shadowRadius: 16, elevation: 8 },
});
