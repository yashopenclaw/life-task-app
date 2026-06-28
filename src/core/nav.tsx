import { ComponentType, useEffect, useMemo, useState } from 'react';
import { Pressable, SafeAreaView, StatusBar, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { features } from '../features';
import { colors } from './theme';
import { loadJson, saveJson } from './storage';
import { TabIcon, TabIconName } from './ui/TabIcon';
import { AuroraBackground } from './ui/AuroraBackground';
import { GlassCard } from './ui/GlassCard';
import { fonts } from './fonts';

const visibleTabs = ['workouts', 'calories', 'tasks'];
const iconMap: Record<string, TabIconName> = {
  workouts: 'dumbbell',
  calories: 'flame',
  tasks: 'check',
};
const accentMap: Record<string, { accent: string; accent2: string }> = {
  workouts: { accent: '#b7ff5a', accent2: '#c7a24a' },
  calories: { accent: '#f3be65', accent2: '#c9ff4a' },
  tasks: { accent: '#5b9eff', accent2: '#8a7cff' },
};
const SELECTED_TAB_KEY = 'life-task:selected-tab:v1';

export function NavShell() {
  const { width } = useWindowDimensions();
  const compact = width < 720;
  const primaryFeatures = useMemo(() => features.filter(f => visibleTabs.includes(f.key)), []);
  const [selectedKey, setSelectedKey] = useState(primaryFeatures[0]?.key || 'workouts');

  // Animated indicator position
  const colorProgress = useSharedValue(0);
  const tabKeys = primaryFeatures.map(f => f.key);
  const maxIndex = Math.max(1, tabKeys.length - 1);

  useEffect(() => {
    loadJson<string>(SELECTED_TAB_KEY, primaryFeatures[0]?.key || 'workouts').then(saved => {
      if (primaryFeatures.some(feature => feature.key === saved)) {
        setSelectedKey(saved);
        const idx = tabKeys.indexOf(saved);
        colorProgress.value = idx / maxIndex;
      }
      else saveJson(SELECTED_TAB_KEY, primaryFeatures[0]?.key || 'workouts');
    });
  }, [primaryFeatures]);

  function selectTab(key: string) {
    setSelectedKey(key); saveJson(SELECTED_TAB_KEY, key);
    const idx = tabKeys.indexOf(key);
    colorProgress.value = withTiming(idx / maxIndex, { duration: 700, easing: Easing.inOut(Easing.cubic) });
  }

  const topInset = Math.max(52, (StatusBar.currentHeight || 0) + 24);

  return <SafeAreaView style={styles.app}>
    {/* Deep aurora wash — per-screen dark base + accent glow */}
    <AuroraBackground screen={selectedKey} />

    <View style={[styles.content, compact && styles.contentCompact]}>
      {primaryFeatures.map(feature => {
        const Screen = feature.component as ComponentType;
        const active = selectedKey === feature.key;
        return <View key={feature.key} style={[styles.screenSlot, { paddingTop: topInset }, !active && styles.screenHidden]}><Screen /></View>;
      })}
    </View>

    <LiquidRail
      tabs={primaryFeatures}
      selectedKey={selectedKey}
      onSelect={selectTab}
      colorProgress={colorProgress}
      tabKeys={tabKeys}
      maxIndex={maxIndex}
    />
  </SafeAreaView>;
}

function LiquidRail({ tabs, selectedKey, onSelect, colorProgress, tabKeys, maxIndex }: {
  tabs: typeof features;
  selectedKey: string;
  onSelect: (key: string) => void;
  colorProgress: any;
  tabKeys: string[];
  maxIndex: number;
}) {
  const indicatorStyle = useAnimatedStyle(() => {
    'worklet';
    const idx = colorProgress.value * maxIndex;
    const tabWidth = 100 / tabKeys.length;
    return { left: `${idx * tabWidth}%`, width: `${tabWidth}%` };
  });

  return <View style={styles.bottomWrap}>
    <View style={styles.rail}>
      {/* Liquid white bubble — slides between tabs */}
      <Animated.View style={[styles.indicator, indicatorStyle]} />
      {tabs.map(f => {
        const active = selectedKey === f.key;
        const accent = (accentMap[f.key] || accentMap.workouts).accent;
        return <Pressable key={f.key} accessibilityRole="button" onPress={() => onSelect(f.key)} style={styles.tabButton}>
          <View style={styles.tabContent}>
            <TabIcon name={iconMap[f.key] || 'square'} active={active} color={active ? accent : '#8a8f99'} size={20} />
            <Text numberOfLines={1} style={[styles.tabLabel, active && { color: accent }]}>{f.title}</Text>
          </View>
        </Pressable>;
      })}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: '#08090e', overflow: 'hidden' },
  content: { flex: 1, maxWidth: 560, width: '100%', alignSelf: 'center' },
  contentCompact: {},
  screenSlot: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, paddingHorizontal: 24, paddingBottom: 96 },
  screenHidden: { opacity: 0, display: 'none' },
  bottomWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 24, paddingBottom: 16, paddingTop: 6 },
  rail: { flexDirection: 'row', height: 58, borderRadius: 29, backgroundColor: 'rgba(14,16,20,0.82)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' as const, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 20, shadowOffset: { width: 0, height: 4 }, elevation: 12 },
  indicator: { position: 'absolute', top: 5, bottom: 5, backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 25, marginHorizontal: 6, shadowColor: '#fff', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
  tabButton: { flex: 1, height: 58, alignItems: 'center', justifyContent: 'center' },
  tabContent: { flexDirection: 'row', alignItems: 'center', gap: 7, height: 38, borderRadius: 19, paddingHorizontal: 14 },
  tabLabel: { color: '#8a8f99', fontFamily: fonts.bodyMedium, fontSize: 12, letterSpacing: 0.2 },
});
