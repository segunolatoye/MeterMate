import { getDb } from './lib/db';
async function test() {
  const db = await getDb();
  console.log('Profiles from getDb():', db.profiles.map(p => p.role));
}
test();
