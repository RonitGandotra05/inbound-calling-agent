"""
Tests for Pydantic schema validation.
"""

import pytest
from pydantic import ValidationError
from app.models.schemas import CompanyCreate, CompanyUpdate, QueryRequest


class TestCompanyCreate:
    """Test CompanyCreate schema validation."""

    def test_valid_company(self):
        company = CompanyCreate(name="Test Corp", slug="test-corp")
        assert company.name == "Test Corp"
        assert company.slug == "test-corp"

    def test_empty_name_rejected(self):
        with pytest.raises(ValidationError) as exc_info:
            CompanyCreate(name="", slug="test-corp")
        assert "min_length" in str(exc_info.value).lower() or "at least" in str(exc_info.value).lower()

    def test_invalid_slug_rejected(self):
        with pytest.raises(ValidationError):
            CompanyCreate(name="Test", slug="INVALID SLUG!")

    def test_slug_normalized_to_lowercase(self):
        company = CompanyCreate(name="Test", slug="My-Company")
        assert company.slug == "my-company"

    def test_valid_email_accepted(self):
        company = CompanyCreate(
            name="Test", slug="test", contact_email="admin@example.com"
        )
        assert company.contact_email == "admin@example.com"

    def test_invalid_email_rejected(self):
        with pytest.raises(ValidationError):
            CompanyCreate(name="Test", slug="test", contact_email="not-an-email")

    def test_valid_phone_accepted(self):
        company = CompanyCreate(
            name="Test", slug="test", phone_number="+14155551234"
        )
        assert company.phone_number == "+14155551234"

    def test_invalid_phone_rejected(self):
        with pytest.raises(ValidationError):
            CompanyCreate(name="Test", slug="test", phone_number="abc123")

    def test_short_phone_rejected(self):
        with pytest.raises(ValidationError):
            CompanyCreate(name="Test", slug="test", phone_number="+1")


class TestCompanyUpdate:
    """Test CompanyUpdate schema validation."""

    def test_partial_update_allowed(self):
        update = CompanyUpdate(name="New Name")
        assert update.name == "New Name"
        assert update.phone_number is None

    def test_invalid_email_rejected(self):
        with pytest.raises(ValidationError):
            CompanyUpdate(contact_email="bad")

    def test_all_none_allowed(self):
        update = CompanyUpdate()
        assert update.name is None


class TestQueryRequest:
    """Test QueryRequest schema validation."""

    def test_valid_query(self):
        req = QueryRequest(
            query="What are your hours?",
            twilio_number="+14155551234",
            customer_phone="+14155559999",
        )
        assert req.query == "What are your hours?"

    def test_empty_query_rejected(self):
        with pytest.raises(ValidationError):
            QueryRequest(
                query="",
                twilio_number="+14155551234",
                customer_phone="+14155559999",
            )

    def test_invalid_twilio_number_rejected(self):
        with pytest.raises(ValidationError):
            QueryRequest(
                query="Hello",
                twilio_number="not-a-phone",
                customer_phone="+14155559999",
            )
