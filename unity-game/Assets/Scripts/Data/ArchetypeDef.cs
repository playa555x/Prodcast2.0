using System.Collections.Generic;
using UnityEngine;

namespace HeartMatch.Data
{
    /// <summary>Persönlichkeits-Archetyp: bestimmt Vorlieben und Tonfall eines Charakters.</summary>
    [CreateAssetMenu(fileName = "Archetype", menuName = "HeartMatch/Archetype")]
    public sealed class ArchetypeDef : ScriptableObject
    {
        public string Id;
        public string DisplayName;
        [TextArea] public string Description;
        public List<string> LikedGiftTags = new();
        public List<string> DislikedGiftTags = new();
        public string DialogueToneId = "neutral";
    }
}
