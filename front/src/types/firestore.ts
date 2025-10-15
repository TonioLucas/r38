import { Timestamp } from "firebase/firestore";

// Base document interface
export interface BaseDocument {
  id: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// User document interface
export interface UserDoc extends BaseDocument {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  emailVerified: boolean;
  isAnonymous: boolean;
  // Add custom user fields as needed
  role?: 'admin' | 'user' | 'moderator';
  preferences?: {
    theme: 'light' | 'dark';
    language: string;
    notifications: boolean;
  };
}

// Example: Post document interface
export interface PostDoc extends BaseDocument {
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  published: boolean;
  tags: string[];
  likes: number;
  views: number;
}

// Example: Comment document interface
export interface CommentDoc extends BaseDocument {
  postId: string;
  content: string;
  authorId: string;
  authorName: string;
  parentCommentId?: string; // For nested comments
}

// File upload metadata
export interface FileDoc extends BaseDocument {
  name: string;
  size: number;
  type: string;
  url: string;
  path: string;
  uploadedBy: string;
}

// Notification document
export interface NotificationDoc extends BaseDocument {
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  actionUrl?: string;
}

// Lead document interface (for landing page leads)
export interface LeadDoc extends BaseDocument {
  name: string;
  email: string;
  phone?: string;
  ip: string;
  userAgent: string;
  utm: {
    firstTouch: {
      source?: string;
      medium?: string;
      campaign?: string;
      term?: string;
      content?: string;
      referrer?: string;
      gclid?: string;
      fbclid?: string;
      timestamp: Timestamp;
    };
    lastTouch: {
      source?: string;
      medium?: string;
      campaign?: string;
      term?: string;
      content?: string;
      referrer?: string;
      gclid?: string;
      fbclid?: string;
      timestamp: Timestamp;
    };
  };
  consent: {
    lgpdConsent: boolean;
    consentTextVersion: string;
  };
  recaptchaScore: number;
  download: {
    firstDownloadedAt?: Timestamp;
    lastDownloadedAt?: Timestamp;
    count24h: number;
  };
  activecampaign?: {
    contactId: string;
    listId: string;
    tagId: string;
    syncedAt: Timestamp;
  };
}

// Settings document (singleton for app settings)
export interface SettingsDoc {
  hero: {
    headline: string;
    subheadline: string;
    ctaText: string;
  };
  images: Array<{
    storagePath: string;
    url: string;
    alt: string;
  }>;
  banners: Array<{
    storagePath: string;
    url: string;
    alt: string;
    order: number;
    link?: string; // Optional URL to navigate when banner is clicked
  }>;
  ebook: {
    storagePath: string;
    fileName: string;
    sizeBytes: number;
  };
  updatedAt: Timestamp;
}

// Page document interface (for dynamic pages like privacy policy)
export interface PageDoc {
  id: string;
  title: string;
  content: string;
  enabled: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// User settings document
export interface UserSettingsDoc {
  userId: string;
  theme: 'light' | 'dark';
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    inApp: boolean;
  };
  privacy: {
    profileVisible: boolean;
    activityVisible: boolean;
  };
  updatedAt: Timestamp;
}

// ============================================================================
// COMMERCIALIZATION TYPES
// ============================================================================

// Enums
export type ProductStatus = 'active' | 'pre_sale' | 'inactive';
export type SubscriptionStatus = 'payment_pending' | 'active' | 'cancelled' | 'expired' | 'refunded';
export type PaymentStatus = 'pending' | 'processing' | 'confirmed' | 'failed' | 'refunded';
export type PaymentMethod = 'btc' | 'pix' | 'credit_card';
export type PaymentProvider = 'stripe' | 'btcpayserver' | 'manual';
export type AffiliateStatus = 'pending' | 'active' | 'suspended';
export type AffiliateTransactionType = 'sale' | 'refund' | 'payout';
export type AffiliateTransactionStatus = 'pending' | 'approved' | 'paid' | 'cancelled';
export type ManualVerificationStatus = 'pending' | 'approved' | 'rejected';

// Product interfaces
export interface BaseEntitlementsData {
  platform_months: number | null;
  support_months: number | null;
  mentorship_included: boolean;
}

export interface ProductDoc extends BaseDocument {
  name: string;
  slug: string;
  description: string;
  status: ProductStatus;
  launch_date: Date | null;
  base_entitlements: BaseEntitlementsData;
  astron_club_id: string;
  metadata: Record<string, any>;
}

export interface ProductPriceDoc extends BaseDocument {
  product_id: string;
  payment_method: PaymentMethod;
  amount: number;
  display_amount: number;
  currency: string;
  installments: number | null;
  installment_amount: number | null;
  includes_mentorship: boolean;
  active: boolean;
}

// Customer interfaces
export interface ActiveEntitlementsData {
  platform: boolean;
  support: boolean;
  mentorship: boolean;
}

export interface CustomerDoc extends BaseDocument {
  email: string;
  name: string;
  phone: string | null;
  generated_password: string | null;
  astron_member_id: string | null;
  magic_login_url: string | null;
  active_entitlements: ActiveEntitlementsData;
  stripe_customer_id: string | null;
  btcpay_customer_id: string | null;
  converted_lead_ids: string[];
  converted_at: Date | null;
}

// Subscription interfaces
export interface EntitlementData {
  expires_at: Date | null;
  courses?: string[];
  enabled?: boolean;
}

export interface EntitlementsData {
  platform: EntitlementData;
  support: EntitlementData | null;
  mentorship: EntitlementData | null;
}

export interface AffiliateData {
  affiliate_id: string;
  commission_percentage: number;
  commission_amount: number;
  commission_status: AffiliateTransactionStatus;
}

export interface ManualVerificationData {
  proof_url: string;
  verified_by: string;
  verified_at: Date;
  notes: string | null;
}

export interface SubscriptionDoc extends BaseDocument {
  customer_id: string;
  product_id: string;
  price_id: string;
  status: SubscriptionStatus;
  entitlements: EntitlementsData;
  payment_method: PaymentMethod;
  payment_provider: PaymentProvider;
  provider_subscription_id: string | null;
  amount_paid: number;
  currency: string;
  access_granted_at: Date | null;
  access_available_from: Date | null;
  affiliate_data: AffiliateData | null;
  manual_verification: ManualVerificationData | null;
}

// Payment interfaces
export interface InstallmentInfoData {
  number: number;
  total: number;
}

export interface BtcData {
  address: string;
  confirmations: number;
  txid: string | null;
  confirmed_at: Date | null;
}

export interface PaymentDoc extends BaseDocument {
  subscription_id: string;
  customer_id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  payment_method: PaymentMethod;
  payment_provider: PaymentProvider;
  provider_payment_id: string | null;
  provider_metadata: Record<string, any>;
  installment_info: InstallmentInfoData | null;
  btc_data: BtcData | null;
  processed_at: Date | null;
}

// Affiliate interfaces
export interface PaymentInfoData {
  method: string;
  details: Record<string, any>;
}

export interface AffiliateDoc extends BaseDocument {
  user_id: string | null;
  email: string;
  name: string;
  status: AffiliateStatus;
  commission_rate: number;
  payment_info: PaymentInfoData | null;
  tracking_codes: string[];
  total_sales: number;
  total_commission_earned: number;
  total_commission_paid: number;
  pending_commission: number;
  metadata: Record<string, any>;
}

export interface AffiliateTransactionDoc extends BaseDocument {
  affiliate_id: string;
  subscription_id: string | null;
  type: AffiliateTransactionType;
  amount: number;
  currency: string;
  status: AffiliateTransactionStatus;
  payment_reference: string | null;
  notes: string | null;
  processed_at: Date | null;
}

// Webhook interfaces
export interface WebhookEventDoc extends BaseDocument {
  provider: PaymentProvider;
  event_type: string;
  payload: Record<string, any>;
  signature: string;
  processed: boolean;
  processed_at: Date | null;
  error: string | null;
  related_subscription_id: string | null;
  related_payment_id: string | null;
  idempotency_key: string;
}

// Manual verification interfaces
export interface ManualVerificationDoc extends BaseDocument {
  email: string;
  upload_url: string;
  status: ManualVerificationStatus;
  submitted_at: Date;
  reviewed_by: string | null;
  reviewed_at: Date | null;
  notes: string | null;
  subscription_created: string | null;
}

// Collection names as constants
export const COLLECTIONS = {
  USERS: 'users',
  POSTS: 'posts',
  COMMENTS: 'comments',
  FILES: 'files',
  NOTIFICATIONS: 'notifications',
  SETTINGS: 'settings',
  LEADS: 'leads',
  USER_SETTINGS: 'userSettings',
  PAGES: 'pages',
  // Commercialization collections
  PRODUCTS: 'products',
  PRODUCT_PRICES: 'product_prices',
  CUSTOMERS: 'customers',
  SUBSCRIPTIONS: 'subscriptions',
  PAYMENTS: 'payments',
  AFFILIATES: 'affiliates',
  AFFILIATE_TRANSACTIONS: 'affiliate_transactions',
  WEBHOOK_EVENTS: 'webhook_events',
  MANUAL_VERIFICATIONS: 'manual_verifications',
} as const;

// Type for collection names
export type CollectionName = typeof COLLECTIONS[keyof typeof COLLECTIONS];