'use client';

import React, { useState } from 'react';
import { Landmark, ArrowRight, CheckCircle2, Ticket, AlertCircle } from 'lucide-react';

interface TransferFormProps {
  defaultAmount: number;
  paymentType: 'electricity' | 'water' | 'deposit' | 'prepayment';
  onSubmitSuccess: () => void;
  bankDetails: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
}

export default function TransferForm({
  defaultAmount,
  paymentType,
  onSubmitSuccess,
  bankDetails,
}: TransferFormProps) {
  const [amount, setAmount] = useState<number>(defaultAmount);
  const [transferDate, setTransferDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [transferNote, setTransferNote] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setError('Amount must be a positive number.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/payments/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount,
          paymentType,
          transferDate,
          note: transferNote,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to submit transfer receipt.');
      }

      setIsSuccess(true);
      setTimeout(() => {
        onSubmitSuccess();
      }, 1500);

    } catch (err: any) {
      setError(err.message || 'An error occurred during submission.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center flex flex-col items-center justify-center gap-3 shadow-sm animate-fade-in" id="transfer-success-view">
        <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-100">Receipt Submitted!</h3>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            Your transfer claim has been lodged. The admin has been alerted to review and audit the payment against bank statements.
          </p>
        </div>
      </div>
    );
  }

  // Helper to copy text to clipboard safely in sandboxes
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm" id="bank-transfer-form">
      {/* Official Bank details panel */}
      <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 flex flex-col gap-2.5">
        <h4 className="text-[10px] font-bold font-sans uppercase tracking-[0.05em] text-slate-500 flex items-center gap-1.5 leading-none">
          <Landmark className="h-3.5 w-3.5 text-emerald-400" />
          Utility Bank Details
        </h4>
        
        <div className="grid grid-cols-3 gap-y-1 text-xs mt-1">
          <span className="text-slate-500 font-bold uppercase text-[9px] flex items-center">Bank:</span>
          <span className="col-span-2 text-slate-200 font-extrabold">{bankDetails.bankName}</span>

          <span className="text-slate-500 font-bold uppercase text-[9px] flex items-center">Acct No:</span>
          <span className="col-span-2 text-slate-200 font-mono font-extrabold flex items-center justify-between">
            {bankDetails.accountNumber}
            <button
              type="button"
              onClick={() => handleCopy(bankDetails.accountNumber)}
              className="text-[10px] text-emerald-400 hover:underline px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 shadow-sm font-bold"
            >
              Copy
            </button>
          </span>

          <span className="text-slate-500 font-bold uppercase text-[9px] flex items-center">Name:</span>
          <span className="col-span-2 text-slate-350 font-semibold text-[11px] leading-snug">{bankDetails.accountName}</span>
        </div>
      </div>

      <div className="text-[11px] text-amber-300 leading-relaxed -mt-1 bg-amber-550/10 border border-amber-500/15 p-2.5 rounded-xl">
        💡 <strong>Steps:</strong> Make a transfer of the desired amount using your bank application, then input details below to lodge transaction.
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex gap-2 items-center font-bold">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Input segment */}
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-[10px] font-bold font-sans uppercase text-slate-500 tracking-wide mb-1.5">Amount Sent (₦)</label>
          <input
            id="transfer-amount-input"
            type="number"
            required
            placeholder="3000"
            value={amount === 0 ? '' : amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 outline-none rounded-xl py-2.5 px-4.5 text-sm text-slate-100 font-mono"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold font-sans uppercase text-slate-500 tracking-wide mb-1.5">Transfer Date</label>
          <input
            id="transfer-date-input"
            type="date"
            required
            value={transferDate}
            onChange={(e) => setTransferDate(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 outline-none rounded-xl py-2.5 px-4.5 text-sm text-slate-100 font-mono"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold font-sans uppercase text-slate-500 tracking-wide mb-1.5">Sender Details / Transaction Note</label>
          <input
            id="transfer-note-input"
            type="text"
            required
            placeholder="e.g. Transferred by Emeka Obi for Flat 2 water"
            value={transferNote}
            onChange={(e) => setTransferNote(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 outline-none rounded-xl py-2.5 px-4.5 text-sm text-slate-100 placeholder-slate-500 font-medium"
          />
        </div>
      </div>

      <button
        id="submit-transfer-receipt-btn"
        type="submit"
        disabled={isLoading}
        className="w-full py-3.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 disabled:opacity-50 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
      >
        {isLoading ? 'Lodging Transfer Claim...' : 'Submit Receipt Claim'}
        <ArrowRight className="h-4 w-4" />
      </button>
    </form>
  );
}
