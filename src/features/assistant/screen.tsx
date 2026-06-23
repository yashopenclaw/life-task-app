import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import * as Speech from 'expo-speech';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { colors } from '../../core/theme';
import { loadJson, saveJson } from '../../core/storage';
import { MicGlyph } from '../../core/ui/MicGlyph';
import { assistantApi } from './api';
import type { ChatLine } from './types';

const CHAT_LINES_KEY = 'life-task:assistant-lines:v2';
const CHAT_DRAFT_KEY = 'life-task:assistant-draft:v1';
const AUTO_TTS_KEY = 'life-task:auto-tts:v1';
const starter: ChatLine[] = [];

function normalizeSavedLines(lines: ChatLine[]) {
  return lines.map(line => line.source === 'typing' ? { ...line, text: 'Previous reply was interrupted. Send again if needed.', source: 'error' } : line);
}

export default function AssistantScreen() {
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

  return <View style={styles.root}>
    <View style={styles.topLine}><Text style={styles.kicker}>TUESDAY · GOOD EVENING</Text><View style={styles.settingsDot} /></View>
    <Text style={styles.greeting}>Hi, Yash</Text>
    <View style={[styles.centerZone, hasChat && styles.centerZoneWithChat]}>
      <Pressable accessibilityRole="button" onPress={toggleRecording} style={[styles.orb, recorderState.isRecording && styles.orbActive]}>
        <View style={styles.orbRing} /><MicGlyph size={54} />
      </Pressable>
      <Text style={styles.prompt}>{recorderState.isRecording ? `${Math.round(recorderState.durationMillis / 1000)}s · tap to stop` : voiceDraft ? `${voiceDraft.seconds}s captured. Type transcript below.` : busy ? 'Streaming Hermes…' : 'Capture by voice.'}</Text>
    </View>
    {hasChat ? <ScrollView ref={scroller} style={styles.thread} contentContainerStyle={styles.threadInner}>{lines.map(line => <View key={line.id} style={[styles.bubble, line.role === 'user' ? styles.userBubble : styles.assistantBubble]}><Text style={[styles.bubbleText, line.role === 'user' && styles.userText, line.source === 'typing' && styles.thinking, line.source === 'error' && styles.errorText]}>{line.text || '…'}</Text></View>)}</ScrollView> : null}
    <View style={styles.composer}><TextInput value={message} onChangeText={setMessage} placeholder={voiceDraft ? 'Type what you said…' : 'Message Hermes…'} placeholderTextColor="#656b76" multiline style={styles.input} /><Pressable accessibilityRole="button" disabled={busy} onPress={() => send(message, voiceDraft ? 'voice' : 'typed')} style={[styles.send, busy && styles.sendBusy]}><Text style={styles.sendText}>{busy ? '…' : 'Send'}</Text></Pressable></View>
    <View style={styles.ttsCard}><View><Text style={styles.ttsTitle}>Speak responses aloud</Text><Text style={styles.ttsSub}>Read answers via voice</Text></View><Switch value={autoSpeak} onValueChange={setAutoSpeak} trackColor={{ false: '#2a2e36', true: colors.primary }} thumbColor="#ffffff" /></View>
    {hasChat ? <Pressable onPress={clearChat}><Text style={styles.clear}>Clear conversation</Text></Pressable> : null}
  </View>;
}
const styles = StyleSheet.create({
  root: { flex: 1 },
  topLine: { alignItems: 'center', justifyContent: 'center' },
  kicker: { textAlign: 'center', color: '#7b808b', fontSize: 11, letterSpacing: 4.2, fontWeight: '700' },
  settingsDot: { position: 'absolute', right: 0, width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: colors.lineStrong },
  greeting: { textAlign: 'center', color: colors.ink, fontSize: 34, fontWeight: '800', marginTop: 16, letterSpacing: -1.1 },
  centerZone: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 58 },
  centerZoneWithChat: { flex: 0, paddingTop: 24, paddingBottom: 16 },
  orb: { width: 132, height: 132, borderRadius: 66, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOpacity: 0.34, shadowRadius: 22, elevation: 12 },
  orbRing: { position: 'absolute', width: 172, height: 172, borderRadius: 86, backgroundColor: 'rgba(138,124,255,0.10)', borderWidth: 1, borderColor: 'rgba(138,124,255,0.08)' },
  orbActive: { backgroundColor: colors.lime, shadowColor: colors.lime },
  prompt: { color: colors.ink, fontSize: 20, fontWeight: '700', marginTop: 42, textAlign: 'center', letterSpacing: -0.3 },
  thread: { maxHeight: 248, marginBottom: 10 },
  threadInner: { paddingBottom: 8 },
  bubble: { borderRadius: 18, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 10, maxWidth: '90%' },
  assistantBubble: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, alignSelf: 'flex-start' },
  userBubble: { backgroundColor: colors.primaryDark, alignSelf: 'flex-end' },
  bubbleText: { color: colors.soft, fontWeight: '500', lineHeight: 21 },
  userText: { color: '#fff' },
  thinking: { color: colors.muted },
  errorText: { color: colors.danger },
  composer: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 22, padding: 8, marginBottom: 12 },
  input: { flex: 1, color: colors.ink, minHeight: 42, maxHeight: 96, paddingHorizontal: 10, paddingVertical: 9, fontWeight: '600' },
  send: { backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 11, paddingHorizontal: 16 },
  sendBusy: { opacity: 0.55 },
  sendText: { color: '#fff', fontWeight: '800' },
  ttsCard: { minHeight: 66, borderRadius: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ttsTitle: { color: colors.ink, fontWeight: '700', fontSize: 15 },
  ttsSub: { color: colors.muted, fontWeight: '600', marginTop: 3, fontSize: 12 },
  clear: { textAlign: 'center', color: colors.muted, fontWeight: '600', marginTop: 10 },
});
