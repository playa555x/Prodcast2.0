# Recherche: Technischer Aufbau erfolgreicher Puzzle-Games (Architektur & Live-Ops)

> Ergänzung zu `RESEARCH_GAME_DESIGN.md` (Spiel-Design) und `RESEARCH_GAME_DESIGN.md`-Juice.
> Hier: **wie solche Spiele technisch gebaut & betrieben werden** — Code-/Engine-Architektur (Unity)
> und Live-Ops/Backend-Infrastruktur. Quellen mit Konfidenz-Flags: ✅ etabliert · ◐ Einzelquelle/Meinung.

---

## TEIL 1 — Code-/Engine-Architektur (Unity Match-3)

**Das eine Leitprinzip (✅, in jeder Quelle):** **Logik-Modell strikt von der View (MonoBehaviours) trennen.**
Reines C#-Modell (Brett, Matching, Scoring) ohne `UnityEngine`-Abhängigkeit → in eigener asmdef →
voll unit-testbar ohne offenen Editor. Die View liest Modell-Events und spielt Tweens ab.

### Kernbefunde (✅ wo nicht anders markiert)
1. **Board = flaches 1D-Array hinter `Grid2D<T>`** (`x + y*w`), nicht mehrdimensional (Unity serialisiert
   das nicht), nicht ECS (Brett ist winzig ~64–96 Zellen → OO-Klarheit gewinnt). View hält ein paralleles
   `Grid2D<TileView>`.
2. **Cascade-Pipeline als feste, animationsunabhängige Sequenz:** swap → findMatches → clear → gravity →
   refill → re-check → bis stabil. MY.GAMES tickt deterministisch (20 Hz) mit geordneter Tick-Liste.
   **Animation gated nur den Input, nie die Logik.** (deckt sich mit unserem `resolveBoard`.)
3. **Match-Erkennung = Zwei-Pass-Scan** (Reihen, dann Spalten) → `List<Match>` (Position/Länge/Richtung),
   **nicht** sofort clearen → ermöglicht Spezialstein-Erkennung + Batch-Clear.
4. **Spezial-/Booster-Steine datengetrieben:** Spawn aus Match-Geometrie (4→Rakete, 5→Farbbombe, L/T→Bombe);
   **Kombi-Matrix** `(TypeA×TypeB)→Effekt` als Lookup, nicht als switch. Unity „Gem Hunter Match" nutzt
   ScriptableObjects für Booster.
5. **Level datengetrieben (ScriptableObject/JSON) + eigener In-Editor-Level-Editor.** King-GDC-Talks drehen
   sich ganz um Authoring-Tooling. ◐ Empfehlung: JSON-Export für Live-Ops-Hotupdates ohne App-Build.
6. **Game-Flow = endliche Zustandsmaschine** (Idle→AwaitInput→Swap→Resolve→CheckGoals→Win/Lose); Input
   während Resolve gesperrt. **Events/Observer** nur fürs Modell→View-Entkoppeln; Cascade selbst per direkten
   Methodenaufrufen (Determinismus).
7. **Animations-/Tween-Layer komplett view-seitig** (DOTween), per „busy"-Flag gated. Nie Positionen
   mitten im Tween für Match-Erkennung lesen.
8. **Deterministischer RNG:** **Instanz** `System.Random(seed)` statt statischem `UnityEngine.Random`;
   Daily-Seed = Datums-Hash. MY.GAMES nutzt Fixed-Point für geräteübergreifende Replays + Replay-Log
   (seed + Tick + Input + Checksum) zur Bug-Repro & Balancing.
9. **Solvability:** nach jedem Settle `HasValidMove()` (jeden Swap testen, lokal prüfen, zurück) → sonst
   `Shuffle(seed)`. Volle Level-Lösbarkeit ist NP-hart, „gibt's ≥1 Zug" ist trivial.
10. **Testing:** EditMode-Unit-Tests aufs reine Modell (Match/Gravity/Refill/Combo/RNG). King fährt
    **AI-Bots**, die Level tausende Male spielen → Schwierigkeits-/Winrate-Metriken (durch seedbares Modell möglich).

