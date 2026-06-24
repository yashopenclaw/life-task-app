import { useEffect, useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
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

type ModelInfo = { id: string; label: string; provider: string };

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

  // Model switcher state
  const [currentModel, setCurrentModel] = useState('hermes-agent');
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const [savedLines, savedDraft, savedTts] = await Promise.all([
        loadJson<ChatLine[]>(CHAT_LINES_KEY, starter), loadJson<string>(CHAT_DRAFT_KEY, ''), loadJson<boolean>(AUTO_TTS_KEY, true),
      ]);
      setLines(normalizeSavedLines(savedLines)); setMessage(savedDraft); setAutoSpeak(savedTts); hydrated.current = true;
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (status.granted) await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      // Load models
      try {
        const data = await assistantApi.models();
        setCurrentModel(data.current);
        setModels(data.models);
      } catch {}
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
    if (recorderState.isRecording) {
      const seconds = Math.max(1, Math.round(recorderState.durationMillis / 1000));
      const uri = await recorder.stop();
      setVoiceDraft({ seconds });
      // Transcribe and auto-send
      try {
        setBusy(true);
        const text = await assistantApi.transcribe(uri);
        if (text.trim()) await send(text, 'voice');
      } catch { Alert.alert('Transcribe failed', 'Could not transcribe audio.'); }
      finally { setBusy(false); }
      return;
    }
    try { await recorder.prepareToRecordAsync(); recorder.record(); setVoiceDraft(null); } catch { Alert.alert('Mic unavailable', 'Type below; chat still works.'); }
  }

  async function switchModel(model: ModelInfo) {
    setModelPickerOpen(false);
    try {
      const data = await assistantApi.switchModel(model.id, model.provider);
      setCurrentModel(data.current);
    } catch { Alert.alert('Switch failed', 'Could not switch model.'); }
  }

  function clearChat() { Speech.stop(); setBusy(false); setLines(starter); setMessage(''); setVoiceDraft(null); }
  const hasChat = lines.length > 0;
  const currentLabel = models.find(m => m.id === currentModel)?.label || currentModel;

  return <View style={styles.root}>
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.page, tightPhone && styles.pageTight]} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.kicker}>{todayLabel()}</Text>
        <Text style={[styles.greeting, tightPhone && styles.greetingTight]}>Hi, Yash</Text>
      </View>

      {/* Orb */}
      <View style={[styles.orbZone, tightPhone && styles.orbZoneTight, hasChat && styles.orbZoneWithChat]}>
        <MicOrb recording={recorderState.isRecording} onPress={toggleRecording} />
        <Text style={[styles.orbPrompt, tightPhone && styles.orbPromptTight]}>
          {recorderState.isRecording ? `${Math.round(recorderState.durationMillis / 1000)}s · tap to stop` : voiceDraft ? `${voiceDraft.seconds}s captured — transcribing…` : busy ? 'Hermes is thinking…' : 'Tap to talk'}
        </Text>
        {!hasChat && <Text style={styles.orbHint}>Ask anything. Dump a thought. Capture a task.</Text>}
      </View>

      {/* Chat thread */}
      {hasChat ? <ScrollView ref={scroller} nestedScrollEnabled style={[styles.thread, tightPhone && styles.threadTight]} contentContainerStyle={styles.threadInner}>
        {lines.map(line => <View key={line.id} style={[styles.bubble, line.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
          <Text style={[styles.bubbleText, line.role === 'user' && styles.userText, line.source === 'typing' && styles.thinking, line.source === 'error' && styles.errorText]}>{line.text || '…'}</Text>
        </View>)}
      </ScrollView> : null}

      {/* Command bar — model switcher + controls */}
      <View style={styles.commandBar}>
        <Pressable onPress={() => setModelPickerOpen(true)} style={styles.modelPill}>
          <View style={styles.modelDot} />
          <Text style={styles.modelLabel} numberOfLines={1}>{currentLabel}</Text>
          <Text style={styles.modelChevron}>⌄</Text>
        </Pressable>
        <View style={styles.commandRight}>
          <Pressable onPress={() => setAutoSpeak(!autoSpeak)} style={styles.cmdBtn}>
            <View style={[styles.cmdDot, autoSpeak && styles.cmdDotActive]} />
            <Text style={styles.cmdText}>{autoSpeak ? 'TTS' : 'Mute'}</Text>
          </Pressable>
          {hasChat ? <Pressable onPress={clearChat} style={styles.cmdBtn}><Text style={styles.cmdText}>Clear</Text></Pressable> : null}
        </View>
      </View>

      {/* Composer */}
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
    </ScrollView>

    {/* Model picker modal */}
    <Modal visible={modelPickerOpen} transparent animationType="fade" onRequestClose={() => setModelPickerOpen(false)}>
      <Pressable style={styles.modalOverlay} onPress={() => setModelPickerOpen(false)}>
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>Switch Model</Text>
          <ScrollView style={styles.modelList}>
            {models.map(m => <Pressable key={m.id} onPress={() => switchModel(m)} style={[styles.modelItem, m.id === currentModel && styles.modelItemActive]}>
              <Text style={[styles.modelItemLabel, m.id === currentModel && styles.modelItemLabelActive]}>{m.label}</Text>
              <Text style={styles.modelItemId}>{m.id}</Text>
              {m.id === currentModel ? <Text style={styles.modelCheck}>✓</Text> : null}
            </Pressable>)}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  page: { flexGrow: 1, justifyContent: 'center', gap: 14, paddingVertical: 24 },
  pageTight: { gap: 10, paddingVertical: 16 },
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
  thread: { maxHeight: 200, marginBottom: 4, opacity: 0.95 },
  threadTight: { maxHeight: 150 },
  threadInner: { paddingBottom: 6 },
  bubble: { borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14, marginBottom: 6, maxWidth: '88%' },
  assistantBubble: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', alignSelf: 'flex-start' },
  userBubble: { backgroundColor: colors.primaryDark, alignSelf: 'flex-end' },
  bubbleText: { color: colors.soft, fontFamily: fonts.bodyMedium, lineHeight: 19, fontSize: 14 },
  userText: { color: '#fff' },
  thinking: { color: colors.muted },
  errorText: { color: colors.danger },
  // Command bar
  commandBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  modelPill: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  modelDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.lime },
  modelLabel: { color: colors.soft, fontSize: 12, fontFamily: fonts.bodyMedium, maxWidth: 100 },
  modelChevron: { color: colors.muted, fontSize: 14 },
  commandRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cmdBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: 'rgba(255,255,255,0.04)' },
  cmdDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#3a3f48' },
  cmdDotActive: { backgroundColor: colors.lime },
  cmdText: { color: colors.muted, fontSize: 11, fontFamily: fonts.bodyMedium },
  // Composer
  composer: { borderRadius: 20, opacity: 0.98 },
  composerInner: { flexDirection: 'row', alignItems: 'flex-end', padding: 6 },
  input: { flex: 1, color: colors.ink, minHeight: 40, maxHeight: 88, paddingHorizontal: 12, paddingVertical: 8, fontFamily: fonts.bodyMedium, fontSize: 15 },
  send: { width: 42, height: 42, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBusy: { opacity: 0.5 },
  sendText: { color: '#fff', fontFamily: fonts.bodySemibold, fontSize: 18 },
  // Model picker modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: { backgroundColor: '#11141a', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, paddingBottom: 36, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  modalTitle: { color: colors.ink, fontSize: 18, fontFamily: fonts.displaySemibold, marginBottom: 16 },
  modelList: { maxHeight: 400 },
  modelItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14, borderRadius: 16, marginBottom: 6, backgroundColor: 'rgba(255,255,255,0.03)' },
  modelItemActive: { backgroundColor: 'rgba(138,124,255,0.12)', borderWidth: 1, borderColor: 'rgba(138,124,255,0.2)' },
  modelItemLabel: { color: colors.ink, fontSize: 15, fontFamily: fonts.bodySemibold, flex: 1 },
  modelItemLabelActive: { color: colors.primary },
  modelItemId: { color: colors.muted, fontSize: 11, fontFamily: fonts.bodyMedium },
  modelCheck: { color: colors.lime, fontSize: 16, marginLeft: 10 },
});
