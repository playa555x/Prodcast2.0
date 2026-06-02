using System;
using System.Collections.Generic;

namespace HeartMatch.Core
{
    /// <summary>
    /// Serialisierbarer Gesamt-Spielstand (Quelle der Wahrheit auf dem Client).
    /// Reines DTO ohne UnityEngine-Abhängigkeit; (de)serialisiert via Newtonsoft.
    /// </summary>
    [Serializable]
    public sealed class GameState
    {
        public const int CurrentVersion = 1;

        public int Version = CurrentVersion;
        public string PlayerId = "";
        public int AccountLevel = 1;
        public long Xp = 0;

        public WalletData Wallet = new();
        public List<CharacterProgress> Characters = new();
        public string ActiveCharacterId = "";
        public int StoryBeatsSinceSwap = 0;

        public ProgressionData Progression = new();
        public SettingsData Settings = new();
        public long LastSyncUnix = 0;

        public CharacterProgress GetOrCreateCharacter(string id)
        {
            var c = Characters.Find(x => x.Id == id);
            if (c == null)
            {
                c = new CharacterProgress { Id = id };
                Characters.Add(c);
            }
            return c;
        }
    }

    [Serializable]
    public sealed class WalletData
    {
        public long Coins = 0;
        public long Gems = 0;
        public int Energy = 5;
        public long Tokens = 0;
        // Unix-Zeit (Sekunden) des letzten Energie-Regen-Ticks.
        public long EnergyTimestampUnix = 0;
    }

    [Serializable]
    public sealed class CharacterProgress
    {
        public string Id = "";
        public float Affection = 0f;
        public float Trust = 0f;
        public float Mood = 50f;
        public float Tension = 0f;     // nur Adult-Tier relevant
        public float Boredom = 0f;
        public int Tier = 0;
        public List<int> UnlockedRewardTiers = new();
        public List<string> MemoryLog = new();
        // Unix-Zeit des letzten Updates (für Echtzeit-Verfall).
        public long LastUpdatedUnix = 0;
    }

    [Serializable]
    public sealed class ProgressionData
    {
        public List<string> UnlockedAchievements = new();
        public List<string> CompletedQuests = new();
        public int LoginStreak = 0;
        public long LastLoginUnix = 0;
        public List<string> CompletedCollections = new();
    }

    [Serializable]
    public sealed class SettingsData
    {
        public float MusicVolume = 0.8f;
        public float SfxVolume = 1.0f;
        public bool ColorblindMode = false;
        public bool ReducedEffects = false;
        public string Locale = "de";
        public bool AnalyticsConsent = false;
        public bool AgeConfirmed = false;
    }
}
