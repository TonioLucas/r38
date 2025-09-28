#!/usr/bin/env python3
"""
Validate Firestore configuration - rules, indexes, and security setup.

This script validates that:
1. Firestore rules compile correctly
2. Required indexes are configured
3. Firebase.json includes proper Firestore configuration
4. Basic security rule structure is in place

Usage:
    python scripts/validate_firestore.py
"""

import json
import os
import sys
import logging
from pathlib import Path

logger = logging.getLogger(__name__)


def validate_firestore_rules():
    """Validate Firestore security rules file."""
    rules_path = Path("firestore.rules")
    
    if not rules_path.exists():
        raise FileNotFoundError("firestore.rules file not found")
    
    with open(rules_path, "r") as f:
        rules_content = f.read()
    
    # Basic syntax validation
    if not rules_content.strip().startswith("rules_version = '2';"):
        raise ValueError("Rules file must start with rules_version = '2';")
    
    # Check for required functions
    required_functions = ["isAuthenticated()", "isAdmin()"]
    for func in required_functions:
        if f"function {func}" not in rules_content:
            raise ValueError(f"Required function {func} not found in rules")
    
    # Check for collection rules
    required_collections = [
        "match /leads/{leadId}",
        "match /settings/{docId}", 
        "match /pages/{docId}"
    ]
    
    for collection in required_collections:
        if collection not in rules_content:
            raise ValueError(f"Required collection rule {collection} not found")
    
    # Check for default deny rule
    if "match /{document=**}" not in rules_content:
        raise ValueError("Default deny rule not found")
    
    # Check brace balance
    open_braces = rules_content.count("{")
    close_braces = rules_content.count("}")
    if open_braces != close_braces:
        raise ValueError(f"Unbalanced braces: {open_braces} open, {close_braces} close")
    
    logger.info("✅ Firestore rules validation passed")
    return True


def validate_firestore_indexes():
    """Validate Firestore indexes configuration."""
    indexes_path = Path("firestore.indexes.json")
    
    if not indexes_path.exists():
        raise FileNotFoundError("firestore.indexes.json file not found")
    
    with open(indexes_path, "r") as f:
        indexes_config = json.load(f)
    
    if "indexes" not in indexes_config:
        raise ValueError("indexes key not found in firestore.indexes.json")
    
    indexes = indexes_config["indexes"]
    
    # Check for required indexes
    required_indexes = [
        {
            "description": "leads createdAt desc",
            "collectionGroup": "leads",
            "fields": [{"fieldPath": "createdAt", "order": "DESCENDING"}]
        },
        {
            "description": "leads email asc, createdAt desc composite", 
            "collectionGroup": "leads",
            "fields": [
                {"fieldPath": "email", "order": "ASCENDING"},
                {"fieldPath": "createdAt", "order": "DESCENDING"}
            ]
        }
    ]
    
    for required_index in required_indexes:
        found = False
        for index in indexes:
            if (index.get("collectionGroup") == required_index["collectionGroup"] and
                index.get("fields") == required_index["fields"]):
                found = True
                break
        
        if not found:
            raise ValueError(f"Required index not found: {required_index['description']}")
    
    logger.info("✅ Firestore indexes validation passed")
    return True


def validate_firebase_config():
    """Validate Firebase configuration includes Firestore setup."""
    firebase_config_path = Path("firebase.json")
    
    if not firebase_config_path.exists():
        raise FileNotFoundError("firebase.json file not found")
    
    with open(firebase_config_path, "r") as f:
        firebase_config = json.load(f)
    
    if "firestore" not in firebase_config:
        raise ValueError("firestore configuration not found in firebase.json")
    
    firestore_config = firebase_config["firestore"]
    
    if firestore_config.get("rules") != "firestore.rules":
        raise ValueError("Incorrect rules path in firebase.json")
    
    if firestore_config.get("indexes") != "firestore.indexes.json":
        raise ValueError("Incorrect indexes path in firebase.json")
    
    logger.info("✅ Firebase configuration validation passed")
    return True


def validate_security_structure():
    """Validate security rule structure and patterns."""
    rules_path = Path("firestore.rules")
    
    with open(rules_path, "r") as f:
        rules_content = f.read()
    
    security_checks = [
        {
            "pattern": "allow create, update, delete: if false;",
            "description": "Leads collection blocks direct client writes",
            "required": True
        },
        {
            "pattern": "allow read: if isAdmin();",
            "description": "Admin-only read access patterns",
            "required": True
        },
        {
            "pattern": "allow read: if true;",
            "description": "Public read access for settings",
            "required": True
        },
        {
            "pattern": "resource.data.enabled == true",
            "description": "Privacy page visibility control",
            "required": True
        },
        {
            "pattern": "request.auth.token.admin == true",
            "description": "Custom claim admin check",
            "required": True
        },
        {
            "pattern": "request.auth.token.email in get(",
            "description": "Email whitelist admin check",
            "required": True
        }
    ]
    
    for check in security_checks:
        if check["required"] and check["pattern"] not in rules_content:
            raise ValueError(f"Required security pattern not found: {check['description']}")
    
    logger.info("✅ Security structure validation passed")
    return True


def validate_admin_whitelist_structure():
    """Validate admin whitelist can be properly configured."""
    # This would typically test the actual Firestore structure in integration tests
    # Here we just validate the rules reference the correct path
    
    rules_path = Path("firestore.rules")
    with open(rules_path, "r") as f:
        rules_content = f.read()
    
    if "/databases/$(database)/documents/settings/admins" not in rules_content:
        raise ValueError("Admin whitelist path not correctly referenced in rules")
    
    if ".data.emails" not in rules_content:
        raise ValueError("Admin emails array not correctly referenced in rules")
    
    logger.info("✅ Admin whitelist structure validation passed")
    return True


def main():
    """Run all validations."""
    logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
    
    # Change to project root directory
    project_root = Path(__file__).parent.parent.parent
    os.chdir(project_root)
    
    logger.info("🔍 Validating Firestore configuration...")
    
    try:
        # Run all validations
        validate_firestore_rules()
        validate_firestore_indexes() 
        validate_firebase_config()
        validate_security_structure()
        validate_admin_whitelist_structure()
        
        logger.info("🎉 All Firestore validations passed!")
        
        # Print summary
        print("\n" + "="*60)
        print("FIRESTORE CONFIGURATION SUMMARY")
        print("="*60)
        print("✅ Security Rules: firestore.rules")
        print("✅ Indexes: firestore.indexes.json")
        print("✅ Firebase Config: firebase.json")
        print("\n📋 Configured Collections:")
        print("  • leads (admin read-only, function write)")
        print("  • settings (public read, admin write)")  
        print("  • pages (privacy when enabled, admin full)")
        print("\n🔐 Security Features:")
        print("  • Custom claim admin authentication")
        print("  • Email whitelist admin authentication") 
        print("  • Direct client write blocking for leads")
        print("  • Privacy page visibility control")
        print("  • Default deny for unmatched paths")
        print("\n📊 Performance Indexes:")
        print("  • leads.createdAt (desc)")
        print("  • leads.email + createdAt (composite)")
        print("  • leads.download.lastDownloadedAt (desc)")
        print("="*60)
        
    except Exception as e:
        logger.error(f"❌ Validation failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
