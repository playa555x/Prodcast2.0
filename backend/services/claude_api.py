"""
Claude AI API Service
Production-Ready Anthropic Claude Integration for Research & Content Generation
"""

import httpx
import logging
import json
from typing import Optional, Dict, List
from core.config import settings

logger = logging.getLogger(__name__)

class ClaudeAPIService:
    """
    Anthropic Claude API Service

    Documentation: https://docs.anthropic.com/claude/reference/messages_post
    """

    BASE_URL = "https://api.anthropic.com/v1"

    def __init__(self):
        """Initialize Claude API service"""
        self.api_key = settings.ANTHROPIC_API_KEY
        self.model = settings.ANTHROPIC_MODEL

        if not self.api_key:
            logger.warning("Anthropic API key not configured")

    def is_available(self) -> bool:
        """Check if service is available (API key configured)"""
        return self.api_key is not None and len(self.api_key) > 0

    async def send_message(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: int = 4096,
        temperature: float = 0.7
    ) -> Dict:
        """
        Send a message to Claude and get response

        Args:
            prompt: User prompt/question
            system_prompt: System instructions (optional)
            max_tokens: Maximum tokens in response
            temperature: Creativity (0.0-1.0)

        Returns:
            Response dict with "content" and "usage"

        Raises:
            Exception: If API call fails
        """
        if not self.is_available():
            raise Exception("Anthropic API key not configured")

        logger.info(f"Sending message to Claude: {len(prompt)} chars")

        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }

        payload = {
            "model": self.model,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        }

        # Add system prompt if provided
        if system_prompt:
            payload["system"] = system_prompt

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    f"{self.BASE_URL}/messages",
                    headers=headers,
                    json=payload
                )

                if response.status_code == 200:
                    data = response.json()

                    # Extract text content
                    content = ""
                    if "content" in data and len(data["content"]) > 0:
                        content = data["content"][0].get("text", "")

                    logger.info(f"Claude response: {len(content)} chars")

                    return {
                        "content": content,
                        "usage": data.get("usage", {}),
                        "model": data.get("model"),
                        "stop_reason": data.get("stop_reason")
                    }
                else:
                    error_msg = f"Claude API error: {response.status_code} - {response.text}"
                    logger.error(error_msg)
                    raise Exception(error_msg)

        except httpx.TimeoutException:
            logger.error("Claude API request timed out")
            raise Exception("Claude API request timed out")
        except Exception as e:
            logger.error(f"Claude API error: {e}")
            raise

    async def research_topic(self, topic: str, sources_summary: str) -> str:
        """
        Perform research on a topic using Claude

        Args:
            topic: Research topic
            sources_summary: Summary of sources found

        Returns:
            Research analysis text
        """
        system_prompt = """You are an expert researcher and podcast content analyst.
Your task is to analyze sources and provide deep insights for podcast creation.
Focus on:
- Key facts and findings
- Interesting angles and perspectives
- Potential discussion points
- Controversial or debatable aspects
- Real-world applications and examples"""

        prompt = f"""
Research Topic: {topic}

Available Sources Summary:
{sources_summary}

Please provide:
1. Key Findings (top 5-10 insights)
2. Suggested Podcast Structure (segments/topics)
3. Discussion Points (interesting angles)
4. Real-world Examples
5. Quality Assessment (0-10 score with reasoning)

Format as JSON with keys: key_findings, structure, discussion_points, examples, quality_score, quality_reasoning
"""

        response = await self.send_message(
            prompt=prompt,
            system_prompt=system_prompt,
            max_tokens=3000,
            temperature=0.5
        )

        return response["content"]

    async def generate_podcast_script(
        self,
        topic: str,
        research_findings: str,
        audience: str,
        duration_minutes: int,
        characters: List[Dict],
        spontaneous: bool = True,
        randomness: float = 0.3
    ) -> str:
        """
        Generate complete podcast script for specific audience

        Args:
            topic: Podcast topic
            research_findings: Research results
            audience: Target audience ("young", "middle_aged", "scientific")
            duration_minutes: Target duration
            characters: List of character dicts
            spontaneous: Allow spontaneous deviations
            randomness: Randomness level (0-1)

        Returns:
            Complete podcast script
        """

        audience_styles = {
            "young": "locker, humorvoll, mit Pop-Kultur Referenzen, moderne Sprache, energiegeladen",
            "middle_aged": "ausgewogen, informativ aber unterhaltsam, lebensnah, praxisorientiert",
            "scientific": "präzise, faktenbasiert, mit Quellenangaben, akademisch aber verständlich"
        }

        style = audience_styles.get(audience, "ausgewogen")

        system_prompt = f"""You are an expert podcast script writer.
Create engaging, natural-sounding conversations between podcast participants.

Style for {audience} audience: {style}

Key principles:
- Natural dialogue flow (like real conversations)
- {"Spontaneous topic deviations that return to main theme" if spontaneous else "Stay focused on topic"}
- Each character has distinct personality and speech patterns
- Include transitions, reactions, agreements/disagreements
- Add humor and storytelling where appropriate
- Make it engaging for {duration_minutes} minutes"""

        characters_desc = "\n".join([
            f"- {c['name']} ({c['role']}): {c['personality']}, Expertise: {c.get('expertise', 'General')}, Style: {c['speech_style']}, Dominance: {c['dominance_level']}"
            for c in characters
        ])

        prompt = f"""
Create a complete podcast script about: {topic}

Duration: {duration_minutes} minutes (~{duration_minutes * 150} words)
Target Audience: {audience}
Randomness Level: {randomness} ({"high" if randomness > 0.5 else "medium" if randomness > 0.2 else "low"})

Research Findings:
{research_findings}

Characters:
{characters_desc}

Requirements:
1. Natural conversation format: [Character Name]: dialogue
2. Include spontaneous moments (jokes, tangents, reactions)
3. Each character speaks according to their personality
4. Respect dominance levels (higher = speaks more)
5. Include intro and outro
6. Mark spontaneous deviations with [SPONTAN: topic]

Output format:
```
[INTRO]
Host: ...
Guest: ...

[SEGMENT 1: Topic Name]
...

[SPONTAN: Side Topic]
...

[OUTRO]
...
```
"""

        response = await self.send_message(
            prompt=prompt,
            system_prompt=system_prompt,
            max_tokens=8000,
            temperature=0.7 + randomness * 0.3  # More random if requested
        )

        return response["content"]

    async def recommend_variant(
        self,
        topic: str,
        variants_summary: str
    ) -> Dict[str, str]:
        """
        Get recommendation for which variant to use

        Args:
            topic: Podcast topic
            variants_summary: Summary of all 3 variants

        Returns:
            Dict with "recommended" (audience type) and "reason"
        """
        system_prompt = """You are a podcast production consultant.
Analyze the topic and variants to recommend the best fit."""

        prompt = f"""
Topic: {topic}

Variants Summary:
{variants_summary}

Which variant (young, middle_aged, or scientific) would work best for this topic and why?

Respond in JSON format:
{{
  "recommended": "young|middle_aged|scientific",
  "reason": "detailed explanation (2-3 sentences)"
}}
"""

        response = await self.send_message(
            prompt=prompt,
            system_prompt=system_prompt,
            max_tokens=500,
            temperature=0.3
        )

        try:
            # Extract JSON from response
            content = response["content"]
            if "```json" in content:
                content = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                content = content.split("```")[1].split("```")[0].strip()

            result = json.loads(content)
            return result
        except:
            # Fallback
            return {
                "recommended": "middle_aged",
                "reason": "Balanced approach works for most topics"
            }
