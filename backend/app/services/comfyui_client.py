"""Async-Client für eine externe ComfyUI-Instanz.

Folgt dem HTTP-Service-Muster der Codebasis (vgl. `master:backend/services/elevenlabs_tts.py`):
async `httpx`, `is_available()`, Konfiguration aus Settings. Der Client ist **modell-agnostisch** —
er lädt ein Workflow-Template, injiziert Parameter und reicht es an ComfyUI weiter. Welche
Checkpoints/LoRAs dort laufen, bestimmen ausschließlich die Betreiber:innen der ComfyUI-Instanz
(siehe docs/CONTENT_POLICY.md).

ComfyUI-API-Fluss:
  POST /prompt        -> { "prompt_id": "..." }
  GET  /history/{id}  -> { id: { "outputs": { node: { "images": [{filename, subfolder, type}] }}}}
  GET  /view?...      -> Bild-Bytes
"""

from __future__ import annotations

import asyncio
import hashlib
import json
from dataclasses import dataclass, field
from pathlib import Path

import httpx

from app.core.config import settings


class ComfyUIError(RuntimeError):
    """Fehler bei der Kommunikation mit ComfyUI oder fehlerhaftem Workflow."""


@dataclass
class GenerationParams:
    """Eingangsparameter für eine Bildgenerierung (nur generische Style-/Render-Felder)."""

    prompt: str = "portrait, character"
    negative: str = "lowres, blurry, deformed"
    seed: int = 0
    width: int = 768
    height: int = 1024
    steps: int = 25
    cfg: float = 6.5
    extra: dict = field(default_factory=dict)

    def cache_key(self) -> str:
        raw = json.dumps(self.__dict__, sort_keys=True, default=str)
        return hashlib.sha256(raw.encode()).hexdigest()[:32]


# Platzhalter im Workflow-Template -> Parameter. Das Template ist generisch & SFW.
_PLACEHOLDERS = {
    "%PROMPT%": lambda p: p.prompt,
    "%NEGATIVE%": lambda p: p.negative,
    "%SEED%": lambda p: p.seed,
    "%WIDTH%": lambda p: p.width,
    "%HEIGHT%": lambda p: p.height,
    "%STEPS%": lambda p: p.steps,
    "%CFG%": lambda p: p.cfg,
}


class ComfyUIClient:
    def __init__(
        self,
        base_url: str | None = None,
        template_path: str | None = None,
        timeout: float | None = None,
        poll_interval: float | None = None,
    ) -> None:
        self.base_url = (base_url or settings.COMFYUI_BASE_URL).rstrip("/")
        self.template_path = template_path or settings.COMFYUI_WORKFLOW_TEMPLATE
        self.timeout = timeout if timeout is not None else settings.COMFYUI_TIMEOUT_SECONDS
        self.poll_interval = (
            poll_interval if poll_interval is not None else settings.COMFYUI_POLL_INTERVAL_SECONDS
        )

    # --- Verfügbarkeit -----------------------------------------------------
    async def is_available(self) -> bool:
        """Prüft, ob die ComfyUI-Instanz erreichbar ist (für Fallback-Logik)."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{self.base_url}/system_stats")
                return resp.status_code == 200
        except (httpx.HTTPError, OSError):
            return False

    # --- Workflow-Aufbau ---------------------------------------------------
    def build_workflow(self, params: GenerationParams) -> dict:
        """Lädt das Template und ersetzt Platzhalter durch Parameterwerte."""
        template_text = Path(self.template_path).read_text(encoding="utf-8")
        for token, getter in _PLACEHOLDERS.items():
            value = getter(params)
            # Strings in Anführungszeichen, Zahlen roh — Template nutzt die Tokens passend.
            template_text = template_text.replace(f'"{token}"', json.dumps(value))
            template_text = template_text.replace(token, str(value))
        try:
            return json.loads(template_text)
        except json.JSONDecodeError as exc:
            raise ComfyUIError(f"Workflow-Template ergibt kein gültiges JSON: {exc}") from exc

    # --- Generierung -------------------------------------------------------
    async def generate(self, params: GenerationParams) -> bytes:
        """Reicht den Workflow ein, wartet auf Fertigstellung und liefert die Bild-Bytes."""
        workflow = self.build_workflow(params)
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            prompt_id = await self._submit(client, workflow)
            images = await self._await_result(client, prompt_id)
            if not images:
                raise ComfyUIError("ComfyUI lieferte keine Bilder zurück")
            return await self._fetch_image(client, images[0])

    async def _submit(self, client: httpx.AsyncClient, workflow: dict) -> str:
        resp = await client.post(f"{self.base_url}/prompt", json={"prompt": workflow})
        if resp.status_code != 200:
            raise ComfyUIError(f"/prompt fehlgeschlagen: HTTP {resp.status_code} {resp.text[:200]}")
        prompt_id = resp.json().get("prompt_id")
        if not prompt_id:
            raise ComfyUIError("Antwort von /prompt enthielt keine prompt_id")
        return prompt_id

    async def _await_result(self, client: httpx.AsyncClient, prompt_id: str) -> list[dict]:
        """Pollt /history bis Ergebnisse vorliegen oder das Timeout greift."""
        deadline = asyncio.get_event_loop().time() + self.timeout
        while asyncio.get_event_loop().time() < deadline:
            resp = await client.get(f"{self.base_url}/history/{prompt_id}")
            if resp.status_code == 200:
                history = resp.json().get(prompt_id)
                if history:
                    images = _extract_images(history)
                    if images:
                        return images
            await asyncio.sleep(self.poll_interval)
        raise ComfyUIError("Timeout beim Warten auf das ComfyUI-Ergebnis")

    async def _fetch_image(self, client: httpx.AsyncClient, image_ref: dict) -> bytes:
        resp = await client.get(
            f"{self.base_url}/view",
            params={
                "filename": image_ref.get("filename"),
                "subfolder": image_ref.get("subfolder", ""),
                "type": image_ref.get("type", "output"),
            },
        )
        if resp.status_code != 200:
            raise ComfyUIError(f"/view fehlgeschlagen: HTTP {resp.status_code}")
        return resp.content


def _extract_images(history: dict) -> list[dict]:
    """Sammelt alle Bild-Referenzen aus den Output-Knoten einer History-Antwort."""
    images: list[dict] = []
    for node_output in history.get("outputs", {}).values():
        images.extend(node_output.get("images", []))
    return images
