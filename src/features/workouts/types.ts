export type WorkoutSource = 'manual' | 'voice' | 'ai';
export type WorkoutCategory = 'strength' | 'cardio' | 'mobility' | 'conditioning' | 'sport' | 'other';
export type WorkoutIntensity = 'easy' | 'moderate' | 'hard';
export type WorkoutConfidence = 'low' | 'medium' | 'high';

export type ExerciseEstimate = {
  name: string;
  category: WorkoutCategory;
  muscle_group: string;
  sets?: number | null;
  reps?: number | null;
  weight_kg?: number | null;
  duration_min?: number | null;
  distance_km?: number | null;
  intensity: WorkoutIntensity;
  confidence: WorkoutConfidence;
  notes: string;
};

export type WorkoutEntry = {
  id: string;
  date: string;
  raw_text: string;
  exercise_name: string;
  category: WorkoutCategory;
  muscle_group: string;
  sets?: number | null;
  reps?: number | null;
  weight_kg?: number | null;
  duration_min?: number | null;
  distance_km?: number | null;
  source: WorkoutSource;
  details?: ExerciseEstimate | null;
  created_at: string;
};

export type WorkoutInput = Omit<WorkoutEntry, 'id' | 'created_at'>;
export type WorkoutNaturalResponse = { entry: WorkoutEntry; parsed: WorkoutInput; estimate: ExerciseEstimate; system_prompt: string };
