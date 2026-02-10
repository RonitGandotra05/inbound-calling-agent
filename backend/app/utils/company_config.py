"""
Company config helper – builds the context dict that agents need.
"""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.models import Company

# Simple in-memory cache
_cache: dict[str, dict] = {}


async def get_company_context(company_id: str, db: AsyncSession) -> dict:
    """Build a company context dict for agents, with caching."""
    if company_id in _cache:
        return _cache[company_id]

    result = await db.execute(
        select(Company)
        .options(selectinload(Company.services))
        .where(Company.id == company_id)
    )
    company = result.scalar_one_or_none()
    if company is None:
        return {}

    services_list = [s.name for s in company.services if s.is_active] if company.services else []

    bh = company.business_hours or {}
    wd = bh.get("weekdays", {})
    we = bh.get("weekend", {})
    hours_text = (
        f"Weekdays: {wd.get('open', '9:00')} – {wd.get('close', '17:00')}, "
        f"Weekends: {we.get('open', 'Closed')} – {we.get('close', '')}"
    )

    ctx = {
        "companyName": company.name,
        "greeting": company.greeting,
        "fallbackMessage": company.fallback_message,
        "services": ", ".join(services_list) or "various services",
        "businessHours": hours_text,
        "contactEmail": company.contact_email or "",
        "contactPhone": company.contact_phone or "",
        "timezone": company.timezone,
    }

    _cache[company_id] = ctx
    return ctx


def invalidate_cache(company_id: str | None = None):
    """Clear cached company context."""
    if company_id:
        _cache.pop(company_id, None)
    else:
        _cache.clear()
