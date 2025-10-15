"""Payment document class."""

from typing import Optional
from src.documents.DocumentBase import DocumentBase
from src.apis.Db import Db
from src.models.firestore_types import PaymentDoc, PaymentStatus


class Payment(DocumentBase[PaymentDoc]):
    """Payment document class for managing payment transactions in Firestore."""

    pydantic_model = PaymentDoc

    def __init__(self, id: str, doc: Optional[dict] = None):
        """Initialize Payment document.

        Args:
            id: Document ID
            doc: Optional document data dictionary
        """
        self._db = Db.get_instance()
        self.collection_ref = self.db.collections["payments"]
        super().__init__(id, doc)

    @property
    def db(self) -> Db:
        """Get Db instance."""
        if self._db is None:
            self._db = Db.get_instance()
        return self._db

    @property
    def doc(self) -> PaymentDoc:
        """Get the typed document."""
        return super().doc

    def mark_confirmed(self):
        """Mark payment as confirmed."""
        self.update_doc({
            'status': PaymentStatus.CONFIRMED.value,
            'processed_at': self.db.timestamp_now()
        })
