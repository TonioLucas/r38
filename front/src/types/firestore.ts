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
} as const;

// Type for collection names
export type CollectionName = typeof COLLECTIONS[keyof typeof COLLECTIONS];