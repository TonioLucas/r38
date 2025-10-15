"""Subscription document class."""

from typing import Optional
from src.documents.DocumentBase import DocumentBase
from src.apis.Db import Db
from src.models.firestore_types import SubscriptionDoc, SubscriptionStatus


class Subscription(DocumentBase[SubscriptionDoc]):
    """Subscription document class for managing subscriptions in Firestore."""

    pydantic_model = SubscriptionDoc

    def __init__(self, id: str, doc: Optional[dict] = None):
        """Initialize Subscription document.

        Args:
            id: Document ID
            doc: Optional document data dictionary
        """
        self._db = Db.get_instance()
        self.collection_ref = self.db.collections["subscriptions"]
        super().__init__(id, doc)

    @property
    def db(self) -> Db:
        """Get Db instance."""
        if self._db is None:
            self._db = Db.get_instance()
        return self._db

    @property
    def doc(self) -> SubscriptionDoc:
        """Get the typed document."""
        return super().doc

    def activate(self):
        """Activate subscription and grant access."""
        self.update_doc({
            'status': SubscriptionStatus.ACTIVE.value,
            'access_granted_at': self.db.timestamp_now()
        })

    def cancel(self):
        """Cancel subscription."""
        self.update_doc({'status': SubscriptionStatus.CANCELLED.value})
