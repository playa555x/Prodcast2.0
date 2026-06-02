using System.Collections.Generic;
using HeartMatch.Economy;
using UnityEngine;

namespace HeartMatch.Data
{
    /// <summary>Ein Geschenk im Shop: Tags bestimmen die Wirkung je nach Persönlichkeit.</summary>
    [CreateAssetMenu(fileName = "Gift", menuName = "HeartMatch/Gift")]
    public sealed class GiftDef : ScriptableObject
    {
        public string Id;
        public string DisplayName;
        public List<string> Tags = new();
        public CurrencyKind CostCurrency = CurrencyKind.Coins;
        public long Cost = 50;
        [Tooltip("Basis-Affection, bevor Stimmung/Affinität angewendet werden.")]
        public float BaseAffection = 10f;
        public float BaseTrust = 0f;
        public Sprite Icon;
    }
}
