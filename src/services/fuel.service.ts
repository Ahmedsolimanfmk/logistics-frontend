import { api } from '@/src/lib/api';

export interface FuelStation {
  id: string;
  name: string;
  code?: string;
  contact_number?: string;
  balance: number;
  is_active: boolean;
  created_at: string;
}

export interface FuelWalletRecharge {
  id: string;
  company_id: string;
  amount: number;
  payment_method?: string;
  reference?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  notes?: string;
  created_at: string;
  company?: { name: string };
}

export interface FuelTransaction {
  id: string;
  fuel_station_id: string;
  company_id: string;
  vehicle_id?: string;
  driver_id?: string;
  amount: number;
  system_commission: number;
  total_deducted: number;
  status: string;
  created_at: string;
  fuel_station?: { name: string };
  company?: { name: string };
  vehicle?: { plate_no: string };
}

export const fuelService = {
  // Super Admin: Stations
  createStation: async (data: Partial<FuelStation>) => {
    const res = await api.post('/fuel/admin/stations', data);
    return res.data;
  },
  listStations: async (): Promise<FuelStation[]> => {
    const res = await api.get('/fuel/admin/stations');
    return res.data?.items || [];
  },
  updateStation: async (id: string, data: Partial<FuelStation>) => {
    const res = await api.put(`/fuel/admin/stations/${id}`, data);
    return res.data;
  },

  // Super Admin: Recharges
  listAllRecharges: async (): Promise<FuelWalletRecharge[]> => {
    const res = await api.get('/fuel/admin/recharges');
    return res.data?.items || [];
  },
  approveRecharge: async (id: string) => {
    const res = await api.post(`/fuel/admin/recharges/${id}/approve`);
    return res.data;
  },
  rejectRecharge: async (id: string) => {
    const res = await api.post(`/fuel/admin/recharges/${id}/reject`);
    return res.data;
  },
  listAllTransactions: async (): Promise<FuelTransaction[]> => {
    const res = await api.get('/fuel/admin/transactions');
    return res.data?.items || [];
  },

  // Company: Wallet & Transactions
  requestRecharge: async (data: { amount: number; payment_method?: string; reference?: string; notes?: string }) => {
    const res = await api.post('/fuel/recharges', data);
    return res.data;
  },
  listCompanyRecharges: async (): Promise<FuelWalletRecharge[]> => {
    const res = await api.get('/fuel/recharges');
    return res.data?.items || [];
  },
  listCompanyTransactions: async (): Promise<FuelTransaction[]> => {
    const res = await api.get('/fuel/transactions');
    return res.data?.items || [];
  },

  // Simulator
  simulateTransaction: async (data: { company_id: string; station_id: string; amount: number; vehicle_id?: string }) => {
    const res = await api.post('/fuel/simulate', data);
    return res.data;
  }
};
