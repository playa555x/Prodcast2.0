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

        Professional research framework based on top podcasts like:
        - Tim Ferriss: Deep expert interviews with actionable insights
        - Joe Rogan: Conversational exploration with surprising angles
        - Lex Fridman: Intellectual depth with philosophical connections

        Args:
            topic: Research topic
            sources_summary: Summary of sources found

        Returns:
            Research analysis text with podcast-ready structure
        """
        system_prompt = """You are a world-class podcast researcher and content strategist.

Your expertise combines:
- Investigative journalism (find the untold stories)
- Academic research (cite credible sources)
- Entertainment value (make complex topics fascinating)
- Audience psychology (what keeps listeners engaged)

Research Philosophy:
1. Go beyond surface-level facts - find the WHY and WHAT IF
2. Identify controversial/surprising angles that spark debate
3. Connect abstract concepts to real-world impact
4. Find emotional hooks and human stories behind data
5. Anticipate listener questions and objections

You analyze topics like the best podcast researchers:
- Tim Ferriss's team: Depth, practical applications, expert perspectives
- Malcolm Gladwell: Pattern recognition across domains
- Lex Fridman: Philosophical depth, first-principles thinking"""

        prompt = f"""
Research Topic: "{topic}"

Available Sources:
{sources_summary}

Create a comprehensive podcast research brief that includes:

1. HOOK POTENTIAL (Critical for First 30 Seconds)
   - Most surprising/controversial fact or statistic
   - Provocative question that challenges conventional wisdom
   - Personal relevance angle ("Why listeners should care NOW")
   - Celebrity/authority connection if available

2. STORY ARC FRAMEWORK
   - Act 1 Foundation: Essential background (what listeners MUST know)
   - Act 2 Tension: The problem, challenge, or controversy
   - Act 3 Resolution: Solutions, insights, or new perspectives
   - Emotional journey: Map how listeners should FEEL throughout

3. EXPERT INSIGHTS & CREDIBILITY
   - Key researchers/authorities to reference (names + credentials)
   - Specific studies with numbers (e.g., "Harvard 2024 study of 10,000 participants")
   - Contrasting expert opinions (show multiple perspectives)
   - Cutting-edge/recent developments (last 6-12 months)

4. PATTERN INTERRUPTS (Every 90-120 Seconds)
   - Unexpected facts or statistics
   - Counterintuitive findings
   - Personal anecdotes or case studies
   - Format shifts (e.g., quick-fire facts, rhetorical questions)

5. PRACTICAL VALUE
   - 3-5 actionable takeaways listeners can apply TODAY
   - Common mistakes to avoid
   - Resources for further learning
   - Success stories/case studies

6. CONTROVERSY & DEBATE POTENTIAL
   - Polarizing opinions on this topic
   - "Elephant in the room" questions
   - Pushback against conventional wisdom
   - Ethical dilemmas or gray areas

7. EMOTIONAL BEATS
   - Moments of surprise: "Wait, what? That can't be right..."
   - Inspiration: Success stories, breakthroughs
   - Tension: Challenges, failures, obstacles
   - Relief: Solutions, hope, future possibilities
   - Curiosity: Open questions, mysteries

8. AUDIENCE-SPECIFIC ANGLES
   - Young audience (18-30): Pop culture refs, career impact, social media tie-ins
   - Middle-aged (30-55): Family impact, career advancement, life optimization
   - Scientific (any age): Technical depth, methodology, peer review quality

9. PRODUCTION NOTES
   - Suggested segment length and pacing
   - Music/SFX cues (e.g., "dramatic pause here", "upbeat transition")
   - Visual storytelling opportunities (for video podcasts)
   - Guest recommendation (if applicable) with specific expertise

10. QUALITY ASSESSMENT
   - Viral potential (0-10): How shareable is this content?
   - Evergreen value (0-10): Will this stay relevant?
   - Depth potential (0-10): How deep can we go?
   - Controversy level (0-10): How debatable is this?
   - Overall podcast-readiness (0-10): Production-ready score
   - Red flags: Factual disputes, outdated info, biased sources

Format as detailed JSON with all keys above. Be specific with numbers, names, and examples."""

        response = await self.send_message(
            prompt=prompt,
            system_prompt=system_prompt,
            max_tokens=6000,
            temperature=0.6
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

        system_prompt = f"""You are a world-class podcast script writer with experience from top shows:
