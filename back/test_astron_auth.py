"""Quick test script to verify Astron Members API authentication."""

import os
import sys
import requests
from requests.auth import HTTPBasicAuth

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

def test_astron_auth():
    """Test Astron Members API authentication."""

    base_url = os.environ.get("ASTRON_MEMBERS_API_URL", "https://api.astronmembers.com.br/v1.0")
    am_key = os.environ.get("ASTRON_MEMBERS_AM_KEY")
    am_secret = os.environ.get("ASTRON_MEMBERS_AM_SECRET")

    print("=" * 60)
    print("ASTRON MEMBERS API AUTHENTICATION TEST")
    print("=" * 60)
    print(f"\nBase URL: {base_url}")
    print(f"AM Key: {am_key[:10]}..." if am_key else "AM Key: NOT SET")
    print(f"AM Secret: {am_secret[:10]}..." if am_secret else "AM Secret: NOT SET")

    if not am_key or not am_secret:
        print("\n❌ ERROR: Missing credentials!")
        print("Please set ASTRON_MEMBERS_AM_KEY and ASTRON_MEMBERS_AM_SECRET in .env")
        return False

    # Test 1: List clubs (simple GET request)
    print("\n" + "-" * 60)
    print("Test 1: List Clubs (GET /clubs)")
    print("-" * 60)

    try:
        auth = HTTPBasicAuth(am_key, am_secret)
        params = {
            'am_key': am_key,
            'am_secret': am_secret,
            'limit': 5
        }

        response = requests.get(
            f"{base_url}/clubs",
            params=params,
            auth=auth,
            timeout=10
        )

        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")

        if response.status_code == 200:
            print("✅ SUCCESS: Authentication working!")
            data = response.json()
            print(f"Response Data: {data}")
            return True
        else:
            print(f"❌ FAILED: Status {response.status_code}")
            print(f"Response: {response.text}")
            return False

    except Exception as e:
        print(f"❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_astron_auth()
    print("\n" + "=" * 60)
    if success:
        print("✅ AUTHENTICATION TEST PASSED")
        print("The Astron Members integration is properly configured!")
    else:
        print("❌ AUTHENTICATION TEST FAILED")
        print("Please check your credentials and try again.")
    print("=" * 60)
    sys.exit(0 if success else 1)
