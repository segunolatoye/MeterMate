export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: 'admin' | 'electricity_tenant' | 'water_only_tenant';
  room_label: string;
  meter_id?: string;
  deposit_amount: number;
  created_at: string;
  password?: string;
}

export interface ElectricityRate {
  id: string;
  rate_per_kwh: number;
  effective_from: string; // ISO date string or YYYY-MM-DD
  note: string;
  created_by: string;
  created_at: string;
}

export interface TokenPurchase {
  id: string;
  tenant_id: string;
  date: string;
  amount_paid: number;
  units_received: number;
  rate_at_time: number;
  token_ref: string;
  created_by: string;
  created_at: string;
}

export interface MeterReading {
  id: string;
  tenant_id: string;
  reading_date: string;
  reading_kwh: number;
  notes: string;
  created_by: string;
  created_at: string;
}

export interface WaterContribution {
  id: string;
  tenant_id: string;
  month: string; // YYYY-MM
  amount: number;
  status: 'pending' | 'paid' | 'waived';
  payment_id?: string;
  created_at: string;
}

export interface Payment {
  id: string;
  tenant_id: string;
  amount: number;
  payment_type: 'electricity' | 'water' | 'deposit' | 'prepayment';
  payment_method: 'paystack_card' | 'paystack_transfer' | 'manual';
  paystack_reference: string;
  status: 'pending' | 'confirmed' | 'failed';
  confirmed_by?: string; // admin user id
  note: string;
  created_at: string;
}

export interface Deposit {
  id: string;
  tenant_id: string;
  amount: number;
  refunded: boolean;
  refunded_at?: string;
  note: string;
  created_at: string;
}

export interface SessionUser {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'electricity_tenant' | 'water_only_tenant';
}
