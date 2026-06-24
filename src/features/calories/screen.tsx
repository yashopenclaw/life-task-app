import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, { Easing, runOnJS, useAnimatedProps, useAnimatedReaction, useSharedValue, withTiming } from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
import { useAsync } from '../../core/useAsync';
import { State } from '../../core/ui/atoms';
import { MicGlyph } from '../../core/ui/MicGlyph';
import { GlassCard } from '../../core/ui/GlassCard';
import { colors } from '../../core/theme';
import { fonts } from '../../core/fonts';
import { caloriesApi } from './api';

const DEFAULT_DAILY_GOAL = 2200;
const quickFoods = ['2 eggs + toast', 'protein shake', 'dal rice bowl'];

export default function CaloriesScreen() {
  const { width } = useWindowDimensions();
  const narrowPhone = width < 390;
  const { data, loading, error, load, setData } = useAsync(useCallback(() => caloriesApi.list(), []));
  const settingsState = useAsync(useCallback(() => caloriesApi.settings(), []));
  const [busy, setBusy] = useState(false);
  const [goalBusy, setGoalBusy] = useState(false);
  const [message, setMessage] = useState('');
  const dailyGoal = settingsState.data?.daily_goal || DEFAULT_DAILY_GOAL;
  const [goalDraft, setGoalDraft] = useState(String(dailyGoal));
  useEffect(() => { setGoalDraft(String(dailyGoal)); }, [dailyGoal]);
  async function saveGoal() {
    const next = Math.max(1, Math.min(20000, Number.parseInt(goalDraft.replace(/[^0-9]/g, ''), 10) || DEFAULT_DAILY_GOAL));
    setGoalBusy(true);
    try { const saved = await caloriesApi.updateSettings({ daily_goal: next }); settingsState.setData(saved); setGoalDraft(String(saved.daily_goal)); }
    finally { setGoalBusy(false); }
  }
  async function addNatural(source: 'typed' | 'voice' = 'typed') {
    const clean = message.trim(); if (!clean || busy) return;
    setBusy(true);
    try {
      const result = await caloriesApi.natural(clean, source);
      setData(prev => [result.entry, ...(prev || [])]);
      setMessage('');
    } finally { setBusy(false); }
  }
  async function remove(id: string) {
    const existing = data || [];
    const removed = existing.find(entry => entry.id === id);
    setData(existing.filter(entry => entry.id !== id));
    try { await caloriesApi.remove(id); }
    catch (err) { if (removed) setData(prev => [removed, ...(prev || [])]); throw err; }
  }
  const today = new Date().toISOString().slice(0, 10);
  const items = (data || []).filter(entry => entry.date === today);
  const total = items.reduce((sum, entry) => sum + entry.calories, 0);
  const remaining = dailyGoal - total;
  const percent = Math.min(999, Math.round((total / dailyGoal) * 100));
  const macros = useMemo(() => items.reduce((acc, entry) => { acc.protein += entry.nutrition?.protein_g || 0; acc.carbs += entry.nutrition?.carbs_g || 0; acc.fat += entry.nutrition?.fat_g || 0; return acc; }, { protein: 0, carbs: 0, fat: 0 }), [items]);
  if (loading || settingsState.loading) return <State loading />; if (error || settingsState.error) return <State error={error || settingsState.error} retry={() => { load(); settingsState.load(); }} />;

  return <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.wrap}>
    <View style={styles.topLine}><View><Text style={styles.kicker}>TODAY · NUTRITION</Text><Text style={styles.title}>Calories</Text></View></View>
    <GlassCard style={[styles.heroCard, narrowPhone && styles.heroCardNarrow]} contentStyle={[styles.heroInner, narrowPhone && styles.heroInnerNarrow]}><View style={[styles.ringWrap, narrowPhone && styles.ringWrapNarrow]}><CalorieRing total={total} goal={dailyGoal} /></View><View style={[styles.heroCopy, narrowPhone && styles.heroCopyNarrow]}><Text style={styles.heroLabel}>{remaining >= 0 ? 'ROOM LEFT' : 'OVER GOAL'}</Text><Text style={styles.heroValue}>{Math.abs(remaining).toLocaleString('en-IN')}</Text><Text style={styles.heroSub}>kcal {remaining >= 0 ? 'available today' : 'above target today'}</Text></View></GlassCard>
    <GlassCard style={styles.summaryCard} contentStyle={styles.summaryInner}><View style={styles.summaryTop}><View><Text style={styles.summaryLabel}>DAILY PACE</Text><Text style={styles.summaryCopy}>{total > dailyGoal ? 'Goal crossed. Keep dinner light.' : `${remaining.toLocaleString('en-IN')} kcal left for today.`}</Text></View><Text style={styles.summaryValue}>{percent}%</Text></View><View style={styles.meterTrack}><View style={[styles.meterFill, { width: `${Math.min(100, percent)}%` }]} /></View></GlassCard>
    <GlassCard style={styles.goalCard} contentStyle={styles.goalInner}><View><Text style={styles.goalLabel}>DAILY MAX</Text><Text style={styles.goalHint}>Visual target only</Text></View><TextInput value={goalDraft} onChangeText={setGoalDraft} keyboardType="number-pad" returnKeyType="done" onSubmitEditing={saveGoal} style={styles.goalInput} /><Pressable disabled={goalBusy} onPress={saveGoal} style={[styles.goalButton, goalBusy && styles.goalButtonBusy]}><Text style={styles.goalButtonText}>{goalBusy ? '…' : 'Set'}</Text></Pressable></GlassCard>
    <View style={styles.macroRow}><Macro value={Math.round(macros.protein)} label="PROTEIN" color="#f3be65" /><Macro value={Math.round(macros.carbs)} label="CARBS" color={colors.lime} /><Macro value={Math.round(macros.fat)} label="FAT" color="#e4d561" /></View>
    <GlassCard style={styles.inputBar} contentStyle={styles.inputBarInner}><TextInput value={message} onChangeText={setMessage} placeholder={'Say or type — "two eggs and toast"'} placeholderTextColor="#6b707b" style={styles.input} onSubmitEditing={() => addNatural('typed')} /><Pressable onPress={() => addNatural('voice')} style={styles.micButton}><MicGlyph size={23} /></Pressable></GlassCard>
    <View style={styles.quickFoodRow}>{quickFoods.map(food => <Pressable key={food} onPress={() => setMessage(food)} style={styles.quickFood}><Text style={styles.quickFoodText}>{food}</Text></Pressable>)}</View>
    <View style={styles.sectionRow}><Text style={styles.section}>TODAY</Text><Text style={styles.entries}>{items.length} entries</Text></View>
    {items.length === 0 ? <Text style={styles.empty}>No food logged yet.</Text> : items.map(entry => <GlassCard key={entry.id} style={styles.foodCard} contentStyle={styles.foodCardInner}><View style={styles.foodMiddle}><Text style={styles.foodTitle}>{entry.item}</Text><Text style={styles.foodSub}>{entry.nutrition?.serving || entry.source}</Text>{entry.nutrition ? <View style={styles.foodMacros}><FoodMacro label="P" value={entry.nutrition.protein_g} /><FoodMacro label="C" value={entry.nutrition.carbs_g} /><FoodMacro label="F" value={entry.nutrition.fat_g} /></View> : null}</View><View style={styles.foodCalWrap}><Text style={styles.foodCal}>{entry.calories}</Text><Text style={styles.foodCalLabel}>kcal</Text></View><Pressable accessibilityRole="button" onPress={() => remove(entry.id)} hitSlop={8} style={styles.foodDelete}><Text style={styles.foodDeleteText}>×</Text></Pressable></GlassCard>)}
  </ScrollView>;
}
function CalorieRing({ total, goal }: { total: number; goal: number }) {
  const circumference = 439.8;
  const targetFraction = Math.max(0, Math.min(1, total / goal));
  // One shared 0→1 progress drives both the arc offset and the counted-up number.
  const anim = useSharedValue(0);
  const [shownTotal, setShownTotal] = useState(0);
  useEffect(() => {
    anim.value = 0;
    anim.value = withTiming(1, { duration: 1300, easing: Easing.out(Easing.cubic) });
  }, [total, anim]);
  useAnimatedReaction(() => anim.value, v => { runOnJS(setShownTotal)(Math.round(total * v)); }, [total]);
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: circumference * (1 - targetFraction * anim.value) }));
  const shownLeft = Math.max(0, goal - shownTotal);
  return <View style={styles.ringOuter}>
    <Svg width={168} height={168} viewBox="0 0 168 168" style={styles.ringSvg}>
      <Defs><LinearGradient id="calorieArc" x1="20" y1="20" x2="148" y2="148"><Stop offset="0" stopColor="#f3be65" /><Stop offset="1" stopColor={colors.lime} /></LinearGradient></Defs>
      <Circle cx="84" cy="84" r="70" stroke="rgba(255,255,255,0.07)" strokeWidth="14" fill="transparent" />
      <AnimatedCircle cx="84" cy="84" r="70" stroke="url(#calorieArc)" strokeWidth="14" fill="transparent" strokeLinecap="round" strokeDasharray={`${circumference} ${circumference}`} animatedProps={animatedProps} rotation="-90" origin="84,84" />
    </Svg>
    <View style={styles.ringInner}><Text style={styles.total}>{shownTotal.toLocaleString('en-IN')}</Text><Text style={styles.goal}>of {goal.toLocaleString('en-IN')} kcal</Text><Text style={styles.left}>{shownLeft.toLocaleString('en-IN')} LEFT</Text></View>
  </View>;
}
function Macro({ value, label, color }: { value: number; label: string; color: string }) { return <GlassCard style={styles.macro} contentStyle={styles.macroInner}><Text style={[styles.macroValue, { color }]}>{value}g</Text><Text style={styles.macroLabel}>{label}</Text></GlassCard>; }
function FoodMacro({ label, value }: { label: string; value?: number }) { return <View style={styles.foodMacroPill}><Text style={styles.foodMacroLabel}>{label}</Text><Text style={styles.foodMacroValue}>{Math.round(value || 0)}g</Text></View>; }
const styles = StyleSheet.create({
  wrap: { paddingBottom: 22 },
  topLine: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  kicker: { color: '#8b909a', fontSize: 11, letterSpacing: 4.5, fontFamily: fonts.bodySemibold, marginBottom: 12 },
  title: { color: colors.ink, fontSize: 38, lineHeight: 43, fontFamily: fonts.displaySemibold, letterSpacing: -1.3 },
  heroCard: { minHeight: 210, borderRadius: 32, marginTop: 28, marginBottom: 16, borderColor: 'rgba(243,190,101,0.15)' },
  heroCardNarrow: { minHeight: 308, marginTop: 22 },
  heroInner: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18, paddingHorizontal: 14 },
  heroInnerNarrow: { flexDirection: 'column', gap: 4, paddingVertical: 18 },
  ringWrap: { alignItems: 'center' },
  ringWrapNarrow: { transform: [{ scale: 0.92 }], marginBottom: -4 },
  heroCopy: { minWidth: 112 },
  heroCopyNarrow: { alignItems: 'center', minWidth: 0 },
  heroLabel: { color: '#a5a9b3', fontSize: 10, letterSpacing: 2.1, fontFamily: fonts.bodySemibold },
  heroValue: { color: colors.ink, fontSize: 38, fontFamily: fonts.displaySemibold, letterSpacing: -1.3, marginTop: 8 },
  heroSub: { color: colors.muted, fontSize: 13, lineHeight: 17, fontFamily: fonts.bodyMedium, marginTop: 2 },
  ringOuter: { width: 168, height: 168, alignItems: 'center', justifyContent: 'center', shadowColor: colors.lime, shadowOpacity: 0.40, shadowRadius: 18, elevation: 9 },
  ringSvg: { position: 'absolute' },
  ringInner: { width: 118, height: 118, borderRadius: 59, alignItems: 'center', justifyContent: 'center' },
  total: { color: colors.ink, fontSize: 42, fontFamily: fonts.displaySemibold, letterSpacing: -1.4 },
  goal: { color: colors.muted, fontSize: 13, fontFamily: fonts.bodyMedium, marginTop: 2 },
  left: { color: colors.lime, fontSize: 13, fontFamily: fonts.bodySemibold, marginTop: 6, letterSpacing: 1.2 },
  summaryCard: { minHeight: 92, borderRadius: 24, marginBottom: 12 },
  summaryInner: { flex: 1, paddingHorizontal: 18, paddingVertical: 15, justifyContent: 'center', gap: 12 },
  summaryTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 },
  summaryLabel: { color: colors.muted, fontFamily: fonts.bodySemibold, fontSize: 10, letterSpacing: 2.2 },
  summaryValue: { color: colors.ink, fontFamily: fonts.displaySemibold, fontSize: 30, letterSpacing: -0.8 },
  summaryCopy: { color: colors.soft, fontFamily: fonts.bodyMedium, lineHeight: 19, marginTop: 5 },
  meterTrack: { height: 6, borderRadius: 999, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.07)' },
  meterFill: { height: 6, borderRadius: 999, backgroundColor: colors.lime },
  goalCard: { minHeight: 64, borderRadius: 22, marginBottom: 16 },
  goalInner: { flex: 1, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  goalLabel: { color: '#e6c783', fontFamily: fonts.bodySemibold, fontSize: 10, letterSpacing: 2.0 },
  goalHint: { color: colors.muted, fontFamily: fonts.bodyMedium, fontSize: 12, marginTop: 4 },
  goalInput: { flex: 1, minHeight: 42, borderRadius: 16, paddingHorizontal: 12, textAlign: 'right', color: colors.ink, backgroundColor: 'rgba(255,255,255,0.045)', fontFamily: fonts.displaySemibold, fontSize: 20 },
  goalButton: { minWidth: 52, height: 42, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3be65' },
  goalButtonBusy: { opacity: 0.55 },
  goalButtonText: { color: '#050608', fontFamily: fonts.bodySemibold, fontSize: 13 },
  macroRow: { flexDirection: 'row', gap: 12, marginBottom: 26 },
  macro: { flex: 1, height: 74, borderRadius: 22 },
  macroInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  macroValue: { fontFamily: fonts.displaySemibold, fontSize: 18 },
  macroLabel: { color: '#7e8490', fontSize: 10, fontFamily: fonts.bodySemibold, letterSpacing: 1.8, marginTop: 6 },
  inputBar: { minHeight: 62, borderRadius: 22, marginBottom: 12 },
  inputBarInner: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingLeft: 18, paddingRight: 8 },
  input: { flex: 1, color: colors.ink, fontFamily: fonts.bodyMedium, fontSize: 15 },
  micButton: { width: 46, height: 46, borderRadius: 17, backgroundColor: colors.yellow, alignItems: 'center', justifyContent: 'center' },
  quickFoodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 26 },
  quickFood: { borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7, backgroundColor: 'rgba(243,190,101,0.10)', borderWidth: 1, borderColor: 'rgba(243,190,101,0.16)' },
  quickFoodText: { color: '#e6c783', fontFamily: fonts.bodySemibold, fontSize: 12 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  section: { color: colors.lime, fontSize: 12, letterSpacing: 3.6, fontFamily: fonts.bodySemibold },
  entries: { color: colors.muted, fontFamily: fonts.bodyMedium, fontSize: 13 },
  empty: { color: colors.muted, fontFamily: fonts.bodyMedium, paddingVertical: 14, fontSize: 15 },
  foodCard: { minHeight: 82, borderRadius: 22, marginBottom: 10 },
  foodCardInner: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  foodMiddle: { flex: 1 },
  foodTitle: { color: colors.ink, fontFamily: fonts.bodySemibold, fontSize: 15 },
  foodSub: { color: colors.muted, fontFamily: fonts.bodyMedium, fontSize: 12, marginTop: 4 },
  foodMacros: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  foodMacroPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: 'rgba(255,255,255,0.045)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  foodMacroLabel: { color: '#8d929d', fontFamily: fonts.bodySemibold, fontSize: 10 },
  foodMacroValue: { color: colors.soft, fontFamily: fonts.bodySemibold, fontSize: 11 },
  foodCalWrap: { minWidth: 52, alignItems: 'flex-end' },
  foodCal: { color: colors.lime, fontFamily: fonts.displaySemibold, fontSize: 20, letterSpacing: -0.4 },
  foodCalLabel: { color: colors.muted, fontFamily: fonts.bodySemibold, fontSize: 10, letterSpacing: 1.4, marginTop: 2 },
  foodDelete: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.055)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)' },
  foodDeleteText: { color: '#ffb18f', fontFamily: fonts.displayMedium, fontSize: 24, lineHeight: 26 },
});
