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
      <div className="flex justify-between items-center px-1">
        <div>
          <span className="text-[10px] font-mono tracking-wider font-bold text-slate-500 uppercase">
            Active Residence
          </span>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-1.5 leading-none mt-0.5" id="tenant-summary-room-label">
            {profile.room_label} <span className="text-slate-700 font-normal">|</span> <span className="text-xs font-semibold text-slate-400">{profile.full_name}</span>
          </h2>
        </div>
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

      {/* Global Water Levy Notice Banner */}
      {globalSetting && globalSetting.waterNoticeMessage && outstandingWaterAmount > 0 && (
        <div className={`p-4 rounded-2xl shadow-sm relative overflow-hidden animate-fade-in ${isOverdue ? 'bg-red-500/10 border border-red-500/30' : 'bg-amber-500/10 border border-amber-500/30'}`} id="dashboard-water-notice">
          <div className={`absolute top-0 right-0 h-16 w-16 rounded-bl-full flex items-start justify-end p-3 ${isOverdue ? 'bg-red-500/10' : 'bg-amber-500/10'}`}>
            <AlertTriangle className={`h-5 w-5 opacity-50 ${isOverdue ? 'text-red-400' : 'text-amber-400'}`} />
          </div>
          <div className="flex flex-col gap-1.5 z-10 relative">
            <span className={`text-[10px] font-bold font-sans uppercase tracking-widest flex items-center gap-1.5 ${isOverdue ? 'text-red-500' : 'text-amber-500'}`}>
              <Droplets className="h-3 w-3" />
              Water Levy Notice
            </span>
            <span className={`text-sm font-bold tracking-wide leading-tight ${isOverdue ? 'text-red-100' : 'text-amber-100'}`}>
              {globalSetting.waterNoticeMessage}
            </span>
            
            {deadlineMessage && (
              <span className={`text-[11px] font-mono mt-1 font-bold ${isOverdue ? 'text-red-400 animate-pulse' : 'text-amber-400'}`}>
                {deadlineMessage} (Due: {globalSetting.waterNoticeDeadline})
              </span>
            )}
          </div>
        </div>
      )}

      {/* Water Pool Widget */}
      {waterPoolSummary && (
        <div className="bg-slate-900 border border-sky-500/20 rounded-2xl p-4 flex items-center justify-between shadow-sm relative overflow-hidden" id="card-water-reserve-tenant">
          <div className="absolute top-0 right-0 h-16 w-16 bg-sky-500/10 rounded-bl-full flex items-start justify-end p-3">
            <Droplets className="h-5 w-5 text-sky-400 opacity-50" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="h-3 w-3 text-sky-400" />
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-sky-400">Compound Water Reserve</span>
            </div>
            <span className="text-xl font-extrabold text-slate-100 block tracking-tight leading-none">
              {waterPoolSummary.waterUnitsRemaining.toFixed(1)} <span className="text-xs font-normal text-slate-400">kWh left</span>
            </span>
            <span className="text-[9px] text-slate-500 block mt-1.5 leading-tight">
              Prepaid power available for the water pump
            </span>
          </div>
        </div>
      )}

      {/* Grid of Key Financial metrics */}
      <div className="grid grid-cols-2 gap-3.5">
        
        {/* Metric 1: Electricity Balance (Only for Electricity tenants & Admins acting as tenant) */}
        {isElectricityTenant && (
          <div className="col-span-2 bg-slate-950 border border-slate-800/90 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden shadow-sm" id="card-electricity-balance">
            {/* Ambient indicator glow */}
            <div className={`absolute top-0 right-0 h-1.5 w-16 rounded-bl-lg ${electricityBalance >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />
            
            <div className="flex items-center gap-2 mb-2">
              <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${electricityBalance >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`}>
                <Zap className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Electricity Balance</span>
            </div>

            <div className="flex items-baseline gap-1.5 my-1">
              <span className={`text-3xl font-extrabold tracking-tight ${electricityBalance >= 0 ? 'text-slate-100' : 'text-red-400'}`}>
                {electricityBalance >= 0 ? '+' : '-'}{formatNaira(electricityBalance)}
              </span>
              <span className={`text-[10px] uppercase font-mono font-bold px-1.5 py-0.5 rounded-full ${electricityBalance >= 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                {electricityBalance >= 0 ? 'Credit' : 'Owes'}
              </span>
            </div>
            
            <p className="text-[11px] text-slate-404 mt-2 leading-relaxed">
              {electricityBalance >= 0 
                ? 'Your prepaid utility reserve is safe and active.' 
                : 'Your post-paid usage has exceeded previous prepayments. Balance is negative.'}
            </p>

            {/* Deposit-Deficit Arrears Compliance Badge */}
            {isDepositDeficit && (
              <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] rounded-xl flex flex-col gap-1.5" id="deposit-deficit-warning">
                <span className="font-extrabold text-xs uppercase flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-450" />
                  Security Deposit Deficit!
                </span>
                <span>
                  Your held Escrow Deposit ({formatNaira(depositHeld)}) is smaller than your outstanding electricity arrears. Please submit an additional deposit top-up of at least <strong>{formatNaira(Math.abs(electricityBalance) - depositHeld)}</strong> immediately.
                </span>
              </div>
            )}

            {/* Deposit Held settlement helper box if there are arrears but covered by escrow */}
            {electricityBalance < 0 && !isDepositDeficit && depositHeld > 0 && (
              <div className="mt-4 p-3 bg-slate-900 border border-emerald-500/20 text-[11px] rounded-xl flex flex-col gap-2" id="deposit-covered-helper">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Coins className="h-4 w-4 text-emerald-400 animate-bounce" />
                  Settle Arrears via Escrow
                </span>
                <p className="text-slate-400 leading-tight">
                  You have <strong>{formatNaira(depositHeld)}</strong> held in escrow. Use a portion of this deposit to clear your <strong>{formatNaira(electricityBalance)}</strong> arrears instantly.
                </p>
                <button
                  type="button"
                  id="apply-deposit-power-btn"
                  disabled={isApplying}
                  onClick={() => handleApplyDeposit('electricity', Math.abs(electricityBalance))}
                  className="w-full py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold tracking-tight rounded-lg text-xs cursor-pointer select-none transition-colors"
                >
                  {isApplying ? 'Processing Settle...' : `Apply ${formatNaira(electricityBalance)} from Escrow`}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Metric 2: Estimated Units Remaining */}
        {isElectricityTenant && (
          <div className="bg-slate-950 border border-slate-800/90 rounded-2xl p-4 flex flex-col justify-between shadow-sm" id="card-units-remaining">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="text-slate-500 h-4 w-4" />
              <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-500">Tokens Left</span>
            </div>
            <div>
              <span className="text-xl font-extrabold text-slate-100 block tracking-tight leading-none">
                {remainingUnitsEstimate.toFixed(1)} <span className="text-xs font-normal text-slate-600">kWh</span>
              </span>
              <span className="text-[10px] text-slate-400 block mt-1.5 leading-tight">
                Est. units remaining
              </span>

              <div className="mt-3 pt-3 border-t border-slate-800/60">
                <span className="text-[9px] uppercase font-mono tracking-wider text-slate-500 block mb-0.5">Last Logged Index</span>
                {summary.readings && summary.readings.length > 0 ? (
                  <>
                    <span className="text-sm font-extrabold text-emerald-400 font-mono">
                      {summary.readings.sort((a, b) => new Date(b.reading_date).getTime() - new Date(a.reading_date).getTime())[0].reading_kwh} kWh
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono ml-1">
                      ({new Date(summary.readings[0].reading_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })})
                    </span>
                  </>
                ) : (
                  <span className="text-[10px] text-slate-500 italic">No meter index logged yet.</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Metric 3: Deposit escrow */}
        <div className={`bg-slate-950 border border-slate-800/90 rounded-2xl p-4 flex flex-col justify-between shadow-sm ${isWaterOnlyTenant ? 'col-span-2' : ''}`} id="card-deposit-held">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="text-slate-500 h-4 w-4" />
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-500">Escrow Dep.</span>
          </div>
          <div>
            <span className="text-xl font-extrabold text-slate-100 block tracking-tight leading-none">
              {formatNaira(depositHeld)}
            </span>
            <span className="text-[10px] text-slate-400 block mt-1.5 leading-tight">
              Held in house escrow
            </span>
          </div>
        </div>

        {/* Metric 4: Outstanding Water pump contributions */}
        <div className="col-span-2 bg-slate-950 border border-slate-800/90 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden shadow-sm animate-fade-in" id="card-water-obligation">
          <div className={`absolute top-0 right-0 h-1.5 w-16 rounded-bl-lg ${outstandingWaterAmount === 0 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          
          <div className="flex items-center gap-2 mb-2">
            <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${outstandingWaterAmount === 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10'}`}>
              <Droplets className="h-4 w-4" />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Water Pump Levy</span>
          </div>

          <div className="flex justify-between items-baseline mb-1">
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl font-extrabold tracking-tight ${outstandingWaterAmount === 0 ? 'text-slate-350' : 'text-amber-400'}`}>
                {outstandingWaterAmount === 0 ? '₦0' : formatNaira(outstandingWaterAmount)}
              </span>
              {outstandingWaterAmount > 0 && (
                <span className="text-[10px] text-amber-400 font-bold uppercase font-mono px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 animate-pulse">
                  {summary.outstandingWaterCount} month{summary.outstandingWaterCount > 1 ? 's' : ''} unpaid
                </span>
              )}
            </div>

            {outstandingWaterAmount === 0 && (
              <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                Up-to-date
              </span>
            )}
          </div>

          <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
            {outstandingWaterAmount === 0 
              ? 'Thank you! Your water pump contributions are fully paid.' 
              : 'Please clear your outstanding water pump levy to avoid disconnection.'}
          </p>

          {/* Settle water using security deposit */}
          {outstandingWaterAmount > 0 && depositHeld > 0 && (
            <div className="mt-4 p-3 bg-slate-900 border border-emerald-500/20 text-[11px] rounded-xl flex flex-col gap-2" id="deposit-water-helper-box">
              <span className="font-bold text-slate-205 flex items-center gap-1.5">
                <Coins className="h-4 w-4 text-emerald-400" />
                Settle Levy via Escrow
              </span>
              <p className="text-slate-400 leading-tight">
                Instantly clear your outstanding water pump levy of <strong>{formatNaira(outstandingWaterAmount)}</strong> using your escrow deposit.
              </p>
              <button
                type="button"
                id="apply-deposit-water-btn"
                disabled={isApplying}
                onClick={() => handleApplyDeposit('water', Math.min(depositHeld, outstandingWaterAmount))}
                className="w-full py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold tracking-tight rounded-lg text-xs cursor-pointer select-none transition-colors"
              >
                {isApplying ? 'Processing Settle...' : `Apply ${formatNaira(Math.min(depositHeld, outstandingWaterAmount))} from Escrow`}
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
