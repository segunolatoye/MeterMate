import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getTenantSummary } from '@/lib/calculations';
import { 
  BarChart, 
  Zap, 
  Droplets, 
  ShieldCheck, 
  Info,
  Building,
  MessageCircle
} from 'lucide-react';

export default async function TransparencyReportPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login');
  }

  const db = await getDb();
  
  // Format currency helper
  const formatNaira = (val: number) => {
    return '₦' + Math.abs(val).toLocaleString('en-NG', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  // Only include users who are part of the utility tracking
  const relevantProfiles = db.profiles.filter(p => 
    p.role === 'electricity_tenant' || 
    p.role === 'water_only_tenant' || 
    p.role === 'admin'
  );

  const tenantReports = relevantProfiles.map(profile => {
    const summary = getTenantSummary(db, profile.id);
    return {
      profile,
      summary
    };
  }).filter(r => r.summary !== null);

  // Sort by room label naturally (so Flat 2 comes before Flat 10)
  tenantReports.sort((a, b) => 
    (a.profile.room_label || '').localeCompare(b.profile.room_label || '', undefined, { numeric: true, sensitivity: 'base' })
  );

  // Generate WhatsApp Export Text
  const reportLines = [
    `*MeterMate Transparency Report*`,
    `Generated: ${new Date().toLocaleDateString('en-GB')}`,
    ``
  ];

  tenantReports.forEach(report => {
    const { profile, summary } = report;
    if (!summary) return;
    
    const owesElectricity = summary.electricityBalance < 0;
    const hasPendingWater = summary.outstandingWaterCount > 0;
    
    reportLines.push(`*${profile.room_label || 'Unassigned'} (${profile.full_name})*`);
    reportLines.push(`• Power Bal: ${owesElectricity ? '-' : (summary.electricityBalance > 0 ? '+' : '')}₦${Math.abs(summary.electricityBalance).toLocaleString()}`);
    reportLines.push(`• Water: ${hasPendingWater ? `${summary.outstandingWaterCount} pending` : 'Fully Paid'}`);
    reportLines.push(`• Escrow: ₦${summary.depositHeld.toLocaleString()}`);
    reportLines.push(``);
  });

  const whatsappText = encodeURIComponent(reportLines.join('\n'));
  const whatsappUrl = `https://wa.me/?text=${whatsappText}`;

  return (
    <div className="p-6 flex flex-col gap-6 text-slate-100 pb-24" id="transparency-report-screen">
      <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <BarChart className="w-24 h-24 text-emerald-500" />
        </div>
        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-bold font-sans uppercase tracking-[0.08em] text-emerald-500 flex items-center gap-1.5">
                <Building className="w-3 h-3" /> Compound Portal
              </span>
              <h1 className="text-2xl font-extrabold tracking-tight mt-1 text-white">
                Transparency Report
              </h1>
            </div>
            
            <a 
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/20 text-[#25D366] rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors shrink-0"
            >
              <MessageCircle className="h-4 w-4" />
              Export
            </a>
          </div>
          <p className="text-xs text-slate-400 mt-2 max-w-[280px] leading-relaxed">
            Public ledger showing real-time utility balances and escrow deposits for all occupants.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 mt-2">
        {tenantReports.map((report) => {
          const { profile, summary } = report;
          if (!summary) return null;

          const isElectricityTenant = profile.role === 'electricity_tenant' || profile.role === 'admin';
          const owesElectricity = summary.electricityBalance < 0;
          const electricityInCredit = summary.electricityBalance > 0;
          const hasPendingWater = summary.outstandingWaterCount > 0;

          return (
            <div key={profile.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-md flex flex-col gap-4">
              <div className="flex justify-between items-start border-b border-slate-800/60 pb-3">
                <div>
                  <h3 className="text-sm font-extrabold text-white tracking-tight">
                    {profile.room_label || 'Unassigned Room'}
                  </h3>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {profile.full_name}
                  </span>
                </div>
                <div className="bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                  <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500">
                    {profile.role.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                {/* Electricity Balance */}
                {isElectricityTenant && (
                  <div className="bg-slate-950/50 p-3 rounded-2xl border border-slate-800/80 flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${owesElectricity ? 'bg-red-500/10 text-red-500' : electricityInCredit ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-800 text-slate-400'}`}>
                      <Zap className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-0.5">Power Bal</span>
                      <span className={`text-sm font-mono font-extrabold ${owesElectricity ? 'text-red-400' : electricityInCredit ? 'text-emerald-400' : 'text-slate-300'}`}>
                        {owesElectricity ? '-' : ''}{formatNaira(summary.electricityBalance)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Water Status */}
                <div className="bg-slate-950/50 p-3 rounded-2xl border border-slate-800/80 flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${hasPendingWater ? 'bg-amber-500/10 text-amber-500' : 'bg-sky-500/10 text-sky-500'}`}>
                    <Droplets className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-0.5">Water Status</span>
                    <span className={`text-xs font-bold ${hasPendingWater ? 'text-amber-400' : 'text-sky-400'}`}>
                      {hasPendingWater ? `${summary.outstandingWaterCount} pending (${formatNaira(summary.outstandingWaterAmount)})` : 'Fully Paid'}
                    </span>
                  </div>
                </div>

                {/* Escrow Deposit */}
                <div className="bg-slate-950/50 p-3 rounded-2xl border border-slate-800/80 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block mb-0.5">Escrow Held</span>
                    <span className="text-sm font-mono font-extrabold text-indigo-400">
                      {formatNaira(summary.depositHeld)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex gap-3 items-start mt-2">
        <Info className="h-5 w-5 text-slate-500 shrink-0 mt-0.5" />
        <p className="text-[10px] text-slate-400 leading-relaxed">
          This transparency report is accessible to all compound occupants to foster trust and accountability. Electricity balances in <span className="text-emerald-400 font-bold">green</span> indicate a credit (prepayment), while balances in <span className="text-red-400 font-bold">red</span> indicate unpaid usage.
        </p>
      </div>
    </div>
  );
}
