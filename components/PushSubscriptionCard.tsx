'use client';

import React, { useState, useEffect } from 'react';
import { Bell, BellOff, CheckCircle, ShieldAlert, Sparkles, Loader2, Play } from 'lucide-react';

interface PushSubscriptionCardProps {
  userId: string;
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

export default function PushSubscriptionCard({ userId }: PushSubscriptionCardProps) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [inIframe, setInIframe] = useState(false);

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
        setLoading(false);
      }
    }
  }, []);

  async function checkCurrentSubscription() {
    try {
      // Register service worker if not already registered
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      
      const sub = await reg.pushManager.getSubscription();
      setIsSubscribed(!!sub);
    } catch (err: any) {
      console.warn('Error checking push subscription status:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubscribe() {
    setSubscribing(true);
    setErrorMsg('');
    try {
      let permResultVal: NotificationPermission = 'default';
      try {
        permResultVal = await Notification.requestPermission();
      } catch (permErr: any) {
        console.warn('Notification.requestPermission rejected/threw in current context:', permErr);
        if (window.self !== window.top) {
          throw new Error('Browser standard security policies block notification request prompts inside iframe previews. Please open the application in a new tab using the buttons below to enable browser push notifications.');
        } else {
          throw new Error(`Could not prompt for permission: ${permErr.message || permErr}`);
        }
      }

      setPermission(permResultVal);

      if (permResultVal !== 'granted') {
        if (window.self !== window.top) {
          throw new Error('Notification permission has been denied inside the web preview iframe. Standard security policies disable this in embedded views. Please open the app in a new tab first, then configure push alerts.');
        }
        throw new Error('Notification permission has been denied. Please adjust your browser site preferences.');
      }

      // Register or grab service worker
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Get VAPID public key
      const keyRes = await fetch('/api/notifications/vapid');
      if (!keyRes.ok) {
        throw new Error('Failed to retrieve server encryption context');
      }
      const { publicKey } = await keyRes.json();

      if (!publicKey) {
        throw new Error('No public VAPID key was provisioned by the server');
      }

      // Subscribe to PushManager
      const subscribeOptions = {
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      };

      const subscription = await reg.pushManager.subscribe(subscribeOptions);

      // Save subscription to Firestore
      const saveRes = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          subscription
        }),
      });

      if (!saveRes.ok) {
        throw new Error('Failed to register subscription on Compound ledger');
      }

      setIsSubscribed(true);
    } catch (err: any) {
      console.error('Subscription setup failed:', err);
      setErrorMsg(err.message || 'Verification failed. Try again.');
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
      console.error('Failed to unsubscribe from browser push', err);
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
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        throw new Error('Test endpoint returned non-ok code');
      }
    } catch (err) {
      console.error('Error firing test push notification:', err);
    } finally {
      setTimeout(() => setTesting(false), 800);
    }
  }

  if (supported === false) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm text-slate-100" id="push-unsupported-card">
        <div className="flex items-start gap-3">
          <BellOff className="h-5 w-5 text-slate-500 mt-0.5 shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-slate-300">Push Notifications Unavailable</h4>
            <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
              This browser or device view does not support standard web push notifications. Try using standard mobile Chrome, Safari, or Chrome on Desktop.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm text-slate-100 flex flex-col gap-3.5" id="push-subscription-card">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-1.5">
          <Bell className={`h-4 w-4 ${isSubscribed ? 'text-emerald-400' : 'text-slate-400'}`} />
          <h3 className="text-xs font-bold font-sans tracking-wide text-slate-400 uppercase leading-none">
            Dashboard Alerts
          </h3>
        </div>
        {loading ? (
          <Loader2 className="h-4 w-4 text-slate-500 animate-spin" />
        ) : isSubscribed ? (
          <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 uppercase tracking-wide flex items-center gap-1">
            <CheckCircle className="h-2.5 w-2.5" /> Active
          </span>
        ) : (
          <span className="text-[9px] font-bold font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 uppercase tracking-wide">
            Not configured
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1 text-left">
        <span className="text-xs font-semibold text-slate-300 block">Browser Push Notifications</span>
        <span className="text-[10px] text-slate-500 leading-relaxed block">
          Get real-time workspace pushes the instant the landlord confirms manual bank receipts, uploads token pins, or schedules monthly water pumping levies.
        </span>
      </div>

      {inIframe && !isSubscribed && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/15 text-[10px] text-amber-300/90 flex flex-col gap-2.5 text-left" id="iframe-permission-alert">
          <div className="flex items-start gap-1.5 font-sans font-bold text-xs text-amber-200">
            <ShieldAlert className="h-4 w-4 shrink-0 text-amber-400" />
            <span>Web Preview Sandbox Tip</span>
          </div>
          <span className="leading-relaxed">
            Standard browser security policies disable push permission prompts inside embedded panels (iframes) to protect user safety. Open the application in a new window/tab to grant alerts cleanly.
          </span>
          <a
            href={typeof window !== 'undefined' ? window.location.href : '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="self-start inline-flex items-center gap-1 px-3 py-1.5 text-[10.5px] font-bold bg-amber-500 hover:bg-amber-450 text-slate-950 rounded-lg font-sans tracking-wide transition-colors"
          >
            Open App in New Tab ↗
          </a>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/15 text-[10px] text-red-400 flex items-start gap-1.5 text-left" id="push-error-display">
          <ShieldAlert className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="h-10 rounded-xl bg-slate-950 flex items-center justify-center border border-slate-800/50">
          <Loader2 className="h-4 w-4 text-slate-600 animate-spin" />
        </div>
      ) : isSubscribed ? (
        <div className="flex gap-2" id="push-subscriber-actions">
          <button
            id="test-push-notification-btn"
            onClick={handleSendTest}
            disabled={testing}
            className="flex-1 py-2.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-905 border border-slate-800 font-bold text-[11px] text-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {testing ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
                Triggering...
              </>
            ) : (
              <>
                <Play className="h-3 w-3 text-slate-400 fill-slate-400" />
                Test Alarm
              </>
            )}
          </button>
          
          <button
            id="disable-push-notification-btn"
            onClick={handleUnsubscribe}
            disabled={subscribing}
            className="py-2.5 px-3 rounded-xl bg-transparent hover:bg-slate-800 border border-transparent font-medium text-[11px] text-slate-500 hover:text-slate-400 transition-colors cursor-pointer"
          >
            Disable
          </button>
        </div>
      ) : (
        <button
          id="enable-push-notification-btn"
          onClick={handleSubscribe}
          disabled={subscribing}
          className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          {subscribing ? (
            <>
              <Loader2 className="h-4.5 w-4.5 animate-spin" />
              Syncing setup...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Configure Push Alerts
            </>
          )}
        </button>
      )}

      {permission === 'denied' && !isSubscribed && (
        <span className="text-[9px] text-amber-500 leading-normal block py-1 font-medium text-left">
          ⚠️ Permission was blocklisted by your device rules. Reset notification clearances in your browser lock icon next to the URL, then verify permissions again.
        </span>
      )}
    </div>
  );
}
