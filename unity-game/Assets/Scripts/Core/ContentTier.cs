namespace HeartMatch.Core
{
    /// <summary>
    /// Inhalts-Stufe des Builds. Wird über Scripting-Define-Symbole gesetzt:
    /// CONTENT_SFW (Standard, Google Play) oder CONTENT_ADULT (itch.io / eigene APK).
    /// Steuert Asset-Sets, Age-Gate und Zahlungspfad — die Spiellogik bleibt identisch.
    /// </summary>
    public enum ContentTierKind { Sfw, Adult }

    public static class ContentTier
    {
        public static ContentTierKind Current =>
#if CONTENT_ADULT
            ContentTierKind.Adult;
#else
            ContentTierKind.Sfw;
#endif

        public static bool IsAdult => Current == ContentTierKind.Adult;

        /// <summary>Höchste Romance-Tier, die in dieser Build-Variante erreichbar ist.</summary>
        public static int MaxRomanceTier => IsAdult ? 6 : 5;

        /// <summary>Ob ein Age-Gate beim Start erzwungen werden muss.</summary>
        public static bool RequiresAgeGate => IsAdult;
    }
}
