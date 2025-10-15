"""ProductPrice document class."""

from typing import Optional
from src.documents.DocumentBase import DocumentBase
from src.apis.Db import Db
from src.models.firestore_types import ProductPriceDoc


class ProductPrice(DocumentBase[ProductPriceDoc]):
    """ProductPrice document class for managing product prices in Firestore."""

    pydantic_model = ProductPriceDoc

    def __init__(self, id: str, doc: Optional[dict] = None):
        """Initialize ProductPrice document.

        Args:
            id: Document ID
            doc: Optional document data dictionary
        """
        self._db = Db.get_instance()
        self.collection_ref = self.db.collections["product_prices"]
        super().__init__(id, doc)

    @property
    def db(self) -> Db:
        """Get Db instance."""
        if self._db is None:
            self._db = Db.get_instance()
        return self._db

    @property
    def doc(self) -> ProductPriceDoc:
        """Get the typed document."""
        return super().doc
