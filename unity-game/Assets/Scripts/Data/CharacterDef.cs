using System.Collections.Generic;
using UnityEngine;

namespace HeartMatch.Data
{
    public enum CharacterRarity { Common, Rare, Event }
    public enum UnlockMethod { Story, Gacha }

    /// <summary>
    /// Charakter-Stammdaten. WICHTIG: <see cref="Age"/> ist Pflicht und muss >= 18 sein
    /// (siehe docs/CONTENT_POLICY.md). <see cref="Validate"/> erzwingt das beim Laden.
    /// </summary>
    [CreateAssetMenu(fileName = "Character", menuName = "HeartMatch/Character")]
    public sealed class CharacterDef : ScriptableObject
    {
        public string Id;
        public string DisplayName;

        [Tooltip("Pflichtfeld. Muss >= 18 sein — ausschließlich fiktive, erwachsene Charaktere.")]
        public int Age = 18;

        [TextArea] public string Bio;
        public ArchetypeDef Archetype;
        public List<string> LikedGiftTags = new();
        public List<string> DislikedGiftTags = new();

        public CharacterRarity Rarity = CharacterRarity.Common;
        public UnlockMethod Unlock = UnlockMethod.Story;

        [Tooltip("Anzahl freischaltbarer Belohnungs-Tiers für diesen Charakter.")]
        public int RewardTierCount = 6;

        public Sprite Portrait;

        /// <summary>Liefert false (und loggt) bei ungültigem Alter — diese Charaktere werden abgelehnt.</summary>
        public bool Validate()
        {
            if (Age < 18)
            {
                Debug.LogError($"[CharacterDef] '{Id}' abgelehnt: Age={Age} < 18. Nur erwachsene, fiktive Charaktere erlaubt.");
                return false;
            }
            if (string.IsNullOrEmpty(Id))
            {
                Debug.LogError("[CharacterDef] Charakter ohne Id abgelehnt.");
                return false;
            }
            return true;
        }
    }
}
