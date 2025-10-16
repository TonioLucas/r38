'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getTransactionStatus } from '@/lib/api/payments';
import { TransactionStatusResponse } from '@/types/payment';

const POLL_INTERVAL_MS = 5000; // 5 seconds
const MAX_POLL_DURATION_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Hook to poll transaction status
 * Polls every 5 seconds until status is confirmed/failed or 30 minutes elapsed
 */
export function useTransactionStatus(transactionId: string | null) {
  const [status, setStatus] = useState<TransactionStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    if (!transactionId) return;

    try {
      setLoading(true);
      setError(null);

      const result = await getTransactionStatus(transactionId);
      setStatus(result);

      // Stop polling if status is terminal (confirmed or failed)
      if (result.status === 'confirmed' || result.status === 'failed') {
        stopPolling();
      }

      // Stop polling if max duration exceeded
      const elapsedTime = Date.now() - startTimeRef.current;
      if (elapsedTime >= MAX_POLL_DURATION_MS) {
        console.warn('Max poll duration exceeded (30 minutes)');
        stopPolling();
      }
    } catch (err) {
      console.error('Error fetching transaction status:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [transactionId, stopPolling]);

  const startPolling = useCallback(() => {
    if (!transactionId) return;

    // Reset start time
    startTimeRef.current = Date.now();

    // Initial fetch
    fetchStatus();

    // Start polling interval
    intervalRef.current = setInterval(() => {
      fetchStatus();
    }, POLL_INTERVAL_MS);
  }, [transactionId, fetchStatus]);

  // Auto-start polling when transactionId changes
  useEffect(() => {
    if (transactionId) {
      startPolling();
    }

    // Cleanup on unmount or transactionId change
    return () => {
      stopPolling();
    };
  }, [transactionId, startPolling, stopPolling]);

  return {
    status,
    loading,
    error,
    refetch: fetchStatus,
    startPolling,
    stopPolling,
  };
}
