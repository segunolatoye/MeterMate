import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { getDb, getCurrentRate } from '@/lib/db';
import ElectricityClientView from './ElectricityClientView';

export default async function AdminElectricityPage() {
  const user = await getSessionUser();
  if (!user || user.role !== 'admin') {
    redirect('/login');
  }

  const db = await getDb();
  
  // Include admin and pseudo-tenant for Water Pump
  const electricityTenants = db.profiles.filter(p => p.role === 'electricity_tenant' || p.role === 'admin');
  electricityTenants.push({
    id: 'WATER_PUMP',
    full_name: 'Water Pumping Machine',
    room_label: 'Central Compound',
    role: 'electricity_tenant',
    email: '',
    phone: '',
    deposit_amount: 0,
    created_at: new Date().toISOString()
  });
  const currentRate = await getCurrentRate();
  const rateHistory = [...db.electricity_rates].sort((a,b) => 
    new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime()
  );

  return (
    <div className="p-6 flex flex-col gap-6 text-slate-100" id="admin-electricity-sub-view">
      <div>
        <span className="text-[10px] font-mono tracking-wider text-slate-500 uppercase">
          Grid Power Operations
        </span>
        <h1 className="text-xl font-extrabold tracking-tight text-white mt-0.5" id="admin-electricity-title">
          Electricity Manager
        </h1>
      </div>

      <ElectricityClientView 
        tenants={electricityTenants} 
        currentRate={currentRate} 
        rateHistory={rateHistory} 
      />
    </div>
  );
}
