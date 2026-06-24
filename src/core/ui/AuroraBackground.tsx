import { useEffect } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

const AnimatedView = Animated.createAnimatedComponent(View);

type Props = { accent?: string; accent2?: string; screen?: string };

// Per-screen dark base + glow colors
const screenConfig: Record<string, { base: string; glow: string; glowY: number }> = {
  assistant: { base: '#14122B', glow: '#4B3Fae', glowY: 0.28 },
  calories: { base: '#1C1407', glow: '#8a5a1e', glowY: 0.22 },
  tasks: { base: '#0E1626', glow: '#29508f', glowY: 0.18 },
};

export function AuroraBackground({ accent, accent2, screen = 'assistant' }: Props) {
  const config = screenConfig[screen] || screenConfig.assistant;
  const drift = useSharedValue(0);
  const driftB = useSharedValue(0);

  useEffect(() => {
    drift.value = withRepeat(withTiming(1, { duration: 20000, easing: Easing.inOut(Easing.sin) }), -1, true);
    driftB.value = withRepeat(withTiming(1, { duration: 26000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [drift, driftB]);

  const glowStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: -30 + drift.value * 60 },
      { translateY: -20 + drift.value * 40 },
      { scale: 1 + drift.value * 0.12 },
    ],
  }));
  const glowBStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: 20 - driftB.value * 40 },
      { translateY: 15 - driftB.value * 30 },
      { scale: 1.1 - driftB.value * 0.08 },
    ],
  }));

  return <View style={[StyleSheet.absoluteFill, styles.noPointer]}>
    {/* Dark base — fills the screen */}
    <View style={[StyleSheet.absoluteFill, { backgroundColor: config.base }]} />

    {/* Main accent glow — one big soft bloom near hero area */}
    <AnimatedView style={[styles.glow, { backgroundColor: config.glow, top: `${config.glowY * 100}%` }, glowStyle]} />
    <AnimatedView style={[styles.glowB, { backgroundColor: config.glow, top: `${config.glowY * 100}%` }, glowBStyle]} />

    {/* Edge vignette — radial gradient that darkens edges to near-black */}
    <View style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="vignette" cx="50%" cy="40%" r="70%">
            <Stop offset="0%" stopColor="#000" stopOpacity="0" />
            <Stop offset="55%" stopColor="#000" stopOpacity="0.15" />
            <Stop offset="100%" stopColor="#000" stopOpacity="0.65" />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#vignette)" />
      </Svg>
    </View>
  </View>;
}

const GLOW_SIZE = 600;
const GLOW_B_SIZE = 400;
const styles = StyleSheet.create({
  noPointer: { pointerEvents: 'none' },
  glow: {
    position: 'absolute',
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: GLOW_SIZE / 2,
    alignSelf: 'center',
    marginLeft: -GLOW_SIZE / 2,
    opacity: 0.5,
  },
  glowB: {
    position: 'absolute',
    width: GLOW_B_SIZE,
    height: GLOW_B_SIZE,
    borderRadius: GLOW_B_SIZE / 2,
    alignSelf: 'center',
    marginLeft: -GLOW_B_SIZE / 2,
    opacity: 0.25,
  },
});
