import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getTenantSummary } from '@/lib/calculations';
import ProfileClientView from './ProfileClientView';

export default async function TenantProfilePage() {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login');
  }

  const db = await getDb();
  const summary = getTenantSummary(db, user.id);

  return (
    <div className="p-6 flex flex-col gap-6" id="tenant-profile-route">
      <div>
        <span className="text-[10px] font-mono tracking-wider text-slate-500 uppercase">
          Identity Services
        </span>
        <h1 className="text-xl font-extrabold text-white tracking-tight mt-0.5">
          Compound Profile
        </h1>
      </div>

      <ProfileClientView user={user} summary={summary || undefined} />
    </div>
  );
}
