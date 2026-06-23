import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

type Props = { accent?: string; accent2?: string };

export function AuroraBackground({ accent = '#8a7cff', accent2 = '#c9ff4a' }: Props) {
  return <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    <View style={[styles.blob, styles.blobA]}><AuroraSvg id="a" color={accent} opacity={0.24} /></View>
    <View style={[styles.blob, styles.blobB]}><AuroraSvg id="b" color={accent2} opacity={0.16} /></View>
    <View style={[styles.blob, styles.blobC]}><AuroraSvg id="c" color={mix(accent, accent2)} opacity={0.32} /></View>
  </View>;
}

function AuroraSvg({ id, color, opacity }: { id: string; color: string; opacity: number }) {
  return <Svg width="100%" height="100%" viewBox="0 0 320 320">
    <Defs>
      <RadialGradient id={id} cx="50%" cy="50%" rx="50%" ry="50%">
        <Stop offset="0%" stopColor={color} stopOpacity={opacity} />
        <Stop offset="70%" stopColor={color} stopOpacity="0" />
      </RadialGradient>
    </Defs>
    <Circle cx="160" cy="160" r="158" fill={`url(#${id})`} />
  </Svg>;
}

function mix(a: string, b: string) {
  return a === b ? a : '#63a7ff';
}

const styles = StyleSheet.create({
  blob: { position: 'absolute', width: 360, height: 360 },
  blobA: { top: -110, left: -140, transform: [{ translateX: 6 }, { translateY: 8 }, { scale: 1.05 }] },
  blobB: { top: 150, right: -170, transform: [{ translateX: -8 }, { translateY: 10 }, { scale: 1.08 }] },
  blobC: { bottom: -130, left: 60, transform: [{ translateX: 4 }, { translateY: -6 }, { scale: 1.02 }] },
});
