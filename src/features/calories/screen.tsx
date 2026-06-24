import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, { Easing, runOnJS, useAnimatedProps, useAnimatedReaction, useSharedValue, withTiming } from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
import { useAsync } from '../../core/useAsync';
import { State } from '../../core/ui/atoms';
import { GlassCard } from '../../core/ui/GlassCard';
import { colors } from '../../core/theme';
import { fonts } from '../../core/fonts';
import { caloriesApi } from './api';

const DEFAULT_DAILY_GOAL = 2200;

export default function CaloriesScreen() {
  const { width } = useWindowDimensions();
  const narrowPhone = width < 390;
  const { data, loading, error, load, setData } = useAsync(useCallback(() => caloriesApi.list(), []));
  const settingsState = useAsync(useCallback(() => caloriesApi.settings(), []));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const dailyGoal = settingsState.data?.daily_goal || DEFAULT_DAILY_GOAL;
  const [goalEditOpen, setGoalEditOpen] = useState(false);
  const [goalDraft, setGoalDraft] = useState(String(dailyGoal));
  useEffect(() => { setGoalDraft(String(dailyGoal)); }, [dailyGoal]);

  async function saveGoal() {
    const next = Math.max(1, Math.min(20000, Number.parseInt(goalDraft.replace(/[^0-9]/g, ''), 10) || DEFAULT_DAILY_GOAL));
    setGoalEditOpen(false);
    try { const saved = await caloriesApi.updateSettings({ daily_goal: next }); settingsState.setData(saved); setGoalDraft(String(saved.daily_goal)); }
    catch { setGoalDraft(String(dailyGoal)); }
  }
  async function addNatural() {
    const clean = message.trim(); if (!clean || busy) return;
    setBusy(true);
    try {
      const result = await caloriesApi.natural(clean, 'typed');
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
  const percent = Math.min(100, Math.round((total / dailyGoal) * 100));
  const macros = useMemo(() => items.reduce((acc, entry) => { acc.protein += entry.nutrition?.protein_g || 0; acc.carbs += entry.nutrition?.carbs_g || 0; acc.fat += entry.nutrition?.fat_g || 0; return acc; }, { protein: 0, carbs: 0, fat: 0 }), [items]);
  if (loading || settingsState.loading) return <State loading />; if (error || settingsState.error) return <State error={error || settingsState.error} retry={() => { load(); settingsState.load(); }} />;

  return <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.wrap}>
    <View style={styles.header}>
      <Text style={styles.kicker}>NUTRITION</Text>
      <Text style={styles.title}>Calories</Text>
    </View>

    {/* Ring as sole hero */}
    <View style={styles.ringHero}>
      <CalorieRing total={total} goal={dailyGoal} remaining={remaining} percent={percent} busy={busy} />
    </View>

    {/* Goal line */}
    <Pressable onPress={() => { setGoalDraft(String(dailyGoal)); setGoalEditOpen(!goalEditOpen); }} style={styles.goalLine}>
      <Text style={styles.goalLineText}>Goal: {dailyGoal.toLocaleString('en-IN')} kcal</Text>
      <Text style={styles.goalLineEdit}>{goalEditOpen ? 'cancel' : 'edit'}</Text>
    </Pressable>
    {goalEditOpen ? <View style={styles.goalEditRow}>
      <TextInput value={goalDraft} onChangeText={setGoalDraft} keyboardType="number-pad" returnKeyType="done" onSubmitEditing={saveGoal} style={styles.goalInput} autoFocus />
      <Pressable onPress={saveGoal} style={styles.goalSave}><Text style={styles.goalSaveText}>Save</Text></Pressable>
    </View> : null}

    {/* Macros */}
    <View style={styles.macroRow}>
      <Macro value={Math.round(macros.protein)} label="Protein" color="#f3be65" />
      <Macro value={Math.round(macros.carbs)} label="Carbs" color={colors.lime} />
      <Macro value={Math.round(macros.fat)} label="Fat" color="#e4d561" />
    </View>

    {/* Input bar — submit arrow, not mic */}
    <GlassCard style={styles.inputBar} contentStyle={styles.inputBarInner}>
      <TextInput
        value={message}
        onChangeText={setMessage}
        placeholder='Log food — "two eggs and toast"'
        placeholderTextColor="#555b66"
        style={styles.input}
        onSubmitEditing={addNatural}
        editable={!busy}
      />
      <Pressable onPress={addNatural} disabled={busy || !message.trim()} style={[styles.submitButton, (busy || !message.trim()) && styles.submitButtonDisabled]}>
        {busy ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitArrow}>↑</Text>}
      </Pressable>
    </GlassCard>

    {/* Today's entries */}
    <Text style={styles.sectionLabel}>Today · {items.length}</Text>
    {items.length === 0
      ? <Text style={styles.empty}>Nothing logged yet.</Text>
      : items.map(entry => <GlassCard key={entry.id} style={styles.foodCard} contentStyle={styles.foodCardInner}>
          <View style={styles.foodInfo}>
            <Text style={styles.foodTitle}>{entry.item}</Text>
            <Text style={styles.foodSub}>{entry.nutrition?.serving || entry.source}</Text>
            {entry.nutrition ? <View style={styles.foodMacros}>
              <FoodMacro label="P" value={entry.nutrition.protein_g} />
              <FoodMacro label="C" value={entry.nutrition.carbs_g} />
              <FoodMacro label="F" value={entry.nutrition.fat_g} />
            </View> : null}
          </View>
          <View style={styles.foodCalCol}>
            <Text style={styles.foodCal}>{entry.calories}</Text>
            <Text style={styles.foodCalUnit}>kcal</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={() => remove(entry.id)} hitSlop={8} style={styles.foodDelete}>
            <Text style={styles.foodDeleteText}>×</Text>
          </Pressable>
        </GlassCard>)}
  </ScrollView>;
}

