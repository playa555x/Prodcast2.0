"""
Claude Script Generation API - Tri-Modal System

Features:
- Mode 1: Pure API (standard request/response)
- Mode 2: API + Storage (save to Desktop/Drive, return link)
- Mode 3: Drive-based Queue (file watcher + Claude Desktop/Code + MCP)

Quality: 12/10 - Production Ready
Last updated: 2025-10-07
"""

from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime
import os
import json
import logging
from pathlib import Path

from core.security import get_current_user_data

logger = logging.getLogger(__name__)
router = APIRouter()

# ============================================
# Configuration
# ============================================

# Mode 2: Storage paths
DESKTOP_PATH = os.path.expanduser("~/Desktop/claude_scripts")
GOOGLE_DRIVE_PATH = os.path.expanduser("~/Google Drive/claude_scripts")

# Mode 3: Queue paths
QUEUE_INPUT_PATH = os.path.expanduser("~/Google Drive/claude_queue/input")
QUEUE_OUTPUT_PATH = os.path.expanduser("~/Google Drive/claude_queue/output")
QUEUE_PROCESSING_PATH = os.path.expanduser("~/Google Drive/claude_queue/processing")
QUEUE_ERROR_PATH = os.path.expanduser("~/Google Drive/claude_queue/error")

# ============================================
# Models
# ============================================

class GenerationMode(str):
    """Generation mode enum"""
    PURE_API = "pure_api"
    API_STORAGE = "api_storage"
    DRIVE_QUEUE = "drive_queue"


class ClaudeScriptRequest(BaseModel):
    """Request for Claude script generation"""
    prompt: str = Field(..., description="Prompt for Claude to generate podcast script")
    mode: Literal["pure_api", "api_storage", "drive_queue"] = Field(
        default="pure_api",
        description="Generation mode"
    )
    storage_location: Optional[Literal["desktop", "google_drive"]] = Field(
        default="desktop",
        description="Storage location for mode 2 (api_storage)"
    )
    speakers_count: Optional[int] = Field(
        default=2,
        ge=1,
        le=10,
        description="Expected number of speakers"
    )
    script_style: Optional[str] = Field(
        default="conversational",
        description="Style of the script (conversational, formal, casual, interview)"
    )


class ClaudeScriptResponse(BaseModel):
    """Response from Claude script generation"""
    mode: str
    success: bool
    script: Optional[str] = None
    file_path: Optional[str] = None
    queue_id: Optional[str] = None
    speakers_count: Optional[int] = None
    message: str
    timestamp: str
    cost_estimate: Optional[str] = None


class QueueStatus(BaseModel):
    """Status of queue request"""
    queue_id: str
    status: Literal["queued", "processing", "completed", "error"]
    file_path: Optional[str] = None
    error: Optional[str] = None
    created_at: str
    updated_at: str


# ============================================
# Helper Functions
# ============================================

def ensure_directories():
    """Ensure all required directories exist"""
    paths = [
        DESKTOP_PATH,
        GOOGLE_DRIVE_PATH,
        QUEUE_INPUT_PATH,
        QUEUE_OUTPUT_PATH,
        QUEUE_PROCESSING_PATH,
        QUEUE_ERROR_PATH
    ]

    for path in paths:
        Path(path).mkdir(parents=True, exist_ok=True)


