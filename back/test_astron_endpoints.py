"""Test different Astron Members API endpoint variations."""

import os
import sys
import requests
from requests.auth import HTTPBasicAuth

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

def test_endpoints():
    """Test different endpoint variations to find the correct one."""

    am_key = os.environ.get("ASTRON_MEMBERS_AM_KEY")
    am_secret = os.environ.get("ASTRON_MEMBERS_AM_SECRET")

    if not am_key or not am_secret:
        print("❌ Missing credentials!")
        return

    auth = HTTPBasicAuth(am_key, am_secret)
    params = {
        'am_key': am_key,
        'am_secret': am_secret
    }

    # Try different base URLs
    base_urls = [
        "https://api.astronmembers.com.br",
        "https://api.astronmembers.com.br/v1.0",
        "https://api.astronmembers.com.br/v1",
        "https://api.astronmembers.com.br/api",
        "https://api.astronmembers.com.br/api/v1.0",
    ]

    # Try different endpoint paths
    paths = [
        "/clubs",
        "/listClubs",
        "/club/list",
    ]

    print("=" * 70)
    print("TESTING ASTRON MEMBERS API ENDPOINT VARIATIONS")
    print("=" * 70)

    for base_url in base_urls:
        for path in paths:
            url = f"{base_url}{path}"
            print(f"\nTrying: {url}")

            try:
                response = requests.get(
                    url,
                    params=params,
                    auth=auth,
                    timeout=5
                )

                print(f"  Status: {response.status_code}")

                if response.status_code in [200, 201]:
                    print(f"  ✅ SUCCESS!")
                    print(f"  Response: {response.text[:200]}")
                    print(f"\n{'='*70}")
                    print(f"WORKING ENDPOINT FOUND:")
                    print(f"  Base URL: {base_url}")
                    print(f"  Path: {path}")
                    print(f"{'='*70}")
                    return
                elif response.status_code == 404:
                    print(f"  ❌ Not Found: {response.json() if response.text else 'Empty'}")
                elif response.status_code == 401:
                    print(f"  ❌ Unauthorized (auth may be wrong)")
                else:
                    print(f"  ⚠️  Status {response.status_code}: {response.text[:100]}")

            except Exception as e:
                print(f"  ❌ Error: {str(e)[:50]}")

    print(f"\n{'='*70}")
    print("❌ NO WORKING ENDPOINT FOUND")
    print("The API structure may be different from documentation")
    print("='*70}")

if __name__ == "__main__":
    test_endpoints()
