import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAsync } from '../../core/useAsync';
import { State } from '../../core/ui/atoms';
import { MicGlyph } from '../../core/ui/MicGlyph';
import { colors } from '../../core/theme';
import { caloriesApi } from './api';

const DAILY_GOAL = 2200;

export default function CaloriesScreen() {
  const { data, loading, error, load } = useAsync(useCallback(() => caloriesApi.list(), []));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function addNatural(source: 'typed' | 'voice' = 'typed') {
    const clean = message.trim(); if (!clean || busy) return;
    setBusy(true);
    try { await caloriesApi.natural(clean, source); setMessage(''); await load(); }
    finally { setBusy(false); }
  }
  async function remove(id: string) { await caloriesApi.remove(id); await load(); }

  const today = new Date().toISOString().slice(0, 10);
  const items = (data || []).filter(entry => entry.date === today);
  const total = items.reduce((sum, entry) => sum + entry.calories, 0);
  const macros = useMemo(() => items.reduce((acc, entry) => {
    acc.protein += entry.nutrition?.protein_g || 0;
    acc.carbs += entry.nutrition?.carbs_g || 0;
    acc.fat += entry.nutrition?.fat_g || 0;
    return acc;
  }, { protein: 0, carbs: 0, fat: 0 }), [items]);
  const left = Math.max(0, DAILY_GOAL - total);
  if (loading) return <State loading />; if (error) return <State error={error} retry={load} />;

  return <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.wrap}>
    <Text style={styles.kicker}>TODAY · NUTRITION</Text>
    <Text style={styles.title}>Calories</Text>
    <View style={styles.ringWrap}>
      <View style={styles.ringOuter}>
        <View style={styles.ringCutTop} />
        <View style={styles.ringCutBottom} />
        <View style={styles.ringInner}>
          <Text style={styles.total}>{total.toLocaleString('en-IN')}</Text>
          <Text style={styles.goal}>of {DAILY_GOAL.toLocaleString('en-IN')} kcal</Text>
          <Text style={styles.left}>{left.toLocaleString('en-IN')} LEFT</Text>
        </View>
      </View>
    </View>
    <View style={styles.macroRow}>
      <Macro value={Math.round(macros.protein)} label="PROTEIN" color="#ffbd55" />
      <Macro value={Math.round(macros.carbs)} label="CARBS" color="#9dea60" />
      <Macro value={Math.round(macros.fat)} label="FAT" color="#f0d85c" />
    </View>
    <View style={styles.inputBar}>
      <TextInput value={message} onChangeText={setMessage} placeholder={'Say or type — "two eggs and toast"'} placeholderTextColor="#6f737d" style={styles.input} onSubmitEditing={() => addNatural('typed')} />
      <Pressable onPress={() => addNatural('voice')} style={styles.micButton}><MicGlyph size={24} /></Pressable>
    </View>
    <View style={styles.sectionRow}><Text style={styles.section}>TODAY</Text><Text style={styles.entries}>{items.length} entries</Text></View>
    {items.length === 0 ? <Text style={styles.empty}>No food logged yet.</Text> : items.map(entry => <Pressable key={entry.id} onLongPress={() => remove(entry.id)} style={styles.foodCard}>
      <View style={styles.foodIcon}><Text style={styles.foodIconText}>⌂</Text></View>
      <View style={styles.foodMiddle}><Text style={styles.foodTitle}>{entry.item}</Text><Text style={styles.foodSub}>{entry.nutrition?.serving || entry.source}</Text></View>
      <Text style={styles.foodCal}>{entry.calories}</Text>
    </Pressable>)}
  </ScrollView>;
}

function Macro({ value, label, color }: { value: number; label: string; color: string }) {
  return <View style={styles.macro}><Text style={[styles.macroValue, { color }]}>{value}g</Text><Text style={styles.macroLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: 18 },
  kicker: { color: '#8b8f98', fontSize: 11, letterSpacing: 4, fontWeight: '900', marginBottom: 8 },
  title: { color: colors.ink, fontSize: 32, lineHeight: 38, fontWeight: '900', letterSpacing: -0.8 },
  ringWrap: { alignItems: 'center', marginTop: 42, marginBottom: 30 },
  ringOuter: { width: 150, height: 150, borderRadius: 75, borderWidth: 10, borderColor: '#c8ff47', alignItems: 'center', justifyContent: 'center', shadowColor: '#c8ff47', shadowOpacity: 0.35, shadowRadius: 28, elevation: 16 },
  ringCutTop: { position: 'absolute', top: -14, left: 16, width: 56, height: 34, backgroundColor: colors.bg, transform: [{ rotate: '-18deg' }] },
  ringCutBottom: { position: 'absolute', bottom: -14, right: 16, width: 64, height: 36, backgroundColor: colors.bg, transform: [{ rotate: '-18deg' }] },
  ringInner: { width: 118, height: 118, borderRadius: 59, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' },
  total: { color: colors.ink, fontSize: 36, fontWeight: '900', letterSpacing: -1.2 },
  goal: { color: colors.muted, fontSize: 12, fontWeight: '800', marginTop: 2 },
  left: { color: '#b8ff4d', fontSize: 12, fontWeight: '900', marginTop: 5, letterSpacing: 1.3 },
  macroRow: { flexDirection: 'row', gap: 10, marginBottom: 26 },
  macro: { flex: 1, height: 64, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.045)', borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  macroValue: { fontWeight: '900', fontSize: 17 },
  macroLabel: { color: '#797f8b', fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginTop: 5 },
  inputBar: { height: 58, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.045)', borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', paddingLeft: 18, paddingRight: 8, marginBottom: 26 },
  input: { flex: 1, color: colors.ink, fontWeight: '700' },
  micButton: { width: 44, height: 44, borderRadius: 16, backgroundColor: '#f2e64b', alignItems: 'center', justifyContent: 'center' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  section: { color: '#b8ff75', fontSize: 12, letterSpacing: 3, fontWeight: '900' },
  entries: { color: colors.muted, fontWeight: '700', fontSize: 12 },
  empty: { color: colors.muted, fontWeight: '700', paddingVertical: 18 },
  foodCard: { minHeight: 72, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.045)', borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', padding: 12, marginBottom: 10 },
  foodIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: 'rgba(255,190,76,0.13)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  foodIconText: { color: '#ffbe4c', fontWeight: '900' },
  foodMiddle: { flex: 1 },
  foodTitle: { color: colors.ink, fontWeight: '900', fontSize: 15 },
  foodSub: { color: colors.muted, fontWeight: '700', fontSize: 12, marginTop: 3 },
  foodCal: { color: '#baff62', fontWeight: '900', fontSize: 15 },
});