- Joe Rogan Experience: Natural, curious, conversational, authentic
- Tim Ferriss Show: Structured, insight-driven, practical
- Lex Fridman Podcast: Intellectual, deep, philosophical
- How I Built This: Story-driven, emotional arc, inspiring

STYLE FOR {audience} AUDIENCE: {style}

PROFESSIONAL STANDARDS:

1. HOOK MASTERY (First 30 Seconds)
   - Start with most compelling moment/question
   - Create immediate curiosity gap
   - Promise specific value delivery
   - Use pattern interrupt (unexpected statement)

2. 3-ACT STRUCTURE
   ACT 1 (25%): Foundation & Setup
   - Hook + Topic intro
   - Why this matters NOW
   - Set expectations

   ACT 2 (45%): Exploration & Tension
   - Deep-dive into topic
   - Contrasting viewpoints
   - Surprising revelations
   - Pattern interrupts every 90-120 sec

   ACT 3 (30%): Resolution & Value
   - Key insights/solutions
   - Actionable takeaways
   - Emotional peak
   - CTA + Next episode tease

3. NATURAL DIALOGUE RULES
   ✓ Interruptions and cross-talk
   ✓ "Um", "uh", "like", "you know" (sparingly)
   ✓ Incomplete sentences and tangents
   ✓ Reactions: "Wait, what?", "No way!", "That's fascinating"
   ✓ Building on points: "That reminds me of...", "To your point about..."
   ✗ Perfect grammar, robotic turn-taking
   ✗ Unnatural transitions

4. PATTERN INTERRUPTS (Every 90-120 Seconds)
   - Unexpected fact/statistic
   - Personal story
   - Perspective shift
   - Energy change
   - Format variation
   - Rhetorical question

5. EMOTIONAL BEATS
   Cycle through: Curiosity → Surprise → Tension → Relief → Inspiration
   Mark emotional shifts with [EMOTION: curiosity/surprise/tension/etc]

6. CHARACTER AUTHENTICITY
   - Each speaker has unique voice
   - Personality shows through word choice
   - Respect dominance levels (higher = more air time)
   - Show expertise through insights, not just facts

7. VALUE DELIVERY
   - Minimum 3-5 actionable takeaways
   - Connect abstract to practical
   - Cite specific examples/studies
   - Address listener objections

8. ENGAGEMENT TECHNIQUES
   - Direct audience address: "If you're like most people..."
   - Open loops: "We'll get to that in a moment, but first..."
   - Callbacks: Reference earlier points
   - Foreshadowing: "This becomes important later..."

MAKE IT ENGAGING FOR {duration_minutes} MINUTES
{("Allow spontaneous deviations that enhance the core topic and return naturally" if spontaneous else "Stay focused while maintaining conversational energy")}"""

        characters_desc = "\n".join([
            f"- {c['name']} ({c['role']}): {c['personality']}, Expertise: {c.get('expertise', 'General')}, Style: {c['speech_style']}, Dominance: {c['dominance_level']}"
            for c in characters
        ])

        prompt = f"""
Create a PROFESSIONAL PODCAST SCRIPT about: "{topic}"

TARGET SPECS:
- Duration: {duration_minutes} minutes (~{duration_minutes * 180} words)
- Audience: {audience} ({style})
- Spontaneity: {randomness} ({"high - lots of natural tangents" if randomness > 0.5 else "medium - some tangents" if randomness > 0.2 else "low - focused flow"})
- Target word count: {duration_minutes * 180} words (±10%)

RESEARCH FOUNDATION:
{research_findings}

CHARACTERS:
{characters_desc}

SCRIPT STRUCTURE REQUIREMENTS:

[HOOK - 30 seconds] (~90 words)
- Start with MOST compelling insight from research
- Provocative question OR surprising statistic
- Promise specific value: "In this episode, you'll discover..."
- Create curiosity gap
[EMOTION: excitement]

[INTRO - 2 minutes] (~{int(duration_minutes * 0.10 * 180)} words)
- Natural introductions (first names, casual)
- Topic framing: Why THIS topic, why NOW
- Set listener expectations
- Light humor/rapport building
[EMOTION: curiosity]

