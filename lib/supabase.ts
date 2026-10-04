import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type MatrixType = 'do_first' | 'schedule' | 'delegate' | 'dont_do';
export type StickyColor = 'yellow' | 'pink' | 'blue' | 'green';

export interface Task {
  id: string;
  user_id: string;
  title: string;
  subject?: string;
  description?: string;
  is_completed: boolean;
  matrix_type: MatrixType;
  color: StickyColor;
  start_date?: string;
  due_date?: string;
  created_at: string;
}