import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import { MicGlyph } from './MicGlyph';

type Phase = 'idle' | 'recording' | 'transcribing';

export function VoiceOrb({ onTranscript, accent = '#8a7cff', size = 44 }: { onTranscript: (text: string) => void; accent?: string; size?: number }) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [phase, setPhase] = useState<Phase>('idle');
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [permsGranted, setPermsGranted] = useState(false);

  useEffect(() => {
    (async () => {
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (status.granted) {
        setPermsGranted(true);
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      }
    })();
  }, []);

  async function handlePress() {
    if (phase === 'recording') {
      const uri = await recorder.stop();
      setPhase('transcribing');
      setRecordingUri(uri);
      return;
    }
    if (phase === 'idle') {
      if (!permsGranted) {
        const status = await AudioModule.requestRecordingPermissionsAsync();
        if (!status.granted) { Alert.alert('Mic denied', 'Allow microphone access in settings.'); return; }
        setPermsGranted(true);
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      }
      try {
        await recorder.prepareToRecordAsync();
        recorder.record();
        setPhase('recording');
      } catch {
        Alert.alert('Mic error', 'Could not start recording.');
      }
    }
  }

  // When URI is set, transcribe
  useEffect(() => {
    if (recordingUri && phase === 'transcribing') {
      import('../../features/assistant/api').then(({ assistantApi }) => {
        assistantApi.transcribe(recordingUri).then(text => {
          setPhase('idle');
          setRecordingUri(null);
          if (text.trim()) onTranscript(text.trim());
        }).catch(() => {
          setPhase('idle');
          setRecordingUri(null);
          Alert.alert('Transcribe failed', 'Could not transcribe audio.');
        });
      });
    }
  }, [recordingUri, phase]);

  const breathe = useSharedValue(0);
  useEffect(() => {
    if (phase === 'recording') {
      breathe.value = withRepeat(withTiming(1, { duration: 800, easing: Easing.inOut(Easing.sin) }), -1, true);
    } else {
      breathe.value = 0;
    }
  }, [phase]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + breathe.value * 0.12 }],
    opacity: phase === 'recording' ? 0.9 : 1,
  }));

  const isRecording = phase === 'recording';
  const isBusy = phase === 'transcribing';

  return <Pressable accessibilityRole="button" onPress={handlePress} disabled={isBusy} style={[styles.button, { width: size, height: size, borderRadius: size / 2, backgroundColor: accent }]}>
    <Animated.View style={[StyleSheet.absoluteFill, styles.glow, isRecording && { backgroundColor: accent, opacity: 0.3 }, pulseStyle]} pointerEvents="none" />
    {isRecording ? <Eq /> : isBusy ? <Dots /> : <MicGlyph size={size * 0.5} color="#fff" />}
  </Pressable>;
}

function Eq() {
  return <View style={styles.eq}>{[0, 1, 2].map(i => <Bar key={i} index={i} />)}</View>;
}

function Bar({ index }: { index: number }) {
  const v = useSharedValue(0.2);
  useEffect(() => {
    v.value = withDelay(index * 80, withRepeat(withTiming(1, { duration: 280 + (index % 2) * 120, easing: Easing.inOut(Easing.quad) }), -1, true));
  }, [v, index]);
  const style = useAnimatedStyle(() => ({ height: 5 + v.value * 14 }));
  return <Animated.View style={[styles.bar, style]} />;
}

function Dots() {
  return <View style={styles.dots}><View style={styles.dot} /><View style={styles.dot} /><View style={styles.dot} /></View>;
}

const styles = StyleSheet.create({
  button: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' as const, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, elevation: 5 },
  glow: { borderRadius: 999 },
  eq: { flexDirection: 'row', alignItems: 'center', height: 20, gap: 3 },
  bar: { width: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.9)' },
  dots: { flexDirection: 'row', gap: 3 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.7)' },
});
