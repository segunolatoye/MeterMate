'use client';

import React, { useState } from 'react';
import { Loader2, Send, CheckCircle, AlertCircle } from 'lucide-react';

export default function BroadcastForm() {
  const [manualTitle, setManualTitle] = useState('');
  const [manualBody, setManualBody] = useState('');
  const [manualUrl, setManualUrl] = useState('/dashboard');
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleBroadcastSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualTitle.trim() || !manualBody.trim()) return;

    setBroadcasting(true);
    setBroadcastSuccess('');
    setErrorMsg('');
    
    try {
      const res = await fetch('/api/notifications/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: manualTitle,
          body: manualBody,
          url: manualUrl
        }),
      });

      if (res.ok) {
        setBroadcastSuccess('Push broadcast dispatched successfully! All subscriber devices notified.');
        setManualTitle('');
        setManualBody('');
        setManualUrl('/dashboard');
        setTimeout(() => setBroadcastSuccess(''), 4000);
      } else {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to dispatch manual push');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Action failed.');
    } finally {
      setBroadcasting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 bg-slate-900 rounded-3xl p-5 border border-slate-800">
      <div className="flex items-center gap-2 mb-2 border-b border-slate-800/80 pb-2">
        <Send className="h-4 w-4 text-emerald-400" />
        <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-400">Composed Message Broadcast</h3>
      </div>

      {broadcastSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 text-[10px] text-emerald-400 flex items-start gap-1.5">
          <CheckCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{broadcastSuccess}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-500/10 text-[10px] text-red-400 flex items-start gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleBroadcastSubmit} className="flex flex-col gap-4" id="manual-notif-form">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Notification Title
          </label>
          <input
            type="text"
            required
            placeholder="e.g., Pumping Levy Active 💧"
            value={manualTitle}
            onChange={(e) => setManualTitle(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Notification Body Message
          </label>
          <textarea
            required
            rows={3}
            placeholder="Write detailed alerts body here..."
            value={manualBody}
            onChange={(e) => setManualBody(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Redirect Target URL (Optional)
          </label>
          <input
            type="text"
            placeholder="/dashboard"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={broadcasting}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
          >
            {broadcasting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Broadcasting to all profiles...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Submit Custom Broadcast ✈️
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
