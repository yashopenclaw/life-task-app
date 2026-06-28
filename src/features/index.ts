import workouts from './workouts';
import calories from './calories';
import tasks from './tasks';

export type FeatureEntry = { key: string; title: string; icon: string; component: React.ComponentType };
export const features = [workouts, calories, tasks];
