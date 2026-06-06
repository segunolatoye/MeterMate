'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Settings, 
  Zap, 
  Calendar, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  TrendingUp, 
  Activity, 
  BookOpen, 
  Cpu
} from 'lucide-react';
import { Profile, ElectricityRate } from '@/lib/types';

interface ElectricityClientViewProps {
  tenants: Profile[];
  currentRate: number;
  rateHistory: ElectricityRate[];
}

export default function ElectricityClientView({
  tenants,
  currentRate,
  rateHistory,
}: ElectricityClientViewProps) {
  const router = useRouter();

  // Sub tabs: reading | token | tariff
  const [activeTab, setActiveTab] = useState<'reading' | 'token' | 'tariff'>('reading');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // LOG READING FORM
  const [readTenantId, setReadTenantId] = useState(tenants[0]?.id || '');
  const [readKwh, setReadKwh] = useState<number>(0);
  const [readDate, setReadDate] = useState(new Date().toISOString().split('T')[0]);
  const [readNotes, setReadNotes] = useState('');

  // GENERATE TOKEN FORM
  const [tokTenantId, setTokTenantId] = useState(tenants[0]?.id || '');
  const [tokAmount, setTokAmount] = useState<number>(0);
  const [tokDate, setTokDate] = useState(new Date().toISOString().split('T')[0]);
  const [tokPin, setTokPin] = useState('');

  // NEW TARIFF FORM
  const [tarAmount, setTarAmount] = useState<number>(currentRate);
  const [tarDate, setTarDate] = useState(new Date().toISOString().split('T')[0]);
  const [tarNote, setTarNote] = useState('');

  const resetMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const submitReading = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!readTenantId) {
      setError('Please select an active occupant.');
      return;
    }
    setIsLoading(true);
    resetMessages();

    try {
      const res = await fetch('/api/readings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenant_id: readTenantId,
          reading_kwh: Number(readKwh),
          reading_date: readDate,
          notes: readNotes || 'Periodic monthly reading'
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed log reading.');
      }

      setSuccess('Sub-meter reading logged successfully.');
      setReadKwh(0);
      setReadNotes('');
      router.refresh();

    } catch (err: any) {
      setError(err.message || 'Network error.');
    } finally {
      setIsLoading(false);
    }
  };

  const submitTokenPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokTenantId) {
      setError('Please select an active occupant.');
      return;
    }
    setIsLoading(true);
    resetMessages();

    // Auto-generate token pin if not manually set
    const pinToSubmit = tokPin?.trim() || [
      Math.floor(1000 + Math.random() * 9000),
      Math.floor(1000 + Math.random() * 9000),
      Math.floor(1000 + Math.random() * 9000),
      Math.floor(1000 + Math.random() * 9000)
    ].join('-');

    try {
      // Units received is derived from Amount / CurrentRate
      const units = Number(tokAmount) / currentRate;

      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenant_id: tokTenantId,
          date: tokDate,
          amount_paid: Number(tokAmount),
          units_received: units,
          rate_at_time: currentRate,
          token_ref: pinToSubmit,
          created_by: 'admin'
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed log purchase.');
      }

      setSuccess(`Token issued successfully! Generated pin: ${pinToSubmit}`);
      setTokAmount(0);
      setTokPin('');
      router.refresh();

    } catch (err: any) {
      setError(err.message || 'Network error.');
    } finally {
      setIsLoading(false);
    }
  };

  const submitTariffRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Number(tarAmount) <= 0) {
      setError('Rate charge must be higher than zero.');
      return;
    }
    setIsLoading(true);
    resetMessages();

    try {
      const res = await fetch('/api/rates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rate_per_kwh: Number(tarAmount),
          effective_from: tarDate,
          note: tarNote || 'Adjusted commercial alignment'
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update rates.');
      }

      setSuccess('New electricity tariff logged and activated.');
      setTarNote('');
      router.refresh();

      // Simple delay and force a full dashboard reload to fetch tariff
      setTimeout(() => {
        window.location.reload();
      }, 700);

    } catch (err: any) {
      setError(err.message || 'Tariff update network failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5" id="electricity-manager-root">
      
      {/* General current tariff quick tile */}
      <div className="p-4.5 bg-slate-900 border border-slate-800 rounded-3xl flex justify-between items-center text-xs">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/15 flex items-center justify-center">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-mono block leading-none">Active Power Tariff</span>
            <span className="text-sm font-bold text-slate-100 block mt-1">₦{currentRate.toFixed(1)} <span className="text-slate-500 font-normal">/ kWh</span></span>
          </div>
        </div>

        <span className="text-[10px] uppercase font-mono py-1 px-2.5 rounded bg-slate-950 text-emerald-400 font-bold tracking-wider leading-none">
          Active
        </span>
      </div>

      {/* Tabs list controls */}
      <div className="bg-slate-900 p-1 border border-slate-800/80 rounded-xl grid grid-cols-3 gap-1" id="electricity-operations-tabs">
        <button
          id="op-tab-reading"
          onClick={() => { setActiveTab('reading'); resetMessages(); }}
          className={`py-2 text-[10px] font-semibold uppercase font-mono tracking-wide rounded-lg cursor-pointer transition-colors ${
            activeTab === 'reading' ? 'bg-slate-950 text-emerald-450 font-bold border border-slate-850' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Read Meter
        </button>
        
        <button
          id="op-tab-token"
          onClick={() => { setActiveTab('token'); resetMessages(); }}
          className={`py-2 text-[10px] font-semibold uppercase font-mono tracking-wide rounded-lg cursor-pointer transition-colors ${
            activeTab === 'token' ? 'bg-slate-950 text-emerald-450 font-bold border border-slate-850' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Issue Token
        </button>

        <button
          id="op-tab-tariff"
          onClick={() => { setActiveTab('tariff'); resetMessages(); }}
          className={`py-2 text-[10px] font-semibold uppercase font-mono tracking-wide rounded-lg cursor-pointer transition-colors ${
            activeTab === 'tariff' ? 'bg-slate-950 text-emerald-450 font-bold border border-slate-850' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Tariffs
        </button>
      </div>

      {/* General validation alerts */}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex gap-2 items-center">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex gap-2 items-center">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span className="break-all">{success}</span>
        </div>
      )}

      {/* Form A: Log Meter Reading */}
      {activeTab === 'reading' && (
        <form onSubmit={submitReading} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col gap-4 animate-fade-in" id="meter-reading-form">
          <div className="flex items-center gap-2 mb-1 border-b border-slate-800/80 pb-2">
            <Cpu className="h-4 w-4 text-emerald-450" />
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400">Record Sub-Meter Index</h3>
          </div>

          {tenants.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-4">No occupants require sub-meter tracking. Register one first!</p>
          ) : (
            <div className="flex flex-col gap-3.5 font-sans">
              <div>
                <label className="block text-[11px] font-mono uppercase text-slate-400 tracking-wider mb-1">Select Occupant Flat</label>
                <select
                  id="read-tenant-select"
                  value={readTenantId}
                  onChange={(e) => setReadTenantId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 outline-none rounded-xl py-2.5 px-3 text-xs text-white"
                >
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.room_label} - {t.full_name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-slate-400 tracking-wider mb-1">Current index (kWh)</label>
                  <input
                    id="read-amount-input"
                    type="number"
                    required
                    placeholder="e.g. 10250"
                    value={readKwh === 0 ? '' : readKwh}
                    onChange={(e) => setReadKwh(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 outline-none rounded-xl py-2.5 px-3.5 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-slate-400 tracking-wider mb-1">Reading Date</label>
                  <input
                    id="read-date-input"
                    type="date"
                    required
                    value={readDate}
                    onChange={(e) => setReadDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 outline-none rounded-xl py-2.5 px-3 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-slate-400 tracking-wider mb-1">Inspection Notes</label>
                <input
                  id="read-notes-input"
                  type="text"
                  placeholder="e.g. Meter seal intact, clean connection"
                  value={readNotes}
                  onChange={(e) => setReadNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 outline-none rounded-xl py-2.5 px-3.5 text-xs text-white"
                />
              </div>

              <button
                id="submit-reading-btn"
                type="submit"
                disabled={isLoading}
                className="w-full py-3 mt-1.5 bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-440 disabled:opacity-50 tracking-wide rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                {isLoading ? 'Storing Index...' : 'Write Index Log'}
              </button>
            </div>
          )}
        </form>
      )}

      {/* Form B: Issue Sub-meter Token */}
      {activeTab === 'token' && (
        <form onSubmit={submitTokenPurchase} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col gap-4 animate-fade-in" id="issue-electricity-token-form">
          <div className="flex items-center gap-2 mb-1 border-b border-slate-800/80 pb-2">
            <Cpu className="h-4 w-4 text-emerald-450" />
            <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400">Issue Meter Top-up Token</h3>
          </div>

          {tenants.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-4">No electricity occupants registered.</p>
          ) : (
            <div className="flex flex-col gap-3.5">
              <div>
                <label className="block text-[11px] font-mono uppercase text-slate-400 tracking-wider mb-1">Target Resident Flat</label>
                <select
                  id="tok-tenant-select"
                  value={tokTenantId}
                  onChange={(e) => setTokTenantId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 outline-none rounded-xl py-2.5 px-3 text-xs text-white"
                >
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.room_label} - {t.full_name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-slate-400 tracking-wider mb-1">Amount Owed / Paid (₦)</label>
                  <input
                    id="tok-amount-input"
                    type="number"
                    required
                    placeholder="e.g. 5000"
                    value={tokAmount === 0 ? '' : tokAmount}
                    onChange={(e) => setTokAmount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 outline-none rounded-xl py-2.5 px-3.5 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-slate-400 tracking-wider mb-1">Receipt Date</label>
                  <input
                    id="tok-date-input"
                    type="date"
                    required
                    value={tokDate}
                    onChange={(e) => setTokDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 outline-none rounded-xl py-2.5 px-3 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-slate-400 tracking-wider mb-1">Manual PIN Reference (Optional)</label>
                <input
                  id="tok-pin-input"
                  type="text"
                  placeholder="Auto-generated if left empty"
                  value={tokPin}
                  onChange={(e) => setTokPin(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 outline-none rounded-xl py-2.5 px-3.5 text-xs text-white font-mono"
                />
              </div>

              {tokAmount > 0 && (
                <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/15 text-[11px] text-emerald-400 font-mono">
                  Units auto calculation: ₦{tokAmount} / ₦{currentRate.toFixed(1)} rate = <span className="font-bold">{(tokAmount / currentRate).toFixed(1)} kWh</span> to credit.
                </div>
              )}

              <button
                id="submit-token-btn"
                type="submit"
                disabled={isLoading}
                className="w-full py-3 mt-1.5 bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-440 disabled:opacity-50 tracking-wide rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                {isLoading ? 'Generating token...' : 'Confirm and Issue Token'}
              </button>
            </div>
          )}
        </form>
      )}

      {/* Form C: Manage Tariff Coefficient */}
      {activeTab === 'tariff' && (
        <div className="flex flex-col gap-5">
          <form onSubmit={submitTariffRate} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col gap-4 animate-fade-in" id="adjust-tariff-rate-form">
            <div className="flex items-center gap-2 mb-1 border-b border-slate-800/80 pb-2">
              <TrendingUp className="h-4 w-4 text-emerald-455" />
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400">Reconfigure Power Tariff</h3>
            </div>

            <div className="flex flex-col gap-3.5 font-sans">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-slate-400 tracking-wider mb-1">Tariff Rate (₦/kWh)</label>
                  <input
                    id="tar-amount-input"
                    type="number"
                    step="0.1"
                    required
                    value={tarAmount}
                    onChange={(e) => setTarAmount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 outline-none rounded-xl py-2.5 px-3.5 text-xs text-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-slate-400 tracking-wider mb-1">Effective from Date</label>
                  <input
                    id="tar-date-input"
                    type="date"
                    required
                    value={tarDate}
                    onChange={(e) => setTarDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 outline-none rounded-xl py-2.5 px-3 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-slate-400 tracking-wider mb-1">Alteration log Note</label>
                <input
                  id="tar-note-input"
                  type="text"
                  required
                  placeholder="e.g. Aligned with Eko Electricity grid adjustment"
                  value={tarNote}
                  onChange={(e) => setTarNote(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 outline-none rounded-xl py-2.5 px-3.5 text-xs text-white"
                />
              </div>

              <button
                id="submit-tariff-btn"
                type="submit"
                disabled={isLoading}
                className="w-full py-3 mt-1.5 bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-440 disabled:opacity-50 tracking-wide rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                {isLoading ? 'Updating tariff...' : 'Publish Rate Schedule'}
              </button>
            </div>
          </form>

          {/* Historical schedule index */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs uppercase tracking-wider font-mono font-bold text-slate-400 px-1">
              Historical Tariff Schedules ({rateHistory.length})
            </h3>

            <div className="bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden divide-y divide-slate-800/80" id="tariffs-list-registry">
              {rateHistory.map(hr => (
                <div key={hr.id} className="p-3.5 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-slate-205 block text-xs">₦{hr.rate_per_kwh.toFixed(1)} / kWh</span>
                    <span className="text-[10px] text-slate-450 mt-1 block">{hr.note}</span>
                  </div>
                  <div className="text-right flex flex-col gap-1 items-end">
                    <span className="text-[10px] font-semibold text-slate-500 font-mono">
                      {new Date(hr.effective_from).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
