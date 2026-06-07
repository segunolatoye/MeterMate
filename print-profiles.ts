import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const newConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
if (!newConfig.apiKey) newConfig.apiKey = "AIzaSyBpMsHIgkSfV0x6LwvkvNUFQb6y6h_RfVQ";

const app = initializeApp(newConfig);
const db = getFirestore(app, newConfig.firestoreDatabaseId === '(default)' ? undefined : newConfig.firestoreDatabaseId);

async function run() {
  const snapshot = await getDocs(collection(db, 'profiles'));
  snapshot.docs.forEach(d => console.log(d.id, d.data().role, d.data().full_name));
  process.exit(0);
}
run();
