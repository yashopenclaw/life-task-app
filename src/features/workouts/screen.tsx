import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAsync } from '../../core/useAsync';
import { State } from '../../core/ui/atoms';
import { GlassCard } from '../../core/ui/GlassCard';
import { colors } from '../../core/theme';
import { fonts } from '../../core/fonts';
import { workoutsApi } from './api';
import type { WorkoutEntry } from './types';

function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const gym = {
  green: '#b7ff5a',
  greenDeep: '#5f8f2a',
  ochre: '#c7a24a',
  ochreSoft: '#d8bd76',
};

export default function WorkoutsScreen() {
  const { data, loading, error, load, setData } = useAsync(useCallback(() => workoutsApi.list(), []));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  const today = localDateKey();
  const activeDate = selectedDate || today;
  const isToday = activeDate === today;

  async function submitEntry(text = message) {
    const clean = text.trim();
    if (!clean || busy || !isToday) return;
    setBusy(true);
    try {
      const result = await workoutsApi.natural(clean, 'typed', today);
      setData(prev => [result.entry, ...(prev || [])]);
      setMessage('');
    } catch (err) {
      Alert.alert('Workout parse failed', err instanceof Error ? err.message : 'Could not log workout.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(entry: WorkoutEntry) {
    const existing = data || [];
    setData(existing.filter(item => item.id !== entry.id));
    try { await workoutsApi.remove(entry.id); }
    catch (err) {
      setData(prev => [entry, ...(prev || [])]);
      Alert.alert('Delete failed', err instanceof Error ? err.message : 'Could not delete workout.');
    }
  }

  const dates = useMemo(() => {
    const set = new Set((data || []).map(entry => entry.date));
    set.add(today);
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [data, today]);

  const countsByDate = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const entry of (data || [])) counts[entry.date] = (counts[entry.date] || 0) + 1;
    return counts;
  }, [data]);

  const items = (data || []).filter(entry => entry.date === activeDate);
  const summary = useMemo(() => summarize(items), [items]);

  if (loading) return <State loading />;
  if (error) return <State error={error} retry={load} />;

  return <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.wrap}>
    <View style={styles.header}>
      <Text style={styles.kicker}>TRAINING</Text>
      <Text style={styles.title}>Workout</Text>
    </View>

    <DayStrip dates={dates} countsByDate={countsByDate} today={today} selectedDate={activeDate} onSelect={setSelectedDate} />

    <GlassCard style={styles.heroCard} contentStyle={styles.heroInner}>
      <View style={styles.heroTopRow}>
        <View>
          <Text style={styles.heroLabel}>{isToday ? 'Today' : dayLabel(activeDate, today)}</Text>
          <Text style={styles.heroNumber}>{items.length}</Text>
          <Text style={styles.heroCaption}>{items.length === 1 ? 'entry' : 'entries'}</Text>
        </View>
        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeText}>{summary.primary}</Text>
        </View>
      </View>
      <View style={styles.statRow}>
        <Stat label="sets" value={summary.sets || '—'} />
        <Stat label="top set" value={summary.bestScheme || '—'} />
        <Stat label="top load" value={summary.topWeightKg ? `${formatNumber(summary.topWeightKg)} kg` : '—'} />
      </View>
    </GlassCard>

    {isToday ? <>
      <GlassCard style={styles.inputBar} contentStyle={styles.inputBarInner}>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder='Log workout — "bench 3x10 50kg"'
          placeholderTextColor="#555b66"
          style={styles.input}
          onSubmitEditing={() => submitEntry()}
          editable={!busy}
        />
        <Pressable onPress={() => submitEntry()} disabled={busy || !message.trim()} style={[styles.submitButton, (busy || !message.trim()) && styles.submitButtonDisabled]}>
          {busy ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitArrow}>↑</Text>}
        </Pressable>
      </GlassCard>
      {busy ? <Text style={styles.parseHint}>Parsing workout…</Text> : null}
    </> : null}

    <Text style={styles.sectionLabel}>{isToday ? 'Today' : dayLabel(activeDate, today)} · {items.length}</Text>
    {items.length === 0
      ? <Text style={styles.empty}>{isToday ? 'No workout logged yet.' : 'No workouts for this day.'}</Text>
      : items.map(entry => <WorkoutCard key={entry.id} entry={entry} isToday={isToday} onDelete={() => remove(entry)} />)}
  </ScrollView>;
}

