"""ManualVerification document class."""

from typing import Optional
from src.documents.DocumentBase import DocumentBase
from src.apis.Db import Db
from src.models.firestore_types import ManualVerificationDoc, ManualVerificationStatus


class ManualVerification(DocumentBase[ManualVerificationDoc]):
    """ManualVerification document class for managing manual verifications in Firestore."""

    pydantic_model = ManualVerificationDoc

    def __init__(self, id: str, doc: Optional[dict] = None):
        """Initialize ManualVerification document.

        Args:
            id: Document ID
            doc: Optional document data dictionary
        """
        self._db = Db.get_instance()
        self.collection_ref = self.db.collections["manual_verifications"]
        super().__init__(id, doc)

    @property
    def db(self) -> Db:
        """Get Db instance."""
        if self._db is None:
            self._db = Db.get_instance()
        return self._db

    @property
    def doc(self) -> ManualVerificationDoc:
        """Get the typed document."""
        return super().doc

    def approve(self, admin_uid: str, notes: str, subscription_id: str):
        """Approve verification.

        Args:
            admin_uid: UID of admin approving the verification
            notes: Approval notes
            subscription_id: ID of created subscription
        """
        self.update_doc({
            'status': ManualVerificationStatus.APPROVED.value,
            'reviewed_by': admin_uid,
            'reviewed_at': self.db.timestamp_now(),
            'notes': notes,
            'subscription_created': subscription_id
        })

    def reject(self, admin_uid: str, notes: str):
        """Reject verification.

        Args:
            admin_uid: UID of admin rejecting the verification
            notes: Rejection notes
        """
        self.update_doc({
            'status': ManualVerificationStatus.REJECTED.value,
            'reviewed_by': admin_uid,
            'reviewed_at': self.db.timestamp_now(),
            'notes': notes
        })
