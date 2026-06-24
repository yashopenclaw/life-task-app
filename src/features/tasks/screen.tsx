import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAsync } from '../../core/useAsync';
import { State } from '../../core/ui/atoms';
import { VoiceOrb } from '../../core/ui/VoiceOrb';
import { GlassCard } from '../../core/ui/GlassCard';
import { colors } from '../../core/theme';
import { fonts } from '../../core/fonts';
import { assistantApi } from '../assistant/api';
import { tasksApi } from './api';
import type { Bucket, Task } from './types';

const buckets: { key: Bucket; title: string }[] = [
  { key: 'timewise', title: 'Scheduled' },
  { key: 'buffer', title: 'Backlog' },
  { key: 'recurring', title: 'Recurring' },
];

export default function TasksScreen() {
  const { data, loading, error, load, setData } = useAsync(useCallback(() => tasksApi.list(), []));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [inputOpen, setInputOpen] = useState(false);

  async function addNatural(text?: string, source: 'typed' | 'voice' = 'typed') {
    const clean = (text || message).trim(); if (!clean || busy) return;
    setBusy(true);
    try {
      const result = await tasksApi.natural(clean, source);
      // Get AI title for voice entries
      if (source === 'voice') {
        const title = await assistantApi.title(clean).catch(() => clean);
        setData(prev => [{ ...result.task, title: title || result.task.title }, ...(prev || [])]);
      } else {
        setData(prev => [result.task, ...(prev || [])]);
      }
      setMessage(''); setInputOpen(false);
    } finally { setBusy(false); }
  }

  function onVoiceTranscript(text: string) {
    addNatural(text, 'voice');
  }

  async function complete(task: Task) {
    const nextDone = !task.done;
    setData(prev => (prev || []).map(item => item.id === task.id ? { ...item, done: nextDone } : item));
    try {
      const updated = await tasksApi.update(task.id, { done: nextDone });
      setData(prev => (prev || []).map(item => item.id === task.id ? updated : item));
    } catch {
      setData(prev => (prev || []).map(item => item.id === task.id ? task : item));
    }
  }
  async function remove(task: Task) {
    setData(prev => (prev || []).filter(item => item.id !== task.id));
    try { await tasksApi.remove(task.id); }
    catch { setData(prev => [task, ...(prev || [])]); }
  }
  const tasks = (data || []).filter(t => !t.done);
  const grouped = useMemo(() => Object.fromEntries(buckets.map(b => [b.key, tasks.filter(t => t.bucket === b.key)])) as Record<Bucket, Task[]>, [tasks]);
  if (loading) return <State loading />; if (error) return <State error={error} retry={load} />;

  return <View style={styles.root}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.wrap}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>TODAY</Text>
          <Text style={styles.title}>Tasks</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={() => setInputOpen(!inputOpen)} style={styles.addBtn}>
          <Text style={styles.addBtnText}>{inputOpen ? '×' : '+'}</Text>
        </Pressable>
      </View>

      {/* Open count */}
      <Text style={styles.openCount}>
        {tasks.length > 0 ? `${tasks.length} open` : 'All clear'}
      </Text>

      {/* Inline add input */}
      {inputOpen ? <GlassCard style={styles.inputCard} contentStyle={styles.inputCardInner}>
        <TextInput value={message} onChangeText={setMessage} placeholder="Add a task — natural language…" placeholderTextColor="#555b66" style={styles.input} onSubmitEditing={() => addNatural()} autoFocus />
        {message.trim() ? (
          <Pressable disabled={busy} onPress={() => addNatural()} style={styles.inputSend}>
            {busy ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.inputSendText}>+</Text>}
          </Pressable>
        ) : (
          <VoiceOrb onTranscript={onVoiceTranscript} accent={colors.blue} size={44} />
        )}
      </GlassCard> : null}
      {busy && inputOpen && !message.trim() ? <Text style={styles.parsing}>Listening & parsing…</Text> : null}

      {/* Buckets */}
      {buckets.map(bucket => {
        const list = grouped[bucket.key];
        return <View key={bucket.key} style={styles.bucket}>
          <View style={styles.bucketHeader}>
            <Text style={styles.bucketTitle}>{bucket.title}</Text>
            <Text style={styles.bucketCount}>{list.length}</Text>
          </View>
          {list.length === 0
            ? <Text style={styles.bucketEmpty}>Nothing here.</Text>
            : list.map(task => <TaskCard key={task.id} task={task} onToggle={() => complete(task)} onDelete={() => remove(task)} />)}
        </View>;
      })}
    </ScrollView>
  </View>;
}

