# Game Design — Heart & Match

Beziehungs-/Tamagotchi-Spiel + Puzzle-Minispiele. Man umwirbt fiktive, erwachsene Charaktere, sammelt
durch Minispiele Punkte/Währung, steigert die Sympathie und schaltet Belohnungen frei. Nach je 5
Story-Beats wechselt der aktive Charakter.

## Loops

- **Sekunden:** Zug im Minispiel → Feedback (Partikel/Combo/Sound/Haptik).
- **Minuten:** Minispiel → Punkte/Währung → in Charakter investieren → Sympathie↑ → Belohnung.
- **Tage:** Energie, Daily Quests, Login-Streak, Daily Challenge.
- **Wochen:** Battle-Pass/Saison, Events, Roster vervollständigen, Galerie 100 %.

## Beziehungssystem

Stats (0–100): **Affection** (Kern, gated Belohnungen), **Trust** (tiefere Tiers), **Mood**
(Multiplikator), **Tension** (nur Adult, Richtung Intim), **Boredom** (senkt Gains).

`gain = base · (0.5 + Mood/100) · affinity · (1 − Boredom/200)`

**Romance-Tiers** (Gate Affection/Trust, Tier 6 zusätzlich Tension; SFW max. Tier 5):

| Tier | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|
| Affection | 15 | 35 | 55 | 70 | 85 | 95 |
| Trust | 0 | 20 | 40 | 50 | 65 | 80 |
| Tension | – | – | – | – | – | 70 |

Persönlichkeits-Archetypen bestimmen über Geschenk-Tags die Affinität (×1.8 geliebt / ×0.5 ungeliebt).
Echtzeit-Verfall (Tamagotchi): Affection −1/h, Trust −0.25/h, Mood −4/h.

## Charaktere

Daten-Asset je Charakter (Pflichtfeld **Age ≥ 18**). Freischaltung **Story-basiert** (Basis-Roster)
**und Gacha** (seltene/Event-Charaktere, Pity-Timer). Start-Roster 8 (DefaultContent).

## Minispiele

- **Match-3:** 8×8, 6 Farben; Spezialsteine (4er→Rakete, L/T→Bombe, 5er→Farbbombe) + Kombi-Matrix
  (z.B. Farbbombe+Farbbombe = Board-Clear); Ziele: Score / Sammle Farbe (erweiterbar: Blocker,
  Ingredient-Drop, Zeit); Combo-Multiplikator +20 %/Kaskade.
- **Ball-Sort:** N Röhren, lösbar generiert (Rückwärts-Mischen), Undo, Soft-Lock-Erkennung; Varianten
  als Hooks (verdeckt/gesperrt/Joker/Limits).
- **Modi:** Story, Endlos/Arcade, Daily Challenge (Seed), Events/Saison, Hard/Heroic, Date-Modus.

## Economy

Währungen: **Coins** (soft), **Gems** (premium), **Energy** (begrenzt Sessions, Regen 1/20 min),
**Event-Token**. XP/Level (`xp_next = 50·level^1.5`), Achievements, Daily/Weekly Quests, Collections.
Monetarisierung gekapselt: IAP, Battle-Pass, Rewarded-Ads, Pity-Gacha. SFW → Play-Billing,
Adult → externer Provider.

## Belohnungen / Galerie

Reward-Tiers an Romance-Tier gekoppelt. Inhaltsquelle austauschbar: `LocalRewardProvider`
(SFW-Platzhalter) ↔ `ComfyUIRewardProvider` (on-demand, gecacht). Galerie mit Sammelfortschritt,
Sperr-Vorschau, Favoriten. Fehler-Fallback + Retry.

## Build-Varianten

`CONTENT_SFW` (Google Play, jugendfrei) und `CONTENT_ADULT` (itch.io/APK, Age-Gate, Tier 6).
Gleiche Logik, unterschiedliche Asset-Sets/Zahlungspfade.

## Roadmap

1. **Fundament** (dieser Stand): beide Minispiele, voller Loop, Economy, Rewards, Backend, Tests.
2. Blocker/Objective-Vielfalt, Dialog/Quests/Dates, volle Progression, Battle-Pass, weitere Minispiele.
3. Live-Ops/Events/Seasons, Leaderboards, Cloud-Save, echte SDKs (IAP/Ads/Analytics), L10n/A11y.
4. Finale Art/Audio/Animation, Balancing, Store-Assets, ComfyUI-Workflows pro Charakter, zwei Tracks live.
