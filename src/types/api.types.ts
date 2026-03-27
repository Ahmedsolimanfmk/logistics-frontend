export type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data: T;
};

export type ApiListResponse<T> = {
  items: T[];
  total: number;
  page?: number;
  pageSize?: number;
  pages?: number;
};

export type ApiActionResponse = {
  success?: boolean;
  message?: string;
};