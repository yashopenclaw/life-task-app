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
const quickTasks = ['Review today at 9pm', 'Water plants every morning', 'Ship one useful app fix'];

export default function TasksScreen() {
  const { data, loading, error, load, setData } = useAsync(useCallback(() => tasksApi.list(), []));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [inputOpen, setInputOpen] = useState(false);
  async function addNatural() {
    const clean = message.trim(); if (!clean || busy) return;
    setBusy(true);
    try {
      const result = await tasksApi.natural(clean, 'typed');
      setData(prev => [result.task, ...(prev || [])]);
      setMessage(''); setInputOpen(false);
    } finally { setBusy(false); }
  }
  async function complete(task: Task) {
    const nextDone = !task.done;
    setData(prev => (prev || []).map(item => item.id === task.id ? { ...item, done: nextDone } : item));
    try {
      const updated = await tasksApi.update(task.id, { done: nextDone });
      setData(prev => (prev || []).map(item => item.id === task.id ? updated : item));
    } catch (err) {
      setData(prev => (prev || []).map(item => item.id === task.id ? task : item));
      throw err;
    }
  }
  async function remove(task: Task) {
    setData(prev => (prev || []).filter(item => item.id !== task.id));
    try { await tasksApi.remove(task.id); }
    catch (err) { setData(prev => [task, ...(prev || [])]); throw err; }
  }
  const tasks = data || [];
  const done = tasks.filter(t => t.done).length;
  const open = tasks.length - done;
  const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const googleDisabled = tasks.some(task => task.google_sync_status === 'disabled');
  const googleErrored = tasks.some(task => task.google_sync_status === 'error');
  const googleLabel = googleErrored ? 'Google sync needs creds' : googleDisabled ? 'Google sync not connected' : 'Google Tasks mirror';
  const grouped = useMemo(() => Object.fromEntries(buckets.map(b => [b.key, tasks.filter(t => t.bucket === b.key)])) as Record<Bucket, Task[]>, [tasks]);
  const nextTask = tasks.find(task => !task.done && task.scheduled_at) || tasks.find(task => !task.done);
  function primeTask(text: string) { setMessage(text); setInputOpen(true); }
  if (loading) return <State loading />; if (error) return <State error={error} retry={load} />;
  return <View style={styles.root}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.wrap}>
      <View style={styles.topLine}><View><Text style={styles.kicker}>TODAY</Text><Text style={styles.title}>Tasks</Text><Text style={styles.subtitle}>{done} of {tasks.length || 0} done · keep the momentum</Text></View></View>
      <GlassCard style={styles.progressCard} contentStyle={styles.progressInner}><View style={styles.progressCopy}><Text style={styles.progressLabel}>FOCUS LEFT</Text><Text style={styles.progressText}>{open ? `${open} open task${open === 1 ? '' : 's'}` : 'Clean slate.'}</Text><Text style={[styles.googleSync, googleErrored && styles.googleSyncError]}>{googleLabel}</Text></View><Text style={styles.progressPercent}>{progress}%</Text><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View></GlassCard>
      <GlassCard style={styles.nextCard} contentStyle={styles.nextInner}><Text style={styles.nextLabel}>NEXT UP</Text><Text numberOfLines={2} style={styles.nextTitle}>{nextTask ? nextTask.title : 'Nothing urgent. Add one clean next step.'}</Text></GlassCard>
      <View style={styles.statsRow}><Stat value={open} label="OPEN" /><Stat value={done} label="DONE" /><Stat value={grouped.timewise.length} label="TIMED" /></View>
      {!inputOpen ? <View style={styles.quickRow}>{quickTasks.map(task => <Pressable key={task} onPress={() => primeTask(task)} style={styles.quickChip}><Text style={styles.quickChipText}>{task}</Text></Pressable>)}</View> : null}
      {inputOpen ? <GlassCard style={styles.quickInput} contentStyle={styles.quickInputInner}><TextInput value={message} onChangeText={setMessage} placeholder="Add by natural language…" placeholderTextColor="#6b707b" style={styles.input} onSubmitEditing={addNatural} autoFocus /><Pressable disabled={busy} onPress={addNatural} style={styles.quickButton}><Text style={styles.quickButtonText}>{busy ? '…' : '+'}</Text></Pressable><Pressable onPress={() => { setInputOpen(false); setMessage(''); }} style={styles.collapseButton}><Text style={styles.collapseText}>×</Text></Pressable></GlassCard> : null}
      {buckets.map(bucket => <View key={bucket.key} style={styles.group}><View style={styles.sectionRow}><Text style={styles.section}>{bucket.title}</Text><View style={styles.bucketMeta}><Text style={styles.bucketCount}>{grouped[bucket.key].length}</Text><Text style={styles.sectionHint}>{bucket.hint}</Text></View></View>{grouped[bucket.key].length === 0 ? <GlassCard style={styles.emptyCard} contentStyle={styles.emptyCardInner}><Text style={styles.empty}>Nothing here.</Text></GlassCard> : grouped[bucket.key].map(task => <TaskCard key={task.id} task={task} onToggle={() => complete(task)} onDelete={() => remove(task)} />)}</View>)}
    </ScrollView>
    {!inputOpen ? <Pressable onPress={() => setInputOpen(true)} style={styles.fab}><Text style={styles.fabText}>+</Text></Pressable> : null}
  </View>;
}
function Stat({ value, label }: { value: number; label: string }) { return <GlassCard style={styles.stat} contentStyle={styles.statInner}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></GlassCard>; }
function TaskCard({ task, onToggle, onDelete }: { task: Task; onToggle: () => void; onDelete: () => void }) {
  const time = task.scheduled_at ? new Date(task.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : null;
  const date = task.scheduled_at ? scheduleLabel(task.scheduled_at) : null;
  const sub = task.recurring_rule ? task.recurring_rule.replace('natural:', '') : task.bucket === 'buffer' ? 'backlog' : task.bucket;
  return <GlassCard style={[styles.card, task.done && styles.cardDone]} contentStyle={styles.cardInner}>
    <Pressable accessibilityRole="button" onPress={onToggle} style={[styles.check, task.done && styles.checkDone]}>{task.done ? <Text style={styles.checkMark}>✓</Text> : null}</Pressable>
    <Pressable onPress={onToggle} style={styles.taskTextWrap}><Text style={[styles.taskTitle, task.done && styles.done]}>{task.title}</Text><View style={styles.metaRow}><Text numberOfLines={1} style={styles.meta}>{sub}</Text>{task.priority >= 3 ? <View style={styles.priorityPill}><Text style={styles.priorityText}>P{task.priority}</Text></View> : null}</View></Pressable>
    {time ? <View style={styles.timeStack}><View style={styles.timeChip}><Text style={styles.timeText}>{time}</Text></View>{date ? <Text style={styles.dateText}>{date}</Text> : null}</View> : null}
    <Pressable accessibilityRole="button" onPress={onDelete} hitSlop={8} style={styles.deleteButton}><Text style={styles.deleteText}>×</Text></Pressable>
  </GlassCard>;
}
function scheduleLabel(value: string) {
  const scheduled = new Date(value);
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const target = new Date(scheduled.getFullYear(), scheduled.getMonth(), scheduled.getDate()).getTime();
  const diff = Math.round((target - start) / 86400000);
  if (diff === 0) return 'today';
  if (diff === 1) return 'tomorrow';
  if (diff === -1) return 'yesterday';
  return scheduled.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }).toLowerCase();
}
const styles = StyleSheet.create({
  root: { flex: 1 },
  wrap: { paddingBottom: 92 },
  topLine: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 },
  kicker: { color: '#8b909a', fontSize: 11, letterSpacing: 4.5, fontFamily: fonts.bodySemibold, marginBottom: 12 },
  title: { color: colors.ink, fontSize: 38, fontFamily: fonts.displaySemibold, letterSpacing: -1.25, lineHeight: 43 },
  subtitle: { color: colors.muted, fontFamily: fonts.bodyMedium, marginTop: 10, fontSize: 15 },
  progressCard: { minHeight: 92, borderRadius: 24, marginBottom: 14 },
  progressInner: { flex: 1, padding: 16, justifyContent: 'center' },
  progressCopy: { paddingRight: 74 },
  progressLabel: { color: '#8fa9cf', fontFamily: fonts.bodySemibold, fontSize: 10, letterSpacing: 2.1 },
  progressText: { color: colors.soft, fontFamily: fonts.bodyMedium, marginTop: 6, fontSize: 15 },
  googleSync: { color: '#8fa9cf', fontFamily: fonts.bodySemibold, marginTop: 7, fontSize: 11, letterSpacing: 0.6 },
  googleSyncError: { color: colors.yellow },
  progressPercent: { position: 'absolute', right: 16, top: 14, color: colors.ink, fontFamily: fonts.displaySemibold, fontSize: 28, letterSpacing: -0.7 },
  progressTrack: { height: 6, borderRadius: 999, overflow: 'hidden', marginTop: 14, backgroundColor: 'rgba(255,255,255,0.07)' },
  progressFill: { height: 6, borderRadius: 999, backgroundColor: colors.blue },
  nextCard: { minHeight: 76, borderRadius: 22, marginBottom: 14, borderColor: 'rgba(99,167,255,0.16)' },
  nextInner: { flex: 1, justifyContent: 'center', paddingHorizontal: 16 },
  nextLabel: { color: '#8fa9cf', fontFamily: fonts.bodySemibold, fontSize: 10, letterSpacing: 2.1 },
  nextTitle: { color: colors.ink, fontFamily: fonts.displaySemibold, fontSize: 18, lineHeight: 23, marginTop: 6, letterSpacing: -0.3 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  stat: { flex: 1, height: 72, borderRadius: 22 },
  statInner: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statValue: { color: colors.ink, fontFamily: fonts.displaySemibold, fontSize: 24, letterSpacing: -0.5 },
  statLabel: { color: '#8fa9cf', fontFamily: fonts.bodySemibold, fontSize: 10, letterSpacing: 1.7, marginTop: 5 },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: -8, marginBottom: 26 },
  quickChip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(99,167,255,0.10)', borderWidth: 1, borderColor: 'rgba(99,167,255,0.18)' },
  quickChipText: { color: '#b8d8ff', fontFamily: fonts.bodySemibold, fontSize: 12 },
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
  bucketMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bucketCount: { minWidth: 24, overflow: 'hidden', borderRadius: 12, paddingHorizontal: 7, paddingVertical: 3, textAlign: 'center', color: '#050608', backgroundColor: '#9dc6ff', fontFamily: fonts.bodySemibold, fontSize: 11 },
  sectionHint: { color: colors.muted, fontFamily: fonts.bodyMedium, fontSize: 13 },
  emptyCard: { minHeight: 54, borderRadius: 18, opacity: 0.55 },
  emptyCardInner: { flex: 1, justifyContent: 'center', paddingHorizontal: 14 },
  empty: { color: colors.muted, fontFamily: fonts.bodyMedium, fontSize: 15 },
  card: { minHeight: 78, borderRadius: 22, marginBottom: 10 },
  cardInner: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 15 },
  cardDone: { opacity: 0.62 },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.18)', marginRight: 13, alignItems: 'center', justifyContent: 'center' },
  checkDone: { backgroundColor: colors.blue, borderColor: colors.blue },
  checkMark: { color: '#fff', fontFamily: fonts.bodySemibold, fontSize: 13 },
  taskTextWrap: { flex: 1, paddingRight: 8 },
  taskTitle: { color: colors.ink, fontSize: 15, lineHeight: 20, fontFamily: fonts.bodySemibold },
  done: { color: colors.muted, textDecorationLine: 'line-through' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  meta: { color: colors.muted, fontFamily: fonts.bodyMedium, fontSize: 12, flexShrink: 1 },
  priorityPill: { borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2, backgroundColor: 'rgba(201,255,74,0.10)', borderWidth: 1, borderColor: 'rgba(201,255,74,0.18)' },
  priorityText: { color: colors.lime, fontFamily: fonts.bodySemibold, fontSize: 10, letterSpacing: 0.8 },
  timeStack: { alignItems: 'flex-end', gap: 5, marginRight: 8 },
  timeChip: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: 'rgba(99,167,255,0.12)', borderWidth: 1, borderColor: 'rgba(99,167,255,0.20)' },
  timeText: { color: '#a8ccff', fontFamily: fonts.bodySemibold, fontSize: 12 },
  dateText: { color: colors.muted, fontFamily: fonts.bodySemibold, fontSize: 10, letterSpacing: 0.8, textTransform: 'uppercase' },
  deleteButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.055)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)' },
  deleteText: { color: '#ff9f9f', fontFamily: fonts.displayMedium, fontSize: 24, lineHeight: 26 },
  fab: { position: 'absolute', right: 22, bottom: 66, width: 54, height: 54, borderRadius: 27, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', shadowColor: colors.blue, shadowOpacity: 0.24, shadowRadius: 12, elevation: 8 },
  fabText: { color: '#fff', fontFamily: fonts.displayMedium, fontSize: 32, lineHeight: 34 },
});
