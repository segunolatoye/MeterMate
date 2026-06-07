import { getDb, saveDb } from './lib/db';
import { doc, setDoc } from 'firebase/firestore';
import { db as firestoreDb } from './lib/db';

async function restoreInitialReadings() {
  const db = await getDb();
  let count = 0;

  for (const profile of db.profiles) {
    if (profile.role === 'electricity_tenant') {
      const readings = db.meter_readings.filter(r => r.tenant_id === profile.id);
      if (readings.length === 0) {
        const id = `reading-init-${profile.id}`;
        const newReading = {
          id,
          tenant_id: profile.id,
          reading_date: new Date().toISOString(),
          reading_kwh: 0,
          notes: "Restored baseline registered reading",
          created_by: 'admin-123',
          created_at: new Date().toISOString()
        };
        db.meter_readings.push(newReading);
        
        // Push directly to firestore
        await setDoc(doc(firestoreDb, 'meter_readings', id), newReading);
        count++;
        console.log(`Restored reading for ${profile.full_name}`);
      }
    }
  }

  if (count > 0) {
    await saveDb(db);
    console.log(`Successfully restored ${count} initial readings.`);
  } else {
    console.log('No tenants needed restoration.');
  }
}

restoreInitialReadings().catch(console.error);
