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
  Deposit 
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
      room_label: "Admin Office",
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
  token_purchases: [
    {
      id: "purchase-1",
      tenant_id: "tenant-elec-1",
      date: "2026-01-10",
      amount_paid: 12000,
      units_received: 100,
      rate_at_time: 120,
      token_ref: "8821-4432-8898-1029",
      created_by: "admin-123",
      created_at: "2026-01-10T11:00:00Z"
    },
    {
      id: "purchase-2",
      tenant_id: "tenant-elec-1",
      date: "2026-03-12",
      amount_paid: 24000,
      units_received: 200,
      rate_at_time: 120,
      token_ref: "1029-7756-3342-9908",
      created_by: "admin-123",
      created_at: "2026-03-12T15:00:00Z"
    },
    {
      id: "purchase-3",
      tenant_id: "tenant-elec-1",
      date: "2026-05-01",
      amount_paid: 18000,
      units_received: 150,
      rate_at_time: 120,
      token_ref: "7654-8890-0012-3421",
      created_by: "admin-123",
      created_at: "2026-05-01T09:30:00Z"
    }
  ],
  meter_readings: [
    {
      id: "reading-1",
      tenant_id: "tenant-elec-1",
      reading_date: "2026-01-01",
      reading_kwh: 100,
      notes: "Initial setup reading",
      created_by: "admin-123",
      created_at: "2026-01-01T15:00:00Z"
    },
    {
      id: "reading-2",
      tenant_id: "tenant-elec-1",
      reading_date: "2026-03-01",
      reading_kwh: 220,
      notes: "End of Feb reading",
      created_by: "admin-123",
      created_at: "2026-03-01T18:00:00Z"
    },
    {
      id: "reading-3",
      tenant_id: "tenant-elec-1",
      reading_date: "2026-05-01",
      reading_kwh: 310,
      notes: "End of April reading",
      created_by: "admin-123",
      created_at: "2026-05-01T17:30:00Z"
    },
    {
      id: "reading-4",
      tenant_id: "tenant-elec-1",
      reading_date: "2026-06-01",
      reading_kwh: 370,
      notes: "End of May reading",
      created_by: "admin-123",
      created_at: "2026-06-01T10:00:00Z"
    }
  ],
  water_contributions: [
    {
      id: "water-1",
      tenant_id: "tenant-elec-1",
      month: "2026-04",
      amount: 3000,
      status: "paid",
      payment_id: "pay-water-1",
      created_at: "2026-04-05T10:00:00Z"
    },
    {
      id: "water-2",
      tenant_id: "tenant-elec-1",
      month: "2026-05",
      amount: 3000,
      status: "paid",
      payment_id: "pay-water-2",
      created_at: "2026-05-06T11:00:00Z"
    },
    {
      id: "water-3",
      tenant_id: "tenant-elec-1",
      month: "2026-06",
      amount: 3000,
      status: "pending",
      created_at: "2026-06-01T00:05:00Z"
    },
    {
      id: "water-4",
      tenant_id: "tenant-water-1",
      month: "2026-04",
      amount: 3000,
      status: "paid",
      payment_id: "pay-water-3",
      created_at: "2026-04-05T10:30:00Z"
    },
    {
      id: "water-5",
      tenant_id: "tenant-water-1",
      month: "2026-05",
      amount: 3000,
      status: "pending",
      created_at: "2026-05-01T00:05:00Z"
    },
    {
      id: "water-6",
      tenant_id: "tenant-water-1",
      month: "2026-06",
      amount: 3000,
      status: "pending",
      created_at: "2026-06-01T00:05:00Z"
    }
  ],
  payments: [
    {
      id: "pay-deposit-1",
      tenant_id: "tenant-elec-1",
      amount: 15000,
      payment_type: "deposit",
      payment_method: "manual",
      paystack_reference: "MANUAL_DEP_1",
      status: "confirmed",
      confirmed_by: "admin-123",
      note: "Initial compound deposit",
      created_at: "2026-01-01T14:35:00Z"
    },
    {
      id: "pay-elec-1",
      tenant_id: "tenant-elec-1",
      amount: 12000,
      payment_type: "electricity",
      payment_method: "paystack_card",
      paystack_reference: "PSTK-998822",
      status: "confirmed",
      note: "Purchased 100 kWh tokens",
      created_at: "2026-01-10T10:55:00Z"
    },
    {
      id: "pay-elec-2",
      tenant_id: "tenant-elec-1",
      amount: 24000,
      payment_type: "electricity",
      payment_method: "paystack_card",
      paystack_reference: "PSTK-384910",
      status: "confirmed",
      note: "Purchased 200 kWh tokens",
      created_at: "2026-03-12T14:55:00Z"
    },
    {
      id: "pay-elec-3",
      tenant_id: "tenant-elec-1",
      amount: 18000,
      payment_type: "electricity",
      payment_method: "paystack_card",
      paystack_reference: "PSTK-009182",
      status: "confirmed",
      note: "Purchased 150 kWh tokens",
      created_at: "2026-05-01T09:25:00Z"
    },
    {
      id: "pay-water-1",
      tenant_id: "tenant-elec-1",
      amount: 3000,
      payment_type: "water",
      payment_method: "paystack_card",
      paystack_reference: "PSTK-WA-1",
      status: "confirmed",
      note: "April water contribution",
      created_at: "2026-04-05T10:00:00Z"
    },
    {
      id: "pay-water-2",
      tenant_id: "tenant-elec-1",
      amount: 3000,
      payment_type: "water",
      payment_method: "paystack_card",
      paystack_reference: "PSTK-WA-2",
      status: "confirmed",
      note: "May water contribution",
      created_at: "2026-05-06T11:00:00Z"
    },
    {
      id: "pay-water-3",
      tenant_id: "tenant-water-1",
      amount: 3000,
      payment_type: "water",
      payment_method: "paystack_card",
      paystack_reference: "PSTK-WA-3",
      status: "confirmed",
      note: "April water contribution",
      created_at: "2026-04-05T10:30:00Z"
    },
    {
      id: "pay-bank-transfer-pending-1",
      tenant_id: "tenant-elec-1",
      amount: 10000,
      payment_type: "prepayment",
      payment_method: "paystack_transfer",
      paystack_reference: "TX_MANUAL_ELEC_99",
      status: "pending",
      note: "Transferred from Sterling bank app - Emeka Obi",
      created_at: "2026-06-05T16:15:00Z"
    },
    {
      id: "pay-bank-transfer-pending-2",
      tenant_id: "tenant-water-1",
      amount: 3000,
      payment_type: "water",
      payment_method: "paystack_transfer",
      paystack_reference: "TX_MANUAL_WATER_99",
      status: "pending",
      note: "May Water contribution transfer - Amina Yusuf",
      created_at: "2026-06-06T08:30:00Z"
    }
  ],
  deposits: [
    {
      id: "dep-1",
      tenant_id: "tenant-elec-1",
      amount: 15000,
      refunded: false,
      note: "Initial security deposit Flat 2",
      created_at: "2026-01-01T14:35:00Z"
    }
  ]
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
      depositsSnap
    ] = await Promise.all([
      getDocs(collection(db, 'profiles')),
      getDocs(collection(db, 'electricity_rates')),
      getDocs(collection(db, 'token_purchases')),
      getDocs(collection(db, 'meter_readings')),
      getDocs(collection(db, 'water_contributions')),
      getDocs(collection(db, 'payments')),
      getDocs(collection(db, 'deposits'))
    ]);

    const schema: DatabaseSchema = {
      profiles: profilesSnap.docs.map(doc => doc.data() as Profile),
      electricity_rates: ratesSnap.docs.map(doc => doc.data() as ElectricityRate),
      token_purchases: purchasesSnap.docs.map(doc => doc.data() as TokenPurchase),
      meter_readings: readingsSnap.docs.map(doc => doc.data() as MeterReading),
      water_contributions: contributionsSnap.docs.map(doc => doc.data() as WaterContribution),
      payments: paymentsSnap.docs.map(doc => doc.data() as Payment),
      deposits: depositsSnap.docs.map(doc => doc.data() as Deposit)
    };

    // If the database has no profiles, seed the database with defaults automatically
    if (schema.profiles.length === 0) {
      console.log('Google Firestore is empty. Seeding DEFAULT_DB...');
      await saveDb(DEFAULT_DB);
      return DEFAULT_DB;
    }

    // Ensure all default profiles from DEFAULT_DB exist in the database (preserving existing ones)
    let needsResave = false;
    DEFAULT_DB.profiles.forEach(defProfile => {
      const matchEmail = defProfile.email ? defProfile.email.toLowerCase().trim() : '';
      if (!matchEmail) return;
      const exists = schema.profiles.some(p => p.email && p.email.toLowerCase().trim() === matchEmail);
      if (!exists) {
        schema.profiles.push(defProfile);
        needsResave = true;
      }
    });

    // Make sure we also have default electricity rates
    if (schema.electricity_rates.length === 0 && DEFAULT_DB.electricity_rates.length > 0) {
      schema.electricity_rates = [...DEFAULT_DB.electricity_rates];
      needsResave = true;
    }

    // Seed missing token purchases for default tenants
    DEFAULT_DB.token_purchases.forEach(defPurchase => {
      const exists = schema.token_purchases.some(p => p.id === defPurchase.id);
      if (!exists) {
        schema.token_purchases.push(defPurchase);
        needsResave = true;
      }
    });

    // Seed missing meter readings for default tenants
    DEFAULT_DB.meter_readings.forEach(defReading => {
      const exists = schema.meter_readings.some(r => r.id === defReading.id);
      if (!exists) {
        schema.meter_readings.push(defReading);
        needsResave = true;
      }
    });

    // Seed missing water contributions for default tenants
    DEFAULT_DB.water_contributions.forEach(defContribution => {
      const exists = schema.water_contributions.some(c => c.id === defContribution.id);
      if (!exists) {
        schema.water_contributions.push(defContribution);
        needsResave = true;
      }
    });

    // Seed missing payments for default tenants
    DEFAULT_DB.payments.forEach(defPayment => {
      const exists = schema.payments.some(p => p.id === defPayment.id);
      if (!exists) {
        schema.payments.push(defPayment);
        needsResave = true;
      }
    });

    // Seed missing deposits for default tenants
    DEFAULT_DB.deposits.forEach(defDeposit => {
      const exists = schema.deposits.some(d => d.id === defDeposit.id);
      if (!exists) {
        schema.deposits.push(defDeposit);
        needsResave = true;
      }
    });

    if (needsResave) {
      console.log('Seeding missing default records to Firestore database...');
      await saveDb(schema);
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
