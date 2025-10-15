"""WebhookEvent document class."""

from typing import Optional
from src.documents.DocumentBase import DocumentBase
from src.apis.Db import Db
from src.models.firestore_types import WebhookEventDoc


class WebhookEvent(DocumentBase[WebhookEventDoc]):
    """WebhookEvent document class for managing webhook events in Firestore."""

    pydantic_model = WebhookEventDoc

    def __init__(self, id: str, doc: Optional[dict] = None):
        """Initialize WebhookEvent document.

        Args:
            id: Document ID
            doc: Optional document data dictionary
        """
        self._db = Db.get_instance()
        self.collection_ref = self.db.collections["webhook_events"]
        super().__init__(id, doc)

    @property
    def db(self) -> Db:
        """Get Db instance."""
        if self._db is None:
            self._db = Db.get_instance()
        return self._db

    @property
    def doc(self) -> WebhookEventDoc:
        """Get the typed document."""
        return super().doc

    def mark_processed(self, success: bool = True, error: Optional[str] = None):
        """Mark webhook as processed.

        Args:
            success: Whether processing was successful
            error: Optional error message if processing failed
        """
        self.update_doc({
            'processed': True,
            'processed_at': self.db.timestamp_now(),
            'error': error
        })
