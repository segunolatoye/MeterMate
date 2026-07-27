'use client';

import React, { useState } from 'react';
import { Zap, Droplets, ShieldCheck, TrendingDown, RefreshCcw, AlertTriangle, Coins, CheckCircle, Flame, Sparkles } from 'lucide-react';
import { TenantSummary, WaterPoolSummary } from '@/lib/calculations';
import { AppSetting } from '@/lib/types';

interface TenantSummaryCardProps {
  summary: TenantSummary;
  waterPoolSummary?: WaterPoolSummary;
  globalSetting?: AppSetting;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export default function TenantSummaryCard({ summary, waterPoolSummary, globalSetting, onRefresh, isRefreshing }: TenantSummaryCardProps) {
  const { 
    profile, 
    remainingUnitsEstimate, 
    electricityBalance, 
    depositHeld, 
    outstandingWaterAmount 
  } = summary;

  const isElectricityTenant = profile.role === 'electricity_tenant' || profile.role === 'admin';
  const isWaterOnlyTenant = profile.role === 'water_only_tenant';

  // Format currency helpers
  const formatNaira = (val: number) => {
    return '₦' + Math.abs(val).toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const [isApplying, setIsApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState<string | null>(null);

  const handleApplyDeposit = async (target: 'electricity' | 'water', applyAmount: number) => {
    if (applyAmount <= 0) return;
    setIsApplying(true);
    setApplyError(null);
    setApplySuccess(null);
    try {
      const res = await fetch('/api/payments/apply-deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenant_id: profile.id,
          target_utility: target,
          amount: applyAmount,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to apply deposit.');
      }
      setApplySuccess(`Succeeded! Applied ${formatNaira(applyAmount)} from Escrow Deposit.`);
      
      // Delay reload to show success message
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setApplyError(err.message || 'Error executing application.');
    } finally {
      setIsApplying(false);
    }
  };

  const isDepositDeficit = electricityBalance < 0 && depositHeld < Math.abs(electricityBalance);

  // Dynamic Deadline Calculation
  let deadlineMessage = '';
  let isOverdue = false;
  if (globalSetting?.waterNoticeDeadline && outstandingWaterAmount > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDate = new Date(globalSetting.waterNoticeDeadline);
    deadlineDate.setHours(0, 0, 0, 0);

    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
      deadlineMessage = `You have ${diffDays} day${diffDays > 1 ? 's' : ''} until the deadline.`;
    } else if (diffDays === 0) {
      deadlineMessage = 'The deadline is TODAY. Please pay immediately.';
    } else {
      isOverdue = true;
      const overdueDays = Math.abs(diffDays);
      deadlineMessage = `You are ${overdueDays} day${overdueDays > 1 ? 's' : ''} overdue on payment!`;
    }
  } else if (outstandingWaterAmount === 0) {
    deadlineMessage = 'You are fully paid up.';
  }

  return (
    <div className="flex flex-col gap-4" id="tenant-summary-wrapper-card">
      {/* Header Profile / welcome segment */}
      <div className="flex justify-end items-center px-1">
        {onRefresh && (
          <button 
            id="pull-to-refresh-trigger"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="h-8 w-8 rounded-full border border-slate-800 bg-slate-950 shadow-sm flex items-center justify-center text-slate-400 hover:text-emerald-400 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCcw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-emerald-500' : ''}`} />
          </button>
        )}
      </div>

      {applyError && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2" id="deposit-action-error-box">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{applyError}</span>
        </div>
      )}

      {applySuccess && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center gap-2" id="deposit-action-success-box">
          <CheckCircle className="h-4 w-4 shrink-0 animate-pulse" />
          <span>{applySuccess}</span>
        </div>
      )}



      {/* Water Pool Widget */}
      {waterPoolSummary && (
        <div className="bg-slate-900/40 backdrop-blur-2xl border border-sky-500/20 shadow-[inset_0_1px_1px_rgba(14,165,233,0.1)] rounded-[28px] p-5 flex items-center justify-between relative overflow-hidden" id="card-water-reserve-tenant">
          <div className="absolute top-0 right-0 h-16 w-16 bg-sky-500/10 rounded-bl-full flex items-start justify-end p-3">
            <Droplets className="h-5 w-5 text-sky-400 opacity-50" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="h-3 w-3 text-sky-400" />
              <span className="text-[10px] uppercase font-sans font-bold tracking-widest text-sky-400">Water Pump Power</span>
            </div>
            <span className="text-2xl font-sans font-black text-slate-100 block tracking-tight leading-none">
              {waterPoolSummary.waterUnitsRemaining.toFixed(1)} <span className="text-sm font-sans font-normal text-slate-400">kWh left</span>
            </span>
            <span className="text-[9px] text-slate-500 block mt-1.5 leading-tight">
              Prepaid power available for the water pump
            </span>
          </div>
        </div>
      )}

      {/* Actionable Alerts (extracted from cards) */}


      {isElectricityTenant && electricityBalance < 0 && !isDepositDeficit && depositHeld > 0 && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-[24px] flex flex-col gap-2" id="deposit-covered-helper">
          <span className="font-sans font-extrabold text-xs uppercase text-emerald-400 flex items-center gap-1.5">
            <Coins className="h-4 w-4 animate-bounce" />
            Settle Power Arrears
          </span>
          <button
            type="button"
            disabled={isApplying}
            onClick={() => handleApplyDeposit('electricity', Math.abs(electricityBalance))}
            className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold tracking-tight rounded-xl text-xs transition-colors"
          >
            {isApplying ? 'Processing...' : `Apply ${formatNaira(Math.abs(electricityBalance))} from Deposit`}
          </button>
        </div>
      )}