[ACT 1: FOUNDATION - {int(duration_minutes * 0.25)} minutes] (~{int(duration_minutes * 0.25 * 180)} words)
- Essential background (what listeners MUST know)
- Connect to listener's life/experience
- First major insight from research
- Pattern interrupt: unexpected fact or personal story
[EMOTION: engagement → surprise]

[ACT 2: EXPLORATION - {int(duration_minutes * 0.45)} minutes] (~{int(duration_minutes * 0.45 * 180)} words)
- Deep-dive into main content
- Contrasting perspectives (if applicable)
- Multiple pattern interrupts (every 2-3 paragraphs):
  * Surprising statistics
  * Personal anecdotes
  * Format shifts (rapid-fire facts, Q&A style)
  * Rhetorical questions to listener
- Build tension/controversy if relevant
- {"Natural tangents that add color and return to topic" if spontaneous else "Maintain focus with energy variation"}
[EMOTION: curiosity → tension → surprise]

[ACT 3: RESOLUTION - {int(duration_minutes * 0.20)} minutes] (~{int(duration_minutes * 0.20 * 180)} words)
- Key insights/solutions
- Actionable takeaways (NUMBER them: "First...", "Second...", "Third...")
- Address potential objections
- Emotional peak (inspiration/hope/excitement)
[EMOTION: relief → inspiration]

[OUTRO - 1-2 minutes] (~300 words)
- Recap top 3-5 takeaways (bullet format in dialogue)
- Call-to-action (subtle, value-first)
- Next episode tease (create anticipation)
- Thank listeners + sign-off
[EMOTION: satisfaction]

DIALOGUE QUALITY STANDARDS:

NATURAL SPEECH PATTERNS:
✓ Interruptions: "Wait, hold on—" "Let me jump in here—"
✓ Building: "To your point about...", "That reminds me of..."
✓ Reactions: "Wow", "Really?", "No way!", "That's fascinating"
✓ Verbal fillers (minimal): "um", "uh", "like", "you know"
✓ Incomplete thoughts that get finished later
✓ Overlapping dialogue: [Speaker A + B together]

CHARACTER VOICE:
- Each character has distinct vocabulary and rhythm
- Expertise shown through insights, not jargon
- Personality in word choice (formal vs casual, technical vs simple)
- Dominance reflected in speaking time and assertiveness

ENGAGEMENT TECHNIQUES:
- Direct listener address: "If you're listening and thinking...", "Here's what this means for you..."
- Open loops: "We'll come back to that in a moment..."
- Callbacks: "Remember when we mentioned...earlier?"
- Foreshadowing: "This becomes crucial later..."
- Rhetorical questions: "What does this really mean?"

CITATIONS & CREDIBILITY:
- Specific sources: "According to Dr. [Name] from [Institution]..."
- Study details: "A 2024 study of 10,000 participants found..."
- Numbers and stats: "73% of people...", "Researchers discovered..."
- Expert quotes (paraphrased conversationally)

PACING MARKERS (Include these in script):
[PAUSE - 3 sec] - for dramatic effect
[MUSIC CUE: upbeat/dramatic/contemplative] - transition marker
[SFX: relevant sound] - if enhances story
[ENERGY SHIFT: high/low] - pacing guide

OUTPUT FORMAT:

[HOOK]
Host: [Opening with STRONGEST hook from research]
[EMOTION: excitement]

[INTRO]
Host: [Natural introduction]
Guest: [Response + topic excitement]
[...]

[ACT 1: Foundation]
[MUSIC CUE: upbeat transition]
Host: [Background setup]
Guest: [Expert perspective]
Host: [Pattern interrupt - surprising fact]
[PAUSE - 2 sec]
Guest: [Reaction + deeper insight]
[...]

[Continue through all acts with markers]

QUALITY CHECKLIST (Verify in output):
□ Hook in first 30 seconds with research's best insight
□ 3-5 numbered takeaways in outro
□ Pattern interrupt every 2-3 minutes
□ At least 3 different emotions marked
□ Natural dialogue (interruptions, reactions, tangents)
□ Specific citations from research
□ Next episode tease at end
□ Target word count: {duration_minutes * 180} (±10%)

Make it sound like a REAL CONVERSATION between experts who are passionate about the topic, not a scripted interview.
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
