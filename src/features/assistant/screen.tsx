import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View, useWindowDimensions } from 'react-native';
import * as Speech from 'expo-speech';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { colors } from '../../core/theme';
import { loadJson, saveJson } from '../../core/storage';
import { MicOrb } from '../../core/ui/MicOrb';
import { GlassCard } from '../../core/ui/GlassCard';
import { fonts } from '../../core/fonts';
import { assistantApi } from './api';
import type { ChatLine } from './types';

const CHAT_LINES_KEY = 'life-task:assistant-lines:v2';
const CHAT_DRAFT_KEY = 'life-task:assistant-draft:v1';
const AUTO_TTS_KEY = 'life-task:auto-tts:v1';
const starter: ChatLine[] = [];

function todayLabel() {
  return new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' }).toUpperCase();
}

function normalizeSavedLines(lines: ChatLine[]) {
  return lines.map(line => line.source === 'typing' ? { ...line, text: 'Previous reply was interrupted. Send again if needed.', source: 'error' } : line);
}

export default function AssistantScreen() {
  const { height } = useWindowDimensions();
  const tightPhone = height < 740;
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [lines, setLines] = useState<ChatLine[]>(starter);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [voiceDraft, setVoiceDraft] = useState<{ seconds: number } | null>(null);
  const hydrated = useRef(false);
  const scroller = useRef<ScrollView>(null);

  useEffect(() => {
    (async () => {
      const [savedLines, savedDraft, savedTts] = await Promise.all([
        loadJson<ChatLine[]>(CHAT_LINES_KEY, starter), loadJson<string>(CHAT_DRAFT_KEY, ''), loadJson<boolean>(AUTO_TTS_KEY, true),
      ]);
      setLines(normalizeSavedLines(savedLines)); setMessage(savedDraft); setAutoSpeak(savedTts); hydrated.current = true;
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (status.granted) await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    })().catch(() => { hydrated.current = true; });
    return () => { Speech.stop(); };
  }, []);

  useEffect(() => { if (hydrated.current) saveJson(CHAT_LINES_KEY, lines); }, [lines]);
  useEffect(() => { if (hydrated.current) saveJson(CHAT_DRAFT_KEY, message); }, [message]);
  useEffect(() => { if (hydrated.current) saveJson(AUTO_TTS_KEY, autoSpeak); }, [autoSpeak]);
  useEffect(() => { setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 80); }, [lines, busy]);
  function appendAssistantDelta(id: string, delta: string) { setLines(prev => prev.map(line => line.id === id ? { ...line, text: line.text === 'Thinking…' ? delta : line.text + delta, source: 'hermes' } : line)); }

  async function send(text: string, source: 'typed' | 'voice' = 'typed') {
    const clean = text.trim(); if (!clean || busy) return;
    const now = Date.now(); const assistantId = `${now}-a`;
    setBusy(true); setLines(prev => [...prev, { id: `${now}-u`, role: 'user', text: clean, source }, { id: assistantId, role: 'assistant', text: 'Thinking…', source: 'typing' }]);
    setMessage(''); if (source === 'voice') setVoiceDraft(null);
    try {
      let spoken = await assistantApi.stream({ message: clean, source }, delta => appendAssistantDelta(assistantId, delta));
      if (!spoken.trim()) { const reply = await assistantApi.send({ message: clean, source }); spoken = reply.text; setLines(prev => prev.map(line => line.id === assistantId ? { ...line, text: reply.text, source: reply.source } : line)); }
      if (autoSpeak && spoken.trim()) { Speech.stop(); Speech.speak(spoken.slice(0, Speech.maxSpeechInputLength || 800), { rate: 0.98, pitch: 1.0 }); }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Assistant failed';
      setLines(prev => prev.map(line => line.id === assistantId ? { ...line, text: msg, source: 'error' } : line));
    } finally { setBusy(false); }
  }

  async function toggleRecording() {
    if (recorderState.isRecording) { const seconds = Math.max(1, Math.round(recorderState.durationMillis / 1000)); await recorder.stop(); setVoiceDraft({ seconds }); return; }
    try { await recorder.prepareToRecordAsync(); recorder.record(); setVoiceDraft(null); } catch { Alert.alert('Mic unavailable', 'Type below; chat still works.'); }
  }
  function clearChat() { Speech.stop(); setBusy(false); setLines(starter); setMessage(''); setVoiceDraft(null); }
  const hasChat = lines.length > 0;
  const statusText = busy ? 'streaming' : recorderState.isRecording ? 'listening' : voiceDraft ? 'captured' : 'ready';

  return <View style={styles.root}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.page, tightPhone && styles.pageTight]} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.kicker}>{todayLabel()}</Text>
        <Text style={[styles.greeting, tightPhone && styles.greetingTight]}>Hi, Yash</Text>
      </View>

      {/* Orb — floating with tighter spacing */}
      <View style={[styles.orbZone, tightPhone && styles.orbZoneTight, hasChat && styles.orbZoneWithChat]}>
        <MicOrb recording={recorderState.isRecording} onPress={toggleRecording} />
        <Text style={[styles.orbPrompt, tightPhone && styles.orbPromptTight]}>
          {recorderState.isRecording ? `${Math.round(recorderState.durationMillis / 1000)}s · tap to stop` : voiceDraft ? `${voiceDraft.seconds}s captured — type below` : busy ? 'Hermes is thinking…' : 'Tap to talk'}
        </Text>
        {!hasChat && <Text style={styles.orbHint}>Ask anything. Dump a thought. Capture a task.</Text>}
      </View>

      {/* Chat thread */}
      {hasChat ? <ScrollView ref={scroller} nestedScrollEnabled style={[styles.thread, tightPhone && styles.threadTight]} contentContainerStyle={styles.threadInner}>
        {lines.map(line => <View key={line.id} style={[styles.bubble, line.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
          <Text style={[styles.bubbleText, line.role === 'user' && styles.userText, line.source === 'typing' && styles.thinking, line.source === 'error' && styles.errorText]}>{line.text || '…'}</Text>
        </View>)}
      </ScrollView> : null}

      {/* Composer — pulled up close below orb/chat */}
      <View style={styles.composerWrap}>
        <GlassCard style={styles.composer} contentStyle={styles.composerInner}>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder={voiceDraft ? 'Type what you said…' : 'Message Hermes…'}
            placeholderTextColor="#555b66"
            multiline
            style={styles.input}
          />
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => send(message, voiceDraft ? 'voice' : 'typed')} style={[styles.send, busy && styles.sendBusy]}>
            <Text style={styles.sendText}>{busy ? '···' : '→'}</Text>
          </Pressable>
        </GlassCard>
        <View style={styles.controlsRow}>
          <Pressable onPress={() => setAutoSpeak(!autoSpeak)} style={styles.controlPill}>
            <View style={[styles.controlDot, autoSpeak && styles.controlDotActive]} />
            <Text style={styles.controlText}>{autoSpeak ? 'Voice on' : 'Voice off'}</Text>
          </Pressable>
          {hasChat ? <Pressable onPress={clearChat}><Text style={styles.clearText}>Clear</Text></Pressable> : null}
        </View>
      </View>
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  page: { flexGrow: 1, justifyContent: 'center', gap: 16, paddingVertical: 24 },
  pageTight: { gap: 12, paddingVertical: 16 },
  header: { alignItems: 'center' },
  kicker: { color: '#6c717c', fontSize: 10, letterSpacing: 3.8, fontFamily: fonts.bodySemibold },
  greeting: { color: colors.ink, fontSize: 30, fontFamily: fonts.displaySemibold, marginTop: 8, letterSpacing: -1.0 },
  greetingTight: { fontSize: 26, marginTop: 6 },
  orbZone: { alignItems: 'center', paddingTop: 8, paddingBottom: 4 },
  orbZoneTight: { paddingTop: 4, paddingBottom: 2 },
  orbZoneWithChat: { paddingTop: 4, paddingBottom: 4 },
  orbPrompt: { color: colors.soft, fontSize: 15, fontFamily: fonts.displayMedium, marginTop: 14, textAlign: 'center', letterSpacing: -0.2 },
  orbPromptTight: { fontSize: 14, marginTop: 10 },
  orbHint: { color: colors.muted, fontSize: 12, fontFamily: fonts.bodyMedium, marginTop: 6, textAlign: 'center' },
  thread: { maxHeight: 200, marginBottom: 6, opacity: 0.95 },
  threadTight: { maxHeight: 150 },
  threadInner: { paddingBottom: 6 },
  bubble: { borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 6, maxWidth: '88%' },
  assistantBubble: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', alignSelf: 'flex-start' },
  userBubble: { backgroundColor: colors.primaryDark, alignSelf: 'flex-end' },
  bubbleText: { color: colors.soft, fontFamily: fonts.bodyMedium, lineHeight: 19, fontSize: 14 },
  userText: { color: '#fff' },
  thinking: { color: colors.muted },
  errorText: { color: colors.danger },
  composerWrap: { gap: 10 },
  composer: { borderRadius: 20, opacity: 0.98 },
  composerInner: { flexDirection: 'row', alignItems: 'flex-end', padding: 6 },
  input: { flex: 1, color: colors.ink, minHeight: 40, maxHeight: 88, paddingHorizontal: 12, paddingVertical: 8, fontFamily: fonts.bodyMedium, fontSize: 15 },
  send: { width: 42, height: 42, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBusy: { opacity: 0.5 },
  sendText: { color: '#fff', fontFamily: fonts.bodySemibold, fontSize: 18 },
  controlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
  controlPill: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  controlDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#3a3f48' },
  controlDotActive: { backgroundColor: colors.lime },
  controlText: { color: colors.muted, fontSize: 12, fontFamily: fonts.bodyMedium },
  clearText: { color: colors.muted, fontSize: 12, fontFamily: fonts.bodyMedium },
});

