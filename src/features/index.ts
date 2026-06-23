import assistant from './assistant';
import calories from './calories';
import tasks from './tasks';

export type FeatureEntry = { key: string; title: string; icon: string; component: React.ComponentType };
export const features = [assistant, calories, tasks];
