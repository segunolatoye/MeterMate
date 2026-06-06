import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSessionUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getAdminMetrics } from '@/lib/calculations';
import UnitLossCard from '@/components/UnitLossCard';
import { 
  Users, 
  Wallet, 
  Droplets, 
  Zap, 
  AlertCircle, 
  ChevronRight, 
  History,
  TrendingUp,
  Sliders,
  ArrowUpRight
} from 'lucide-react';

export default async function AdminDashboardPage() {
  const user = await getSessionUser();
  
  if (!user || user.role !== 'admin') {
    redirect('/login');
  }

  const db = await getDb();
  const metrics = getAdminMetrics(db);

  const formatNaira = (val: number) => {
    return '₦' + val.toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  return (
    <div className="p-6 flex flex-col gap-6 text-slate-100" id="admin-dashboard-view">
      {/* Welcome metadata */}
      <div>
        <span className="text-[10px] font-mono tracking-wider text-slate-500 uppercase">
          Landlord Operations
        </span>
        <h1 className="text-xl font-extrabold tracking-tight text-white mt-0.5" id="admin-dashboard-title">
          Property Manager
        </h1>
      </div>

      {/* Grid of admin statistics */}
      <div className="grid grid-cols-2 gap-3.5">
        
        {/* Metric columns */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between" id="stat-collected-month">
          <span className="text-[10px] uppercase font-mono text-slate-500 flex items-center gap-1">
            <Wallet className="h-3.5 w-3.5 text-emerald-400" />
            Collected (Jun)
          </span>
          <span className="text-lg font-bold text-slate-100 tracking-tight leading-none mt-2.5">
            {formatNaira(metrics.collectedThisMonth)}
          </span>
          <span className="text-[9px] text-slate-500 block mt-1">
            Confirmed this month
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between" id="stat-outstanding-total">
          <span className="text-[10px] uppercase font-mono text-slate-500 flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
            Receivable
          </span>
          <span className="text-lg font-bold text-amber-400 tracking-tight leading-none mt-2.5">
            {formatNaira(metrics.outstandingAcrossTenants)}
          </span>
          <span className="text-[9px] text-slate-500 block mt-1">
            Owed across tenants
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between" id="stat-tenants-count">
          <span className="text-[10px] uppercase font-mono text-slate-500 flex items-center gap-1">
            <Users className="h-3.5 w-3.5 text-blue-400" />
            Tenants
          </span>
          <span className="text-lg font-bold text-slate-100 mt-2.5">
            {metrics.totalTenantsCount} <span className="text-xs font-normal text-slate-500">active</span>
          </span>
          <span className="text-[9px] text-slate-500 block mt-1">
            Compound occupancy
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between" id="stat-pending-payments">
          <span className="text-[10px] uppercase font-mono text-slate-500 flex items-center gap-1">
            <Sliders className="h-3.5 w-3.5 text-purple-400" />
            Transfers
          </span>
          <span className={`text-lg font-bold mt-2.5 ${metrics.pendingTransfersCount > 0 ? 'text-purple-400' : 'text-slate-400'}`}>
            {metrics.pendingTransfersCount} <span className="text-xs font-normal text-slate-500">pending</span>
          </span>
          <span className="text-[9px] text-slate-500 block mt-1">
            Requires audit confirm
          </span>
        </div>
      </div>

      {/* Action required alerts ribbon for bank transfers */}
      {metrics.pendingTransfersCount > 0 && (
        <Link
          id="action-required-badge"
          href="/admin/payments"
          className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-between text-xs cursor-pointer hover:bg-purple-500/15 transition-all text-left"
        >
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500"></span>
            </span>
            <div className="min-w-0">
              <span className="font-bold text-slate-200 block">Pending Transfer Audits</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {metrics.pendingTransfersCount} claims require confirmation
              </span>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 opacity-80" />
        </Link>
      )}

      {/* System Flow Assessment Card */}
      <UnitLossCard summary={metrics.unitLoss} />

      {/* Navigation Administration Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 flex flex-col gap-3">
        <h3 className="text-xs font-semibold tracking-wide text-slate-400 uppercase block px-1">
          Administrative Modules
        </h3>

        <div className="flex flex-col gap-2.5" id="admin-modules-flow-list">
          <Link
            id="admin-link-tenants"
            href="/admin/tenants"
            className="p-3.5 rounded-2xl bg-slate-950 hover:bg-slate-905 border border-slate-850/80 hover:border-slate-800 transition-colors flex items-center justify-between text-xs"
          >
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <span className="font-bold text-slate-200 block">Manage Occupants</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Add roster, configure metered deposits</span>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </Link>

          <Link
            id="admin-link-electricity"
            href="/admin/electricity"
            className="p-3.5 rounded-2xl bg-slate-950 hover:bg-slate-905 border border-slate-850/80 hover:border-slate-800 transition-colors flex items-center justify-between text-xs"
          >
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <span className="font-bold text-slate-200 block">Electricity Readings</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Log tokens, read sub-meters, adjust rates</span>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </Link>

          <Link
            id="admin-link-water"
            href="/admin/water"
            className="p-3.5 rounded-2xl bg-slate-950 hover:bg-slate-905 border border-slate-850/80 hover:border-slate-800 transition-colors flex items-center justify-between text-xs"
          >
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
                <Droplets className="h-4 w-4" />
              </div>
              <div>
                <span className="font-bold text-slate-200 block">Water Matrix log</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Grid tracking compliance, bulk waive</span>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </Link>

          <Link
            id="admin-link-payments"
            href="/admin/payments"
            className="p-3.5 rounded-2xl bg-slate-950 hover:bg-slate-905 border border-slate-850/80 hover:border-slate-800 transition-colors flex items-center justify-between text-xs"
          >
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <History className="h-4 w-4" />
              </div>
              <div>
                <span className="font-bold text-slate-200 block">Transaction Ledger</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Auditing bank trans, confirm manual receipts</span>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </Link>
        </div>
      </div>
    </div>
  );
}
