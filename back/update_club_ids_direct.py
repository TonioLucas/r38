"""Update product club IDs directly in Firestore (bypassing Pydantic validation)."""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

# Initialize Firebase Admin
import firebase_admin
from firebase_admin import credentials

if not firebase_admin._apps:
    cred_path = os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')
    if cred_path and os.path.exists(cred_path):
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    else:
        firebase_admin.initialize_app()

from src.apis.Db import Db

def main():
    """Update club IDs directly in Firestore."""
    print("\n" + "="*70)
    print("  UPDATE FIRESTORE PRODUCT CLUB IDS (DIRECT)")
    print("="*70)

    db = Db.get_instance()
    products_ref = db.collections['products']

    updates = [
        {
            'slug': 'auto-custodia',
            'club_id': '16831',
            'action': 'Set'
        },
        {
            'slug': 'futuros',
            'club_id': None,
            'action': 'Remove'
        },
        {
            'slug': 'lex-btc',
            'club_id': None,
            'action': 'Remove'
        }
    ]

    print("\nPlanned updates:")
    for update in updates:
        action = f"Set to {update['club_id']}" if update['club_id'] else "Remove field"
        print(f"  - {update['slug']}: {action}")

    response = input("\nProceed? (yes/no): ").strip().lower()
    if response != 'yes':
        print("❌ Aborted")
        return

    success_count = 0

    for update in updates:
        slug = update['slug']
        club_id = update['club_id']

        print(f"\n{'='*70}")
        print(f"Processing: {slug}")
        print(f"{'='*70}")

        try:
            doc_ref = products_ref.document(slug)
            doc = doc_ref.get()

            if not doc.exists:
                print(f"❌ Product not found: {slug}")
                continue

            product_data = doc.to_dict()
            print(f"Current product:")
            print(f"  Name: {product_data.get('name', 'Unknown')}")
            print(f"  Current astron_club_id: {product_data.get('astron_club_id', 'NOT SET')}")

            if club_id:
                print(f"  ✏️  Setting astron_club_id to: {club_id}")
                doc_ref.update({'astron_club_id': club_id})
                print(f"  ✅ Updated!")
            else:
                if 'astron_club_id' in product_data:
                    print(f"  ✏️  Removing astron_club_id field")
                    # Use FieldValue.delete() to remove field
                    from google.cloud.firestore import DELETE_FIELD
                    doc_ref.update({'astron_club_id': DELETE_FIELD})
                    print(f"  ✅ Removed!")
                else:
                    print(f"  ℹ️  Field not present, skipping")

            success_count += 1

        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()

    print(f"\n{'='*70}")
    print("  SUMMARY")
    print(f"{'='*70}")
    print(f"Successful updates: {success_count}/{len(updates)}")

    if success_count == len(updates):
        print("\n✅ All Firestore updates completed!")
        print("\n📋 Status:")
        print("  ✅ Stripe metadata: Updated (from previous run)")
        print("  ✅ Firestore: Updated")
        print("\n✅ Auto Custódia product is now configured for Astron Members!")
        print("  Club ID: 16831")
    else:
        print("\n⚠️  Some updates failed")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
