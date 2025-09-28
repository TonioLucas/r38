"""Integration tests for create_lead HTTPS endpoint."""

import pytest
import requests
import json
from unittest.mock import patch, MagicMock
from datetime import datetime


@pytest.mark.integration
class TestCreateLeadEndpoint:
    """Test the create_lead HTTPS endpoint."""
    
    def test_create_lead_success(self, firebase_emulator, db):
        """Test successful lead creation with valid data."""
        url = f"http://localhost:5001/test-project/us-central1/create_lead"
        
        # Mock reCAPTCHA verification to return high score
        with patch('src.brokers.https.create_lead._verify_recaptcha') as mock_recaptcha:
            mock_recaptcha.return_value = 0.8
            
            response = requests.post(
                url,
                json={
                    "name": "João Silva",
                    "email": "joao@example.com",
                    "phone": "+55 11 99999-9999",
                    "recaptchaToken": "mock-token",
                    "utm_source": "google",
                    "utm_medium": "cpc",
                    "utm_campaign": "bitcoin-book",
                    "referrer": "https://google.com",
                    "consent": {
                        "lgpdConsent": True
                    }
                },
                headers={"Content-Type": "application/json"}
            )
        
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert "leadId" in data
        
        # Verify lead was stored in database
        lead_id = data["leadId"]
        lead_doc = db.collections["leads"].document(lead_id).get()
        assert lead_doc.exists
        
        lead_data = lead_doc.to_dict()
        assert lead_data["name"] == "João Silva"
        assert lead_data["email"] == "joao@example.com"
        assert lead_data["phone"] == "+55 11 99999-9999"
        assert lead_data["utm"]["firstTouch"]["source"] == "google"
        assert lead_data["utm"]["firstTouch"]["medium"] == "cpc"
        assert lead_data["utm"]["firstTouch"]["campaign"] == "bitcoin-book"
        assert lead_data["consent"]["lgpdConsent"] is True
        assert lead_data["recaptchaScore"] == 0.8
        assert lead_data["download"]["count24h"] == 0
    
    def test_create_lead_missing_required_fields(self, firebase_emulator):
        """Test lead creation with missing required fields."""
        url = f"http://localhost:5001/test-project/us-central1/create_lead"
        
        response = requests.post(
            url,
            json={
                "name": "João Silva",
                # Missing email and recaptchaToken
            },
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "error" in data
        assert data["code"] == "missing_fields"
        assert "email" in data["error"]
        assert "recaptchaToken" in data["error"]
    
    def test_create_lead_invalid_email(self, firebase_emulator):
        """Test lead creation with invalid email format."""
        url = f"http://localhost:5001/test-project/us-central1/create_lead"
        
        with patch('src.brokers.https.create_lead._verify_recaptcha') as mock_recaptcha:
            mock_recaptcha.return_value = 0.8
            
            response = requests.post(
                url,
                json={
                    "name": "João Silva",
                    "email": "invalid-email",
                    "recaptchaToken": "mock-token"
                },
                headers={"Content-Type": "application/json"}
            )
        
        assert response.status_code == 400
        data = response.json()
        assert data["code"] == "invalid_email"
    
    def test_create_lead_low_recaptcha_score(self, firebase_emulator):
        """Test lead creation with low reCAPTCHA score."""
        url = f"http://localhost:5001/test-project/us-central1/create_lead"
        
        # Mock reCAPTCHA verification to return low score
        with patch('src.brokers.https.create_lead._verify_recaptcha') as mock_recaptcha:
            mock_recaptcha.return_value = 0.1  # Below threshold of 0.3
            
            response = requests.post(
                url,
                json={
                    "name": "João Silva",
                    "email": "joao@example.com",
                    "recaptchaToken": "mock-token"
                },
                headers={"Content-Type": "application/json"}
            )
        
        assert response.status_code == 400
        data = response.json()
        assert data["code"] == "recaptcha_failed"
        assert "Security verification failed" in data["error"]
    
    def test_create_lead_update_existing_lead(self, firebase_emulator, db):
        """Test updating an existing lead with same email."""
        url = f"http://localhost:5001/test-project/us-central1/create_lead"
        
        with patch('src.brokers.https.create_lead._verify_recaptcha') as mock_recaptcha:
            mock_recaptcha.return_value = 0.8
            
            # Create first lead
            response1 = requests.post(
                url,
                json={
                    "name": "João Silva",
                    "email": "joao@example.com",
                    "recaptchaToken": "mock-token",
                    "utm_source": "facebook"
                },
                headers={"Content-Type": "application/json"}
            )
            
            assert response1.status_code == 200
            lead_id_1 = response1.json()["leadId"]
            
            # Create second lead with same email
            response2 = requests.post(
                url,
                json={
                    "name": "João Silva Updated",
                    "email": "joao@example.com",
                    "recaptchaToken": "mock-token",
                    "utm_source": "google"
                },
                headers={"Content-Type": "application/json"}
            )
            
            assert response2.status_code == 200
            lead_id_2 = response2.json()["leadId"]
            
            # Should update the existing lead, not create new one
            assert lead_id_1 == lead_id_2
            
            # Verify updated data
            lead_doc = db.collections["leads"].document(lead_id_1).get()
            lead_data = lead_doc.to_dict()
            assert lead_data["name"] == "João Silva Updated"
            assert lead_data["utm"]["lastTouch"]["source"] == "google"
    
    def test_create_lead_cors_preflight(self, firebase_emulator):
        """Test CORS preflight request handling."""
        url = f"http://localhost:5001/test-project/us-central1/create_lead"
        
        response = requests.options(url)
        
        assert response.status_code == 204
        assert "Access-Control-Allow-Origin" in response.headers
        assert "Access-Control-Allow-Methods" in response.headers
        assert "POST" in response.headers["Access-Control-Allow-Methods"]
    
    def test_create_lead_invalid_method(self, firebase_emulator):
        """Test invalid HTTP method."""
        url = f"http://localhost:5001/test-project/us-central1/create_lead"
        
        response = requests.get(url)
        
        assert response.status_code == 405
        data = response.json()
        assert data["code"] == "method_not_allowed"
    
    def test_create_lead_invalid_json(self, firebase_emulator):
        """Test invalid JSON payload."""
        url = f"http://localhost:5001/test-project/us-central1/create_lead"
        
        response = requests.post(
            url,
            data="invalid json",
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 400
        data = response.json()
        assert data["code"] == "invalid_json"
    
    def test_verify_recaptcha_function(self):
        """Test reCAPTCHA verification function."""
        from src.brokers.https.create_lead import _verify_recaptcha
        
        # Mock successful reCAPTCHA response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "success": True,
            "score": 0.9,
            "action": "submit"
        }
        
        with patch('src.brokers.https.create_lead.os.environ.get') as mock_env, \
             patch('src.brokers.https.create_lead.requests.post') as mock_post:
            
            mock_env.return_value = "test-secret-key"
            mock_post.return_value = mock_response
            
            score = _verify_recaptcha("test-token", "192.168.1.1")
            
            assert score == 0.9
            mock_post.assert_called_once()
            
            # Verify the request payload
            call_args = mock_post.call_args
            assert call_args[0][0] == "https://www.google.com/recaptcha/api/siteverify"
            assert call_args[1]["data"]["secret"] == "test-secret-key"
            assert call_args[1]["data"]["response"] == "test-token"
            assert call_args[1]["data"]["remoteip"] == "192.168.1.1"
    
    def test_verify_recaptcha_failure(self):
        """Test reCAPTCHA verification failure."""
        from src.brokers.https.create_lead import _verify_recaptcha
        
        # Mock failed reCAPTCHA response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "success": False,
            "error-codes": ["invalid-input-response"]
        }
        
        with patch('src.brokers.https.create_lead.os.environ.get') as mock_env, \
             patch('src.brokers.https.create_lead.requests.post') as mock_post:
            
            mock_env.return_value = "test-secret-key"
            mock_post.return_value = mock_response
            
            with pytest.raises(Exception, match="reCAPTCHA verification failed"):
                _verify_recaptcha("invalid-token", "192.168.1.1")
    
    def test_extract_utm_data(self):
        """Test UTM data extraction function."""
        from src.brokers.https.create_lead import _extract_utm_data
        
        request_data = {
            "utm_source": "google",
            "utm_medium": "cpc",
            "utm_campaign": "bitcoin-book",
            "utm_term": "bitcoin",
            "utm_content": "headline1",
            "referrer": "https://google.com",
            "gclid": "abc123",
            "fbclid": "def456"
        }
        
        utm_data = _extract_utm_data(request_data)
        
        assert "firstTouch" in utm_data
        assert "lastTouch" in utm_data
        assert utm_data["firstTouch"]["source"] == "google"
        assert utm_data["firstTouch"]["medium"] == "cpc"
        assert utm_data["firstTouch"]["campaign"] == "bitcoin-book"
        assert utm_data["firstTouch"]["term"] == "bitcoin"
        assert utm_data["firstTouch"]["content"] == "headline1"
        assert utm_data["firstTouch"]["referrer"] == "https://google.com"
        assert utm_data["firstTouch"]["gclid"] == "abc123"
        assert utm_data["firstTouch"]["fbclid"] == "def456"
        assert "timestamp" in utm_data["firstTouch"]
        
        # For new leads, first and last touch should be the same
        assert utm_data["firstTouch"] == utm_data["lastTouch"]
    
    def test_get_client_ip(self):
        """Test client IP extraction function."""
        from src.brokers.https.create_lead import _get_client_ip
        
        # Mock request object
        mock_request = MagicMock()
        mock_request.headers = {
            "CF-Connecting-IP": "192.168.1.1",
            "X-Forwarded-For": "10.0.0.1, 192.168.1.1",
            "User-Agent": "Test Agent"
        }
        
        ip = _get_client_ip(mock_request)
        assert ip == "192.168.1.1"
        
        # Test X-Forwarded-For header (should take first IP)
        mock_request.headers = {"X-Forwarded-For": "10.0.0.1, 192.168.1.1"}
        ip = _get_client_ip(mock_request)
        assert ip == "10.0.0.1"
