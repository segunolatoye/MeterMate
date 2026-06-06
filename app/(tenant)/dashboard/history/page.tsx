import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getTenantSummary } from '@/lib/calculations';
import { 
  Calendar, 
  Clock, 
  CreditCard, 
  CheckCircle, 
  AlertCircle,
  HelpCircle,
  Ban,
  Filter,
  ArrowDownLeft,
  ChevronRight
} from 'lucide-react';

export default async function TenantHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login');
  }

  const db = await getDb();
  const summary = getTenantSummary(db, user.id);
  if (!summary) {
    redirect('/login');
  }

  const resolvedParams = await searchParams;
  const activeFilter = typeof resolvedParams.filter === 'string' ? resolvedParams.filter : 'all';

  // Format currency helper
  const formatNaira = (val: number) => {
    return '₦' + Math.abs(val).toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const payments = [...summary.payments].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const filteredPayments = payments.filter((p) => {
    if (activeFilter === 'all') return true;
    return p.payment_type === activeFilter;
  });

  const waterHistory = [...summary.waterContributions].sort(
    (a, b) => b.month.localeCompare(a.month)
  );

  const monthLabels: { [key: string]: string } = {
    '2026-04': 'April 2026',
    '2026-05': 'May 2026',
    '2026-06': 'June 2026',
  };  return (
    <div className="p-6 flex flex-col gap-5 text-slate-100" id="tenant-history-ledger-screen">
      <div>
        <span className="text-[10px] font-bold font-sans uppercase tracking-[0.08em] text-slate-500">
          Compound Ledger
        </span>
        <h1 className="text-xl font-extrabold tracking-tight mt-0.5 text-white">
          Billing Ledger
        </h1>
      </div>

      {/* TABS for Filters */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] uppercase font-bold font-sans tracking-wide text-slate-500">
          Filter Ledger Entries
        </label>
        <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex gap-1" id="ledger-category-filter-bar">
          {['all', 'electricity', 'water', 'deposit'].map((type) => (
            <a
              key={type}
              id={`filter-ledger-${type}`}
              href={`/dashboard/history?filter=${type}`}
              className={`flex-1 text-center py-2 text-[10px] font-bold tracking-wider uppercase rounded-lg transition-all ${
                activeFilter === type
                  ? 'bg-slate-950 text-white font-bold shadow-sm border border-slate-800'
                  : 'text-slate-500 hover:text-slate-305 hover:bg-slate-950/40'
              }`}
            >
              {type}
            </a>
          ))}
        </div>
      </div>

      {/* Transaction list element */}
      <div className="flex flex-col gap-3">
        <h2 className="text-[10px] uppercase tracking-wide font-sans font-bold text-slate-500 block px-1">
          Payments &amp; Prepayments ({filteredPayments.length})
        </h2>

        {filteredPayments.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 italic bg-slate-900 border border-slate-800 rounded-2xl shadow-sm">
            No transactions found for this filter.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredPayments.map((p) => {
              const isConfirmed = p.status === 'confirmed';
              return (
                <div key={p.id} className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex justify-between items-center text-xs gap-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className={`h-9 w-9 rounded-xl border flex items-center justify-center shrink-0 ${
                      p.payment_type === 'water'
                        ? 'text-sky-405 bg-sky-500/10 border-sky-505/20'
                        : p.payment_type === 'electricity'
                        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-505/20'
                        : 'text-indigo-400 bg-indigo-500/10 border-indigo-505/20'
                    }`}>
                      <ArrowDownLeft className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="font-extrabold text-slate-200 capitalize truncate flex items-center gap-1">
                        {p.payment_type === 'prepayment' ? 'Electricity' : p.payment_type} Topup
                      </div>
                      <p className="text-[10px] text-slate-450 mt-1 truncate max-w-[190px]">
                        {p.note || `${p.payment_method.replace('paystack_', '')} reference`}
                      </p>
                      <span className="text-[9px] font-mono p-1 px-1.5 rounded bg-slate-950 border border-slate-800 text-slate-500 mt-1.5 inline-block">
                        Ref: {p.paystack_reference}
                      </span>
                    </div>
                  </div>

                  <div className="text-right flex flex-col gap-1 items-end shrink-0">
                    <span className="font-mono font-extrabold text-slate-200">
                      {formatNaira(p.amount)}
                    </span>
                    <span className={`text-[8px] font-bold font-mono px-2 py-0.5 rounded-full uppercase border ${
                      isConfirmed
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : p.status === 'pending'
                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                        : 'bg-red-500/10 border-red-500/20 text-red-400'
                    }`}>
                      {p.status}
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono mt-0.5">
                      {new Date(p.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Water history tracker logs */}
      {activeFilter === 'all' || activeFilter === 'water' ? (
        <div className="flex flex-col gap-3 mt-4">
          <h2 className="text-[10px] uppercase tracking-wide font-sans font-bold text-slate-500 block px-1">
            Water Levy Monthly Tracker
          </h2>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-800 shadow-sm">
            {waterHistory.map((w) => {
              const isPaid = w.status === 'paid';
              return (
                <div key={w.id} className="p-4 flex justify-between items-center text-xs hover:bg-slate-950/20">
                  <div>
                    <div className="font-extrabold text-slate-200">
                      {monthLabels[w.month] || w.month}
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-1">
                      Billing Levy Charge: {formatNaira(w.amount)}
                    </span>
                  </div>

                  <span className={`font-mono text-[9px] font-bold uppercase px-2.5 py-1 rounded-lg border ${
                    isPaid
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : w.status === 'waived'
                      ? 'bg-slate-950 border border-slate-800 text-slate-500'
                      : 'bg-red-500/10 border-red-500/20 text-red-400'
                  }`}>
                    {w.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

    </div>
  );
}
