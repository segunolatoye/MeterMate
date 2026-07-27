'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Droplets, ShieldCheck, CheckCircle2, RotateCcw, AlertCircle, CreditCard, Landmark, ArrowRight, ArrowLeft } from 'lucide-react';
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
    initialMethod === 'card' ? 'card' : 'transfer'
  );

  // Wizard Step State
  const [step, setStep] = useState<number>(1);

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
    <div className="flex flex-col gap-2" id="pay-client-view-root">
      
      {/* Progress indicator */}
      <div className="flex items-center justify-between px-2 mb-4">
        <span className="text-[10px] font-sans font-bold text-slate-500 uppercase tracking-widest">
          Step {step} of 3
        </span>
        <div className="flex gap-1.5">
          <div className={`h-1.5 w-6 rounded-full transition-colors duration-300 ${step >= 1 ? 'bg-emerald-500' : 'bg-slate-800'}`} />
          <div className={`h-1.5 w-6 rounded-full transition-colors duration-300 ${step >= 2 ? 'bg-emerald-500' : 'bg-slate-800'}`} />
          <div className={`h-1.5 w-6 rounded-full transition-colors duration-300 ${step >= 3 ? 'bg-emerald-500' : 'bg-slate-800'}`} />
        </div>
      </div>

      {step === 1 && (
        <div className="flex flex-col gap-6 animate-fade-in">
          {/* 1. Utility Type Selector Category Slider */}
          <div className="flex flex-col gap-4">
            <label className="block text-base font-bold font-sans text-slate-200">
              What do you want to pay for?
            </label>
            <div className="grid grid-cols-3 gap-3" id="utility-payment-category-tabs">
              
              {/* Electricity Option (only if electricity tenant or admin/office) */}
              {user.role === 'electricity_tenant' || user.role === 'admin' ? (
                <button
                  id="tab-pay-electricity"
                  type="button"
                  onClick={() => handlePaymentTypeChange('electricity')}
                  className={`p-4 rounded-2xl border text-center flex flex-col items-center gap-2 cursor-pointer transition-all shadow-sm ${
                    paymentType === 'electricity'
                      ? 'bg-emerald-500 border-emerald-500 text-slate-950 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <Zap className="h-6 w-6 mb-1" />
                  <span className="text-xs font-bold tracking-wide">Electricity</span>
                </button>
              ) : (
                <div className="p-4 bg-slate-950/40 border border-slate-800 rounded-2xl text-center flex flex-col items-center justify-center text-xs text-slate-600 line-through">
                  Electricity
                </div>
              )}

              {/* Water Option */}
              <button
                id="tab-pay-water"
                type="button"
                onClick={() => handlePaymentTypeChange('water')}
                className={`p-4 rounded-2xl border text-center flex flex-col items-center gap-2 cursor-pointer transition-all shadow-sm ${
                  paymentType === 'water'
                    ? 'bg-emerald-500 border-emerald-500 text-slate-950 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Droplets className="h-6 w-6 mb-1" />
                <span className="text-xs font-bold tracking-wide">Water</span>
              </button>

              {/* Deposit Option */}
              <button
                id="tab-pay-deposit"
                type="button"
                onClick={() => handlePaymentTypeChange('deposit')}
                className={`p-4 rounded-2xl border text-center flex flex-col items-center gap-2 cursor-pointer transition-all shadow-sm ${
                  paymentType === 'deposit'
                    ? 'bg-emerald-500 border-emerald-500 text-slate-950 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <ShieldCheck className="h-6 w-6 mb-1" />
                <span className="text-xs font-bold tracking-wide">Deposit</span>
              </button>
            </div>
          </div>
          
          <button
            type="button"
            onClick={() => setStep(2)}
            className="w-full py-4 mt-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            Continue <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-6 animate-fade-in">
          {/* 2. Amount Input Segement */}
          <div className="bg-slate-900 border border-slate-800 rounded-[28px] p-6 shadow-sm">
            <label className="block text-base font-bold font-sans text-slate-200 mb-4">
              How much are you paying?
            </label>
            
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 font-sans text-xl font-bold">₦</span>
              <input
                id="billing-custom-amount-input"
                type="number"
                step="any"
                required
                value={amount === 0 ? '' : amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                placeholder="0"
                className="w-full bg-slate-950 border border-slate-800/80 focus:border-emerald-500 outline-none rounded-2xl py-4 pl-12 pr-5 text-xl text-slate-100 font-sans font-bold transition-all"
              />
            </div>

            {/* Dynamic Context Helpers */}
            <div className="mt-4 p-4 rounded-2xl bg-slate-950/50 border border-slate-800/50">
              {paymentType === 'water' && (
                <p className="text-xs text-slate-400 leading-relaxed">
                  {summary.outstandingWaterAmount > 0 
                    ? `Outstanding Balance matches June/May levies: ${summary.outstandingWaterCount} months unpaid.` 
                    : 'Flat rate water levy contribution of ₦3,000/month.'}
                </p>
              )}
              {paymentType === 'electricity' && (
                <p className="text-xs text-slate-400 leading-relaxed">
                  {summary.electricityBalance < 0 
                    ? `Recommended Outstanding Arrears: ${Math.abs(summary.electricityBalance).toLocaleString('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 })}.` 
                    : 'Add arbitrary prepaid amount towards sub-meter token.'}
                </p>
              )}
              {paymentType === 'deposit' && (
                <p className="text-xs text-slate-400 leading-relaxed">
                  Add general security deposits which are held in secure landlord escrow.
                </p>
              )}
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="p-4 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold rounded-2xl transition-colors cursor-pointer shrink-0 flex items-center justify-center"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              disabled={amount <= 0}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold rounded-2xl text-sm transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-6 animate-fade-in">
          
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="p-3 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold rounded-2xl transition-colors cursor-pointer flex items-center justify-center"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          </div>

          {/* 3. Payment Method Slider */}
          <div className="flex flex-col gap-4">
            <label className="block text-base font-bold font-sans text-slate-200">
              How would you like to pay?
            </label>
            
            <div className={`grid ${summary.depositHeld > 0 && paymentType !== 'deposit' ? 'grid-cols-3' : 'grid-cols-2'} gap-3`} id="payment-gateway-toggle-bar">
              <button
                id="toggle-pay-transfer"
                type="button"
                onClick={() => setMethod('transfer')}
                className={`p-4 rounded-2xl border text-center flex flex-col items-center gap-2 cursor-pointer transition-all shadow-sm ${
                  method === 'transfer'
                    ? 'bg-emerald-500 border-emerald-500 text-slate-950 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Landmark className="h-6 w-6 mb-1" />
                <span className="text-xs font-bold tracking-wide">Bank Transfer</span>
              </button>
              
              <button
                id="toggle-pay-card"
                type="button"
                onClick={() => setMethod('card')}
                className={`p-4 rounded-2xl border text-center flex flex-col items-center gap-2 cursor-pointer transition-all shadow-sm ${
                  method === 'card'
                    ? 'bg-emerald-500 border-emerald-500 text-slate-950 font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <CreditCard className="h-6 w-6 mb-1" />
                <span className="text-xs font-bold tracking-wide">Card Pay</span>
              </button>

              {summary.depositHeld > 0 && paymentType !== 'deposit' && (
                <button
                  id="toggle-pay-escrow"
                  type="button"
                  onClick={() => setMethod('escrow')}
                  className={`p-4 rounded-2xl border text-center flex flex-col items-center gap-2 cursor-pointer transition-all shadow-sm ${
                    method === 'escrow'
                      ? 'bg-emerald-500 border-emerald-500 text-slate-950 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <ShieldCheck className="h-6 w-6 mb-1" />
                  <span className="text-xs font-bold tracking-wide">My Balance</span>
                </button>
              )}
            </div>
          </div>

          {/* 4. Display Active Checkout Core Forms */}
          {successStatus ? (
            <div className="p-8 bg-slate-900 border border-slate-800 rounded-[28px] text-center flex flex-col items-center justify-center gap-4 shadow-sm animate-pulse" id="main-payment-status-box">
              <div className="h-12 w-12 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-200">Verifying Billing Reference...</h4>
                <p className="text-sm text-slate-400 mt-1">{successStatus}</p>
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
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-[28px] flex flex-col gap-5 shadow-sm animate-fade-in" id="escrow-payment-form">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="text-emerald-400 h-6 w-6" />
                <h4 className="text-base font-bold text-slate-200">Pay using My Balance</h4>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                You currently have <strong>₦{summary.depositHeld.toLocaleString()}</strong> held in your account balance.
                {amount > summary.depositHeld && <span className="text-amber-400 block mt-2 font-bold">Warning: Your selected amount exceeds your available balance.</span>}
              </p>
              <button
                type="button"
                disabled={amount <= 0 || amount > summary.depositHeld || isProcessingEscrow}
                onClick={handleApplyEscrowDeposit}
                className="w-full py-4 mt-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 font-bold rounded-2xl text-sm transition-colors cursor-pointer"
              >
                {isProcessingEscrow ? 'Processing...' : `Apply ₦${amount.toLocaleString()} from My Balance`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
