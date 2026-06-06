'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Bell, 
  X, 
  Loader2, 
  Sparkles, 
  Play, 
  CheckCircle, 
  ShieldAlert, 
  Smartphone, 
  Send, 
  Zap, 
  Droplets, 
  Clock, 
  FileText, 
  Info,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: 'admin' | 'electricity_tenant' | 'water_only_tenant';
  room_label?: string;
  deposit_amount: number;
}

interface GlobalHeaderProps {
  user?: UserProfile | null;
}

interface NotificationLog {
  id: string;
  title: string;
  body: string;
  url: string;
  created_at: string;
  sender_id: string;
  target: string;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function GlobalHeader({ user }: GlobalHeaderProps) {
  const pathname = usePathname();

  // If path is public or auth, do not show navigation header
  if (
    !user ||
    pathname.includes('/login') ||
    pathname.includes('/register') ||
    pathname === '/'
  ) {
    return null;
  }

  const activeUser = user;

  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'logs' | 'setup' | 'admin'>('logs');

  // Push subscription states
  const [supported, setSupported] = useState<boolean | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loadingSub, setLoadingSub] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [inIframe, setInIframe] = useState(false);

  // Notification logs state
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Admin broadcast form state
  const [manualTitle, setManualTitle] = useState('');
  const [manualBody, setManualBody] = useState('');
  const [manualUrl, setManualUrl] = useState('/dashboard');
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState('');

  // Auto configure tabs
  const isAdmin = activeUser.role === 'admin';

  useEffect(() => {
    // Check support on mount
    if (typeof window !== 'undefined') {
      const isPushSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
      setSupported(isPushSupported);

      const isEmbedded = window.self !== window.top;
      setInIframe(isEmbedded);

      if (isPushSupported) {
        setPermission(Notification.permission);
        checkCurrentSubscription();
      } else {
        setLoadingSub(false);
      }
    }
  }, []);

  // Fetch notification log when menu is opened
  useEffect(() => {
    if (menuOpen) {
      loadNotificationLogs();
    }
  }, [menuOpen]);

