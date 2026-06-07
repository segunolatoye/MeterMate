'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, Plus, X, ArrowRight, UserPlus, Zap, Droplets, AlertCircle, Sparkles } from 'lucide-react';
import { Profile } from '@/lib/types';
import { TenantSummary } from '@/lib/calculations';

interface TenantWithSummary extends Profile {
  summary?: TenantSummary;
}

interface TenantsClientViewProps {
  initialTenants: TenantWithSummary[];
}

export default function TenantsClientView({ initialTenants }: TenantsClientViewProps) {
  const router = useRouter();
  const [tenants, setTenants] = useState<TenantWithSummary[]>(initialTenants);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'electricity_tenant' | 'water_only_tenant'>('electricity_tenant');
  const [roomLabel, setRoomLabel] = useState('');
  const [meterId, setMeterId] = useState('');
  const [depositAmount, setDepositAmount] = useState<number>(15000);


  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: fullName,
          email,
          phone,
          role,
          room_label: roomLabel,
          meter_id: role === 'electricity_tenant' ? meterId : undefined,
          deposit_amount: depositAmount,

        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Registration failed.');
      }

      // Success! Reload standard state & reset
      router.refresh();
      setShowAddForm(false);
      
      // Clear form inputs
      setFullName('');
      setEmail('');
      setPhone('');
      setRole('electricity_tenant');
      setRoomLabel('');
      setMeterId('');
      setDepositAmount(15000);
      setInitialReading(0);

      // Trigger hot state reload
      const reloadRes = await fetch('/api/tenants');
      if (reloadRes.ok) {
        const reloadData = await reloadRes.json();
        setTenants(reloadData.tenants);
      }

    } catch (err: any) {
      setError(err.message || 'Failed to register tenant.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatNaira = (val?: number) => {
    if (val === undefined) return '₦0';
    return (val >= 0 ? '+' : '-') + '₦' + Math.abs(val).toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  return (
    <div className="flex flex-col gap-5" id="tenants-client-layout">
      
      {/* Quick registration trigger */}
      <button
        id="toggle-add-tenant-form-btn"
        onClick={() => {
          setShowAddForm(!showAddForm);
          setError(null);
        }}
        className="w-full py-3.5 bg-slate-900 hover:bg-slate-850 text-emerald-400 font-semibold rounded-2xl border border-slate-800 flex items-center justify-center gap-2 transition-all cursor-pointer"
      >
        {showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        {showAddForm ? 'Cancel Registration' : 'Register New Occupant'}
      </button>

      {/* Expandable ADD occupant form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-emerald-500/15 rounded-3xl p-5 flex flex-col gap-4 animate-fade-in" id="add-tenant-form">
          <div className="flex items-center gap-2 mb-1.5 px-0.5">
            <UserPlus className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-100">Occupant Particulars</h3>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex gap-2 items-center">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col gap-3.5">
            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-400 tracking-wider mb-1">Full Name</label>
              <input
                id="tenant-name-input"
                type="text"
                required
                placeholder="e.g. Chukwuma Okafor"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 outline-none rounded-xl py-2.5 px-3.5 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono uppercase text-slate-400 tracking-wider mb-1">Email (Login ID)</label>
                <input
                  id="tenant-email-input"
                  type="email"
                  required
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 outline-none rounded-xl py-2.5 px-3.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-slate-400 tracking-wider mb-1">Phone Number</label>
                <input
                  id="tenant-phone-input"
                  type="text"
                  placeholder="+23480..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 outline-none rounded-xl py-2.5 px-3.5 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono uppercase text-slate-400 tracking-wider mb-1">Room / Flat Unit</label>
                <input
                  id="tenant-room-input"
                  type="text"
                  required
                  placeholder="e.g. Flat 4B, Room 1"
                  value={roomLabel}
                  onChange={(e) => setRoomLabel(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 outline-none rounded-xl py-2.5 px-3.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-slate-400 tracking-wider mb-1">Occupant Type</label>
                <select
                  id="tenant-role-select"
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 outline-none rounded-xl py-2.5 px-3 text-xs text-white"
                >
                  <option value="electricity_tenant">Electricity + Water</option>
                  <option value="water_only_tenant">Water Only (Flat Rate)</option>
                </select>
              </div>
            </div>

            {/* Custom Meter input segment (conditional on Role) */}
            {role === 'electricity_tenant' && (
              <>
                <div className="grid grid-cols-2 gap-3 animate-fade-in">
                <div>
                  <label className="block text-[11px] font-mono uppercase text-slate-400 tracking-wider mb-1">Sub-Meter ID</label>
                  <input
                    id="tenant-meter-input"
                    type="text"
                    placeholder="MTR-99881 (Auto)"
                    value={meterId}
                    onChange={(e) => setMeterId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 outline-none rounded-xl py-2.5 px-3.5 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono uppercase text-slate-400 tracking-wider mb-1">Security Deposit (₦)</label>
                  <input
                    id="tenant-deposit-input"
                    type="number"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 outline-none rounded-xl py-2.5 px-3.5 text-xs text-white font-mono"
                  />
                </div>
              </div>

              </>
            )}
          </div>

          <button
            id="submit-register-tenant-btn"
            type="submit"
            disabled={isLoading}
            className="w-full py-3 mt-1.5 bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 disabled:opacity-50 tracking-wide rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {isLoading ? 'Issuing Invite Link...' : 'Confirm Registration'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      )}

      {/* Roster Listing */}
      <div className="flex flex-col gap-3">
        <h3 className="text-xs uppercase tracking-wider font-mono font-bold text-slate-400 block px-1">
          Registered Occupants ({tenants.length})
        </h3>

        <div className="flex flex-col gap-3" id="tenant-profiles-listing-stack">
          {tenants.map(tenant => {
            const elecBal = tenant.summary?.electricityBalance || 0;
            const waterPending = tenant.summary?.outstandingWaterCount || 0;

            return (
              <button
                key={tenant.id}
                id={`tenant-row-${tenant.id}`}
                onClick={() => router.push(`/admin/tenants/${tenant.id}`)}
                className="p-4 bg-slate-900 border border-slate-850 hover:border-slate-800 text-left rounded-3xl flex justify-between items-center text-xs gap-3.5 transition-all cursor-pointer active:scale-98"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`h-11 w-11 rounded-2xl border flex items-center justify-center shrink-0 ${
                    tenant.role === 'electricity_tenant' 
                      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/15' 
                      : 'text-sky-400 bg-sky-500/10 border-sky-500/15'
                  }`}>
                    {tenant.role === 'electricity_tenant' ? <Zap className="h-5 w-5" /> : <Droplets className="h-5 w-5" />}
                  </div>

                  <div className="min-w-0">
                    <span className="font-bold text-sm text-slate-100 flex items-center gap-1.5 leading-none">
                      {tenant.room_label}
                    </span>
                    <span className="text-xs text-slate-400 truncate max-w-[170px] mt-1 block">
                      {tenant.full_name}
                    </span>
                    <div className="flex gap-2.5 mt-2 flex-wrap">
                      {tenant.role === 'electricity_tenant' && tenant.meter_id && (
                        <span className="font-mono text-[9px] text-slate-500 p-0.5 rounded bg-slate-950 border border-slate-850 leading-none">
                          Sub-Meter: {tenant.meter_id}
                        </span>
                      )}
                      {waterPending > 0 ? (
                        <span className="font-mono text-[9px] font-bold text-red-400 bg-red-500/10 px-1 py-0.5 rounded leading-none border border-red-500/15">
                          Water overdue ({waterPending}mo)
                        </span>
                      ) : (
                        <span className="font-mono text-[9px] text-emerald-450 bg-emerald-500/10 px-1 py-0.5 rounded leading-none border border-emerald-500/15">
                          Water clean
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Ledger balances column */}
                <div className="text-right flex flex-col gap-1 shrink-0">
                  {tenant.role === 'electricity_tenant' && (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[9px] uppercase font-mono text-slate-500 mt-1">
                        Power Balance:
                      </span>
                      <span className={`font-mono text-xs font-bold ${elecBal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatNaira(elecBal)}
                      </span>
                    </div>
                  )}

                  <span className="text-[10px] text-slate-500 font-mono mt-2 flex items-center justify-end gap-0.5">
                    Records <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
