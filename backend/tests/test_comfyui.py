import httpx
import pytest
import respx

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.generation_job import GenerationJob, JobStatus
from app.models.player import Player
from app.services.comfyui_client import ComfyUIClient, GenerationParams
from app.services.reward_service import run_generation_job

BASE = "http://comfy.test"


# --- Client-Unit-Tests -----------------------------------------------------
def test_build_workflow_injects_params():
    c = ComfyUIClient()
    wf = c.build_workflow(
        GenerationParams(prompt="luna, smiling", seed=42, width=512, height=640, steps=10, cfg=7.0)
    )
    assert wf["6"]["inputs"]["text"] == "luna, smiling"
    assert wf["3"]["inputs"]["seed"] == 42
    assert wf["3"]["inputs"]["steps"] == 10
    assert wf["5"]["inputs"]["width"] == 512
    assert wf["5"]["inputs"]["height"] == 640


def test_cache_key_is_deterministic():
    a = GenerationParams(prompt="x", seed=1).cache_key()
    b = GenerationParams(prompt="x", seed=1).cache_key()
    c = GenerationParams(prompt="x", seed=2).cache_key()
    assert a == b and a != c


@respx.mock
async def test_generate_returns_image_bytes():
    respx.post(f"{BASE}/prompt").respond(json={"prompt_id": "pid1"})
    respx.get(f"{BASE}/history/pid1").respond(
        json={"pid1": {"outputs": {"9": {"images": [{"filename": "a.png", "subfolder": "", "type": "output"}]}}}}
    )
    respx.get(f"{BASE}/view").respond(content=b"PNGDATA")

    client = ComfyUIClient(base_url=BASE, poll_interval=0.01)
    data = await client.generate(GenerationParams(prompt="test"))
    assert data == b"PNGDATA"


@respx.mock
async def test_is_available_true():
    respx.get(f"{BASE}/system_stats").respond(json={"ok": True})
    assert await ComfyUIClient(base_url=BASE).is_available() is True


@respx.mock
async def test_is_available_false_on_connect_error():
    respx.get(f"{BASE}/system_stats").mock(side_effect=httpx.ConnectError("down"))
    assert await ComfyUIClient(base_url=BASE).is_available() is False


# --- Orchestrierung (Background-Job) --------------------------------------
class _FakeClient:
    async def generate(self, params):
        return b"FAKEIMAGE"


async def test_run_generation_job_writes_cache(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "CACHE_DIR", str(tmp_path))

    db = SessionLocal()
    player = Player(device_id="gen-dev")
    db.add(player)
    db.commit()
    job = GenerationJob(player_id=player.id, character_id="luna", tier=1, params_json="{}")
    db.add(job)
    db.commit()
    job_id = job.id
    db.close()

    await run_generation_job(job_id, client=_FakeClient())

    db = SessionLocal()
    refreshed = db.get(GenerationJob, job_id)
    assert refreshed.status == JobStatus.DONE.value
    assert refreshed.result_path and refreshed.result_path.endswith(".png")
    db.close()


async def test_run_generation_job_handles_failure(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "CACHE_DIR", str(tmp_path))

    class _BadClient:
        async def generate(self, params):
            raise RuntimeError("comfy boom")

    db = SessionLocal()
    player = Player(device_id="gen-dev-2")
    db.add(player)
    db.commit()
    job = GenerationJob(player_id=player.id, character_id="luna", tier=1, params_json="{}")
    db.add(job)
    db.commit()
    job_id = job.id
    db.close()

    await run_generation_job(job_id, client=_BadClient())

    db = SessionLocal()
    refreshed = db.get(GenerationJob, job_id)
    assert refreshed.status == JobStatus.FAILED.value
    assert "boom" in (refreshed.error or "")
    db.close()


# --- API-Endpoints ---------------------------------------------------------
def test_generate_endpoint_queues_job(auth_client, monkeypatch):
    async def fake_run(job_id, client=None):
        return None

    monkeypatch.setattr("app.api.comfyui.run_generation_job", fake_run)
    resp = auth_client.post(
        "/api/comfyui/generate", json={"character_id": "luna", "tier": 1, "prompt": "x"}
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["status"] == "queued"

    job_id = body["id"]
    assert auth_client.get(f"/api/comfyui/jobs/{job_id}").status_code == 200
    # Bild noch nicht fertig -> 409
    assert auth_client.get(f"/api/comfyui/image/{job_id}").status_code == 409


def test_job_status_unknown_404(auth_client):
    assert auth_client.get("/api/comfyui/jobs/nope").status_code == 404


def test_liveops_config_and_leaderboard(auth_client):
    cfg = auth_client.get("/api/liveops/config")
    assert cfg.status_code == 200
    assert cfg.json()["rounds_per_character"] == 5

    auth_client.post("/api/liveops/leaderboard/submit", json={"board_id": "daily", "score": 100})
    top = auth_client.get("/api/liveops/leaderboard/daily")
    assert top.status_code == 200
    assert top.json()[0]["score"] == 100
