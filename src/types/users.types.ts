export type UserRow = {
  id: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  role: string;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type UsersListFilters = {
  q?: string;
  role?: string;
  is_active?: "" | "true" | "false";
  take?: number;
  skip?: number;
};

export type CreateUserPayload = {
  full_name: string;
  email?: string | null;
  phone?: string | null;
  role: string;
  password: string;
};

export type SetUserStatusPayload = {
  is_active: boolean;
};

export type ResetUserPasswordPayload = {
  password: string;
};