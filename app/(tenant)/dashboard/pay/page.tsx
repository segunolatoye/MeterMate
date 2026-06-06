import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getTenantSummary } from '@/lib/calculations';
import PayClientView from './PayClientView';

export default async function PayRoutePage({
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

  // Parse any pre-selected query routing parameters
  const resolvedParams = await searchParams;
  const initialMethod = typeof resolvedParams.method === 'string' ? resolvedParams.method : 'card';
  const initialType = typeof resolvedParams.type === 'string' ? resolvedParams.type : 'electricity';

  // Securely retrieve bank details from process.env server-side
  const bankDetails = {
    bankName: process.env.TRANSFER_BANK_NAME || 'Sterling Bank',
    accountNumber: process.env.TRANSFER_ACCOUNT_NUMBER || '0012345678',
    accountName: process.env.TRANSFER_ACCOUNT_NAME || 'MeterMate Compound Utility Account',
  };

  return (
    <div className="p-6 flex flex-col gap-5 animate-fade-in" id="make-payment-route-view">
      <div>
        <span className="text-[10px] font-bold font-sans uppercase tracking-[0.08em] text-slate-400">
          Finance Portal
        </span>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight mt-0.5" id="pay-screen-h1">
          Submit Payment
        </h1>
      </div>

      <PayClientView
        user={user}
        summary={summary}
        initialMethod={initialMethod}
        initialType={initialType}
        bankDetails={bankDetails}
      />
    </div>
  );
}
