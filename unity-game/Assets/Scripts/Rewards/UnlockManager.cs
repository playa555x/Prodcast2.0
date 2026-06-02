using System.Collections.Generic;
using HeartMatch.Core;

namespace HeartMatch.Rewards
{
    /// <summary>
    /// Synchronisiert freigeschaltete Belohnungs-Tiers mit der erreichten Beziehungsstufe.
    /// Reine Logik; liefert die neu freigeschalteten Tiers zurück (für Events/Benachrichtigungen).
    /// </summary>
    public static class UnlockManager
    {
        public static List<int> SyncUnlocks(CharacterProgress c)
        {
            var newly = new List<int>();
            for (int tier = 1; tier <= c.Tier; tier++)
            {
                if (!c.UnlockedRewardTiers.Contains(tier))
                {
                    c.UnlockedRewardTiers.Add(tier);
                    newly.Add(tier);
                }
            }
            return newly;
        }

        public static bool IsUnlocked(CharacterProgress c, int tier) =>
            c.UnlockedRewardTiers.Contains(tier);
    }
}
