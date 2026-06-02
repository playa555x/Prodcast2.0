"""Test-Fixtures: isolierte SQLite-Test-DB + authentifizierter Client."""

from __future__ import annotations

import os
import tempfile

# Umgebung VOR dem Import der App setzen (Settings lesen env beim Import).
_TMP_DB = os.path.join(tempfile.gettempdir(), "heartmatch_test.db")
os.environ.setdefault("DATABASE_URL", f"sqlite:///{_TMP_DB}")
os.environ.setdefault("JWT_SECRET", "test-secret")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import app.models  # noqa: E402,F401  (Modelle registrieren)
from app.core.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(autouse=True)
def fresh_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def auth_client(client):
    resp = client.post("/api/auth/register", json={"device_id": "test-device-123"})
    assert resp.status_code == 200, resp.text
    token = resp.json()["access_token"]
    client.headers.update({"Authorization": f"Bearer {token}"})
    return client
