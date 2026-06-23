import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Field, Row } from './atoms';
import { MicGlyph } from './MicGlyph';
import { colors } from '../theme';
export function NaturalCapture({ title, prompt, placeholder, busy, onSubmit }: { title: string; prompt: string; placeholder: string; busy?: boolean; onSubmit: (message: string, source: 'typed' | 'voice') => Promise<void> | void }) {
  const [message, setMessage] = useState('');
  const [voiceMode, setVoiceMode] = useState(false);
  async function submit() { const clean = message.trim(); if (!clean || busy) return; await onSubmit(clean, voiceMode ? 'voice' : 'typed'); setMessage(''); setVoiceMode(false); }
  return <Card>
    <View style={styles.top}>
      <Pressable accessibilityRole="button" onPress={() => setVoiceMode(v => !v)} style={[styles.mic, voiceMode && styles.micOn]}><MicGlyph size={28} /></Pressable>
      <View style={styles.copy}><Text style={styles.title}>{title}</Text><Text style={styles.prompt}>{voiceMode ? 'Voice transcript mode.' : prompt}</Text></View>
    </View>
    <Field label={voiceMode ? 'Voice transcript' : 'Message'} value={message} onChangeText={setMessage} placeholder={placeholder} multiline />
    <Row><Button title={busy ? 'Thinking…' : 'Convert + save'} tone="good" onPress={submit} /></Row>
  </Card>;
}
const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  mic: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#111214', alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 1, borderColor: colors.line },
  micOn: { backgroundColor: colors.primary },
  copy: { flex: 1 },
  title: { fontSize: 18, fontWeight: '800', color: colors.ink, letterSpacing: -0.2 },
  prompt: { color: colors.muted, fontWeight: '600', marginTop: 3 },
});
