def test_unlock_and_list(auth_client):
    resp = auth_client.post(
        "/api/rewards/unlock",
        json={"character_id": "luna", "tier": 1, "asset_ref": "luna/t1.png"},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["character_id"] == "luna"

    listing = auth_client.get("/api/rewards")
    assert listing.status_code == 200
    items = listing.json()
    assert len(items) == 1
    assert items[0]["tier"] == 1


def test_unlock_is_idempotent(auth_client):
    body = {"character_id": "luna", "tier": 2, "asset_ref": "a.png"}
    first = auth_client.post("/api/rewards/unlock", json=body)
    second = auth_client.post("/api/rewards/unlock", json=body)
    assert first.json()["id"] == second.json()["id"]
    assert len(auth_client.get("/api/rewards").json()) == 1


def test_rewards_isolated_per_player(client):
    # Player A
    a = client.post("/api/auth/register", json={"device_id": "dev-A"}).json()["access_token"]
    client.post(
        "/api/rewards/unlock",
        json={"character_id": "luna", "tier": 1},
        headers={"Authorization": f"Bearer {a}"},
    )
    # Player B sieht nichts von A
    b = client.post("/api/auth/register", json={"device_id": "dev-B"}).json()["access_token"]
    listing = client.get("/api/rewards", headers={"Authorization": f"Bearer {b}"})
    assert listing.json() == []
