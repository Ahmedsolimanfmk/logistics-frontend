export type ApiListResponse<T> = {
  items: T[];
  total: number;
  page?: number;
  pages?: number;
};

export type ApiActionResponse = {
  success?: boolean;
  message?: string;
};