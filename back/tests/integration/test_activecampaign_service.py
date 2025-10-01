"""Integration tests for ActiveCampaign service."""

import pytest
from unittest.mock import Mock, patch, MagicMock
from src.services.activecampaign_service import ActiveCampaignService
from src.exceptions.CustomError import ExternalServiceError


@pytest.fixture
def ac_service():
    """Create ActiveCampaignService with mocked environment."""
    with patch.dict('os.environ', {
        'ACTIVECAMPAIGN_ACCOUNT': 'testaccount',
        'ACTIVECAMPAIGN_API_KEY': 'test_api_key_12345',
        'ACTIVECAMPAIGN_EBOOK_TAG': 'Test Ebook Tag'
    }):
        return ActiveCampaignService()


@pytest.mark.integration
class TestActiveCampaignService:
    """Test ActiveCampaign service integration."""

    def test_sync_contact_success(self, ac_service):
        """Test successful contact sync."""
        with patch('requests.request') as mock_request:
            mock_response = Mock()
            mock_response.json.return_value = {
                'contact': {
                    'id': '123',
                    'email': '[email protected]',
                    'firstName': 'Test',
                    'lastName': 'User'
                }
            }
            mock_response.raise_for_status = Mock()
            mock_request.return_value = mock_response

            contact_id = ac_service.sync_contact('[email protected]', 'Test', 'User', '+5511988887777')

            assert contact_id == '123'
            mock_request.assert_called_once()
            call_args = mock_request.call_args
            assert call_args[1]['json']['contact']['email'] == '[email protected]'
            assert call_args[1]['json']['contact']['firstName'] == 'Test'
            assert call_args[1]['json']['contact']['lastName'] == 'User'
            assert call_args[1]['json']['contact']['phone'] == '+5511988887777'

    def test_sync_contact_api_error(self, ac_service):
        """Test handling of API errors."""
        import requests as requests_module

        with patch('requests.request') as mock_request:
            mock_response = Mock()
            mock_response.status_code = 401
            mock_response.text = "Unauthorized"

            # Create HTTPError with response attached
            http_error = requests_module.exceptions.HTTPError("API Error")
            http_error.response = mock_response
            mock_response.raise_for_status.side_effect = http_error
            mock_request.return_value = mock_response

            with pytest.raises(ExternalServiceError):
                ac_service.sync_contact('[email protected]', 'Test', 'User')

    def test_get_tag_id_found(self, ac_service):
        """Test finding existing tag."""
        with patch('requests.request') as mock_request:
            mock_response = Mock()
            mock_response.json.return_value = {
                'tags': [
                    {'id': '16', 'tag': 'Ebook Downloaded'},
                    {'id': '17', 'tag': 'Newsletter'}
                ]
            }
            mock_response.raise_for_status = Mock()
            mock_request.return_value = mock_response

            tag_id = ac_service.get_tag_id('Ebook Downloaded')

            assert tag_id == '16'

    def test_get_tag_id_not_found(self, ac_service):
        """Test tag not found returns None."""
        with patch('requests.request') as mock_request:
            mock_response = Mock()
            mock_response.json.return_value = {'tags': []}
            mock_response.raise_for_status = Mock()
            mock_request.return_value = mock_response

            tag_id = ac_service.get_tag_id('Nonexistent Tag')

            assert tag_id is None

    def test_get_tag_id_by_name_raises_on_not_found(self, ac_service):
        """Test get_tag_id_by_name raises ValueError if tag not found."""
        with patch('requests.request') as mock_request:
            mock_response = Mock()
            mock_response.json.return_value = {'tags': []}
            mock_response.raise_for_status = Mock()
            mock_request.return_value = mock_response

            with pytest.raises(ValueError) as exc_info:
                ac_service.get_tag_id_by_name('Nonexistent Tag')

            assert "not found in ActiveCampaign" in str(exc_info.value)

    def test_add_tag_to_contact_success(self, ac_service):
        """Test adding tag to contact."""
        with patch('requests.request') as mock_request:
            mock_response = Mock()
            mock_response.json.return_value = {
                'contactTag': {'id': '1', 'contact': '123', 'tag': '16'}
            }
            mock_response.raise_for_status = Mock()
            mock_request.return_value = mock_response

            result = ac_service.add_tag_to_contact('123', '16')

            assert result is True
            call_args = mock_request.call_args
            assert call_args[1]['json']['contactTag']['contact'] == '123'
            assert call_args[1]['json']['contactTag']['tag'] == '16'

    def test_process_lead_complete_workflow(self, ac_service):
        """Test complete lead processing workflow."""
        with patch.object(ac_service, 'sync_contact', return_value='123') as mock_sync, \
             patch.object(ac_service, 'get_tag_id_by_name', return_value='16') as mock_tag, \
             patch.object(ac_service, 'add_tag_to_contact', return_value=True) as mock_add:

            result = ac_service.process_lead('[email protected]', 'Test User', '+5511988887777')

            assert result['success'] is True
            assert result['contact_id'] == '123'
            assert result['tag_id'] == '16'

            mock_sync.assert_called_once_with(email='[email protected]', first_name='Test', last_name='User', phone='+5511988887777')
            mock_tag.assert_called_once()
            mock_add.assert_called_once_with('123', '16')

    def test_process_lead_name_parsing(self, ac_service):
        """Test name parsing in process_lead."""
        with patch.object(ac_service, 'sync_contact', return_value='123') as mock_sync, \
             patch.object(ac_service, 'get_tag_id_by_name', return_value='16'), \
             patch.object(ac_service, 'add_tag_to_contact', return_value=True):

            # Test with full name
            ac_service.process_lead('[email protected]', 'John Doe Smith', '')
            mock_sync.assert_called_with(email='[email protected]', first_name='John', last_name='Doe Smith', phone='')

            # Test with single name
            ac_service.process_lead('[email protected]', 'John', '')
            mock_sync.assert_called_with(email='[email protected]', first_name='John', last_name='', phone='')

    def test_rate_limiting(self, ac_service):
        """Test that rate limiting delays are applied."""
        import time

        with patch('requests.request') as mock_request:
            mock_response = Mock()
            mock_response.json.return_value = {'tags': []}
            mock_response.raise_for_status = Mock()
            mock_request.return_value = mock_response

            start_time = time.time()

            # Make two requests
            ac_service.get_tag_id('Tag1')
            ac_service.get_tag_id('Tag2')

            elapsed = time.time() - start_time

            # Should have at least 200ms delay between requests
            assert elapsed >= 0.2

    def test_service_initialization_missing_credentials(self):
        """Test service raises error when credentials are missing."""
        with patch.dict('os.environ', {}, clear=True):
            with pytest.raises(ValueError) as exc_info:
                ActiveCampaignService()

            assert "credentials not configured" in str(exc_info.value)
