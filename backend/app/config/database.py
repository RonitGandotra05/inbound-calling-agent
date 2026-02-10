"""
Async database connection using SQLAlchemy + AsyncPG.
"""

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config.settings import get_settings


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


def _get_async_url(url: str) -> str:
    """Convert standard postgres URL to async-compatible one."""
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    # Remove sslmode param if present (asyncpg handles SSL differently)
    if "sslmode=" in url:
        import re
        url = re.sub(r'[\?&]sslmode=[^&]*', '', url)
    return url


settings = get_settings()
async_url = _get_async_url(settings.database_url)

engine = create_async_engine(
    async_url,
    echo=settings.debug,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,
    connect_args={"ssl": "require"} if "neon" in async_url else {}
)

async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)


async def get_db() -> AsyncSession:
    """Dependency for FastAPI endpoints."""
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
