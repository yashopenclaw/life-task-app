import { Feather } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

export type TabIconName = ComponentProps<typeof Feather>['name'];

type Props = { name: TabIconName; active?: boolean; size?: number; color?: string };

export function TabIcon({ name, active = false, size = 23, color }: Props) {
  return <Feather name={name} size={size} color={color || (active ? '#050608' : '#747985')} />;
}
