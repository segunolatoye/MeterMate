import { getDb, saveDb } from './lib/db';
import { MeterReading } from './lib/types';

async function addAdminReading() {
  const db = await getDb();
  
  const hasAdminReading = db.meter_readings.some(r => r.tenant_id === 'admin-123');
  
  if (!hasAdminReading) {
    const newReading: MeterReading = {
      id: `reading_admin-123_2026-06-01`,
      tenant_id: 'admin-123',
      reading_date: new Date().toISOString(),
      reading_kwh: 1404.7,
      notes: 'Initial database opening reading',
      created_by: 'system',
      created_at: new Date().toISOString()
    };
    
    db.meter_readings.push(newReading);
    await saveDb(db);
    console.log('Successfully added initial opening reading of 1404.7 for Admin (admin-123).');
  } else {
    console.log('Admin already has a reading in the database.');
  }
}

addAdminReading().catch(console.error);
