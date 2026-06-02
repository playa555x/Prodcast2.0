using HeartMatch.Core;

namespace HeartMatch.Tamagotchi
{
    public struct InteractionOutcome
    {
        public float AffectionGain;
        public float TrustGain;
        public int OldTier;
        public int NewTier;
        public bool TierChanged => NewTier != OldTier;
    }

    /// <summary>
    /// Wendet Interaktionen (Geschenke, Dialog, Minispiel-Erfolge) auf einen <see cref="CharacterProgress"/> an
    /// und berechnet Stimmungs-/Affinitäts-/Langeweile-Effekte sowie die resultierende Beziehungsstufe.
    /// Reine Logik — Events/UI werden in der MonoBehaviour-Schicht ausgelöst.
    /// </summary>
    public sealed class RelationshipManager
    {
        private readonly int _maxTier;

        public RelationshipManager(int maxTier) => _maxTier = maxTier;

        public InteractionOutcome ApplyInteraction(
            CharacterProgress c,
            float baseAffection,
            float baseTrust,
            float affinity,
            float moodDelta,
            float boredomDelta = 4f)
        {
            int oldTier = c.Tier;

            float affGain = MoodSystem.ApplyGain(baseAffection, c.Mood, affinity, c.Boredom);
            float trustGain = MoodSystem.ApplyGain(baseTrust, c.Mood, affinity, c.Boredom);

            c.Affection = MoodSystem.Clamp01To100(c.Affection + affGain);
            c.Trust = MoodSystem.Clamp01To100(c.Trust + trustGain);
            c.Mood = MoodSystem.Clamp01To100(c.Mood + moodDelta);
            c.Boredom = MoodSystem.Clamp01To100(c.Boredom + boredomDelta);

            c.Tier = RomanceTiers.ComputeTier(c.Affection, c.Trust, c.Tension, _maxTier);

            return new InteractionOutcome
            {
                AffectionGain = affGain,
                TrustGain = trustGain,
                OldTier = oldTier,
                NewTier = c.Tier,
            };
        }

        /// <summary>Flirt-Aktion (nur sinnvoll im Adult-Build): erhöht Tension zusätzlich.</summary>
        public InteractionOutcome ApplyFlirt(CharacterProgress c, float baseAffection, float tensionDelta)
        {
            var outcome = ApplyInteraction(c, baseAffection, 0f, 1f, +4f, 3f);
            c.Tension = MoodSystem.Clamp01To100(c.Tension + tensionDelta);
            c.Tier = RomanceTiers.ComputeTier(c.Affection, c.Trust, c.Tension, _maxTier);
            outcome.NewTier = c.Tier;
            return outcome;
        }

        /// <summary>Abwechslung (anderes Minispiel/Geschenk) reduziert Langeweile.</summary>
        public static void RelieveBoredom(CharacterProgress c, float amount = 15f)
        {
            c.Boredom = MoodSystem.Clamp01To100(c.Boredom - amount);
        }
    }
}
