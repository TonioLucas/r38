/**
 * Hook to fetch payment transactions with filtering
 */

import { useState, useEffect, useCallback } from "react";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { PaymentDoc, COLLECTIONS, PaymentStatus, PaymentProvider } from "@/types/firestore";

interface UseAdminTransactionsFilters {
  provider?: PaymentProvider;
  status?: PaymentStatus;
}

export function useAdminTransactions(filters?: UseAdminTransactionsFilters) {
  const [transactions, setTransactions] = useState<PaymentDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const transactionsRef = collection(db, COLLECTIONS.PAYMENTS);
      let q = query(
        transactionsRef,
        orderBy("createdAt", "desc"),
        limit(100)
      );

      // Apply filters
      if (filters?.provider) {
        q = query(
          transactionsRef,
          where("payment_provider", "==", filters.provider),
          orderBy("createdAt", "desc"),
          limit(100)
        );
      }

      if (filters?.status) {
        q = query(
          transactionsRef,
          where("status", "==", filters.status),
          orderBy("createdAt", "desc"),
          limit(100)
        );
      }

      const snapshot = await getDocs(q);
      const transactionsData: PaymentDoc[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        transactionsData.push({
          ...data,
          id: doc.id,
          // Convert Firestore Timestamps to Dates
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
          processed_at: data.processed_at?.toDate() || null,
          btc_data: data.btc_data ? {
            ...data.btc_data,
            confirmed_at: data.btc_data.confirmed_at?.toDate() || null,
          } : null,
        } as PaymentDoc);
      });

      setTransactions(transactionsData);
    } catch (err) {
      console.error("Error loading transactions:", err);
      setError("Erro ao carregar transações");
    } finally {
      setLoading(false);
    }
  }, [filters?.provider, filters?.status]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  return {
    transactions,
    loading,
    error,
    reload: loadTransactions,
  };
}
