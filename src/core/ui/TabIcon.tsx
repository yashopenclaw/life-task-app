import Svg, { Circle, Path, Rect, Line } from 'react-native-svg';

export type TabIconName = 'assistant' | 'tasks' | 'calories' | 'notes' | 'summaries' | 'brief' | 'books';

type Props = { name: TabIconName; active?: boolean; size?: number; color?: string };

function strokeProps(color: string) {
  return { stroke: color, strokeWidth: 1.85, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
}

export function TabIcon({ name, active = false, size = 23, color }: Props) {
  const c = color || (active ? '#050608' : '#8f96a5');
  const s = strokeProps(c);
  return <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityRole="image">
    {name === 'assistant' ? <>
      <Rect x="9" y="4" width="6" height="10" rx="3" {...s} />
      <Path d="M5.8 11.2c0 3.4 2.4 5.8 6.2 5.8s6.2-2.4 6.2-5.8" {...s} />
      <Line x1="12" y1="17" x2="12" y2="20.3" {...s} />
      <Line x1="8.8" y1="20.3" x2="15.2" y2="20.3" {...s} />
    </> : null}
    {name === 'tasks' ? <>
      <Rect x="4" y="4.2" width="16" height="15.6" rx="4" {...s} />
      <Path d="M8 12.2l2.3 2.3 5.5-6" {...s} />
    </> : null}
    {name === 'calories' ? <>
      <Path d="M13.2 3.8c.7 3.5 4 4.7 4.4 8.2.5 4.1-2.4 7.2-5.6 7.2s-5.9-2.5-5.6-6.3c.2-2.8 2.5-4.4 3.2-6.9.9 2 2 2.8 3.6 3.4-.4-1.7-.2-3.6 0-5.6Z" {...s} />
      <Path d="M10 16.8c0-1.6 1.3-2.4 2-3.7.8 1.2 2 2.1 2 3.7a2 2 0 0 1-4 0Z" {...s} />
    </> : null}
    {name === 'notes' ? <>
      <Path d="M5.2 19.2l3.7-.8L18 9.3a2.2 2.2 0 0 0-3.1-3.1l-9.1 9.1-.6 3.9Z" {...s} />
      <Line x1="13.8" y1="7.3" x2="16.9" y2="10.4" {...s} />
    </> : null}
    {name === 'summaries' ? <>
      <Rect x="5" y="4" width="14" height="16" rx="3" {...s} />
      <Line x1="8.3" y1="9" x2="15.8" y2="9" {...s} />
      <Line x1="8.3" y1="12.4" x2="15.8" y2="12.4" {...s} />
      <Line x1="8.3" y1="15.8" x2="13" y2="15.8" {...s} />
    </> : null}
    {name === 'brief' ? <>
      <Circle cx="12" cy="12" r="7.5" {...s} />
      <Path d="M12 7.8v4.5l3.2 2" {...s} />
      <Path d="M6.8 6.8l-1.5-1.5M18.7 5.3l-1.5 1.5" {...s} />
    </> : null}
    {name === 'books' ? <>
      <Path d="M5 5.4c2.8-.9 4.9-.3 7 1.3v13c-2.1-1.6-4.2-2.2-7-1.3v-13Z" {...s} />
      <Path d="M19 5.4c-2.8-.9-4.9-.3-7 1.3v13c2.1-1.6 4.2-2.2 7-1.3v-13Z" {...s} />
      <Line x1="12" y1="6.8" x2="12" y2="19.5" {...s} />
    </> : null}
  </Svg>;
}