function CalorieRing({ total, goal, remaining, percent, busy }: { total: number; goal: number; remaining: number; percent: number; busy: boolean }) {
  const circumference = 439.8;
  const targetFraction = Math.max(0, Math.min(1, total / goal));
  const anim = useSharedValue(0);
  const [shownTotal, setShownTotal] = useState(0);
  useEffect(() => {
    anim.value = 0;
    anim.value = withTiming(1, { duration: 1200, easing: Easing.out(Easing.cubic) });
  }, [total, anim]);
  useAnimatedReaction(() => anim.value, v => { runOnJS(setShownTotal)(Math.round(total * v)); }, [total]);
  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: circumference * (1 - targetFraction * anim.value) }));
  const over = remaining < 0;
  return <View style={styles.ringOuter}>
    <Svg width={180} height={180} viewBox="0 0 168 168" style={styles.ringSvg}>
      <Defs><LinearGradient id="calorieArc" x1="20" y1="20" x2="148" y2="148"><Stop offset="0" stopColor={over ? colors.danger : '#f3be65'} /><Stop offset="1" stopColor={over ? '#ff8a8a' : colors.lime} /></LinearGradient></Defs>
      <Circle cx="84" cy="84" r="70" stroke="rgba(255,255,255,0.06)" strokeWidth="10" fill="transparent" />
      <AnimatedCircle cx="84" cy="84" r="70" stroke="url(#calorieArc)" strokeWidth="10" fill="transparent" strokeLinecap="round" strokeDasharray={`${circumference} ${circumference}`} animatedProps={animatedProps} rotation="-90" origin="84,84" />
    </Svg>
    <View style={styles.ringInner}>
      {busy ? <>
        <ActivityIndicator size="large" color={colors.lime} />
        <Text style={styles.ringThinking}>Parsing…</Text>
      </> : <>
        <Text style={styles.ringTotal}>{shownTotal.toLocaleString('en-IN')}</Text>
        <Text style={styles.ringUnit}>of {goal.toLocaleString('en-IN')}</Text>
        <Text style={[styles.ringRemaining, over && styles.ringOver]}>{over ? `${Math.abs(remaining).toLocaleString('en-IN')} over` : `${remaining.toLocaleString('en-IN')} left`}</Text>
      </>}
    </View>
  </View>;
}

