using HeartMatch.Core;

namespace HeartMatch.Tamagotchi
{
    /// <summary>Echtzeit-Verfall der Charakter-Stats (Tamagotchi-Aspekt). Reine Logik.</summary>
    public static class NeedsSystem
    {
        // Verfall pro Stunde (vgl. Design A2.1).
        public const float AffectionPerHour = 1.0f;
        public const float TrustPerHour = 0.25f;
        public const float MoodPerHour = 4.0f;
        // Langeweile baut sich im Leerlauf ab (Charakter "vermisst" Abwechslung -> wieder offen dafür).
        public const float BoredomDecayPerHour = 2.0f;

        /// <summary>Wendet den Verfall für die verstrichene Zeit (in Sekunden) an.</summary>
        public static void ApplyDecay(CharacterProgress c, long elapsedSeconds)
        {
            if (elapsedSeconds <= 0) return;
            float hours = elapsedSeconds / 3600f;

            c.Affection = MoodSystem.Clamp01To100(c.Affection - AffectionPerHour * hours);
            c.Trust = MoodSystem.Clamp01To100(c.Trust - TrustPerHour * hours);
            c.Mood = MoodSystem.Clamp01To100(c.Mood - MoodPerHour * hours);
            c.Boredom = MoodSystem.Clamp01To100(c.Boredom - BoredomDecayPerHour * hours);
        }

        /// <summary>Aktualisiert die Stats auf "jetzt" anhand des gespeicherten Zeitstempels.</summary>
        public static void UpdateToNow(CharacterProgress c, long nowUnix)
        {
            if (c.LastUpdatedUnix > 0)
                ApplyDecay(c, nowUnix - c.LastUpdatedUnix);
            c.LastUpdatedUnix = nowUnix;
        }
    }
}
