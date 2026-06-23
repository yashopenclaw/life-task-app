import { View, StyleSheet } from 'react-native';
import { colors } from '../theme';

export type TabIconName = 'mic' | 'tasks' | 'calories' | 'notes' | 'summary' | 'square';

type Props = { name: TabIconName; active?: boolean; size?: number };

export function TabIcon({ name, active = false, size = 23 }: Props) {
  const color = active ? '#ffffff' : '#747985';
  if (name === 'mic') return <MicIcon color={color} size={size} />;
  if (name === 'tasks') return <TasksIcon color={color} size={size} />;
  if (name === 'calories') return <FlameIcon color={color} size={size} />;
  if (name === 'notes') return <PenIcon color={color} size={size} />;
  if (name === 'summary') return <DocIcon color={color} size={size} />;
  return <SquareIcon color={color} size={size} />;
}

function MicIcon({ color, size }: { color: string; size: number }) {
  const s = size;
  return <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
    <View style={[styles.micHead, { borderColor: color, width: s * 0.38, height: s * 0.58, borderRadius: s * 0.2 }]} />
    <View style={[styles.micArc, { borderColor: color, width: s * 0.72, height: s * 0.48, borderBottomLeftRadius: s * 0.35, borderBottomRightRadius: s * 0.35, top: s * 0.34 }]} />
    <View style={[styles.micStem, { backgroundColor: color, height: s * 0.22, top: s * 0.68 }]} />
    <View style={[styles.micBase, { backgroundColor: color, width: s * 0.46, top: s * 0.88 }]} />
  </View>;
}

function TasksIcon({ color, size }: { color: string; size: number }) {
  const s = size;
  return <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
    <View style={[styles.box, { borderColor: color, width: s * 0.74, height: s * 0.74, borderRadius: s * 0.12 }]} />
    <View style={[styles.checkA, { backgroundColor: color, width: s * 0.26, transform: [{ rotate: '45deg' }] }]} />
    <View style={[styles.checkB, { backgroundColor: color, width: s * 0.46, transform: [{ rotate: '-45deg' }] }]} />
  </View>;
}

function FlameIcon({ color, size }: { color: string; size: number }) {
  const s = size;
  return <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
    <View style={[styles.flameOuter, { borderColor: color, width: s * 0.5, height: s * 0.72, borderRadius: s * 0.3, transform: [{ rotate: '18deg' }] }]} />
    <View style={[styles.flameInner, { borderColor: color, width: s * 0.24, height: s * 0.34, borderRadius: s * 0.16 }]} />
  </View>;
}

function PenIcon({ color, size }: { color: string; size: number }) {
  const s = size;
  return <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
    <View style={[styles.pen, { backgroundColor: color, width: s * 0.72, transform: [{ rotate: '-38deg' }] }]} />
    <View style={[styles.penTip, { borderTopColor: color, transform: [{ rotate: '-38deg' }] }]} />
  </View>;
}

function DocIcon({ color, size }: { color: string; size: number }) {
  const s = size;
  return <View style={{ width: s, height: s, justifyContent: 'center', alignItems: 'center' }}>
    <View style={[styles.doc, { borderColor: color, width: s * 0.58, height: s * 0.72 }]} />
    <View style={[styles.docLine, { backgroundColor: color, width: s * 0.33, top: s * 0.34 }]} />
    <View style={[styles.docLine, { backgroundColor: color, width: s * 0.28, top: s * 0.49 }]} />
  </View>;
}

function SquareIcon({ color, size }: { color: string; size: number }) {
  return <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}><View style={[styles.box, { borderColor: color, width: size * 0.64, height: size * 0.64 }]} /></View>;
}

const styles = StyleSheet.create({
  micHead: { position: 'absolute', borderWidth: 2 },
  micArc: { position: 'absolute', borderLeftWidth: 2, borderRightWidth: 2, borderBottomWidth: 2, borderTopWidth: 0 },
  micStem: { position: 'absolute', width: 2, borderRadius: 2 },
  micBase: { position: 'absolute', height: 2, borderRadius: 2 },
  box: { borderWidth: 2, borderRadius: 4 },
  checkA: { position: 'absolute', height: 2, left: 6, top: 13, borderRadius: 2 },
  checkB: { position: 'absolute', height: 2, left: 10, top: 12, borderRadius: 2 },
  flameOuter: { borderWidth: 2, borderTopLeftRadius: 12, borderBottomRightRadius: 12 },
  flameInner: { position: 'absolute', bottom: 4, borderWidth: 2, borderTopWidth: 0 },
  pen: { height: 3, borderRadius: 3 },
  penTip: { position: 'absolute', right: 3, top: 12, width: 0, height: 0, borderLeftWidth: 4, borderRightWidth: 4, borderTopWidth: 6, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  doc: { borderWidth: 2, borderRadius: 3 },
  docLine: { position: 'absolute', height: 2, borderRadius: 2 },
});
