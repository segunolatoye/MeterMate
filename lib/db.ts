import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { 
  Profile, 
  ElectricityRate, 
  TokenPurchase, 
  MeterReading, 
  WaterContribution, 
  Payment, 
  Deposit,
  AppSetting
} from './types';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase lazily
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export interface DatabaseSchema {
  profiles: Profile[];
  electricity_rates: ElectricityRate[];
  token_purchases: TokenPurchase[];
  meter_readings: MeterReading[];
  water_contributions: WaterContribution[];
  payments: Payment[];
  deposits: Deposit[];
  settings: AppSetting[];
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const DEFAULT_DB: DatabaseSchema = {
  profiles: [
    {
      id: "admin-123",
      email: "segunolatoye@gmail.com",
      full_name: "Segun Olatoye",
      phone: "+2348012345678",
      role: "admin",
      room_label: "FLAT 2",
      deposit_amount: 0,
      created_at: "2026-01-01T12:00:00Z"
    },
    {
      id: "tenant-elec-1",
      email: "tenant1@metermate.com",
      full_name: "Emeka Obi",
      phone: "+2348087654321",
      role: "electricity_tenant",
      room_label: "Flat 2",
      meter_id: "MTR-88291",
      deposit_amount: 15000,
      created_at: "2026-01-01T14:30:00Z"
    },
    {
      id: "tenant-water-1",
      email: "tenant2@metermate.com",
      full_name: "Amina Yusuf",
      phone: "+2348099887766",
      role: "water_only_tenant",
      room_label: "Room 3",
      deposit_amount: 0,
      created_at: "2026-01-02T10:15:00Z"
    }
  ],
  electricity_rates: [
    {
      id: "rate-1",
      rate_per_kwh: 120,
      effective_from: "2026-01-01",
      note: "Standard 2026 compound shared electricity rate",
      created_by: "admin-123",
      created_at: "2026-01-01T12:05:00Z"
    }
  ],
  token_purchases: [],
  meter_readings: [],
  water_contributions: [],
  payments: [],
  deposits: [],
  settings: []
};

// Async read from Firestore with Error handling wrapper
export async function getDb(): Promise<DatabaseSchema> {
  try {
    const [
      profilesSnap,
      ratesSnap,
      purchasesSnap,
      readingsSnap,
      contributionsSnap,
      paymentsSnap,
      depositsSnap,
      settingsSnap
    ] = await Promise.all([
      getDocs(collection(db, 'profiles')),
      getDocs(collection(db, 'electricity_rates')),
      getDocs(collection(db, 'token_purchases')),
      getDocs(collection(db, 'meter_readings')),
      getDocs(collection(db, 'water_contributions')),
      getDocs(collection(db, 'payments')),
      getDocs(collection(db, 'deposits')),
      getDocs(collection(db, 'settings'))
    ]);

    const schema: DatabaseSchema = {
      profiles: profilesSnap.docs.map(doc => doc.data() as Profile),
      electricity_rates: ratesSnap.docs.map(doc => doc.data() as ElectricityRate),
      token_purchases: purchasesSnap.docs.map(doc => doc.data() as TokenPurchase),
      meter_readings: readingsSnap.docs.map(doc => doc.data() as MeterReading),
      water_contributions: contributionsSnap.docs.map(doc => doc.data() as WaterContribution),
      payments: paymentsSnap.docs.map(doc => doc.data() as Payment),
      deposits: depositsSnap.docs.map(doc => doc.data() as Deposit),
      settings: settingsSnap.docs.map(doc => doc.data() as AppSetting)
    };

    // Purge old seeded records if they exist in Firestore
    const seededPurchaseIds = ["purchase-1", "purchase-2", "purchase-3"];
    const seededReadingIds = ["reading-1", "reading-2", "reading-3", "reading-4"];
    const seededContributionIds = ["water-1", "water-2", "water-3", "water-4", "water-5", "water-6"];
    const seededPaymentIds = [
      "pay-deposit-1", "pay-elec-1", "pay-elec-2", "pay-elec-3", 
      "pay-water-1", "pay-water-2", "pay-water-3", 
      "pay-bank-transfer-pending-1", "pay-bank-transfer-pending-2"
    ];
    const seededDepositIds = ["dep-1"];

    let firestoreCleaned = false;
    const deletePromises: Promise<any>[] = [];

    schema.token_purchases = schema.token_purchases.filter(item => {
      if (seededPurchaseIds.includes(item.id)) {
        deletePromises.push(deleteDoc(doc(db, 'token_purchases', item.id)));
        firestoreCleaned = true;
        return false;
      }
      return true;
    });

    schema.meter_readings = schema.meter_readings.filter(item => {
      if (seededReadingIds.includes(item.id)) {
        deletePromises.push(deleteDoc(doc(db, 'meter_readings', item.id)));
        firestoreCleaned = true;
        return false;
      }
      return true;
    });

    schema.water_contributions = schema.water_contributions.filter(item => {
      if (seededContributionIds.includes(item.id)) {
        deletePromises.push(deleteDoc(doc(db, 'water_contributions', item.id)));
        firestoreCleaned = true;
        return false;
      }
      return true;
    });

    schema.payments = schema.payments.filter(item => {
      if (seededPaymentIds.includes(item.id)) {
        deletePromises.push(deleteDoc(doc(db, 'payments', item.id)));
        firestoreCleaned = true;
        return false;
      }
      return true;
    });

    schema.deposits = schema.deposits.filter(item => {
      if (seededDepositIds.includes(item.id)) {
        deletePromises.push(deleteDoc(doc(db, 'deposits', item.id)));
        firestoreCleaned = true;
        return false;
      }
      return true;
    });

    if (firestoreCleaned) {
      console.log('Purging seeded records from active Firestore database...');
      await Promise.all(deletePromises);
    }

    // If the database has no profiles, seed the database with defaults automatically
    if (schema.profiles.length === 0) {
      console.log('Google Firestore is empty. Seeding DEFAULT_DB...');
      await saveDb(DEFAULT_DB);
      return DEFAULT_DB;
    }

    return schema;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'database_schema');
  }
}

