import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import PaymentsClientView from './PaymentsClientView';

export default async function AdminPaymentsPage() {
  const user = await getSessionUser();
  if (!user || user.role !== 'admin') {
    redirect('/login');
  }

  const db = await getDb();
  const rawPayments = db.payments;

  // Enhance payment list with tenant profiles for displaying Name & Room
  const payments = rawPayments.map(p => {
    const profile = db.profiles.find(prof => prof.id === p.tenant_id);
    return {
      ...p,
      room_label: profile?.room_label || 'Direct Admin',
      full_name: profile?.full_name || 'N/A'
    };
  });

  return (
    <div className="p-6 flex flex-col gap-6 text-slate-100" id="admin-payments-audit-ledger">
      <div>
        <span className="text-[10px] font-mono tracking-wider text-slate-500 uppercase">
          Financial Control Desk
        </span>
        <h1 className="text-xl font-extrabold tracking-tight text-white mt-0.5">
          Compound Ledger
        </h1>
      </div>

      <PaymentsClientView initialPayments={payments} />
    </div>
  );
}
