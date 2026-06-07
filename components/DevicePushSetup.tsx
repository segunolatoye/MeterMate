'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, Sparkles, Play, ShieldAlert, Smartphone } from 'lucide-react';

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

interface DevicePushSetupProps {
  userId: string;
}

export default function DevicePushSetup({ userId }: DevicePushSetupProps) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loadingSub, setLoadingSub] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [inIframe, setInIframe] = useState(false);

  useEffect(() => {
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
          userId: userId,
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
      await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
    } catch (err) {
      console.error('Failed to trigger manual verification alarm:', err);
    } finally {
      setTimeout(() => setTesting(false), 800);
    }
  }

  if (supported === false) {
    return (
      <div className="bg-slate-900 rounded-3xl p-5 text-slate-200">
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
    );
  }

  return (
    <div className="bg-slate-900 rounded-3xl p-5 flex flex-col gap-4">
      {errorMsg && (
        <div className="p-3 rounded-xl bg-red-500/10 text-[10px] text-red-400 flex items-start gap-1.5">
          <ShieldAlert className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

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
          <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">
            Connected
          </span>
        ) : (
          <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-950 text-slate-500">
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
        <div className="p-3.5 rounded-xl bg-amber-500/10 text-[10px] text-amber-300/90 flex flex-col gap-2.5">
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
        <div className="h-10 rounded-xl bg-slate-950 flex items-center justify-center">
          <Loader2 className="h-4 w-4 text-slate-600 animate-spin" />
        </div>
      ) : isSubscribed ? (
        <div className="flex gap-2">
          <button
            onClick={handleSendTest}
            disabled={testing}
            className="flex-1 py-2.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 font-bold text-[10.5px] text-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
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
            className="py-2.5 px-3 rounded-xl bg-transparent hover:bg-slate-950 font-semibold text-[10.5px] text-slate-500 hover:text-slate-400 transition-colors cursor-pointer"
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
        <span className="text-[9px] text-amber-500 leading-normal block font-medium text-left">
          ⚠️ Browser site alerts permission was blocklisted. Adjust settings inside the URL safety lock icon, then verify subscription again.
        </span>
      )}
    </div>
  );
}
