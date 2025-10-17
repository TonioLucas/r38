#!/usr/bin/env python3
"""
Script to create partner offer product and prices in Firestore
Run with: python3 create_partner_offer_product.py
"""

import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime
import sys

# Initialize Firebase
cred = credentials.Certificate("r38tao-5bdf1-firebase-adminsdk-fbsvc-1f8938a385.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

def main():
    print("=== CHECKING EXISTING PRODUCTS ===\n")

    # Check existing products
    products_ref = db.collection('products')
    products = products_ref.where('status', 'in', ['active', 'pre_sale']).limit(5).stream()

    existing_products = []
    for product in products:
        data = product.to_dict()
        existing_products.append({'id': product.id, 'name': data.get('name'), 'data': data})
        print(f"ID: {product.id}")
        print(f"  Name: {data.get('name')}")
        print(f"  Status: {data.get('status')}")

        # Show prices
        prices = db.collection('product_prices').where('product_id', '==', product.id).stream()
        print(f"  Prices:")
        for price in prices:
            price_data = price.to_dict()
            print(f"    - {price_data.get('payment_method')}: R$ {price_data.get('display_amount')} ({price_data.get('amount')} centavos)")
        print()

    if not existing_products:
        print("❌ No existing products found. Please create a base product first.")
        return

    # Use first product as template
    base_product = existing_products[0]
    print(f"✓ Using '{base_product['name']}' as template\n")

    print("=== CREATING PARTNER OFFER PRODUCT ===\n")

    # Create partner offer product
    partner_product_data = {
        'name': f"{base_product['name']} - Oferta Parceiros R$100",
        'description': 'Oferta especial para clientes de parceiros anteriores (Batismo Bitcoin / Bitcoin BlackPill)',
        'status': 'active',
        'base_entitlements': base_product['data'].get('base_entitlements'),
        'created_at': firestore.SERVER_TIMESTAMP,
        'updated_at': firestore.SERVER_TIMESTAMP,
    }

    # Create product
    _, product_ref = db.collection('products').add(partner_product_data)
    product_id = product_ref.id
    print(f"✓ Created product: {product_id}")
    print(f"  Name: {partner_product_data['name']}\n")

    # Create prices for BTC, PIX, and Credit Card at R$100
    payment_methods = [
        {'method': 'btc', 'name': 'Bitcoin'},
        {'method': 'pix', 'name': 'PIX'},
        {'method': 'credit_card', 'name': 'Cartão de Crédito'},
    ]

    print("=== CREATING PRICES (R$100) ===\n")

    price_ids = {}
    for pm in payment_methods:
        price_data = {
            'product_id': product_id,
            'payment_method': pm['method'],
            'amount': 10000,  # R$100 in centavos
            'display_amount': 100.00,  # R$100 for display
            'currency': 'BRL',
            'installments': None,  # No installments for partner offer
            'installment_amount': None,
            'includes_mentorship': False,
            'active': True,
            'created_at': firestore.SERVER_TIMESTAMP,
            'updated_at': firestore.SERVER_TIMESTAMP,
        }

        _, price_ref = db.collection('product_prices').add(price_data)
        price_ids[pm['method']] = price_ref.id
        print(f"✓ Created price for {pm['name']}: {price_ref.id}")
        print(f"  Amount: R$ 100.00 (10000 centavos)")

    print("\n=== SUMMARY ===\n")
    print(f"Product ID: {product_id}")
    print(f"BTC Price ID: {price_ids['btc']}")
    print(f"PIX Price ID: {price_ids['pix']}")
    print(f"Card Price ID: {price_ids['credit_card']}")
    print("\n✅ Partner offer product and prices created successfully!")
    print("\nℹ️  NOTE: No Stripe products were created. The checkout will use")
    print("   the amount from Firestore and create the Stripe session dynamically.")

if __name__ == '__main__':
    main()
