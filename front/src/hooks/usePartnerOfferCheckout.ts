'use client';

import { useState } from 'react';
import { ProductDoc, ProductPriceDoc } from '@/types/firestore';
import { PartnerVerificationCheckoutData, PartnerOfferData } from '@/types/partner-offer';
import { createCheckoutLead } from '@/lib/api/leads';

/**
 * Extended checkout hook for partner offer flow
 * Adds partner verification and manual verification agreement to standard checkout
 */
export function usePartnerOfferCheckout() {
  const [activeStep, setActiveStep] = useState(0);
  const [checkoutData, setCheckoutData] = useState<Partial<PartnerVerificationCheckoutData>>({
    agreedToManualVerification: false,
  });

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
   * Sets user information and creates checkout lead
   */
  const setUserInfo = async (email: string, name: string, phone?: string) => {
    // Store user info in state first
    setCheckoutData((prev) => ({
      ...prev,
      email,
      name,
      phone,
    }));

    // Create checkout lead for abandonment tracking (non-blocking)
    try {
      if (!checkoutData.product || !checkoutData.selectedPrice) {
        console.warn('Cannot create checkout lead: product or price not selected');
        return;
      }

      const result = await createCheckoutLead({
        email,
        name,
        phone,
        product_id: checkoutData.product.id,
        price_id: checkoutData.selectedPrice.id,
        affiliate_code: checkoutData.affiliateCode,
        partner_offer: checkoutData.partnerOffer,
      });

      // Store lead_id for payment creation
      setCheckoutData((prev) => ({
        ...prev,
        leadId: result.lead_id,
      }));

      console.log('Checkout lead created:', result.lead_id);
    } catch (error) {
      console.error('Failed to create checkout lead:', error);
      // Non-critical error - continue checkout even if lead creation fails
    }
  };

  /**
   * Sets partner offer data
   */
  const setPartnerOffer = (partner: PartnerOfferData['partner'], proofUrl: string) => {
    setCheckoutData((prev) => ({
      ...prev,
      partnerOffer: {
        partner,
        proofUrl,
      },
    }));
  };

  /**
   * Sets manual verification agreement
   */
  const setManualVerificationAgreement = (agreed: boolean) => {
    setCheckoutData((prev) => ({
      ...prev,
      agreedToManualVerification: agreed,
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
    setCheckoutData({
      agreedToManualVerification: false,
    });
  };

  /**
   * Checks if checkout data is complete
   * Requires all standard fields plus partner offer and manual verification agreement
   */
  const isComplete = (): boolean => {
    return !!(
      checkoutData.product &&
      checkoutData.selectedPrice &&
      checkoutData.email &&
      checkoutData.name &&
      checkoutData.partnerOffer?.partner &&
      checkoutData.partnerOffer?.proofUrl &&
      checkoutData.agreedToManualVerification
    );
  };

  return {
    activeStep,
    checkoutData,
    setProductAndPrice,
    setUserInfo,
    setPartnerOffer,
    setManualVerificationAgreement,
    setAffiliateCode,
    nextStep,
    prevStep,
    reset,
    isComplete,
  };
}
