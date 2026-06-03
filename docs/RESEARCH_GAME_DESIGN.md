# Recherche: Aufbau erfolgreicher Puzzle-Games — Erkenntnisse für „Heart & Match"

> Tiefenrecherche (5 parallele Such-Spuren, Mehrquellen-Verifikation) zu Animationen/„Juice",
> progressiven Hindernissen, Ball-Sort-Design, Progression/Retention und Dating-Sim-Hybriden.
> Ziel: konkrete, übernehmbare Design-Entscheidungen für **Phase 2** (Hindernisse + Animationen).
>
> **Konfidenz-Legende:** ✅ etabliert (mehrere Quellen) · ◐ plausibel (Einzelquelle/Analyst) · ⚠ unsicher/Fan-Quelle.
> Konkrete Zahlenwerte sind gute **Startwerte zum Tunen**, keine Industrienormen.

---

## 0. Executive Summary — die 10 wichtigsten Übernahmen

1. **Nie linear interpolieren.** Easing pro Ereignis: Spawn → ease-out/Bounce.Out, Fall → ease-in + Landing-Overshoot, Clear → Scale-up-then-down + Fade. ✅
2. **„Bigger action = bigger feedback".** Feedback-Stärke an Seltenheit/Power koppeln: normale Matches kurz/schnell, Spezialsteine groß (VFX + Hit-Stop + Screenshake + Audio). ✅
3. **Concurrent matching** (Royal-Match-Trick): Eingabe nicht sperren, während Kaskaden auflösen — größter „Responsiveness"-Gewinn. ◐
4. **Ein neuer Blocker pro „Episode" (~15 Level), einfachste zuerst;** spreizende/spawnende/Countdown-Bedrohungen erst nach dem Hook (~Level 90+). ✅/⚠
5. **Neue Mechanik isoliert lehren:** Debüt-Level enthält *nur* das neue Element + animierter Hand-Pointer + geführter erster Zug. ✅
6. **Schwierigkeit primär über Zuganzahl steuern**, nicht nur Brett-Komplexität. ◐
7. **5-Level-Zyklus** (Royal Match): Level 1 leicht → Level 5 am schwersten; „Hard/Super-Hard" in festen Intervallen + Erholungs-Level dazwischen (werden seltener). ◐
8. **Loss-Aversion-Continue:** Level oft 1–2 Züge zu knapp → „+5 Züge"-Angebot genau im Verlustmoment; Streak-Belohnungen verfallen bei Niederlage. ✅
9. **Lives/Energie:** 5 Leben, 1 Leben/30 Min Regen (Candy-Crush-Standard). ✅
10. **Beziehungs-Loop koppeln:** Puzzle-Sieg → Währung → Geschenke (Vorlieben!) → Affection-Schwelle → Galerie/Szene **und** kleiner Stat-/Bonus-Rückfluss in den Puzzle-Loop. ✅

---

## 1. Animationen & „Juice"

**Cascade-Pipeline (Kernregel):** Jede Animation muss fertig sein, bevor das System die Tile-Position
neu liest — sonst Fehl-Matches auf noch bewegten Steinen. ✅
Referenz-Timeline (◐ Einzelquelle, gute Defaults): Match-Partikel 0.0s → Tile Scale/Fade-out 0.0–0.15s →
Score-Popup 0.1s → Fall 0.2s → neue Tiles spawnen+fallen 0.3s → nächster Match-Check 0.5s.

**Baseline-Dauern (◐ tunen):** Swap ~0.25s · Tile-Zerstörung ~0.15s · Fallen ~0.2s · Pop-in Scale 0.8→1.0
über ~300ms mit Bounce.Out.

**Easing pro Ereignis (✅):** Spawn = ease-out / Bounce.Out · Fallen = ease-in + Bounce/Overshoot beim
Landen · Clear = schnelles Scale-up→down + Fade. Exponential-Easing für harten Impact, Quadratic für weicher.

**Squash & Stretch + Anticipation/Follow-through (✅):** Beim Landen vertikal stauchen, beim Spawn strecken;
Intensität skaliert mit Kraft. Kurze „Jelly"-Wackelbewegung beim erfolgreichen Swap/Landen. Mini-Wind-up vor
dem Swap, Overshoot danach.

