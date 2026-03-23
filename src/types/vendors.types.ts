export type VendorType =
  | "MAINTENANCE_CENTER"
  | "PARTS_SUPPLIER"
  | "SERVICE_PROVIDER"
  | string;

export type VendorClassification =
  | "INTERNAL"
  | "EXTERNAL"
  | string;

export type VendorStatus =
  | "ACTIVE"
  | "INACTIVE"
  | "SUSPENDED"
  | string;

export type Vendor = {
  id: string;
  name: string;
  code?: string | null;
  vendor_type?: VendorType | null;
  classification?: VendorClassification | null;
  status?: VendorStatus | null;

  specialization?: string | null;

  contact_person?: string | null;
  phone?: string | null;
  phone2?: string | null;
  email?: string | null;

  address?: string | null;
  city?: string | null;

  tax_no?: string | null;
  commercial_register?: string | null;
  payment_terms?: string | null;

  opening_balance?: number | null;
  credit_limit?: number | null;

  is_active?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

export type VendorListFilters = {
  q?: string;
  vendor_type?: string;
  classification?: string;
  status?: string;
  page?: number;
  pageSize?: number;
};

export type VendorPayload = {
  name: string;
  code?: string | null;
  vendor_type?: string | null;
  classification?: string | null;
  status?: string | null;

  specialization?: string | null;

  contact_person?: string | null;
  phone?: string | null;
  phone2?: string | null;
  email?: string | null;

  address?: string | null;
  city?: string | null;

  tax_no?: string | null;
  commercial_register?: string | null;
  payment_terms?: string | null;

  opening_balance?: number | null;
  credit_limit?: number | null;
};

export type VendorOption = {
  id: string;
  name: string;
  code?: string | null;
  classification?: string | null;
  vendor_type?: string | null;
};