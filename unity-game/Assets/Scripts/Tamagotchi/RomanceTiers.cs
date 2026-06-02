namespace HeartMatch.Tamagotchi
{
    /// <summary>Schwellen-Tabelle der Beziehungsstufen (vgl. Design A2.3). Reine Daten/Logik.</summary>
    public static class RomanceTiers
    {
        public readonly struct Gate
        {
            public readonly int Tier;
            public readonly float Affection;
            public readonly float Trust;
            public readonly float Tension;
            public Gate(int tier, float aff, float trust, float tension)
            {
                Tier = tier; Affection = aff; Trust = trust; Tension = tension;
            }
        }

        // Tier 6 (Intim/Herzbund) verlangt zusätzlich Tension und ist im SFW-Build nicht erreichbar.
        public static readonly Gate[] Gates =
        {
            new(0, 0, 0, 0),
            new(1, 15, 0, 0),
            new(2, 35, 20, 0),
            new(3, 55, 40, 0),
            new(4, 70, 50, 0),
            new(5, 85, 65, 0),
            new(6, 95, 80, 70),
        };

        /// <summary>Höchste erreichte Tier unter Berücksichtigung des Build-Maximums.</summary>
        public static int ComputeTier(float affection, float trust, float tension, int maxTier)
        {
            int result = 0;
            foreach (var g in Gates)
            {
                if (g.Tier > maxTier) continue;
                bool meets = affection >= g.Affection && trust >= g.Trust;
                if (g.Tier >= 6) meets &= tension >= g.Tension;
                if (meets && g.Tier > result) result = g.Tier;
            }
            return result;
        }
    }
}
