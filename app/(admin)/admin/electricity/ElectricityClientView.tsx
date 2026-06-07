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
import { Profile, ElectricityRate, MeterReading } from '@/lib/types';

interface ElectricityClientViewProps {
  tenants: Profile[];
  currentRate: number;
  rateHistory: ElectricityRate[];
  readings?: MeterReading[];
}

export default function ElectricityClientView({
  tenants,
  currentRate,
  rateHistory,
  readings = [],
}: ElectricityClientViewProps) {
  const router = useRouter();

  // Sub tabs: reading | token | tariff
  const [activeTab, setActiveTab] = useState<'reading' | 'token' | 'tariff'>('reading');
  const [expandedTenantHistory, setExpandedTenantHistory] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // LOG READING FORM
  const [readTenantId, setReadTenantId] = useState(tenants[0]?.id || '');
  const [readKwh, setReadKwh] = useState<number>(0);
  const [readDate, setReadDate] = useState(new Date().toISOString().split('T')[0]);
  const [readNotes, setReadNotes] = useState('');



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
    if (isLoading) return;
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

  const deleteReading = async (id: string) => {
    if (isLoading) return;
    if (!confirm('Are you sure you want to delete this meter reading log?')) return;
    
    setIsLoading(true);
    resetMessages();

    try {
      const res = await fetch(`/api/readings/log/${id}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to delete reading.');
      }

      setSuccess('Reading deleted successfully.');
      router.refresh();

    } catch (err: any) {
      setError(err.message || 'Network error.');
    } finally {
      setIsLoading(false);
    }
  };



  const submitTariffRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
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
      <div className="bg-slate-900 p-1 border border-slate-800/80 rounded-xl grid grid-cols-2 gap-1" id="electricity-operations-tabs">
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
        <div className="flex flex-col gap-5 animate-fade-in">
        <form onSubmit={submitReading} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col gap-4" id="meter-reading-form">
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
        
        {/* Occupant Reading History List */}
        <div className="flex flex-col gap-3 mt-2">
          <h3 className="text-xs uppercase tracking-wider font-mono font-bold text-slate-400 px-1">
            Occupant Reading History
          </h3>
          
          <div className="bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden flex flex-col">
            {tenants.map(tenant => {
              const tenantReadings = readings
                .filter(r => r.tenant_id === tenant.id)
                .sort((a, b) => new Date(b.reading_date).getTime() - new Date(a.reading_date).getTime());
                
              const lastReading = tenantReadings[0];
              const isExpanded = expandedTenantHistory === tenant.id;

              return (
                <div key={tenant.id} className="border-b border-slate-800/80 last:border-0">
                  <div 
                    className="p-3.5 flex justify-between items-center cursor-pointer hover:bg-slate-800/40 transition-colors"
                    onClick={() => setExpandedTenantHistory(isExpanded ? null : tenant.id)}
                  >
                    <div>
                      <span className="font-bold text-slate-200 block text-xs">{tenant.room_label}</span>
                      <span className="text-[10px] text-slate-500 mt-0.5 block">{tenant.full_name}</span>
                    </div>
                    <div className="text-right flex items-center gap-4">
                      {lastReading ? (
                        <div className="flex flex-col items-end">
                          <span className="text-xs font-mono font-bold text-emerald-400">
                            {lastReading.reading_kwh} kWh
                          </span>
                          <span className="text-[9px] text-slate-500 font-mono mt-0.5">
                            {new Date(lastReading.reading_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-600 bg-slate-950 px-2 py-1 rounded font-mono">No Logs</span>
                      )}
                      <div className={`p-1 rounded-md text-slate-500 transition-transform ${isExpanded ? 'rotate-180 bg-slate-800' : ''}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                      </div>
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="bg-slate-950 p-3 pt-0 border-t border-slate-800/50">
                      {tenantReadings.length === 0 ? (
                        <div className="text-center py-4 text-[10px] text-slate-500 italic">No historical readings found for this occupant.</div>
                      ) : (
                        <table className="w-full text-left mt-2">
                          <thead>
                            <tr className="text-[9px] font-mono text-slate-500 uppercase border-b border-slate-800">
                              <th className="pb-1.5 font-medium">Date</th>
                              <th className="pb-1.5 font-medium text-right">Reading (kWh)</th>
                              <th className="pb-1.5 font-medium pl-4">Notes</th>
                              <th className="pb-1.5 font-medium text-right pr-2">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/50">
                            {tenantReadings.map(r => (
                              <tr key={r.id} className="text-[10px] hover:bg-slate-900/50 transition-colors">
                                <td className="py-2.5 font-mono text-slate-300">
                                  {new Date(r.reading_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </td>
                                <td className="py-2.5 text-right font-mono font-bold text-emerald-450">
                                  {r.reading_kwh}
                                </td>
                                <td className="py-2.5 pl-4 text-slate-400 truncate max-w-[120px]" title={r.notes}>
                                  {r.notes || '-'}
                                </td>
                                <td className="py-2.5 text-right">
                                  <button 
                                    onClick={() => deleteReading(r.id)}
                                    disabled={isLoading}
                                    className="p-1.5 text-red-400/70 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors disabled:opacity-50"
                                    title="Delete Reading"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        </div>
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
