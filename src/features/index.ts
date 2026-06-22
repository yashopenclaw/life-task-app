import tasks from './tasks';
import calories from './calories';
import summaries from './summaries';
import notes from './notes';
import brief from './brief';
import books from './books';

export type FeatureEntry = { key: string; title: string; icon: string; component: React.ComponentType };
export const features = [tasks, calories, summaries, notes, brief, books];
