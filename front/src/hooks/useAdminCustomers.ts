/**
 * Hook to fetch customers with pagination
 */

import { useState, useEffect, useCallback } from "react";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  where,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CustomerDoc, COLLECTIONS } from "@/types/firestore";

export function useAdminCustomers() {
  const [customers, setCustomers] = useState<CustomerDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [searchEmail, setSearchEmail] = useState("");

  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const customersRef = collection(db, COLLECTIONS.CUSTOMERS);
      let q = query(
        customersRef,
        orderBy("createdAt", "desc"),
        limit(rowsPerPage)
      );

      if (page > 0 && lastDoc) {
        q = query(
          customersRef,
          orderBy("createdAt", "desc"),
          startAfter(lastDoc),
          limit(rowsPerPage)
        );
      }

      if (searchEmail) {
        q = query(
          customersRef,
          where("email", "==", searchEmail.toLowerCase()),
          orderBy("createdAt", "desc"),
          limit(rowsPerPage)
        );
      }

      const snapshot = await getDocs(q);
      const customersData: CustomerDoc[] = [];
      let lastVisible: QueryDocumentSnapshot<DocumentData> | null = null;

      snapshot.forEach((doc) => {
        customersData.push({ ...doc.data(), id: doc.id } as CustomerDoc);
        lastVisible = doc;
      });

      setCustomers(customersData);
      setLastDoc(lastVisible);

      // Get total count on first page only
      if (page === 0 && !searchEmail) {
        const countQuery = query(customersRef);
        const countSnapshot = await getDocs(countQuery);
        setTotalCount(countSnapshot.size);
      }
    } catch (err) {
      console.error("Error loading customers:", err);
      setError("Erro ao carregar clientes");
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, searchEmail, lastDoc]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleSearch = () => {
    setPage(0);
    loadCustomers();
  };

  return {
    customers,
    loading,
    error,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    totalCount,
    searchEmail,
    setSearchEmail,
    handleSearch,
    reload: loadCustomers,
  };
}
