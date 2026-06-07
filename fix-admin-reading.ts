import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, deleteDoc } from 'firebase/firestore';
import fs from 'fs';

const newConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
if (!newConfig.apiKey) newConfig.apiKey = "AIzaSyBpMsHIgkSfV0x6LwvkvNUFQb6y6h_RfVQ";
const app = initializeApp(newConfig);
const db = getFirestore(app, newConfig.firestoreDatabaseId === '(default)' ? undefined : newConfig.firestoreDatabaseId);

async function run() {
  // 1. Delete the incorrect WATER_PUMP reading
  await deleteDoc(doc(db, 'meter_readings', 'reading-WATER_PUMP-initial'));
  console.log('Deleted incorrect WATER_PUMP reading');

  // 2. Add the correct reading for the Admin
  const adminId = 'admin-123';
  const id = `reading-${adminId}-initial`;
  
  await setDoc(doc(db, 'meter_readings', id), {
    id,
    tenant_id: adminId,
    reading_date: '2026-01-01', // Old date to act as baseline
    reading_kwh: 1404.7,
    notes: 'Initial Setup Baseline',
    created_by: adminId,
    created_at: new Date().toISOString()
  });
  console.log('Set initial electricity reading for admin to 1404.7');
  
  process.exit(0);
}
run();
