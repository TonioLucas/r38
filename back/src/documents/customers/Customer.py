"""Customer document class."""

from typing import Optional
from src.documents.DocumentBase import DocumentBase
from src.apis.Db import Db
from src.models.firestore_types import CustomerDoc


class Customer(DocumentBase[CustomerDoc]):
    """Customer document class for managing customers in Firestore."""

    pydantic_model = CustomerDoc

    def __init__(self, id: str, doc: Optional[dict] = None):
        """Initialize Customer document.

        Args:
            id: Document ID (Firebase Auth UID)
            doc: Optional document data dictionary
        """
        self._db = Db.get_instance()
        self.collection_ref = self.db.collections["customers"]
        super().__init__(id, doc)

    @property
    def db(self) -> Db:
        """Get Db instance."""
        if self._db is None:
            self._db = Db.get_instance()
        return self._db

    @property
    def doc(self) -> CustomerDoc:
        """Get the typed document."""
        return super().doc
