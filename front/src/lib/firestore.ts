"use client";

import {
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
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
  Timestamp,
  serverTimestamp,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";
import type { LeadDoc, SettingsDoc, PageDoc, ProductDoc, ProductPriceDoc, ProductStatus } from "@/types/firestore";

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

  get products() {
    if (!db || Object.keys(db).length === 0) {
      return {} as CollectionReference<ProductDoc>;
    }
    return collection(db, "products") as CollectionReference<ProductDoc>;
  },

  get product_prices() {
    if (!db || Object.keys(db).length === 0) {
      return {} as CollectionReference<ProductPriceDoc>;
    }
    return collection(db, "product_prices") as CollectionReference<ProductPriceDoc>;
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

// Product operations
export const productOperations = {
  // Get all products with optional filter
  async getAll(filters?: { status?: ProductStatus }): Promise<ProductDoc[]> {
    try {
      if (!db || Object.keys(db).length === 0) {
        console.error("Firestore not initialized");
        return [];
      }

      let q = query(
        collection(db, "products"),
        orderBy("createdAt", "desc")
      );

      if (filters?.status) {
        q = query(
          collection(db, "products"),
          where("status", "==", filters.status),
          orderBy("createdAt", "desc")
        );
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
        launch_date: doc.data().launch_date?.toDate?.() || null,
      } as ProductDoc));
    } catch (error) {
      console.error("Error fetching products:", error);
      return [];
    }
  },

  // Get product by ID
  async getById(productId: string): Promise<ProductDoc | null> {
    try {
      if (!db || Object.keys(db).length === 0) {
        console.error("Firestore not initialized");
        return null;
      }

      const productRef = doc(db, "products", productId);
      const productSnap = await getDoc(productRef);

      if (!productSnap.exists()) {
        return null;
      }

      return {
        id: productSnap.id,
        ...productSnap.data(),
        createdAt: productSnap.data().createdAt?.toDate?.() || new Date(),
        updatedAt: productSnap.data().updatedAt?.toDate?.() || new Date(),
        launch_date: productSnap.data().launch_date?.toDate?.() || null,
      } as ProductDoc;
    } catch (error) {
      console.error("Error fetching product:", error);
      return null;
    }
  },

  // Get product by slug
  async getBySlug(slug: string): Promise<ProductDoc | null> {
    try {
      if (!db || Object.keys(db).length === 0) {
        console.error("Firestore not initialized");
        return null;
      }

      const q = query(
        collection(db, "products"),
        where("slug", "==", slug),
        limit(1)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
        launch_date: doc.data().launch_date?.toDate?.() || null,
      } as ProductDoc;
    } catch (error) {
      console.error("Error fetching product by slug:", error);
      return null;
    }
  },

  // Create product (use slug as document ID)
  async create(data: Omit<ProductDoc, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      if (!db || Object.keys(db).length === 0) {
        throw new Error("Firestore not initialized");
      }

      // Use slug as document ID for easy lookup
      const docRef = doc(collection(db, "products"), data.slug);
      await setDoc(docRef, {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return data.slug; // Return document ID
    } catch (error) {
      console.error("Error creating product:", error);
      throw error;
    }
  },

  // Update product
  async update(productId: string, data: Partial<ProductDoc>): Promise<void> {
    try {
      if (!db || Object.keys(db).length === 0) {
        throw new Error("Firestore not initialized");
      }

      const docRef = doc(db, "products", productId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error updating product:", error);
      throw error;
    }
  },

  // Archive product (set status to inactive)
  async archive(productId: string): Promise<void> {
    return this.update(productId, { status: 'inactive' as ProductStatus });
  },
};

// Price operations
export const priceOperations = {
  // Get all prices for a product
  async getByProductId(productId: string): Promise<ProductPriceDoc[]> {
    try {
      if (!db || Object.keys(db).length === 0) {
        console.error("Firestore not initialized");
        return [];
      }

      const q = query(
        collection(db, "product_prices"),
        where("product_id", "==", productId),
        orderBy("payment_method", "asc")
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate?.() || new Date(),
      } as ProductPriceDoc));
    } catch (error) {
      console.error("Error fetching prices:", error);
      return [];
    }
  },

  // Get price by ID
  async getById(priceId: string): Promise<ProductPriceDoc | null> {
    try {
      if (!db || Object.keys(db).length === 0) {
        console.error("Firestore not initialized");
        return null;
      }

      const priceRef = doc(db, "product_prices", priceId);
      const priceSnap = await getDoc(priceRef);

      if (!priceSnap.exists()) {
        return null;
      }

      return {
        id: priceSnap.id,
        ...priceSnap.data(),
        createdAt: priceSnap.data().createdAt?.toDate?.() || new Date(),
        updatedAt: priceSnap.data().updatedAt?.toDate?.() || new Date(),
      } as ProductPriceDoc;
    } catch (error) {
      console.error("Error fetching price:", error);
      return null;
    }
  },

  // Create price
  async create(data: Omit<ProductPriceDoc, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      if (!db || Object.keys(db).length === 0) {
        throw new Error("Firestore not initialized");
      }

      const colRef = collection(db, "product_prices");
      const docRef = await addDoc(colRef, {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (error) {
      console.error("Error creating price:", error);
      throw error;
    }
  },

  // Update price
  async update(priceId: string, data: Partial<ProductPriceDoc>): Promise<void> {
    try {
      if (!db || Object.keys(db).length === 0) {
        throw new Error("Firestore not initialized");
      }

      const docRef = doc(db, "product_prices", priceId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error updating price:", error);
      throw error;
    }
  },

  // Delete price
  async delete(priceId: string): Promise<void> {
    try {
      if (!db || Object.keys(db).length === 0) {
        throw new Error("Firestore not initialized");
      }

      const docRef = doc(db, "product_prices", priceId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error("Error deleting price:", error);
      throw error;
    }
  },
};