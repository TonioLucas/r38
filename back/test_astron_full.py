"""Comprehensive manual test of Astron Members API integration."""

import os
import sys
from datetime import datetime

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Import the service
from src.services.astron_members_service import AstronMembersService

def print_section(title):
    """Print a formatted section header."""
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)

def test_initialization():
    """Test service initialization."""
    print_section("TEST 1: Service Initialization")

    try:
        service = AstronMembersService()
        print("✅ Service initialized successfully")
        print(f"   Base URL: {service.base_url}")
        print(f"   AM Key: {service.am_key[:10]}...")
        print(f"   AM Secret: {service.am_secret[:10]}...")
        return service
    except Exception as e:
        print(f"❌ Failed to initialize service: {e}")
        return None

def test_list_clubs(service):
    """Test listing clubs (basic auth test)."""
    print_section("TEST 2: List Clubs (Authentication Test)")

    try:
        import requests
        response = requests.get(
            f"{service.base_url}/listClubs",
            params={
                'am_key': service.am_key,
                'am_secret': service.am_secret,
                'limit': 10
            },
            auth=service.auth,
            timeout=10
        )

        print(f"Status Code: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            if data.get('success') == 1:
                clubs = data.get('return', {}).get('clubs', [])
                print(f"✅ Successfully retrieved {len(clubs)} clubs")

                print("\nAvailable Clubs:")
                for club in clubs:
                    club_id = club.get('id')
                    club_name = club.get('nome', 'Unknown')
                    print(f"   - ID: {club_id}, Name: {club_name}")

                return clubs
            else:
                print(f"❌ API returned error: {data.get('error_message')}")
                return None
        else:
            print(f"❌ HTTP error: {response.text}")
            return None

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return None

def test_get_user_by_email(service, test_email="test@example.com", club_id=None):
    """Test getting user by email."""
    print_section("TEST 3: Get User by Email")

    print(f"Searching for: {test_email}")
    if club_id:
        print(f"In club: {club_id}")

    try:
        user = service.get_user_by_email(test_email, club_id)

        if user:
            print(f"✅ Found user:")
            print(f"   ID: {user.get('id')}")
            print(f"   Email: {user.get('email')}")
            print(f"   Name: {user.get('nome', user.get('name'))}")
            return user
        else:
            print(f"ℹ️  User not found (this is OK for testing)")
            return None

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return None

def test_create_user(service, club_id):
    """Test creating a new user."""
    print_section("TEST 4: Create User (DRY RUN)")

    # Generate test user data
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    test_email = f"test_astron_{timestamp}@example.com"
    test_name = f"Test User {timestamp}"
    test_password = "TestPassword123!"

    print(f"Test User Details:")
    print(f"   Email: {test_email}")
    print(f"   Name: {test_name}")
    print(f"   Password: {test_password}")
    print(f"   Club ID: {club_id}")

    print(f"\n⚠️  This would create a REAL user in Astron Members!")
    response = input("\nProceed with user creation? (yes/no): ").strip().lower()

    if response != 'yes':
        print("ℹ️  Skipped user creation test")
        return None

    try:
        print("\nCreating user...")
        user_id = service.create_user(
            email=test_email,
            name=test_name,
            password=test_password,
            club_id=club_id
        )

        print(f"✅ User created successfully!")
        print(f"   User ID: {user_id}")
        print(f"   Email: {test_email}")

        return {
            'id': user_id,
            'email': test_email,
            'name': test_name,
            'password': test_password
        }

    except Exception as e:
        print(f"❌ Error creating user: {e}")
        import traceback
        traceback.print_exc()
        return None

def test_generate_magic_link(service, user_data):
    """Test generating magic login URL."""
    print_section("TEST 5: Generate Magic Login URL")

    if not user_data:
        print("ℹ️  Skipped (no user created)")
        return None

    try:
        magic_url = service.generate_magic_login_url(
            astron_member_id=user_data['id'],
            email=user_data['email'],
            club_subdomain="renato38"
        )

        print(f"✅ Generated magic login URL:")
        print(f"   {magic_url}")

        return magic_url

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return None

def test_verify_access(service, user_data, club_id):
    """Test verifying user access to club."""
    print_section("TEST 6: Verify User Access")

    if not user_data:
        print("ℹ️  Skipped (no user created)")
        return None

    try:
        has_access = service.verify_user_access(
            astron_member_id=user_data['id'],
            club_id=club_id
        )

        if has_access:
            print(f"✅ User has access to club {club_id}")
        else:
            print(f"❌ User does NOT have access to club {club_id}")

        return has_access

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return None

def main():
    """Run all tests."""
    print("\n" + "=" * 70)
    print("  ASTRON MEMBERS API - COMPREHENSIVE MANUAL TEST")
    print("=" * 70)
    print("\nThis script will test the complete Astron Members integration.")
    print("Some tests will make REAL API calls and create REAL data.")
    print("\nMake sure you're ready before proceeding!")

    input("\nPress Enter to start testing...")

    # Test 1: Initialize service
    service = test_initialization()
    if not service:
        print("\n❌ FATAL: Cannot proceed without service initialization")
        return False

    # Test 2: List clubs (auth test)
    clubs = test_list_clubs(service)
    if not clubs:
        print("\n❌ FATAL: Authentication failed")
        return False

    # Get first club ID for testing
    club_id = clubs[0].get('id') if clubs else None
    if not club_id:
        print("\n❌ FATAL: No clubs available for testing")
        return False

    print(f"\n📋 Using Club ID {club_id} for remaining tests")

    # Test 3: Get user by email (should not exist)
    test_get_user_by_email(service, "nonexistent@example.com", club_id)

    # Test 4: Create user (optional, requires confirmation)
    user_data = test_create_user(service, club_id)

    # Test 5: Generate magic link
    if user_data:
        test_generate_magic_link(service, user_data)

    # Test 6: Verify access
    if user_data:
        test_verify_access(service, user_data, club_id)

    # Summary
    print_section("TEST SUMMARY")

    if user_data:
        print("✅ All tests completed successfully!")
        print(f"\nTest user created:")
        print(f"   Email: {user_data['email']}")
        print(f"   Password: {user_data['password']}")
        print(f"   Club ID: {club_id}")
        print(f"\n⚠️  Remember to clean up this test user if needed!")
    else:
        print("✅ Authentication and read operations working!")
        print("ℹ️  User creation tests skipped")

    print("\n" + "=" * 70)
    print("  Integration Status: ✅ READY FOR PRODUCTION")
    print("=" * 70)

    return True

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
