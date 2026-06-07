import { DatabaseSchema } from './db';
import { TokenPurchase, MeterReading, Payment, Profile, WaterContribution } from './types';

export interface TenantSummary {
  profile: Profile;
  totalPurchasedUnits: number;
  totalUsedUnits: number;
  remainingUnitsEstimate: number;
  amountOwed: number; // electricity used cost
  totalElectricityPayments: number; // confirmed electricity payments
  electricityBalance: number; // positive = credit, negative = owes
  depositHeld: number;
  outstandingWaterCount: number;
  outstandingWaterAmount: number;
  readings: MeterReading[];
  purchases: TokenPurchase[];
  payments: Payment[];
  waterContributions: WaterContribution[];
}

export function getTenantSummary(db: DatabaseSchema, tenantId: string): TenantSummary | null {
  const profile = db.profiles.find(p => p.id === tenantId);
  if (!profile) return null;

  // 1. Electricity Units Purchased
  const purchases = db.token_purchases.filter(p => p.tenant_id === tenantId);
  const totalPurchasedUnits = purchases.reduce((sum, p) => sum + Number(p.units_received), 0);

  // 2. Electricity Units Used
  const readings = [...db.meter_readings]
    .filter(r => r.tenant_id === tenantId)
    .sort((a, b) => new Date(a.reading_date).getTime() - new Date(b.reading_date).getTime());
  
  let totalUsedUnits = 0;
  if (readings.length >= 2) {
    const firstReading = Number(readings[0].reading_kwh);
    const lastReading = Number(readings[readings.length - 1].reading_kwh);
    totalUsedUnits = Math.max(0, lastReading - firstReading);
  } else if (readings.length === 1) {
    // If only 1 reading, used is 0 (as it's the baseline)
    totalUsedUnits = 0;
  }

  // 3. Units Remaining Estimate
  const remainingUnitsEstimate = Math.max(0, totalPurchasedUnits - totalUsedUnits);

  // 4. Amount Owed (total used * current rate)
  const sortedRates = [...db.electricity_rates].sort((a, b) => 
    new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime()
  );
  const currentRate = sortedRates.length > 0 ? sortedRates[0].rate_per_kwh : 120;
  const amountOwed = totalUsedUnits * currentRate;

  // 5. Total Electricity Payments (confirmed 'electricity' and 'prepayment' payments)
  const payments = db.payments.filter(p => p.tenant_id === tenantId);
  const totalElectricityPayments = payments
    .filter(p => p.status === 'confirmed' && (p.payment_type === 'electricity' || p.payment_type === 'prepayment'))
    .reduce((sum, p) => sum + Number(p.amount), 0);

  // 6. Balance (total confirmed electricity payments - amount owed)
  // Negative = owes, Positive = credit
  const electricityBalance = totalElectricityPayments - amountOwed;

  // 7. Deposit Held
  const depositHeld = db.deposits
    .filter(d => d.tenant_id === tenantId && !d.refunded)
    .reduce((sum, d) => sum + Number(d.amount), 0);

  // 8. Water Contribution Statuses
  const waterContributions = db.water_contributions.filter(wc => wc.tenant_id === tenantId);
  const outstandingWaterCount = waterContributions.filter(wc => wc.status === 'pending').length;
  const outstandingWaterAmount = outstandingWaterCount * 3000;

  return {
    profile,
    totalPurchasedUnits,
    totalUsedUnits,
    remainingUnitsEstimate,
    amountOwed,
    totalElectricityPayments,
    electricityBalance,
    depositHeld,
    outstandingWaterCount,
    outstandingWaterAmount,
    readings,
    purchases,
    payments,
    waterContributions
  };
}

export interface UnitLossSummary {
  totalPurchasedUnits: number;
  totalMeteredUnits: number;
  lostUnits: number;
  lostValue: number;
  lostPercentage: number;
}

