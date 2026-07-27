import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSessionUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getTenantSummary, getWaterPoolSummary } from '@/lib/calculations';
import TenantSummaryCard from '@/components/TenantSummaryCard';
import { 
  Zap, 
  Droplets, 
  Calendar, 
  ArrowUpRight, 
  Wallet, 
  Plus, 
  Clock, 
  ChevronRight,
  TrendingUp,
  History,
  BarChart
} from 'lucide-react';

export default async function TenantDashboardPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login');
  }

  const db = await getDb();
  const summary = getTenantSummary(db, user.id);
  const waterPoolSummary = getWaterPoolSummary(db);
  const globalSetting = db.settings.find(s => s.id === 'global_settings');

  if (!summary) {
    // If admin is browsing dashboard or fallbacks
    redirect('/admin');
  }

  const isElectricityTenant = user.role === 'electricity_tenant' || user.role === 'admin';
  const isWaterOnlyTenant = user.role === 'water_only_tenant';

  // Format currency
  const formatNairaVal = (val: number) => {
    return '₦' + Math.abs(val).toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const recentTransactions = [...summary.payments]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 2);

  const userInitials = user.full_name
    ? user.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'MM';

  return (
    <div className="flex flex-col gap-5" id="tenant-dashboard-screen">
      <div className="px-6 py-6 flex flex-col gap-5">
        {/* Main summary cards */}
        <TenantSummaryCard summary={summary} waterPoolSummary={waterPoolSummary} globalSetting={globalSetting} />

        {/* Quick Utility Actions Row */}
        <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-[28px] p-6 shadow-[0_4px_30px_rgba(0,0,0,0.1)] flex flex-col gap-4">
          <h3 className="text-xs font-bold font-sans tracking-wide text-slate-400 uppercase mb-1">
            Quick Actions
          </h3>
          
          <div className="grid grid-cols-3 gap-3" id="dashboard-quick-actions-grid">
            <Link
              id="quick-pay-transfer-link"
              href="/dashboard/pay?method=transfer"
              className="p-4 rounded-[20px] border border-white/10 bg-black/20 backdrop-blur-sm hover:bg-black/40 transition-all flex flex-col items-center justify-center gap-2 text-center shadow-inner aspect-square"
            >
              <div className="h-10 w-10 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center">
                <ArrowUpRight className="h-5 w-5" />
              </div>
              <span className="font-sans font-bold text-[10px] text-slate-100 uppercase tracking-widest text-center leading-tight">Record Payment</span>
            </Link>

            <Link
              id="quick-pay-card-link"
              href="/dashboard/pay?method=card"
              className="p-4 rounded-[20px] border border-white/10 bg-black/20 backdrop-blur-sm hover:bg-black/40 transition-all flex flex-col items-center justify-center gap-2 text-center shadow-inner aspect-square"
            >
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Plus className="h-5 w-5" />
              </div>
              <span className="font-sans font-bold text-[10px] text-slate-100 uppercase tracking-widest">Pay Online</span>
            </Link>

            <Link
              id="quick-report-link"
              href="/report"
              className="p-4 rounded-[20px] border border-white/10 bg-black/20 backdrop-blur-sm hover:bg-black/40 transition-all flex flex-col items-center justify-center gap-2 text-center shadow-inner aspect-square"
            >
              <div className="h-10 w-10 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <BarChart className="h-5 w-5" />
              </div>
              <span className="font-sans font-bold text-[10px] text-slate-100 uppercase tracking-widest">Reports</span>
            </Link>
          </div>
        </div>
 
      {/* Recent payments */}
      <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-[28px] p-6 shadow-[0_4px_30px_rgba(0,0,0,0.1)] flex flex-col gap-5" id="dashboard-ledger-transactions">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-bold font-sans tracking-wide text-slate-400 uppercase flex items-center gap-1.5 leading-none">
            <History className="h-3.5 w-3.5 text-emerald-400" />
            Recent Payments
          </h3>
          <Link
            id="ledger-view-all-link"
            href="/dashboard/history"
            className="text-xs text-emerald-400 font-bold uppercase tracking-tight hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            See All <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
 
        {recentTransactions.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-500 italic">No payments logged yet.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {recentTransactions.map((tx) => {
              const isPaid = tx.status === 'confirmed';
              return (
                <div key={tx.id} className="p-4 bg-black/20 border border-white/10 backdrop-blur-sm shadow-inner rounded-2xl flex justify-between items-center text-xs">
                  <div className="flex flex-col gap-1">
                    <div className="font-extrabold text-slate-100 capitalize">
                      {tx.payment_type} Utility {tx.payment_method.replace('paystack_', '')}
                    </div>
                    <div className="text-[10px] text-slate-400 font-sans font-bold tracking-wide flex items-center gap-1">
                      <Clock className="h-3 w-3 shrink-0" />
                      {new Date(tx.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
 
                  <div className="text-right flex flex-col gap-1.5 items-end">
                    <span className="font-sans font-extrabold text-lg tracking-tight text-slate-100">
                      {formatNairaVal(tx.amount)}
                    </span>
                    <span className={`text-[8.5px] font-bold font-sans px-2 py-0.5 rounded-full uppercase tracking-widest border shadow-inner ${
                      isPaid 
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                        : tx.status === 'pending'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>
                      {tx.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
    </div>
  );
}
