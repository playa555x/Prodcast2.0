def test_load_save_empty_returns_null(auth_client):
    resp = auth_client.get("/api/game/save")
    assert resp.status_code == 200
    assert resp.json() is None


def test_store_then_load_save(auth_client):
    payload = {"version": 2, "data": {"coins": 120, "activeCharacterId": "luna"}}
    put = auth_client.put("/api/game/save", json=payload)
    assert put.status_code == 200, put.text
    assert put.json()["version"] == 2

    get = auth_client.get("/api/game/save")
    assert get.status_code == 200
    body = get.json()
    assert body["data"]["coins"] == 120
    assert body["data"]["activeCharacterId"] == "luna"


def test_save_upsert_overwrites(auth_client):
    auth_client.put("/api/game/save", json={"version": 1, "data": {"coins": 10}})
    auth_client.put("/api/game/save", json={"version": 1, "data": {"coins": 99}})
    body = auth_client.get("/api/game/save").json()
    assert body["data"]["coins"] == 99


def test_save_requires_auth(client):
    assert client.get("/api/game/save").status_code in (401, 403)
