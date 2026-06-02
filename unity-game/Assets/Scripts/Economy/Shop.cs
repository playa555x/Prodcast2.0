using System.Collections.Generic;

namespace HeartMatch.Economy
{
    public enum ShopItemKind { Gift, Booster, Energy, Outfit, CharacterUnlock, GemBundle }

    public sealed class ShopItem
    {
        public string Id;
        public ShopItemKind Kind;
        public CurrencyKind CostCurrency;
        public long CostAmount;
        // Optionale Nutzlast (z.B. Gift-Id, Energie-Menge, Charakter-Id).
        public string PayloadId;
        public int PayloadAmount;
    }

    public sealed class PurchaseResult
    {
        public bool Success;
        public string Reason;
        public ShopItem Item;
    }

    /// <summary>
    /// Kauf-Logik: prüft Verfügbarkeit, bucht die Währung ab und liefert das gekaufte Item zurück.
    /// Das eigentliche Gewähren (Inventar, Energie, Unlock) erledigt der Aufrufer anhand des Items.
    /// </summary>
    public sealed class Shop
    {
        private readonly Dictionary<string, ShopItem> _catalog = new();
        private readonly Wallet _wallet;

        public Shop(Wallet wallet, IEnumerable<ShopItem> catalog)
        {
            _wallet = wallet;
            foreach (var item in catalog) _catalog[item.Id] = item;
        }

        public IReadOnlyDictionary<string, ShopItem> Catalog => _catalog;

        public PurchaseResult Purchase(string itemId)
        {
            if (!_catalog.TryGetValue(itemId, out var item))
                return new PurchaseResult { Success = false, Reason = "unknown_item" };

            if (!_wallet.TrySpend(item.CostCurrency, item.CostAmount))
                return new PurchaseResult { Success = false, Reason = "insufficient_funds", Item = item };

            return new PurchaseResult { Success = true, Item = item };
        }
    }
}
