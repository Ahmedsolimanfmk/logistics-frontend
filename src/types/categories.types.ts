export interface PartCategory {
  id: string;
  name: string;
  code?: string | null;
  is_active: boolean;

  parts_count?: number;

  created_at?: string;
  updated_at?: string;
}