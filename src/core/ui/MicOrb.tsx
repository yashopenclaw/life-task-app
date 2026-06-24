import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Stop } from 'react-native-svg';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from 'react-native-reanimated';
import { MicGlyph } from './MicGlyph';

export function MicOrb({ recording, onPress }: { recording: boolean; onPress: () => void }) {
  const breathe = useSharedValue(0);
  useEffect(() => {
    breathe.value = withRepeat(withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [breathe]);

  const orbStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + breathe.value * 0.04 }] }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity: (recording ? 0.28 : 0.14) + breathe.value * 0.10,
    transform: [{ scale: 1 + breathe.value * (recording ? 0.12 : 0.05) }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: (recording ? 0.55 : 0.35) + breathe.value * 0.12,
    transform: [{ scale: 1 + breathe.value * 0.08 }],
  }));

  return <View style={styles.wrap}>
    <Animated.View style={[styles.glow, recording && styles.glowActive, glowStyle]} />
    <Animated.View style={[styles.halo, recording && styles.haloActive, haloStyle]} />
    {recording ? <><Ripple delay={0} /><Ripple delay={1000} /></> : null}
    <Pressable accessibilityRole="button" onPress={onPress}>
      <Animated.View style={[styles.orb, recording && styles.orbActive, orbStyle]}>
        <View style={styles.orbGradient}>
          <Svg width="132" height="132" style={StyleSheet.absoluteFill}>
            <Defs>
              <RadialGradient id="orbFill" cx="38%" cy="32%" r="65%">
                <Stop offset="0%" stopColor={recording ? '#e0ff7a' : '#a89aff'} stopOpacity="1" />
                <Stop offset="55%" stopColor={recording ? '#c9ff4a' : '#8a7cff'} stopOpacity="1" />
                <Stop offset="100%" stopColor={recording ? '#8ab800' : '#5a4dcc'} stopOpacity="1" />
              </RadialGradient>
            </Defs>
          </Svg>
        </View>
        <View style={styles.orbContent}>
          {recording ? <Equalizer /> : <MicGlyph size={52} />}
        </View>
      </Animated.View>
    </Pressable>
  </View>;
}

function Ripple({ delay }: { delay: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withRepeat(withTiming(1, { duration: 2000, easing: Easing.out(Easing.quad) }), -1, false));
  }, [p, delay]);
  const style = useAnimatedStyle(() => ({ opacity: 0.40 * (1 - p.value), transform: [{ scale: 0.65 + p.value * 1.15 }] }));
  return <Animated.View style={[styles.ripple, style]} />;
}

function Equalizer() {
  return <View style={styles.eq}>{[0, 1, 2, 3, 4, 5].map(i => <Bar key={i} index={i} />)}</View>;
}

function Bar({ index }: { index: number }) {
  const v = useSharedValue(0.2);
  useEffect(() => {
    const duration = 300 + (index % 3) * 140;
    v.value = withDelay(index * 80, withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.quad) }), -1, true));
  }, [v, index]);
  const style = useAnimatedStyle(() => ({ height: 7 + v.value * 24 }));
  return <Animated.View style={[styles.bar, style]} />;
}

const ORB_SIZE = 128;
const styles = StyleSheet.create({
  wrap: { width: 176, height: 176, alignItems: 'center', justifyContent: 'center' },
  glow: { pointerEvents: 'none', position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(138,124,255,0.12)', shadowColor: '#8a7cff', shadowOpacity: 0.4, shadowRadius: 40, elevation: 0 },
  glowActive: { backgroundColor: 'rgba(201,255,74,0.15)', shadowColor: '#c9ff4a' },
  halo: { pointerEvents: 'none', position: 'absolute', width: 176, height: 176, borderRadius: 88, backgroundColor: 'rgba(138,124,255,0.10)', borderWidth: 1, borderColor: 'rgba(138,124,255,0.08)' },
  haloActive: { backgroundColor: 'rgba(201,255,74,0.12)', borderColor: 'rgba(201,255,74,0.12)' },
  ripple: { pointerEvents: 'none', position: 'absolute', width: 128, height: 128, borderRadius: 64, borderWidth: 1.5, borderColor: 'rgba(201,255,74,0.5)' },
  orb: { width: ORB_SIZE, height: ORB_SIZE, borderRadius: ORB_SIZE / 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  orbActive: { shadowColor: '#c9ff4a', shadowOpacity: 0.5, shadowRadius: 30 },
  orbGradient: { ...StyleSheet.absoluteFill },
  orbContent: { alignItems: 'center', justifyContent: 'center' },
  eq: { flexDirection: 'row', alignItems: 'center', height: 32, gap: 4 },
  bar: { width: 4, borderRadius: 2, backgroundColor: 'rgba(5,8,12,0.9)' },
});
