# ComfyUI-Integration

Das Backend ist ein **modell-agnostischer Proxy** zu einer **externen** ComfyUI-Instanz. Es liefert
selbst keine Modelle, LoRAs oder Prompts (siehe [CONTENT_POLICY.md](CONTENT_POLICY.md)).

## Ablauf

```
Client ──POST /api/comfyui/generate──▶ Backend ──POST /prompt──▶ ComfyUI
        ◀──── JobDto(queued) ─────────         (BackgroundTask pollt /history)
Client ──GET  /api/comfyui/jobs/{id}──▶ Backend  (Status: queued|running|done|failed)
Client ──GET  /api/comfyui/image/{id}─▶ Backend ──GET /view──▶ ComfyUI  ──▶ Bild (gecacht)
```

1. **Generieren:** Der Client schickt `character_id`, `tier`, `prompt`, `seed`, Auflösung. Das Backend
   legt einen `GenerationJob` an und startet einen Hintergrund-Task.
2. **Workflow:** `backend/workflows/portrait_template.json` (generisch, SFW) wird geladen; Platzhalter
   (`%PROMPT%`, `%NEGATIVE%`, `%SEED%`, `%WIDTH%`, `%HEIGHT%`, `%STEPS%`, `%CFG%`) werden ersetzt.
3. **Warten:** `ComfyUIClient` reicht den Workflow an `/prompt`, pollt `/history/{prompt_id}` und holt
   das Ergebnis über `/view`.
4. **Cache:** Ergebnisse werden unter `CACHE_DIR` mit einem Parameter-Hash abgelegt; identische
   Anfragen treffen den Cache.

## Konfiguration (Backend `.env`)

```
COMFYUI_BASE_URL=http://127.0.0.1:8188
COMFYUI_TIMEOUT_SECONDS=180
COMFYUI_POLL_INTERVAL_SECONDS=1.0
COMFYUI_WORKFLOW_TEMPLATE=./workflows/portrait_template.json
CACHE_DIR=./generated_cache
```

## Eigene Workflows / Modelle

- Im Template `REPLACE_WITH_YOUR_MODEL.safetensors` durch den eigenen Checkpoint ersetzen.
- Weitere Knoten (LoRA-Loader, Upscaler, Posen-Conditioning …) können ergänzt werden, solange die
  Platzhalter-Tokens erhalten bleiben.
- **NSFW-Modell-Swap-Punkt:** Welche Modelle in der ComfyUI-Instanz laufen, bestimmen ausschließlich
  die Betreiber:innen. Das Repo enthält dafür nichts. Verantwortung und Compliance liegen bei den
  Nutzer:innen; ausschließlich fiktive, erwachsene Motive.

## Eventualitäten (Fehlerverhalten)

| Situation | Verhalten |
|---|---|
| ComfyUI nicht erreichbar | Job → `failed`; Client-Provider fällt auf lokalen Platzhalter zurück |
| Timeout | Job → `failed` mit Meldung; Retry möglich |
| Doppelte Anfrage | Cache-Hit, keine Neuberechnung |
| Backend offline | `ComfyUIRewardProvider` liefert `LocalRewardProvider`-Platzhalter (`Failed=true`) |
