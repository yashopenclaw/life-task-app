import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Field, Row } from './atoms';
import { colors } from '../theme';

export function NaturalCapture({ title, prompt, placeholder, busy, onSubmit }: { title: string; prompt: string; placeholder: string; busy?: boolean; onSubmit: (message: string, source: 'typed' | 'voice') => Promise<void> | void }) {
  const [message, setMessage] = useState('');
  const [voiceMode, setVoiceMode] = useState(false);
  async function submit() {
    const clean = message.trim();
    if (!clean || busy) return;
    await onSubmit(clean, voiceMode ? 'voice' : 'typed');
    setMessage('');
    setVoiceMode(false);
  }
  return <Card>
    <View style={styles.top}>
      <Pressable accessibilityRole="button" onPress={() => setVoiceMode(v => !v)} style={[styles.mic, voiceMode && styles.micOn]}>
        <Text style={styles.micText}>🎙️</Text>
      </Pressable>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.prompt}>{voiceMode ? 'Voice mode: type the transcript after recording.' : prompt}</Text>
      </View>
    </View>
    <Field label={voiceMode ? 'Voice transcript' : 'Message'} value={message} onChangeText={setMessage} placeholder={placeholder} multiline />
    <Row><Button title={busy ? 'Thinking…' : 'Convert + save'} tone="good" onPress={submit} /></Row>
  </Card>;
}
const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  mic: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  micOn: { backgroundColor: colors.danger },
  micText: { fontSize: 28 },
  copy: { flex: 1 },
  title: { fontSize: 19, fontWeight: '900', color: colors.ink },
  prompt: { color: colors.muted, fontWeight: '700', marginTop: 3 },
});
