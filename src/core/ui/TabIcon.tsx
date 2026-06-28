import Svg, { Path, Rect, Line } from 'react-native-svg';

export type TabIconName = 'mic' | 'check' | 'flame' | 'dumbbell' | 'square';

type Props = { name: TabIconName; active?: boolean; size?: number; color?: string };

// Custom line-icon set (Feather/Lucide geometry) drawn with react-native-svg so the
// tab rail stays crisp at any size and tints to the active accent.
export function TabIcon({ name, active = false, size = 22, color }: Props) {
  const stroke = color || (active ? '#050608' : '#747985');
  const common = { stroke, strokeWidth: 2, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return <Svg width={size} height={size} viewBox="0 0 24 24">{paths(name, common)}</Svg>;
}

function paths(name: TabIconName, p: { stroke: string; strokeWidth: number; fill: string; strokeLinecap: 'round'; strokeLinejoin: 'round' }) {
  switch (name) {
    case 'mic':
      return <>
        <Path {...p} d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
        <Path {...p} d="M19 10v1a7 7 0 0 1-14 0v-1" />
        <Line {...p} x1="12" y1="18" x2="12" y2="22" />
        <Line {...p} x1="8" y1="22" x2="16" y2="22" />
      </>;
    case 'check':
      return <>
        <Path {...p} d="M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h10" />
        <Path {...p} d="M8.5 11.5l3 3L22 4" />
      </>;
    case 'flame':
      return <Path {...p} d="M12 2c1.5 3 5 4.5 5 9a5 5 0 0 1-10 0c0-1.2.4-2.2 1-3 .2 1.2 1 2 2 2 1.5 0 1.5-1.5 1-3-.6-1.8-.5-3.5 1-5z" />;
    case 'dumbbell':
      return <>
        <Line {...p} x1="6" y1="12" x2="18" y2="12" />
        <Rect {...p} x="2" y="9" width="3" height="6" rx="1" />
        <Rect {...p} x="5" y="8" width="3" height="8" rx="1" />
        <Rect {...p} x="16" y="8" width="3" height="8" rx="1" />
        <Rect {...p} x="19" y="9" width="3" height="6" rx="1" />
      </>;
    default:
      return <Rect {...p} x="4" y="4" width="16" height="16" rx="3" />;
  }
}
