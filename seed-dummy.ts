import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';

const newConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
if (!newConfig.apiKey) newConfig.apiKey = "AIzaSyBpMsHIgkSfV0x6LwvkvNUFQb6y6h_RfVQ";
const app = initializeApp(newConfig);
const db = getFirestore(app, newConfig.firestoreDatabaseId === '(default)' ? undefined : newConfig.firestoreDatabaseId);

async function run() {
  const dummyPayment = {
    id: `pay-dummy-${Date.now()}`,
    tenant_id: 'admin-123',
    amount: 0,
    payment_type: 'water',
    payment_method: 'manual',
    paystack_reference: 'INIT_SYSTEM_PAYMENT',
    status: 'confirmed',
    confirmed_by: 'system',
    note: 'System initialization baseline payment',
    created_at: new Date().toISOString()
  };
  
  await setDoc(doc(db, 'payments', dummyPayment.id), dummyPayment);
  console.log('Restored payments collection structure');
  process.exit(0);
}
run();
