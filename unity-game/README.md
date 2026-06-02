# Heart & Match — Unity-Client

Unity-Projekt des Spiels. Enthält die vollständige, testbare Spiellogik (Match-3, Ball-Sort,
Beziehungssystem, Economy, Rewards) und die Anbindung an das Backend.

## Voraussetzungen

- **Unity 6000.0 LTS** (siehe `ProjectSettings/ProjectVersion.txt`; andere Versionen funktionieren ggf.
  mit Anpassung der Packages).
- Beim ersten Öffnen löst Unity die Packages aus `Packages/manifest.json` auf (TextMeshPro,
  Localization, Newtonsoft.Json, Test-Framework).

## Projektstruktur (`Assets/Scripts/`)

| Ordner | Inhalt |
|---|---|
| `Core/` | GameManager, GameState/SaveSystem, EventBus, ServiceLocator, ContentTier, DeterministicRng |
| `Data/` | ScriptableObjects (Character, Gift, Level, Configs) + LevelFactory + DefaultContent |
| `Tamagotchi/` | RomanceTiers, MoodSystem, RelationshipManager, NeedsSystem, CharacterRotation, GiftAffinity |
| `Minigames/Match3/` | Board, MatchDetector, SpecialFactory, ComboMatrix, Match3Effects, Match3Resolver, Objectives, Session |
| `Minigames/BallSort/` | Tube, BallSortBoard, LevelGenerator, BallSortSession |
| `Economy/` | Wallet, EnergySystem, Shop, GachaSystem |
| `Rewards/` | IRewardProvider, LocalRewardProvider, ComfyUIRewardProvider, UnlockManager |
| `Networking/` | BackendClient (UnityWebRequest), DTOs, IGenerationClient |
| `Platform/` | Abstraktionen (Analytics/Ads/Store/RemoteConfig) + Stubs, AgeGate |

## Architektur-Prinzipien

- **Reine, UnityEngine-freie Logik** für alle Spielsysteme → vollständig im EditMode testbar und
  deterministisch (seedbarer RNG).
- **Daten­getrieben** über ScriptableObjects; Erweiterungs-Interfaces (`IMinigameSession`,
  `IRewardProvider`, `IStore`, `IAds`, `IAnalytics`, `IRemoteConfig`) mit lokalen Defaults.
- **Modell/View-Trennung**: MonoBehaviours sind dünne View-/Input-Schichten über den Logik-Klassen.

## Build-Varianten (Scripting Define Symbols)

- **`CONTENT_SFW`** (Standard) — Google Play, jugendfrei, max. Romance-Tier 5.
- **`CONTENT_ADULT`** — itch.io / eigene APK, Age-Gate aktiv, Romance-Tier 6.

Setzen unter *Project Settings → Player → Scripting Define Symbols* (oder per Build-Skript).

## Tests ausführen

*Window → General → Test Runner → EditMode → Run All*. Abgedeckt:
Match-3 (Detection, Specials, Resolver, Farbbombe), Ball-Sort (Moves, Generator), Beziehung (Tiers,
Gains, Verfall), Economy (Wallet, Energie, Shop, Gacha-Pity), Rotation, Reward-Provider-Fallback.

## Spielbarer Einstieg

`DefaultContent` erzeugt zur Laufzeit ein Beispiel-Roster und Beispiel-Level, sodass die Logik ohne
manuelles Asset-Authoring lauffähig ist. Für Produktion kuratierte Assets über das
`HeartMatch/...`-CreateAssetMenu anlegen. Backend-URL im `GameManager`-Inspector setzen
(Standard `http://localhost:8000`).

> Inhalts-Richtlinie: ausschließlich fiktive, erwachsene Charaktere. Siehe
> [`../docs/CONTENT_POLICY.md`](../docs/CONTENT_POLICY.md).