function TaskCard({ task, onToggle, onDelete }: { task: Task; onToggle: () => void; onDelete: () => void }) {
  const time = task.scheduled_at ? new Date(task.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : null;
  const sub = task.recurring_rule ? task.recurring_rule.replace('natural:', '') : task.bucket === 'buffer' ? 'backlog' : task.bucket;
  return <GlassCard style={styles.card} contentStyle={styles.cardInner}>
    <Pressable accessibilityRole="button" onPress={onToggle} style={[styles.check, task.done && styles.checkDone]}>
      {task.done ? <Text style={styles.checkMark}>✓</Text> : null}
    </Pressable>
    <Pressable onPress={onToggle} style={styles.taskBody}>
      <Text style={styles.taskTitle}>{task.title}</Text>
      <View style={styles.metaRow}>
        <Text numberOfLines={1} style={styles.meta}>{sub}</Text>
        {time ? <Text style={styles.timeText}>· {time}</Text> : null}
        {task.priority >= 3 ? <View style={styles.priorityPill}><Text style={styles.priorityText}>P{task.priority}</Text></View> : null}
      </View>
    </Pressable>
    <Pressable accessibilityRole="button" onPress={onDelete} hitSlop={8} style={styles.deleteBtn}>
      <Text style={styles.deleteText}>×</Text>
    </Pressable>
  </GlassCard>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  wrap: { paddingBottom: 28 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 4 },
  kicker: { color: '#6c717c', fontSize: 10, letterSpacing: 3.8, fontFamily: fonts.bodySemibold },
  title: { color: colors.ink, fontSize: 34, fontFamily: fonts.displaySemibold, letterSpacing: -1.0, marginTop: 6 },
  addBtn: { width: 42, height: 42, borderRadius: 18, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', shadowColor: colors.blue, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },
  addBtnText: { color: '#fff', fontFamily: fonts.displayMedium, fontSize: 24, lineHeight: 26 },
  openCount: { color: colors.soft, fontFamily: fonts.bodyMedium, fontSize: 14, marginTop: 12, marginBottom: 20 },
  inputCard: { height: 54, borderRadius: 18, marginBottom: 8 },
  inputCardInner: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 6 },
  input: { flex: 1, color: colors.ink, fontFamily: fonts.bodyMedium, fontSize: 14, minHeight: 44 },
  inputSend: { width: 44, height: 44, borderRadius: 16, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  inputSendText: { color: '#fff', fontFamily: fonts.displayMedium, fontSize: 22, lineHeight: 24 },
  parsing: { color: colors.muted, fontSize: 12, fontFamily: fonts.bodyMedium, textAlign: 'center', marginBottom: 16 },
  bucket: { marginBottom: 24 },
  bucketHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  bucketTitle: { color: colors.soft, fontSize: 13, fontFamily: fonts.bodySemibold, letterSpacing: 0.3 },
  bucketCount: { color: colors.muted, fontSize: 12, fontFamily: fonts.bodyMedium },
  bucketEmpty: { color: colors.muted, fontFamily: fonts.bodyMedium, fontSize: 13, paddingVertical: 8 },
  card: { minHeight: 68, borderRadius: 18, marginBottom: 8 },
  cardInner: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  check: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  checkDone: { backgroundColor: colors.blue, borderColor: colors.blue },
  checkMark: { color: '#fff', fontFamily: fonts.bodySemibold, fontSize: 12 },
  taskBody: { flex: 1, paddingRight: 6 },
  taskTitle: { color: colors.ink, fontSize: 14, lineHeight: 19, fontFamily: fonts.bodySemibold },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  meta: { color: colors.muted, fontFamily: fonts.bodyMedium, fontSize: 11, flexShrink: 1 },
  timeText: { color: colors.blue, fontFamily: fonts.bodySemibold, fontSize: 11 },
  priorityPill: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: 'rgba(201,255,74,0.10)', borderWidth: 1, borderColor: 'rgba(201,255,74,0.16)' },
  priorityText: { color: colors.lime, fontFamily: fonts.bodySemibold, fontSize: 9, letterSpacing: 0.3 },
  deleteBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.04)' },
  deleteText: { color: '#ff9f9f', fontFamily: fonts.displayMedium, fontSize: 18, lineHeight: 20 },
});
