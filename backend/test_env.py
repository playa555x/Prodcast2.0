"""
Test script to verify .env loading and API keys
"""
import sys
import os
from pathlib import Path

# Force UTF-8 encoding on Windows
if sys.platform == "win32":
    import codecs
    sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())

# Add backend directory to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from core.config import settings

print("=" * 50)
print("Environment Configuration Test")
print("=" * 50)

print(f"\n🔧 App Name: {settings.APP_NAME}")
print(f"📦 Version: {settings.APP_VERSION}")
print(f"🐛 Debug Mode: {settings.DEBUG}")

print("\n" + "=" * 50)
print("TTS API Keys Status")
print("=" * 50)

# Speechify
if settings.SPEECHIFY_API_KEY:
    key = settings.SPEECHIFY_API_KEY
    print(f"✅ Speechify: {key[:10]}...{key[-10:]}")
else:
    print("❌ Speechify: NOT CONFIGURED")

# ElevenLabs
if settings.ELEVENLABS_API_KEY:
    key = settings.ELEVENLABS_API_KEY
    print(f"✅ ElevenLabs: {key[:10]}...{key[-10:]}")
else:
    print("❌ ElevenLabs: NOT CONFIGURED")

# OpenAI
if settings.OPENAI_API_KEY:
    key = settings.OPENAI_API_KEY
    print(f"✅ OpenAI: {key[:10]}...{key[-10:]}")
else:
    print("❌ OpenAI: NOT CONFIGURED")

# Google
if settings.GOOGLE_API_KEY:
    key = settings.GOOGLE_API_KEY
    print(f"✅ Google: {key[:10]}...{key[-10:]}")
else:
    print("❌ Google: NOT CONFIGURED")

print("\n" + "=" * 50)
print("Testing TTS Services")
print("=" * 50)

from services.speechify_tts import SpeechifyTTSService
from services.elevenlabs_tts import ElevenLabsTTSService
from services.openai_tts import OpenAITTSService

speechify = SpeechifyTTSService()
elevenlabs = ElevenLabsTTSService()
openai = OpenAITTSService()

print(f"\n🎤 Speechify available: {speechify.is_available()}")
print(f"🎤 ElevenLabs available: {elevenlabs.is_available()}")
print(f"🎤 OpenAI available: {openai.is_available()}")

if speechify.is_available():
    voices = speechify.get_voices()
    print(f"   → {len(voices)} Speechify voices loaded")

if elevenlabs.is_available():
    voices = elevenlabs.get_voices()
    print(f"   → {len(voices)} ElevenLabs voices loaded")

if openai.is_available():
    voices = openai.get_voices()
    print(f"   → {len(voices)} OpenAI voices loaded")

print("\n" + "=" * 50)
print("Database Configuration")
print("=" * 50)
print(f"📊 Database URL: {settings.DATABASE_URL}")

print("\n✅ Configuration test complete!")
