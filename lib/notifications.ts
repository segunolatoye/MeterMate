import webpush from 'web-push';
import { db } from './db';
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';

interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

export async function getOrGenerateVapidKeys(): Promise<VapidKeys> {
  const settingsDocRef = doc(db, 'settings', 'vapid_keys');
  try {
    const snap = await getDoc(settingsDocRef);
    if (snap.exists()) {
      const data = snap.data() as VapidKeys;
      if (data.publicKey && data.privateKey) {
        return data;
      }
    }
  } catch (err) {
    console.warn('Vapid keys doc fetch error, generating fresh keys:', err);
  }

  // Generate new keys
  const keys = webpush.generateVAPIDKeys();
  try {
    await setDoc(settingsDocRef, keys);
    console.log('Successfully generated and saved fresh VAPID keys to Firestore settings/vapid_keys');
  } catch (err) {
    console.error('Error saving generated VAPID keys to Firestore:', err);
  }
  return keys;
}

export async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; url: string }
) {
  const keys = await getOrGenerateVapidKeys();
  
  webpush.setVapidDetails(
    'mailto:segunolatoye@gmail.com', // Fallback developer email
    keys.publicKey,
    keys.privateKey
  );

  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth
    }
  };

  try {
    await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
    return { success: true };
  } catch (error: any) {
    console.error('Failed to send push notification:', error);
    // If subscription is expired or invalid (410 Gone / 404 Not Found), return expired flag
    if (error.statusCode === 410 || error.statusCode === 404) {
      return { success: false, expired: true };
    }
    return { success: false, error: error.message };
  }
}

/**
 * Send push notifications to all registered occupants' subscriptions.
 */
export async function notifyAllOccupants(payload: { title: string; body: string; url: string }) {
  try {
    const subsSnap = await getDocs(collection(db, 'push_subscriptions'));
    const sendPromises = subsSnap.docs.map(async (subsDoc) => {
      const data = subsDoc.data();
      const res = await sendPushNotification(
        {
          endpoint: data.endpoint,
          p256dh: data.p256dh,
          auth: data.auth
        },
        payload
      );

      // Clean up expired subscriptions automatically
      if (res.expired) {
        console.log(`Cleaning up expired subscription: ${subsDoc.id}`);
        await deleteDoc(doc(db, 'push_subscriptions', subsDoc.id));
      }
    });

    await Promise.all(sendPromises);
    console.log(`Dispatched push notifications: "${payload.title}" to active clients.`);
  } catch (e) {
    console.error('Error notifying occupants:', e);
  }
}

/**
 * Send push notification to a specific user ID's devices.
 */
export async function notifyUser(userId: string, payload: { title: string; body: string; url: string }) {
  try {
    const subsSnap = await getDocs(collection(db, 'push_subscriptions'));
    const userSubs = subsSnap.docs.filter(doc => doc.data().user_id === userId);
    
    if (userSubs.length === 0) {
      console.log(`No active push subscriptions found for user ID: ${userId}`);
      return;
    }

    const sendPromises = userSubs.map(async (subsDoc) => {
      const data = subsDoc.data();
      const res = await sendPushNotification(
        {
          endpoint: data.endpoint,
          p256dh: data.p256dh,
          auth: data.auth
        },
        payload
      );

      if (res.expired) {
        console.log(`Cleaning up expired subscription: ${subsDoc.id} for user ${userId}`);
        await deleteDoc(doc(db, 'push_subscriptions', subsDoc.id));
      }
    });

    await Promise.all(sendPromises);
    console.log(`Successfully notified user ${userId} with message: "${payload.title}"`);
  } catch (e) {
    console.error(`Error sending notification to user ${userId}:`, e);
  }
}

/**
 * Send push notification to all users with the 'admin' role.
 */
export async function notifyAdmins(payload: { title: string; body: string; url: string }) {
  try {
    const dbInstance = db;
    // We need to fetch profiles to know who the admins are
    const profilesSnap = await getDocs(collection(dbInstance, 'profiles'));
    const adminIds = profilesSnap.docs
      .map(d => d.data())
      .filter(p => p.role === 'admin')
      .map(p => p.id);

    if (adminIds.length === 0) return;

    const subsSnap = await getDocs(collection(dbInstance, 'push_subscriptions'));
    const adminSubs = subsSnap.docs.filter(doc => adminIds.includes(doc.data().user_id));

    if (adminSubs.length === 0) {
      console.log(`No active push subscriptions found for admins`);
      return;
    }

    const sendPromises = adminSubs.map(async (subsDoc) => {
      const data = subsDoc.data();
      const res = await sendPushNotification(
        {
          endpoint: data.endpoint,
          p256dh: data.p256dh,
          auth: data.auth
        },
        payload
      );

      if (res.expired) {
        await deleteDoc(doc(dbInstance, 'push_subscriptions', subsDoc.id));
      }
    });

    await Promise.all(sendPromises);
    console.log(`Successfully notified admins with message: "${payload.title}"`);
  } catch (e) {
    console.error(`Error sending notification to admins:`, e);
  }
}


