'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Lock, 
  MapPin, 
  Cpu, 
  Mail, 
  Phone, 
  Edit2, 
  PlusCircle, 
  CheckCircle, 
  AlertCircle,
  FileText,
  Clock,
  Briefcase,
  Zap,
  Droplets,
  ShieldCheck,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import { Profile } from '@/lib/types';
import { TenantSummary } from '@/lib/calculations';

interface TenantDetailClientViewProps {
  summary: TenantSummary;
}

export default function TenantDetailClientView({ summary }: TenantDetailClientViewProps) {
  const router = useRouter();
  const { profile, readings, purchases, payments, waterContributions } = summary;

  // Tab controls: logs vs edit vs log_payment
  const [activeTab, setActiveTab] = useState<'logs' | 'edit' | 'pay'>('logs');

  // Profile Edit State
  const [fullName, setFullName] = useState(profile.full_name);
  const [email, setEmail] = useState(profile.email);
  const [phone, setPhone] = useState(profile.phone);
  const [meterId, setMeterId] = useState(profile.meter_id || '');

  // Log Payment State
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payType, setPayType] = useState<'electricity' | 'water' | 'deposit'>('electricity');
  const [payNote, setPayNote] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const formatNairaVal = (val: number) => {
    return '₦' + Math.abs(val).toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const handleDeleteOccupant = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setShowDeleteConfirm(false);

    try {
      const res = await fetch(`/api/tenants/${profile.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to delete occupant.');
      }

      setSuccess('Occupant removed successfully. Redirecting...');
      setTimeout(() => {
        router.push('/admin/tenants');
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to remove occupant.');
      setIsLoading(false);
    }
  };

  const handleEditProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/tenants/${profile.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: fullName,
          email,
          phone,
          meter_id: profile.role === 'electricity_tenant' ? meterId : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Profile edit failed.');
      }

      setSuccess('Occupant profile updated successfully.');
      router.refresh();
      setTimeout(() => setSuccess(null), 1500);

    } catch (err: any) {
      setError(err.message || 'Failed to edit profile.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (payAmount <= 0) {
      setError('Amount must be positive.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/payments/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenant_id: profile.id,
          amount: payAmount,
          payment_type: payType,
          note: payNote || `Logged Cash ${payType} payment`
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to record manual receipt.');
      }

      setSuccess(`Successfully logged ${formatNairaVal(payAmount)} manual cash payment!`);
      router.refresh();
      
      // Reset payment variables
      setPayAmount(0);
      setPayNote('');
      setTimeout(() => {
        setSuccess(null);
        setActiveTab('logs');
      }, 1500);

    } catch (err: any) {
      setError(err.message || 'Failed to log payment.');
    } finally {
      setIsLoading(false);
    }
  };

  // Combine actions for logging lists
  return (
    <div className="flex flex-col gap-5" id="tenant-details-client-root-layout">
      {/* Back to list trigger */}
      <button
        id="back-to-tenants-list"
        onClick={() => router.push('/admin/tenants')}
        className="self-start text-xs text-slate-400 hover:text-white flex items-center gap-1.5 cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" /> Back to occupants
      </button>

      {/* Profile summary tile */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4.5 flex flex-col gap-2 relative overflow-hidden">
        <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-500 block leading-none">
          Active Occupant
        </span>
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-1.5 leading-tight mt-1.5">
          {profile.room_label} <span className="text-slate-500 font-normal">|</span> <span className="font-semibold text-slate-300 text-sm">{profile.full_name}</span>
        </h2>
        
        {profile.role === 'electricity_tenant' && (
          <p className="text-xs text-slate-400 font-mono mt-1">
            Bal: <span className={`font-bold ${summary.electricityBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {summary.electricityBalance >= 0 ? '+' : ''}{formatNairaVal(summary.electricityBalance)}
            </span>
          </p>
        )}
      </div>

      {/* Tabs configuration bar */}
      <div className="bg-slate-900 p-1 border border-slate-800/80 rounded-xl grid grid-cols-3 gap-1" id="tenant-actions-tabs">
        <button
          id="tab-view-logs"
          onClick={() => setActiveTab('logs')}
          className={`py-2 text-[11px] font-semibold rounded-lg cursor-pointer transition-colors ${
            activeTab === 'logs' ? 'bg-slate-950 text-emerald-400 font-bold border border-slate-850' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          All Logs
        </button>
        <button
          id="tab-edit-profile"
          onClick={() => setActiveTab('edit')}
          className={`py-2 text-[11px] font-semibold rounded-lg cursor-pointer transition-colors ${
            activeTab === 'edit' ? 'bg-slate-950 text-emerald-400 font-bold border border-slate-850' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Edit Profile
        </button>
        <button
          id="tab-log-payment"
          onClick={() => setActiveTab('pay')}
          className={`py-2 text-[11px] font-semibold rounded-lg cursor-pointer transition-colors ${
            activeTab === 'pay' ? 'bg-slate-950 text-emerald-400 font-bold border border-slate-850' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Log Cash
        </button>
      </div>

      {/* Error & Success indicators */}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex gap-2 items-center">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex gap-2 items-center">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* SUB-VIEW: 1. LOGS & TRANSACTION HISTORY */}
      {activeTab === 'logs' && (
        <div className="flex flex-col gap-5" id="records-tab-view">
          
          {/* Subview Section A: Meter Readings (only electricity) */}
          {profile.role === 'electricity_tenant' && (
            <div className="flex flex-col gap-3">
              <h3 className="text-xs uppercase tracking-wider font-mono font-bold text-slate-400 px-1">
                Sub-Meter kWh Read History ({readings.length})
              </h3>
              
              {readings.length === 0 ? (
                <div className="p-5 text-center text-xs text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl italic">No readings recorded.</div>
              ) : (
                <div className="bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden divide-y divide-slate-800">
                  {[...readings].reverse().map(r => (
                    <div key={r.id} className="p-3 px-4 flex justify-between items-center text-xs">
                      <div>
                        <div className="font-bold font-mono text-slate-250">{r.reading_kwh} kWh</div>
                        <span className="text-[10px] text-slate-400 mt-1 block">{r.notes || 'Routine check reading'}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        {new Date(r.reading_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Subview Section B: Token Purchases (only electricity) */}
          {profile.role === 'electricity_tenant' && (
            <div className="flex flex-col gap-3 animate-fade-in">
              <h3 className="text-xs uppercase tracking-wider font-mono font-bold text-slate-400 px-1">
                Issued Electricity Tokens ({purchases.length})
              </h3>
              
              {purchases.length === 0 ? (
                <div className="p-5 text-center text-xs text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl italic">No token history found.</div>
              ) : (
                <div className="flex flex-col gap-3">
                  {[...purchases].reverse().map(p => (
                    <div key={p.id} className="p-3.5 bg-slate-900 border border-slate-850 rounded-2xl flex flex-col gap-2">
                      <div className="flex justify-between items-center text-xs border-b border-slate-800/80 pb-2">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-mono">Issued KW:</span>
                          <span className="font-bold text-emerald-450 text-sm block mt-0.5">{p.units_received.toFixed(1)} kWh</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block font-mono">Cost:</span>
                          <span className="font-semibold text-slate-100 block mt-0.5">{formatNairaVal(p.amount_paid)}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-[9px] text-slate-500 block uppercase font-mono">Sub-meter Pin:</span>
                          <span className="text-sm font-black text-indigo-400 font-mono tracking-widest">{p.token_ref}</span>
                        </div>
                        <span className="text-[9px] font-mono text-slate-500 mt-2.5">
                          {new Date(p.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Subview Section C: Payments ledger */}
          <div className="flex flex-col gap-3 animate-fade-in">
            <h3 className="text-xs uppercase tracking-wider font-mono font-bold text-slate-400 px-1">
              Payment Logs Ledger ({payments.length})
            </h3>
            
            {payments.length === 0 ? (
              <div className="p-5 text-center text-xs text-slate-500 bg-slate-900 border border-slate-800 rounded-2xl italic">No verified records.</div>
            ) : (
              <div className="bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden divide-y divide-slate-800/80">
                {[...payments].reverse().map(p => (
                  <div key={p.id} className="p-3.5 flex justify-between items-center text-xs">
                    <div>
                      <div className="font-bold text-slate-200 capitalize">
                        {p.payment_type} ({p.payment_method.replace('paystack_', '')})
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block truncate max-w-[210px]">{p.note || 'No transaction note'}</span>
                    </div>
                    <div className="text-right flex flex-col gap-0.5">
                      <span className="font-mono font-bold text-slate-100">{formatNairaVal(p.amount)}</span>
                      <span className={`text-[8.5px] uppercase font-mono font-bold ${p.status === 'confirmed' ? 'text-emerald-450' : 'text-amber-500'}`}>
                        {p.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-VIEW: 2. EDIT PROFILE */}
      {activeTab === 'edit' && (
        <form onSubmit={handleEditProfile} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col gap-4 animate-fade-in" id="edit-profile-form">
          <h3 className="text-xs uppercase tracking-wider font-mono font-bold text-slate-400 border-b border-slate-800 pb-2 flex items-center gap-1.5">
            <Edit2 className="h-4 w-4 text-emerald-450" /> Modify Occupant Fields
          </h3>

          <div className="flex flex-col gap-3.5">
            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-400 tracking-wider mb-1">Full Name</label>
              <input
                id="edit-name-input"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 outline-none rounded-xl py-2.5 px-3.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-400 tracking-wider mb-1">Email address</label>
              <input
                id="edit-email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 outline-none rounded-xl py-2.5 px-3.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-400 tracking-wider mb-1">Phone number</label>
              <input
                id="edit-phone-input"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 outline-none rounded-xl py-2.5 px-3.5 text-xs text-white"
              />
            </div>

            {profile.role === 'electricity_tenant' && (
              <div>
                <label className="block text-[11px] font-mono uppercase text-slate-400 tracking-wider mb-1">Sub-Meter ID</label>
                <input
                  id="edit-meter-input"
                  type="text"
                  value={meterId}
                  onChange={(e) => setMeterId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 outline-none rounded-xl py-2.5 px-3.5 text-xs text-white font-mono"
                />
              </div>
            )}
          </div>

          <button
            id="submit-edit-profile-btn"
            type="submit"
            disabled={isLoading}
            className="w-full py-3 mt-1.5 bg-emerald-500 hover:bg-emerald-450 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            {isLoading ? 'Modifying Records...' : 'Save Profile Adjustments'}
          </button>

          <div className="mt-6 pt-5 border-t border-slate-800/85">
            <h4 className="text-[10px] font-mono uppercase tracking-wider text-rose-450 font-bold mb-2">Danger Zone</h4>
            <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
              Remove this occupant's profile, prepaid meters configurations, and all invoice history from active ledgers.
            </p>
            <button
              id="trigger-delete-occupant-btn"
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full py-3 bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 hover:border-red-500/30 text-red-400 font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all"
            >
              Remove Occupant from Compound
            </button>
          </div>
        </form>
      )}

      {/* Overlaid Native iOS Style AlertSheet Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4 animate-fade-in" id="ios-delete-alert-sheet">
          <div className="w-full max-w-sm bg-neutral-900/95 border border-neutral-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 text-center">
            <div className="flex flex-col items-center gap-2">
              <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-100">Remove Occupant?</h3>
              <p className="text-xs text-neutral-400 leading-relaxed max-w-[260px] mx-auto">
                Are you sure you want to remove <strong className="text-slate-200">{profile.full_name}</strong>? All sub-meter readings and token transactions will be deleted permanently.
              </p>
            </div>

            <div className="flex flex-col gap-2 mt-2">
              <button
                id="confirm-delete-occupant-btn"
                onClick={handleDeleteOccupant}
                className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Delete Occupant
              </button>
              <button
                id="cancel-delete-occupant-btn"
                onClick={() => setShowDeleteConfirm(false)}
                className="w-full py-3 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 font-medium rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW: 3. LOG MANUAL PAYMENT */}
      {activeTab === 'pay' && (
        <form onSubmit={handleLogPayment} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col gap-4 animate-fade-in" id="log-manual-payment-form">
          <h3 className="text-xs uppercase tracking-wider font-mono font-bold text-slate-400 border-b border-slate-800 pb-2 flex items-center gap-1.5">
            <PlusCircle className="h-4 w-4 text-indigo-400" /> Log Cash / Manual payment
          </h3>

          <div className="flex flex-col gap-3.5">
            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-400 tracking-wider mb-1">Ledger Allocation</label>
              <select
                id="manual-pay-type-select"
                value={payType}
                onChange={(e) => setPayType(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 outline-none rounded-xl py-2.5 px-3 text-xs text-white"
              >
                {profile.role === 'electricity_tenant' && <option value="electricity">Electricity / Prepaid Top-up</option>}
                <option value="water">Water Utility Levy</option>
                <option value="deposit">Security Deposit Escrow</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-400 tracking-wider mb-1">Billing Amount (₦)</label>
              <input
                id="manual-pay-amount-input"
                type="number"
                required
                value={payAmount === 0 ? '' : payAmount}
                onChange={(e) => setPayAmount(Number(e.target.value))}
                placeholder="₦3,000"
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 outline-none rounded-xl py-2.5 px-3.5 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-slate-400 tracking-wider mb-1">Internal Log Note</label>
              <input
                id="manual-pay-note-input"
                type="text"
                required
                placeholder="e.g. Paid cash directly to landlord Segun for June water"
                value={payNote}
                onChange={(e) => setPayNote(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 outline-none rounded-xl py-2.5 px-3.5 text-xs text-white placeholder-slate-500"
              />
            </div>
          </div>

          <button
            id="submit-manual-payout-btn"
            type="submit"
            disabled={isLoading}
            className="w-full py-3 mt-1.5 bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 disabled:opacity-50 tracking-wide rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {isLoading ? 'Writing Ledger...' : 'Commit and Audit Receipt'}
          </button>
        </form>
      )}

    </div>
  );
}