### Empfohlene Unity-Architektur (zwei asmdefs erzwingen die Grenze)
```
/Core  (Match3.Core.asmdef — reines C#, KEINE UnityEngine-Gameplay-Deps, voll getestet)
  Board/        Grid2D<T>, Cell/TileState, Board
  Resolution/   MatchFinder, CascadeResolver, GravitySystem, RefillSystem, SolverUtils
  Specials/     BoosterEffect, CombinationMatrix
  Flow/         GameStateMachine, GoalTracker
  Services/     IRandom + SeededRandom
  Events/       IBoardEvent records (OnMatch/OnCleared/OnSpawn/OnFall/OnBoosterSpawn)
  -> Output: geordneter, animationsunabhängiger ResolveStep-Eventstream
/Game  (Match3.Game.asmdef — MonoBehaviours, referenziert Core)
  View/         BoardView, TileView (DOTween), AnimationQueue (busy-Flag), InputController
  Data/         LevelDefinition, LevelList, BoosterDefinition, GemDefinition (ScriptableObjects)
  Bootstrap/    LevelLoader (SO/JSON -> Core.Board)
  VFX/Audio/UI  (Event-Queue-Pattern hier ok)
/Editor (Match3.Editor.asmdef) LevelEditorWindow (Grid-Painter -> LevelDefinition/JSON)
/Tests  (Match3.Tests.asmdef, EditMode) MatchFinder/Cascade/Gravity/BoosterCombo/Solver/Rng
```
**Zuerst definieren:** `IRandom`, `IBoard` (read-only), `ResolveStep`/Event-Record, `IBoosterEffect`.
**Invarianten:** (1) Core löst Cascade synchron+deterministisch, View spielt ab; (2) Animation gated nur
Input; (3) ein seedbarer RNG, Daily=Datums-Hash; (4) nach Settle `HasValidMove()`→sonst Shuffle;
(5) Specials/Level = Daten, nicht Code-Branches.

*Quellen:* MY.GAMES „Divide and Conquer" (bestes Einzelstück), Catlike Coding Match-3, Unity „Gem Hunter
Match", Azumo, Game Programming Patterns (State/Event Queue), King-GDC (Level-Design/AI-Bots), arXiv 1403.5830 (NP-Härte).

---

## TEIL 2 — Live-Ops / Backend-Infrastruktur

**Leitlinie (✅):** Top-Match-3 (Royal Match, Candy Crush, Homescapes) sind **von Tag 1 auf Live-Ops
ausgelegt**, fahren **4–6 gleichzeitige Events**, und liefern das **meiste als Server-Config + Download-
Content statt App-Update**. Der Client ist ein „dummer Renderer" server-getriebener Config. ◐ Deconstructor
of Fun: der Wettbewerbsvorteil ist **Live-Ops-Velocity/Tooling**, nicht neue Kernmechanik.

### Kernbefunde
1. **Remote-Config (Fundament):** Dashboard-Keys → SDK holt bei App-Start → Code liest per Key → mit
   **bundled Safe-Defaults** als Fallback. Tuning von Saison-Content, Balancing, Monetarisierung, Ads,
   Schwierigkeit ohne Binary-Update. **Pro Segment** (Whales/Churner/Land/Version) verschiedene Config.
2. **A/B-Testing** liegt **auf** der Config (Varianten-Keys überschreiben Basis). Match-3-Difficulty-Tests:
   3-Gruppen (aktuell/leichter/neu); Metriken: Winrate (±Booster), Versuche/Completion, ausgegebene Währung,
   7-Tage-Churn; ~1.000 Completions für Signifikanz. **Leichter ≠ besser:** senkt Churn, kann aber ARPU senken.
3. **DDA (Dynamic Difficulty)** via Seed-Determinismus + unmerkliche Tweaks (Farb-Spawn −20–30 %, Hilfe nach
   X verbrauchten Zügen). EA: bis +9 % Engagement bei neutraler Monetarisierung.
