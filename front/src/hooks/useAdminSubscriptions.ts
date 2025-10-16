/**
 * Hook to fetch subscriptions with full entitlements and affiliate data
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
import { SubscriptionDoc, COLLECTIONS, SubscriptionStatus } from "@/types/firestore";

export function useAdminSubscriptions(statusFilter?: SubscriptionStatus) {
  const [subscriptions, setSubscriptions] = useState<SubscriptionDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSubscriptions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const subscriptionsRef = collection(db, COLLECTIONS.SUBSCRIPTIONS);
      let q;

      if (statusFilter) {
        q = query(
          subscriptionsRef,
          where("status", "==", statusFilter),
          orderBy("createdAt", "desc"),
          limit(100)
        );
      } else {
        q = query(
          subscriptionsRef,
          orderBy("createdAt", "desc"),
          limit(100)
        );
      }

      const snapshot = await getDocs(q);
      const subscriptionsData: SubscriptionDoc[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        subscriptionsData.push({
          ...data,
          id: doc.id,
          // Convert Firestore Timestamps to Dates
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
          access_granted_at: data.access_granted_at?.toDate() || null,
          access_available_from: data.access_available_from?.toDate() || null,
          entitlements: {
            platform: {
              expires_at: data.entitlements?.platform?.expires_at?.toDate() || null,
              courses: data.entitlements?.platform?.courses || [],
            },
            support: data.entitlements?.support ? {
              expires_at: data.entitlements.support.expires_at?.toDate() || null,
            } : null,
            mentorship: data.entitlements?.mentorship ? {
              expires_at: data.entitlements.mentorship.expires_at?.toDate() || null,
              enabled: data.entitlements.mentorship.enabled || false,
            } : null,
          },
        } as SubscriptionDoc);
      });

      setSubscriptions(subscriptionsData);
    } catch (err) {
      console.error("Error loading subscriptions:", err);
      setError("Erro ao carregar assinaturas");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  return {
    subscriptions,
    loading,
    error,
    reload: loadSubscriptions,
  };
}
