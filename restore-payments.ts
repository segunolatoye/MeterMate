import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';
import { DEFAULT_DB } from './lib/db';

const newConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
if (!newConfig.apiKey) newConfig.apiKey = "AIzaSyBpMsHIgkSfV0x6LwvkvNUFQb6y6h_RfVQ";
const app = initializeApp(newConfig);
const db = getFirestore(app, newConfig.firestoreDatabaseId === '(default)' ? undefined : newConfig.firestoreDatabaseId);

async function run() {
  const promises = DEFAULT_DB.payments.map(p => 
    setDoc(doc(db, 'payments', p.id), p)
  );
  
  await Promise.all(promises);
  console.log(`Restored ${DEFAULT_DB.payments.length} default payments from template`);
  process.exit(0);
}
run();
