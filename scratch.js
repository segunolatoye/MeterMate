const admin = require('firebase-admin');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: privateKey,
  }),
});
const db = admin.firestore();
async function run() {
  const readings = await db.collection('meter_readings').get();
  console.log("Readings count:", readings.docs.length);
  readings.docs.forEach(d => console.log(d.id, d.data().reading_kwh, d.data().reading_date));
}
run();
