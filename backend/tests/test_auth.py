def test_health(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "healthy"


def test_register_returns_token_and_player(client):
    resp = client.post("/api/auth/register", json={"device_id": "dev-abc-1", "username": "Mia"})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["player"]["username"] == "Mia"


def test_register_is_idempotent_per_device(client):
    first = client.post("/api/auth/register", json={"device_id": "dev-same"})
    second = client.post("/api/auth/register", json={"device_id": "dev-same"})
    assert first.json()["player"]["id"] == second.json()["player"]["id"]


def test_login_after_register(client):
    client.post("/api/auth/register", json={"device_id": "dev-login"})
    resp = client.post("/api/auth/login", json={"device_id": "dev-login"})
    assert resp.status_code == 200
    assert resp.json()["access_token"]


def test_login_unknown_device_404(client):
    resp = client.post("/api/auth/login", json={"device_id": "never-seen"})
    assert resp.status_code == 404


def test_me_requires_auth(client):
    assert client.get("/api/auth/me").status_code in (401, 403)


def test_me_with_auth(auth_client):
    resp = auth_client.get("/api/auth/me")
    assert resp.status_code == 200
    assert resp.json()["content_tier"] == "sfw"
