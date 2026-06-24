import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import { useAsync } from '../../core/useAsync';
import { State } from '../../core/ui/atoms';
import { GlassCard } from '../../core/ui/GlassCard';
import { MicGlyph } from '../../core/ui/MicGlyph';
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

type VoicePhase = 'idle' | 'recording' | 'transcribing';

export default function TasksScreen() {
  const { data, loading, error, load, setData } = useAsync(useCallback(() => tasksApi.list(), []));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [inputOpen, setInputOpen] = useState(false);

  // Voice state
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [voicePhase, setVoicePhase] = useState<VoicePhase>('idle');
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [permsGranted, setPermsGranted] = useState(false);

  useEffect(() => {
    (async () => {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (status.granted) { setPermsGranted(true); await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true }); }
    })();
  }, []);

  async function handleMicPress() {
    if (voicePhase === 'recording') {
      const uri = await recorder.stop();
      setVoicePhase('transcribing');
      setRecordingUri(uri);
      return;
    }
    if (voicePhase === 'idle' && !busy) {
      if (!permsGranted) {
        const status = await AudioModule.requestRecordingPermissionsAsync();
        if (!status.granted) { Alert.alert('Mic denied', 'Allow microphone access.'); return; }
        setPermsGranted(true);
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      }
      try { await recorder.prepareToRecordAsync(); recorder.record(); setVoicePhase('recording'); }
      catch { Alert.alert('Mic error', 'Could not start recording.'); }
    }
  }

  useEffect(() => {
    if (recordingUri && voicePhase === 'transcribing') {
      (async () => {
        try {
          const text = await assistantApi.transcribe(recordingUri);
          if (text.trim()) await addNatural(text, 'voice');
        } catch { Alert.alert('Transcribe failed', 'Could not transcribe audio.'); }
        finally { setVoicePhase('idle'); setRecordingUri(null); }
      })();
    }
  }, [recordingUri, voicePhase]);

  async function addNatural(text?: string, source: 'typed' | 'voice' = 'typed') {
    const clean = (text || message).trim(); if (!clean || busy) return;
    setBusy(true);
    try {
      const result = await tasksApi.natural(clean, source);
      if (source === 'voice') {
        const title = await assistantApi.title(clean).catch(() => result.task.title);
        setData(prev => [{ ...result.task, title: title || result.task.title }, ...(prev || [])]);
      } else {
        setData(prev => [result.task, ...(prev || [])]);
      }
      setMessage(''); setInputOpen(false);
    } finally { setBusy(false); }
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
      </View>

      {/* Open count */}
      <Text style={styles.openCount}>
        {tasks.length > 0 ? `${tasks.length} open` : 'All clear'}
      </Text>

      {/* Inline text add input */}
      {inputOpen ? <GlassCard style={styles.inputCard} contentStyle={styles.inputCardInner}>
        <TextInput value={message} onChangeText={setMessage} placeholder="Add a task — natural language…" placeholderTextColor="#555b66" style={styles.input} onSubmitEditing={() => addNatural()} autoFocus />
        <Pressable disabled={busy} onPress={() => addNatural()} style={styles.inputSend}>
          {busy ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.inputSendText}>+</Text>}
        </Pressable>
        <Pressable onPress={() => { setInputOpen(false); setMessage(''); }} style={styles.collapseBtn}>
          <Text style={styles.collapseText}>×</Text>
        </Pressable>
      </GlassCard> : null}

      {/* Voice status */}
      {voicePhase === 'recording' ? <Text style={styles.voiceStatus}>Listening… {Math.round(recorderState.durationMillis / 1000)}s</Text> : null}
      {voicePhase === 'transcribing' ? <Text style={styles.voiceStatus}>Transcribing…</Text> : null}

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

    {/* Floating mic (left) + plus (right) above bottom rail */}
    <View style={styles.floatingBar}>
      <Pressable onPress={handleMicPress} disabled={voicePhase === 'transcribing' || busy} style={[styles.floatMic, voicePhase === 'recording' && styles.floatMicActive]}>
        {voicePhase === 'recording' ? <FloatWave /> : voicePhase === 'transcribing' ? <ActivityIndicator size="small" color="#fff" /> : <MicGlyph size={24} color="#fff" />}
      </Pressable>
      <Pressable onPress={() => setInputOpen(!inputOpen)} style={styles.floatPlus}>
        <Text style={styles.floatPlusText}>{inputOpen ? '×' : '+'}</Text>
      </Pressable>
    </View>
  </View>;
}

function FloatWave() {
  return <View style={styles.floatWave}>{[0, 1, 2].map(i => <FloatBar key={i} index={i} />)}</View>;
}
function FloatBar({ index }: { index: number }) {
  const v = useSharedValue(0.3);
  useEffect(() => {
    v.value = withDelay(index * 70, withRepeat(withTiming(1, { duration: 260 + (index % 2) * 100, easing: Easing.inOut(Easing.quad) }), -1, true));
  }, [v, index]);
  const style = useAnimatedStyle(() => ({ height: 4 + v.value * 14 }));
  return <Animated.View style={[styles.floatBar, style]} />;
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
  wrap: { paddingBottom: 110 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 4 },
  kicker: { color: '#6c717c', fontSize: 10, letterSpacing: 3.8, fontFamily: fonts.bodySemibold },
  title: { color: colors.ink, fontSize: 34, fontFamily: fonts.displaySemibold, letterSpacing: -1.0, marginTop: 6 },
  openCount: { color: colors.soft, fontFamily: fonts.bodyMedium, fontSize: 14, marginTop: 12, marginBottom: 20 },
  inputCard: { height: 54, borderRadius: 18, marginBottom: 8 },
  inputCardInner: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 6 },
  input: { flex: 1, color: colors.ink, fontFamily: fonts.bodyMedium, fontSize: 14, minHeight: 44 },
  inputSend: { width: 44, height: 44, borderRadius: 16, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  inputSendText: { color: '#fff', fontFamily: fonts.displayMedium, fontSize: 22, lineHeight: 24 },
  collapseBtn: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  collapseText: { color: colors.muted, fontFamily: fonts.displayMedium, fontSize: 26, lineHeight: 28 },
  voiceStatus: { color: colors.blue, fontSize: 12, fontFamily: fonts.bodyMedium, textAlign: 'center', marginBottom: 12 },
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
  // Floating action bar
  floatingBar: { position: 'absolute', left: 24, right: 24, bottom: 76, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  floatMic: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOpacity: 0.35, shadowRadius: 14, elevation: 8 },
  floatMicActive: { backgroundColor: colors.lime, shadowColor: colors.lime },
  floatWave: { flexDirection: 'row', alignItems: 'center', height: 20, gap: 3 },
  floatBar: { width: 3, borderRadius: 2, backgroundColor: 'rgba(5,8,12,0.85)' },
  floatPlus: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center', shadowColor: colors.blue, shadowOpacity: 0.35, shadowRadius: 14, elevation: 8 },
  floatPlusText: { color: '#fff', fontFamily: fonts.displayMedium, fontSize: 26, lineHeight: 28 },
});
