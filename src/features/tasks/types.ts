export type Bucket = 'buffer' | 'timewise' | 'recurring';
export type Task = { id: string; title: string; bucket: Bucket; scheduled_at: string | null; recurring_rule: string | null; done: boolean; priority: number; created_at: string; updated_at: string; google_task_id?: string | null; google_task_list_id?: string | null; google_sync_status?: string | null; google_synced_at?: string | null; google_error?: string | null };
export type TaskInput = { title: string; bucket: Bucket; scheduled_at?: string | null; recurring_rule?: string | null; done?: boolean; priority?: number };
export type TaskNaturalResponse = { task: Task; parsed: TaskInput; system_prompt: string };
