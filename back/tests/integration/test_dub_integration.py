"""Integration tests for dub.co affiliate tracking."""

import pytest
from unittest.mock import Mock, patch, MagicMock
import json
import hmac
import hashlib
from src.services.dub_service import DubService
from src.services.webhook_processors.dub_processor import process_dub_webhook


@pytest.mark.integration
class TestDubService:
    """Test DubService API integration."""

    @patch.dict('os.environ', {'DUB_API_KEY': 'test_key', 'DUB_WEBHOOK_SECRET': 'test_secret'})
    @patch('src.services.dub_service.Dub')
    def test_track_lead(self, mock_dub_class):
        """Test lead tracking functionality."""
        # Setup mock
        mock_dub_instance = Mock()
        mock_dub_class.return_value = mock_dub_instance

        # Configure mock response
        mock_response = Mock()
        mock_response.dict.return_value = {
            'click': {'id': 'clk_123'},
            'customer': {
                'id': 'user_456',
                'email': 'test@example.com',
                'name': 'Test User'
            }
        }
        mock_dub_instance.track.lead.return_value = mock_response

        # Test
        service = DubService()
        result = service.track_lead(
            click_id="test_click_123",
            customer_id="user_456",
            email="test@example.com",
            name="Test User"
        )

        # Assertions
        mock_dub_instance.track.lead.assert_called_once_with(
            click_id="test_click_123",
            event_name="Sign Up",
            customer_external_id="user_456",
            customer_email="test@example.com",
            customer_name="Test User"
        )
        assert result == mock_response.dict.return_value

    @patch.dict('os.environ', {'DUB_API_KEY': 'test_key', 'DUB_WEBHOOK_SECRET': 'test_secret'})
    @patch('src.services.dub_service.Dub')
    def test_track_sale(self, mock_dub_class):
        """Test sale tracking functionality."""
        # Setup mock
        mock_dub_instance = Mock()
        mock_dub_class.return_value = mock_dub_instance

        # Configure mock response
        mock_response = Mock()
        mock_response.dict.return_value = {
            'sale': {'id': 'sale_789'},
            'amount': 9900,
            'currency': 'BRL',
            'customer': {'id': 'user_456'}
        }
        mock_dub_instance.track.sale.return_value = mock_response

        # Test
        service = DubService()
        result = service.track_sale(
            customer_id="user_456",
            amount=9900,  # R$99.00 in cents
            currency="BRL",
            invoice_id="inv_789"
        )

        # Assertions
        mock_dub_instance.track.sale.assert_called_once_with(
            customer_external_id="user_456",
            amount=9900,
            currency="BRL",
            event_name="Purchase",
            payment_processor="stripe",
            invoice_id="inv_789"
        )
        assert result == mock_response.dict.return_value

    @patch.dict('os.environ', {'DUB_API_KEY': 'test_key', 'DUB_WEBHOOK_SECRET': 'test_secret'})
    @patch('src.services.dub_service.Dub')
    def test_track_sale_failure_graceful(self, mock_dub_class):
        """Test that sale tracking failures don't break payment flow."""
        # Setup mock to raise error
        mock_dub_instance = Mock()
        mock_dub_class.return_value = mock_dub_instance
        mock_dub_instance.track.sale.side_effect = Exception("API Error")

        # Test
        service = DubService()
        result = service.track_sale(
            customer_id="user_456",
            amount=9900,
            currency="BRL"
        )

        # Should return error but not raise
        assert result['tracked'] is False
        assert 'error' in result

    def test_verify_webhook_signature(self):
        """Test webhook signature verification."""
        with patch.dict('os.environ', {'DUB_API_KEY': 'test_key', 'DUB_WEBHOOK_SECRET': 'test_secret'}):
            service = DubService()

            payload = '{"id":"evt_123","event":"sale.created"}'
            secret = "test_secret"

            # Generate valid signature
            valid_sig = hmac.new(
                secret.encode(),
                payload.encode(),
                hashlib.sha256
            ).hexdigest()

            # Test valid signature
            assert service.verify_webhook_signature(payload, valid_sig) is True

            # Test invalid signature
            assert service.verify_webhook_signature(payload, "invalid_sig") is False


