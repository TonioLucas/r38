/**
 * Hook to fetch manual verifications with filtering
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
import { ManualVerificationDoc, COLLECTIONS, ManualVerificationStatus } from "@/types/firestore";

export function useAdminVerifications(statusFilter?: ManualVerificationStatus) {
  const [verifications, setVerifications] = useState<ManualVerificationDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadVerifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const verificationsRef = collection(db, COLLECTIONS.MANUAL_VERIFICATIONS);
      let q;

      if (statusFilter) {
        q = query(
          verificationsRef,
          where("status", "==", statusFilter),
          orderBy("submitted_at", "desc"),
          limit(100)
        );
      } else {
        q = query(
          verificationsRef,
          orderBy("submitted_at", "desc"),
          limit(100)
        );
      }

      const snapshot = await getDocs(q);
      const verificationsData: ManualVerificationDoc[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        verificationsData.push({
          ...data,
          id: doc.id,
          // Convert Firestore Timestamps to Dates
          submitted_at: data.submitted_at?.toDate(),
          reviewed_at: data.reviewed_at?.toDate(),
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        } as ManualVerificationDoc);
      });

      setVerifications(verificationsData);
    } catch (err) {
      console.error("Error loading verifications:", err);
      setError("Erro ao carregar verificações");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadVerifications();
  }, [loadVerifications]);

  return {
    verifications,
    loading,
    error,
    reload: loadVerifications,
  };
}
