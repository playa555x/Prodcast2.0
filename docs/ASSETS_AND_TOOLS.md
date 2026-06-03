# Saubere Assets & Tools zum Bauen von "Heart & Match"

Recherchierte, **lizenz-geprüfte** Ressourcen (CC0 = keine Namensnennung nötig, kommerziell ok ·
CC-BY = frei, aber **Credit pflicht** · MIT = Code frei). So müssen wir nicht alles selbst zeichnen.

> **Empfehlung:** CC0/MIT bevorzugen. Genau **eine** Quelle mit Pflicht-Credit nutzen wir bewusst
> (game-icons.net) und führen dafür eine `CREDITS`-Datei. KI-generierte Assets später lokal (ComfyUI),
> Lizenz/Style pro Modell prüfen.

---

## 🍬 1. Match-3 / Puzzle — Spielstein-Art
| Asset | Lizenz | Link | Inhalt |
|---|---|---|---|
| **OpenGameArt "Candy Match 3" (MELLE)** | **CC0** | https://opengameart.org/content/candy-match-3 | Candy-Pieces + Explosions-Anim + 2 Backgrounds — am nächsten an "Candy Crush", direkt einsetzbar |
| Candy Match 3 — animierte rotierende Sprites | CC0 | https://opengameart.org/content/candy-match-3-animated-spinning-sprites | 64×64 3D-Candies + Power-up-Gläser (für Specials) |
| **Kenney – Puzzle Pack 2** | CC0 | https://kenney.nl/assets/puzzle-pack-2 | 795 Assets: Puzzle-Sprites, Coins, Partikel — glänzender Vektor-Look |
| Kenney – Puzzle Pack | CC0 | https://kenney.nl/assets/puzzle-pack | 75 Gems/Blocks (Starter) |
| Kenney – Board Game Icons | CC0 | https://kenney.nl/assets/board-game-icons | 250 Icons (Würfel/Ressourcen) — Basis für Blocker/Ziele |

> Kenney hat **kein** fertiges Eis/Lock/Bombe-Blocker-Pack → aus Board-Game-Icons + Puzzle Pack 2
> zusammensetzen oder per KI generieren (Abschnitt 6).

## 🖼️ 2. UI-Kits
| Asset | Lizenz | Link | Inhalt |
|---|---|---|---|
| **Kenney – UI Pack** | **CC0** | https://kenney.nl/assets/ui-pack | 430+ Sprites: Buttons, Slider, Panels, Progressbars, 2 Fonts, 6 UI-SFX — Default für das ganze UI |
| Kenney – Fantasy UI Borders | CC0 | https://kenney-assets.itch.io/fantasy-ui-borders | Zier-Rahmen für Dialogboxen/Porträts |
| **game-icons.net** | ⚠️ **CC BY 3.0 (Credit pflicht)** | https://game-icons.net | ~4000 SVG-Icons (recolorbar) für Booster/Status/Power-ups |

## ✨ 3. Partikel / VFX
| Asset | Lizenz | Link | Inhalt |
|---|---|---|---|
| **Kenney – Particle Pack** | **CC0** | https://kenney.nl/assets/particle-pack | 80 Sprites: Funken, Magie, **Herzen** (doppelt nutzbar für Beziehungs-FX) |
| Kenney – Smoke Particles | CC0 | https://kenney.nl/assets/smoke-particles | Explosion + Flash + White-Puff |
| **Unity – Free VFX Flipbooks** | CC0 | https://blog.unity.com/technology/free-vfx-image-sequences-flipbooks | Profi-Smoke/Fire/Explosion-Flipbook-Sheets → direkt als Flipbook-Textur in Three.js/Unity |

## 🧩 4. Open-Source Match-3 Templates/Engines
| Repo | Sprache | Lizenz | Inhalt |
|---|---|---|---|
| **LibraStack/Match3-SDK** ⭐ | C#/Unity | **MIT** | Stärkste Engine: Board, Fill-Strategien (Cascade), Special-Tiles, Goals, Job-Animation — echtes Fundament. https://github.com/LibraStack/Match3-SDK |
| Unity – Game-Simulation Match-3-Sample | C#/Unity | Unity Companion | Offizielles Sample, Inspector-Level. https://github.com/Unity-Technologies/Game-Simulation-Match-3-Sample |
| blikoor/godot-match-3 | Godot | MIT | Candy-Crush-artiger Slice. https://github.com/blikoor/godot-match-3 |
| ace-cooper/m3leveleditor | C#/Unity | (prüfen) | Level-Editor-POC → ScriptableObject-Export. https://github.com/ace-cooper/m3leveleditor |
| Snipzwolf/match-three-game · tebesoft/match-3 | JS/Phaser | (LICENSE prüfen!) | Web-Match-3 mit Cascade |