**Impact-Betonung (✅):** Hit-Stop/Freeze-Frame ~2–8 Frames (länger bei großem Combo/Level-Clear) beim Zünden
von Spezialsteinen · Screenshake mit Amplitude UND Dauer skaliert nach Wichtigkeit (kleiner Match = kein Shake)
· Partikel auf Match-Punkt, Burst bei Zerstörung; Trails bei fliegenden Boostern (beim Treffer ausblenden).

**Audio (~halbe Miete) (✅):** Sofort-Feedback auf jede Aktion; Combo-Eskalation via steigender Tonhöhe
(klassische Match-3-Tonleiter); Pitch-Randomisierung ±5–10% gegen „Maschinengewehr"-Ermüdung; Sound-Layering
+ leichte Kompression, damit Wichtiges „durchsticht".

**Royal-Match-Tempo-Tricks (◐, aber breit bestätigt):** Animationen „kurz, flüssig, gerade genug"; **concurrent
matching** (weiterspielen während Kaskaden laufen); Reibungs-Screens entfernen (kein Zielbildschirm bei Retry);
fette, kontrastreiche, sofort lesbare Steine. „Lebendiges Brett": sanfte Idle-Bewegung via Sinus/Cosinus (~0.5–1.5 Hz).

*Quellen:* Azumo (Match-3-Logik/Timing); dev.to pixi.js Match-3 #103 (Pop-in/Bounce.Out/300ms);
GameDeveloper.com & GameAnalytics (Juice: Easing/Hit-Stop/Shake/Audio/Pitch); ironSource LevelUp „Design Deep
Dive: Royal Match"; Jonasson & Purho „Juice It or Lose It" (GDC, kanonische Referenz).

---

## 2. Progressive Hindernisse / Blocker

### Katalog & Einführungs-Reihenfolge (Candy Crush, ⚠ Fan-Wiki: Reihenfolge hoch-, exakte Level mittel-konfident)

| Phase | Level (ca.) | Blocker | Effekt |
|---|---|---|---|
| Onboarding | L2 / L11 | Icing/Frosting (1–5 Schichten) / Marmelade | statisch, je 1 Treffer pro Schicht / Hülle löst sich bei 1 Match |
| Früh | L21 / L36 | Liquorice **Lock** / Swirl | Stein nicht tauschbar / statischer Einzel-Blocker |
| Mitte | L96 | **Candy Bomb (Countdown)** | muss vor Counter=0 weg, sonst verloren → Zeitdruck |
| Mitte | L141 / L186 | **Chocolate (breitet aus)** / Fountain (Spawner) | selbst-replizierende Bedrohung |
| Mitte-Spät | L261–L486 | Bubblegum, Toffee Swirl, **Cake Bomb (2×2)**, Sugar Chest | mehrstufig / flächig / Container |
| Spät | L800+ | exotische Blocker | ~1 neues Element pro Episode |

**Royal Match (◐):** Box (L1–3) → Grass (L4–6) → dann **~alle 10 Level ein neues Hindernis** (Cupboard, Mailbox-Spawner,
Royal Egg, Potion Bottle = Matches aller 4 Farben, **Jelly das sich *ausbreitet*** statt geräumt wird, Seed Box/Honey/Bot Crate).
**Toon Blast (◐):** Booster an festen Meilensteinen (Rocket/Bomb/Disco L7, Hammer L9, …), Hindernisse ab L11/14/21/31.

### Schwierigkeitskurve (◐, mehrere Analysten)
- Nach Tutorial **10–20 leichte Level** zum „Landen" → dann Medium → **Blöcke aus Hard-Levels mit Erholungs-Levels
  dazwischen, die seltener werden.** Periodische **„Super-Hard"-Level als weiche Paywalls**.
