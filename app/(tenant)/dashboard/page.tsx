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
  History
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

  // Recent transactions list
  const recentTransactions = [...summary.payments]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 2);

  const generateUsageHistory = () => {
    const history = [];
    const now = new Date();
    
    // Accumulation of all confirmed electricity payments from all tenants
    const allPayments = db.payments.filter(p => 
      p.status === 'confirmed' && 
      (p.payment_type === 'electricity' || p.payment_type === 'prepayment')
    );

    for (let i = 5; i >= 0; i--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = targetDate.toLocaleString('en-US', { month: 'short' });
      
      const startOfMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      
      const monthPayments = allPayments.filter(p => {
        const d = new Date(p.created_at);
        return d >= startOfMonth && d <= endOfMonth;
      });
      
      const amount = monthPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      history.push({ label, amount });
    }
    return history;
  };

  const usageHistory = generateUsageHistory();

  const maxAmount = Math.max(...usageHistory.map(h => h.amount), 1000);

  const userInitials = user.full_name
    ? user.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'MM';

  return (
    <div className="flex flex-col gap-5" id="tenant-dashboard-screen">
      {/* Welcome / Meta banner */}
      <div className="bg-slate-950 px-6 pt-6 pb-12 flex justify-between items-center text-white" id="tenant-dashboard-header-block">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">
            Compound Portal
          </span>
          <h1 className="text-xl font-bold tracking-tight text-white mt-0.5" id="tenant-dashboard-title">
            {user.room_label || 'My Room'}
          </h1>
        </div>
        <div className="w-10 h-10 rounded-full bg-emerald-555/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 font-bold uppercase transition-transform hover:scale-105" id="user-avatar-initials">
          {userInitials}
        </div>
      </div>

      <div className="px-6 -mt-8 flex flex-col gap-5">
        {/* Main summary cards */}
        <TenantSummaryCard summary={summary} waterPoolSummary={waterPoolSummary} globalSetting={globalSetting} />

        {/* Quick Utility Actions Row */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col gap-3">
          <h3 className="text-xs font-bold font-sans tracking-wide text-slate-500 uppercase mb-0.5">
            Quick Actions
          </h3>
          
          <div className="grid grid-cols-2 gap-3" id="dashboard-quick-actions-grid">
            <Link
              id="quick-pay-card-link"
              href="/dashboard/pay?method=card"
              className="p-3.5 rounded-xl border border-slate-800 bg-slate-950 align-left hover:bg-slate-900 transition-all flex items-center justify-between text-xs"
            >
              <div>
                <span className="font-extrabold text-slate-200 block">Instant Card</span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">Via secure Paystack</span>
              </div>
              <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                <Plus className="h-4 w-4" />
              </div>
            </Link>
 
            <Link
              id="quick-pay-transfer-link"
              href="/dashboard/pay?method=transfer"
              className="p-3.5 rounded-xl border border-slate-800 bg-slate-950 align-left hover:bg-slate-900 transition-all flex items-center justify-between text-xs"
            >
              <div>
                <span className="font-extrabold text-slate-200 block">Bank Transfer</span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">Audit slip claim</span>
              </div>
              <div className="h-7 w-7 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center shrink-0">
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </Link>
          </div>
        </div>
 
      {/* Dynamic 6-Month Usage History Column (Only if Electricity Tenant) */}
      {isElectricityTenant && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col gap-3.5" id="dashboard-electricity-usage-panel">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold font-sans tracking-wide text-slate-500 uppercase flex items-center gap-1.5 leading-none">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
              Electricity Load history
            </h3>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">6-Month Trend</span>
          </div>
 
          {/* SVG Custom bar diagram in a smooth light box */}
          <div className="bg-slate-950 rounded-xl p-4 border border-slate-800/60 flex flex-col items-center justify-center">
            <div className="w-full flex justify-between items-end h-32 gap-3 px-1 mt-2">
              {usageHistory.map((item) => {
                const heightPercent = (item.amount / maxAmount) * 100;
                const isCurrentMonth = item.label === new Date().toLocaleString('en-US', { month: 'short' });
                return (
                  <div key={item.label} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    {/* Hover detail value bubble */}
                    <span className="text-[8px] font-bold font-mono text-slate-300 bg-slate-905 border border-slate-800 shadow-sm py-0.5 px-1 rounded-lg truncate max-w-[40px] text-center" title={`₦${item.amount.toLocaleString()}`}>
                      {item.amount >= 1000 ? `₦${(item.amount / 1000).toFixed(1)}k` : `₦${item.amount}`}
                    </span>
                    {/* The bar element */}
                    <div 
                      style={{ height: `${heightPercent * 0.72}%` }}
                      className={`w-full ${isCurrentMonth ? 'bg-emerald-500' : 'bg-slate-800 hover:bg-slate-700'} rounded-t-md transition-all duration-300 relative group`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/0 via-white/5 to-white/10 rounded-t-md" />
                    </div>
                    {/* Label */}
                    <span className={`text-[9px] font-bold tracking-wider ${isCurrentMonth ? 'text-emerald-400' : 'text-slate-500'} uppercase font-sans`}>{item.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="w-full text-center text-[9px] font-mono text-slate-500 border-t border-slate-800/60 pt-2.5 mt-2.5">
              Unit metric: Total Compound Electricity Payments (₦) per month
            </div>
          </div>
        </div>
      )}
 
      {/* Recent utility ledger transactions */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col gap-4" id="dashboard-ledger-transactions">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-bold font-sans tracking-wide text-slate-500 uppercase flex items-center gap-1.5 leading-none">
            <History className="h-3.5 w-3.5 text-emerald-400" />
            Recent Ledger Entries
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
                <div key={tx.id} className="p-3.5 bg-slate-950 border border-slate-800/65 rounded-xl flex justify-between items-center text-xs">
                  <div className="flex flex-col gap-1">
                    <div className="font-extrabold text-slate-200 capitalize">
                      {tx.payment_type} Utility {tx.payment_method.replace('paystack_', '')}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                      <Clock className="h-3 w-3 shrink-0" />
                      {new Date(tx.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
 
                  <div className="text-right flex flex-col gap-1 items-end">
                    <span className="font-mono font-extrabold text-slate-200">
                      {formatNairaVal(tx.amount)}
                    </span>
                    <span className={`text-[8.5px] font-bold font-mono px-1.5 py-0.5 rounded-full uppercase tracking-wide border ${
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
