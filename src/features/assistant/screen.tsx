import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Speech from 'expo-speech';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import { Button, Card, Field, Row } from '../../core/ui/atoms';
import { colors } from '../../core/theme';
import { assistantApi } from './api';
import type { ChatLine } from './types';

const starter: ChatLine[] = [{ id: 'hello', role: 'assistant', text: 'Tap the mic, say what you need, or type it. I’ll keep the thread here.', source: 'local' }];
const quickPrompts = ['What should I do next?', 'Log a gym task', 'Help estimate my food'];

export default function AssistantScreen() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [lines, setLines] = useState<ChatLine[]>(starter);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
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
      const uri = recorder.uri ?? null;
      setRecordedUri(uri);
      await send(`Voice note captured (${seconds}s). I still need typed words until transcription is enabled.`, 'voice');
      return;
    }
    try {
      await recorder.prepareToRecordAsync();
      recorder.record();
      setRecordedUri(null);
    } catch {
      Alert.alert('Mic unavailable', 'Type the message instead; chat still works.');
    }
  }

  return <View style={styles.root}>
    <View style={styles.hero}>
      <Pressable accessibilityRole="button" onPress={toggleRecording} style={[styles.mic, recorderState.isRecording && styles.micActive]}>
        <Text style={styles.micIcon}>{recorderState.isRecording ? '■' : '◉'}</Text>
      </Pressable>
      <Text style={styles.heroTitle}>{recorderState.isRecording ? 'Listening… tap to stop' : 'Talk to Hermes'}</Text>
      <Text style={styles.heroSub}>{recorderState.isRecording ? `${Math.round(recorderState.durationMillis / 1000)}s recorded` : 'One big mic, typed fallback, spoken replies.'}</Text>
    </View>

    <Row>
      <Button title={autoSpeak ? '✓ Speak replies' : 'Speak replies'} tone={autoSpeak ? 'good' : 'muted'} onPress={() => setAutoSpeak(v => !v)} />
      <Button title="Stop audio" tone="muted" onPress={() => Speech.stop()} />
    </Row>

    <Card>
      <Field label="Message" value={message} onChangeText={setMessage} placeholder="Ask Hermes, dump a thought, or say what to log…" multiline />
      <Button title={busy ? 'Sending…' : 'Send'} onPress={() => send(message)} />
      <View style={styles.suggestions}>
        {suggestions.map(suggestion => <Pressable key={suggestion} accessibilityRole="button" onPress={() => send(suggestion)} style={styles.chip}>
          <Text style={styles.chipText}>{suggestion}</Text>
        </Pressable>)}
      </View>
      {recordedUri ? <Text style={styles.uri}>Last voice note saved locally.</Text> : null}
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
  hero: { alignItems: 'center', justifyContent: 'center', paddingVertical: 30 },
  mic: { width: 128, height: 128, borderRadius: 64, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center', shadowColor: '#7c3aed', shadowOpacity: 0.35, shadowRadius: 20 },
  micActive: { backgroundColor: colors.danger },
  micIcon: { color: '#fff', fontSize: 54, fontWeight: '900' },
  heroTitle: { marginTop: 16, fontSize: 24, fontWeight: '900', color: colors.ink },
  heroSub: { marginTop: 6, color: colors.muted, textAlign: 'center' },
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
  uri: { marginTop: 8, color: colors.muted, fontSize: 12 },
});