- **Primärer Hebel = Zuganzahl** (Level auf 20 Züge kalibriert + 23 gegeben = exponentiell leichter).
- **Zyklen:** Royal Match **5-Level-Zyklus** (L1 leicht → L5 am härtesten); Toon Blast **10-Level-Zyklus** (Peak bei L5 „Hard",
  Eskalation zu „Super-Hard" am Ende), gelegentlich *unmarkierte* Hard-Level als Störfaktor.
- **Near-Miss-Psychologie (✅, peer-reviewed):** knappe Niederlagen erzeugen den stärksten Weiterspiel-Drang →
  Schwierigkeit gezielt auf häufige knappe Verluste nahe Hard-Levels kalibrieren.

### Zielarten (✅)
Clear-Obstacles · Collect N Items (über benachbarte Matches) · Ingredient-Drop (nach unten bringen) · Multi-Condition
(z.B. Bottle braucht alle 4 Farben) · **Mixed Mode (häufigster Typ, ~36%)**. Moderne Candy Crush: **alle move-limitiert,
keine Timed-Level mehr** (Timed ~2018, Moves/Score ~2021 entfernt).

### Neue Mechanik lehren (✅)
**„Isolated easy intro level":** neuer Blocker debütiert in leichtem Level mit *nur* diesem Element. Toon-Blast-Muster:
(1) animierter **Hand-Pointer** + kurzer Text, (2) geführter erster Test-Zug. UI: Overlay, restriktives/vorgesetztes Brett,
alles außer relevanten Tiles abdunkeln.

*Quellen:* cheats4game.com & candycrush.fandom (Blocker/Level-Typen, ⚠ Fan); Dreamgames Help (Royal-Match-Elemente);
ekinmelissezer (Royal Match/Toon Blast Analysen); abbirbir & gamigion (Schwierigkeitskurve); NCBI PMC5445157 (Near-Miss).

---

## 3. Ball-Sort / Water-Sort Design

**Kernregel (✅):** Nur oberste Kugel bewegen; Ziel leer ODER Top-Farbe passt. Sieg = jede Röhre einfarbig-voll oder leer.
**Standard-Parameter (✅):** Kapazität **4**, **2 leere Röhren** (N Farb-Röhren + 2 Puffer). Schwierigkeit skaliert via
mehr Farben → mehr Röhren → **weniger leere Röhren** → härtere Startanordnung. (Water-Sort: gleiche Schichten fließen
zusammen; Ball-Sort: strikt einzeln.)

**Varianten (✅ wo markiert):** Hidden/Mystery-Balls (Farbe erst sichtbar wenn oben) ✅ · gelöste Röhren = „locked/done" ✅ ·
**Add-Tube** als Helfer (oft hinter Reward-Ad) ✅ · Joker/Wildcard, Zug-Limit, Timed, gemischte Kapazitäten ⚠ (genre-üblich, hier unbestätigt).

**Level-Generierung — zwei dokumentierte Wege:**
- **Generate-and-verify (✅, besser belegt):** zufällig erzeugen → Solver prüfen (Move-Budget ~20.000) → bei unlösbar verwerfen.
  Wichtig: zufällige Boards sind **nicht** automatisch lösbar.
- **Reverse-Moves vom gelösten Zustand (◐):** vom Lösungszustand legale Züge rückwärts → Lösbarkeit per Konstruktion.
  *(Unser Prototyp nutzt bereits diesen Ansatz — solide, aber Generate-and-verify ist die stärker belegte Garantie.)*

**Solver-Details (✅, gut belegt):** Zustand = Tuple-of-Tubes (bottom→top, hashbar). **DFS mit permutations-invariantem
State-Dedup** (Röhren-Reihenfolge sortieren) ist der praktische Sweet-Spot (Beispiel: 65 Züge in 381 Iterationen vs.
BFS optimal 38 Züge aber >9 Mio Iterationen). **Loop-Schutz nötig:** nicht gemischte Stacks sinnlos in leere Röhren gießen,
keine Farbe zwischen Röhren „bouncen", Züge mit Restfarbe ablehnen.

**Anti-Frust (◐):** „Safe State"-Rückrollen auf bekannt-lösbares Brett; Move-Counter für Effizienz-Challenge.
**Monetarisierung/Retention (◐):** Undo / Hint / Add-Tube (Add-Tube hinter Reward-Ad), Coins für Skins, Remove-Ads-IAP (~3,99 $).
**Feel (◐):** weiche „ASMR"-Gieß-Sounds, ruhige Musik, simple Tap-Quelle→Tap-Ziel-Steuerung.

*Quellen:* calebrob.com (Solver-Trade-offs); lucianbuzzo.com (State/Loop-Schutz); chromaoracle.com (Varianten/Mystery);
kasurdev.blogspot.com (Solvability-by-design/Safe-State); appgamer.com (Monetarisierung).

---

## 4. Progression & Retention-Struktur

**Saga vs. Meta (✅):** Lineare Level-Map, „endlos" via Content-Drops (Royal Match: neue Level alle 2 Wochen). Zwei
Meta-Philosophien: „Puzzle & Decorate" (Homescapes/Royal Match — Renovierung) vs. „Classic" (bewusst ohne Narrative/Deko
für weniger Reibung). **Renovierungs-Meta hinter Puzzle-Siegen via Sterne.**

**Sterne (✅):** Royal-Match-Modell: Sieg = **1 Stern**, Sterne **nicht kaufbar**, werden für Renovierungs-Tasks ausgegeben →
zwingt zurück in Level. Candy-Crush-Modell: **1–3 Sterne** score-basiert (Mastery/Vanity, gated nicht).

**Lives/Energie (✅):** **5 Leben, 1 Leben / 30 Min** (Voll-Refill 2h30), Refill ~0,99 $, Social-Refill von Freunden.
Zweck: Frust → Vorfreude, mehrere Touchpoints/Tag, Burnout-Cap, Monetarisierung.

**Booster (✅):** **Pre-Level** (Rocket/Bomb/Color-Bomb, starten auf dem Brett) vs. **In-Level** (Hammer ohne Zugkosten,
Cross/Cannon/Reshuffle). Verdienen (Events/Streaks/Milestones) **oder** kaufen. Royal-Match **Butler's Gift** (ab **L32**):
gratis Booster für Siegesserie, eskaliert bis 4er-Set, **Reset bei Niederlage** → Retention-Haken + normalisiert Booster-Nutzung.

**Loss-Aversion (✅):** Near-Miss-Design → **+5-Züge**-Angebot im Verlustmoment; eskalierende Preise (Royal Match ~2 $ → 4,35 → 6,65 → 8,95
im selben Level); Streak/Butler-Belohnungen verfallen bei Niederlage.

**Win/Lose-Feedback (◐):** Sieg = Feier (Trompeten/Feuerwerk) + Reward-Einsammel-Animation. Niederlage bewusst „ruthless"
(trauriges Gesicht, großes Null, Upsell).

**Standard-Retention (✅):** tägliche Belohnungen + eskalierende Login-Streaks (7/30-Tage), tägliche „Jackpot"-Events (in
1. Session lösbar), Limited-Time-Events, Leaderboards, Teams/Clans + Gifting, Battle-Pass/Subscription. Trend 2024–25:
**Hybrid „Competition + Personal-Achievement"** (auch Nicht-Gewinner belohnt), **endlose/repeatable Album-Collections** (~alle 2 Monate)
gegen Downtime. Benchmark: ~38 Min/Tag, ~25 % D90/D1.

