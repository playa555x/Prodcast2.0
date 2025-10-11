"""
Podcast Research Service
AI-Powered Multi-Source Research & Script Generation
"""

import asyncio
import logging
import json
import random
from typing import List, Dict, Optional
from pathlib import Path
from datetime import datetime
import uuid

from services.claude_api import ClaudeAPIService
from services.mcp_client import get_mcp_client
from models.research import (
    ResearchRequest, ResearchResult, ResearchSource,
    PodcastCharacter, CharacterType, AudienceType,
    ScriptVariant, ConversationSegment
)
from core.config import settings

logger = logging.getLogger(__name__)

class PodcastResearchService:
    """
    Complete podcast research and generation service
    """

    def __init__(self):
        """Initialize research service"""
        self.claude = ClaudeAPIService()

    async def execute_research(self, request: ResearchRequest) -> tuple[ResearchResult, List[ScriptVariant], AudienceType, str]:
        """
        Execute complete research pipeline

        Args:
            request: Research request

        Returns:
            Tuple of (research_result, script_variants, recommended_audience, reason)
        """
        logger.info(f"Starting research for topic: {request.topic}")

        # Step 1: Multi-source research
        research_result = await self._perform_research(request)

        # Step 2: Generate characters
        characters = self._generate_characters(
            num_guests=request.num_guests,
            include_listener=request.include_listener_topics
        )

        # Step 3: Generate 3 script variants (young, middle_aged, scientific)
        variants = await self._generate_variants(
            request=request,
            research_result=research_result,
            characters=characters
        )

        # Step 4: Get recommendation from Claude
        recommended, reason = await self._get_recommendation(
            topic=request.topic,
            variants=variants
        )

        logger.info(f"Research completed: {len(variants)} variants, recommended: {recommended}")

        return research_result, variants, recommended, reason

    async def _perform_research(self, request: ResearchRequest) -> ResearchResult:
        """
        Perform multi-source research

        Returns:
            ResearchResult with all sources
        """
        sources: List[ResearchSource] = []

        # YouTube research (if enabled)
        if request.include_youtube and settings.MCP_YOUTUBE_ENABLED:
            youtube_sources = await self._research_youtube(request.topic)
            sources.extend(youtube_sources)

        # Podcast research (best practices)
        if request.include_podcasts:
            podcast_sources = await self._research_podcasts(request.topic)
            sources.extend(podcast_sources)

        # Web search (general + scientific)
        if request.include_scientific or request.include_everyday:
            web_sources = await self._research_web(
                topic=request.topic,
                scientific=request.include_scientific,
                everyday=request.include_everyday
            )
            sources.extend(web_sources)

        # Limit sources
        sources = sources[:settings.RESEARCH_MAX_SOURCES]

        # Get Claude analysis
        sources_summary = "\n\n".join([
            f"[{s.source_type.upper()}] {s.title}\n{s.summary}\nKey Points: {', '.join(s.key_insights[:3])}"
            for s in sources
        ])

        try:
            claude_analysis = await self.claude.research_topic(
                topic=request.topic,
                sources_summary=sources_summary
            )

            # Parse Claude response
            analysis_data = self._parse_research_analysis(claude_analysis)

            return ResearchResult(
                topic=request.topic,
                total_sources=len(sources),
                sources=sources,
                key_findings=analysis_data.get("key_findings", []),
                suggested_structure=analysis_data.get("structure", []),
                estimated_quality_score=analysis_data.get("quality_score", 7.0)
            )
        except Exception as e:
            logger.error(f"Claude analysis failed: {e}")
            # Fallback
            return ResearchResult(
                topic=request.topic,
                total_sources=len(sources),
                sources=sources,
                key_findings=[f"Source: {s.title}" for s in sources[:5]],
                suggested_structure=["Intro", "Main Discussion", "Conclusion"],
                estimated_quality_score=6.0
            )

    async def _research_youtube(self, topic: str) -> List[ResearchSource]:
        """Research YouTube videos via MCP"""
        logger.info(f"YouTube research for: {topic}")

        sources = []

        # Check if MCP is enabled in config
        if not settings.MCP_YOUTUBE_ENABLED:
            logger.warning("YouTube MCP disabled in configuration")
            return sources

        try:
            # Get MCP client
            mcp = await get_mcp_client()

            # Check if client is actually initialized and has session
            if not mcp._initialized:
                logger.warning("MCP client not initialized")
                return sources

            if not mcp.youtube_session:
                logger.warning("YouTube MCP session not available")
                return sources

            # Search YouTube via MCP
            videos = await mcp.search_youtube(
                query=topic,
                max_results=3
            )

            # Convert to ResearchSource objects
            for video in videos:
                snippet = video.get("snippet", {})
                video_id = video.get("id", {}).get("videoId", "")

                source = ResearchSource(
                    source_type="youtube",
                    title=snippet.get("title", f"{topic} Video"),
                    url=f"https://youtube.com/watch?v={video_id}" if video_id else None,
                    summary=snippet.get("description", f"Video about {topic}")[:200],
                    key_insights=[
                        snippet.get("title", ""),
                        f"Channel: {snippet.get('channelTitle', 'Unknown')}",
                        f"Published: {snippet.get('publishedAt', 'Unknown')}"
                    ],
                    credibility_score=0.8
                )
                sources.append(source)

            logger.info(f"✅ Found {len(sources)} YouTube videos via MCP")

        except Exception as e:
            logger.error(f"YouTube MCP research failed: {e}", exc_info=True)
            # Return empty list on error - service will continue with other sources

        return sources

    async def _research_podcasts(self, topic: str) -> List[ResearchSource]:
        """Analyze best podcasts for format inspiration"""
        logger.info(f"Podcast research for: {topic}")

        # Best podcast practices (hardcoded for now)
        return [
            ResearchSource(
                source_type="podcast",
                title="Best Podcast Format Analysis",
                url=None,
                summary="Analyse der erfolgreichsten Podcast-Formate: Joe Rogan Experience, Lex Fridman, Huberman Lab",
                key_insights=[
                    "Natürliche Gesprächsführung statt Skript",
                    "Spontane Abschweifungen machen es authentisch",
                    "Gäste mit starker Persönlichkeit sind wichtig",
                    "Humor und Storytelling erhöhen Engagement",
                    "30-60 Minuten optimale Länge"
                ],
                credibility_score=0.9
            )
        ]

    async def _research_web(self, topic: str, scientific: bool, everyday: bool) -> List[ResearchSource]:
        """Research web sources via MCP"""
        logger.info(f"Web research for: {topic} (scientific={scientific}, everyday={everyday})")

        sources = []

        # Check if MCP is enabled
        if not settings.MCP_WEB_SCRAPING_ENABLED:
            logger.warning("Web scraping MCP disabled in configuration")
            return sources

        try:
            # Get MCP client
            mcp = await get_mcp_client()

            # Check availability
            if not mcp._initialized or not mcp.web_session:
                logger.warning("Web MCP session not available")
                return sources

            # Build search queries
            queries = []
            if scientific:
                queries.append(f"{topic} research study scientific")
            if everyday:
                queries.append(f"{topic} practical everyday use")

            # Search web via MCP for each query
            for query in queries:
                try:
                    results = await mcp.search_web(
                        query=query,
                        max_results=5
                    )

                    # Convert to ResearchSource objects
                    for result in results[:3]:  # Take top 3 per query
                        source_type = "scientific" if "research" in query or "scientific" in query else "web"

                        source = ResearchSource(
                            source_type=source_type,
                            title=result.get("title", f"{topic} Article"),
                            url=result.get("url", None),
                            summary=result.get("description", f"Article about {topic}")[:300],
                            key_insights=[
                                result.get("title", "")[:100],
                                f"Published: {result.get('publishedDate', 'Unknown')}",
                                "Source: Web Search via MCP"
                            ],
                            credibility_score=0.85 if source_type == "scientific" else 0.7
                        )
                        sources.append(source)

                    logger.info(f"✅ Found {len(results)} web results for '{query}' via MCP")

                except Exception as e:
                    logger.error(f"Web search failed for '{query}': {e}", exc_info=True)
                    continue

        except Exception as e:
            logger.error(f"Web MCP research failed: {e}", exc_info=True)
            # Return empty list - no fallback mock data

        return sources

    def _generate_characters(self, num_guests: int, include_listener: bool) -> List[Dict]:
        """Generate podcast characters"""
        characters = []

        # Host (always present)
        host = {
            "id": "host_1",
            "name": "Alex",
            "role": "host",
            "personality": "neugierig, humorvoll, moderiert geschickt",
            "expertise": "Podcast-Moderation",
            "speech_style": "locker und einladend",
            "dominance_level": 0.4
        }
        characters.append(host)

        # Guests
        guest_names = ["Dr. Sarah", "Michael", "Prof. Klein", "Emma"]
        guest_personalities = [
            "wissenschaftlich präzise, aber zugänglich",
            "praxiserfahren, storyteller",
            "akademisch fundiert, kritisch",
            "innovativ denkend, visionär"
        ]

        for i in range(num_guests):
            guest = {
                "id": f"guest_{i+1}",
                "name": guest_names[i % len(guest_names)],
                "role": "guest",
                "personality": guest_personalities[i % len(guest_personalities)],
                "expertise": "Fachexpertise",
                "speech_style": "informativ aber unterhaltsam",
                "dominance_level": 0.5 + random.uniform(-0.1, 0.1)
            }
            characters.append(guest)

        # Listener (side topics)
        if include_listener:
            listener = {
                "id": "listener_1",
                "name": "Hörer-Frage",
                "role": "listener",
                "personality": "neugierig, bringt Außensicht",
                "expertise": None,
                "speech_style": "fragend, interessiert",
                "dominance_level": 0.15
            }
            characters.append(listener)

        return characters

    async def _generate_variants(
        self,
        request: ResearchRequest,
        research_result: ResearchResult,
        characters: List[Dict]
    ) -> List[ScriptVariant]:
        """Generate 3 script variants for different audiences"""
        logger.info("Generating 3 script variants...")

        research_summary = f"""
Topic: {request.topic}

Key Findings:
{chr(10).join([f"- {f}" for f in research_result.key_findings[:10]])}

Suggested Structure:
{chr(10).join([f"- {s}" for s in research_result.suggested_structure])}

Sources: {research_result.total_sources} sources analyzed
Quality Score: {research_result.estimated_quality_score}/10
"""

        variants = []

        for audience in [AudienceType.YOUNG, AudienceType.MIDDLE_AGED, AudienceType.SCIENTIFIC]:
            try:
                script_text = await self.claude.generate_podcast_script(
                    topic=request.topic,
                    research_findings=research_summary,
                    audience=audience.value,
                    duration_minutes=request.target_duration_minutes,
                    characters=characters,
                    spontaneous=request.spontaneous_deviations,
                    randomness=request.randomness_level
                )

                # Parse script into segments
                segments = self._parse_script_segments(script_text, characters)

                variant = ScriptVariant(
                    audience=audience,
                    title=f"{request.topic} - {audience.value.replace('_', ' ').title()}",
                    description=f"Podcast für {audience.value.replace('_', ' ')} Zielgruppe",
                    characters=[
                        PodcastCharacter(**c) for c in characters
                    ],
                    segments=segments,
                    total_duration_minutes=request.target_duration_minutes,
                    word_count=len(script_text.split()),
                    tone=self._get_tone_description(audience),
                    full_script=script_text
                )

                variants.append(variant)
                logger.info(f"Generated variant for {audience.value}: {variant.word_count} words")

            except Exception as e:
                logger.error(f"Failed to generate variant for {audience}: {e}")
                # Continue with other variants

        return variants

    def _parse_script_segments(self, script: str, characters: List[Dict]) -> List[ConversationSegment]:
        """Parse script text into conversation segments"""
        segments = []
        lines = script.split("\n")

        segment_num = 1
        for line in lines:
            line = line.strip()
            if not line or line.startswith("[") or line.startswith("#"):
                continue

            # Try to parse "Name: dialogue"
            if ":" in line:
                parts = line.split(":", 1)
                speaker_name = parts[0].strip()
                text = parts[1].strip()

                # Find character ID
                speaker_id = next(
                    (c["id"] for c in characters if c["name"].lower() in speaker_name.lower()),
                    "unknown"
                )

                # Check if spontaneous
                is_spontan = "[SPONTAN" in script[max(0, script.find(line) - 100):script.find(line)]

                segment = ConversationSegment(
                    segment_number=segment_num,
                    speaker_id=speaker_id,
                    speaker_name=speaker_name,
                    text=text,
                    duration_estimate_seconds=len(text.split()) / 2.5,  # ~150 words/min
                    is_spontaneous=is_spontan
                )

                segments.append(segment)
                segment_num += 1

        return segments

    def _get_tone_description(self, audience: AudienceType) -> str:
        """Get tone description for audience"""
        tones = {
            AudienceType.YOUNG: "locker, humorvoll, energiegeladen",
            AudienceType.MIDDLE_AGED: "ausgewogen, informativ und unterhaltsam",
            AudienceType.SCIENTIFIC: "präzise, faktenbasiert, akademisch"
        }
        return tones.get(audience, "ausgewogen")

    async def _get_recommendation(
        self,
        topic: str,
        variants: List[ScriptVariant]
    ) -> tuple[AudienceType, str]:
        """Get Claude's recommendation for best variant"""
        variants_summary = "\n\n".join([
            f"{v.audience.value}:\nTone: {v.tone}\nWords: {v.word_count}\nSegments: {len(v.segments)}"
            for v in variants
        ])

        try:
            result = await self.claude.recommend_variant(
                topic=topic,
                variants_summary=variants_summary
            )

            audience_str = result.get("recommended", "middle_aged")
            audience = AudienceType(audience_str)
            reason = result.get("reason", "Ausgewogene Balance zwischen Information und Unterhaltung")

            return audience, reason
        except Exception as e:
            logger.error(f"Recommendation failed: {e}")
            return AudienceType.MIDDLE_AGED, "Fallback: Ausgewogener Stil für breites Publikum"

    def _parse_research_analysis(self, analysis_text: str) -> Dict:
        """Parse Claude's research analysis"""
        try:
            # Try to extract JSON
            if "```json" in analysis_text:
                json_str = analysis_text.split("```json")[1].split("```")[0].strip()
            elif "```" in analysis_text:
                json_str = analysis_text.split("```")[1].split("```")[0].strip()
            elif "{" in analysis_text:
                # Find JSON object
                start = analysis_text.find("{")
                end = analysis_text.rfind("}") + 1
                json_str = analysis_text[start:end]
            else:
                json_str = analysis_text

            return json.loads(json_str)
        except:
            # Fallback parsing
            return {
                "key_findings": ["Research finding 1", "Finding 2", "Finding 3"],
                "structure": ["Intro", "Main", "Outro"],
                "discussion_points": [],
                "examples": [],
                "quality_score": 7.0,
                "quality_reasoning": "Good sources"
            }

    async def save_variants_to_filesystem(
        self,
        job_id: str,
        variants: List[ScriptVariant],
        research_result: ResearchResult
    ) -> tuple[str, Dict[str, str]]:
        """
        Save variants to filesystem

        Args:
            job_id: Job ID
            variants: Script variants
            research_result: Research results

        Returns:
            Tuple of (output_directory, file_paths_dict)
        """
        # Create output directory
        output_dir = settings.PODCAST_OUTPUT_DIR / f"research_{job_id}"
        output_dir.mkdir(parents=True, exist_ok=True)

        file_paths = {}

        # Save research summary
        research_file = output_dir / "00_research_summary.txt"
        with open(research_file, "w", encoding="utf-8") as f:
            f.write(f"RESEARCH SUMMARY\n")
            f.write(f"=" * 80 + "\n\n")
            f.write(f"Topic: {research_result.topic}\n")
            f.write(f"Sources: {research_result.total_sources}\n")
            f.write(f"Quality Score: {research_result.estimated_quality_score}/10\n\n")
            f.write(f"KEY FINDINGS:\n")
            for i, finding in enumerate(research_result.key_findings, 1):
                f.write(f"{i}. {finding}\n")
            f.write(f"\n\nSUGGESTED STRUCTURE:\n")
            for item in research_result.suggested_structure:
                f.write(f"- {item}\n")

        file_paths["research"] = str(research_file)

        # Save each variant
        for variant in variants:
            filename = f"{variant.audience.value}_variant.txt"
            file_path = output_dir / filename

            with open(file_path, "w", encoding="utf-8") as f:
                f.write(f"PODCAST SCRIPT - {variant.audience.value.upper()}\n")
                f.write(f"=" * 80 + "\n\n")
                f.write(f"Title: {variant.title}\n")
                f.write(f"Audience: {variant.audience.value}\n")
                f.write(f"Tone: {variant.tone}\n")
                f.write(f"Duration: ~{variant.total_duration_minutes} minutes\n")
                f.write(f"Word Count: {variant.word_count}\n\n")
                f.write(f"CHARACTERS:\n")
                for char in variant.characters:
                    f.write(f"- {char.name} ({char.role.value}): {char.personality}\n")
                f.write(f"\n\n")
                f.write(f"=" * 80 + "\n")
                f.write(f"FULL SCRIPT:\n")
                f.write(f"=" * 80 + "\n\n")
                f.write(variant.full_script)

            file_paths[variant.audience.value] = str(file_path)

        logger.info(f"Saved {len(variants)} variants to {output_dir}")

        return str(output_dir), file_paths
