import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';

const newConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
if (!newConfig.apiKey) newConfig.apiKey = "AIzaSyBpMsHIgkSfV0x6LwvkvNUFQb6y6h_RfVQ";
const app = initializeApp(newConfig);
const db = getFirestore(app, newConfig.firestoreDatabaseId === '(default)' ? undefined : newConfig.firestoreDatabaseId);

async function run() {
  const id = `reading-WATER_PUMP-initial`;
  
  await setDoc(doc(db, 'meter_readings', id), {
    id,
    tenant_id: 'WATER_PUMP',
    reading_date: '2026-01-01',
    reading_kwh: 1404.7,
    notes: 'Initial Setup Baseline',
    created_by: 'admin-123',
    created_at: new Date().toISOString()
  });
  console.log('Set initial water pump reading to 1404.7');
  process.exit(0);
}
run();
