'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Check, 
  X, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  CreditCard, 
  ArrowUpRight, 
  Building, 
  SlidersHorizontal,
  Wallet
} from 'lucide-react';
import { Payment } from '@/lib/types';

interface ExtendedPayment extends Payment {
  room_label: string;
  full_name: string;
}

interface PaymentsClientViewProps {
  initialPayments: ExtendedPayment[];
}

export default function PaymentsClientView({ initialPayments }: PaymentsClientViewProps) {
  const router = useRouter();

  const [payments, setPayments] = useState<ExtendedPayment[]>(initialPayments);
  
  // Ledger sub category filter: pending | confirmed | all
  const [filterType, setFilterType] = useState<'pending' | 'confirmed' | 'all'>('pending');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const resetMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const handleAuditingAction = async (id: string, action: 'confirm' | 'reject') => {
    setIsLoading(true);
    resetMessages();

    try {
      const res = await fetch(`/api/payments/${id}/confirm`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Audit action declined by client API.');
      }

      setSuccess(`Audit entry ${action === 'confirm' ? 'accepted' : 'rejected'} successfully.`);
      router.refresh();

      // Refresh state from hot JSON mock
      const reloadRes = await fetch('/api/tenants'); // tenants trigger loads full DB
      if (reloadRes.ok) {
        window.location.reload();
      }

    } catch (err: any) {
      setError(err.message || 'Auditing transaction execution failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPayments = [...payments]
    .sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .filter(p => {
      if (filterType === 'all') return true;
      return p.status === filterType;
    });

  const formatNaira = (val: number) => {
    return '₦' + val.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };  return (
    <div className="flex flex-col gap-5 text-slate-100" id="payments-scr-manager">
      
      {/* Category control sliders */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] uppercase font-bold font-sans tracking-wide text-slate-550">
          Filter Settlement Sheets
        </label>
        
        <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex gap-1 shadow-sm" id="ledger-payments-filters-bar">
          <button
            id="filter-pay-pending"
            onClick={() => setFilterType('pending')}
            className={`flex-1 text-center py-2 text-[10px] font-bold font-sans tracking-wide uppercase rounded-lg cursor-pointer transition-all ${
              filterType === 'pending'
                ? 'bg-slate-950 text-slate-150 font-bold border border-slate-850 shadow-sm'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-950/40'
            }`}
          >
            Pending ({payments.filter(p => p.status === 'pending').length})
          </button>
 
          <button
            id="filter-pay-confirmed"
            onClick={() => setFilterType('confirmed')}
            className={`flex-1 text-center py-2 text-[10px] font-bold font-sans tracking-wide uppercase rounded-lg cursor-pointer transition-all ${
              filterType === 'confirmed'
                ? 'bg-slate-950 text-slate-150 font-bold border border-slate-850 shadow-sm'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-950/40'
            }`}
          >
            Ledger ({payments.filter(p => p.status === 'confirmed').length})
          </button>
 
          <button
            id="filter-pay-all"
            onClick={() => setFilterType('all')}
            className={`flex-1 text-center py-2 text-[10px] font-bold font-sans tracking-wide uppercase rounded-lg cursor-pointer transition-all ${
              filterType === 'all'
                ? 'bg-slate-950 text-slate-150 font-bold border border-slate-850 shadow-sm'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-950/40'
            }`}
          >
            All Logs
          </button>
        </div>
      </div>
 
      {/* Validation status banners */}
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
      )}
 
      {/* Primary Payment Cards Stack */}
      <div className="flex flex-col gap-3.5" id="admin-payments-stack">
        {filteredPayments.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500 bg-slate-900 border border-slate-800 rounded-3xl italic shadow-sm">
            Zero transactions matching active filters.
          </div>
        ) : (
          filteredPayments.map(p => {
            const isPending = p.status === 'pending';
            const isCard = p.payment_method === 'paystack_card';
            const isTransfer = p.payment_method === 'paystack_transfer';
 
            return (
              <div 
                key={p.id} 
                id={`audit-payment-tile-${p.id}`}
                className={`p-4 rounded-2xl flex flex-col gap-3.5 shadow-sm transition-all border ${
                  isPending && isTransfer 
                    ? 'border-amber-500/35 bg-amber-500/5' 
                    : 'border-slate-800 bg-slate-900'
                }`}
              >
                {/* Header: Name/Room & Amount */}
                <div className="flex justify-between items-start leading-none">
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-200 flex items-center gap-1.5 leading-none">
                      {p.room_label}
                    </h3>
                    <span className="text-[10px] text-slate-500 block mt-1 font-medium">{p.full_name}</span>
                  </div>
 
                  <span className="font-mono font-extrabold text-sm text-slate-150">
                    {formatNaira(p.amount)}
                  </span>
                </div>
 
                {/* Body metadata list */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 flex flex-col gap-2 text-[10px] text-slate-400 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold uppercase text-[9px]">Category Alloc:</span>
                    <span className="text-slate-205 uppercase font-extrabold">{p.payment_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold uppercase text-[9px]">Gateway Channel:</span>
                    <span className="text-slate-300 font-semibold">
                      {isCard ? 'Secure Debit Card' : isTransfer ? 'Bank Transfer' : 'Direct Cash'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-bold uppercase text-[9px]">Statement Ref:</span>
                    <span className="text-emerald-400 font-bold select-all truncate max-w-[170px]">{p.paystack_reference}</span>
                  </div>
                  {p.confirmed_by && (
                    <div className="flex justify-between border-t border-slate-800 pt-1.5 mt-0.5 animate-fade-in">
                      <span className="text-slate-500 font-bold uppercase text-[9px]">Auditee Sign:</span>
                      <span className="text-slate-300 font-bold">Admin approved</span>
                    </div>
                  )}
                </div>
 
                {/* Display payment description note */}
                <p className="text-[11px] text-slate-400 leading-normal px-1 italic">
                  &ldquo;{p.note || 'Regular balance replenishment credit'}&rdquo;
                </p>
 
                {/* Footer and Interactive Operational Options (Pendings Bank Transfer only) */}
                <div className="flex justify-between items-center pt-2.5 border-t border-slate-805">
                  <span className="text-[9px] font-mono text-slate-500 flex items-center gap-1 font-bold">
                    <Clock className="h-3 w-3 shrink-0" />
                    {new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
 
                  {p.status === 'pending' && p.payment_method === 'paystack_transfer' ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        id={`btn-reject-transfer-${p.id}`}
                        onClick={() => handleAuditingAction(p.id, 'reject')}
                        disabled={isLoading}
                        className="p-1 px-2.5 text-[9px] font-bold text-red-400 hover:bg-red-500/10 hover:border-red-500/20 bg-slate-900 border border-slate-800 rounded-lg cursor-pointer shadow-sm transition-all active:scale-95"
                      >
                        Reject
                      </button>
                      <button
                        id={`btn-confirm-transfer-${p.id}`}
                        onClick={() => handleAuditingAction(p.id, 'confirm')}
                        disabled={isLoading}
                        className="p-1 px-2.5 text-[9px] font-bold text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/20 bg-slate-900 border border-slate-800 rounded-lg cursor-pointer shadow-sm transition-all active:scale-95"
                      >
                        Confirm Transfer
                      </button>
                    </div>
                  ) : (
                    <span className={`text-[8.5px] font-mono font-bold uppercase py-0.5 px-2 rounded-full border ${
                      p.status === 'confirmed'
                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                        : p.status === 'pending'
                        ? 'bg-amber-500/10 border border-amber-500/25 text-amber-500'
                        : 'bg-red-500/10 border border-red-500/20 text-red-500'
                    }`}>
                      {p.status}
                    </span>
                  )}
                </div>
 
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
