"""
Logging configuration for the backend application.
Sets up structured logging with timestamps, levels, and module context.
"""

import logging
import sys
from app.config.settings import get_settings


def setup_logging() -> None:
    """Configure application-wide logging.

    - DEBUG level when settings.debug is True, INFO otherwise
    - Structured format: [timestamp] [level] [module] message
    - Suppresses noisy third-party loggers
    """
    settings = get_settings()
    level = logging.DEBUG if settings.debug else logging.INFO

    formatter = logging.Formatter(
        fmt="%(asctime)s [%(levelname)-8s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # Root handler → stderr
    handler = logging.StreamHandler(sys.stderr)
    handler.setFormatter(formatter)

    root = logging.getLogger()
    root.setLevel(level)
    # Remove any default handlers to avoid duplicate output
    root.handlers.clear()
    root.addHandler(handler)

    # Quiet down noisy libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(
        logging.INFO if settings.debug else logging.WARNING
    )
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)

    logging.getLogger(__name__).info(
        "Logging configured — level=%s, debug=%s", level, settings.debug
    )
