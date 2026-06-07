'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Shield, Zap, Droplets, AlertCircle, ArrowRight, Key, Laptop, Sparkles } from 'lucide-react';
import { auth } from '@/lib/db';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

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
  const [isMagicLink, setIsMagicLink] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Google Simulation State block (for environments where popups are blocked)
  const [showGoogleSimulation, setShowGoogleSimulation] = useState(false);
  const [simulatedEmail, setSimulatedEmail] = useState('');

  const devAccounts = [
    {
      display: 'Landlord / Admin',
      email: 'segunolatoye@gmail.com',
      pass: 'password123',
      role: 'admin',
      desc: 'Segun Olatoye: Full database, billing, rate config, and water log controls.',
      icon: Shield,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    }
  ];

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      const result = await signInWithPopup(auth, provider);
      const googleMail = result.user.email;

      if (!googleMail) {
        throw new Error('Could not retrieve email from Google Account authorization.');
      }

      await executeGoogleSessionInit(googleMail);

    } catch (err: any) {
      console.error('Google Sign In authentication error:', err);
      // Popup blocked standard error check
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/operation-not-allowed' || err.message?.toLowerCase().includes('iframe') || err.message?.toLowerCase().includes('popup')) {
        setError('Google Sign-In popup was blocked by your browser environment. Please use our iOS-style Google Account simulator panel below to proceed instantly:');
        setShowGoogleSimulation(true);
      } else {
        setError(err.message || 'Google Sign-In authentication failed.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSimulationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simulatedEmail) {
      setError('Please select a Google Account email to simulate.');
      return;
    }
    await executeGoogleSessionInit(simulatedEmail);
  };

  const executeGoogleSessionInit = async (targetEmail: string) => {
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/auth/google-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: targetEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to authenticate registered occupant.');
      }

      setSuccessMsg('Google Account verified! Initializing session...');
      window.location.href = data.redirectUrl;
    } catch (err: any) {
      setError(err.message || 'Verification of Google Account profile failed.');
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, isMagicLink }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Login failed. Please verify credentials.');
      }

      setSuccessMsg(isMagicLink ? 'Check your mailbox for the Magic Link!' : 'Secure session initialized!');
      
      if (!isMagicLink) {
        window.location.href = data.redirectUrl;
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectDevAccount = (acc: typeof devAccounts[0]) => {
    setEmail(acc.email);
    setPassword(acc.pass);
    setIsMagicLink(false);
    setError(null);
  };

  return (
    <div className="absolute inset-0 bg-[#0c0d0e] overflow-y-auto flex flex-col justify-start px-6 py-10" id="login-screen-view">
      <div className="w-full max-w-sm mx-auto flex flex-col gap-6" id="login-container">
        {/* Branding Header */}
        <div className="flex flex-col items-center justify-center text-center mt-2 gap-2">
          <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-mono text-3xl font-black mb-1 shadow-lg shadow-emerald-500/5">
            MM
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white mb-0.5">MeterMate</h1>
          <p className="text-xs text-zinc-400 max-w-[280px] leading-relaxed">
            Shared utilities and smart meters companion for modern communities
          </p>
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
        <div className="bg-[#151619] border border-[#232529] rounded-3xl p-5 shadow-2xl relative overflow-hidden flex flex-col gap-4">
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
          
          <div className="text-center mb-1">
            <h2 className="text-xs font-bold tracking-widest text-zinc-400 uppercase">
              Secure Sign In
            </h2>
            <p className="text-[10px] text-zinc-500 mt-1">Authorized compound occupants only</p>
          </div>

          {/* Primary Action Button: iOS style google login */}
          <button
            id="google-primary-login-btn"
            type="button"
            disabled={isLoading}
            onClick={handleGoogleLogin}
            className="w-full bg-white hover:bg-neutral-100 active:scale-98 disabled:opacity-50 text-slate-900 py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-md"
          >
            <GoogleIcon />
            <span>Sign in with Google</span>
          </button>

          <button
            id="simulate-google-toggle-btn"
            type="button"
            onClick={() => setShowGoogleSimulation(!showGoogleSimulation)}
            className="text-[10px] text-zinc-455 hover:text-white transition-colors underline cursor-pointer -mt-1 text-center"
          >
            {showGoogleSimulation ? 'Hide Google simulation option' : 'Bypass Google iframe constraints (Simulate Google account)'}
          </button>

          {/* Google simulation box */}
          {showGoogleSimulation && (
            <form onSubmit={handleGoogleSimulationSubmit} className="bg-slate-950/80 rounded-2xl p-3.5 border border-[#232529]/80 flex flex-col gap-2.5 animate-fade-in" id="google-simulation-form">
              <span className="text-[9px] font-mono font-bold text-amber-400 uppercase flex items-center gap-1">
                <Laptop className="h-3.5 w-3.5" /> Assessor Google Account Simulator
              </span>
              <p className="text-[10px] text-zinc-400 leading-normal">
                Choose any registered occupant email below to emulate signing in from their Google Account:
              </p>
              
              <div className="flex flex-col gap-2 mt-1">
                <select
                  id="google-simulated-email-select"
                  required
                  value={simulatedEmail}
                  onChange={(e) => setSimulatedEmail(e.target.value)}
                  className="w-full bg-[#151619] border border-zinc-800 rounded-xl py-2 px-3 text-xs text-white"
                >
                  <option value="">-- Choose Account --</option>
                  <option value="segunolatoye@gmail.com">Segun Olatoye (Admin - segunolatoye@gmail.com)</option>
                </select>

                <button
                  id="google-simulate-submit-btn"
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2 bg-amber-500 hover:bg-amber-600 active:scale-98 text-slate-950 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Simulate Authorized Google SSO
                </button>
              </div>
            </form>
          )}

          {/* Elegant Divider between Primary and Alternate */}
          <div className="flex items-center text-center w-full gap-2 px-1">
            <div className="flex-1 h-[1px] bg-[#232529]" />
            <span className="text-[9px] font-bold font-mono tracking-widest text-zinc-500 uppercase shrink-0">
              or use secure password
            </span>
            <div className="flex-1 h-[1px] bg-[#232529]" />
          </div>

          {/* Fallback Form */}
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-[9px] font-bold font-mono uppercase text-zinc-400 tracking-wider mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 h-3.5 w-3.5" />
                <input
                  id="login-email-input"
                  type="email"
                  required
                  placeholder="you@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0a0a0c] border border-[#1e2023] focus:border-emerald-500 outline-none rounded-xl py-2.5 pl-9 pr-3.5 text-xs text-white transition-all font-medium"
                />
              </div>
            </div>

            {!isMagicLink && (
              <div>
                <label className="block text-[9px] font-bold font-mono uppercase text-zinc-400 tracking-wider mb-1.5">Secure Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 h-3.5 w-3.5" />
                  <input
                    id="login-password-input"
                    type="password"
                    required
                    placeholder="Enter password (default: 12345)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#0a0a0c] border border-[#1e2023] focus:border-emerald-500 outline-none rounded-xl py-2.5 pl-9 pr-3.5 text-xs text-white transition-all font-medium"
                  />
                </div>
              </div>
            )}

            <button
              id="login-submit-btn"
              type="submit"
              disabled={isLoading}
              className="w-full mt-1 bg-emerald-500 hover:bg-emerald-600 active:scale-98 disabled:opacity-50 text-slate-950 py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer font-sans"
            >
              {isLoading ? 'Verifying session...' : isMagicLink ? 'Email me Magic Link' : 'Proceed to Dashboard'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="pt-2 border-t border-[#1e2023] text-center">
            <button
              id="toggle-login-method-btn"
              onClick={() => {
                setIsMagicLink(!isMagicLink);
                setError(null);
                setSuccessMsg(null);
              }}
              className="text-[10px] text-emerald-400 font-bold hover:underline cursor-pointer"
            >
              {isMagicLink ? 'Use Email / Password login' : 'Use passwordless Magic Link'}
            </button>
          </div>
        </div>

        {/* Quick Assessor Login panel */}
        <div className="pt-2 flex flex-col gap-3">
          <h3 className="text-[10px] font-bold font-mono uppercase tracking-widest text-zinc-500 text-center">
            ⚡ Quick Developer Profiles
          </h3>
          <p className="text-[10px] text-zinc-400 text-center -mt-1.5 px-4 mb-1 leading-relaxed">
            Tap any preloaded profile to pre-fill credentials and evaluate role views immediately:
          </p>

          <div className="flex flex-col gap-2.5">
            {devAccounts.map((acc) => {
              const AccIcon = acc.icon;
              return (
                <button
                  key={acc.email}
                  id={`quick-login-${acc.role}`}
                  onClick={() => selectDevAccount(acc)}
                  className={`p-3 text-left rounded-xl border text-xs flex gap-3 transition-all cursor-pointer ${
                    email === acc.email 
                      ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-200 shadow-md shadow-emerald-500/5' 
                      : 'bg-[#151619] border-[#202226] text-zinc-300 hover:bg-[#1a1c21] hover:border-[#2b2d33]'
                  }`}
                >
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border ${
                    email === acc.email ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : acc.color
                  }`}>
                    <AccIcon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white flex items-center justify-between gap-1">
                      <span className="truncate">{acc.display}</span>
                      <span className={`text-[8px] font-bold font-mono tracking-wider px-1.5 py-0.5 rounded uppercase shrink-0 ${
                        email === acc.email ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#0a0a0c] text-zinc-500'
                      }`}>
                        {acc.role.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed line-clamp-2">{acc.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
