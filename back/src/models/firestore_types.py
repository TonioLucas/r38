"""Firestore document type definitions using Pydantic."""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, validator
from enum import Enum


class BaseDoc(BaseModel):
    """Base document type for all Firestore documents."""
    
    createdAt: datetime
    lastUpdatedAt: datetime


class ItemDoc(BaseDoc):
    """Example item document type."""
    
    id: str
    name: str
    description: Optional[str] = None
    categoryId: str
    ownerUid: str
    status: str = "active"  # active, archived, deleted
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)
    tags: List[str] = Field(default_factory=list)
    
    # Timestamps are inherited from BaseDoc
    # createdAt: datetime
    # lastUpdatedAt: datetime


class CategoryDoc(BaseDoc):
    """Example category document type."""
    
    id: str
    name: str
    description: Optional[str] = None
    parentId: Optional[str] = None
    ownerUid: str
    displayOrder: int = 0
    isActive: bool = True
    itemCount: int = 0


class ItemActivityDoc(BaseDoc):
    """Example activity log document type."""
    
    id: str
    itemId: str
    action: str  # created, updated, deleted, viewed, shared
    userId: str
    details: Optional[Dict[str, Any]] = None
    ipAddress: Optional[str] = None
    userAgent: Optional[str] = None


class UserDoc(BaseDoc):
    """User document type."""

    id: str
    email: Optional[str] = None
    displayName: Optional[str] = None
    isPaid: bool = False
    subscriptionStatus: str = "free"
    metadata: Dict[str, Any] = Field(default_factory=dict)


# ============================================================================
# COMMERCIALIZATION MODELS
# ============================================================================

# Enums for status fields
class ProductStatus(str, Enum):
    """Product status enum."""
    ACTIVE = "active"
    PRE_SALE = "pre_sale"
    INACTIVE = "inactive"


class SubscriptionStatus(str, Enum):
    """Subscription status enum."""
    PAYMENT_PENDING = "payment_pending"
    ACTIVE = "active"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    REFUNDED = "refunded"


class PaymentStatus(str, Enum):
    """Payment status enum."""
    PENDING = "pending"
    PROCESSING = "processing"
    CONFIRMED = "confirmed"
    FAILED = "failed"
    REFUNDED = "refunded"


class PaymentMethod(str, Enum):
    """Payment method enum."""
    BTC = "btc"
    PIX = "pix"
    CREDIT_CARD = "credit_card"


class PaymentProvider(str, Enum):
    """Payment provider enum."""
    STRIPE = "stripe"
    BTCPAYSERVER = "btcpayserver"
    MANUAL = "manual"


class AffiliateStatus(str, Enum):
    """Affiliate status enum."""
    PENDING = "pending"
    ACTIVE = "active"
    SUSPENDED = "suspended"


class AffiliateTransactionType(str, Enum):
    """Affiliate transaction type enum."""
    SALE = "sale"
    REFUND = "refund"
    PAYOUT = "payout"


class AffiliateTransactionStatus(str, Enum):
    """Affiliate transaction status enum."""
    PENDING = "pending"
    APPROVED = "approved"
    PAID = "paid"
    CANCELLED = "cancelled"


class ManualVerificationStatus(str, Enum):
    """Manual verification status enum."""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


# Product models
class BaseEntitlementsData(BaseModel):
    """Base entitlements included with product."""
    platform_months: Optional[int] = None  # None = lifetime
    support_months: Optional[int] = None
    mentorship_included: bool = False


class ProductDoc(BaseDoc):
    """Product/course catalog item."""
    id: str
    name: str = Field(min_length=3, max_length=200)
    slug: str = Field(min_length=3, max_length=100, pattern="^[a-z0-9-]+$")
    description: str = Field(min_length=10, max_length=1000)
    status: ProductStatus
    launch_date: Optional[datetime] = None
    base_entitlements: BaseEntitlementsData
    astron_club_id: str
    metadata: Dict[str, Any] = Field(default_factory=dict)

    @validator('launch_date', always=True)
    def validate_launch_date(cls, v, values):
        """Pre-sale products should have launch date (warning only for existing data)."""
        # Allow None for existing data to avoid breaking when reading from Firestore
        # The validation should happen at write time in the application layer
        return v


class ProductPriceDoc(BaseDoc):
    """Pricing for specific product and payment method."""
    id: str
    product_id: str
    payment_method: PaymentMethod
    amount: int = Field(ge=0)  # Centavos (cents)
    display_amount: float = Field(ge=0)  # Reais for display
    currency: str = Field(pattern="^(BRL|USD)$")
    installments: Optional[int] = Field(default=None, ge=1, le=12)
    installment_amount: Optional[int] = None  # Centavos per installment
    includes_mentorship: bool = False
    active: bool = True

    @validator('installment_amount')
    def validate_installment_amount(cls, v, values):
        """If installments set, installment_amount must be calculated."""
        if values.get('installments') and v is None:
            raise ValueError('installment_amount required when installments set')
        return v


# Customer models
class ActiveEntitlementsData(BaseModel):
    """Current access summary for customer."""
    platform: bool = False
    support: bool = False
    mentorship: bool = False