// Async write to Firestore with Error handling wrapper
export async function saveDb(data: DatabaseSchema): Promise<void> {
  try {
    const promises: Promise<any>[] = [];

    data.profiles.forEach(item => {
      promises.push(setDoc(doc(db, 'profiles', item.id), item));
    });

    data.electricity_rates.forEach(item => {
      promises.push(setDoc(doc(db, 'electricity_rates', item.id), item));
    });

    data.token_purchases.forEach(item => {
      promises.push(setDoc(doc(db, 'token_purchases', item.id), item));
    });

    data.meter_readings.forEach(item => {
      promises.push(setDoc(doc(db, 'meter_readings', item.id), item));
    });

    data.water_contributions.forEach(item => {
      promises.push(setDoc(doc(db, 'water_contributions', item.id), item));
    });

    data.payments.forEach(item => {
      promises.push(setDoc(doc(db, 'payments', item.id), item));
    });

    data.deposits.forEach(item => {
      promises.push(setDoc(doc(db, 'deposits', item.id), item));
    });

    data.settings.forEach(item => {
      promises.push(setDoc(doc(db, 'settings', item.id), item));
    });

    await Promise.all(promises);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'database_schema');
  }
}

// Save helpers converted to async/await
export async function updateProfile(profile: Profile): Promise<void> {
  const dbSchema = await getDb();
  dbSchema.profiles = dbSchema.profiles.map(p => p.id === profile.id ? profile : p);
  await saveDb(dbSchema);
}

export async function addProfile(profile: Profile): Promise<void> {
  const dbSchema = await getDb();
  dbSchema.profiles.push(profile);
  await saveDb(dbSchema);
}

export async function deleteProfile(profileId: string): Promise<void> {
  try {
    const dbSchema = await getDb();
    
    // Find associated record IDs before updating Schema
    const readingIds = dbSchema.meter_readings.filter(r => r.tenant_id === profileId).map(r => r.id);
    const purchaseIds = dbSchema.token_purchases.filter(p => p.tenant_id === profileId).map(p => p.id);
    const paymentIds = dbSchema.payments.filter(p => p.tenant_id === profileId).map(p => p.id);
    const contributionIds = dbSchema.water_contributions.filter(c => c.tenant_id === profileId).map(c => c.id);
    const depositIds = dbSchema.deposits.filter(d => d.tenant_id === profileId).map(d => d.id);

    // Filter local structures
    dbSchema.profiles = dbSchema.profiles.filter(p => p.id !== profileId);
    dbSchema.meter_readings = dbSchema.meter_readings.filter(r => r.tenant_id !== profileId);
    dbSchema.token_purchases = dbSchema.token_purchases.filter(p => p.tenant_id !== profileId);
    dbSchema.payments = dbSchema.payments.filter(p => p.tenant_id !== profileId);
    dbSchema.water_contributions = dbSchema.water_contributions.filter(c => c.tenant_id !== profileId);
    dbSchema.deposits = dbSchema.deposits.filter(d => d.tenant_id !== profileId);

    // Build the collection of Firestore deleteDoc calls
    const promises: Promise<void>[] = [];
    promises.push(deleteDoc(doc(db, 'profiles', profileId)));
    readingIds.forEach(id => promises.push(deleteDoc(doc(db, 'meter_readings', id))));
    purchaseIds.forEach(id => promises.push(deleteDoc(doc(db, 'token_purchases', id))));
    paymentIds.forEach(id => promises.push(deleteDoc(doc(db, 'payments', id))));
    contributionIds.forEach(id => promises.push(deleteDoc(doc(db, 'water_contributions', id))));
    depositIds.forEach(id => promises.push(deleteDoc(doc(db, 'deposits', id))));

    await Promise.all(promises);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'database_schema_delete');
  }
}

export async function getCurrentRate(): Promise<number> {
  const dbSchema = await getDb();
  if (dbSchema.electricity_rates.length === 0) return 120; // default backup
  const sorted = [...dbSchema.electricity_rates].sort((a, b) => 
    new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime()
  );
  return sorted[0].rate_per_kwh;
}
