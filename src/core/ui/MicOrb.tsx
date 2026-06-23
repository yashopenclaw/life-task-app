import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import { MicGlyph } from './MicGlyph';

// The hero mic: it breathes continuously on the UI thread (scale 1↔1.055 + a pulsing
// glow halo, ~4.6s cycle) and, while recording, surfaces a "listening" state with
// expanding ripple rings, a 6-bar equalizer and an intensified glow.
export function MicOrb({ recording, onPress }: { recording: boolean; onPress: () => void }) {
  const breathe = useSharedValue(0);
  useEffect(() => {
    breathe.value = withRepeat(withTiming(1, { duration: 2300, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [breathe]);

  const orbStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + breathe.value * 0.055 }] }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity: (recording ? 0.24 : 0.1) + breathe.value * 0.12,
    transform: [{ scale: 1 + breathe.value * (recording ? 0.14 : 0.06) }],
  }));

  return <View style={styles.wrap}>
    <Animated.View style={[styles.halo, recording && styles.haloActive, haloStyle]} />
    {recording ? <><Ripple delay={0} /><Ripple delay={950} /></> : null}
    <Pressable accessibilityRole="button" onPress={onPress}>
      <Animated.View style={[styles.orb, recording && styles.orbActive, orbStyle]}>
        {recording ? <Equalizer /> : <MicGlyph size={54} />}
      </Animated.View>
    </Pressable>
  </View>;
}

function Ripple({ delay }: { delay: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withRepeat(withTiming(1, { duration: 1900, easing: Easing.out(Easing.quad) }), -1, false));
  }, [p, delay]);
  const style = useAnimatedStyle(() => ({ opacity: 0.45 * (1 - p.value), transform: [{ scale: 0.72 + p.value * 1.05 }] }));
  return <Animated.View style={[styles.ripple, style]} />;
}

function Equalizer() {
  return <View style={styles.eq}>{[0, 1, 2, 3, 4, 5].map(i => <Bar key={i} index={i} />)}</View>;
}

function Bar({ index }: { index: number }) {
  const v = useSharedValue(0.2);
  useEffect(() => {
    const duration = 280 + (index % 3) * 130;
    v.value = withDelay(index * 90, withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.quad) }), -1, true));
  }, [v, index]);
  const style = useAnimatedStyle(() => ({ height: 8 + v.value * 26 }));
  return <Animated.View style={[styles.bar, style]} />;
}

const styles = StyleSheet.create({
  wrap: { width: 176, height: 176, alignItems: 'center', justifyContent: 'center' },
  halo: { pointerEvents: 'none', position: 'absolute', width: 176, height: 176, borderRadius: 88, backgroundColor: 'rgba(138,124,255,0.12)', borderWidth: 1, borderColor: 'rgba(138,124,255,0.10)' },
  haloActive: { backgroundColor: 'rgba(201,255,74,0.16)', borderColor: 'rgba(201,255,74,0.16)' },
  ripple: { pointerEvents: 'none', position: 'absolute', width: 132, height: 132, borderRadius: 66, borderWidth: 2, borderColor: 'rgba(201,255,74,0.55)' },
  orb: { width: 132, height: 132, borderRadius: 66, backgroundColor: '#8a7cff', alignItems: 'center', justifyContent: 'center', shadowColor: '#8a7cff', shadowOpacity: 0.34, shadowRadius: 22, elevation: 12 },
  orbActive: { backgroundColor: '#c9ff4a', shadowColor: '#c9ff4a', shadowOpacity: 0.5, shadowRadius: 28 },
  eq: { flexDirection: 'row', alignItems: 'center', height: 36, gap: 5 },
  bar: { width: 5, borderRadius: 3, backgroundColor: 'rgba(5,6,8,0.85)' },
});
