import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useAsync } from '../../core/useAsync';
import { State } from '../../core/ui/atoms';
import { MicGlyph } from '../../core/ui/MicGlyph';
import { GlassCard } from '../../core/ui/GlassCard';
import { colors } from '../../core/theme';
import { fonts } from '../../core/fonts';
import { caloriesApi } from './api';

const DAILY_GOAL = 2200;

export default function CaloriesScreen() {
  const { data, loading, error, load } = useAsync(useCallback(() => caloriesApi.list(), []));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function addNatural(source: 'typed' | 'voice' = 'typed') {
    const clean = message.trim(); if (!clean || busy) return;
    setBusy(true); try { await caloriesApi.natural(clean, source); setMessage(''); await load(); } finally { setBusy(false); }
  }
  async function remove(id: string) { await caloriesApi.remove(id); await load(); }
  const today = new Date().toISOString().slice(0, 10);
  const items = (data || []).filter(entry => entry.date === today);
  const total = items.reduce((sum, entry) => sum + entry.calories, 0);
  const macros = useMemo(() => items.reduce((acc, entry) => { acc.protein += entry.nutrition?.protein_g || 0; acc.carbs += entry.nutrition?.carbs_g || 0; acc.fat += entry.nutrition?.fat_g || 0; return acc; }, { protein: 0, carbs: 0, fat: 0 }), [items]);
  const left = Math.max(0, DAILY_GOAL - total);
  if (loading) return <State loading />; if (error) return <State error={error} retry={load} />;

  return <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.wrap}>
    <View style={styles.topLine}><View><Text style={styles.kicker}>TODAY · NUTRITION</Text><Text style={styles.title}>Calories</Text></View></View>
    <View style={styles.ringWrap}><CalorieRing total={total} left={left} /></View>
    <View style={styles.macroRow}><Macro value={Math.round(macros.protein)} label="PROTEIN" color="#f3be65" /><Macro value={Math.round(macros.carbs)} label="CARBS" color={colors.lime} /><Macro value={Math.round(macros.fat)} label="FAT" color="#e4d561" /></View>
    <GlassCard style={styles.inputBar} contentStyle={styles.inputBarInner}><TextInput value={message} onChangeText={setMessage} placeholder={'Say or type — "two eggs and toast"'} placeholderTextColor="#6b707b" style={styles.input} onSubmitEditing={() => addNatural('typed')} /><Pressable onPress={() => addNatural('voice')} style={styles.micButton}><MicGlyph size={23} /></Pressable></GlassCard>
    <View style={styles.sectionRow}><Text style={styles.section}>TODAY</Text><Text style={styles.entries}>{items.length} entries</Text></View>
    {items.length === 0 ? <Text style={styles.empty}>No food logged yet.</Text> : items.map(entry => <GlassCard key={entry.id} onLongPress={() => remove(entry.id)} style={styles.foodCard} contentStyle={styles.foodCardInner}><View style={styles.foodMiddle}><Text style={styles.foodTitle}>{entry.item}</Text><Text style={styles.foodSub}>{entry.nutrition?.serving || entry.source}</Text></View><Text style={styles.foodCal}>{entry.calories}</Text></GlassCard>)}
  </ScrollView>;
}
function CalorieRing({ total, left }: { total: number; left: number }) {
  const circumference = 439.8;
  const progress = Math.max(0, Math.min(1, total / DAILY_GOAL));
  const dashOffset = circumference * (1 - progress);
  return <View style={styles.ringOuter}>
    <Svg width={168} height={168} viewBox="0 0 168 168" style={styles.ringSvg}>
      <Defs><LinearGradient id="calorieArc" x1="20" y1="20" x2="148" y2="148"><Stop offset="0" stopColor="#f3be65" /><Stop offset="1" stopColor={colors.lime} /></LinearGradient></Defs>
      <Circle cx="84" cy="84" r="70" stroke="rgba(255,255,255,0.07)" strokeWidth="14" fill="transparent" />
      <Circle cx="84" cy="84" r="70" stroke="url(#calorieArc)" strokeWidth="14" fill="transparent" strokeLinecap="round" strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={dashOffset} rotation="-90" origin="84,84" />
    </Svg>
    <View style={styles.ringInner}><Text style={styles.total}>{total.toLocaleString('en-IN')}</Text><Text style={styles.goal}>of {DAILY_GOAL.toLocaleString('en-IN')} kcal</Text><Text style={styles.left}>{left.toLocaleString('en-IN')} LEFT</Text></View>
  </View>;
}
function Macro({ value, label, color }: { value: number; label: string; color: string }) { return <GlassCard style={styles.macro} contentStyle={styles.macroInner}><Text style={[styles.macroValue, { color }]}>{value}g</Text><Text style={styles.macroLabel}>{label}</Text></GlassCard>; }
const styles = StyleSheet.create({
  wrap: { paddingBottom: 22 },
  topLine: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  settingsDot: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: colors.lineStrong },
  kicker: { color: '#8b909a', fontSize: 11, letterSpacing: 4.5, fontFamily: fonts.bodySemibold, marginBottom: 12 },
  title: { color: colors.ink, fontSize: 38, lineHeight: 43, fontFamily: fonts.displaySemibold, letterSpacing: -1.3 },
  ringWrap: { alignItems: 'center', marginTop: 36, marginBottom: 28 },
  ringOuter: { width: 168, height: 168, alignItems: 'center', justifyContent: 'center', shadowColor: colors.lime, shadowOpacity: 0.40, shadowRadius: 18, elevation: 9 },
  ringSvg: { position: 'absolute' },
  ringInner: { width: 118, height: 118, borderRadius: 59, alignItems: 'center', justifyContent: 'center' },
  total: { color: colors.ink, fontSize: 42, fontFamily: fonts.displaySemibold, letterSpacing: -1.4 },
  goal: { color: colors.muted, fontSize: 13, fontFamily: fonts.bodyMedium, marginTop: 2 },
  left: { color: colors.lime, fontSize: 13, fontFamily: fonts.bodySemibold, marginTop: 6, letterSpacing: 1.2 },
  macroRow: { flexDirection: 'row', gap: 12, marginBottom: 26 },
  macro: { flex: 1, height: 74, borderRadius: 22 },
  macroInner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  macroValue: { fontFamily: fonts.displaySemibold, fontSize: 18 },
  macroLabel: { color: '#7e8490', fontSize: 10, fontFamily: fonts.bodySemibold, letterSpacing: 1.8, marginTop: 6 },
  inputBar: { minHeight: 62, borderRadius: 22, marginBottom: 28 },
  inputBarInner: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingLeft: 18, paddingRight: 8 },
  input: { flex: 1, color: colors.ink, fontFamily: fonts.bodyMedium, fontSize: 15 },
  micButton: { width: 46, height: 46, borderRadius: 17, backgroundColor: colors.yellow, alignItems: 'center', justifyContent: 'center' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  section: { color: colors.lime, fontSize: 12, letterSpacing: 3.6, fontFamily: fonts.bodySemibold },
  entries: { color: colors.muted, fontFamily: fonts.bodyMedium, fontSize: 13 },
  empty: { color: colors.muted, fontFamily: fonts.bodyMedium, paddingVertical: 14, fontSize: 15 },
  foodCard: { minHeight: 68, borderRadius: 22, marginBottom: 10 },
  foodCardInner: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 14 },
  foodMiddle: { flex: 1 },
  foodTitle: { color: colors.ink, fontFamily: fonts.bodySemibold, fontSize: 15 },
  foodSub: { color: colors.muted, fontFamily: fonts.bodyMedium, fontSize: 12, marginTop: 4 },
  foodCal: { color: colors.lime, fontFamily: fonts.displaySemibold, fontSize: 15 },
});
