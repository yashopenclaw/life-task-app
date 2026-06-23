import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAsync } from '../../core/useAsync';
import { State } from '../../core/ui/atoms';
import { colors } from '../../core/theme';
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
  async function addNatural() {
    const clean = message.trim(); if (!clean || busy) return;
    setBusy(true);
    try { await tasksApi.natural(clean, 'typed'); setMessage(''); await load(); }
    finally { setBusy(false); }
  }
  async function complete(task: Task) { await tasksApi.update(task.id, { done: !task.done }); await load(); }
  const tasks = data || [];
  const done = tasks.filter(t => t.done).length;
  const grouped = useMemo(() => Object.fromEntries(buckets.map(b => [b.key, tasks.filter(t => t.bucket === b.key)])) as Record<Bucket, Task[]>, [tasks]);
  if (loading) return <State loading />; if (error) return <State error={error} retry={load} />;

  return <View style={styles.root}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.wrap}>
      <Text style={styles.kicker}>TODAY</Text>
      <Text style={styles.title}>Tasks</Text>
      <Text style={styles.subtitle}>{done} of {tasks.length || 0} done · keep the momentum</Text>
      <View style={styles.quickInput}>
        <TextInput value={message} onChangeText={setMessage} placeholder="Add by natural language…" placeholderTextColor="#6f737d" style={styles.input} onSubmitEditing={addNatural} />
        <Pressable disabled={busy} onPress={addNatural} style={styles.quickButton}><Text style={styles.quickButtonText}>{busy ? '…' : '+'}</Text></Pressable>
      </View>
      {buckets.map(bucket => <View key={bucket.key} style={styles.group}>
        <View style={styles.sectionRow}><Text style={styles.section}>{bucket.title}</Text><Text style={styles.sectionHint}>{bucket.hint}</Text></View>
        {grouped[bucket.key].length === 0 ? <Text style={styles.empty}>Nothing here.</Text> : grouped[bucket.key].map(task => <TaskCard key={task.id} task={task} onToggle={() => complete(task)} />)}
      </View>)}
    </ScrollView>
    <Pressable onPress={addNatural} style={styles.fab}><Text style={styles.fabText}>+</Text></Pressable>
  </View>;
}

function TaskCard({ task, onToggle }: { task: Task; onToggle: () => void }) {
  const time = task.scheduled_at ? new Date(task.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : null;
  const sub = task.recurring_rule ? task.recurring_rule.replace('natural:', '') : task.bucket === 'buffer' ? 'backlog' : task.bucket;
  return <Pressable onPress={onToggle} style={[styles.card, task.done && styles.cardDone]}>
    <View style={[styles.check, task.done && styles.checkDone]}>{task.done ? <Text style={styles.checkMark}>✓</Text> : null}</View>
    <View style={styles.taskTextWrap}>
      <Text style={[styles.taskTitle, task.done && styles.done]}>{task.title}</Text>
      <Text style={styles.meta}>{sub}</Text>
    </View>
    {time ? <View style={styles.timeChip}><Text style={styles.timeText}>{time}</Text></View> : null}
  </Pressable>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  wrap: { paddingBottom: 92 },
  kicker: { color: '#8b8f98', fontSize: 11, letterSpacing: 4, fontWeight: '900', marginBottom: 8 },
  title: { color: colors.ink, fontSize: 32, fontWeight: '900', letterSpacing: -0.8 },
  subtitle: { color: colors.muted, fontWeight: '700', marginTop: 8, marginBottom: 22 },
  quickInput: { minHeight: 54, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.045)', borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 7, marginBottom: 24 },
  input: { flex: 1, color: colors.ink, fontWeight: '700', minHeight: 44 },
  quickButton: { width: 42, height: 42, borderRadius: 16, backgroundColor: '#66a8ff', alignItems: 'center', justifyContent: 'center' },
  quickButtonText: { color: '#fff', fontWeight: '900', fontSize: 24, lineHeight: 26 },
  group: { marginBottom: 26 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  section: { color: '#8bbcff', fontSize: 12, letterSpacing: 3, fontWeight: '900' },
  sectionHint: { color: colors.muted, fontWeight: '700', fontSize: 12 },
  empty: { color: colors.muted, fontWeight: '700', paddingVertical: 8 },
  card: { minHeight: 84, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.045)', borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 11, shadowColor: '#5d78ff', shadowOpacity: 0.08, shadowRadius: 16, elevation: 3 },
  cardDone: { opacity: 0.72 },
  check: { width: 25, height: 25, borderRadius: 9, borderWidth: 2, borderColor: 'rgba(255,255,255,0.14)', marginRight: 13, alignItems: 'center', justifyContent: 'center' },
  checkDone: { backgroundColor: '#4ea1ff', borderColor: '#4ea1ff' },
  checkMark: { color: '#fff', fontWeight: '900', fontSize: 14 },
  taskTextWrap: { flex: 1 },
  taskTitle: { color: colors.ink, fontSize: 15, lineHeight: 20, fontWeight: '900' },
  done: { color: colors.muted, textDecorationLine: 'line-through' },
  meta: { color: colors.muted, marginTop: 5, fontWeight: '700', fontSize: 12 },
  timeChip: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: 'rgba(91,154,255,0.20)', borderWidth: 1, borderColor: 'rgba(91,154,255,0.28)' },
  timeText: { color: '#9cc6ff', fontWeight: '900', fontSize: 12 },
  fab: { position: 'absolute', right: 0, bottom: 82, width: 58, height: 58, borderRadius: 29, backgroundColor: '#66a8ff', alignItems: 'center', justifyContent: 'center', shadowColor: '#66a8ff', shadowOpacity: 0.45, shadowRadius: 18, elevation: 12 },
  fabText: { color: '#fff', fontWeight: '500', fontSize: 34, lineHeight: 38 },
});