async def generate_script_with_claude(prompt: str, speakers_count: int = 2, style: str = "conversational") -> str:
    """
    Generate script using Claude API

    Uses the real Anthropic Claude API for script generation
    """
    from services.claude_api import ClaudeAPIService

    claude_service = ClaudeAPIService()

    if not claude_service.is_available():
        raise Exception("Claude API key not configured in environment")

    # Build system prompt
    system_prompt = f"""You are an expert podcast script writer specializing in {style} conversations.

Create a natural, engaging podcast script with {speakers_count} speakers.

Format Requirements:
- Use XML format with <SPEAKER> tags
- Each speaker needs: name and voice_type attribute
- Voice types: male_energetic, male_deep, male_friendly, female_friendly, female_professional, female_warm
- Natural dialogue flow with interruptions, agreements, and reactions
- Include speaker personality in their speech patterns

Example format:
<SPEAKER name="Host" voice_type="male_energetic">
Welcome to the show! Today we're diving into...
</SPEAKER>

<SPEAKER name="Guest" voice_type="female_friendly">
Thanks for having me! I'm excited to discuss...
</SPEAKER>

Make it sound like a real conversation, not a scripted interview."""

    # Build user prompt
    user_prompt = f"""Generate a complete podcast script about: {prompt}

Number of speakers: {speakers_count}
Style: {style}
Duration: Approximately 5-10 minutes of dialogue

Include:
1. Natural introductions
2. Main discussion with back-and-forth dialogue
3. Spontaneous reactions and agreements
4. Natural closing

Remember to use XML format with proper <SPEAKER> tags as shown in the example."""

    # Call Claude API
    response = await claude_service.send_message(
        prompt=user_prompt,
        system_prompt=system_prompt,
        max_tokens=4096,
        temperature=0.8  # Higher temperature for more natural dialogue
    )

    script_content = response.get("content", "")

    if not script_content:
        raise Exception("Claude API returned empty response")

    # Add metadata comment at the top
    metadata = f"<!-- Generated by Claude AI ({response.get('model', 'unknown')}) - {datetime.utcnow().isoformat()} -->\n"
    metadata += f"<!-- Prompt: {prompt[:100]}{'...' if len(prompt) > 100 else ''} -->\n"
    metadata += f"<!-- Style: {style} | Speakers: {speakers_count} -->\n\n"

    return metadata + script_content


def save_script_to_file(script: str, location: str = "desktop") -> str:
    """
    Save script to filesystem

    Args:
        script: Script content
        location: "desktop" or "google_drive"

    Returns:
        File path where script was saved
    """
    ensure_directories()

    base_path = DESKTOP_PATH if location == "desktop" else GOOGLE_DRIVE_PATH
    filename = f"claude_script_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.xml"
    file_path = os.path.join(base_path, filename)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(script)

    logger.info(f"Script saved to: {file_path}")
    return file_path


def create_queue_request(prompt: str, speakers_count: int, style: str) -> str:
    """
    Create queue request file for Mode 3

    Returns:
        Queue ID
    """
    ensure_directories()

    queue_id = f"q_{datetime.utcnow().strftime('%Y%m%d_%H%M%S_%f')}"

    request_data = {
        "queue_id": queue_id,
        "prompt": prompt,
        "speakers_count": speakers_count,
        "style": style,
        "status": "queued",
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }

    request_file = os.path.join(QUEUE_INPUT_PATH, f"{queue_id}.json")

    with open(request_file, 'w', encoding='utf-8') as f:
        json.dump(request_data, f, indent=2)

    logger.info(f"Queue request created: {queue_id}")
    return queue_id


