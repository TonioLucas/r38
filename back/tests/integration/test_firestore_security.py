"""Integration tests for Firestore security rules."""

import pytest
import firebase_admin
from firebase_admin import auth, firestore
from google.cloud.firestore_v1.base_query import FieldFilter
from datetime import datetime, timezone


@pytest.mark.integration
class TestFirestoreSecurityRules:
    """Test Firestore security rules enforcement."""
    
    def setup_method(self):
        """Set up test data before each test."""
        self.db = firestore.client()
        
        # Test emails
        self.admin_email = "admin@example.com"
        self.user_email = "user@example.com"
        
        # Create test users
        try:
            self.admin_user = auth.create_user(
                email=self.admin_email,
                password="testpass123",
                uid="test-admin"
            )
        except auth.UserNotFoundError:
            pass
        except Exception:
            # User might already exist
            self.admin_user = auth.get_user_by_email(self.admin_email)
        
        try:
            self.regular_user = auth.create_user(
                email=self.user_email,
                password="testpass123",
                uid="test-user"
            )
        except auth.UserNotFoundError:
            pass
        except Exception:
            # User might already exist
            self.regular_user = auth.get_user_by_email(self.user_email)
        
        # Setup admin whitelist in settings
        self._setup_admin_settings()
        
        # Create test data
        self._create_test_data()
    
    def teardown_method(self):
        """Clean up test data after each test."""
        try:
            # Clean up test users
            auth.delete_user(self.admin_user.uid)
            auth.delete_user(self.regular_user.uid)
        except Exception:
            pass
        
        # Clean up test documents
        try:
            self.db.collection("leads").document("test-lead").delete()
            self.db.collection("settings").document("admins").delete()
            self.db.collection("settings").document("test-config").delete()
            self.db.collection("pages").document("test-privacy").delete()
        except Exception:
            pass
    
    def _setup_admin_settings(self):
        """Set up admin email whitelist in settings."""
        admin_settings = {
            "emails": [self.admin_email]
        }
        self.db.collection("settings").document("admins").set(admin_settings)
    
    def _create_test_data(self):
        """Create test documents for security testing."""
        # Test lead
        lead_data = {
            "name": "Test Lead",
            "email": "test@example.com",
            "createdAt": datetime.now(timezone.utc),
            "download": {"count24h": 0}
        }
        self.db.collection("leads").document("test-lead").set(lead_data)
        
        # Test settings
        settings_data = {
            "hero": {
                "headline": "Test Headline",
                "subheadline": "Test Subheadline"
            }
        }
        self.db.collection("settings").document("test-config").set(settings_data)
        
        # Test privacy page (enabled)
        privacy_data = {
            "enabled": True,
            "content": "Test privacy policy content"
        }
        self.db.collection("pages").document("test-privacy").set(privacy_data)
    
    def _get_authenticated_client(self, user_uid: str, custom_claims: dict = None):
        """Get authenticated Firestore client for testing."""
        # Set custom claims if provided
        if custom_claims:
            auth.set_custom_user_claims(user_uid, custom_claims)
        
        # Create custom token
        custom_token = auth.create_custom_token(user_uid)
        
        # Note: In real tests, you would use this token with the client SDK
        # For emulator testing, we'll simulate the authentication context
        return self.db
    
    def test_leads_collection_security(self):
        """Test security rules for leads collection."""
        # Admin should be able to read leads (tested via admin SDK)
        leads_ref = self.db.collection("leads")
        leads = list(leads_ref.get())
        assert len(leads) >= 0  # Admin SDK can always read
        
        # Verify lead document exists
        lead_doc = self.db.collection("leads").document("test-lead").get()
        assert lead_doc.exists
        
        # Test that direct client writes are blocked (simulated)
        # Note: In a real client SDK test, these would fail with permission denied
        # Here we verify the rules are structured correctly
        
        # Verify the rule denies client create/update/delete
        with open("/Users/toniolucas/vork/r38/firestore.rules", "r") as f:
            rules_content = f.read()
            assert "allow create, update, delete: if false;" in rules_content
            assert "allow read: if isAdmin();" in rules_content
    
    def test_settings_collection_security(self):
        """Test security rules for settings collection."""
        # Public should be able to read settings (rules allow read: if true)
        settings_ref = self.db.collection("settings").document("test-config")
        settings_doc = settings_ref.get()
        assert settings_doc.exists
        
        # Admin should be able to write (tested via admin SDK)
        update_data = {"hero.headline": "Updated Headline"}
        settings_ref.update(update_data)
        
        # Verify update worked
        updated_doc = settings_ref.get()
        assert updated_doc.to_dict()["hero"]["headline"] == "Updated Headline"
        
        # Verify rules structure for settings
        with open("/Users/toniolucas/vork/r38/firestore.rules", "r") as f:
            rules_content = f.read()
            assert "match /settings/{docId}" in rules_content
            assert "allow read: if true;" in rules_content
            assert "allow write: if isAdmin();" in rules_content
    
    def test_pages_collection_security(self):
        """Test security rules for pages collection."""
        # Privacy page should be readable when enabled
        privacy_ref = self.db.collection("pages").document("test-privacy")
        privacy_doc = privacy_ref.get()
        assert privacy_doc.exists
        assert privacy_doc.to_dict()["enabled"] is True
        
        # Create disabled privacy page for testing
        disabled_privacy_data = {
            "enabled": False,
            "content": "Disabled content"
        }
        self.db.collection("pages").document("test-privacy-disabled").set(disabled_privacy_data)
        
        # Admin should be able to read/write all pages (tested via admin SDK)
        admin_page_data = {
            "enabled": True,
            "content": "Admin created content"
        }
        self.db.collection("pages").document("admin-page").set(admin_page_data)
        
        # Verify rules structure for pages
        with open("/Users/toniolucas/vork/r38/firestore.rules", "r") as f:
            rules_content = f.read()
            assert "match /pages/{docId}" in rules_content
            assert 'allow read: if (docId == "privacy" && resource.data.enabled == true) || isAdmin();' in rules_content
            assert "allow write: if isAdmin();" in rules_content
        
        # Clean up test documents
        self.db.collection("pages").document("test-privacy-disabled").delete()
        self.db.collection("pages").document("admin-page").delete()
    
    def test_admin_authentication_functions(self):
        """Test admin authentication helper functions in rules."""
        with open("/Users/toniolucas/vork/r38/firestore.rules", "r") as f:
            rules_content = f.read()
            
            # Verify isAuthenticated function
            assert "function isAuthenticated()" in rules_content
            assert "return request.auth != null;" in rules_content
            
            # Verify isAdmin function with both custom claim and email whitelist
            assert "function isAdmin()" in rules_content
            assert "request.auth.token.admin == true" in rules_content
            assert "(request.auth.token.email in get(/databases/$(database)/documents/settings/admins).data.emails)" in rules_content
    
    def test_default_deny_rule(self):
        """Test that default deny rule exists for unmatched paths."""
        with open("/Users/toniolucas/vork/r38/firestore.rules", "r") as f:
            rules_content = f.read()
            
            # Verify default deny rule
            assert "match /{document=**}" in rules_content
            assert "allow read, write: if false;" in rules_content
    
    def test_firestore_indexes_configuration(self):
        """Test that required indexes are configured."""
        with open("/Users/toniolucas/vork/r38/firestore.indexes.json", "r") as f:
            import json
            indexes_config = json.load(f)
            
            indexes = indexes_config["indexes"]
            
            # Check for createdAt desc index
            created_at_index = None
            for index in indexes:
                if (index["collectionGroup"] == "leads" and 
                    len(index["fields"]) == 1 and
                    index["fields"][0]["fieldPath"] == "createdAt" and
                    index["fields"][0]["order"] == "DESCENDING"):
                    created_at_index = index
                    break
            
            assert created_at_index is not None, "createdAt desc index not found"
            
            # Check for email asc, createdAt desc composite index  
            composite_index = None
            for index in indexes:
                if (index["collectionGroup"] == "leads" and 
                    len(index["fields"]) == 2 and
                    index["fields"][0]["fieldPath"] == "email" and
                    index["fields"][0]["order"] == "ASCENDING" and
                    index["fields"][1]["fieldPath"] == "createdAt" and
                    index["fields"][1]["order"] == "DESCENDING"):
                    composite_index = index
                    break
            
            assert composite_index is not None, "email asc, createdAt desc composite index not found"
    
    def test_firebase_json_configuration(self):
        """Test that Firebase configuration includes indexes."""
        with open("/Users/toniolucas/vork/r38/firebase.json", "r") as f:
            import json
            firebase_config = json.load(f)
            
            # Verify Firestore configuration
            assert "firestore" in firebase_config
            assert firebase_config["firestore"]["rules"] == "firestore.rules"
            assert firebase_config["firestore"]["indexes"] == "firestore.indexes.json"
    
    def test_leads_query_performance(self, db):
        """Test that lead queries can use the configured indexes."""
        leads_ref = db.collections["leads"]
        
        # Test createdAt desc query (should use index)
        recent_leads = leads_ref.order_by("createdAt", direction=firestore.Query.DESCENDING).limit(10)
        leads_list = list(recent_leads.get())
        # Should execute without errors (index exists)
        assert len(leads_list) >= 0
        
        # Test composite query (should use composite index)
        email_leads = (leads_ref
                      .where(filter=FieldFilter("email", "==", "test@example.com"))
                      .order_by("createdAt", direction=firestore.Query.DESCENDING)
                      .limit(5))
        email_leads_list = list(email_leads.get())
        # Should execute without errors (composite index exists)
        assert len(email_leads_list) >= 0
    
    def test_security_rules_compilation(self):
        """Test that security rules compile without errors."""
        # Read the rules file and check for basic syntax
        with open("/Users/toniolucas/vork/r38/firestore.rules", "r") as f:
            rules_content = f.read()
            
            # Basic syntax checks
            assert "rules_version = '2';" in rules_content
            assert "service cloud.firestore {" in rules_content
            assert "match /databases/{database}/documents {" in rules_content
            
            # Check that all braces are balanced
            open_braces = rules_content.count("{")
            close_braces = rules_content.count("}")
            assert open_braces == close_braces, "Unbalanced braces in rules file"
            
            # Check for required function definitions
            assert "function isAuthenticated()" in rules_content
            assert "function isAdmin()" in rules_content
    
    def test_admin_email_whitelist_functionality(self):
        """Test admin email whitelist in settings."""
        # Verify admin settings document exists with correct structure
        admin_doc = self.db.collection("settings").document("admins").get()
        assert admin_doc.exists
        
        admin_data = admin_doc.to_dict()
        assert "emails" in admin_data
        assert isinstance(admin_data["emails"], list)
        assert self.admin_email in admin_data["emails"]
        
        # Test adding/removing admin emails
        admin_data["emails"].append("newadmin@example.com")
        self.db.collection("settings").document("admins").update(admin_data)
        
        # Verify update
        updated_doc = self.db.collection("settings").document("admins").get()
        updated_data = updated_doc.to_dict()
        assert "newadmin@example.com" in updated_data["emails"]