*Quellen:* Naavik (Royal Match Deep-Dive; Live-Ops-Trends); deconstructoroffun; ekinmelissezer; King Zendesk (Lives);
GameDeveloper (CC-Monetarisierung); ke.ma (Loss-Aversion).

---

## 5. Dating-Sim / Puzzle-Hybrid — Verzahnung der zwei Loops

**Architektur (✅):** Zwei gekoppelte Loops. **Brücke = Ökonomie:** Puzzle/Combat-Loop zahlt Währung/Material/Geschenke
→ Beziehungs-Loop (Geschenke, Story-Energie) → Affection steigt → schaltet CG/Szenen frei **und oft Stat-Bonus zurück in den
Puzzle-Loop** (Horizon Walker: max Affection = **+10 % Stats**). → Beziehungsfortschritt ist *mechanisch* belohnt, nicht nur narrativ.

**Affection/Tiers (✅):** Jede Wahl/Geschenk/Interaktion = quantifizierte „Liebe". Sichtbare vs. versteckte Meter.
Tier-Leiter: Bekannt → Freund → enger Freund → romantisch → Partner. **Schwellen-Gating ist der Kernmechanismus**
(Content gesperrt bis Meter Schwelle überschreitet). Bsp. (◐, titelspezifisch): Horizon Walker 5 Affection-Level mit
kumulativen Schwellen 200/600/1.200/2.000 → Interaktionen/Story-Quests/Nachrichten.

