import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

export type TabIconName = ComponentProps<typeof Ionicons>['name'];

type Props = { name: TabIconName; active?: boolean; size?: number; color?: string };

export function TabIcon({ name, active = false, size = 23, color }: Props) {
  return <Ionicons name={name} size={size} color={color || (active ? '#050608' : '#747985')} />;
}