class CustomerDoc(BaseDoc):
    """Customer account linked to Firebase Auth."""
    id: str  # Firebase Auth UID
    email: str = Field(pattern=r"^[\w\.-]+@[\w\.-]+\.\w+$")
    name: str = Field(min_length=3, max_length=200)
    phone: Optional[str] = None
    generated_password: Optional[str] = None  # Encrypted
    astron_member_id: Optional[str] = None
    magic_login_url: Optional[str] = None
    active_entitlements: ActiveEntitlementsData = Field(default_factory=ActiveEntitlementsData)
    stripe_customer_id: Optional[str] = None
    btcpay_customer_id: Optional[str] = None
    converted_lead_ids: List[str] = Field(default_factory=list)
    converted_at: Optional[datetime] = None


# Subscription models
class EntitlementData(BaseModel):
    """Individual entitlement with expiration."""
    expires_at: Optional[datetime] = None  # None = lifetime
    courses: Optional[List[str]] = Field(default_factory=list)  # For platform entitlement
    enabled: Optional[bool] = True  # For mentorship


class EntitlementsData(BaseModel):
    """All entitlements for subscription."""
    platform: EntitlementData
    support: Optional[EntitlementData] = None
    mentorship: Optional[EntitlementData] = None


class AffiliateData(BaseModel):
    """Affiliate attribution data."""
    affiliate_id: str
    commission_percentage: float = Field(ge=0, le=100)
    commission_amount: int = Field(ge=0)  # Centavos
    commission_status: AffiliateTransactionStatus


class ManualVerificationData(BaseModel):
    """Manual verification metadata."""
    proof_url: str
    verified_by: str
    verified_at: datetime
    notes: Optional[str] = None


class SubscriptionDoc(BaseDoc):
    """Purchase record with entitlements."""
    id: str
    customer_id: str
    product_id: str
    price_id: str
    status: SubscriptionStatus
    entitlements: EntitlementsData
    payment_method: PaymentMethod
    payment_provider: PaymentProvider
    provider_subscription_id: Optional[str] = None
    amount_paid: int = Field(ge=0)  # Centavos
    currency: str
    access_granted_at: Optional[datetime] = None
    access_available_from: Optional[datetime] = None  # For pre-sales
    affiliate_data: Optional[AffiliateData] = None
    manual_verification: Optional[ManualVerificationData] = None


# Payment models
class InstallmentInfoData(BaseModel):
    """Installment payment info."""
    number: int = Field(ge=1)
    total: int = Field(ge=1)


class BtcData(BaseModel):
    """Bitcoin payment data."""
    address: str
    confirmations: int = Field(ge=0)
    txid: Optional[str] = None
    confirmed_at: Optional[datetime] = None


class PaymentDoc(BaseDoc):
    """Individual payment transaction."""
    id: str
    subscription_id: str
    customer_id: str
    amount: int = Field(ge=0)  # Centavos
    currency: str
    status: PaymentStatus
    payment_method: PaymentMethod
    payment_provider: PaymentProvider
    provider_payment_id: Optional[str] = None
    provider_metadata: Dict[str, Any] = Field(default_factory=dict)
    installment_info: Optional[InstallmentInfoData] = None
    btc_data: Optional[BtcData] = None
    processed_at: Optional[datetime] = None


# Affiliate models
class PaymentInfoData(BaseModel):
    """Affiliate payout information."""
    method: str  # pix, bank_transfer, btc
    details: Dict[str, Any]


class AffiliateDoc(BaseDoc):
    """Affiliate partner information."""
    id: str
    user_id: Optional[str] = None  # Reference to user account
    email: str
    name: str
    status: AffiliateStatus
    commission_rate: float = Field(ge=0, le=100)  # Default percentage
    payment_info: Optional[PaymentInfoData] = None
    tracking_codes: List[str] = Field(default_factory=list)
    total_sales: int = Field(default=0, ge=0)
    total_commission_earned: int = Field(default=0, ge=0)  # Centavos
    total_commission_paid: int = Field(default=0, ge=0)  # Centavos
    pending_commission: int = Field(default=0, ge=0)  # Centavos
    metadata: Dict[str, Any] = Field(default_factory=dict)


class AffiliateTransactionDoc(BaseDoc):
    """Commission transaction record."""
    id: str
    affiliate_id: str
    subscription_id: Optional[str] = None
    type: AffiliateTransactionType
    amount: int  # Centavos (can be negative for refunds)
    currency: str
    status: AffiliateTransactionStatus
    payment_reference: Optional[str] = None
    notes: Optional[str] = None
    processed_at: Optional[datetime] = None


# Webhook models
class WebhookEventDoc(BaseDoc):
    """Webhook delivery log."""
    id: str
    provider: PaymentProvider
    event_type: str
    payload: Dict[str, Any]
    signature: str
    processed: bool = False
    processed_at: Optional[datetime] = None
    error: Optional[str] = None
    related_subscription_id: Optional[str] = None
    related_payment_id: Optional[str] = None
    idempotency_key: str


# Manual verification models
class ManualVerificationDoc(BaseDoc):
    """Manual verification request."""
    id: str
    email: str
    upload_url: str  # Firebase Storage signed URL
    status: ManualVerificationStatus
    submitted_at: datetime
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    notes: Optional[str] = None
    subscription_created: Optional[str] = None  # Subscription ID after approval