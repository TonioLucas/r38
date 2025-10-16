"""Update product club IDs in Firestore and Stripe."""

import os
import sys
import stripe

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
from src.documents.products.Product import Product

# Initialize Stripe
stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")

def update_firestore_product(product_id: str, club_id: str = None):
    """Update product club_id in Firestore."""
    print(f"\n{'='*70}")
    print(f"Updating Firestore Product: {product_id}")
    print(f"{'='*70}")

    try:
        product = Product(id=product_id)

        if not product.doc:
            print(f"❌ Product not found in Firestore: {product_id}")
            return False

        print(f"Current product data:")
        print(f"  Name: {product.doc.name}")
        print(f"  Current astron_club_id: {getattr(product.doc, 'astron_club_id', 'NOT SET')}")

        if club_id:
            print(f"\n✏️  Updating astron_club_id to: {club_id}")
            product.update_doc({'astron_club_id': club_id})
            print(f"✅ Updated successfully!")
        else:
            # Remove the field
            print(f"\n✏️  Removing astron_club_id field")
            # Firestore delete field by setting to None in some implementations
            db = Db.get_instance()
            doc_ref = db.collections['products'].document(product_id)
            doc_ref.update({'astron_club_id': None})
            print(f"✅ Field removed!")

        return True

    except Exception as e:
        print(f"❌ Error updating Firestore: {e}")
        import traceback
        traceback.print_exc()
        return False

def update_stripe_product(stripe_product_id: str, club_id: str = None):
    """Update product club_id in Stripe metadata."""
    print(f"\n{'='*70}")
    print(f"Updating Stripe Product: {stripe_product_id}")
    print(f"{'='*70}")

    try:
        product = stripe.Product.retrieve(stripe_product_id)

        print(f"Current product data:")
        print(f"  Name: {product.name}")
        print(f"  Current astron_club_id: {product.metadata.get('astron_club_id', 'NOT SET')}")

        if club_id:
            print(f"\n✏️  Updating metadata.astron_club_id to: {club_id}")
            updated = stripe.Product.modify(
                stripe_product_id,
                metadata={'astron_club_id': club_id}
            )
            print(f"✅ Updated successfully!")
        else:
            # Remove from metadata
            print(f"\n✏️  Removing astron_club_id from metadata")
            metadata = dict(product.metadata)
            if 'astron_club_id' in metadata:
                del metadata['astron_club_id']
            updated = stripe.Product.modify(
                stripe_product_id,
                metadata=metadata
            )
            print(f"✅ Field removed!")

        return True

    except Exception as e:
        print(f"❌ Error updating Stripe: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Update products with correct club IDs."""
    print("\n" + "="*70)
    print("  UPDATE ASTRON CLUB IDS")
    print("="*70)
    print("\nThis will update both Firestore and Stripe for:")
    print("  ✅ Auto Custódia: Set to club ID 16831")
    print("  🗑️  Other products: Remove astron_club_id (not needed yet)")

    response = input("\nProceed? (yes/no): ").strip().lower()
    if response != 'yes':
        print("❌ Aborted")
        return

    # Product mappings (Firestore slug -> Stripe ID)
    products = {
        'auto-custodia': {
            'stripe_id': 'prod_TFKu8wIkcLBKBf',
            'name': 'Auto Custódia com RENATO 38',
            'club_id': '16831'  # Numeric club ID as string
        },
        'futuros': {
            'stripe_id': 'prod_TFKuGVOuPyVId7',
            'name': 'Operando Futuros e Derivativos',
            'club_id': None  # Remove for now
        },
        'lex-btc': {
            'stripe_id': 'prod_TFKudCZVnhm9FO',
            'name': 'Lex BTC',
            'club_id': None  # Remove for now
        }
    }

    success_count = 0
    total_count = len(products) * 2  # Firestore + Stripe for each

    for firestore_slug, product_info in products.items():
        print(f"\n\n{'#'*70}")
        print(f"# Processing: {product_info['name']}")
        print(f"{'#'*70}")

        # Update Firestore
        if update_firestore_product(firestore_slug, product_info['club_id']):
            success_count += 1

        # Update Stripe
        if update_stripe_product(product_info['stripe_id'], product_info['club_id']):
            success_count += 1

    # Summary
    print("\n" + "="*70)
    print("  UPDATE SUMMARY")
    print("="*70)
    print(f"Successful updates: {success_count}/{total_count}")

    if success_count == total_count:
        print("\n✅ All updates completed successfully!")
        print("\n📋 Next steps:")
        print("  1. Test customer provisioning with Auto Custódia product")
        print("  2. Verify Astron Members access is granted")
        print("  3. Check magic link generation")
    else:
        print("\n⚠️  Some updates failed. Please review errors above.")

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
