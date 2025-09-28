"""Integration tests for get_download_link HTTPS endpoint."""

import pytest
import requests
import json
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta, timezone


@pytest.mark.integration
class TestGetDownloadLinkEndpoint:
    """Test the get_download_link HTTPS endpoint with download limits."""
    
    def setup_method(self):
        """Set up test data before each test."""
        self.url = "http://localhost:5001/test-project/us-central1/get_download_link"
        self.test_email = "test-download@example.com"
        self.ebook_path = "ebooks/bitcoin-red-pill-3rd-edition.pdf"
    
    def _create_test_lead(self, db, email: str, download_count: int = 0, last_download=None):
        """Create a test lead for download testing."""
        lead_data = {
            "name": "Test User",
            "email": email,
            "phone": "+55 11 99999-9999",
            "createdAt": db.server_timestamp,
            "ip": "192.168.1.1",
            "userAgent": "Test Agent",
            "utm": {"firstTouch": {}, "lastTouch": {}},
            "consent": {"lgpdConsent": True, "consentTextVersion": "v1.0"},
            "recaptchaScore": 0.8,
            "download": {
                "firstDownloadedAt": last_download if download_count > 0 else None,
                "lastDownloadedAt": last_download,
                "count24h": download_count
            }
        }
        
        lead_doc_ref = db.collections["leads"].document()
        lead_doc_ref.set(lead_data)
        return lead_doc_ref.id
    
    def _create_test_settings(self, db, ebook_path: str):
        """Create test settings with e-book configuration."""
        settings_data = {
            "hero": {
                "headline": "Test Headline",
                "subheadline": "Test Subheadline",
                "ctaText": "Download Now"
            },
            "ebook": {
                "storagePath": ebook_path,
                "fileName": "bitcoin-red-pill-3rd-edition.pdf",
                "sizeBytes": 1048576
            }
        }
        
        db.collections["settings"].document("config").set(settings_data)
    
    def test_first_download_success(self, firebase_emulator, db):
        """Test successful first download sets firstDownloadedAt."""
        # Setup test data
        lead_id = self._create_test_lead(db, self.test_email)
        self._create_test_settings(db, self.ebook_path)
        
        # Mock signed URL generation
        with patch('src.brokers.https.get_download_link._generate_signed_url') as mock_url:
            mock_url.return_value = "https://storage.googleapis.com/signed-url-mock"
            
            response = requests.post(
                self.url,
                json={"email": self.test_email},
                headers={"Content-Type": "application/json"}
            )
        
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert "downloadUrl" in data
        assert data["downloadUrl"] == "https://storage.googleapis.com/signed-url-mock"
        assert data["expiresIn"] == 600  # 10 minutes in seconds
        assert data["remainingDownloads"] == 2  # 3 - 1 = 2
        
        # Verify database updates
        lead_doc = db.collections["leads"].document(lead_id).get()
        lead_data = lead_doc.to_dict()
        assert lead_data["download"]["count24h"] == 1
        assert lead_data["download"]["firstDownloadedAt"] is not None
        assert lead_data["download"]["lastDownloadedAt"] is not None
    
    def test_multiple_downloads_within_limit(self, firebase_emulator, db):
        """Test multiple downloads within 3/24h limit."""
        # Setup test data - lead with 2 previous downloads
        now = datetime.now(timezone.utc)
        last_download = now - timedelta(hours=2)  # 2 hours ago
        
        lead_id = self._create_test_lead(
            db, 
            self.test_email, 
            download_count=2, 
            last_download=last_download
        )
        self._create_test_settings(db, self.ebook_path)
        
        # Mock signed URL generation
        with patch('src.brokers.https.get_download_link._generate_signed_url') as mock_url:
            mock_url.return_value = "https://storage.googleapis.com/signed-url-mock"
            
            response = requests.post(
                self.url,
                json={"email": self.test_email},
                headers={"Content-Type": "application/json"}
            )
        
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert data["remainingDownloads"] == 0  # This is the 3rd download
        
        # Verify database updates
        lead_doc = db.collections["leads"].document(lead_id).get()
        lead_data = lead_doc.to_dict()
        assert lead_data["download"]["count24h"] == 3
    
    def test_download_limit_exceeded(self, firebase_emulator, db):
        """Test download limit exceeded returns 429."""
        # Setup test data - lead with 3 previous downloads within 24h
        now = datetime.now(timezone.utc)
        last_download = now - timedelta(hours=1)  # 1 hour ago
        
        self._create_test_lead(
            db, 
            self.test_email, 
            download_count=3, 
            last_download=last_download
        )
        self._create_test_settings(db, self.ebook_path)
        
        response = requests.post(
            self.url,
            json={"email": self.test_email},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 429
        data = response.json()
        assert data["code"] == "download_limit_exceeded"
        assert "Download limit reached" in data["error"]
        assert "Try again in" in data["error"]
    
    def test_download_limit_reset_after_24h(self, firebase_emulator, db):
        """Test download limit resets after 24 hours."""
        # Setup test data - lead with 3 downloads from 25 hours ago
        now = datetime.now(timezone.utc)
        old_download = now - timedelta(hours=25)  # 25 hours ago
        
        lead_id = self._create_test_lead(
            db, 
            self.test_email, 
            download_count=3, 
            last_download=old_download
        )
        self._create_test_settings(db, self.ebook_path)
        
        # Mock signed URL generation
        with patch('src.brokers.https.get_download_link._generate_signed_url') as mock_url:
            mock_url.return_value = "https://storage.googleapis.com/signed-url-mock"
            
            response = requests.post(
                self.url,
                json={"email": self.test_email},
                headers={"Content-Type": "application/json"}
            )
        
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] is True
        assert data["remainingDownloads"] == 2  # Reset to 1st download
        
        # Verify count was reset
        lead_doc = db.collections["leads"].document(lead_id).get()
        lead_data = lead_doc.to_dict()
        assert lead_data["download"]["count24h"] == 1  # Reset and incremented
    
    def test_lead_not_found(self, firebase_emulator, db):
        """Test error when lead email is not found."""
        self._create_test_settings(db, self.ebook_path)
        
        response = requests.post(
            self.url,
            json={"email": "nonexistent@example.com"},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 404
        data = response.json()
        assert data["code"] == "lead_not_found"
    
    def test_missing_email(self, firebase_emulator, db):
        """Test error when email is missing."""
        response = requests.post(
            self.url,
            json={},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 400
        data = response.json()
        assert data["code"] == "missing_email"
    
    def test_ebook_not_configured(self, firebase_emulator, db):
        """Test error when e-book storage path is not configured."""
        self._create_test_lead(db, self.test_email)
        # Don't create settings - should fail
        
        response = requests.post(
            self.url,
            json={"email": self.test_email},
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 500
        data = response.json()
        assert data["code"] == "storage_not_configured"
    
    def test_signed_url_generation_failure(self, firebase_emulator, db):
        """Test error when signed URL generation fails."""
        self._create_test_lead(db, self.test_email)
        self._create_test_settings(db, self.ebook_path)
        
        # Mock signed URL generation to fail
        with patch('src.brokers.https.get_download_link._generate_signed_url') as mock_url:
            mock_url.side_effect = Exception("File not found")
            
            response = requests.post(
                self.url,
                json={"email": self.test_email},
                headers={"Content-Type": "application/json"}
            )
        
        assert response.status_code == 500
        data = response.json()
        assert data["code"] == "url_generation_failed"
    
    def test_cors_preflight(self, firebase_emulator):
        """Test CORS preflight request handling."""
        response = requests.options(self.url)
        
        assert response.status_code == 204
        assert "Access-Control-Allow-Origin" in response.headers
        assert "POST" in response.headers["Access-Control-Allow-Methods"]
    
    def test_invalid_method(self, firebase_emulator):
        """Test invalid HTTP method."""
        response = requests.get(self.url)
        
        assert response.status_code == 405
        data = response.json()
        assert data["code"] == "method_not_allowed"
    
    def test_invalid_json(self, firebase_emulator):
        """Test invalid JSON payload."""
        response = requests.post(
            self.url,
            data="invalid json",
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 400
        data = response.json()
        assert data["code"] == "invalid_json"
    
    def test_download_limits_edge_cases(self, firebase_emulator, db):
        """Test edge cases in download limit checking."""
        from src.brokers.https.get_download_link import _check_download_limits
        from datetime import datetime, timezone, timedelta
        
        now = datetime.now(timezone.utc)
        
        # Case 1: No previous downloads
        lead_data = {"download": {"count24h": 0}}
        can_download, message = _check_download_limits(lead_data)
        assert can_download is True
        assert message == ""
        
        # Case 2: Exactly at limit, but more than 24h ago
        old_time = now - timedelta(hours=24, minutes=1)
        lead_data = {
            "download": {
                "count24h": 3,
                "lastDownloadedAt": old_time
            }
        }
        can_download, message = _check_download_limits(lead_data)
        assert can_download is True
        
        # Case 3: At limit, within 24h
        recent_time = now - timedelta(hours=1)
        lead_data = {
            "download": {
                "count24h": 3,
                "lastDownloadedAt": recent_time
            }
        }
        can_download, message = _check_download_limits(lead_data)
        assert can_download is False
        assert "Download limit reached" in message
        assert "23" in message  # Should show ~23 hours remaining
    
    def test_ebook_storage_path_retrieval(self, firebase_emulator, db):
        """Test e-book storage path retrieval function."""
        from src.brokers.https.get_download_link import _get_ebook_storage_path
        
        # Case 1: Settings not configured
        path = _get_ebook_storage_path(db)
        assert path is None
        
        # Case 2: Settings configured properly
        self._create_test_settings(db, self.ebook_path)
        path = _get_ebook_storage_path(db)
        assert path == self.ebook_path
        
        # Case 3: Settings exist but ebook not configured
        db.collections["settings"].document("config").update({
            "ebook": {}
        })
        path = _get_ebook_storage_path(db)
        assert path is None
    
    def test_update_download_counters(self, firebase_emulator, db):
        """Test download counter update logic."""
        from src.brokers.https.get_download_link import _update_download_counters
        
        # Create test lead
        lead_id = self._create_test_lead(db, self.test_email)
        
        # Get initial lead data
        lead_doc = db.collections["leads"].document(lead_id).get()
        initial_data = lead_doc.to_dict()
        
        # Update counters
        _update_download_counters(db, lead_id, initial_data)
        
        # Verify updates
        updated_doc = db.collections["leads"].document(lead_id).get()
        updated_data = updated_doc.to_dict()
        
        assert updated_data["download"]["count24h"] == 1
        assert updated_data["download"]["firstDownloadedAt"] is not None
        assert updated_data["download"]["lastDownloadedAt"] is not None
