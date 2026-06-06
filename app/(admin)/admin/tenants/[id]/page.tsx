import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getTenantSummary } from '@/lib/calculations';
import TenantDetailClientView from './TenantDetailClientView';

export default async function AdminTenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user || user.role !== 'admin') {
    redirect('/login');
  }

  const { id } = await params;
  const db = await getDb();
  const summary = getTenantSummary(db, id);

  if (!summary) {
    redirect('/admin/tenants');
  }

  return (
    <div className="p-6 flex flex-col gap-6 text-slate-100" id="tenant-detail-admin-view">
      <div>
        <span className="text-[10px] font-mono tracking-wider text-slate-500 uppercase">
          Administrative Dashboard
        </span>
        <h1 className="text-xl font-extrabold tracking-tight text-white mt-0.5">
          Occupant Ledger
        </h1>
      </div>

      <TenantDetailClientView summary={summary} />
    </div>
  );
}
