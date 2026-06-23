import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAsync } from '../../core/useAsync';
import { State } from '../../core/ui/atoms';
import { GlassCard } from '../../core/ui/GlassCard';
import { colors } from '../../core/theme';
import { fonts } from '../../core/fonts';
import { tasksApi } from './api';
import type { Bucket, Task } from './types';

const buckets: { key: Bucket; title: string; hint: string }[] = [
  { key: 'buffer', title: 'BUFFER', hint: 'backlog' },
  { key: 'timewise', title: 'TIMEWISE', hint: 'scheduled' },
  { key: 'recurring', title: 'RECURRING', hint: 'rhythm' },
];

export default function TasksScreen() {
  const { data, loading, error, load } = useAsync(useCallback(() => tasksApi.list(), []));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [inputOpen, setInputOpen] = useState(false);
  async function addNatural() {
    const clean = message.trim(); if (!clean || busy) return;
    setBusy(true); try { await tasksApi.natural(clean, 'typed'); setMessage(''); setInputOpen(false); await load(); } finally { setBusy(false); }
  }
  async function complete(task: Task) { await tasksApi.update(task.id, { done: !task.done }); await load(); }
  const tasks = data || [];
  const done = tasks.filter(t => t.done).length;
  const open = tasks.length - done;
  const grouped = useMemo(() => Object.fromEntries(buckets.map(b => [b.key, tasks.filter(t => t.bucket === b.key)])) as Record<Bucket, Task[]>, [tasks]);
  if (loading) return <State loading />; if (error) return <State error={error} retry={load} />;
  return <View style={styles.root}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.wrap}>
      <View style={styles.topLine}><View><Text style={styles.kicker}>TODAY</Text><Text style={styles.title}>Tasks</Text><Text style={styles.subtitle}>{done} of {tasks.length || 0} done · keep the momentum</Text></View></View>
      <View style={styles.statsRow}><Stat value={open} label="OPEN" /><Stat value={done} label="DONE" /><Stat value={grouped.timewise.length} label="TIMED" /></View>
      {inputOpen ? <GlassCard style={styles.quickInput} contentStyle={styles.quickInputInner}><TextInput value={message} onChangeText={setMessage} placeholder="Add by natural language…" placeholderTextColor="#6b707b" style={styles.input} onSubmitEditing={addNatural} autoFocus /><Pressable disabled={busy} onPress={addNatural} style={styles.quickButton}><Text style={styles.quickButtonText}>{busy ? '…' : '+'}</Text></Pressable><Pressable onPress={() => { setInputOpen(false); setMessage(''); }} style={styles.collapseButton}><Text style={styles.collapseText}>×</Text></Pressable></GlassCard> : null}
      {buckets.map(bucket => <View key={bucket.key} style={styles.group}><View style={styles.sectionRow}><Text style={styles.section}>{bucket.title}</Text><Text style={styles.sectionHint}>{bucket.hint}</Text></View>{grouped[bucket.key].length === 0 ? <Text style={styles.empty}>Nothing here.</Text> : grouped[bucket.key].map(task => <TaskCard key={task.id} task={task} onToggle={() => complete(task)} />)}</View>)}
    </ScrollView>
    {!inputOpen ? <Pressable onPress={() => setInputOpen(true)} style={styles.fab}><Text style={styles.fabText}>+</Text></Pressable> : null}
  </View>;
}
function Stat({ value, label }: { value: number; label: string }) { return <GlassCard style={styles.stat} contentStyle={styles.statInner}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></GlassCard>; }
function TaskCard({ task, onToggle }: { task: Task; onToggle: () => void }) {
  const time = task.scheduled_at ? new Date(task.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : null;
  const sub = task.recurring_rule ? task.recurring_rule.replace('natural:', '') : task.bucket === 'buffer' ? 'backlog' : task.bucket;
  return <GlassCard onPress={onToggle} style={[styles.card, task.done && styles.cardDone]} contentStyle={styles.cardInner}><View style={[styles.check, task.done && styles.checkDone]}>{task.done ? <Text style={styles.checkMark}>✓</Text> : null}</View><View style={styles.taskTextWrap}><Text style={[styles.taskTitle, task.done && styles.done]}>{task.title}</Text><Text style={styles.meta}>{sub}</Text></View>{time ? <View style={styles.timeChip}><Text style={styles.timeText}>{time}</Text></View> : null}</GlassCard>;
}
const styles = StyleSheet.create({
  root: { flex: 1 },
  wrap: { paddingBottom: 92 },
  topLine: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 },
  kicker: { color: '#8b909a', fontSize: 11, letterSpacing: 4.5, fontFamily: fonts.bodySemibold, marginBottom: 12 },
  title: { color: colors.ink, fontSize: 38, fontFamily: fonts.displaySemibold, letterSpacing: -1.25, lineHeight: 43 },
  subtitle: { color: colors.muted, fontFamily: fonts.bodyMedium, marginTop: 10, fontSize: 15 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  stat: { flex: 1, height: 72, borderRadius: 22 },
  statInner: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statValue: { color: colors.ink, fontFamily: fonts.displaySemibold, fontSize: 24, letterSpacing: -0.5 },
  statLabel: { color: '#8fa9cf', fontFamily: fonts.bodySemibold, fontSize: 10, letterSpacing: 1.7, marginTop: 5 },
  quickInput: { minHeight: 60, borderRadius: 22, marginBottom: 32 },
  quickInputInner: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingLeft: 18, paddingRight: 8 },
  input: { flex: 1, color: colors.ink, fontFamily: fonts.bodyMedium, minHeight: 44, fontSize: 15 },
  quickButton: { width: 46, height: 46, borderRadius: 17, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  quickButtonText: { color: '#fff', fontFamily: fonts.displayMedium, fontSize: 26, lineHeight: 28 },
  collapseButton: { width: 36, height: 46, alignItems: 'center', justifyContent: 'center' },
  collapseText: { color: colors.muted, fontFamily: fonts.displayMedium, fontSize: 28, lineHeight: 30 },
  group: { marginBottom: 30 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 13 },
  section: { color: '#9dc6ff', fontSize: 12, letterSpacing: 4.0, fontFamily: fonts.bodySemibold },
  sectionHint: { color: colors.muted, fontFamily: fonts.bodyMedium, fontSize: 13 },
  empty: { color: colors.muted, fontFamily: fonts.bodyMedium, paddingVertical: 8, fontSize: 15 },
  card: { minHeight: 78, borderRadius: 22, marginBottom: 10 },
  cardInner: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 15 },
  cardDone: { opacity: 0.62 },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.18)', marginRight: 13, alignItems: 'center', justifyContent: 'center' },
  checkDone: { backgroundColor: colors.blue, borderColor: colors.blue },
  checkMark: { color: '#fff', fontFamily: fonts.bodySemibold, fontSize: 13 },
  taskTextWrap: { flex: 1 },
  taskTitle: { color: colors.ink, fontSize: 15, lineHeight: 20, fontFamily: fonts.bodySemibold },
  done: { color: colors.muted, textDecorationLine: 'line-through' },
  meta: { color: colors.muted, marginTop: 5, fontFamily: fonts.bodyMedium, fontSize: 12 },
  timeChip: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: 'rgba(99,167,255,0.12)', borderWidth: 1, borderColor: 'rgba(99,167,255,0.20)' },
  timeText: { color: '#a8ccff', fontFamily: fonts.bodySemibold, fontSize: 12 },
  fab: { position: 'absolute', right: 22, bottom: 82, width: 54, height: 54, borderRadius: 27, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', shadowColor: colors.blue, shadowOpacity: 0.24, shadowRadius: 12, elevation: 8 },
  fabText: { color: '#fff', fontFamily: fonts.displayMedium, fontSize: 32, lineHeight: 34 },
});
