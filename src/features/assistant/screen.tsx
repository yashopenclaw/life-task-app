import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
const starter: ChatLine[] = [{ id: 'hello', role: 'assistant', text: 'Say anything. I’ll turn messy input into the right system action.', source: 'local' }];

function normalizeSavedLines(lines: ChatLine[]) {
  const clean = lines.length ? lines : starter;
  return clean.map(line => line.source === 'typing' ? { ...line, text: 'Previous reply was interrupted. Send again if needed.', source: 'error' } : line);
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
        loadJson<ChatLine[]>(CHAT_LINES_KEY, starter),
        loadJson<string>(CHAT_DRAFT_KEY, ''),
        loadJson<boolean>(AUTO_TTS_KEY, true),
      ]);
      setLines(normalizeSavedLines(savedLines));
      setMessage(savedDraft);
      setAutoSpeak(savedTts);
      hydrated.current = true;
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (status.granted) await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    })().catch(() => { hydrated.current = true; });
    return () => { Speech.stop(); };
  }, []);

  useEffect(() => { if (hydrated.current) saveJson(CHAT_LINES_KEY, lines); }, [lines]);
  useEffect(() => { if (hydrated.current) saveJson(CHAT_DRAFT_KEY, message); }, [message]);
  useEffect(() => { if (hydrated.current) saveJson(AUTO_TTS_KEY, autoSpeak); }, [autoSpeak]);
  useEffect(() => { setTimeout(() => scroller.current?.scrollToEnd({ animated: true }), 80); }, [lines, busy]);

  function appendAssistantDelta(id: string, delta: string) {
    setLines(prev => prev.map(line => line.id === id ? { ...line, text: line.text === 'Thinking…' ? delta : line.text + delta, source: 'hermes' } : line));
  }

  async function send(text: string, source: 'typed' | 'voice' = 'typed') {
    const clean = text.trim(); if (!clean || busy) return;
    const now = Date.now();
    const assistantId = `${now}-a`;
    setBusy(true);
    setLines(prev => [...prev, { id: `${now}-u`, role: 'user', text: clean, source }, { id: assistantId, role: 'assistant', text: 'Thinking…', source: 'typing' }]);
    setMessage(''); if (source === 'voice') setVoiceDraft(null);
    try {
      let spoken = await assistantApi.stream({ message: clean, source }, delta => appendAssistantDelta(assistantId, delta));
      if (!spoken.trim()) {
        const reply = await assistantApi.send({ message: clean, source });
        spoken = reply.text;
        setLines(prev => prev.map(line => line.id === assistantId ? { ...line, text: reply.text, source: reply.source } : line));
      }
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

  function clearChat() {
    Speech.stop();
    setBusy(false);
    setLines(starter);
    setMessage('');
    setVoiceDraft(null);
  }

  return <View style={styles.root}>
    <View style={styles.hero}>
      <Pressable accessibilityRole="button" onPress={toggleRecording} style={[styles.mic, recorderState.isRecording && styles.micActive]}><MicGlyph size={66} /></Pressable>
      <Text style={styles.title}>{recorderState.isRecording ? 'Listening…' : 'Hermes'}</Text>
      <Text style={styles.sub}>{recorderState.isRecording ? `${Math.round(recorderState.durationMillis / 1000)}s · tap to stop` : voiceDraft ? `${voiceDraft.seconds}s captured. Add transcript below.` : busy ? 'Streaming…' : 'Talk or type. Keep it messy.'}</Text>
    </View>
    <ScrollView ref={scroller} style={styles.thread} contentContainerStyle={styles.threadInner}>
      {lines.map(line => <View key={line.id} style={[styles.bubble, line.role === 'user' ? styles.userBubble : styles.assistantBubble]}><Text style={[styles.bubbleText, line.role === 'user' && styles.userText, line.source === 'typing' && styles.thinking, line.source === 'error' && styles.errorText]}>{line.text || '…'}</Text></View>)}
    </ScrollView>
    <View style={styles.composer}>
      <TextInput value={message} onChangeText={setMessage} placeholder={voiceDraft ? 'Type what you said…' : 'Message Hermes…'} placeholderTextColor="#62666d" multiline style={styles.input} />
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => send(message, voiceDraft ? 'voice' : 'typed')} style={[styles.send, busy && styles.sendBusy]}><Text style={styles.sendText}>{busy ? '…' : 'Send'}</Text></Pressable>
    </View>
    <View style={styles.ttsRow}><Pressable accessibilityRole="checkbox" accessibilityState={{ checked: autoSpeak }} onPress={() => setAutoSpeak(v => !v)} style={[styles.check, autoSpeak && styles.checkOn]}><Text style={styles.checkText}>✓</Text></Pressable><Text style={styles.ttsText}>Auto TTS</Text><Pressable onPress={() => Speech.stop()}><Text style={styles.stop}>Stop voice</Text></Pressable><Pressable onPress={clearChat}><Text style={styles.clear}>Clear</Text></Pressable></View>
  </View>;
}
const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: { alignItems: 'center', paddingTop: 18, paddingBottom: 16 },
  mic: { width: 132, height: 132, borderRadius: 66, backgroundColor: '#111214', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, shadowColor: colors.primary, shadowOpacity: 0.24, shadowRadius: 24, elevation: 8 },
  micActive: { backgroundColor: colors.primaryDark },
  title: { color: colors.ink, fontSize: 34, fontWeight: '800', letterSpacing: -1.0, marginTop: 16 },
  sub: { color: colors.muted, fontWeight: '600', marginTop: 4 },
  thread: { flex: 1 },
  threadInner: { paddingBottom: 12 },
  bubble: { borderRadius: 18, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 10, maxWidth: '90%' },
  assistantBubble: { backgroundColor: 'rgba(255,255,255,0.035)', borderWidth: 1, borderColor: colors.line, alignSelf: 'flex-start' },
  userBubble: { backgroundColor: colors.primaryDark, alignSelf: 'flex-end' },
  bubbleText: { color: colors.soft, fontWeight: '600', lineHeight: 21 },
  userText: { color: '#fff' },
  thinking: { color: colors.muted, fontWeight: '700', letterSpacing: 0.3 },
  errorText: { color: colors.danger },
  composer: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: 'rgba(255,255,255,0.035)', borderWidth: 1, borderColor: colors.line, borderRadius: 22, padding: 8 },
  input: { flex: 1, color: colors.ink, minHeight: 42, maxHeight: 110, paddingHorizontal: 10, paddingVertical: 9, fontWeight: '600' },
  send: { backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 11, paddingHorizontal: 14 },
  sendBusy: { opacity: 0.55 },
  sendText: { color: '#fff', fontWeight: '800' },
  ttsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 10 },
  check: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.good, borderColor: colors.good },
  checkText: { color: '#fff', fontWeight: '900', fontSize: 12 },
  ttsText: { color: colors.muted, fontWeight: '700', marginLeft: 8, marginRight: 14 },
  stop: { color: colors.soft, fontWeight: '700' },
  clear: { color: colors.muted, fontWeight: '700', marginLeft: 14 },
});