function summarize(items: WorkoutEntry[]) {
  let sets = 0;
  let volumeKg = 0;
  let cardioMin = 0;
  let topWeightKg = 0;
  let bestScheme = '';
  const categories: Record<string, number> = {};
  for (const item of items) {
    if (item.sets) sets += item.sets;
    if (item.sets && item.reps && item.weight_kg) volumeKg += item.sets * item.reps * item.weight_kg;
    if (item.duration_min) cardioMin += item.duration_min;
    if (item.weight_kg && item.weight_kg > topWeightKg) topWeightKg = item.weight_kg;
    if (!bestScheme) bestScheme = schemeFor(item) || '';
    categories[item.category] = (categories[item.category] || 0) + 1;
  }
  const primary = Object.entries(categories).sort((a, b) => b[1] - a[1])[0]?.[0] || 'ready';
  return { sets, volumeKg: Math.round(volumeKg), cardioMin: Math.round(cardioMin), topWeightKg, bestScheme, primary };
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <View style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

function WorkoutCard({ entry, isToday, onDelete }: { entry: WorkoutEntry; isToday: boolean; onDelete: () => void }) {
  const scheme = schemeFor(entry);
  const weight = entry.weight_kg ? `${formatNumber(entry.weight_kg)} kg` : null;
  return <GlassCard style={styles.card} contentStyle={styles.cardInner}>
    <View style={styles.exerciseMark}><Text style={styles.exerciseMarkText}>{entry.exercise_name.slice(0, 1).toUpperCase()}</Text></View>
    <View style={styles.exerciseInfo}>
      <View style={styles.exerciseHeaderRow}>
        <View style={styles.exerciseTitleCol}>
          <Text style={styles.exerciseName}>{entry.exercise_name}</Text>
          <Text style={styles.exerciseSub}>{entry.muscle_group || entry.category} · {entry.details?.intensity || 'moderate'}</Text>
        </View>
        {weight ? <View style={styles.weightBadge}><Text style={styles.weightText}>{weight}</Text><Text style={styles.weightLabel}>load</Text></View> : null}
      </View>
      <View style={styles.highlightRow}>
        {scheme ? <View style={styles.schemeBadge}><Text style={styles.schemeText}>{scheme}</Text><Text style={styles.schemeLabel}>reps</Text></View> : null}
        {secondaryMetrics(entry).map(part => <Text key={part} style={styles.metricPill}>{part}</Text>)}
      </View>
      {entry.raw_text !== entry.exercise_name ? <Text numberOfLines={1} style={styles.rawText}>{entry.raw_text}</Text> : null}
    </View>
    {isToday ? <Pressable accessibilityRole="button" onPress={onDelete} hitSlop={8} style={styles.deleteBtn}>
      <Text style={styles.deleteText}>×</Text>
    </Pressable> : null}
  </GlassCard>;
}

function schemeFor(entry: WorkoutEntry) {
  return entry.rep_scheme || entry.details?.rep_scheme || (entry.sets && entry.reps ? `${entry.sets}x${entry.reps}` : '');
}

function secondaryMetrics(entry: WorkoutEntry) {
  const parts: string[] = [];
  if (entry.duration_min) parts.push(`${formatNumber(entry.duration_min)} min`);
  if (entry.distance_km) parts.push(`${formatNumber(entry.distance_km)} km`);
  if (!parts.length && !schemeFor(entry) && !entry.weight_kg) parts.push(entry.category);
  return parts;
}

function dayLabel(dateStr: string, today: string): string {
  if (dateStr === today) return 'Today';
  const d = new Date(dateStr + 'T00:00:00');
  const t = new Date(today + 'T00:00:00');
  const diff = Math.round((t.getTime() - d.getTime()) / 86400000);
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

function dateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace(/\.0$/, '');
}

function DayStrip({ dates, countsByDate, today, selectedDate, onSelect }: {
  dates: string[]; countsByDate: Record<string, number>; today: string; selectedDate: string; onSelect: (d: string) => void;
}) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayStripInner}>
    {dates.map(d => {
      const active = d === selectedDate;
      const count = countsByDate[d] || 0;
      return <Pressable key={d} onPress={() => onSelect(d)} style={[styles.dayChip, active && styles.dayChipActive]}>
        <Text style={[styles.dayChipLabel, active && styles.dayChipLabelActive]}>{dayLabel(d, today)}</Text>
        <Text style={[styles.dayChipCount, active && styles.dayChipCountActive]}>{count}</Text>
        <Text style={[styles.dayChipDate, active && styles.dayChipDateActive]}>{dateShort(d)}</Text>
      </Pressable>;
    })}
  </ScrollView>;
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: 24 },
  header: { alignItems: 'center', marginTop: 4 },
  kicker: { color: '#6c717c', fontSize: 10, letterSpacing: 3.8, fontFamily: fonts.bodySemibold },
  title: { color: colors.ink, fontSize: 34, fontFamily: fonts.displaySemibold, letterSpacing: -1.0, marginTop: 6 },
  dayStripInner: { flexDirection: 'row', gap: 8, paddingVertical: 10, marginBottom: 10 },
  dayChip: { width: 68, borderRadius: 16, paddingVertical: 10, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  dayChipActive: { backgroundColor: 'rgba(183,255,90,0.11)', borderColor: 'rgba(199,162,74,0.42)' },
  dayChipLabel: { color: colors.muted, fontSize: 11, fontFamily: fonts.bodySemibold },
  dayChipLabelActive: { color: gym.green },
  dayChipCount: { color: colors.soft, fontSize: 16, fontFamily: fonts.displaySemibold, marginTop: 4, letterSpacing: -0.3 },
  dayChipCountActive: { color: colors.ink },
  dayChipDate: { color: colors.faint, fontSize: 9, fontFamily: fonts.bodyMedium, marginTop: 3 },
  dayChipDateActive: { color: colors.muted },
  heroCard: { borderRadius: 28, marginTop: 10, marginBottom: 18 },
  heroInner: { padding: 20 },
  heroTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  heroLabel: { color: gym.green, fontFamily: fonts.bodySemibold, fontSize: 12, letterSpacing: 1.2, textTransform: 'uppercase' },
  heroNumber: { color: colors.ink, fontFamily: fonts.displaySemibold, fontSize: 58, letterSpacing: -2, marginTop: 4 },
  heroCaption: { color: colors.muted, fontFamily: fonts.bodyMedium, fontSize: 13, marginTop: -4 },
  heroBadge: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: 'rgba(199,162,74,0.12)', borderWidth: 1, borderColor: 'rgba(199,162,74,0.28)' },
  heroBadgeText: { color: gym.ochreSoft, fontFamily: fonts.bodySemibold, fontSize: 12, textTransform: 'capitalize' },
  statRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  stat: { flex: 1, borderRadius: 18, paddingVertical: 13, paddingHorizontal: 10, backgroundColor: 'rgba(255,255,255,0.035)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  statValue: { color: colors.ink, fontFamily: fonts.displaySemibold, fontSize: 16, letterSpacing: -0.2 },
  statLabel: { color: colors.muted, fontFamily: fonts.bodyMedium, fontSize: 10, marginTop: 5, textTransform: 'uppercase', letterSpacing: 1.0 },
  inputBar: { height: 54, borderRadius: 20, marginBottom: 8 },
  inputBarInner: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 6 },
  input: { flex: 1, color: colors.ink, fontFamily: fonts.bodyMedium, fontSize: 14 },
  submitButton: { width: 44, height: 44, borderRadius: 16, backgroundColor: gym.greenDeep, alignItems: 'center', justifyContent: 'center' },
  submitButtonDisabled: { opacity: 0.4 },
  submitArrow: { color: '#fff', fontFamily: fonts.bodySemibold, fontSize: 22, lineHeight: 24 },
  parseHint: { color: gym.green, fontFamily: fonts.bodyMedium, fontSize: 12, textAlign: 'center', marginBottom: 12 },
  sectionLabel: { color: colors.muted, fontSize: 12, fontFamily: fonts.bodySemibold, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 16, marginBottom: 14 },
  empty: { color: colors.muted, fontFamily: fonts.bodyMedium, fontSize: 14, paddingVertical: 10 },
  card: { minHeight: 88, borderRadius: 20, marginBottom: 8 },
  cardInner: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  exerciseMark: { width: 42, height: 42, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(183,255,90,0.12)', borderWidth: 1, borderColor: 'rgba(183,255,90,0.24)' },
  exerciseMarkText: { color: gym.green, fontFamily: fonts.displaySemibold, fontSize: 19 },
  exerciseInfo: { flex: 1 },
  exerciseHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  exerciseTitleCol: { flex: 1, paddingRight: 4 },
  exerciseName: { color: colors.ink, fontFamily: fonts.bodySemibold, fontSize: 14 },
  exerciseSub: { color: colors.muted, fontFamily: fonts.bodyMedium, fontSize: 11, marginTop: 3, textTransform: 'capitalize' },
  highlightRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 7, marginTop: 9 },
  schemeBadge: { flexDirection: 'row', alignItems: 'baseline', gap: 5, borderRadius: 11, paddingHorizontal: 9, paddingVertical: 5, backgroundColor: 'rgba(183,255,90,0.13)', borderWidth: 1, borderColor: 'rgba(183,255,90,0.26)' },
  schemeText: { color: gym.green, fontFamily: fonts.displaySemibold, fontSize: 18, letterSpacing: -0.4 },
  schemeLabel: { color: colors.muted, fontFamily: fonts.bodySemibold, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.8 },
  weightBadge: { alignItems: 'flex-end', borderRadius: 13, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: 'rgba(199,162,74,0.12)', borderWidth: 1, borderColor: 'rgba(199,162,74,0.30)' },
  weightText: { color: gym.ochreSoft, fontFamily: fonts.displaySemibold, fontSize: 15, letterSpacing: -0.2 },
  weightLabel: { color: colors.muted, fontFamily: fonts.bodySemibold, fontSize: 8, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 2 },
  metricRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  metricPill: { color: colors.soft, fontFamily: fonts.bodySemibold, fontSize: 10, borderRadius: 8, overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 3, backgroundColor: 'rgba(255,255,255,0.04)' },
  rawText: { color: colors.faint, fontFamily: fonts.bodyMedium, fontSize: 10, marginTop: 7 },
  deleteBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.04)' },
  deleteText: { color: '#ff9f9f', fontFamily: fonts.displayMedium, fontSize: 20, lineHeight: 22 },
});
