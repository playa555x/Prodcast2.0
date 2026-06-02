# Architektur

## Überblick

```
┌─────────────────────────────┐        HTTP/JSON        ┌──────────────────────────┐
│   Unity-Client (unity-game) │  ───────────────────▶   │  Backend (FastAPI)       │
│                             │   Auth / Save / Reward   │                          │
│  - Reine Spiellogik         │  ◀───────────────────   │  - Auth (JWT, Device-ID) │
│  - ScriptableObject-Daten   │                          │  - Cloud-Save            │
│  - MonoBehaviour-Views      │                          │  - Reward-Unlocks        │
│  - BackendClient            │                          │  - ComfyUI-Proxy ────────┼──▶ ComfyUI
│                             │                          │  - Live-Ops (Stubs)      │   (extern, GPU,
└─────────────────────────────┘                          └──────────────────────────┘    Nutzer-Instanz)
```

## Client-Schichten

1. **Reine Logik** (`Core`, `Minigames`, `Tamagotchi`, `Economy`, `Rewards`-Logik): keine
   UnityEngine-Abhängigkeit, deterministisch, im EditMode getestet.
2. **Daten** (`Data`): ScriptableObjects (Character/Gift/Level/Configs) + `LevelFactory`
   (Daten → Logik-Configs) + `DefaultContent` (Runtime-Beispiele).
3. **Views/Glue** (MonoBehaviours: `GameManager`, `AgeGate`, später UI-Screens): dünne Schicht,
   die Logik instanziiert, Eingaben weiterreicht und über den `EventBus` reagiert.
4. **Plattform** (`Platform`, `Networking`): austauschbare Implementierungen hinter Interfaces.

## Entkopplung

- `ServiceLocator` + `EventBus` (Pub/Sub) statt harter Referenzen.
- Erweiterungs-Interfaces mit lokalen Defaults: `IMinigameSession`, `IRewardProvider`, `IGenerationClient`,
  `IStore`, `IAds`, `IAnalytics`, `IRemoteConfig`.

## Datenfluss "Belohnung freischalten"

1. Minispiel endet → `MinigameResult` (Score/Coins/Stars).
2. `Wallet`/`EconomyManager` bucht Coins; Spieler investiert → `RelationshipManager.ApplyInteraction`.
3. Steigt die Tier (`RomanceTiers.ComputeTier`), liefert `UnlockManager.SyncUnlocks` neue Tiers.
4. `IRewardProvider.GetReward` beschafft das Asset: `ComfyUIRewardProvider` → `BackendClient` →
   Backend → ComfyUI; bei Fehler Fallback auf `LocalRewardProvider`.
5. Unlock wird lokal gespeichert und optional via Backend (`/api/rewards/unlock`) synchronisiert.

## Persistenz

- Lokal: `SaveSystem` schreibt `GameState` als JSON (`Application.persistentDataPath`), mit Versions-/
  Migrationsfeld und Schutz gegen beschädigte Dateien.
- Cloud (optional): `/api/game/save` (PUT/GET) — der Client bleibt Quelle der Wahrheit über das Schema.
