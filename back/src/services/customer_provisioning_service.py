"""Customer provisioning service orchestrating multi-system account creation."""

import os
import base64
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from cryptography.fernet import Fernet
from firebase_admin import auth
from firebase_admin.auth import EmailAlreadyExistsError

from src.services.astron_members_service import AstronMembersService
from src.services.activecampaign_service import ActiveCampaignService
from src.services.dub_service import DubService
from src.documents.customers.Customer import Customer
from src.documents.customers.Subscription import Subscription
from src.documents.products.Product import Product
from src.documents.products.ProductPrice import ProductPrice
from src.util.password_generator import generate_readable_password
from src.util.logger import get_logger
from src.apis.Db import Db

logger = get_logger(__name__)


class CustomerProvisioningService:
    """Orchestrates complete customer provisioning workflow.

    Handles Firebase Auth creation, Astron Members setup,
    ActiveCampaign sync, and affiliate commission recording.
    """

    def __init__(self):
        """Initialize provisioning service with all dependencies."""
        self.astron_service = AstronMembersService()
        self.ac_service = ActiveCampaignService()

        # Get or generate encryption key
        encryption_key = os.environ.get('PASSWORD_ENCRYPTION_KEY')
        if not encryption_key:
            # Generate a key for development (in production, use Secret Manager)
            logger.warning("PASSWORD_ENCRYPTION_KEY not set, generating temporary key")
            encryption_key = Fernet.generate_key().decode()

        self.encryption_key = encryption_key.encode() if isinstance(encryption_key, str) else encryption_key
        self.fernet = Fernet(self.encryption_key)

        self.db = Db.get_instance()

    def provision_customer(self, subscription_id: str) -> Dict[str, Any]:
        """Complete customer provisioning workflow.

        Args:
            subscription_id: ID of subscription to provision

        Returns:
            Dict with provisioning results

        Raises:
            ValueError: If subscription not found
            Exception: On critical provisioning failure
        """
        logger.info(f"Starting provisioning for subscription: {subscription_id}")

        # Get subscription
        subscription = Subscription(id=subscription_id)
        if not subscription.doc:
            raise ValueError(f"Subscription not found: {subscription_id}")

        # Get product for club configuration
        product = Product(id=subscription.doc.product_id)
        if not product.doc:
            raise ValueError(f"Product not found: {subscription.doc.product_id}")

        try:
            # Step 1: Get or create customer
            customer = self._get_or_create_customer(
                subscription.doc.customer_id,
                subscription.doc.customer_email,
                subscription.doc.customer_name or "Customer"
            )

            # Step 2: Generate or retrieve password
            password = self._get_or_generate_password(customer)

            # Step 3: Create or get Firebase Auth account
            firebase_uid = self._create_or_get_firebase_user(
                customer.doc.email,
                password
            )

            # Update customer with Firebase UID if new
            if not customer.doc.firebase_uid:
                customer.update_doc({'firebase_uid': firebase_uid})

            # Step 4: Create or update Astron Members account
            astron_member_id = self._create_or_update_astron_account(
                customer,
                password,
                product.doc.astron_club_id if hasattr(product.doc, 'astron_club_id') else None
            )

            # Step 5: Generate magic login URL
            magic_url = self._generate_magic_login_url(
                astron_member_id,
                customer.doc.email
            )

            # Update customer with magic URL
            customer.update_doc({'magic_login_url': magic_url})

            # Step 6: Sync with ActiveCampaign
            self._sync_activecampaign(
                customer,
                subscription,
                product,
                password,
                magic_url
            )

            # Step 7: Record affiliate commission if applicable
            if hasattr(subscription.doc, 'affiliate_data') and subscription.doc.affiliate_data:
                self._record_affiliate_commission(subscription)

            # Step 8: Mark provisioning complete
            subscription.update_doc({
                'access_granted_at': self.db.timestamp_now(),
                'provisioning_status': 'completed'
            })

            logger.info(f"Provisioning completed successfully for subscription: {subscription_id}")

            return {
                'success': True,
                'customer_id': customer.doc.id,
                'firebase_uid': firebase_uid,
                'astron_member_id': astron_member_id,
                'magic_login_url': magic_url
            }

        except Exception as e:
            logger.error(f"Provisioning failed for {subscription_id}: {e}", exc_info=True)

            # Update subscription with error status
            subscription.update_doc({
                'provisioning_status': 'failed',
                'provisioning_error': str(e)
            })

            raise

    def _get_or_create_customer(
        self,
        customer_id: str,
        email: str,
        name: str
    ) -> Customer:
        """Get existing customer or create new one.

        Args:
            customer_id: Customer ID (Firebase UID)
            email: Customer email
            name: Customer name

        Returns:
            Customer document instance
        """
        # Try to get by ID first
        customer = Customer(id=customer_id)
        if customer.doc:
            return customer

        # Try to find by email
        customers = self.db.collections["customers"].where('email', '==', email).limit(1).get()
        if customers:
            customer_doc = customers[0]
            return Customer(id=customer_doc.id, doc=customer_doc.to_dict())

        # Create new customer
        logger.info(f"Creating new customer for email: {email}")
        customer = Customer(id=customer_id)
        customer.create_doc({
            'id': customer_id,
            'email': email,
            'name': name,
            'created_at': self.db.timestamp_now()
        })

        return customer

    def _get_or_generate_password(self, customer: Customer) -> str:
        """Get existing password or generate new one.

        Args:
            customer: Customer document

        Returns:
            Decrypted password string
        """
        if hasattr(customer.doc, 'generated_password') and customer.doc.generated_password:
            # Decrypt existing password
            try:
                decrypted = self.fernet.decrypt(
                    base64.b64decode(customer.doc.generated_password)
                )
                return decrypted.decode()
            except Exception as e:
                logger.warning(f"Failed to decrypt password, generating new one: {e}")

        # Generate new password
        password = generate_readable_password()

        # Encrypt and store
        encrypted = self.fernet.encrypt(password.encode())
        encoded = base64.b64encode(encrypted).decode()

        customer.update_doc({'generated_password': encoded})

        logger.info(f"Generated new password for customer: {customer.doc.id}")
        return password

    def _create_or_get_firebase_user(self, email: str, password: str) -> str:
        """Create Firebase Auth user or return existing UID.

        Args:
            email: User email
            password: User password

        Returns:
            Firebase UID
        """
        try:
            user = auth.create_user(
                email=email,
                password=password,
                email_verified=True  # Payment confirms email
            )
            logger.info(f"Created Firebase user: {user.uid}")
            return user.uid

        except EmailAlreadyExistsError:
            # User already exists, get existing UID
            user = auth.get_user_by_email(email)
            logger.info(f"Firebase user already exists: {user.uid}")

            # Optionally update password
            try:
                auth.update_user(user.uid, password=password)
                logger.info(f"Updated Firebase user password: {user.uid}")
            except Exception as e:
                logger.warning(f"Could not update Firebase password: {e}")

            return user.uid

        except Exception as e:
            logger.error(f"Error creating Firebase user: {e}")
            raise

    def _create_or_update_astron_account(
        self,
        customer: Customer,
        password: str,
        club_id: Optional[str]
    ) -> str:
        """Create or update Astron Members account.

        Args:
            customer: Customer document
            password: User password
            club_id: Astron club ID

        Returns:
            Astron member ID
        """
        if not club_id:
            logger.warning("No Astron club ID configured for product")
            return ""

        # Check if customer already has Astron ID
        if hasattr(customer.doc, 'astron_member_id') and customer.doc.astron_member_id:
            # Add existing user to new club
            try:
                self.astron_service.add_user_to_club(
                    customer.doc.astron_member_id,
                    club_id
                )
                logger.info(f"Added existing Astron user to club: {customer.doc.astron_member_id}")
                return customer.doc.astron_member_id
            except Exception as e:
                logger.error(f"Failed to add user to club: {e}")
                # Try to create new account as fallback

        # Create new Astron user
        try:
            astron_member_id = self.astron_service.create_user(
                customer.doc.email,
                customer.doc.name,
                password,
                club_id
            )

            # Store Astron ID in customer document
            customer.update_doc({'astron_member_id': astron_member_id})

            logger.info(f"Created Astron Members user: {astron_member_id}")
            return astron_member_id

        except Exception as e:
            logger.error(f"Failed to create Astron user: {e}")
            # Non-critical, continue provisioning
            return ""

    def _generate_magic_login_url(
        self,
        astron_member_id: str,
        email: str
    ) -> str:
        """Generate magic login URL for Astron Members.

        Args:
            astron_member_id: Astron member ID
            email: User email

        Returns:
            Magic login URL
        """
        if not astron_member_id:
            # No Astron account, return regular login URL
            return "https://renato38.astronmembers.com.br/login"

        return self.astron_service.generate_magic_login_url(
            astron_member_id,
            email,
            "renato38"  # Club subdomain
        )

    def _sync_activecampaign(
        self,
        customer: Customer,
        subscription: Subscription,
        product: Product,
        password: str,
        magic_url: str
    ):
        """Sync purchase data to ActiveCampaign.

        Args:
            customer: Customer document
            subscription: Subscription document
            product: Product document
            password: Generated password
            magic_url: Magic login URL
        """
        try:
            # Calculate support expiration
            support_expires = None
            if hasattr(subscription.doc.entitlements, 'support') and subscription.doc.entitlements.support:
                if hasattr(subscription.doc.entitlements.support, 'expires_at'):
                    support_expires = subscription.doc.entitlements.support.expires_at.strftime('%Y-%m-%d')
                else:
                    # Default to 6 months from now
                    support_expires = (datetime.now() + timedelta(days=180)).strftime('%Y-%m-%d')

            # Check mentorship
            mentorship_included = False
            if hasattr(subscription.doc.entitlements, 'mentorship') and subscription.doc.entitlements.mentorship:
                mentorship_included = subscription.doc.entitlements.mentorship.enabled

            # Sync to ActiveCampaign
            result = self.ac_service.sync_customer_purchase(
                email=customer.doc.email,
                name=customer.doc.name,
                product_name=product.doc.name,
                support_expires_at=support_expires or "",
                mentorship_included=mentorship_included,
                generated_password=password,
                magic_login_url=magic_url
            )

            if result['success']:
                logger.info(f"ActiveCampaign sync successful for {customer.doc.email}")

                # Store ActiveCampaign contact ID
                if 'contact_id' in result:
                    customer.update_doc({'activecampaign_contact_id': result['contact_id']})
            else:
                logger.error(f"ActiveCampaign sync failed: {result.get('error')}")

        except Exception as e:
            # ActiveCampaign sync is non-critical
            logger.error(f"ActiveCampaign sync error: {e}", exc_info=True)

    def _record_affiliate_commission(self, subscription: Subscription):
        """Record affiliate commission if applicable.

        Args:
            subscription: Subscription document with affiliate_data
        """
        try:
            # Import here to avoid circular dependency
            from src.services.dub_service import DubService

            # Use dub.co for affiliate tracking
            dub_service = DubService()

            # Track the sale in dub.co
            result = dub_service.track_sale(
                customer_id=subscription.doc.customer_id,
                amount=subscription.doc.amount_paid,
                currency=subscription.doc.currency,
                invoice_id=subscription.doc.id,
                event_name="Purchase Completed"
            )

            if result.get('tracked'):
                logger.info(f"Affiliate sale tracked in dub.co for subscription: {subscription.doc.id}")
            else:
                logger.warning(f"Failed to track affiliate sale: {result.get('error')}")

        except Exception as e:
            # Affiliate tracking is non-critical
            logger.error(f"Affiliate commission recording failed: {e}", exc_info=True)