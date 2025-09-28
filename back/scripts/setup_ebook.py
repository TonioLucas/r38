#!/usr/bin/env python3
"""
Setup script to upload e-book and configure settings for the lead capture system.

This script uploads the Bitcoin Red Pill e-book to Firebase Storage and 
configures the settings collection for the download system.

Usage:
    python scripts/setup_ebook.py --upload-ebook --configure-settings

Requirements:
    - Firebase Admin SDK configured with proper credentials
    - E-book file exists at the path specified in PRD
"""

import os
import sys
import argparse
import logging
from pathlib import Path

# Add src to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from src.apis.Db import Db

# Configuration from PRD
EBOOK_SOURCE_PATH = "/Users/toniolucas/vork/r38/Livro Bitcoin Red Pill (3a Edição).pdf"
EBOOK_STORAGE_PATH = "ebooks/bitcoin-red-pill-3rd-edition.pdf"
EBOOK_FILENAME = "bitcoin-red-pill-3rd-edition.pdf"

logger = logging.getLogger(__name__)


def upload_ebook(db: Db, source_path: str, storage_path: str) -> dict:
    """Upload e-book file to Firebase Storage.
    
    Args:
        db: Database instance
        source_path: Local path to the e-book file
        storage_path: Storage path in Firebase Storage
        
    Returns:
        Dictionary with upload information
    """
    try:
        if not os.path.exists(source_path):
            raise FileNotFoundError(f"E-book file not found: {source_path}")
        
        # Get file size
        file_size = os.path.getsize(source_path)
        
        logger.info(f"Uploading e-book from {source_path} to {storage_path}")
        logger.info(f"File size: {file_size:,} bytes ({file_size/1024/1024:.2f} MB)")
        
        # Upload file
        from firebase_admin import storage
        bucket = storage.bucket()
        blob = bucket.blob(storage_path)
        
        blob.upload_from_filename(source_path)
        logger.info("E-book uploaded successfully!")
        
        return {
            "storagePath": storage_path,
            "fileName": EBOOK_FILENAME,
            "sizeBytes": file_size,
            "uploadedAt": db.timestamp_now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to upload e-book: {e}")
        raise


def configure_settings(db: Db, ebook_info: dict):
    """Configure settings collection with e-book and default values.
    
    Args:
        db: Database instance
        ebook_info: E-book information from upload
    """
    try:
        settings_data = {
            "hero": {
                "headline": "Soberania começa com conhecimento.",
                "subheadline": "Baixe grátis o e-book 'Bitcoin Red Pill (3ª Edição)' e entenda, sem rodeios, os fundamentos do Bitcoin e da autocustódia.",
                "ctaText": "Baixar e-book grátis"
            },
            "ebook": ebook_info,
            "images": [],  # To be populated later with actual images
            "updatedAt": db.timestamp_now().isoformat()
        }
        
        logger.info("Configuring settings collection...")
        db.collections["settings"].document("config").set(settings_data)
        logger.info("Settings configured successfully!")
        
    except Exception as e:
        logger.error(f"Failed to configure settings: {e}")
        raise


def configure_privacy_page(db: Db):
    """Configure privacy page settings.
    
    Args:
        db: Database instance
    """
    try:
        privacy_data = {
            "enabled": True,  # Enable privacy page by default
            "content": """# Política de Privacidade

Esta política de privacidade descreve como coletamos, usamos e protegemos suas informações pessoais.

## Informações que Coletamos

Coletamos as seguintes informações quando você se inscreve para baixar nosso e-book:
- Nome
- Email
- Telefone (opcional)
- Informações de navegação (UTM, referrer, IP)

## Como Usamos suas Informações

Suas informações são usadas para:
- Fornecer o acesso ao e-book
- Enviar comunicações relacionadas ao conteúdo
- Melhorar nossos serviços

## Proteção de Dados

Seus dados são protegidos e armazenados com segurança. Não compartilhamos suas informações com terceiros sem seu consentimento.

## Contato

Para dúvidas sobre esta política: bitcoinblackpill@gmail.com
""",
            "updatedAt": db.timestamp_now().isoformat()
        }
        
        logger.info("Configuring privacy page...")
        db.collections["pages"].document("privacy").set(privacy_data)
        logger.info("Privacy page configured successfully!")
        
    except Exception as e:
        logger.error(f"Failed to configure privacy page: {e}")
        raise


def main():
    """Main setup function."""
    parser = argparse.ArgumentParser(description="Setup e-book and configuration")
    parser.add_argument("--upload-ebook", action="store_true", 
                       help="Upload e-book to Firebase Storage")
    parser.add_argument("--configure-settings", action="store_true", 
                       help="Configure settings collection")
    parser.add_argument("--configure-privacy", action="store_true", 
                       help="Configure privacy page")
    parser.add_argument("--all", action="store_true", 
                       help="Run all setup steps")
    parser.add_argument("--ebook-path", default=EBOOK_SOURCE_PATH,
                       help="Path to e-book file (default from PRD)")
    parser.add_argument("--storage-path", default=EBOOK_STORAGE_PATH,
                       help="Storage path in Firebase Storage")
    
    args = parser.parse_args()
    
    if not any([args.upload_ebook, args.configure_settings, args.configure_privacy, args.all]):
        parser.print_help()
        return
    
    # Configure logging
    logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
    
    try:
        # Initialize database
        logger.info("Initializing Firebase...")
        db = Db.get_instance()
        
        ebook_info = None
        
        # Upload e-book if requested
        if args.upload_ebook or args.all:
            ebook_info = upload_ebook(db, args.ebook_path, args.storage_path)
        
        # Configure settings if requested
        if args.configure_settings or args.all:
            if not ebook_info:
                # Create ebook info from existing file or defaults
                ebook_info = {
                    "storagePath": args.storage_path,
                    "fileName": EBOOK_FILENAME,
                    "sizeBytes": 0  # Will need to be updated manually
                }
            configure_settings(db, ebook_info)
        
        # Configure privacy page if requested
        if args.configure_privacy or args.all:
            configure_privacy_page(db)
        
        logger.info("Setup completed successfully! 🎉")
        
        if ebook_info:
            print(f"\nE-book Configuration:")
            print(f"  Storage Path: {ebook_info['storagePath']}")
            print(f"  File Name: {ebook_info['fileName']}")
            print(f"  Size: {ebook_info['sizeBytes']:,} bytes")
        
    except Exception as e:
        logger.error(f"Setup failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
