import { getDb } from './lib/db';

async function checkIds() {
  const db = await getDb();
  for (const [key, value] of Object.entries(db)) {
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (!item || !item.id) {
          console.error(`Missing id in ${key} at index ${index}`, item);
        }
      });
    }
  }
  console.log("Done checking IDs");
}

checkIds().catch(console.error);
