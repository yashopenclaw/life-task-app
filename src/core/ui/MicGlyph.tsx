import { StyleSheet, View } from 'react-native';

export function MicGlyph({ size = 54, color = '#f7f8f8' }: { size?: number; color?: string }) {
  const scale = size / 54;
  return <View style={[styles.root, { width: size, height: size }]}>
    <View style={[styles.capsule, { width: 18 * scale, height: 31 * scale, borderRadius: 10 * scale, borderColor: color, borderWidth: Math.max(2, 2.4 * scale) }]} />
    <View style={[styles.arc, { width: 32 * scale, height: 25 * scale, borderRadius: 18 * scale, borderColor: color, borderWidth: Math.max(2, 2.4 * scale), top: 16 * scale }]} />
    <View style={[styles.mask, { width: 40 * scale, height: 13 * scale, top: 12 * scale }]} />
    <View style={[styles.stem, { width: Math.max(2, 2.5 * scale), height: 12 * scale, backgroundColor: color, top: 39 * scale }]} />
    <View style={[styles.base, { width: 22 * scale, height: Math.max(2, 2.5 * scale), backgroundColor: color, top: 50 * scale }]} />
  </View>;
}
const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'flex-start' },
  capsule: { position: 'absolute', top: 3, backgroundColor: 'transparent' },
  arc: { position: 'absolute', borderTopWidth: 0, backgroundColor: 'transparent' },
  mask: { position: 'absolute', backgroundColor: 'transparent' },
  stem: { position: 'absolute', borderRadius: 999 },
  base: { position: 'absolute', borderRadius: 999 },
});
