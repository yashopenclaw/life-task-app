export type CalorieEntry = { id: string; date: string; item: string; calories: number; source: 'manual' | 'voice'; created_at: string };
export type CalorieInput = { date: string; item: string; calories: number; source: 'manual' | 'voice' };
