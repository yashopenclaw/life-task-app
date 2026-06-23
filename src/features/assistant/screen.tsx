import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Speech from 'expo-speech';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { Button, Card, Field, Row } from '../../core/ui/atoms';
import { colors } from '../../core/theme';
import { assistantApi } from './api';
import type { ChatLine } from './types';

const starter: ChatLine[] = [{ id: 'hello', role: 'assistant', text: 'Tap the mic, say what you need, then add a quick transcript. I’ll answer here and speak it back if ✓ is on.', source: 'local' }];
const quickPrompts = ['What should I do next?', 'Log a gym task', 'Help estimate my food'];

export default function AssistantScreen() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [lines, setLines] = useState<ChatLine[]>(starter);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [voiceDraft, setVoiceDraft] = useState<{ seconds: number } | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>(quickPrompts);

  useEffect(() => {
    (async () => {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) return;
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    })().catch(() => undefined);
    return () => { Speech.stop(); };
  }, []);

  async function send(text: string, source: 'typed' | 'voice' = 'typed') {
    const clean = text.trim();
    if (!clean || busy) return;
    setBusy(true);
    setLines(prev => [...prev, { id: `${Date.now()}-u`, role: 'user', text: clean, source }]);
    setMessage('');
    if (source === 'voice') setVoiceDraft(null);
    try {
      const reply = await assistantApi.send({ message: clean, source });
      setLines(prev => [...prev, { id: `${Date.now()}-a`, role: 'assistant', text: reply.text, source: reply.source }]);
      setSuggestions(reply.suggestions?.length ? reply.suggestions : quickPrompts);
      if (autoSpeak) {
        Speech.stop();
        Speech.speak(reply.text.slice(0, Speech.maxSpeechInputLength || 800), { rate: 0.98, pitch: 1.0 });
      }
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Assistant failed';
      setLines(prev => [...prev, { id: `${Date.now()}-e`, role: 'assistant', text, source: 'error' }]);
    } finally {
      setBusy(false);
    }
  }

  async function toggleRecording() {
    if (recorderState.isRecording) {
      const seconds = Math.max(1, Math.round(recorderState.durationMillis / 1000));
      await recorder.stop();
      setVoiceDraft({ seconds });
      return;
    }
    try {
      await recorder.prepareToRecordAsync();
      recorder.record();
      setVoiceDraft(null);
    } catch {
      Alert.alert('Mic unavailable', 'Type the message instead; chat still works.');
    }
  }

  const sendTitle = voiceDraft ? 'Send voice note' : busy ? 'Sending…' : 'Send';

  return <View style={styles.root}>
    <View style={styles.hero}>
      <View style={styles.glow} />
      <Pressable accessibilityRole="button" onPress={toggleRecording} style={[styles.mic, recorderState.isRecording && styles.micActive]}>
        <Text style={styles.micIcon}>{recorderState.isRecording ? '■' : '◉'}</Text>
      </Pressable>
      <Text style={styles.heroTitle}>{recorderState.isRecording ? 'Listening… tap to stop' : 'Talk to Hermes'}</Text>
      <Text style={styles.heroSub}>{recorderState.isRecording ? `${Math.round(recorderState.durationMillis / 1000)}s recorded` : voiceDraft ? `${voiceDraft.seconds}s voice note ready — add the transcript below.` : 'One big mic, typed fallback, spoken replies.'}</Text>
    </View>

    <View style={styles.speakBar}>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: autoSpeak }} onPress={() => setAutoSpeak(v => !v)} style={[styles.check, autoSpeak && styles.checkOn]}>
        <Text style={styles.checkText}>✓</Text>
      </Pressable>
      <Text style={styles.speakLabel}>Auto-play Hermes replies</Text>
      <Pressable accessibilityRole="button" onPress={() => Speech.stop()} style={styles.stopPill}><Text style={styles.stopText}>Stop</Text></Pressable>
    </View>

    <Card>
      {voiceDraft ? <View style={styles.voiceDraft}>
        <Text style={styles.voiceTitle}>Voice captured</Text>
        <Text style={styles.voiceCopy}>Audio is saved locally for now. Type what you said and it will go through the voice path.</Text>
      </View> : null}
      <Field label={voiceDraft ? 'Voice transcript' : 'Message'} value={message} onChangeText={setMessage} placeholder="Ask Hermes, dump a thought, or say what to log…" multiline />
      <Row>
        <Button title={sendTitle} tone={voiceDraft ? 'good' : 'primary'} onPress={() => send(message, voiceDraft ? 'voice' : 'typed')} />
        {voiceDraft ? <Button title="Discard" tone="muted" onPress={() => setVoiceDraft(null)} /> : null}
      </Row>
      <View style={styles.suggestions}>
        {suggestions.map(suggestion => <Pressable key={suggestion} accessibilityRole="button" onPress={() => send(suggestion)} style={styles.chip}>
          <Text style={styles.chipText}>{suggestion}</Text>
        </Pressable>)}
      </View>
    </Card>

    <ScrollView style={styles.thread}>
      {lines.map(line => <View key={line.id} style={[styles.bubble, line.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
        <Text style={[styles.bubbleText, line.role === 'user' && styles.userText]}>{line.text}</Text>
        {line.source ? <Text style={[styles.source, line.role === 'user' && styles.userText]}>{line.source}</Text> : null}
      </View>)}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: { alignItems: 'center', justifyContent: 'center', paddingVertical: 34, position: 'relative', overflow: 'hidden' },
  glow: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: '#ddd6fe', opacity: 0.65 },
  mic: { width: 136, height: 136, borderRadius: 68, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center', shadowColor: '#7c3aed', shadowOpacity: 0.35, shadowRadius: 20, elevation: 8 },
  micActive: { backgroundColor: colors.danger },
  micIcon: { color: '#fff', fontSize: 58, fontWeight: '900' },
  heroTitle: { marginTop: 18, fontSize: 25, fontWeight: '900', color: colors.ink },
  heroSub: { marginTop: 6, color: colors.muted, textAlign: 'center', fontWeight: '700' },
  speakBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', borderRadius: 999, padding: 8, marginBottom: 12 },
  check: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: '#475569', alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.good, borderColor: colors.good },
  checkText: { color: '#fff', fontWeight: '900' },
  speakLabel: { color: '#fff', fontWeight: '800', marginLeft: 10, flex: 1 },
  stopPill: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: '#334155' },
  stopText: { color: '#fff', fontWeight: '800' },
  voiceDraft: { padding: 12, borderRadius: 16, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0', marginBottom: 12 },
  voiceTitle: { color: '#166534', fontWeight: '900' },
  voiceCopy: { color: '#166534', marginTop: 4, fontWeight: '700' },
  thread: { flex: 1 },
  bubble: { borderRadius: 18, padding: 14, marginBottom: 10, maxWidth: '92%' },
  assistantBubble: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, alignSelf: 'flex-start' },
  userBubble: { backgroundColor: colors.primary, alignSelf: 'flex-end' },
  bubbleText: { color: colors.ink, fontWeight: '700' },
  userText: { color: '#fff' },
  source: { marginTop: 6, color: colors.muted, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  chip: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, borderColor: '#c7d2fe', backgroundColor: '#eef2ff', marginRight: 8, marginTop: 8 },
  chipText: { color: '#3730a3', fontWeight: '800', fontSize: 12 },
});
