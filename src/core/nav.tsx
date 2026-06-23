import { ComponentType, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { features } from '../features';
import { colors } from './theme';
import { loadJson, saveJson } from './storage';
import { TabIcon, TabIconName } from './ui/TabIcon';

const visibleTabs = ['assistant', 'tasks', 'calories', 'notes', 'summaries', 'books'];
const iconMap: Record<string, TabIconName> = {
  assistant: 'mic', tasks: 'tasks', calories: 'calories', notes: 'notes', summaries: 'summary', books: 'square',
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

  return <View style={styles.app}>
    <View style={[styles.content, compact && styles.contentCompact]}>
      {primaryFeatures.map(feature => {
        const Screen = feature.component as ComponentType;
        const active = selectedKey === feature.key;
        return <View key={feature.key} pointerEvents={active ? 'auto' : 'none'} style={[styles.screenSlot, !active && styles.screenHidden]}><Screen /></View>;
      })}
    </View>
    <View style={styles.bottomWrap}>
      <View style={styles.rail}>
        {primaryFeatures.map(f => {
          const active = selectedKey === f.key;
          return <Pressable key={f.key} accessibilityRole="button" onPress={() => selectTab(f.key)} style={[styles.iconButton, active && styles.iconButtonActive]}>
            <TabIcon name={iconMap[f.key] || 'square'} active={active} size={22} />
          </Pressable>;
        })}
      </View>
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
  rail: { height: 58, borderRadius: 29, backgroundColor: 'rgba(10,12,17,0.94)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.095)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', shadowColor: '#000', shadowOpacity: 0.42, shadowRadius: 22, elevation: 16 },
  iconButton: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  iconButtonActive: { backgroundColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.28, shadowRadius: 10, elevation: 6 },
});
