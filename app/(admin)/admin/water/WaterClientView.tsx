'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  PlusCircle, 
  Droplets, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Sparkles, 
  Cpu, 
  RefreshCw,
  Ban
} from 'lucide-react';
import { Profile, WaterContribution } from '@/lib/types';
import { WaterPoolSummary } from '@/lib/calculations';
import WaterStatusGrid from '@/components/WaterStatusGrid';

interface WaterClientViewProps {
  occupants: Profile[];
  contributions: WaterContribution[];
  waterSummary: WaterPoolSummary;
}

export default function WaterClientView({
  occupants,
  contributions,
  waterSummary
}: WaterClientViewProps) {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Levy generator month state
  const [targetMonth, setTargetMonth] = useState('2026-06');
  const [levyAmount, setLevyAmount] = useState<number>(3000);
  const [deadline, setDeadline] = useState<string>('');
  
  // Ledger view month state
  const [viewMonth, setViewMonth] = useState('2026-06');

  // Filter contributions by the current selected month
  const monthContributions = contributions.filter(c => c.month === viewMonth);

  const resetMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const handleGenerateLevy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    if (!/^\d{4}-\d{2}$/.test(targetMonth)) {
      setError('Required format is YYYY-MM.');
      return;
    }

    setIsLoading(true);
    resetMessages();

    try {
      const res = await fetch(`/api/water/generate/${targetMonth}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount: levyAmount, deadline }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Levy generation failed.');
      }

      setSuccess(`Invoiced ${data.generatedCount} occupants. (Skipped ${data.skippedCount} duplicates)`);
      router.refresh();

    } catch (err: any) {
      setError(err.message || 'Network error.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateContributionStatus = async (id: string, newStatus: 'paid' | 'waived' | 'pending') => {
    if (isLoading) return;
    setIsLoading(true);
    resetMessages();

    try {
      const res = await fetch(`/api/water/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Status change aborted.');
      }

      setSuccess(`Updated contribution to ${newStatus}.`);
      router.refresh();

    } catch (err: any) {
      setError(err.message || 'Network error.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatNaira = (val: number) => {
    return '₦' + val.toLocaleString('en-NG', { minimumFractionDigits: 0 });
  };

  return (
    <div className="flex flex-col gap-6 text-slate-100" id="water-manager-view-frame">
      
      {/* 0. WATER PUMP RESERVE WIDGET */}
      <div className="bg-slate-900 border border-sky-500/20 rounded-3xl p-5 shadow-lg relative overflow-hidden" id="water-pool-summary-widget">
        <div className="absolute top-0 right-0 h-16 w-16 bg-sky-500/10 rounded-bl-full flex items-start justify-end p-4">
          <Droplets className="h-6 w-6 text-sky-400 opacity-50" />
        </div>
        
        <h3 className="text-xs font-bold font-sans tracking-wide text-sky-400 uppercase mb-4 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          Compound Water Reserve
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 flex flex-col justify-between">
            <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">Accumulated Funds</span>
            <span className="text-xl font-bold text-slate-100 mt-1">{formatNaira(waterSummary.totalWaterFundsCollected)}</span>
            <span className="text-[9px] text-slate-500 mt-1">From paid contributions</span>
          </div>
          
          <div className="bg-slate-950 p-4 rounded-2xl border border-sky-500/30 flex flex-col justify-between">
            <span className="text-[10px] text-sky-400 uppercase font-mono tracking-wider">Available Power</span>
            <span className="text-xl font-bold text-sky-400 mt-1">
              {waterSummary.waterUnitsRemaining.toFixed(1)} <span className="text-xs font-normal">kWh</span>
            </span>
            <span className="text-[9px] text-sky-500/60 mt-1 flex justify-between">
              <span>Buy: {waterSummary.totalWaterUnitsPurchased.toFixed(1)}</span>
              <span>Used: {waterSummary.totalWaterUnitsUsed.toFixed(1)}</span>
            </span>
          </div>
        </div>
      </div>

      {/* 1. VISUAL SYSTEM MATRIX */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3 shadow-sm">
        <h3 className="text-xs font-bold font-sans tracking-wide text-slate-500 uppercase flex items-center gap-1.5 leading-none px-1">
          <Activity className="h-3.5 w-3.5 text-sky-400" />
          Building Compliance Matrix
        </h3>
        <span className="text-[10px] text-slate-400 block px-1 leading-normal font-medium">
          Green denotes paid months; Red indicates overdue balances. Click &ldquo;All Logs&rdquo; or use sliders below to resolve discrepancies.
        </span>
        <WaterStatusGrid tenants={occupants} contributions={contributions} onStatusToggle={updateContributionStatus} isUpdating={isLoading} />
      </div>

      {/* 2. DYNAMIC BILLING RUN INVOICER */}
      <form onSubmit={handleGenerateLevy} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4 shadow-sm" id="generate-levy-form">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
          <PlusCircle className="h-4 w-4 text-sky-400" />
          <h3 className="text-xs font-bold font-sans uppercase tracking-wide text-slate-500">Launch Utility Levy Run</h3>
        </div>

        <div className="grid grid-cols-3 gap-3.5 items-end font-sans">
          <div>
            <label className="block text-[10px] font-bold font-sans uppercase text-slate-500 tracking-wide mb-1.5">Target Month Code</label>
            <input
              id="water-target-month-input"
              type="text"
              required
              placeholder="YYYY-MM"
              value={targetMonth}
              onChange={(e) => setTargetMonth(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800/80 focus:border-sky-500 outline-none rounded-xl py-2.5 px-3.5 text-xs text-slate-100 font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold font-sans uppercase text-slate-500 tracking-wide mb-1.5">Levy Amount (₦)</label>
            <input
              id="water-levy-amount-input"
              type="number"
              step="any"
              required
              value={levyAmount}
              onChange={(e) => setLevyAmount(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800/80 focus:border-sky-500 outline-none rounded-xl py-2.5 px-3.5 text-xs text-slate-100 font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold font-sans uppercase text-slate-500 tracking-wide mb-1.5">Payment Deadline</label>
            <input
              id="water-deadline-input"
              type="date"
              required
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800/80 focus:border-sky-500 outline-none rounded-xl py-2.5 px-3.5 text-xs text-slate-100 font-mono font-bold"
            />
          </div>
        </div>
        
        <button
          id="submit-generate-levy-btn"
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 h-[38px] bg-sky-500 hover:bg-sky-600 text-white font-bold tracking-wide rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer leading-none shadow-md"
        >
          Generate Levies
        </button>
      </form>

      {/* Verification responses */}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex gap-2 items-center font-bold">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex gap-2 items-center font-bold">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}      {/* 3. INDIVIDUAL MONTH MANAGEMENT */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4 shadow-sm">
        
        {/* Month selector dropdown */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
          <h3 className="text-xs font-bold font-sans tracking-wide text-slate-500 uppercase flex items-center gap-1.5 leading-none">
            <Droplets className="h-4 w-4 text-sky-450" />
            Occupants Levy Status
          </h3>
          <select
            id="view-month-select"
            value={viewMonth}
            onChange={(e) => setViewMonth(e.target.value)}
            className="bg-slate-950 border border-slate-805 text-[11px] font-sans font-bold text-slate-350 outline-none rounded-lg p-1.5 hover:bg-slate-900 transition-all cursor-pointer font-sans"
          >
            <option value="2026-04">April 2026</option>
            <option value="2026-05">May 2026</option>
            <option value="2026-06">June 2026</option>
            <option value="2026-07">July 2026</option>
          </select>
        </div>

        {/* Contributions ledger listing */}
        {monthContributions.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 font-medium italic text-center">No levy contributions generated for selected month.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {monthContributions.map(contrib => {
              const occupant = occupants.find(occ => occ.id === contrib.tenant_id);
              if (!occupant) return null;

              return (
                <div key={contrib.id} className="p-3.5 bg-slate-950 border border-slate-850 rounded-2xl flex justify-between items-center gap-3 text-xs leading-normal">
                  <div>
                    <div className="font-extrabold text-slate-200">
                      {occupant.room_label} <span className="font-semibold text-slate-500">• {occupant.full_name}</span>
                    </div>
                    <span className="text-[10px] text-slate-450 font-mono block mt-1.5 font-bold">
                      Water levy: {formatNaira(contrib.amount)} | current: {contrib.status}
                    </span>
                  </div>

                  {/* Operational status adjust checks */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {contrib.status === 'pending' && (
                      <div className="flex items-center gap-1">
                        <button
                          id={`btn-waive-${contrib.id}`}
                          onClick={() => updateContributionStatus(contrib.id, 'waived')}
                          disabled={isLoading}
                          className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-205 text-[10px] font-bold rounded-lg cursor-pointer shadow-sm transition-all active:scale-95 hover:bg-slate-800"
                        >
                          Waive
                        </button>
                        <button
                          id={`btn-markpaid-${contrib.id}`}
                          onClick={() => updateContributionStatus(contrib.id, 'paid')}
                          disabled={isLoading}
                          className="px-2.5 py-1.5 bg-slate-900 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 text-[10px] font-bold rounded-lg cursor-pointer shadow-sm transition-all active:scale-95"
                        >
                          Conf. Paid
                        </button>
                      </div>
                    )}

                    {contrib.status === 'paid' && (
                      <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 py-1 px-2.5 rounded-lg uppercase">
                        ✓ Paid
                      </span>
                    )}

                    {contrib.status === 'waived' && (
                      <span className="text-[9px] font-mono font-bold text-slate-500 bg-slate-905 border border-slate-800 py-1 px-2.5 rounded-lg uppercase">
                        Waived
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}

// Inline placeholder for missing activities icons
function Activity({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
  );
}
