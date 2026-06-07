'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, User, Landmark, HelpCircle, Phone, Mail, MapPin, Cpu, ShieldAlert, Lock, Key, CheckCircle, AlertCircle } from 'lucide-react';
import { Profile } from '@/lib/types';
import { TenantSummary } from '@/lib/calculations';
import DevicePushSetup from '@/components/DevicePushSetup';

interface ProfileClientViewProps {
  user: Profile;
  summary?: TenantSummary;
}

export default function ProfileClientView({ user, summary }: ProfileClientViewProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(null);

    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match.');
      return;
    }

    setIsChangingPassword(true);

    try {
      const res = await fetch('/api/profile/password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Password update failed.');
      }

      setPwSuccess('Password changed successfully! Keep it secure.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      router.refresh();
      setTimeout(() => setPwSuccess(null), 3000);
    } catch (err: any) {
      setPwError(err.message || 'Failed to update password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
      });
      if (res.ok) {
        window.location.href = '/login';
      }
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const copyMeter = (meterId?: string) => {
    if (meterId) {
      navigator.clipboard.writeText(meterId);
    }
  };

  return (
    <div className="flex flex-col gap-5" id="profile-client-layout">
      {/* Visual Identity Badge */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex items-center gap-4.5">
        <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 flex items-center justify-center text-xl font-bold font-mono">
          {user.full_name.charAt(0) || 'U'}
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-100">{user.full_name}</h2>
          <span className="text-[10px] font-mono tracking-wider font-bold text-slate-500 uppercase block mt-1">
            Role: {user.role.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Profile Particulars Fields */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col gap-4">
        <h3 className="text-xs uppercase font-mono tracking-wider font-bold text-slate-400 border-b border-slate-800/80 pb-2">
          Registration Details
        </h3>

        {/* Room label row */}
        <div className="flex items-start gap-3 text-xs leading-normal">
          <MapPin className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <span className="text-slate-500 block uppercase font-mono text-[9px] tracking-wider">Assigned Room Unit</span>
            <span className="font-bold text-slate-200">{user.room_label}</span>
          </div>
        </div>

        {/* Meter ID (only for electricity tenants) */}
        {user.role === 'electricity_tenant' && user.meter_id && (
          <div className="flex items-start gap-3 text-xs leading-normal">
            <Cpu className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
            <div className="w-full">
              <span className="text-slate-500 block uppercase font-mono text-[9px] tracking-wider">Electrical Sub-Meter ID</span>
              <div className="flex items-baseline justify-between w-full pr-1">
                <span className="font-bold font-mono text-slate-200">{user.meter_id}</span>
                <button
                  type="button"
                  id="copy-meter-id-trigger"
                  onClick={() => copyMeter(user.meter_id)}
                  className="text-[9px] font-mono hover:underline text-indigo-400"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Email row */}
        <div className="flex items-start gap-3 text-xs leading-normal">
          <Mail className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
          <div>
            <span className="text-slate-500 block uppercase font-mono text-[9px] tracking-wider">Email Address</span>
            <span className="font-medium text-slate-300">{user.email}</span>
          </div>
        </div>

        {/* Phone row */}
        <div className="flex items-start gap-3 text-xs leading-normal">
          <Phone className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
          <div>
            <span className="text-slate-500 block uppercase font-mono text-[9px] tracking-wider">Registered Phone</span>
            <span className="font-medium text-slate-300">{user.phone || 'Not configured'}</span>
          </div>
        </div>
      </div>

      {/* Change Password Card - Native iOS feel */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col gap-4">
        <h3 className="text-xs uppercase font-mono tracking-wider font-bold text-slate-400 border-b border-slate-800/80 pb-2 flex items-center gap-1.5">
          <Key className="h-4 w-4 text-emerald-400" /> Authentication Credentials
        </h3>

        <form onSubmit={handlePasswordChange} className="flex flex-col gap-4" id="tenant-change-password-form">
          {pwError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/15 text-red-400 text-xs flex gap-2 items-center animate-fade-in" id="pw-change-error">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{pwError}</span>
            </div>
          )}

          {pwSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 text-xs flex gap-2 items-center animate-fade-in" id="pw-change-success">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>{pwSuccess}</span>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-[9px] font-bold font-mono uppercase text-slate-400 mb-1.5 tracking-wider">Current Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 h-3.5 w-3.5" />
                <input
                  type="password"
                  placeholder="Enter current password (fallback: 12345)"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-850 focus:border-emerald-500 outline-none rounded-xl py-2 pl-9 pr-3 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-bold font-mono uppercase text-slate-400 mb-1.5 tracking-wider">New Password</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 h-3.5 w-3.5" />
                <input
                  type="password"
                  placeholder="At least 4 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-850 focus:border-emerald-500 outline-none rounded-xl py-2 pl-9 pr-3 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-bold font-mono uppercase text-slate-400 mb-1.5 tracking-wider">Confirm New Password</label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 h-3.5 w-3.5" />
                <input
                  type="password"
                  placeholder="Re-type new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-850 focus:border-emerald-500 outline-none rounded-xl py-2 pl-9 pr-3 text-xs text-white"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isChangingPassword}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-450 active:scale-98 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-emerald-500/5 mt-1"
          >
            {isChangingPassword ? 'Configuring Password...' : 'Apply Security Password'}
          </button>
        </form>
      </div>

      {/* Push Setup Component */}
      <DevicePushSetup userId={user.id} />

      {/* Log out Button */}
      <button
        id="sign-out-application-btn"
        onClick={handleLogout}
        disabled={isLoggingOut}
        className="w-full mt-2 py-3.5 bg-slate-900 border border-red-500/15 text-red-400 font-semibold text-sm rounded-xl flex items-center justify-center gap-2 cursor-pointer hover:bg-red-500/10 hover:text-red-300 active:scale-95 transition-all"
      >
        <LogOut className="h-4 w-4" />
        {isLoggingOut ? 'Terminating Session...' : 'Sign Out of Account'}
      </button>

      <p className="text-[9px] text-slate-600 text-center font-mono mt-2">
        MeterMate v1.0.0 • Mobile Progressive Web App
      </p>
    </div>
  );
}
