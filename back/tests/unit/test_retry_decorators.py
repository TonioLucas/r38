"""Unit tests for retry decorators."""

import pytest
from unittest.mock import Mock
from google.api_core.exceptions import (
    DeadlineExceeded,
    ServiceUnavailable,
    ResourceExhausted,
    PermissionDenied,
)

from src.util.retry_decorators import retry_firestore_operation


class TestRetryDecorators:
    """Test retry decorator behavior."""

    def test_retry_succeeds_on_second_attempt(self):
        """Test that transient error is retried and eventually succeeds."""
        mock_operation = Mock()
        # First call fails, second succeeds
        mock_operation.side_effect = [
            DeadlineExceeded("Timeout"),
            "success"
        ]

        @retry_firestore_operation
        def operation():
            return mock_operation()

        result = operation()

        assert result == "success"
        assert mock_operation.call_count == 2

    def test_retry_succeeds_on_third_attempt(self):
        """Test that operation succeeds on the third attempt."""
        mock_operation = Mock()
        # First two calls fail, third succeeds
        mock_operation.side_effect = [
            ServiceUnavailable("Service down"),
            ServiceUnavailable("Still down"),
            "success"
        ]

        @retry_firestore_operation
        def operation():
            return mock_operation()

        result = operation()

        assert result == "success"
        assert mock_operation.call_count == 3

    def test_retry_exhausted_raises_exception(self):
        """Test that persistent failure raises exception after retries."""
        mock_operation = Mock()
        mock_operation.side_effect = ServiceUnavailable("Service down")

        @retry_firestore_operation
        def operation():
            return mock_operation()

        with pytest.raises(ServiceUnavailable):
            operation()

        # Should retry 3 times (initial + 2 retries)
        assert mock_operation.call_count == 3

    def test_retry_on_deadline_exceeded(self):
        """Test that DeadlineExceeded triggers retry."""
        mock_operation = Mock()
        mock_operation.side_effect = [
            DeadlineExceeded("Request timeout"),
            "success"
        ]

        @retry_firestore_operation
        def operation():
            return mock_operation()

        result = operation()

        assert result == "success"
        assert mock_operation.call_count == 2

    def test_retry_on_resource_exhausted(self):
        """Test that ResourceExhausted triggers retry."""
        mock_operation = Mock()
        mock_operation.side_effect = [
            ResourceExhausted("Quota exceeded"),
            "success"
        ]

        @retry_firestore_operation
        def operation():
            return mock_operation()

        result = operation()

        assert result == "success"
        assert mock_operation.call_count == 2

    def test_no_retry_on_permanent_errors(self):
        """Test that permanent errors don't trigger retry."""
        mock_operation = Mock()
        mock_operation.side_effect = PermissionDenied("Access denied")

        @retry_firestore_operation
        def operation():
            return mock_operation()

        # Should fail immediately without retry
        with pytest.raises(PermissionDenied):
            operation()

        assert mock_operation.call_count == 1  # No retry

    def test_successful_operation_no_retry(self):
        """Test that successful operations don't trigger retry."""
        mock_operation = Mock()
        mock_operation.return_value = "success"

        @retry_firestore_operation
        def operation():
            return mock_operation()

        result = operation()

        assert result == "success"
        assert mock_operation.call_count == 1  # No retry needed

    def test_retry_with_return_value(self):
        """Test that retry preserves return values."""
        mock_operation = Mock()
        expected_value = {"contact_id": "123", "list_id": "456"}
        mock_operation.side_effect = [
            DeadlineExceeded("Timeout"),
            expected_value
        ]

        @retry_firestore_operation
        def operation():
            return mock_operation()

        result = operation()

        assert result == expected_value
        assert mock_operation.call_count == 2
