import { ReactNode } from 'react';
import { Platform, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';

export function GlassCard({ children, style, contentStyle, onPress, onLongPress, disabled }: { children: ReactNode; style?: StyleProp<ViewStyle>; contentStyle?: StyleProp<ViewStyle>; onPress?: () => void; onLongPress?: () => void; disabled?: boolean }) {
  const Container = onPress || onLongPress ? Pressable : View;
  return <Container disabled={disabled} onPress={onPress} onLongPress={onLongPress} style={[styles.shell, style]}>
    {Platform.OS === 'android'
      ? <View style={StyleSheet.absoluteFill} />
      : <BlurView tint="dark" intensity={32} style={StyleSheet.absoluteFill} />}
    <View style={styles.overlay} />
    <View style={styles.highlight} />
    <View style={[styles.content, contentStyle]}>{children}</View>
  </Container>;
}

const styles = StyleSheet.create({
  shell: { overflow: 'hidden', borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.018)' },
  overlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(255,255,255,0.034)' },
  highlight: { position: 'absolute', left: 1, right: 1, top: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.05)' },
  content: { flex: 1 },
});
