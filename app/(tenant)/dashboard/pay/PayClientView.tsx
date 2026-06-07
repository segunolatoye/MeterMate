'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Droplets, ShieldCheck, CheckCircle2, RotateCcw, AlertCircle } from 'lucide-react';
import { Profile } from '@/lib/types';
import { TenantSummary } from '@/lib/calculations';
import PaystackButton from '@/components/PaystackButton';
import TransferForm from '@/components/TransferForm';

interface PayClientViewProps {
  user: Profile;
  summary: TenantSummary;
  initialMethod: string;
  initialType: string;
  bankDetails: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
}

export default function PayClientView({
  user,
  summary,
  initialMethod,
  initialType,
  bankDetails,
}: PayClientViewProps) {
  const router = useRouter();

  const initialPaymentType = initialType === 'water' ? 'water' : initialType === 'deposit' ? 'deposit' : 'electricity';

  // Selected Utility type
  const [paymentType, setPaymentType] = useState<'electricity' | 'water' | 'deposit' | 'prepayment'>(initialPaymentType);

  // Selected Method: card vs transfer vs escrow
  const [method, setMethod] = useState<'card' | 'transfer' | 'escrow'>(
    initialMethod === 'transfer' ? 'transfer' : 'card'
  );

  // Custom user input amount initialized lazily based on category
  const [amount, setAmount] = useState<number>(() => {
    if (initialPaymentType === 'water') {
      return summary.outstandingWaterAmount > 0 ? summary.outstandingWaterAmount : 3000;
    } else if (initialPaymentType === 'electricity') {
      return summary.electricityBalance < 0 ? Math.abs(summary.electricityBalance) : 10000;
    } else {
      return 5000;
    }
  });

  const [successStatus, setSuccessStatus] = useState<string | null>(null);
  const [isProcessingEscrow, setIsProcessingEscrow] = useState(false);

  const handleApplyEscrowDeposit = async () => {
    setIsProcessingEscrow(true);
    setSuccessStatus(null);
    try {
      const res = await fetch('/api/payments/apply-deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenant_id: user.id,
          target_utility: paymentType,
          amount: amount,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to apply deposit.');
      }

      setSuccessStatus(`Success! Applied ₦${amount.toLocaleString()} from escrow to ${paymentType}.`);
      router.refresh();

      setTimeout(() => {
        router.push('/dashboard/history');
      }, 1500);
    } catch (err: any) {
      console.error('Error applying escrow deposit:', err);
      setSuccessStatus(`Error: ${err.message}`);
      setTimeout(() => setSuccessStatus(null), 3000);
    } finally {
      setIsProcessingEscrow(false);
    }
  };

  const handlePaymentTypeChange = (type: 'electricity' | 'water' | 'deposit' | 'prepayment') => {
    setPaymentType(type);
    if (type === 'water') {
      setAmount(summary.outstandingWaterAmount > 0 ? summary.outstandingWaterAmount : 3000);
    } else if (type === 'electricity') {
      setAmount(summary.electricityBalance < 0 ? Math.abs(summary.electricityBalance) : 10000);
    } else {
      setAmount(5000);
    }
  };

  const handleCardSuccess = async (reference: string) => {
    setSuccessStatus('Connecting to secure banking network to verify reference...');
    try {
      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reference }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Verification failed.');
      }

      setSuccessStatus('Success! Transaction processed and balance credited.');
      router.refresh();
      
      // Delay routing to let them see success
      setTimeout(() => {
        router.push('/dashboard/history');
      }, 1500);

    } catch (err: any) {
      console.error('Error verifying checkout reference:', err);
      setSuccessStatus(`Simulated Check: ${err.message || 'Reference recorded.'}`);
      setTimeout(() => {
        router.push('/dashboard/history');
      }, 2000);
    }
  };

  const handleTransferSuccess = () => {
    // When receipt is logged, redirect them to historical dashboard ledger
    setTimeout(() => {
      router.push('/dashboard/history');
    }, 1000);
  };

  return (
    <div className="flex flex-col gap-5" id="pay-client-view-root">
      
      {/* 1. Utility Type Selector Category Slider */}
      <div className="flex flex-col gap-2">
        <label className="block text-[10px] font-bold font-sans uppercase text-slate-500 tracking-wide">
          1. Select Utility Category
        </label>
        <div className="grid grid-cols-3 gap-2" id="utility-payment-category-tabs">
          
          {/* Electricity Option (only if electricity tenant or admin/office) */}
          {user.role === 'electricity_tenant' || user.role === 'admin' ? (
            <button
              id="tab-pay-electricity"
              type="button"
              onClick={() => handlePaymentTypeChange('electricity')}
              className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1.5 cursor-pointer transition-all shadow-sm ${
                paymentType === 'electricity'
                  ? 'bg-emerald-500 border-emerald-500 text-white font-bold'
                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-705'
              }`}
            >
              <Zap className="h-4 w-4" />
              <span className="text-[11px] font-bold">Electricity</span>
            </button>
          ) : (
            <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl text-center flex flex-col items-center justify-center text-[10px] text-slate-600 line-through">
              Electricity
            </div>
          )}

          {/* Water Option */}
          <button
            id="tab-pay-water"
            type="button"
            onClick={() => handlePaymentTypeChange('water')}
            className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1.5 cursor-pointer transition-all shadow-sm ${
              paymentType === 'water'
                ? 'bg-emerald-500 border-emerald-500 text-white font-bold'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-705'
            }`}
          >
            <Droplets className="h-4 w-4" />
            <span className="text-[11px] font-bold">Water Levy</span>
          </button>

          {/* Deposit Option */}
          <button
            id="tab-pay-deposit"
            type="button"
            onClick={() => handlePaymentTypeChange('deposit')}
            className={`p-3 rounded-xl border text-center flex flex-col items-center gap-1.5 cursor-pointer transition-all shadow-sm ${
              paymentType === 'deposit'
                ? 'bg-emerald-500 border-emerald-500 text-white font-bold'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-705'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span className="text-[11px] font-bold">Deposit</span>
          </button>
        </div>
      </div>

      {/* 2. Amount Input Segement */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <label className="block text-[10px] font-bold font-sans uppercase text-slate-500 tracking-wide mb-2">
          2. Billing Amount (₦)
        </label>
        
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-base font-bold">₦</span>
          <input
            id="billing-custom-amount-input"
            type="number"
            step="any"
            required
            value={amount === 0 ? '' : amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            placeholder="0"
            className="w-full bg-slate-950 border border-slate-800/80 focus:border-emerald-500 outline-none rounded-xl py-3 pl-9 pr-4 text-base text-slate-200 font-mono font-bold transition-all"
          />
        </div>

        {/* Dynamic Context Helpers */}
        {paymentType === 'water' && (
          <p className="text-[11px] text-slate-400 mt-2.5">
            {summary.outstandingWaterAmount > 0 
              ? `Outstanding Balance matches June/May levies: ${summary.outstandingWaterCount} months unpaid.` 
              : 'Flat rate water levy contribution of ₦3,000/month.'}
          </p>
        )}
        {paymentType === 'electricity' && (
          <p className="text-[11px] text-slate-400 mt-2.5">
            {summary.electricityBalance < 0 
              ? `Recommended Outstanding Arrears: ${Math.abs(summary.electricityBalance).toLocaleString('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 })}.` 
              : 'Add arbitrary prepaid amount towards sub-meter token.'}
          </p>
        )}
        {paymentType === 'deposit' && (
          <p className="text-[11px] text-slate-400 mt-2.5">
            Add general security deposits which are held in secure landlord escrow.
          </p>
        )}
      </div>

      {/* 3. Payment Method Slider */}
      <div className="flex flex-col gap-2">
        <label className="block text-[10px] font-bold font-sans uppercase text-slate-500 tracking-wide">
          3. Choose Payment Method
        </label>
        
        <div className={`bg-slate-900 p-1 border border-slate-800 rounded-xl grid ${summary.depositHeld > 0 && paymentType !== 'deposit' ? 'grid-cols-3' : 'grid-cols-2'} gap-1 shadow-sm`} id="payment-gateway-toggle-bar">
          <button
            id="toggle-pay-card"
            type="button"
            onClick={() => setMethod('card')}
            className={`py-2 rounded-lg text-xs font-bold cursor-pointer transition-all ${
              method === 'card'
                ? 'bg-slate-950 text-slate-100 shadow border border-slate-800'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-950/40'
            }`}
          >
            Debit / Credit Card
          </button>
          
          <button
            id="toggle-pay-transfer"
            type="button"
            onClick={() => setMethod('transfer')}
            className={`py-2 rounded-lg text-xs font-bold cursor-pointer transition-all ${
              method === 'transfer'
                ? 'bg-slate-950 text-slate-100 shadow border border-slate-800'
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-950/40'
            }`}
          >
            Bank Transfer Log
          </button>

          {summary.depositHeld > 0 && paymentType !== 'deposit' && (
            <button
              id="toggle-pay-escrow"
              type="button"
              onClick={() => setMethod('escrow')}
              className={`py-2 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                method === 'escrow'
                  ? 'bg-emerald-500 text-slate-950 shadow border border-emerald-500'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-950/40'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Escrow
            </button>
          )}
        </div>
      </div>

      {/* 4. Display Active Checkout Core Forms */}
      {successStatus ? (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center flex flex-col items-center justify-center gap-3 shadow-sm animate-pulse" id="main-payment-status-box">
          <div className="h-10 w-10 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-200">Verifying Billing Reference...</h4>
            <p className="text-xs text-slate-400 mt-1">{successStatus}</p>
          </div>
        </div>
      ) : method === 'card' ? (
        <PaystackButton
          email={user.email}
          amount={amount}
          paymentType={paymentType}
          onSuccess={handleCardSuccess}
        />
      ) : method === 'transfer' ? (
        <TransferForm
          defaultAmount={amount}
          paymentType={paymentType}
          onSubmitSuccess={handleTransferSuccess}
          bankDetails={bankDetails}
        />
      ) : (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col gap-4 shadow-sm animate-fade-in" id="escrow-payment-form">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="text-emerald-400 h-5 w-5" />
            <h4 className="text-sm font-bold text-slate-200">Pay using Escrow Deposit</h4>
          </div>
          <p className="text-[11px] text-slate-400">
            You currently have <strong>₦{summary.depositHeld.toLocaleString()}</strong> held in your escrow deposit.
            {amount > summary.depositHeld && <span className="text-amber-400 block mt-1">Warning: Your selected amount exceeds your available escrow balance.</span>}
          </p>
          <button
            type="button"
            disabled={amount <= 0 || amount > summary.depositHeld || isProcessingEscrow}
            onClick={handleApplyEscrowDeposit}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            {isProcessingEscrow ? 'Processing...' : `Apply ₦${amount.toLocaleString()} from Escrow`}
          </button>
        </div>
      )}
    </div>
  );
}