  async function checkCurrentSubscription() {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      
      const sub = await reg.pushManager.getSubscription();
      setIsSubscribed(!!sub);
    } catch (err: any) {
      console.warn('Error verifying browser push parameters:', err);
    } finally {
      setLoadingSub(false);
    }
  }

  async function loadNotificationLogs() {
    setLoadingLogs(true);
    try {
      const res = await fetch('/api/notifications/list');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.notifications) {
          setNotifications(data.notifications);
        }
      }
    } catch (err) {
      console.error('Failed to grab historic logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  }

  async function handleSubscribe() {
    setSubscribing(true);
    setErrorMsg('');
    try {
      const permResult = await Notification.requestPermission();
      setPermission(permResult);

      if (permResult !== 'granted') {
        if (window.self !== window.top) {
          throw new Error('Notification permission was blocked in preview. Standard frame sandboxes restrict this action. Please open the app in a new tab.');
        }
        throw new Error('Notification permission has been denied. Adjust your browser address bar clearances.');
      }

      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const keyRes = await fetch('/api/notifications/vapid');
      if (!keyRes.ok) {
        throw new Error('Failed to fetch server credentials');
      }
      const { publicKey } = await keyRes.json();

      if (!publicKey) {
        throw new Error('Empty encryption key returned by backend');
      }

      const subscribeOptions = {
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      };

      const subscription = await reg.pushManager.subscribe(subscribeOptions);

      const saveRes = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: activeUser.id,
          subscription
        }),
      });

      if (!saveRes.ok) {
        throw new Error('Failed to register subscription endpoints in database');
      }

      setIsSubscribed(true);
    } catch (err: any) {
      console.error('Push integration failure:', err);
      setErrorMsg(err.message || 'Configure action cancelled.');
    } finally {
      setSubscribing(false);
    }
  }

  async function handleUnsubscribe() {
    setSubscribing(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
      }
      setIsSubscribed(false);
    } catch (err: any) {
      console.error('Error disabling push:', err);
    } finally {
      setSubscribing(false);
    }
  }

  async function handleSendTest() {
    setTesting(true);
    try {
      const res = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: activeUser.id }),
      });
      if (res.ok) {
        // Reload logs because list logs are updated
        setTimeout(loadNotificationLogs, 500);
      }
    } catch (err) {
      console.error('Failed to trigger manual verification alarm:', err);
    } finally {
      setTimeout(() => setTesting(false), 800);
    }
  }

  async function handleBroadcastSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualTitle.trim() || !manualBody.trim()) return;

    setBroadcasting(true);
    setBroadcastSuccess('');
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
        // Refresh alert history logs
        loadNotificationLogs();
      } else {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to dispatch manual push');
      }
    } catch (err: any) {
      console.error('Error broadcasting manual notification:', err);
      setErrorMsg(err.message || 'Submission failed.');
    } finally {
      setBroadcasting(false);
    }
  }

  // Format relative timestamp
  function formatRelativeTime(dateString: string) {
    try {
      const past = new Date(dateString).getTime();
      const now = Date.now();
      const diffMs = now - past;
      
      const seconds = Math.floor(diffMs / 1000);
      if (seconds < 60) return 'Just now';
      
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes}m ago`;
      
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    } catch (e) {
      return 'Recent';
    }
  }

  // Choose icon based on notification title/type
  function getNotificationIcon(title: string) {
    const t = title.toLowerCase();
    if (t.includes('electricity') || t.includes('token') || t.includes('prepayment')) {
      return <Zap className="h-4 w-4 text-emerald-400" />;
    }
    if (t.includes('water') || t.includes('pumping') || t.includes('levy')) {
      return <Droplets className="h-4 w-4 text-blue-400" />;
    }
    if (t.includes('confirm') || t.includes('audit')) {
      return <CheckCircle className="h-4 w-4 text-emerald-400" />;
    }
    return <Info className="h-4 w-4 text-slate-400" />;
  }

  return (
    <>
      {/* Visual Top Bar Header */}
      <header className="sticky top-0 z-40 h-[56px] w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-900 px-5 py-3.5 flex items-center justify-between" id="global-application-header">
        <Link href={isAdmin ? '/admin' : '/dashboard'} className="flex items-center gap-2 hover:opacity-90 transition-opacity" id="header-branding">
          <div className="w-6.5 h-6.5 rounded-lg bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center text-emerald-400 font-bold text-xs" id="header-accent-brand-icon">
            <Zap className="h-3.5 w-3.5 fill-emerald-400/15" />
          </div>
          <span className="font-extrabold text-[13px] tracking-wider uppercase font-sans text-slate-200">
            MeterMate
          </span>
        </Link>

        {/* Header interactive Actions */}
        <div className="flex items-center gap-2">
          {/* Dashboard Notifications Bell */}
          <button
            onClick={() => setMenuOpen(true)}
            id="open-notifications-menu-btn"
            className="relative p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-850 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
            aria-label="Open notifications center"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>

          {/* Quick role tag */}
          <span className="text-[9px] font-bold font-mono px-2 py-1 rounded-lg bg-slate-900 text-slate-400 border border-slate-800 uppercase tracking-widest">
            {isAdmin ? 'Landlord' : 'Tenant'}
          </span>
        </div>
      </header>

      {/* Slide-over Notifications Fullscreen Panel Drawer */}
      <AnimatePresence>
        {menuOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden" id="notifications-drawer-backdrop">
            {/* Backdrop Layer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />

            {/* Content Drawer (Slides from right or bottom depending on mobile dimensions) */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="absolute bottom-0 left-0 right-0 mx-auto max-w-[430px] h-[90vh] bg-slate-900 rounded-t-3xl border-t border-slate-800 shadow-2xl flex flex-col"
              id="notifications-overlay-panel"
            >
              {/* Drawer Draggable bar decoration */}
              <div className="w-12 h-1 bg-slate-800 rounded-full mx-auto my-3 shrink-0" />

              {/* Drawer Header Block */}
              <div className="px-5 pb-3 flex items-center justify-between border-b border-slate-800 shrink-0">
                <div className="flex flex-col text-left">
                  <h2 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                    <Bell className="h-4 w-4 text-emerald-400" /> Alert Center
                  </h2>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-none">
                    Configure web push capabilities or broadcast updates
                  </p>
                </div>
                <button
                  onClick={() => setMenuOpen(false)}
                  id="close-notifications-menu-btn"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Drawer Tab Navigation */}
              <div className="px-5 py-2 flex gap-1 border-b border-slate-800/50 bg-slate-950/30 shrink-0">
                <button
                  onClick={() => { setActiveTab('logs'); setErrorMsg(''); setBroadcastSuccess(''); }}
                  id="notif-tab-logs-btn"
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${
                    activeTab === 'logs'
                      ? 'bg-slate-850 text-slate-100 border border-slate-75 *:'
                      : 'text-slate-500 hover:text-slate-350'
                  }`}
                >
                  History Logs
                </button>
                <button
                  onClick={() => { setActiveTab('setup'); setErrorMsg(''); setBroadcastSuccess(''); }}
                  id="notif-tab-setup-btn"
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${
                    activeTab === 'setup'
                      ? 'bg-slate-850 text-slate-100 border border-slate-75'
                      : 'text-slate-500 hover:text-slate-350'
                  }`}
                >
                  Device Push setup
                </button>
                {isAdmin && (
                  <button
                    onClick={() => { setActiveTab('admin'); setErrorMsg(''); setBroadcastSuccess(''); }}
                    id="notif-tab-admin-btn"
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${
                      activeTab === 'admin'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'text-slate-500 hover:text-slate-350'
                    }`}
                  >
                    Broadcast
                  </button>
                )}
              </div>

              {/* Drawer Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto px-5 py-4 text-left flex flex-col gap-4">
                {errorMsg && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/15 text-[10px] text-red-400 flex items-start gap-1.5" id="notif-menu-error">
                    <ShieldAlert className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {broadcastSuccess && (
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/15 text-[10px] text-emerald-400 flex items-start gap-1.5" id="notif-menu-success">
                    <CheckCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>{broadcastSuccess}</span>
                  </div>
                )}

                {/* TAB 1: HISTORY LOGS */}
                {activeTab === 'logs' && (
                  <div className="flex flex-col gap-3" id="notif-tab-logs-view">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-sans">
                        Recent Alerts Feed
                      </span>
                      <button
                        onClick={loadNotificationLogs}
                        className="text-[10px] text-emerald-400 font-bold hover:underline transition-all cursor-pointer flex items-center gap-1"
                        disabled={loadingLogs}
                      >
                        {loadingLogs ? (
                          <Loader2 className="h-2.5 w-2.5 animate-spin" />
                        ) : 'Refresh'}
                      </button>
                    </div>

                    {loadingLogs && notifications.length === 0 ? (
                      <div className="py-12 flex flex-col items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 text-slate-500 animate-spin" />
                        <span className="text-[10px] text-slate-500">Querying compound notifications...</span>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800/50 flex flex-col items-center justify-center text-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                          <Bell className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-xs font-bold text-slate-400">Zero notifications posted</span>
                          <span className="text-[9px] text-slate-500 max-w-xs px-4">
                            You & this device haven't registered or received any custom system broadcasts or billing tokens recently.
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2.5" id="notif-logs-list">
                        {notifications.map((notif) => (
                          <div 
                            key={notif.id}
                            className="bg-slate-950 border border-slate-850 rounded-xl p-3.5 flex items-start gap-3 hover:border-slate-800 transition-colors"
                          >
                            <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                              {getNotificationIcon(notif.title)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-slate-200 truncate pr-1">
                                  {notif.title}
                                </span>
                                <span className="text-[8.5px] font-mono text-slate-500 shrink-0 uppercase tracking-widest">
                                  {formatRelativeTime(notif.created_at)}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 leading-relaxed mt-1 text-left">
                                {notif.body}
                              </p>
                              {notif.target !== 'all' && (
                                <span className="inline-flex mt-2 text-[8px] font-mono font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/10">
                                  🔐 Private Alert
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: DEVICE SETUP */}
                {activeTab === 'setup' && (
                  <div className="flex flex-col gap-3.5" id="notif-tab-setup-view">
                    {supported === false ? (
                      <div className="bg-slate-950 border border-slate-850 rounded-2xl p-5 text-slate-200">
                        <div className="flex items-start gap-3">
                          <ShieldAlert className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                          <div>
                            <h4 className="text-xs font-bold text-slate-300">Push Notifications Unsupported</h4>
                            <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                              Your combined system browser, PWA constraints, or layout sandbox does not allow registering native standard service-worker endpoints. Try using standard Mobile Safari, Mobile Chrome, or computer views outside iframe previews.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3.5">
                        <div className="bg-slate-950 border border-slate-850 rounded-2xl p-5 flex flex-col gap-3.5">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-1.5">
                              <Smartphone className={`h-4 w-4 ${isSubscribed ? 'text-emerald-400' : 'text-slate-500'}`} />
                              <h3 className="text-xs font-bold uppercase font-sans tracking-wider text-slate-400 leading-none">
                                Alert Delivery Configuration
                              </h3>
                            </div>
                            {loadingSub ? (
                              <Loader2 className="h-4 w-4 text-slate-500 animate-spin" />
                            ) : isSubscribed ? (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/10">
                                Connected
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-900 text-slate-500">
                                Inactive
                              </span>
                            )}
                          </div>

                          <div className="text-left flex flex-col gap-1">
                            <span className="text-xs font-bold text-slate-300">Push Notifications</span>
                            <span className="text-[10px] text-slate-500 leading-relaxed">
                              Once registered, you will receive notifications directly on your Android / iOS or MacOS / Windows lock-screen as soon as the landlord logs a payment audit, posts token pin lists, or triggers pumps.
                            </span>
                          </div>

                          {inIframe && !isSubscribed && (
                            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/15 text-[10px] text-amber-300/90 flex flex-col gap-2.5" id="iframe-permission-alert">
                              <div className="flex items-start gap-1.5 font-sans font-bold text-xs text-amber-200">
                                <ShieldAlert className="h-4 w-4 shrink-0 text-amber-400" />
                                <span>Iframe Sandboxing Notification</span>
                              </div>
                              <span className="leading-relaxed">
                                Standard browser security blocks permissions requests inside embedded sandbox panels (iframes) to protect customer endpoints. Open MeterMate in a clean dedicated tab or window to grant subscription privileges!
                              </span>
                              <a
                                href={typeof window !== 'undefined' ? window.location.href : '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="self-start inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold bg-amber-500 hover:bg-amber-450 text-slate-950 rounded-lg transition-colors cursor-pointer"
                              >
                                Open App in New Tab ↗
                              </a>
                            </div>
                          )}

                          {loadingSub ? (
                            <div className="h-10 rounded-xl bg-slate-900 border border-slate-850/50 flex items-center justify-center">
                              <Loader2 className="h-4 w-4 text-slate-600 animate-spin" />
                            </div>
                          ) : isSubscribed ? (
                            <div className="flex gap-2" id="drawer-subscribed-actions">
                              <button
                                onClick={handleSendTest}
                                disabled={testing}
                                className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 font-bold text-[10.5px] text-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                              >
                                {testing ? (
                                  <>
                                    <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
                                    Testing...
                                  </>
                                ) : (
                                  <>
                                    <Play className="h-3 w-3 text-slate-400 fill-slate-400" />
                                    Trigger test alert
                                  </>
                                )}
                              </button>
                              
                              <button
                                onClick={handleUnsubscribe}
                                disabled={subscribing}
                                className="py-2.5 px-3 rounded-xl bg-transparent hover:bg-slate-950 border border-transparent font-semibold text-[10.5px] text-slate-500 hover:text-slate-400 transition-colors cursor-pointer"
                              >
                                Deactivate
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={handleSubscribe}
                              disabled={subscribing}
                              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              {subscribing ? (
                                <>
                                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                                  Registering...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="h-4 w-4" />
                                  Enable Device Utilities Alerts
                                </>
                              )}
                            </button>
                          )}

                          {permission === 'denied' && !isSubscribed && (
                            <span className="text-[9px] text-amber-500 leading-normal block pt-1 font-medium text-left">
                              ⚠️ Browser site alerts permission was blocklisted. Adjust settings inside the URL safety lock icon, then verify subscription again.
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: ADMIN BROADCAST */}
                {activeTab === 'admin' && isAdmin && (
                  <div className="flex flex-col gap-3.5" id="notif-tab-admin-view">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 font-sans">
                      Composed Message Broadcast
                    </span>

                    <form onSubmit={handleBroadcastSubmit} className="flex flex-col gap-4 bg-slate-950 border border-slate-850 rounded-2xl p-5" id="manual-notif-form">
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
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
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
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
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
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                        />
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={broadcasting}
                          className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-slate-950 font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50"
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
                )}
              </div>

              {/* Drawer footer decoration element */}
              <div className="bg-slate-950 border-t border-slate-850 px-5 py-3 shrink-0 rounded-b-none">
                <div className="flex items-center justify-between text-[8px] font-mono text-slate-600 tracking-wider">
                  <span>METERMATE HIGH-SPEED SYSTEM CONTEXT</span>
                  <span>V2.2</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
