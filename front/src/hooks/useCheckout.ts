'use client';

import { useState } from 'react';
import { ProductDoc, ProductPriceDoc } from '@/types/firestore';
import { CheckoutData } from '@/types/checkout';

/**
 * Hook to manage checkout state
 * Handles multi-step checkout flow state management
 */
export function useCheckout() {
  const [activeStep, setActiveStep] = useState(0);
  const [checkoutData, setCheckoutData] = useState<Partial<CheckoutData>>({});

  /**
   * Sets the selected product and price
   */
  const setProductAndPrice = (product: ProductDoc, price: ProductPriceDoc) => {
    setCheckoutData((prev) => ({
      ...prev,
      product,
      selectedPrice: price,
    }));
  };

  /**
   * Sets user information
   */
  const setUserInfo = (email: string, name: string, phone?: string) => {
    setCheckoutData((prev) => ({
      ...prev,
      email,
      name,
      phone,
    }));
  };

  /**
   * Sets affiliate code
   */
  const setAffiliateCode = (code: string | null | undefined) => {
    setCheckoutData((prev) => ({
      ...prev,
      affiliateCode: code || undefined,
    }));
  };

  /**
   * Advances to next step
   */
  const nextStep = () => {
    setActiveStep((prev) => prev + 1);
  };

  /**
   * Goes back to previous step
   */
  const prevStep = () => {
    setActiveStep((prev) => Math.max(0, prev - 1));
  };

  /**
   * Resets checkout state
   */
  const reset = () => {
    setActiveStep(0);
    setCheckoutData({});
  };

  /**
   * Checks if checkout data is complete
   */
  const isComplete = (): boolean => {
    return !!(
      checkoutData.product &&
      checkoutData.selectedPrice &&
      checkoutData.email &&
      checkoutData.name
    );
  };

  return {
    activeStep,
    checkoutData,
    setProductAndPrice,
    setUserInfo,
    setAffiliateCode,
    nextStep,
    prevStep,
    reset,
    isComplete,
  };
}
