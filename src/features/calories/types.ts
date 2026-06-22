export type NutritionEstimate = { item: string; serving: string; calories: number; protein_g: number; carbs_g: number; fat_g: number; confidence: 'low' | 'medium' | 'high'; notes: string };
export type CalorieEntry = { id: string; date: string; item: string; calories: number; source: 'manual' | 'voice' | 'ai'; nutrition?: NutritionEstimate | null; created_at: string };
export type CalorieInput = { date: string; item: string; calories: number; source: 'manual' | 'voice' | 'ai'; nutrition?: NutritionEstimate | null };
