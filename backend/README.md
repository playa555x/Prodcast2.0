# Heart & Match — Backend

Schlankes FastAPI-Backend: **ComfyUI-Proxy**, **Cloud-Save**, **Rewards/Galerie** und **Live-Ops-Stubs**.

## Setup

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # und anpassen (mind. JWT_SECRET)
```

## Starten

```bash
uvicorn app.main:app --reload
# -> http://localhost:8000/api/health
# -> http://localhost:8000/docs  (OpenAPI / Swagger UI)
```

## Tests

```bash
pytest        # 24 Tests (Auth, Save, Rewards, ComfyUI-Client + Endpoints, Live-Ops)
```

## Endpoints (Überblick)

| Methode | Pfad | Zweck |
|---|---|---|
| POST | `/api/auth/register` | Gerät registrieren → JWT |
| POST | `/api/auth/login` | Login per `device_id` → JWT |
| GET | `/api/auth/me` | aktuelles Player-Profil |
| GET/PUT | `/api/game/save` | Cloud-Save laden/speichern |
| GET | `/api/rewards` | freigeschaltete Belohnungen |
| POST | `/api/rewards/unlock` | Belohnung freischalten (idempotent) |
| POST | `/api/comfyui/generate` | Generierung anstoßen → Job |
| GET | `/api/comfyui/jobs/{id}` | Job-Status |
| GET | `/api/comfyui/image/{id}` | fertiges Bild ausliefern |
| GET | `/api/liveops/config` | Remote-Config / Feature-Flags |
| POST | `/api/liveops/leaderboard/submit` | Score einreichen |
| GET | `/api/liveops/leaderboard/{board}` | Top-Scores |

## ComfyUI-Anbindung

Das Backend ist **modell-agnostisch**. Es lädt `workflows/portrait_template.json` (generisch, SFW),
injiziert Parameter (Prompt/Seed/Auflösung …) und reicht den Workflow an die unter `COMFYUI_BASE_URL`
laufende ComfyUI-Instanz weiter. Details: [`../docs/COMFYUI_INTEGRATION.md`](../docs/COMFYUI_INTEGRATION.md).

> **Wichtig:** Welche Modelle/LoRAs in ComfyUI geladen sind, bestimmen ausschließlich die Betreiber:innen
> der Instanz. Siehe [`../docs/CONTENT_POLICY.md`](../docs/CONTENT_POLICY.md).