4. **Analytics-Taxonomie (✅):** session start/end, business (IAP+Receipt), resource (Währung Quelle/Senke),
   progression (level start/fail/complete + Versuch#/Züge/Zeit), design/custom (Funnel/Ads). KPIs: D1/D7/D30,
   DAU, Session-Länge, Conversion, ARPDAU, LTV. Match-3-Benchmarks: D1 40–50 %, D7 ~20 %, D30 ~10 %; Hybrid-
   Casual ARPDAU $0,15–0,50. Jedes Event trägt: player_id, session_id, app_version, platform, segment, Experiment-Variante.
5. **Cloud-Save/Account & Anti-Cheat:** kompetitive Surfaces (Leaderboards) **server-authoritativ**; Single-
   Player-Progress kann client-seitig sein. ◐ Pragmatisch: Server-Plausibilitätscheck (Score ≤ theoret. Max
   pro Level/Seed), Rate-Limiting, server-authoritative Währung statt voller Replay-Validierung.
6. **Events/Battle-Pass/Leaderboards = Config + Assets:** generisches Schema
   `{event_id,type,start,end,segment,rules_config,reward_table,asset_bundle_ref}`; Engine generisch, Event = Daten.
7. **Asset-Delivery:** Unity **Addressables** + Remote-Catalog (JSON+Hash), nur geänderte Bundles laden +
   cachen; local (Onboarding/Core) vs remote (on-demand); neuer Content via immutable Release + „latest"-Badge.
8. **Backend-Plattform:** PlayFab (komplett, aber Free-Tier 03/2026 stark gekürzt), Firebase (Auth/Remote-
   Config/Analytics, aber keine Game-Leaderboards/Economy), Nakama (open-source, self-host, authoritativ).
   ◐ Für uns: **eigene Spiel-Logik in FastAPI** (Economy/Progression/Config-Resolver/Events/A/B), Commodity
   (Analytics-Pipeline, Asset-CDN) zukaufen statt nachbauen.
9. **Zwei Release-Tracks:** (1) Content/Config-Track (jederzeit, ohne Store-Review) entkoppelt von
   (2) Binary-Track (Store-Kadenz), versioniert gegen min-app-version.

### Empfohlene Minimal-Architektur (unser Unity-Client + FastAPI)
**Client-Boot:** Device-Auth → Config holen (Segment+Experiment-aufgelöst) → aktive Events → Addressables-
Catalog-Check → geänderte Bundles laden. Bundled Safe-Defaults + lokaler Core/Onboarding → offline spielbar.
**FastAPI + Postgres + Redis:** (1) Auth/Account (Device→Apple/Google/E-Mail, Cloud-Save), (2) Config-Resolver
(layered: base→segment→A/B, versioniert), (3) Experiment-Service (`hash(player_id+exp_id)`→Variante, auf Events
gestempelt), (4) **server-authoritative** Economy/Progression (Postgres = Source of Truth, Client schickt
Aktionen/Ergebnisse, Server validiert), (5) Events/Season (generisches Schema), (6) Leaderboard (Redis Sorted
Sets pro Event/Season), (7) Analytics-Ingest (`/events` batch → D1/D7/D30/ARPDAU/Difficulty-Metriken),
(8) Content-Delivery (Addressables-Catalog + gehashte Bundles auf CDN, Channel→Release-Badge).
**Build-Reihenfolge:** Config-Resolver + Safe-Default-Client zuerst → Analytics+A/B → server-auth Economy →
Events/Leaderboards → Addressables-Pipeline.

*Quellen:* GameAnalytics (Remote-Config/A/B), Gamigion (Match-3 DDA), Unity Addressables/CCD-Docs, LEADR
(Backend-Vergleich 2026), PlayFab-Free-Tier-Kürzung, Galaxy4Games (4–6 Events), PlayFab/GDC LiveOps,
Deconstructor of Fun (LiveOps-Velocity), GameAnalytics-Event-Taxonomie, Playio/Tap-Nation (KPIs/Benchmarks).

> **Caveat:** Die *internen* Architekturen von King/Dream Games/Playrix sind nicht öffentlich. Diese Befunde
> sind belastbare **Branchen-Muster** aus Plattform-Docs, GDC-Talks und Deconstructions — keine bestätigten
> Interna der konkreten Studios.

---

## Bezug zu unserem Projekt (Status)
- ✅ Unser FastAPI-Backend folgt bereits dem Muster (Auth, Save, server-seitige Rewards, Live-Ops-Config-Stub
  in `backend/app/api/liveops.py`).
- ✅ Web-Prototyp & geplanter Unity-Client trennen Logik/View (reine Resolver-Logik, seedbar) — passt zu Teil 1.
- ▶ Nächste sinnvolle Schritte aus dieser Recherche: Config-Resolver segment-/A/B-fähig machen, Analytics-Event-
  Taxonomie definieren, Level als JSON-Daten + späterer Editor, Addressables/Asset-Channel fürs CDN.
