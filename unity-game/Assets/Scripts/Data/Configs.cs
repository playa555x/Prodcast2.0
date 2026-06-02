using System.Collections.Generic;
using UnityEngine;

namespace HeartMatch.Data
{
    /// <summary>Globale Economy-/Balancing-Werte (über Remote-Config überschreibbar).</summary>
    [CreateAssetMenu(fileName = "EconomyConfig", menuName = "HeartMatch/EconomyConfig")]
    public sealed class EconomyConfig : ScriptableObject
    {
        public int EnergyMax = 5;
        public int EnergyRegenSeconds = 20 * 60;
        public long StartingCoins = 200;
        public long StartingGems = 50;
        public long GachaGemCost = 50;
        public int GachaPityThreshold = 10;
    }

    /// <summary>
    /// Build-spezifische Inhalts-Konfiguration. Standardwerte leiten sich aus dem Content-Tier ab
    /// (CONTENT_SFW/CONTENT_ADULT), können hier aber für Tests/Override gesetzt werden.
    /// </summary>
    [CreateAssetMenu(fileName = "ContentTierConfig", menuName = "HeartMatch/ContentTierConfig")]
    public sealed class ContentTierConfig : ScriptableObject
    {
        [Tooltip("Standard-Prompt-Stil für ComfyUI-Belohnungen (Design-Entscheidung: 2D semi-realistisch).")]
        public string PromptStyle = "2d semi-realistic portrait, soft lighting";
        public List<string> StarterRoster = new();
        public List<string> GachaCommons = new();
        public List<string> GachaRares = new();
        public List<string> GachaEvents = new();
    }
}
