import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Organization, OrganizationType, ComplianceMode } from '@/types';

/**
 * Create a new organization
 */
export async function createOrganization(
  name: string,
  type: OrganizationType,
  parentId?: string
): Promise<string> {
  const orgData = {
    name,
    type,
    parentId: parentId || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),

    // Default compliance settings (STRICT mode for public sector)
    complianceMode: 'STRICT' as ComplianceMode,
    allowedModels: [], // Empty = all compliant models allowed

    // Default budget settings
    budget: {
      monthlyLimit: 10000, // 10,000 SEK default
      currentSpend: 0,
      alertThreshold: 80, // Alert at 80%
    },

    // Default settings
    settings: {
      enablePIIScreening: true,
      piiAction: 'BLOCK',
      enableAuditLog: true,
      defaultLanguage: 'sv',
    },
  };

  const docRef = await addDoc(collection(db, 'organizations'), orgData);
  return docRef.id;
}

/**
 * Get an organization by ID
 */
export async function getOrganization(orgId: string): Promise<Organization | null> {
  const docRef = doc(db, 'organizations', orgId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  const data = docSnap.data();
  return {
    id: docSnap.id,
    name: data.name,
    type: data.type,
    parentId: data.parentId,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    complianceMode: data.complianceMode || 'STRICT',
    allowedModels: data.allowedModels || [],
    budget: data.budget || {
      monthlyLimit: 10000,
      currentSpend: 0,
      alertThreshold: 80,
    },
    settings: data.settings || {
      enablePIIScreening: true,
      piiAction: 'BLOCK',
      enableAuditLog: true,
      defaultLanguage: 'sv',
    },
  } as Organization;
}

/**
 * Get all sub-units of an organization
 */
export async function getSubUnits(parentId: string): Promise<Organization[]> {
  const q = query(
    collection(db, 'organizations'),
    where('parentId', '==', parentId)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      type: data.type,
      parentId: data.parentId,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      complianceMode: data.complianceMode || 'STRICT',
      allowedModels: data.allowedModels || [],
      budget: data.budget,
      settings: data.settings,
    } as Organization;
  });
}

/**
 * Update organization compliance mode
 */
export async function updateComplianceMode(
  orgId: string,
  mode: ComplianceMode
): Promise<void> {
  const docRef = doc(db, 'organizations', orgId);
  await updateDoc(docRef, {
    complianceMode: mode,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Update organization budget
 */
export async function updateOrganizationBudget(
  orgId: string,
  budget: Partial<Organization['budget']>
): Promise<void> {
  const docRef = doc(db, 'organizations', orgId);
  const org = await getOrganization(orgId);

  if (!org) throw new Error('Organization not found');

  await updateDoc(docRef, {
    budget: {
      ...org.budget,
      ...budget,
    },
    updatedAt: serverTimestamp(),
  });
}

/**
 * Add spending to organization budget
 */
export async function addSpending(orgId: string, amount: number): Promise<void> {
  const org = await getOrganization(orgId);

  if (!org) throw new Error('Organization not found');

  const newSpend = org.budget.currentSpend + amount;
  const docRef = doc(db, 'organizations', orgId);

  await updateDoc(docRef, {
    'budget.currentSpend': newSpend,
    updatedAt: serverTimestamp(),
  });

  // Check if we've hit the alert threshold
  const percentageUsed = (newSpend / org.budget.monthlyLimit) * 100;
  if (percentageUsed >= org.budget.alertThreshold) {
    // Create budget alert
    await createBudgetAlert(orgId, percentageUsed, newSpend, org.budget.monthlyLimit);
  }
}

/**
 * Create a budget alert
 */
async function createBudgetAlert(
  orgId: string,
  threshold: number,
  currentSpend: number,
  limit: number
): Promise<void> {
  const alertData = {
    organizationId: orgId,
    type: threshold >= 100 ? 'LIMIT_REACHED' : 'THRESHOLD',
    threshold,
    currentSpend,
    limit,
    createdAt: serverTimestamp(),
    acknowledged: false,
  };

  await addDoc(collection(db, 'organizations', orgId, 'budget_alerts'), alertData);
}

/**
 * Reset monthly budget (should be run on 1st of each month)
 */
export async function resetMonthlyBudget(orgId: string): Promise<void> {
  const docRef = doc(db, 'organizations', orgId);
  await updateDoc(docRef, {
    'budget.currentSpend': 0,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Update allowed models list
 */
export async function updateAllowedModels(
  orgId: string,
  modelIds: string[]
): Promise<void> {
  const docRef = doc(db, 'organizations', orgId);
  await updateDoc(docRef, {
    allowedModels: modelIds,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Assign user to organization
 */
export async function assignUserToOrganization(
  userId: string,
  organizationId: string
): Promise<void> {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    organizationId,
    updatedAt: serverTimestamp(),
  });
}
