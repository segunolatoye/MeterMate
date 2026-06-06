import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getTenantSummary } from '@/lib/calculations';
import TenantsClientView from './TenantsClientView';

export default async function AdminTenantsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== 'admin') {
    redirect('/login');
  }

  const db = await getDb();
  const rawTenants = db.profiles;

  const tenants = rawTenants.map(tenant => {
    // Generate unified balance and status calculations for each tenant
    const summary = getTenantSummary(db, tenant.id);
    return {
      ...tenant,
      summary: summary || undefined,
    };
  });

  return (
    <div className="p-6 flex flex-col gap-6 text-slate-100" id="admin-tenants-ledger-route">
      <div>
        <span className="text-[10px] font-mono tracking-wider text-slate-500 uppercase">
          Client Operations
        </span>
        <h1 className="text-xl font-extrabold tracking-tight text-white mt-0.5">
          Occupant Registry
        </h1>
      </div>

      <TenantsClientView initialTenants={tenants} />
    </div>
  );
}