> ⚠️ Repos ohne explizite LICENSE = standardmäßig "all rights reserved" → vor Nutzung Lizenz prüfen.

## 👤 5. Charakter-Art (Dating-Sim-Seite)
| Asset | Lizenz | Link | Hinweis |
|---|---|---|---|
| OpenGameArt – CC0 Portraits | **CC0** | https://opengameart.org/content/cc0-portraits | Gemischte VN-/Anime-Porträts — gut zum Greyboxing, **kein** einheitlicher Cast |
| itch.io – Dating-Sim/VN-Sprites (free) | ⚠️ gemischt | https://itch.io/game-assets/free/tag-dating-sim/tag-sprites | Pro Asset Lizenz prüfen (oft Attribution/keine Redistribution) |

> **Realität:** Es gibt **kein** großes, einheitliches, lizenz-sauberes Anime-Dating-Cast-Pack.
> Für einen konsistenten Love-Interest-Cast → **eigene oder lokal KI-generierte Art** mit fixem Style.

## 🛠️ 6. Asset-Pipeline & KI-Modelle (lokal)
**Sprite/Atlas-Tools (Open Source):**
- **Free Texture Packer** (MIT) — https://free-tex-packer.com · https://github.com/odrick/free-tex-packer — packt Sprites in Atlanten, exportiert Phaser/PixiJS/Godot/Cocos.
- Free Sprite Sheet Packer (web) — https://www.codeandweb.com/free-sprite-sheet-packer

**KI-Modelle für eigene Icons/Porträts (auf deinem Rechner / ComfyUI):**
- HF **Yntec/GameIcons3D** — https://hf.co/Yntec/GameIcons3D · **GraydientPlatformAPI/gameicons4-sdxl** — https://hf.co/GraydientPlatformAPI/gameicons4-sdxl
- Civitai **Game Icon (SDXL LoRA)** — https://civitai.com/models/141066 · **SXZ D.U.C.K. Game Assets** — https://civitai.com/models/44726 (⚠️ Lizenz pro Modell prüfen)
- Spaces (lokal ausführbar): FLUX.1-schnell, Z-Image-Turbo, **TRELLIS.2** (3D aus Bild), **See-through** (Anime → PSD-Ebenen)

---

## 🛒 Einkaufsliste — was wir zuerst übernehmen
1. **Match3-SDK (MIT)** als echte Unity-Engine (Cascade/Specials/Goals bereits da)
   *(Web-Variante: Phaser-Repo, vorher LICENSE prüfen)*
2. **OpenGameArt "Candy Match 3" (CC0)** — glänzende Candy-Pieces + Explosion + BG (Drop-in)
3. **Kenney Puzzle Pack 2 (CC0)** — Piece-Vielfalt
4. **Kenney UI Pack (CC0)** — komplettes Menü/HUD (Buttons, Panels, Bars, Fonts, SFX)
5. **Kenney Particle Pack (CC0)** — Match-Pops, Funken, **Herzen** (auch Beziehungs-FX)
6. **Free Texture Packer (MIT)** — alles zu Atlanten standardisieren
7. **game-icons.net (CC BY — Credit!)** — Booster/Status-Icons → `CREDITS` führen
8. **CC0 Portraits + SDXL-LoRA lokal** — Cast greyboxen, dann konsistent generieren

## Bezug zu unserem Projekt
- **Web-Prototyp jetzt:** CC0-Sprites (Candy Match 3 / Kenney) statt Canvas-Zeichnung einbauen +
  Kenney UI-Sprites/Partikel → sofort „echter" Look, sauber lizenziert.
- **Unity-Client:** auf **Match3-SDK (MIT)** aufsetzen statt Engine neu zu schreiben.
- **Pipeline:** Free Texture Packer für Atlanten; KI-Modelle lokal für Charakter-/Belohnungs-Art.
- **Compliance:** `CREDITS`-Datei für game-icons.net; KI-Modell-Lizenzen vor kommerziellem Release prüfen.
