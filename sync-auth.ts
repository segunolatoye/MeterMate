import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import * as admin from 'firebase-admin';

// Initialize Admin SDK
if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    }),
  });
}

const firestore = admin.firestore();
const auth = admin.auth();

async function syncAuth() {
  console.log('Starting Firebase Auth sync...');
  try {
    const snap = await firestore.collection('profiles').get();
    let synced = 0;
    
    for (const doc of snap.docs) {
      const data = doc.data();
      const email = data.email?.trim().toLowerCase();
      if (!email) continue;
      
      const password = data.password && data.password.length >= 6 ? data.password : '123456';
      
      try {
        // Attempt to create the user
        await auth.createUser({
          uid: doc.id,
          email: email,
          password: password,
          displayName: data.full_name
        });
        console.log(`✅ Created auth for ${email} (UID: ${doc.id})`);
        synced++;
      } catch (err: any) {
        // If user already exists, we might want to update their password to ensure 12345 still works
        // or just skip. We'll try to update just in case.
        if (err.code === 'auth/email-already-exists' || err.code === 'auth/uid-already-exists') {
          console.log(`⚠️ User ${email} already exists. Updating password to sync.`);
          try {
            await auth.updateUser(doc.id, {
              password: password,
              displayName: data.full_name
            });
            console.log(`   Updated auth for ${email}`);
          } catch (updateErr: any) {
            console.error(`   ❌ Failed to update ${email}: ${updateErr.message}`);
          }
        } else {
          console.error(`❌ Failed to create auth for ${email}:`, err.message);
        }
      }
    }
    
    console.log(`Sync complete. Successfully processed ${synced} new accounts.`);
  } catch (error) {
    console.error('Error during sync:', error);
  }
}

syncAuth().then(() => process.exit(0));
