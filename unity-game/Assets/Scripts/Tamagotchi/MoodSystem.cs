namespace HeartMatch.Tamagotchi
{
    /// <summary>Stimmungs-/Multiplikator-Logik (vgl. Design A2.1). Reine Funktionen.</summary>
    public static class MoodSystem
    {
        /// <summary>
        /// gain_final = base * (0.5 + Mood/100) * affinity * (1 - Boredom/200).
        /// Mood/Boredom in [0,100], affinity typ. 0.5..2.0.
        /// </summary>
        public static float ApplyGain(float baseGain, float mood, float affinity, float boredom)
        {
            float moodFactor = 0.5f + mood / 100f;
            float boredomFactor = 1f - boredom / 200f;
            float result = baseGain * moodFactor * affinity * boredomFactor;
            return result < 0f ? 0f : result;
        }

        public static float Clamp01To100(float value) =>
            value < 0f ? 0f : (value > 100f ? 100f : value);
    }
}
