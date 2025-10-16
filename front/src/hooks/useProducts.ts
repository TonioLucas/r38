'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ProductDoc, ProductPriceDoc, COLLECTIONS } from '@/types/firestore';

export interface ProductWithPrices extends ProductDoc {
  prices: ProductPriceDoc[];
}

/**
 * Hook to fetch products with their prices
 * Fetches active and pre-sale products and joins with product_prices collection
 */
export function useProducts() {
  const [products, setProducts] = useState<ProductWithPrices[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch products (active and pre-sale only)
      const productsQuery = query(
        collection(db, COLLECTIONS.PRODUCTS),
        where('status', 'in', ['active', 'pre_sale'])
      );
      const productsSnap = await getDocs(productsQuery);
      const productsData = productsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ProductDoc[];

      // Fetch all active product prices
      const pricesQuery = query(
        collection(db, COLLECTIONS.PRODUCT_PRICES),
        where('active', '==', true)
      );
      const pricesSnap = await getDocs(pricesQuery);
      const pricesData = pricesSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ProductPriceDoc[];

      // Join products with their prices
      const productsWithPrices: ProductWithPrices[] = productsData
        .map((product) => ({
          ...product,
          prices: pricesData.filter((price) => price.product_id === product.id),
        }))
        .filter((product) => product.prices.length > 0) // Only show products with prices
        .sort((a, b) => {
          // Sort: active products first, then by name
          if (a.status === 'active' && b.status !== 'active') return -1;
          if (a.status !== 'active' && b.status === 'active') return 1;
          return a.name.localeCompare(b.name);
        });

      setProducts(productsWithPrices);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  return {
    products,
    loading,
    error,
    refetch: fetchProducts,
  };
}
