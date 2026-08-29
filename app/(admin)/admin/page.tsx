import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSessionUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getAdminMetrics } from '@/lib/calculations';
import BroadcastForm from '@/components/BroadcastForm';
import DevicePushSetup from '@/components/DevicePushSetup';
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
    <div className="flex flex-col gap-5 text-slate-100" id="admin-dashboard-view">
      <div className="px-6 py-6 flex flex-col gap-5">
        {/* Welcome metadata */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase font-sans font-bold tracking-widest text-emerald-400">
            Landlord Operations
          </span>
          <h1 className="text-3xl font-sans font-black tracking-tighter text-slate-100" id="admin-dashboard-title">
            Property Manager
          </h1>
        </div>

      {/* Grid of admin statistics */}
      <div className="grid grid-cols-2 gap-3.5">
        
        {/* Metric columns */}
        <div className="bg-slate-900/40 backdrop-blur-2xl border-transparent rounded-[28px] p-5 flex flex-col items-start justify-between relative shadow-[0_4px_30px_rgba(0,0,0,0.1)] aspect-square" id="stat-collected-month">
          <div className="h-10 w-10 rounded-2xl flex items-center justify-center mb-2 bg-emerald-500/10 text-emerald-400">
            <Wallet className="h-5 w-5" />
          </div>
          <div className="w-full">
            <span className="text-2xl font-sans font-black tracking-tighter truncate block text-slate-100 mt-1">
              {formatNaira(metrics.collectedThisMonth)}
            </span>
            <span className="text-[10px] uppercase font-sans font-bold tracking-widest text-slate-500 block mt-1">
              Collected ({new Date().toLocaleString('default', { month: 'short' })})
            </span>
          </div>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-2xl border-transparent rounded-[28px] p-5 flex flex-col items-start justify-between relative shadow-[0_4px_30px_rgba(0,0,0,0.1)] aspect-square" id="stat-outstanding-total">
          <div className="h-10 w-10 rounded-2xl flex items-center justify-center mb-2 bg-amber-500/10 text-amber-400">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div className="w-full">
            <span className="text-2xl font-sans font-black tracking-tighter truncate block text-amber-400 mt-1">
              {formatNaira(metrics.outstandingAcrossTenants)}
            </span>
            <span className="text-[10px] uppercase font-sans font-bold tracking-widest text-slate-500 block mt-1">
              Receivable
            </span>
          </div>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-2xl border-transparent rounded-[28px] p-5 flex flex-col items-start justify-between relative shadow-[0_4px_30px_rgba(0,0,0,0.1)] aspect-square" id="stat-tenants-count">
          <div className="h-10 w-10 rounded-2xl flex items-center justify-center mb-2 bg-blue-500/10 text-blue-400">
            <Users className="h-5 w-5" />
          </div>
          <div className="w-full">
            <span className="text-2xl font-sans font-black tracking-tighter truncate block text-slate-100 mt-1">
              {metrics.totalTenantsCount} <span className="text-sm font-sans font-normal text-slate-500">active</span>
            </span>
            <span className="text-[10px] uppercase font-sans font-bold tracking-widest text-slate-500 block mt-1">
              Tenants
            </span>
          </div>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-2xl border-transparent rounded-[28px] p-5 flex flex-col items-start justify-between relative shadow-[0_4px_30px_rgba(0,0,0,0.1)] aspect-square" id="stat-pending-payments">
          <div className="h-10 w-10 rounded-2xl flex items-center justify-center mb-2 bg-purple-500/10 text-purple-400">
            <Sliders className="h-5 w-5" />
          </div>
          <div className="w-full">
            <span className={`text-2xl font-sans font-black tracking-tighter truncate block mt-1 ${metrics.pendingTransfersCount > 0 ? 'text-purple-400' : 'text-slate-400'}`}>
              {metrics.pendingTransfersCount} <span className="text-sm font-sans font-normal text-slate-500">pending</span>
            </span>
            <span className="text-[10px] uppercase font-sans font-bold tracking-widest text-slate-500 block mt-1">
              Transfers
            </span>
          </div>
        </div>
      </div>

      {/* Action required alerts ribbon for bank transfers */}
      {metrics.pendingTransfersCount > 0 && (
        <Link
          id="action-required-badge"
          href="/admin/payments"
          className="p-4 bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-between text-xs cursor-pointer hover:bg-purple-500/20 transition-all text-left rounded-[24px]"
        >
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
            </span>
            <div className="min-w-0">
              <span className="font-sans font-extrabold tracking-tight text-slate-200 block">Pending Transfer Audits</span>
              <span className="text-[10px] font-sans font-bold tracking-wide text-purple-400/80 block mt-0.5">
                {metrics.pendingTransfersCount} claims require confirmation
              </span>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 opacity-80" />
        </Link>
      )}

      {/* Navigation Administration Grid */}
      <div className="bg-slate-900/40 backdrop-blur-2xl border-transparent rounded-[28px] p-6 shadow-[0_4px_30px_rgba(0,0,0,0.1)] flex flex-col gap-4">
        <h3 className="text-xs font-bold font-sans tracking-wide text-slate-400 uppercase mb-1">
          Administrative Modules
        </h3>

        <div className="flex flex-col gap-3" id="admin-modules-flow-list">
          <Link
            id="admin-link-tenants"
            href="/admin/tenants"
            className="p-4 rounded-[20px] border-transparent bg-black/20 backdrop-blur-sm hover:bg-black/40 transition-all flex items-center justify-between text-xs shadow-inner"
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Users className="h-5 w-5" />
              </div>
              <div className="flex flex-col justify-center gap-0.5">
                <span className="font-sans font-bold text-slate-100 block tracking-tight">Manage Occupants</span>
                <span className="text-[10px] font-sans font-bold tracking-wide text-slate-400 block">Add roster, configure metered deposits</span>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-500" />
          </Link>

          <Link
            id="admin-link-electricity"
            href="/admin/electricity"
            className="p-4 rounded-[20px] border-transparent bg-black/20 backdrop-blur-sm hover:bg-black/40 transition-all flex items-center justify-between text-xs shadow-inner"
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Zap className="h-5 w-5" />
              </div>
              <div className="flex flex-col justify-center gap-0.5">
                <span className="font-sans font-bold text-slate-100 block tracking-tight">Electricity Readings</span>
                <span className="text-[10px] font-sans font-bold tracking-wide text-slate-400 block">Log tokens, read sub-meters, adjust rates</span>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-500" />
          </Link>

          <Link
            id="admin-link-water"
            href="/admin/water"
            className="p-4 rounded-[20px] border-transparent bg-black/20 backdrop-blur-sm hover:bg-black/40 transition-all flex items-center justify-between text-xs shadow-inner"
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-sky-500/10 text-sky-400 flex items-center justify-center">
                <Droplets className="h-5 w-5" />
              </div>
              <div className="flex flex-col justify-center gap-0.5">
                <span className="font-sans font-bold text-slate-100 block tracking-tight">Water Matrix log</span>
                <span className="text-[10px] font-sans font-bold tracking-wide text-slate-400 block">Grid tracking compliance, bulk waive</span>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-500" />
          </Link>

          <Link
            id="admin-link-payments"
            href="/admin/payments"
            className="p-4 rounded-[20px] border-transparent bg-black/20 backdrop-blur-sm hover:bg-black/40 transition-all flex items-center justify-between text-xs shadow-inner"
          >
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <History className="h-5 w-5" />
              </div>
              <div className="flex flex-col justify-center gap-0.5">
                <span className="font-sans font-bold text-slate-100 block tracking-tight">Transaction Ledger</span>
                <span className="text-[10px] font-sans font-bold tracking-wide text-slate-400 block">Auditing bank trans, confirm manual receipts</span>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-500" />
          </Link>
        </div>
      </div>

      {/* Broadcast Tools */}
      <BroadcastForm />
      
      {/* Push Notification Setup */}
      <DevicePushSetup userId={user.id} />
      </div>
    </div>
  );
}
