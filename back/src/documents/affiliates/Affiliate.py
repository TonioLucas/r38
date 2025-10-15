"""Affiliate document class."""

from typing import Optional
from src.documents.DocumentBase import DocumentBase
from src.apis.Db import Db
from src.models.firestore_types import AffiliateDoc


class Affiliate(DocumentBase[AffiliateDoc]):
    """Affiliate document class for managing affiliates in Firestore."""

    pydantic_model = AffiliateDoc

    def __init__(self, id: str, doc: Optional[dict] = None):
        """Initialize Affiliate document.

        Args:
            id: Document ID
            doc: Optional document data dictionary
        """
        self._db = Db.get_instance()
        self.collection_ref = self.db.collections["affiliates"]
        super().__init__(id, doc)

    @property
    def db(self) -> Db:
        """Get Db instance."""
        if self._db is None:
            self._db = Db.get_instance()
        return self._db

    @property
    def doc(self) -> AffiliateDoc:
        """Get the typed document."""
        return super().doc

    def add_sale(self, amount: int):
        """Add sale to affiliate totals.

        Args:
            amount: Commission amount in centavos
        """
        self.update_doc({
            'total_sales': self.doc.total_sales + 1,
            'total_commission_earned': self.doc.total_commission_earned + amount,
            'pending_commission': self.doc.pending_commission + amount
        })
