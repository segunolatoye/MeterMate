'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Shield, Zap, Droplets, AlertCircle, ArrowRight, Key, Laptop, Sparkles } from 'lucide-react';
import { auth } from '@/lib/firebase-client';
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';

const GoogleIcon = () => (
  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.61c-.28 1.51-1.14 2.81-2.4 3.65v3.01h3.86c2.26-2.09 3.56-5.17 3.56-8.51z"
    />
    <path
      fill="#34A853"
      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3.01c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.46v3.12C3.44 21.84 7.43 24 12 24z"
    />
    <path
      fill="#FBBC05"
      d="M5.27 14.28c-.25-.72-.39-1.49-.39-2.28s.14-1.56.39-2.28V6.6H1.46C.53 8.46 0 10.58 0 12.8s.53 4.34 1.46 6.2l3.81-3.12z"
    />
    <path
      fill="#EA4335"
      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.41-3.41C17.95 1.19 15.24 0 12 0 7.43 0 3.44 2.16 1.46 5.68l3.81 3.12c.95-2.85 3.6-4.96 6.73-4.96z"
    />
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  


  const executeServerSessionInit = async (idToken: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to establish secure session.');
      }

      setSuccessMsg('Secure session initialized!');
      window.location.href = data.redirectUrl;
    } catch (err: any) {
      setError(err.message || 'Session initialization failed.');
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      await executeServerSessionInit(idToken);
    } catch (err: any) {
      setError(err.message || 'Google Sign-In authentication failed.');
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await result.user.getIdToken();
      await executeServerSessionInit(idToken);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
      setIsLoading(false);
    }
  };



  return (
    <div className="flex-1 w-full overflow-y-auto flex flex-col justify-center px-6 py-10 relative z-10" id="login-screen-view">
      <div className="w-full max-w-sm mx-auto flex flex-col gap-8" id="login-container">
        {/* Branding Header */}
        <div className="flex flex-col items-center justify-center text-center mt-2 mb-4">
          <img src="/logo.svg" alt="MeterMate Logo" className="h-16 w-auto object-contain drop-shadow-xl" />
        </div>

        {/* Auth Error / Success feedback */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex gap-2.5 items-start animate-fade-in" id="auth-error-banner">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-xs flex gap-2.5 items-center animate-fade-in" id="auth-success-banner">
            <Sparkles className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* PRIMARY AUTHENTICATION BLOCK: google logic */}
        <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-[32px] p-8 shadow-[0_4px_30px_rgba(0,0,0,0.1)] relative overflow-hidden flex flex-col gap-7">
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />

          {/* Fallback Form */}
          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <div>
              <label className="block text-[9px] font-bold font-sans uppercase text-slate-400 tracking-wider mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 h-4 w-4" />
                <input
                  id="login-email-input"
                  type="email"
                  required
                  placeholder="you@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  suppressHydrationWarning
                  className="w-full bg-black/20 border border-white/10 backdrop-blur-sm focus:border-emerald-500 outline-none rounded-xl py-3.5 pl-10 pr-4 text-sm text-white transition-all font-medium shadow-inner"
                />
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-bold font-sans uppercase text-slate-400 tracking-wider mb-2">Secure Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 h-4 w-4" />
                <input
                  id="login-password-input"
                  type="password"
                  required
                  placeholder="Enter password (default: 123456)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  suppressHydrationWarning
                  className="w-full bg-black/20 border border-white/10 backdrop-blur-sm focus:border-emerald-500 outline-none rounded-xl py-3.5 pl-10 pr-4 text-sm text-white transition-all font-medium shadow-inner"
                />
              </div>
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              disabled={isLoading}
              className="w-full mt-3 bg-emerald-500 hover:bg-emerald-400 border border-emerald-400 active:scale-98 disabled:opacity-50 text-slate-950 py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer font-sans shadow-[0_0_20px_rgba(34,197,94,0.3)]"
            >
              {isLoading ? 'Verifying session...' : 'Proceed to Dashboard'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Elegant Divider between Primary and Alternate */}
          <div className="flex items-center text-center w-full gap-2 px-1 mt-1">
            <div className="flex-1 h-[1px] bg-white/10" />
            <span className="text-[9px] font-bold font-sans tracking-widest text-slate-500 uppercase shrink-0">
              or connect with
            </span>
            <div className="flex-1 h-[1px] bg-white/10" />
          </div>

          {/* Primary Action Button: iOS style google login */}
          <div className="flex justify-center">
            <button
              id="google-primary-login-btn"
              type="button"
              disabled={isLoading}
              onClick={handleGoogleLogin}
              className="w-14 h-14 bg-black/20 hover:bg-black/40 backdrop-blur-sm border border-white/10 active:scale-98 disabled:opacity-50 text-slate-100 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-inner"
              title="Sign in with Google"
            >
              <GoogleIcon />
            </button>
          </div>
        </div>

        {/* Footer text */}
        <div className="text-center mt-3 flex flex-col items-center gap-3">
          <div>
            <h2 className="text-xs font-bold tracking-widest text-slate-300 uppercase font-sans">
              Secure Authentication
            </h2>
            <p className="text-[10px] text-slate-500 mt-1">Authorized compound occupants only</p>
          </div>
          
          <div className="flex items-center gap-1.5 text-[9px] text-emerald-400 font-bold bg-emerald-500/5 border border-emerald-500/10 px-2.5 py-1 rounded-full uppercase tracking-widest shadow-inner">
            <Shield className="h-3 w-3" />
            End-to-End Encrypted
          </div>
        </div>
      </div>
    </div>
  );
}
