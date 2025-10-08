"""
Production Service - Multi-Voice Podcast Production Pipeline
Handles Voice Assignment, Segment Generation, Timeline Management
"""

import asyncio
import logging
import uuid
from typing import List, Dict, Optional, Tuple
from pathlib import Path
from datetime import datetime

from models.production import (
    ProductionStatus, AudioSegment, TimelineTrack, Timeline,
    VoiceAssignment, SegmentType
)
from models.research import ResearchJob, ScriptVariant, ConversationSegment
from services.openai_tts import OpenAITTSService
from services.elevenlabs_tts import ElevenLabsTTSService
from services.speechify_tts import SpeechifyTTSService
from services.google_tts import GoogleTTSService
from core.config import settings

logger = logging.getLogger(__name__)

class ProductionService:
    """
    Complete podcast production pipeline
    """

    def __init__(self):
        """Initialize TTS services"""
        self.openai_tts = OpenAITTSService()
        self.elevenlabs_tts = ElevenLabsTTSService()
        self.speechify_tts = SpeechifyTTSService()
        self.google_tts = GoogleTTSService()

    async def create_production_from_research(
        self,
        research_job: ResearchJob,
        selected_variant: str
    ) -> Tuple[str, List[Dict]]:
        """
        Create production job from research results

        Args:
            research_job: Completed research job
            selected_variant: "young", "middle_aged", or "scientific"

        Returns:
            Tuple of (production_job_id, characters_list)
        """
        # Get selected variant
        variants_data = research_job.variants_data or []
        selected = next(
            (v for v in variants_data if v.get("audience") == selected_variant),
            None
        )

        if not selected:
            raise ValueError(f"Variant '{selected_variant}' not found in research results")

        # Extract characters
        characters = selected.get("characters", [])

        if not characters:
            raise ValueError("No characters found in selected variant")

        logger.info(f"Creating production with {len(characters)} characters")

        return str(uuid.uuid4()), characters

    async def generate_segments(
        self,
        production_job_id: str,
        script_segments: List[Dict],
        voice_assignments: List[VoiceAssignment]
    ) -> List[AudioSegment]:
        """
        Generate audio for all segments with assigned voices

        Args:
            production_job_id: Production job ID
            script_segments: Conversation segments from script
            voice_assignments: Voice assignments for each character

        Returns:
            List of AudioSegment with generated audio
        """
        logger.info(f"Generating {len(script_segments)} audio segments")

        # Create voice assignment map
        voice_map = {
            assignment.character_id: assignment
            for assignment in voice_assignments
        }

        audio_segments = []
        output_dir = settings.PODCAST_OUTPUT_DIR / f"production_{production_job_id}" / "segments"
        output_dir.mkdir(parents=True, exist_ok=True)

        for idx, seg in enumerate(script_segments, 1):
            segment_id = str(uuid.uuid4())
            character_id = seg.get("speaker_id")
            text = seg.get("text", "")

            # Get voice assignment
            assignment = voice_map.get(character_id)
            if not assignment:
                logger.warning(f"No voice assignment for character {character_id}, skipping")
                continue

            try:
                # Generate audio
                output_path = output_dir / f"segment_{idx:03d}_{segment_id}.mp3"

                audio_bytes = await self._generate_audio_for_segment(
                    text=text,
                    provider=assignment.provider,
                    voice_id=assignment.voice_id,
                    output_path=output_path
                )

                # Calculate duration (rough estimate)
                duration = len(text.split()) / 2.5  # ~150 words/min

                # Create AudioSegment
                audio_segment = AudioSegment(
                    segment_id=segment_id,
                    segment_number=idx,
                    segment_type=SegmentType.SPEECH,
                    character_id=character_id,
                    character_name=seg.get("speaker_name"),
                    text=text,
                    voice_id=assignment.voice_id,
                    voice_name=assignment.voice_name,
                    provider=assignment.provider,
                    speed=1.0,
                    volume=1.0,
                    start_time=sum(s.duration for s in audio_segments),
                    duration=duration,
                    end_time=sum(s.duration for s in audio_segments) + duration,
                    audio_url=f"/api/production/audio/{production_job_id}/{segment_id}",
                    audio_path=str(output_path),
                    status="ready"
                )

                audio_segments.append(audio_segment)
                logger.info(f"Segment {idx}/{len(script_segments)} generated: {len(audio_bytes)} bytes")

            except Exception as e:
                logger.error(f"Failed to generate segment {idx}: {e}")
                # Create error segment
                audio_segment = AudioSegment(
                    segment_id=segment_id,
                    segment_number=idx,
                    segment_type=SegmentType.SPEECH,
                    character_id=character_id,
                    character_name=seg.get("speaker_name"),
                    text=text,
                    status="error",
                    error_message=str(e)
                )
                audio_segments.append(audio_segment)

        logger.info(f"Generated {len(audio_segments)} audio segments")
        return audio_segments

    async def _generate_audio_for_segment(
        self,
        text: str,
        provider: str,
        voice_id: str,
        output_path: Path,
        speed: float = 1.0
    ) -> bytes:
        """Generate audio for single segment"""

        if provider == "openai":
            return await self.openai_tts.generate_speech(
                text=text,
                voice=voice_id,
                speed=speed,
                output_path=output_path
            )
        elif provider == "elevenlabs":
            return await self.elevenlabs_tts.generate_speech(
                text=text,
                voice_id=voice_id,
                output_path=output_path
            )
        elif provider == "speechify":
            return await self.speechify_tts.generate_speech(
                text=text,
                voice=voice_id,
                speed=speed,
                output_path=output_path
            )
        elif provider == "google":
            return await self.google_tts.generate_speech(
                text=text,
                voice=voice_id,
                speed=speed,
                output_path=output_path
            )
        else:
            raise ValueError(f"Unknown provider: {provider}")

    def create_timeline(
        self,
        production_job_id: str,
        audio_segments: List[AudioSegment]
    ) -> Timeline:
        """
        Create timeline from audio segments

        Args:
            production_job_id: Production job ID
            audio_segments: Generated audio segments

        Returns:
            Timeline with tracks
        """
        # Create speech track
        speech_track = TimelineTrack(
            track_id="track_speech",
            track_name="Speech",
            track_type="speech",
            track_number=1,
            segments=audio_segments,
            volume=1.0
        )

        # Create music track (empty for now)
        music_track = TimelineTrack(
            track_id="track_music",
            track_name="Background Music",
            track_type="music",
            track_number=2,
            segments=[],
            volume=0.3
        )

        # Create SFX track (empty for now)
        sfx_track = TimelineTrack(
            track_id="track_sfx",
            track_name="Sound Effects",
            track_type="sfx",
            track_number=3,
            segments=[],
            volume=0.5
        )

        # Calculate total duration
        total_duration = max(
            (seg.end_time for seg in audio_segments),
            default=0.0
        )

        timeline = Timeline(
            production_job_id=production_job_id,
            total_duration=total_duration,
            tracks=[speech_track, music_track, sfx_track],
            sample_rate=44100,
            bit_depth=16
        )

        logger.info(f"Created timeline with duration {total_duration:.2f}s")
        return timeline

    async def regenerate_segment(
        self,
        production_job_id: str,
        segment: AudioSegment
    ) -> AudioSegment:
        """
        Regenerate single segment (after edits)

        Args:
            production_job_id: Production job ID
            segment: AudioSegment with updates

        Returns:
            Updated AudioSegment with new audio
        """
        output_dir = settings.PODCAST_OUTPUT_DIR / f"production_{production_job_id}" / "segments"
        output_dir.mkdir(parents=True, exist_ok=True)

        output_path = output_dir / f"segment_{segment.segment_number:03d}_{segment.segment_id}_v2.mp3"

        try:
            audio_bytes = await self._generate_audio_for_segment(
                text=segment.text or "",
                provider=segment.provider or "openai",
                voice_id=segment.voice_id or "alloy",
                output_path=output_path,
                speed=segment.speed
            )

            # Update segment
            segment.audio_path = str(output_path)
            segment.audio_url = f"/api/production/audio/{production_job_id}/{segment.segment_id}"
            segment.status = "ready"
            segment.error_message = None

            logger.info(f"Regenerated segment {segment.segment_id}")
            return segment

        except Exception as e:
            logger.error(f"Failed to regenerate segment: {e}")
            segment.status = "error"
            segment.error_message = str(e)
            return segment

    async def export_final_podcast(
        self,
        production_job_id: str,
        timeline: Timeline,
        format: str = "mp3",
        quality: str = "high",
        normalize: bool = True
    ) -> Tuple[Path, int, float]:
        """
        Export final podcast by merging all segments

        Args:
            production_job_id: Production job ID
            timeline: Timeline with all tracks and segments
            format: Output format ("mp3", "wav")
            quality: Quality level ("low", "medium", "high")
            normalize: Normalize audio levels

        Returns:
            Tuple of (output_path, file_size_bytes, duration_seconds)
        """
        logger.info(f"Exporting final podcast: {production_job_id}")

        output_dir = settings.PODCAST_OUTPUT_DIR / f"production_{production_job_id}"
        output_dir.mkdir(parents=True, exist_ok=True)

        output_path = output_dir / f"final_podcast.{format}"

        # TODO: Implement audio merging with pydub/ffmpeg
        # For now, just concatenate speech segments

        try:
            # Collect all speech segments in order
            speech_track = next(
                (t for t in timeline.tracks if t.track_type == "speech"),
                None
            )

            if not speech_track or not speech_track.segments:
                raise ValueError("No speech segments found")

            # Sort segments by segment_number
            sorted_segments = sorted(
                speech_track.segments,
                key=lambda s: s.segment_number
            )

            # Placeholder: Just copy first segment as "final" for now
            # In production, use pydub to merge:
            # from pydub import AudioSegment
            # combined = AudioSegment.empty()
            # for seg in sorted_segments:
            #     audio = AudioSegment.from_file(seg.audio_path)
            #     combined += audio
            # combined.export(output_path, format=format)

            first_segment_path = Path(sorted_segments[0].audio_path)
            if first_segment_path.exists():
                import shutil
                shutil.copy(first_segment_path, output_path)

            file_size = output_path.stat().st_size
            duration = timeline.total_duration

            logger.info(f"Exported final podcast: {file_size} bytes, {duration:.2f}s")

            return output_path, file_size, duration

        except Exception as e:
            logger.error(f"Export failed: {e}")
            raise
