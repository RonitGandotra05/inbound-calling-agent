"""
Company config helper – builds the context dict that agents need.
"""

import time
import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.models import Company

logger = logging.getLogger(__name__)

# TTL-based cache: {company_id: (data, timestamp)}
_cache: dict[str, tuple[dict, float]] = {}
_CACHE_TTL_SECONDS = 300  # 5 minutes


async def get_company_context(company_id: str, db: AsyncSession) -> dict:
    """Build a company context dict for agents, with TTL-based caching."""
    now = time.monotonic()

    cached = _cache.get(company_id)
    if cached is not None:
        data, ts = cached
        if now - ts < _CACHE_TTL_SECONDS:
            return data
        else:
            logger.debug("Cache expired for company %s", company_id)

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

    _cache[company_id] = (ctx, now)
    logger.debug("Cached context for company %s", company_id)
    return ctx


def invalidate_cache(company_id: str | None = None):
    """Clear cached company context."""
    if company_id:
        removed = _cache.pop(company_id, None)
        if removed:
            logger.info("Invalidated cache for company %s", company_id)
    else:
        _cache.clear()
        logger.info("Invalidated all company caches")

