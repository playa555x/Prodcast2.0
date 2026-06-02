using System.Collections.Generic;

namespace HeartMatch.Tamagotchi
{
    /// <summary>Berechnet den Affinitäts-Multiplikator eines Geschenks anhand der Persönlichkeit.</summary>
    public static class GiftAffinity
    {
        public const float Liked = 1.8f;
        public const float Disliked = 0.5f;
        public const float Neutral = 1.0f;

        /// <summary>
        /// Liefert (multiplier, moodDelta). Geliebte Tags -> hoher Multiplikator + gute Laune,
        /// ungeliebte -> niedrig + schlechte Laune.
        /// </summary>
        public static (float multiplier, float moodDelta) Compute(
            IEnumerable<string> giftTags,
            ICollection<string> likedTags,
            ICollection<string> dislikedTags)
        {
            bool liked = false, disliked = false;
            foreach (var tag in giftTags)
            {
                if (likedTags != null && likedTags.Contains(tag)) liked = true;
                if (dislikedTags != null && dislikedTags.Contains(tag)) disliked = true;
            }

            if (liked && !disliked) return (Liked, +8f);
            if (disliked && !liked) return (Disliked, -10f);
            return (Neutral, +2f);
        }
    }
}
