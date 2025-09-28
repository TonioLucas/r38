"use client";

import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  startAfter,
  DocumentData,
  CollectionReference,
  DocumentReference,
  Timestamp,
  serverTimestamp,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";
import type { LeadDoc, SettingsDoc, PageDoc } from "@/types/firestore";

// Example user type
export interface UserDoc extends DocumentData {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

// Collection references (only create if db is initialized)
export const collections = {
  get users() {
    if (!db || Object.keys(db).length === 0) {
      return {} as CollectionReference<UserDoc>;
    }
    return collection(db, "users") as CollectionReference<UserDoc>;
  },
  
  get leads() {
    if (!db || Object.keys(db).length === 0) {
      return {} as CollectionReference<LeadDoc>;
    }
    return collection(db, "leads") as CollectionReference<LeadDoc>;
  },
  
  get settings() {
    if (!db || Object.keys(db).length === 0) {
      return {} as CollectionReference<SettingsDoc>;
    }
    return collection(db, "settings") as CollectionReference<SettingsDoc>;
  },

  get pages() {
    if (!db || Object.keys(db).length === 0) {
      return {} as CollectionReference<PageDoc>;
    }
    return collection(db, "pages") as CollectionReference<PageDoc>;
  },
};

// User operations
export const userOperations = {
  // Get user by ID
  async getById(uid: string): Promise<UserDoc | null> {
    try {
      const userRef = doc(collections.users, uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        return null;
      }
      
      return userSnap.data() as UserDoc;
    } catch (error) {
      console.error("Error fetching user:", error);
      return null;
    }
  },

  // Create user document
  async create(uid: string, data: Partial<UserDoc>): Promise<void> {
    const userRef = doc(collections.users, uid);
    await setDoc(userRef, {
      uid,
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  },

  // Update user document
  async update(uid: string, data: Partial<UserDoc>): Promise<void> {
    const userRef = doc(collections.users, uid);
    await updateDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  },

  // Delete user document
  async delete(uid: string): Promise<void> {
    const userRef = doc(collections.users, uid);
    await deleteDoc(userRef);
  },

  // Get users by query
  async getByQuery(field: string, operator: any, value: any): Promise<UserDoc[]> {
    try {
      const q = query(collections.users, where(field, operator, value));
      const querySnapshot = await getDocs(q);

      const users: UserDoc[] = [];
      querySnapshot.forEach((doc) => {
        users.push(doc.data() as UserDoc);
      });

      return users;
    } catch (error) {
      console.error("Error querying users:", error);
      return [];
    }
  },
};

// Lead operations
export const leadOperations = {
  // Get paginated leads
  async getPaginated(
    pageSize: number = 10,
    lastDoc?: QueryDocumentSnapshot<DocumentData>
  ): Promise<{ leads: LeadDoc[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null }> {
    try {
      let q = query(collections.leads, orderBy("createdAt", "desc"), limit(pageSize));

      if (lastDoc) {
        q = query(collections.leads, orderBy("createdAt", "desc"), startAfter(lastDoc), limit(pageSize));
      }

      const snapshot = await getDocs(q);
      const leads: LeadDoc[] = [];
      let lastVisible: QueryDocumentSnapshot<DocumentData> | null = null;

      snapshot.forEach((doc) => {
        leads.push({ ...doc.data(), id: doc.id } as LeadDoc);
        lastVisible = doc;
      });

      return { leads, lastDoc: lastVisible };
    } catch (error) {
      console.error("Error fetching leads:", error);
      return { leads: [], lastDoc: null };
    }
  },

  // Get lead by email
  async getByEmail(email: string): Promise<LeadDoc | null> {
    try {
      const q = query(collections.leads, where("email", "==", email.toLowerCase()));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return { ...doc.data(), id: doc.id } as LeadDoc;
    } catch (error) {
      console.error("Error fetching lead by email:", error);
      return null;
    }
  },

  // Get total count
  async getTotalCount(): Promise<number> {
    try {
      const snapshot = await getDocs(collections.leads);
      return snapshot.size;
    } catch (error) {
      console.error("Error counting leads:", error);
      return 0;
    }
  },
};

// Settings operations
export const settingsOperations = {
  // Get main settings
  async getMain(): Promise<SettingsDoc | null> {
    try {
      const settingsRef = doc(collections.settings, "main");
      const settingsSnap = await getDoc(settingsRef);

      if (!settingsSnap.exists()) {
        return null;
      }

      return settingsSnap.data() as SettingsDoc;
    } catch (error) {
      console.error("Error fetching settings:", error);
      return null;
    }
  },

  // Update main settings
  async updateMain(data: Partial<SettingsDoc>): Promise<void> {
    try {
      const settingsRef = doc(collections.settings, "main");
      await setDoc(settingsRef, {
        ...data,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      console.error("Error updating settings:", error);
      throw error;
    }
  },
};

// Page operations
export const pageOperations = {
  // Get page by ID
  async getById(pageId: string): Promise<PageDoc | null> {
    try {
      const pageRef = doc(collections.pages, pageId);
      const pageSnap = await getDoc(pageRef);

      if (!pageSnap.exists()) {
        return null;
      }

      return { ...pageSnap.data(), id: pageSnap.id } as PageDoc;
    } catch (error) {
      console.error("Error fetching page:", error);
      return null;
    }
  },

  // Create or update page
  async createOrUpdate(pageId: string, data: Partial<PageDoc>): Promise<void> {
    try {
      const pageRef = doc(collections.pages, pageId);
      const timestamp = serverTimestamp();
      
      await setDoc(pageRef, {
        ...data,
        id: pageId,
        updatedAt: timestamp,
        createdAt: timestamp,
      }, { merge: true });
    } catch (error) {
      console.error("Error saving page:", error);
      throw error;
    }
  },
};