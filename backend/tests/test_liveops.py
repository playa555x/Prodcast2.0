def test_config_and_flags(auth_client):
    cfg = auth_client.get("/api/liveops/config")
    assert cfg.status_code == 200 and cfg.json()["rounds_per_character"] == 5
    flags = auth_client.get("/api/liveops/flags")
    assert flags.status_code == 200 and flags.json()["mode_daily"] is True


def test_events_have_phase(auth_client):
    resp = auth_client.get("/api/liveops/events")
    assert resp.status_code == 200
    body = resp.json()
    assert "serverTimeUtc" in body
    ids = {e["eventId"][:6] for e in body["events"]}
    assert any(i.startswith("daily") for i in ids)
    for e in body["events"]:
        assert e["phase"] in ("Preview", "NormalActive", "EndingSoon", "Concluded")
    # Daily-Event ist heute aktiv
    daily = next(e for e in body["events"] if e["type"] == "Daily")
    assert daily["phase"] in ("NormalActive", "EndingSoon")


def test_season_progress_and_claim(auth_client):
    s = auth_client.get("/api/liveops/season").json()
    assert s["points"] == 0 and len(s["tiers"]) == 10 and s["premium"] is False

    # Stufe 0 (100 Punkte) noch nicht erreicht -> claim 409
    assert auth_client.post("/api/liveops/season/claim", json={"tier": 0}).status_code == 409

    auth_client.post("/api/liveops/season/add", json={"points": 150})
    s2 = auth_client.get("/api/liveops/season").json()
    assert s2["points"] == 150

    claim = auth_client.post("/api/liveops/season/claim", json={"tier": 0, "track": "free"})
    assert claim.status_code == 200
    assert claim.json()["reward"]["itemId"] == "coins"
    # doppelt beanspruchen -> 409
    assert auth_client.post("/api/liveops/season/claim", json={"tier": 0, "track": "free"}).status_code == 409


def test_premium_track_gated(auth_client):
    auth_client.post("/api/liveops/season/add", json={"points": 150})
    # Premium ohne Unlock -> 402
    assert auth_client.post("/api/liveops/season/claim", json={"tier": 0, "track": "premium"}).status_code == 402
    auth_client.post("/api/liveops/season/unlock-premium")
    assert auth_client.post("/api/liveops/season/claim", json={"tier": 0, "track": "premium"}).status_code == 200


def test_season_isolated_per_player(client):
    a = client.post("/api/auth/register", json={"device_id": "season-A"}).json()["access_token"]
    client.post("/api/liveops/season/add", json={"points": 500}, headers={"Authorization": f"Bearer {a}"})
    b = client.post("/api/auth/register", json={"device_id": "season-B"}).json()["access_token"]
    s = client.get("/api/liveops/season", headers={"Authorization": f"Bearer {b}"}).json()
    assert s["points"] == 0