function Macro({ value, label, color }: { value: number; label: string; color: string }) {
  return <GlassCard style={styles.macro} contentStyle={styles.macroInner}>
    <Text style={[styles.macroValue, { color }]}>{value}<Text style={styles.macroUnit}>g</Text></Text>
    <Text style={styles.macroLabel}>{label}</Text>
  </GlassCard>;
}
function FoodMacro({ label, value }: { label: string; value?: number }) {
  return <View style={styles.foodMacroPill}><Text style={styles.foodMacroLabel}>{label}</Text><Text style={styles.foodMacroValue}>{Math.round(value || 0)}g</Text></View>;
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: 24 },
  header: { alignItems: 'center', marginTop: 4 },
  kicker: { color: '#6c717c', fontSize: 10, letterSpacing: 3.8, fontFamily: fonts.bodySemibold },
  title: { color: colors.ink, fontSize: 34, fontFamily: fonts.displaySemibold, letterSpacing: -1.0, marginTop: 6 },
  ringHero: { alignItems: 'center', marginTop: 28, marginBottom: 16 },
  ringOuter: { width: 180, height: 180, alignItems: 'center', justifyContent: 'center', shadowColor: colors.lime, shadowOpacity: 0.18, shadowRadius: 24, elevation: 6 },
  ringSvg: { position: 'absolute' },
  ringInner: { width: 130, height: 130, borderRadius: 65, alignItems: 'center', justifyContent: 'center' },
  ringTotal: { color: colors.ink, fontSize: 40, fontFamily: fonts.displaySemibold, letterSpacing: -1.2 },
  ringUnit: { color: colors.muted, fontSize: 12, fontFamily: fonts.bodyMedium, marginTop: 2 },
  ringRemaining: { color: colors.lime, fontSize: 13, fontFamily: fonts.bodySemibold, marginTop: 8, letterSpacing: 0.3 },
  ringOver: { color: colors.danger },
  ringThinking: { color: colors.lime, fontSize: 13, fontFamily: fonts.bodySemibold, marginTop: 10, letterSpacing: 0.3 },
  goalLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 },
  goalLineText: { color: colors.muted, fontSize: 13, fontFamily: fonts.bodyMedium },
  goalLineEdit: { color: colors.primary, fontSize: 12, fontFamily: fonts.bodySemibold },
  goalEditRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16 },
  goalInput: { width: 100, height: 40, borderRadius: 14, paddingHorizontal: 12, textAlign: 'center', color: colors.ink, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', fontFamily: fonts.displaySemibold, fontSize: 18 },
  goalSave: { height: 40, borderRadius: 14, paddingHorizontal: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  goalSaveText: { color: '#fff', fontFamily: fonts.bodySemibold, fontSize: 13 },
  macroRow: { flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 24 },
  macro: { flex: 1, height: 72, borderRadius: 20 },
  macroInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  macroValue: { fontFamily: fonts.displaySemibold, fontSize: 20, letterSpacing: -0.3 },
  macroUnit: { fontSize: 13, fontFamily: fonts.bodyMedium, color: colors.muted },
  macroLabel: { color: colors.muted, fontSize: 11, fontFamily: fonts.bodyMedium, marginTop: 5, letterSpacing: 0.3 },
  inputBar: { height: 54, borderRadius: 20, marginBottom: 24 },
  inputBarInner: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 6 },
  input: { flex: 1, color: colors.ink, fontFamily: fonts.bodyMedium, fontSize: 14 },
  submitButton: { width: 44, height: 44, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  submitButtonDisabled: { opacity: 0.4 },
  submitArrow: { color: '#fff', fontFamily: fonts.bodySemibold, fontSize: 22, lineHeight: 24 },
  sectionLabel: { color: colors.muted, fontSize: 12, fontFamily: fonts.bodySemibold, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 14 },
  empty: { color: colors.muted, fontFamily: fonts.bodyMedium, fontSize: 14, paddingVertical: 10 },
  foodCard: { minHeight: 72, borderRadius: 20, marginBottom: 8 },
  foodCardInner: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  foodInfo: { flex: 1 },
  foodTitle: { color: colors.ink, fontFamily: fonts.bodySemibold, fontSize: 14 },
  foodSub: { color: colors.muted, fontFamily: fonts.bodyMedium, fontSize: 11, marginTop: 3 },
  foodMacros: { flexDirection: 'row', gap: 6, marginTop: 8 },
  foodMacroPill: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, backgroundColor: 'rgba(255,255,255,0.04)' },
  foodMacroLabel: { color: '#7a808a', fontFamily: fonts.bodySemibold, fontSize: 9 },
  foodMacroValue: { color: colors.soft, fontFamily: fonts.bodySemibold, fontSize: 10 },
  foodCalCol: { alignItems: 'flex-end', minWidth: 48 },
  foodCal: { color: colors.lime, fontFamily: fonts.displaySemibold, fontSize: 18, letterSpacing: -0.3 },
  foodCalUnit: { color: colors.muted, fontSize: 9, fontFamily: fonts.bodySemibold, marginTop: 2 },
  foodDelete: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.04)' },
  foodDeleteText: { color: '#ff9f9f', fontFamily: fonts.displayMedium, fontSize: 20, lineHeight: 22 },
});