**Geschenke (✅):** Pro Charakter **liked/disliked**; falsches Geschenk „bewegt kaum". Rarität-Tiers + Vorlieben-Bonus
(Horizon Walker: Basis B/A/S/SS/EX = 10/20/30/50/100, **Liked +10, Loved +20**; Favorit verdoppelt). Strategie: „billigstes
am meisten geliebtes" Geschenk = Effizienz-Spannung. Universal-„safe gift" als grindiger Fallback. **Diminishing Returns/Daily-Caps:
⚠ titelspezifisch** (tägliche Engagement-Begrenzung bestätigt, harte Caps nicht universell).

**Galerie-Meta (✅):** Freigeschaltetes ist **sammelbar** (Side-Stories, „Foto-Erinnerungen", Outfits, Szenen) pro Charakter.
Hohe Schreibqualität, damit Figuren „echt" wirken statt Roster-Slots. Auf Adult-Plattformen (Nutaku) als **CG-Galerie zum
Vervollständigen** monetarisiert (Struktur, ⚠ leicht belegt).

**Roster/Gacha (✅):** Roster sammelbar via Gacha (P&D ~5 $/Pull, zufällig); balanciert ohne harte Paywall (F2P-vergleichbare Units).
Jeder neue Charakter = neue Affection-Spur/Story/Galerie → Gacha-Erwerb seedet direkt Beziehungs-Content.

**Energie/Monetarisierung (✅):** Stamina gated Session (P&D Start 1/10 Min, ~1 $ Refill, später Ad-Refresh); Premium-Währung
→ Gacha; F2P bekommt ~20 $/Monat-Äquivalent an Stones (zieht Nicht-Zahler in Premium-Ökonomie); Sekundär-Sinks (Roster-/Freund-Slots,
Continues); Helper-System (geliehene Unit lockt bis Freund einloggt) → tägliche Logins.

*Quellen:* GameDeveloper (P&D-Monetarisierung); GameRefinery (10 Jahre P&D); mobilefreetoplay/TVTropes (Energie); nzlighter
(Affection-Design); games.gg (Neverness Bond-Guide); gachaheaven (Horizon Walker Gift-Guide); Wikipedia (Destiny Child, Nutaku).

---

## 6. Priorisierte Phase-2-Empfehlungen (was wir übernehmen — mit Begründung)

### P0 — Sofort, höchster Spielgefühl-Hebel
1. **Juice-Layer auf unsere 3D-Spiele** (`web-prototype/games3d.js` + Unity-View): Easing pro Ereignis, Squash&Stretch beim
   Landen/Clear, Hit-Stop beim Spezialstein-Zünden, Screenshake skaliert nach Combo, Combo-Tonleiter (steigende Pitch) +
   Pitch-Randomisierung ±5–10 %. *Warum:* größter Wahrnehmungs-Gewinn pro Aufwand, behebt direkt das „billig"-Feedback.
2. **Concurrent matching** im Match-3-Resolver: Eingabe während Kaskaden nicht hart sperren. *Warum:* Royal-Match-Kern-Differenzierer für „Flow".
3. **Move-Count als primärer Schwierigkeits-Hebel** + **5-Level-Zyklus** (L1 leicht → L5 hart) im Level-Modell. *Warum:* erprobte, einfach kalibrierbare Kurve.

### P1 — Hindernis-System (Kern dieser Phase)
4. **Blocker-Engine** mit Hook-Interface (`OnAdjacentMatch`/`OnHit`/`OnTurnEnd`) und gestaffelter Einführung in dieser Reihenfolge:
   **(a) statisch 1-/mehrschichtig (Eis/Kiste)** → **(b) Lock (nicht tauschbar)** → **(c) Collect-Goal-Spawner (Mailbox)** →
   **(d) Countdown-Bombe** → **(e) ausbreitender Blocker (Schokolade/Jelly)**. *Warum:* exakt die bewährte Onboarding→Bedrohung-Kurve; (d)/(e) erst nach dem Hook.
5. **Zielarten** über `ObjectiveSystem`: Score, Clear-all-Blocker, Collect-N, Ingredient-Drop, **Mixed** (häufigster). *Warum:* Varianz hält Level frisch.
6. **„Isolated easy intro level" + Hand-Pointer-Tutorial** bei jedem neuen Blocker. *Warum:* Standard-Lehrmuster, senkt Churn an neuen Mechaniken.

### P1 — Ball-Sort-Tiefe
7. **Varianten** als Flags: Hidden-Balls, gelöste-Röhre-Lock, **Add-Tube-Helfer** (bei uns via Coins/Reward statt Ad). +
   **Generate-and-verify-Solver** (DFS mit permutations-invariantem Dedup) ergänzend zur Reverse-Move-Generierung, plus **Safe-State**-Rückrollen.
   *Warum:* garantierte Lösbarkeit + Anti-Frust + Difficulty-Hebel (weniger leere Röhren).

### P2 — Progression/Retention & Beziehungs-Kopplung
8. **Loss-Aversion-Continue** („+5 Züge" im Verlustmoment) + **Win/Lose-Feedback-Sequenzen**. *Warum:* stärkster Engagement-/Monetarisierungs-Trigger.
9. **Lives/Energie 5 / 30 Min** (steht bereits in `backend/.../liveops.py config`) + **Booster-Streak-Gift à la Butler's Gift**.
10. **Beziehungs-Kopplung schärfen:** Affection-Schwellen-Gating (haben wir), **Geschenk-Rarität×Vorlieben-Bonus** (Liked/Loved-Multiplikatoren),
    **Stat-/Bonus-Rückfluss** in die Minispiele bei hohem Tier (z.B. Start-Booster/Extra-Züge), **Galerie als Sammel-Meta** mit „NEU"-Badges (haben wir).
    *Warum:* macht den Beziehungsfortschritt *mechanisch* spürbar — der Klebstoff des Hybrid-Genres.

---

## 7. Konfidenz & Caveats (Gesamtbild)
- **Hart belegt:** Candy-Crush-Lives (5/30 Min), Easing/Squash&Stretch/Hit-Stop/Audio-Prinzipien, Near-Miss-Psychologie,
  Ball-Sort-Solver-Algorithmen & Lösbarkeits-Notwendigkeit, Affection-Schwellen-Gating & Geschenk-Vorlieben, Gacha/Energie-Ökonomie.
- **Mittel (Analyst/Einzelquelle):** exakte ms-/Hz-Werte, Royal-Match 5-Level- / Toon-Blast 10-Level-Zyklen, Continue-Preisstaffel,
  Royal-Match/Homescapes-Regen-Intervall.
- **Unsicher (Fan/Genre-Verallgemeinerung):** exakte Candy-Crush-Blocker-Level (driften durch Redesigns), Ball-Sort Joker/Timed/Move-Limit-Varianten,
  Nutaku-Galerie-Interna, per-Item Diminishing-Returns/Daily-Caps. → vor präziser Nutzung spot-verifizieren.

## Quellenverzeichnis (Auswahl)
Azumo „Logic Behind Match-3" · dev.to pixi.js Match-3 #103 · GameDeveloper.com „Squeezing More Juice" · GameAnalytics (Juice) ·
ironSource LevelUp „Royal Match Deep Dive" · Jonasson/Purho „Juice It or Lose It" (GDC) · candycrush.fandom / cheats4game (Blocker) ·
Dreamgames Help (Royal-Match-Elemente) · ekinmelissezer (Royal Match/Toon Blast) · abbirbir / gamigion (Schwierigkeitskurve) ·
NCBI PMC5445157 (Near-Miss) · calebrob.com / lucianbuzzo.com / chromaoracle.com / kasurdev (Ball-Sort) · appgamer (Monetarisierung) ·
Naavik (Royal Match; Live-Ops-Trends) · deconstructoroffun · King Zendesk (Lives) · ke.ma (Loss-Aversion) · GameDeveloper/GameRefinery (P&D) ·
mobilefreetoplay/TVTropes (Energie) · nzlighter (Affection) · games.gg (Neverness) · gachaheaven (Horizon Walker) · Wikipedia (Destiny Child, Nutaku).