@pytest.mark.integration
class TestDubWebhookProcessor:
    """Test dub.co webhook processing."""

    def test_process_sale_created(self):
        """Test processing of sale.created webhook."""
        event = {
            'id': 'evt_123',
            'event': 'sale.created',
            'data': {
                'customer': {
                    'id': 'user_456',
                    'email': 'test@example.com'
                },
                'saleAmount': 99.00,
                'currency': 'USD',
                'partner': {
                    'id': 'partner_789',
                    'name': 'Test Partner'
                }
            }
        }

        result = process_dub_webhook(event)

        assert result['processed'] is True
        assert result['sale_amount'] == 99.00

    def test_process_lead_created(self):
        """Test processing of lead.created webhook."""
        event = {
            'id': 'evt_456',
            'event': 'lead.created',
            'data': {
                'eventName': 'Sign up',
                'customer': {
                    'id': 'user_789',
                    'email': 'lead@example.com'
                },
                'click': {
                    'id': 'clk_abc'
                },
                'link': {
                    'shortLink': 'https://dub.sh/test'
                }
            }
        }

        result = process_dub_webhook(event)

        assert result['processed'] is True
        assert result['customer_id'] == 'user_789'

    def test_process_commission_created(self):
        """Test processing of commission.created webhook."""
        event = {
            'id': 'evt_789',
            'event': 'commission.created',
            'data': {
                'id': 'comm_123',
                'amount': 10.00,
                'currency': 'USD',
                'status': 'pending',
                'partner': {
                    'id': 'partner_456',
                    'email': 'partner@example.com'
                },
                'sale': {
                    'amount': 100.00
                }
            }
        }

        result = process_dub_webhook(event)

        assert result['processed'] is True
        assert result['commission_id'] == 'comm_123'
        assert result['partner_id'] == 'partner_456'
        assert result['amount'] == 10.00

    def test_process_partner_enrolled(self):
        """Test processing of partner.enrolled webhook."""
        event = {
            'id': 'evt_abc',
            'event': 'partner.enrolled',
            'data': {
                'id': 'partner_new',
                'name': 'New Partner',
                'email': 'new@partner.com',
                'status': 'approved',
                'programId': 'prog_123',
                'links': [
                    {
                        'shortLink': 'https://dub.sh/partner1'
                    }
                ]
            }
        }

        result = process_dub_webhook(event)

        assert result['processed'] is True
        assert result['partner_id'] == 'partner_new'
        assert result['partner_email'] == 'new@partner.com'
        assert result['links_count'] == 1

    def test_process_unhandled_event(self):
        """Test handling of unknown event types."""
        event = {
            'id': 'evt_unknown',
            'event': 'unknown.event',
            'data': {}
        }

        result = process_dub_webhook(event)

        assert result['processed'] is False
        assert 'Unhandled event type' in result['reason']


@pytest.mark.integration
class TestDubIntegrationWithStripe:
    """Test dub.co integration with Stripe checkout."""

    @patch('src.services.stripe_service.stripe')
    @patch('src.documents.customers.Subscription.Subscription')
    def test_checkout_session_includes_dub_customer_id(self, mock_subscription_class, mock_stripe):
        """Test that Stripe checkout includes dubCustomerId in metadata."""
        from src.services.stripe_service import StripeService
        from src.documents.products.Product import Product
        from src.documents.products.ProductPrice import ProductPrice

        # Setup mocks
        mock_subscription = Mock()
        mock_subscription.doc = Mock()
        mock_subscription.doc.customer_id = 'customer_firebase_123'
        mock_subscription_class.return_value = mock_subscription

        mock_session = Mock()
        mock_session.url = 'https://checkout.stripe.com/test'
        mock_session.id = 'cs_test_123'
        mock_stripe.checkout.Session.create.return_value = mock_session

        # Create mock product and price
        mock_product = Mock(spec=Product)
        mock_product.doc = Mock()
        mock_product.doc.id = 'prod_123'
        mock_product.doc.name = 'Test Product'
        mock_product.doc.description = 'Test Description'

        mock_price = Mock(spec=ProductPrice)
        mock_price.doc = Mock()
        mock_price.doc.id = 'price_123'
        mock_price.doc.amount = 9900
        mock_price.doc.currency = 'BRL'

        # Test
        with patch.dict('os.environ', {
            'STRIPE_SECRET_KEY': 'sk_test_123',
            'STRIPE_WEBHOOK_SECRET': 'whsec_123'
        }):
            service = StripeService()
            url = service.create_checkout_session(
                subscription_id='sub_123',
                product=mock_product,
                price=mock_price
            )

        # Verify metadata includes dubCustomerId
        call_args = mock_stripe.checkout.Session.create.call_args
        metadata = call_args.kwargs['metadata']

        assert metadata['dubCustomerId'] == 'customer_firebase_123'
        assert metadata['subscription_id'] == 'sub_123'
        assert url == 'https://checkout.stripe.com/test'


if __name__ == "__main__":
    pytest.main([__file__, "-v"])