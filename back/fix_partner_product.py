#!/usr/bin/env python3
"""
Script to fix partner offer product by adding missing required fields
Run with: python3 fix_partner_product.py
"""

import firebase_admin
from firebase_admin import credentials, firestore

# Initialize Firebase
cred = credentials.Certificate("r38tao-5bdf1-firebase-adminsdk-fbsvc-1f8938a385.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

def main():
    print("=== FIXING PARTNER OFFER PRODUCT ===\n")

    partner_product_id = 'ERihOwkVZhshYlbVvUN4'

    # Get the partner product
    partner_ref = db.collection('products').document(partner_product_id)
    partner_doc = partner_ref.get()

    if not partner_doc.exists:
        print(f"❌ Partner product {partner_product_id} not found")
        return

    partner_data = partner_doc.to_dict()
    print("Current partner product fields:")
    print(f"  Fields: {list(partner_data.keys())}\n")

    # Get a regular product to copy missing fields from
    regular_products = db.collection('products').limit(10).stream()
    base_product = None

    print("Searching for template product...")
    for product in regular_products:
        prod_data = product.to_dict()
        print(f"  Checking {product.id}: {prod_data.get('name')} - has astron_club_id: {'astron_club_id' in prod_data}")
        # Skip the partner product itself and products without astron_club_id
        if product.id != partner_product_id and 'astron_club_id' in prod_data:
            base_product = prod_data
            base_product_id = product.id
            print(f"\n✓ Using regular product as template: {base_product_id}")
            print(f"  Name: {base_product.get('name')}")
            print(f"  Fields: {list(base_product.keys())}\n")
            break

    if not base_product:
        print("❌ No regular product found to use as template")
        return

    # Fields to copy from base product (if missing in partner product)
    fields_to_copy = [
        'astron_club_id',
        'stripe_product_id',
        'stripe_prices',
        'btcpay_price_ids',
    ]

    updates = {}
    for field in fields_to_copy:
        if field not in partner_data and field in base_product:
            updates[field] = base_product[field]
            print(f"✓ Will add field '{field}': {base_product[field]}")

    if not updates:
        print("\n✅ No missing fields! Product is already complete.")
        return

    print(f"\n=== UPDATING PRODUCT {partner_product_id} ===\n")
    partner_ref.update(updates)
    print(f"✅ Successfully updated {len(updates)} fields\n")

    # Verify
    updated_doc = partner_ref.get()
    updated_data = updated_doc.to_dict()
    print("Updated partner product fields:")
    print(f"  Fields: {list(updated_data.keys())}")
    print()

    # Check critical fields
    print("Critical field values:")
    for field in ['astron_club_id', 'stripe_product_id', 'status', 'name']:
        print(f"  {field}: {updated_data.get(field)}")

    print("\n✅ Partner product fixed successfully!")

if __name__ == '__main__':
    main()
