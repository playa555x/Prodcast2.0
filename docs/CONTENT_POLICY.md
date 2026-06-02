# Content Policy (verbindlich)

Diese Richtlinie gilt für den gesamten Code, alle Assets und alle generierten Inhalte in diesem Repo.

## Grundsätze

1. **Nur fiktive, erwachsene Charaktere.** Jeder Charakter trägt ein Pflichtfeld `age` (≥ 18), das beim
   Laden validiert wird (`CharacterDef.Validate()` im Unity-Client, Schema-Check im Backend). Charaktere
   ohne gültiges Alter werden abgelehnt.
2. **Keine realen Personen.** Es dürfen keine real existierenden Menschen dargestellt, nachgebildet oder
   per Deepfake erzeugt werden — weder über Assets noch über Generierungs-Prompts.
3. **Kein CSAM, keine Andeutung von Minderjährigen.** Strikt verboten und technisch durch die
   Altersvalidierung sowie durch Review der Charakter-Daten abgesichert.

## Was dieses Repository NICHT enthält

- Keine expliziten Bild-/Video-Assets.
- Keine NSFW-/expliziten Stable-Diffusion-Modelle, LoRAs oder Prompts.
- Keine vorkonfigurierten expliziten ComfyUI-Workflows.

Mitgeliefert wird ausschließlich:

- ein **generischer** Generierungs-Mechanismus (`backend/app/services/comfyui_client.py`) und ein
  **SFW** Workflow-Template (`backend/workflows/portrait_template.json`) mit Platzhaltern,
- **SFW-Platzhalter-Assets** für die Entwicklung.

## Build-Varianten & Distribution

- **SFW-Build (`CONTENT_SFW`)** — jugendfrei, für Google Play. Keine externen Zahlungslinks im
  Play-Build; korrekte IARC-Alterseinstufung.
- **Adult-Build (`CONTENT_ADULT`)** — hinter hartem Age-Gate, Distribution über itch.io / eigene APK,
  externer Zahlungsanbieter. Inhalte werden über die eigene ComfyUI-Instanz der Nutzer:innen erzeugt;
  die Verantwortung für Modelle, Prompts und erzeugte Inhalte liegt vollständig bei den Nutzer:innen.

## NSFW-Modell-Swap-Punkt

Die einzige Stelle, an der NSFW-Inhalte entstehen können, ist die **externe ComfyUI-Instanz**, die das
Backend über `COMFYUI_BASE_URL` anspricht. Das Backend ist modell-agnostisch und liefert selbst keine
Modelle. Welche Checkpoints/LoRAs dort geladen sind, bestimmen ausschließlich die Nutzer:innen.