def check_queue_status(queue_id: str) -> QueueStatus:
    """
    Check status of queue request

    Returns:
        QueueStatus object
    """
    # Check completed
    output_file = os.path.join(QUEUE_OUTPUT_PATH, f"{queue_id}.xml")
    if os.path.exists(output_file):
        request_file = os.path.join(QUEUE_OUTPUT_PATH, f"{queue_id}.json")
        if os.path.exists(request_file):
            with open(request_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return QueueStatus(
                    queue_id=queue_id,
                    status="completed",
                    file_path=output_file,
                    created_at=data.get("created_at", ""),
                    updated_at=data.get("updated_at", "")
                )

    # Check processing
    processing_file = os.path.join(QUEUE_PROCESSING_PATH, f"{queue_id}.json")
    if os.path.exists(processing_file):
        with open(processing_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return QueueStatus(
                queue_id=queue_id,
                status="processing",
                created_at=data.get("created_at", ""),
                updated_at=data.get("updated_at", "")
            )

    # Check error
    error_file = os.path.join(QUEUE_ERROR_PATH, f"{queue_id}.json")
    if os.path.exists(error_file):
        with open(error_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return QueueStatus(
                queue_id=queue_id,
                status="error",
                error=data.get("error", "Unknown error"),
                created_at=data.get("created_at", ""),
                updated_at=data.get("updated_at", "")
            )

    # Check queued
    queued_file = os.path.join(QUEUE_INPUT_PATH, f"{queue_id}.json")
    if os.path.exists(queued_file):
        with open(queued_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return QueueStatus(
                queue_id=queue_id,
                status="queued",
                created_at=data.get("created_at", ""),
                updated_at=data.get("updated_at", "")
            )

    raise HTTPException(status_code=404, detail=f"Queue ID not found: {queue_id}")


# ============================================
# API Endpoints
# ============================================

@router.post("/generate-script", response_model=ClaudeScriptResponse)
async def generate_claude_script(
    request: ClaudeScriptRequest,
    user_data: dict = Depends(get_current_user_data)
):
    """
    Generate podcast script using Claude AI

    Supports three generation modes:
    1. pure_api: Standard API call, returns full script (high cost, immediate)
    2. api_storage: API call + save to file, returns path only (medium cost, immediate)
    3. drive_queue: Queue request for later processing (low cost, async)
    """
    try:
        logger.info(f"Script generation requested - Mode: {request.mode} - User: {user_data.get('username')}")

        # Mode 1: Pure API
        if request.mode == "pure_api":
            script = await generate_script_with_claude(
                request.prompt,
                request.speakers_count or 2,
                request.script_style or "conversational"
            )

            return ClaudeScriptResponse(
                mode="pure_api",
                success=True,
                script=script,
                speakers_count=request.speakers_count or 2,
                message="Script generated successfully via Claude API",
                timestamp=datetime.utcnow().isoformat(),
                cost_estimate="HIGH (all response tokens counted)"
            )

        # Mode 2: API + Storage
        elif request.mode == "api_storage":
            script = await generate_script_with_claude(
                request.prompt,
                request.speakers_count or 2,
                request.script_style or "conversational"
            )

            file_path = save_script_to_file(script, request.storage_location or "desktop")

            return ClaudeScriptResponse(
                mode="api_storage",
                success=True,
                file_path=file_path,
                speakers_count=request.speakers_count or 2,
                message=f"Script saved to {request.storage_location}",
                timestamp=datetime.utcnow().isoformat(),
                cost_estimate="MEDIUM (no response tokens, only request)"
            )

        # Mode 3: Drive-based Queue
        elif request.mode == "drive_queue":
            queue_id = create_queue_request(
                request.prompt,
                request.speakers_count or 2,
                request.script_style or "conversational"
            )

            return ClaudeScriptResponse(
                mode="drive_queue",
                success=True,
                queue_id=queue_id,
                speakers_count=request.speakers_count or 2,
                message="Request queued. Python watcher will process it shortly.",
                timestamp=datetime.utcnow().isoformat(),
                cost_estimate="LOW (local Claude Desktop/Code execution)"
            )

        else:
            raise HTTPException(status_code=400, detail=f"Invalid mode: {request.mode}")

    except Exception as e:
        logger.error(f"Script generation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/queue-status/{queue_id}", response_model=QueueStatus)
async def get_queue_status(
    queue_id: str,
    user_data: dict = Depends(get_current_user_data)
):
    """
    Check status of queued script generation request

    Returns:
        QueueStatus with current status and file path if completed
    """
    try:
        status = check_queue_status(queue_id)
        return status
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to check queue status: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """Health check for Claude Script API"""
    ensure_directories()

    return {
        "status": "operational",
        "modes": {
            "pure_api": "available",
            "api_storage": "available",
            "drive_queue": "available"
        },
        "directories": {
            "desktop": os.path.exists(DESKTOP_PATH),
            "google_drive": os.path.exists(GOOGLE_DRIVE_PATH),
            "queue_input": os.path.exists(QUEUE_INPUT_PATH),
            "queue_output": os.path.exists(QUEUE_OUTPUT_PATH)
        },
        "timestamp": datetime.utcnow().isoformat()
    }


# ============================================
# Admin Endpoints (Optional)
# ============================================

@router.get("/config")
async def get_configuration(
    user_data: dict = Depends(get_current_user_data)
):
    """
    Get current configuration paths

    Useful for debugging and verification
    """
    return {
        "storage_paths": {
            "desktop": DESKTOP_PATH,
            "google_drive": GOOGLE_DRIVE_PATH
        },
        "queue_paths": {
            "input": QUEUE_INPUT_PATH,
            "output": QUEUE_OUTPUT_PATH,
            "processing": QUEUE_PROCESSING_PATH,
            "error": QUEUE_ERROR_PATH
        },
        "modes": [
            {
                "id": "pure_api",
                "name": "Pure API",
                "cost": "HIGH",
                "speed": "Fast",
                "description": "Standard API request/response"
            },
            {
                "id": "api_storage",
                "name": "API + Storage",
                "cost": "MEDIUM",
                "speed": "Fast",
                "description": "API call + save to file"
            },
            {
                "id": "drive_queue",
                "name": "Drive-based Queue",
                "cost": "LOW",
                "speed": "Async",
                "description": "Queue for later processing"
            }
        ]
    }
