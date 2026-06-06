'use client';

import React, { useState } from 'react';
import { Sparkles, Check, X, Ban, HelpCircle, ArrowRight } from 'lucide-react';
import { Profile, WaterContribution } from '@/lib/types';

interface WaterStatusGridProps {
  tenants: Profile[];
  contributions: WaterContribution[];
  onStatusToggle: (contributionId: string, currentStatus: 'pending' | 'paid' | 'waived') => void;
  isUpdating?: boolean;
}

export default function WaterStatusGrid({
  tenants,
  contributions,
  onStatusToggle,
  isUpdating = false,
}: WaterStatusGridProps) {
  // We will display these 3 months for simple tracking UI (April, May, June 2026)
  const displayMonths = ['2026-04', '2026-05', '2026-06'];
  const monthLabels: { [key: string]: string } = {
    '2026-04': 'April',
    '2026-05': 'May',
    '2026-06': 'June',
  };

  const findContribution = (tenantId: string, month: string) => {
    return contributions.find(c => c.tenant_id === tenantId && c.month === month);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl" id="water-status-compliance-grid">
      <div className="flex items-center justify-between mb-4 px-1">
        <div>
          <span className="text-[10px] font-mono tracking-wider font-bold text-slate-500 uppercase">
            Payment Log Grid
          </span>
          <h3 className="text-sm font-bold text-slate-100 mt-0.5">
            Tenants vs Months Matrix
          </h3>
        </div>
        <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-2 py-1 rounded border border-slate-800">
          Year: 2026
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-[10px] font-mono uppercase text-slate-500">
              <th className="py-2.5 px-2 font-medium">Tenant</th>
              {displayMonths.map(month => (
                <th key={month} className="py-2.5 px-2 text-center font-medium">
                  {monthLabels[month]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {tenants.map(tenant => (
              <tr key={tenant.id} className="text-xs hover:bg-slate-950/20 transition-colors">
                <td className="py-3 px-2">
                  <div className="font-bold text-slate-200">{tenant.room_label}</div>
                  <div className="text-[10px] text-slate-500 truncate max-w-[110px]">{tenant.full_name}</div>
                </td>

                {displayMonths.map(month => {
                  const contrib = findContribution(tenant.id, month);

                  if (!contrib) {
                    return (
                      <td key={month} className="py-3 px-2 text-center">
                        <span className="text-[10px] text-slate-600 bg-slate-950 px-2 py-1 rounded font-mono select-none">
                          Empty
                        </span>
                      </td>
                    );
                  }

                  const getStatusStyle = (status: typeof contrib.status) => {
                    switch (status) {
                      case 'paid':
                        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25';
                      case 'pending':
                        return 'bg-red-500/10 text-red-400 border-red-500/25';
                      case 'waived':
                        return 'bg-slate-800 text-slate-400 border-slate-750/30';
                      default:
                        return 'bg-slate-900 text-slate-500 border-slate-800';
                    }
                  };

                  return (
                    <td key={month} className="py-3 px-2 text-center">
                      <button
                        id={`water-toggle-${tenant.id}-${month}`}
                        onClick={() => !isUpdating && onStatusToggle(contrib.id, contrib.status)}
                        disabled={isUpdating}
                        className={`inline-flex flex-col items-center justify-center border font-mono rounded-lg px-2.5 py-1.5 min-w-[70px] uppercase font-bold text-[9px] transition-all cursor-pointer active:scale-95 ${getStatusStyle(
                          contrib.status
                        )}`}
                      >
                        <span>{contrib.status}</span>
                        <span className="text-[7px] text-slate-500 mt-0.5 font-normal tracking-wide">
                          ₦{contrib.amount.toLocaleString()}
                        </span>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Interactive Legend description */}
      <div className="mt-4 pt-3.5 border-t border-slate-800 flex flex-col gap-1.5 text-[10px] text-slate-400">
        <div className="flex gap-4 justify-center flex-wrap leading-tight font-mono">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded bg-emerald-400" />
            Paid (N3k)
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded bg-red-400" />
            Unpaid (N3k)
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded bg-slate-600" />
            Waived (N0)
          </span>
        </div>
        <p className="text-[9px] text-center text-slate-500 mt-1 leading-relaxed">
          ⚡ <strong>Administrative Shortcut:</strong> Tap on any month cell badge above to cycle status directly between Paid ➔ Pending ➔ Waived securely.
        </p>
      </div>
    </div>
  );
}
