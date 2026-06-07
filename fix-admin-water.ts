import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';

const newConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
if (!newConfig.apiKey) newConfig.apiKey = "AIzaSyBpMsHIgkSfV0x6LwvkvNUFQb6y6h_RfVQ";
const app = initializeApp(newConfig);
const db = getFirestore(app, newConfig.firestoreDatabaseId === '(default)' ? undefined : newConfig.firestoreDatabaseId);

async function run() {
  const adminId = 'admin-123';
  const month = '2026-06';
  const id = `water-${Date.now()}-${adminId}-${month}`;
  
  await setDoc(doc(db, 'water_contributions', id), {
    id,
    tenant_id: adminId,
    month,
    amount: 3000,
    status: 'pending',
    created_at: new Date().toISOString()
  });
  console.log('Added missing water contribution for admin!');
  process.exit(0);
}
run();
