import Svg, { Path, Rect, Line } from 'react-native-svg';

export type TabIconName = 'mic' | 'check' | 'flame' | 'feather' | 'notes' | 'newspaper' | 'book' | 'square';

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
    case 'feather':
      return <>
        <Path {...p} d="M20 4a6 6 0 0 0-8.5 0L4 11.5V20h8.5l7.5-7.5A6 6 0 0 0 20 4z" />
        <Line {...p} x1="16" y1="8" x2="2" y2="22" />
        <Line {...p} x1="17.5" y1="12.5" x2="9" y2="12.5" />
      </>;
    case 'notes':
      return <>
        <Path {...p} d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
        <Path {...p} d="M14 3v6h6" />
        <Line {...p} x1="8" y1="13" x2="16" y2="13" />
        <Line {...p} x1="8" y1="17" x2="13" y2="17" />
      </>;
    case 'newspaper':
      return <>
        <Path {...p} d="M4 5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5z" />
        <Rect {...p} x="7" y="8" width="6" height="5" />
        <Line {...p} x1="16" y1="8" x2="17" y2="8" />
        <Line {...p} x1="16" y1="12" x2="17" y2="12" />
        <Line {...p} x1="7" y1="16" x2="17" y2="16" />
      </>;
    case 'book':
      return <>
        <Path {...p} d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z" />
        <Path {...p} d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3" />
      </>;
    default:
      return <Rect {...p} x="4" y="4" width="16" height="16" rx="3" />;
  }
}
