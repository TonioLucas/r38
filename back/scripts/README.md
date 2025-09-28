# Backend Scripts

This directory contains utility scripts for setting up and managing the lead capture system.

## setup_ebook.py

Script to upload the Bitcoin Red Pill e-book and configure the system settings.

### Usage

```bash
# Upload e-book and configure everything
python scripts/setup_ebook.py --all

# Upload e-book only
python scripts/setup_ebook.py --upload-ebook

# Configure settings only (assumes e-book is already uploaded)
python scripts/setup_ebook.py --configure-settings

# Configure privacy page only
python scripts/setup_ebook.py --configure-privacy

# Use custom e-book path
python scripts/setup_ebook.py --upload-ebook --ebook-path="/path/to/your/ebook.pdf"
```

### Prerequisites

1. **Firebase Admin SDK configured**: Ensure you have proper credentials set up
2. **E-book file exists**: The script looks for the e-book at the path specified in the PRD by default
3. **Firebase project initialized**: Make sure your Firebase project is set up with Firestore and Storage

### What it does

- **Upload E-book**: Uploads the PDF file to Firebase Storage at the configured path
- **Configure Settings**: Creates the `settings/config` document with default hero text and e-book configuration
- **Configure Privacy Page**: Sets up the privacy page with default content

### Configuration

The script uses these default values from the PRD:

- **Source Path**: `/Users/toniolucas/vork/r38/Livro Bitcoin Red Pill (3a Edição).pdf`
- **Storage Path**: `ebooks/bitcoin-red-pill-3rd-edition.pdf`
- **Filename**: `bitcoin-red-pill-3rd-edition.pdf`

### Example Output

```
INFO: Initializing Firebase...
INFO: Uploading e-book from /Users/toniolucas/vork/r38/Livro Bitcoin Red Pill (3a Edição).pdf to ebooks/bitcoin-red-pill-3rd-edition.pdf
INFO: File size: 2,048,576 bytes (2.00 MB)
INFO: E-book uploaded successfully!
INFO: Configuring settings collection...
INFO: Settings configured successfully!
INFO: Configuring privacy page...
INFO: Privacy page configured successfully!
INFO: Setup completed successfully! 🎉

E-book Configuration:
  Storage Path: ebooks/bitcoin-red-pill-3rd-edition.pdf
  File Name: bitcoin-red-pill-3rd-edition.pdf
  Size: 2,048,576 bytes
```

### Error Handling

The script includes comprehensive error handling and will exit with status code 1 if any step fails. Common issues:

- **File not found**: Check that the e-book file exists at the specified path
- **Firebase not configured**: Ensure your Firebase credentials are properly set up
- **Permission errors**: Make sure your Firebase project has Storage and Firestore enabled