      {outstandingWaterAmount > 0 && depositHeld >= outstandingWaterAmount && (
        <div className="p-4 bg-sky-500/10 border border-sky-500/20 rounded-[24px] flex flex-col gap-2" id="deposit-water-helper">
          <span className="font-sans font-extrabold text-xs uppercase text-sky-400 flex items-center gap-1.5">
            <Droplets className="h-4 w-4 animate-bounce" />
            Settle Water Bill
          </span>
          <button
            type="button"
            disabled={isApplying}
            onClick={() => handleApplyDeposit('water', outstandingWaterAmount)}
            className="w-full py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold tracking-tight rounded-xl text-xs transition-colors"
          >
            {isApplying ? 'Processing...' : `Apply ${formatNaira(outstandingWaterAmount)} from Deposit`}
          </button>
        </div>
      )}

      {/* Grid of Key Financial metrics (Icon Column Cards) */}
      <div className="grid grid-cols-2 gap-3.5">
        
        {/* Metric 1: Electricity Balance */}
        {isElectricityTenant && (
          <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-[28px] p-5 flex flex-col items-start justify-between relative shadow-[0_4px_30px_rgba(0,0,0,0.1)] aspect-square" id="card-electricity-balance">
            <div className={`h-10 w-10 rounded-2xl flex items-center justify-center mb-2 ${electricityBalance >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
              <Zap className="h-5 w-5" />
            </div>
            
            <div className="w-full">
              <span className={`text-2xl font-sans font-black tracking-tighter truncate block ${electricityBalance >= 0 ? 'text-slate-100' : 'text-red-400'}`}>
                {electricityBalance >= 0 ? '+' : '-'}{formatNaira(Math.abs(electricityBalance))}
              </span>
              <span className="text-[10px] uppercase font-sans font-bold tracking-widest text-slate-500 block mt-1">
                Power Balance
              </span>
            </div>
          </div>
        )}

        {/* Metric 2: Estimated Units Remaining */}
        {isElectricityTenant && (
          <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-[28px] p-5 flex flex-col items-start justify-between relative shadow-[0_4px_30px_rgba(0,0,0,0.1)] aspect-square" id="card-units-remaining">
            <div className="h-10 w-10 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 mb-2">
              <TrendingDown className="h-5 w-5" />
            </div>
            
            <div className="w-full">
              <span className="text-2xl font-sans font-black tracking-tighter text-slate-100 truncate block">
                {remainingUnitsEstimate.toFixed(1)}<span className="text-sm text-slate-500 font-normal">kWh</span>
              </span>
              <span className="text-[10px] uppercase font-sans font-bold tracking-widest text-slate-500 block mt-1">
                Power Left
              </span>
            </div>
          </div>
        )}

        {/* Metric 3: Deposit escrow */}
        <div className={`bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-[28px] p-5 flex flex-col items-start justify-between relative shadow-[0_4px_30px_rgba(0,0,0,0.1)] aspect-square ${isWaterOnlyTenant ? 'col-span-1' : ''}`} id="card-deposit-held">
          <div className="h-10 w-10 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 mb-2">
            <ShieldCheck className="h-5 w-5" />
          </div>
          
          <div className="w-full">
            <span className="text-2xl font-sans font-black tracking-tighter text-slate-100 truncate block">
              {formatNaira(depositHeld)}
            </span>
            <span className="text-[10px] uppercase font-sans font-bold tracking-widest text-slate-500 block mt-1">
              My Deposit
            </span>
          </div>
        </div>

        {/* Metric 4: Outstanding Water pump contributions */}
        <div className={`bg-slate-900/40 backdrop-blur-2xl border ${globalSetting?.waterNoticeActive && isOverdue ? 'border-red-500/50' : globalSetting?.waterNoticeActive ? 'border-amber-500/50' : 'border-white/10'} rounded-[28px] p-5 flex flex-col items-start justify-between relative shadow-[0_4px_30px_rgba(0,0,0,0.1)] ${isWaterOnlyTenant ? 'col-span-1' : ''}`} id="card-water-obligation">
          <div className={`absolute top-0 right-0 h-1.5 w-12 rounded-bl-lg ${outstandingWaterAmount === 0 ? 'bg-emerald-500' : isOverdue ? 'bg-red-500' : 'bg-amber-500'}`} />
          <div className={`h-10 w-10 rounded-2xl flex items-center justify-center mb-2 ${outstandingWaterAmount === 0 ? 'bg-emerald-500/10 text-emerald-400' : isOverdue ? 'bg-red-500/10 text-red-400 animate-pulse' : 'bg-amber-500/10 text-amber-400 animate-pulse'}`}>
            <Droplets className="h-5 w-5" />
          </div>
          
          <div className="w-full flex flex-col gap-2">
            <div>
              <span className={`text-2xl font-sans font-black tracking-tighter truncate block ${outstandingWaterAmount === 0 ? 'text-slate-100' : isOverdue ? 'text-red-400' : 'text-amber-400'}`}>
                {outstandingWaterAmount === 0 ? '₦0' : `-${formatNaira(outstandingWaterAmount)}`}
              </span>
              <span className="text-[10px] uppercase font-sans font-bold tracking-widest text-slate-500 block mt-1">
                Water Bill
              </span>
            </div>

            {globalSetting?.waterNoticeActive && (
              <div className="mt-2 pt-2 border-t border-white/10 flex flex-col gap-1">
                <span className={`text-[9px] font-bold font-sans uppercase tracking-widest flex items-center gap-1 ${isOverdue ? 'text-red-500' : 'text-amber-500'}`}>
                  Water Levy Notice
                </span>
                <span className={`text-[10px] font-bold tracking-wide leading-tight ${isOverdue ? 'text-red-100' : 'text-amber-100'}`}>
                  {globalSetting.waterNoticeMessage}
                </span>
                
                {deadlineMessage && (
                  <span className={`text-[9px] font-sans mt-0.5 font-bold ${isOverdue ? 'text-red-400 animate-pulse' : 'text-amber-400'}`}>
                    {deadlineMessage} (Due: {globalSetting.waterNoticeDeadline})
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
