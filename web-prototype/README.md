# Heart & Match — Web-Prototyp

Ein **spielbarer Prototyp** der Kernmechanik, der ohne Installation/Build im Browser läuft. Dient zum
schnellen Ausprobieren & Zeigen des Spielgefühls — der echte Client ist das Unity-Projekt unter
[`../unity-game/`](../unity-game/).

## Öffnen

Einfach **`index.html` im Browser öffnen** (Doppelklick genügt — kein Server nötig).

Optional als lokaler Server (falls der Browser `file://` einschränkt):

```bash
cd web-prototype
python3 -m http.server 8080
# dann http://localhost:8080 öffnen
```

## Was funktioniert

- **Start-/Age-Gate**: Auswahl SFW / 18+ (Demo — beide nur Platzhalter), Altersbestätigung für 18+.
- **Hub**: aktiver Charakter mit Sympathie/Vertrauen/Stimmung-Balken + Tier, **Dialog-Bubble je
  Persönlichkeit/Tier**, Geschenke mit **Geschmacks-Präferenz** (💗 mag / 💤 mag nicht), Date-Button.
- **Match-3 (echte Früchte 🍎🍊🍋🍉🫐🍇)** auf 3D-Spielfläche: 8×8, Tauschen, Kaskaden,
  4er→Rakete 🚀, 5er→Farbbombe 💥, Ziel → 🪙.
  **Juice:** Partikel-Burst beim Auflösen, Screenshake + Hit-Stop beim Spezialstein-Zünden, Combo-Tonleiter.
  **Hindernis 🧊 Eis** (mehrschichtig, vereiste Früchte sind nicht bewegbar und schmelzen Schicht für
  Schicht durch Matches direkt daneben). **Das Eis entwickelt sich mit dem Level:**
  Raureif (L1–2) → Eis (L3–4) → Frost-Kristall (L5–6) → Permafrost (L7+) — jeweils anderes Aussehen
  und mehr Schichten. Level gewonnen erst, wenn Ziel erreicht **und** alles Eis geräumt ist.
- **Ball-Sort**: Röhren sortieren, Undo, Lösungserkennung → 🪙.
- **Roster**: alle Charaktere mit Persönlichkeit/Tier, freigeschaltet/gesperrt, Wechsel per Tap.
- **Galerie**: Belohnungs-Tiers pro Charakter mit „NEU"-Badges.
- **Sympathie-Loop**: 🪙 aus Minispielen → Geschenke → Tier steigt → Belohnung in der Galerie.
- **Charakterwechsel** nach 5 Story-Beats; Energie-Regeneration; **Sound** (WebAudio).
- **Persistenz**: Fortschritt wird automatisch im `localStorage` gespeichert (Reset in den Einstellungen).

## Bezug zum echten Spiel

Die Mechanik spiegelt das Unity-Design (Tier-Schwellen, Stimmungs-Multiplikator, Spezialsteine,
lösbarer Ball-Sort). Im echten Spiel sind die Belohnungen Bilder/Videos (via ComfyUI generiert);
hier sind sie Platzhalter-Karten. Inhalte: ausschließlich fiktive, erwachsene Charaktere.

![Start/Age-Gate](screenshots/0-gate.png)
![Hub](screenshots/1-hub.png)
![Match-3](screenshots/2-match3.png)
![Ball-Sort](screenshots/3-ballsort.png)
![Roster](screenshots/4-roster.png)
![Galerie](screenshots/5-gallery.png)
