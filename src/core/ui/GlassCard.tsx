import { ReactNode } from 'react';
import { Platform, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';

export function GlassCard({ children, style, contentStyle, onPress, onLongPress, disabled }: { children: ReactNode; style?: StyleProp<ViewStyle>; contentStyle?: StyleProp<ViewStyle>; onPress?: () => void; onLongPress?: () => void; disabled?: boolean }) {
  const Container = onPress || onLongPress ? Pressable : View;
  return <Container disabled={disabled} onPress={onPress} onLongPress={onLongPress} style={[styles.shell, style]}>
    {Platform.OS === 'android'
      ? <View style={[StyleSheet.absoluteFill, styles.androidFill]} />
      : Platform.OS === 'web'
        ? <View style={[StyleSheet.absoluteFill, styles.webBlur]} />
        : <BlurView tint="dark" intensity={48} style={StyleSheet.absoluteFill} />}
    <View style={styles.tint} />
    <View style={styles.highlight} />
    <View style={[styles.content, contentStyle]}>{children}</View>
  </Container>;
}

const styles = StyleSheet.create({
  shell: { overflow: 'hidden', borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.04)', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 28, shadowOffset: { width: 0, height: 10 }, elevation: 12 },
  androidFill: { backgroundColor: 'rgba(16,18,24,0.92)' },
  webBlur: { backgroundColor: 'rgba(20,22,30,0.55)' },
  tint: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(255,255,255,0.02)' },
  highlight: { position: 'absolute', left: 1, right: 1, top: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
  content: { flex: 1 },
});
