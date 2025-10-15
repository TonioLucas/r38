"""Product document class."""

from typing import Optional
from src.documents.DocumentBase import DocumentBase
from src.apis.Db import Db
from src.models.firestore_types import ProductDoc


class Product(DocumentBase[ProductDoc]):
    """Product document class for managing products in Firestore."""

    pydantic_model = ProductDoc

    def __init__(self, id: str, doc: Optional[dict] = None):
        """Initialize Product document.

        Args:
            id: Document ID
            doc: Optional document data dictionary
        """
        self._db = Db.get_instance()
        self.collection_ref = self.db.collections["products"]
        super().__init__(id, doc)

    @property
    def db(self) -> Db:
        """Get Db instance."""
        if self._db is None:
            self._db = Db.get_instance()
        return self._db

    @property
    def doc(self) -> ProductDoc:
        """Get the typed document."""
        return super().doc
