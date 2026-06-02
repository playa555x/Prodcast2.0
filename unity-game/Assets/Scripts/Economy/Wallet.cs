using HeartMatch.Core;

namespace HeartMatch.Economy
{
    public enum CurrencyKind { Coins, Gems, Energy, Tokens }

    /// <summary>Zugriffs-/Buchungslogik über <see cref="WalletData"/>. Reine Logik (keine Events hier).</summary>
    public sealed class Wallet
    {
        private readonly WalletData _data;
        public Wallet(WalletData data) => _data = data;

        public long Get(CurrencyKind kind) => kind switch
        {
            CurrencyKind.Coins => _data.Coins,
            CurrencyKind.Gems => _data.Gems,
            CurrencyKind.Energy => _data.Energy,
            CurrencyKind.Tokens => _data.Tokens,
            _ => 0,
        };

        public void Add(CurrencyKind kind, long amount)
        {
            if (amount < 0) amount = 0;
            switch (kind)
            {
                case CurrencyKind.Coins: _data.Coins += amount; break;
                case CurrencyKind.Gems: _data.Gems += amount; break;
                case CurrencyKind.Energy: _data.Energy += (int)amount; break;
                case CurrencyKind.Tokens: _data.Tokens += amount; break;
            }
        }

        public bool CanAfford(CurrencyKind kind, long amount) => Get(kind) >= amount;

        public bool TrySpend(CurrencyKind kind, long amount)
        {
            if (amount < 0 || !CanAfford(kind, amount)) return false;
            switch (kind)
            {
                case CurrencyKind.Coins: _data.Coins -= amount; break;
                case CurrencyKind.Gems: _data.Gems -= amount; break;
                case CurrencyKind.Energy: _data.Energy -= (int)amount; break;
                case CurrencyKind.Tokens: _data.Tokens -= amount; break;
            }
            return true;
        }
    }
}
