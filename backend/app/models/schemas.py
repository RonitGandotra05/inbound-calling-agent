"""
Pydantic schemas for request/response validation.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID


# ---- Company Schemas ----

class ServiceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    pricing: Optional[str] = None
    duration_minutes: Optional[int] = None
    is_bookable: bool = True


class ServiceResponse(ServiceCreate):
    id: UUID
    is_active: bool = True

    class Config:
        from_attributes = True


class CompanyCreate(BaseModel):
    name: str
    slug: str
    phone_number: Optional[str] = None
    greeting: Optional[str] = "Hello, thank you for calling. How may I assist you today?"
    fallback_message: Optional[str] = None
    timezone: Optional[str] = "UTC"
    business_hours: Optional[dict] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    services: Optional[list[ServiceCreate]] = []


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    phone_number: Optional[str] = None
    greeting: Optional[str] = None
    fallback_message: Optional[str] = None
    timezone: Optional[str] = None
    business_hours: Optional[dict] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    is_active: Optional[bool] = None


class CompanyResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    phone_number: Optional[str]
    greeting: Optional[str]
    fallback_message: Optional[str]
    timezone: str
    business_hours: Optional[dict]
    contact_email: Optional[str]
    contact_phone: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    services: list[ServiceResponse] = []

    class Config:
        from_attributes = True


class CompanyListItem(BaseModel):
    id: UUID
    name: str
    slug: str
    phone_number: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ---- Knowledge Document Schemas ----

class DocumentResponse(BaseModel):
    id: UUID
    filename: str
    original_name: Optional[str]
    content_type: str
    file_size: Optional[int]
    chunk_count: int
    status: str
    error_message: Optional[str]
    uploaded_at: datetime
    indexed_at: Optional[datetime]

    class Config:
        from_attributes = True


# ---- Interaction Schemas ----

class InteractionResponse(BaseModel):
    id: UUID
    company_id: UUID
    type: str
    status: str
    customer_name: Optional[str]
    customer_phone: str
    data: Optional[dict]
    summary: Optional[str]
    sentiment: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ---- Agent Schemas ----

class QueryRequest(BaseModel):
    """Request to process a customer query."""
    query: str
    twilio_number: str
    customer_phone: str
    conversation_history: list[dict] = []
    action_data: dict = {}


class QueryResponse(BaseModel):
    """Response from the agent orchestrator."""
    response: str
    refined_query: Optional[str] = None
    intent: str
    action_type: Optional[str] = None
    action_data: dict = {}
    is_action_complete: bool = False
    interaction_id: Optional[str] = None
    company_name: Optional[str] = None
    errors: list[str] = []


# ---- Pagination ----

class PaginatedResponse(BaseModel):
    page: int
    limit: int
    total: int
    pages: int
