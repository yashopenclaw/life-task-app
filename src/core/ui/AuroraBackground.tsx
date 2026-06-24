import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

const AnimatedView = Animated.createAnimatedComponent(View);

type Props = { accent?: string; accent2?: string };

export function AuroraBackground({ accent = '#8a7cff', accent2 = '#c9ff4a' }: Props) {
  const driftA = useSharedValue(0);
  const driftB = useSharedValue(0);
  const driftC = useSharedValue(0);

  useEffect(() => {
    driftA.value = withRepeat(withTiming(1, { duration: 22000, easing: Easing.inOut(Easing.sin) }), -1, true);
    driftB.value = withRepeat(withTiming(1, { duration: 26000, easing: Easing.inOut(Easing.sin) }), -1, true);
    driftC.value = withRepeat(withTiming(1, { duration: 18000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [driftA, driftB, driftC]);

  const a = useAnimatedStyle(() => ({ transform: [{ translateX: -22 + driftA.value * 44 }, { translateY: -14 + driftA.value * 36 }, { scale: 1 + driftA.value * 0.12 }] }));
  const b = useAnimatedStyle(() => ({ transform: [{ translateX: 22 - driftB.value * 44 }, { translateY: 18 - driftB.value * 40 }, { scale: 1.12 - driftB.value * 0.12 }] }));
  const c = useAnimatedStyle(() => ({ transform: [{ translateX: -24 + driftC.value * 48 }, { translateY: 24 - driftC.value * 44 }, { scale: 1 + driftC.value * 0.1 }] }));

  return <View style={[StyleSheet.absoluteFill, styles.noPointer]}>
    <AnimatedView style={[styles.blob, styles.blobA, a]}><AuroraSvg id="a" color={accent} opacity={0.24} /></AnimatedView>
    <AnimatedView style={[styles.blob, styles.blobB, b]}><AuroraSvg id="b" color={accent2} opacity={0.16} /></AnimatedView>
    <AnimatedView style={[styles.blob, styles.blobC, c]}><AuroraSvg id="c" color={mix(accent, accent2)} opacity={0.32} /></AnimatedView>
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
  noPointer: { pointerEvents: 'none' },
  blob: { position: 'absolute', width: 360, height: 360 },
  blobA: { top: -110, left: -140 },
  blobB: { top: 150, right: -170 },
  blobC: { bottom: -130, left: 60 },
});
