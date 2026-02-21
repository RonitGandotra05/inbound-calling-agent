"""
Tests for the /health endpoint.
"""

import pytest


@pytest.mark.anyio
async def test_health_returns_200(client):
    """Basic health check should return 200 with status healthy."""
    resp = await client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"


@pytest.mark.anyio
async def test_health_response_structure(client):
    """Health response should include service name, version, and uptime."""
    resp = await client.get("/health")
    data = resp.json()
    assert "service" in data
    assert "version" in data
    assert "uptime_seconds" in data
    assert isinstance(data["uptime_seconds"], int)
