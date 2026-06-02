# Heart & Match

Ein Mobile-Game (Unity, C#), das ein **Tamagotchi-/Beziehungsspiel** mit **Puzzle-Minispielen**
(Match-3 + Ball-Sort) verbindet. Spieler:innen umwerben/helfen fiktiven, erwachsenen Charakteren,
sammeln durch Minispiele Punkte und Währung, steigern die Sympathie und schalten Belohnungen frei.
Nach je 5 Story-Beats wechselt der aktive Charakter.

> **Status:** Phase-1-Fundament. Das Unity-Projekt liegt unter [`unity-game/`](unity-game/), das
> Backend (ComfyUI-Proxy + Cloud-Save/Meta) unter [`backend/`](backend/). Vollständige Design-Bibel
> und Technik-Spezifikation in [`docs/`](docs/).

## Repository-Struktur

| Pfad | Inhalt |
|---|---|
| `unity-game/` | Unity-Client (Spiel). Lokal in Unity öffnen, bauen, APK erzeugen. |
| `backend/` | Schlankes FastAPI: ComfyUI-Proxy, Cloud-Save, Rewards. Hier lauffähig + getestet. |
| `docs/` | `GAME_DESIGN.md`, `ARCHITECTURE.md`, `COMFYUI_INTEGRATION.md`, `CONTENT_POLICY.md` |

## Zwei Build-Varianten

Das Spiel wird über Unity **Scripting Define Symbols** in zwei Varianten gebaut:

- **`CONTENT_SFW`** — jugendfreie Variante (Cartoon/angedeutet) für **Google Play**.
- **`CONTENT_ADULT`** — explizite Variante hinter hartem **Age-Gate**, Distribution über
  **itch.io / eigene APK** (Google Play erlaubt keine expliziten Inhalte).

Die Spiellogik ist identisch; es unterscheiden sich nur Asset-Sets, Age-Gate und Zahlungspfad.

## Inhalts-Richtlinie (verbindlich)

Siehe [`docs/CONTENT_POLICY.md`](docs/CONTENT_POLICY.md). Kurzfassung:

- Ausschließlich **fiktive, erwachsene** Charaktere. **Keine** realen Personen, **keine** Deepfakes,
  **kein** CSAM.
- Das Repo enthält **keine** expliziten Modelle, Prompts oder Assets — nur einen generischen
  Generierungs-Mechanismus und **SFW-Platzhalter**. Explizite Inhaltserzeugung erfolgt ausschließlich
  auf der **eigenen ComfyUI-Instanz** der Nutzer:innen, in deren Verantwortung.

## Schnellstart

### Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pytest                       # Tests
uvicorn app.main:app --reload  # Dev-Server -> http://localhost:8000/api/health
```

### Unity
Projekt `unity-game/` in Unity (siehe `unity-game/README.md` für die Zielversion) öffnen, Packages
auflösen lassen, EditMode-Tests im Test Runner ausführen, Play-Mode starten.

## Roadmap

Phase 1 (dieses Fundament) → Phase 2 (Tiefe Spielsysteme) → Phase 3 (Live-Ops/SDKs) → Phase 4
(Content & Polish, zwei Build-Tracks live). Details in [`docs/GAME_DESIGN.md`](docs/GAME_DESIGN.md).