export function getUnitLossSummary(db: DatabaseSchema): UnitLossSummary {
  // Total electricity purchased units across all tenants
  const totalPurchasedUnits = db.token_purchases.reduce((sum, p) => sum + Number(p.units_received), 0);

  // Total metered electricity energy used across all tenants
  let totalMeteredUnits = 0;
  const electricityTenants = db.profiles.filter(p => p.role === 'electricity_tenant' || p.role === 'admin');
  
  for (const tenant of electricityTenants) {
    const tenantReadings = [...db.meter_readings]
      .filter(r => r.tenant_id === tenant.id)
      .sort((a, b) => new Date(a.reading_date).getTime() - new Date(b.reading_date).getTime());
    
    if (tenantReadings.length >= 2) {
      const first = Number(tenantReadings[0].reading_kwh);
      const last = Number(tenantReadings[tenantReadings.length - 1].reading_kwh);
      totalMeteredUnits += Math.max(0, last - first);
    }
  }

  const lostUnits = Math.max(0, totalPurchasedUnits - totalMeteredUnits);
  const sortedRates = [...db.electricity_rates].sort((a, b) => 
    new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime()
  );
  const currentRate = sortedRates.length > 0 ? sortedRates[0].rate_per_kwh : 120;
  const lostValue = lostUnits * currentRate;
  const lostPercentage = totalPurchasedUnits > 0 ? (lostUnits / totalPurchasedUnits) * 100 : 0;

  return {
    totalPurchasedUnits,
    totalMeteredUnits,
    lostUnits,
    lostValue,
    lostPercentage
  };
}

export interface AdminMetrics {
  totalTenantsCount: number;
  collectedThisMonth: number;
  outstandingAcrossTenants: number;
  unitLoss: UnitLossSummary;
  pendingTransfersCount: number;
}

export function getAdminMetrics(db: DatabaseSchema): AdminMetrics {
  const tenants = db.profiles;
  const totalTenantsCount = tenants.length;

  // We determine this month's payments
  const now = new Date();
  const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const collectedThisMonth = db.payments
    .filter(p => {
      if (p.status !== 'confirmed') return false;
      const payDate = new Date(p.created_at);
      const payYearMonth = `${payDate.getFullYear()}-${String(payDate.getMonth() + 1).padStart(2, '0')}`;
      return payYearMonth === currentYearMonth;
    })
    .reduce((sum, p) => sum + Number(p.amount), 0);

  // Outstanding across tenants (negative electricity balance + pending water)
  let outstandingAcrossTenants = 0;
  for (const t of tenants) {
    const summary = getTenantSummary(db, t.id);
    if (summary) {
      // If electricity balance is negative, add absolute value
      if (summary.electricityBalance < 0) {
        outstandingAcrossTenants += Math.abs(summary.electricityBalance);
      }
      // Add outstanding water
      outstandingAcrossTenants += summary.outstandingWaterAmount;
    }
  }

  const unitLoss = getUnitLossSummary(db);

  const pendingTransfersCount = db.payments.filter(
    p => p.status === 'pending' && p.payment_method === 'paystack_transfer'
  ).length;

  return {
    totalTenantsCount,
    collectedThisMonth,
    outstandingAcrossTenants,
    unitLoss,
    pendingTransfersCount
  };
}

export interface WaterPoolSummary {
  totalWaterFundsCollected: number;
  totalWaterUnitsPurchased: number;
  totalWaterUnitsUsed: number;
  waterUnitsRemaining: number;
  waterReadings: MeterReading[];
}

export function getWaterPoolSummary(db: DatabaseSchema): WaterPoolSummary {
  // Sum all 'paid' water contributions
  const paidContributions = db.water_contributions.filter(c => c.status === 'paid');
  const totalWaterFundsCollected = paidContributions.reduce((sum, c) => sum + Number(c.amount), 0);

  // Get current rate
  const sortedRates = [...db.electricity_rates].sort((a, b) => 
    new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime()
  );
  const currentRate = sortedRates.length > 0 ? sortedRates[0].rate_per_kwh : 120;

  // Total purchased units for the water pump
  const totalWaterUnitsPurchased = totalWaterFundsCollected / currentRate;

  // Readings for WATER_PUMP pseudo-tenant
  const waterReadings = [...db.meter_readings]
    .filter(r => r.tenant_id === 'WATER_PUMP')
    .sort((a, b) => new Date(a.reading_date).getTime() - new Date(b.reading_date).getTime());

  let totalWaterUnitsUsed = 0;
  if (waterReadings.length >= 2) {
    const firstReading = Number(waterReadings[0].reading_kwh);
    const lastReading = Number(waterReadings[waterReadings.length - 1].reading_kwh);
    totalWaterUnitsUsed = Math.max(0, lastReading - firstReading);
  }

  const waterUnitsRemaining = Math.max(0, totalWaterUnitsPurchased - totalWaterUnitsUsed);

  return {
    totalWaterFundsCollected,
    totalWaterUnitsPurchased,
    totalWaterUnitsUsed,
    waterUnitsRemaining,
    waterReadings
  };
}

