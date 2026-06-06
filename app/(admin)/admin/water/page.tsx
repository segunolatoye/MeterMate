import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import WaterClientView from './WaterClientView';

export default async function AdminWaterPage() {
  const user = await getSessionUser();
  if (!user || user.role !== 'admin') {
    redirect('/login');
  }

  const db = await getDb();
  
  // All occupants excluding admin
  const occupants = db.profiles.filter(p => p.role !== 'admin');
  const contributions = db.water_contributions;

  return (
    <div className="p-6 flex flex-col gap-6 text-slate-100" id="admin-water-route-enviro">
      <div>
        <span className="text-[10px] font-mono tracking-wider text-slate-500 uppercase">
          Compound Borehole Utilities
        </span>
        <h1 className="text-xl font-extrabold tracking-tight text-white mt-0.5" id="admin-water-title">
          Water Controller
        </h1>
      </div>

      <WaterClientView 
        occupants={occupants} 
        contributions={contributions} 
      />
    </div>
  );
}
