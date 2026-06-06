import React from 'react';
import { ShieldAlert, Percent, HelpCircle, ArrowUpRight } from 'lucide-react';
import { UnitLossSummary } from '@/lib/calculations';

interface UnitLossCardProps {
  summary: UnitLossSummary;
}

export default function UnitLossCard({ summary }: UnitLossCardProps) {
  const { 
    totalPurchasedUnits, 
    totalMeteredUnits, 
    lostUnits, 
    lostValue, 
    lostPercentage 
  } = summary;

  const hasLoss = lostUnits > 0;

  const formatNaira = (val: number) => {
    return '₦' + Math.abs(val).toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden" id="unit-loss-metric-card">
      {/* Background visual accents */}
      <div className="absolute top-0 right-0 h-10 w-10 bg-red-500/5 rounded-bl-3xl border-l border-b border-red-500/10 flex items-center justify-center text-red-500">
        <ShieldAlert className="h-4 w-4" />
      </div>

      <div className="flex flex-col gap-1.5 mb-4">
        <span className="text-[10px] font-mono tracking-wider font-bold text-slate-500 uppercase">
          Compound Audit
        </span>
        <h3 className="text-base font-bold text-slate-100 flex items-center gap-1.5">
          Bulk Loss Assessment
        </h3>
      </div>

      {/* Row showing core percentages */}
      <div className="grid grid-cols-2 gap-3.5 mb-4">
        <div className="p-3.5 bg-slate-950 border border-slate-800/60 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] uppercase font-mono text-slate-500">Lost Energy</span>
          <span className="text-lg font-bold text-slate-100 mt-1">
            {lostUnits.toFixed(1)} <span className="text-xs font-normal text-slate-400">kWh</span>
          </span>
          <span className="text-[9px] text-slate-500 block mt-0.5 mt-1 leading-tight">
            Purchased vs metered
          </span>
        </div>

        <div className="p-3.5 bg-slate-950 border border-slate-800/60 rounded-2xl flex flex-col justify-between">
          <span className="text-[10px] uppercase font-mono text-slate-500">Value Leakage</span>
          <span className="text-lg font-bold text-red-400 mt-1">
            {formatNaira(lostValue)}
          </span>
          <span className="text-[9px] text-red-500/70 font-medium block mt-0.5 mt-1 leading-tight flex items-center gap-0.5">
            <Percent className="h-3 w-3 shrink-0" />
            {lostPercentage.toFixed(1)}% compound deficit
          </span>
        </div>
      </div>

      {/* Metered Comparison Bar Widget */}
      <div className="bg-slate-950 rounded-2xl p-4.5 border border-slate-800/70 flex flex-col gap-2.5">
        <div className="flex justify-between items-baseline text-[11px] font-mono">
          <span className="text-slate-400">System Flow Details:</span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase ${hasLoss ? 'text-amber-400 bg-amber-500/10' : 'text-emerald-400 bg-emerald-500/10'}`}>
            {hasLoss ? 'Variance Flagged' : 'Balanced'}
          </span>
        </div>

        {/* Dynamic bar ratios */}
        <div className="relative h-2.5 w-full bg-slate-900 rounded-full overflow-hidden flex">
          <div 
            style={{ width: `${Math.max(5, (totalMeteredUnits / Math.max(1, totalPurchasedUnits)) * 100)}%` }}
            className="h-full bg-emerald-500 transition-all duration-300"
            title="Tenant Metered Consumption"
          />
          <div 
            style={{ width: `${Math.max(0, (lostUnits / Math.max(1, totalPurchasedUnits)) * 100)}%` }}
            className="h-full bg-red-500 transition-all duration-300"
            title="Unallocated/Lost Units"
          />
        </div>

        <div className="flex justify-between text-[10px] text-slate-500 leading-tight">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Metered: {totalMeteredUnits.toFixed(1)} kWh</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-400" />
            <span>Loss: {lostUnits.toFixed(1)} kWh</span>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-slate-400 leading-relaxed mt-4.5">
        💡 <strong>Deficit Factors:</strong> Unallocated line losses, transformer overheads, or common area outlets wired to the central meter outside individual flat breakers.
      </p>
    </div>
  );
}
