using HeartMatch.Core;
using HeartMatch.Economy;
using NUnit.Framework;

namespace HeartMatch.Tests
{
    public class EconomyTests
    {
        [Test]
        public void Wallet_SpendAndInsufficient()
        {
            var w = new Wallet(new WalletData { Coins = 100 });
            Assert.IsTrue(w.TrySpend(CurrencyKind.Coins, 30));
            Assert.AreEqual(70, w.Get(CurrencyKind.Coins));
            Assert.IsFalse(w.TrySpend(CurrencyKind.Coins, 1000));
            Assert.AreEqual(70, w.Get(CurrencyKind.Coins));
        }

        [Test]
        public void Energy_RegeneratesByElapsedTime()
        {
            var data = new WalletData { Energy = 0, EnergyTimestampUnix = 1000 };
            EnergySystem.UpdateToNow(data, nowUnix: 1035, max: 5, regenSeconds: 10);
            Assert.AreEqual(3, data.Energy);             // 35s / 10s = 3 Ticks
            Assert.AreEqual(1030, data.EnergyTimestampUnix);
        }

        [Test]
        public void Energy_CapsAtMax()
        {
            var data = new WalletData { Energy = 4, EnergyTimestampUnix = 1000 };
            EnergySystem.UpdateToNow(data, nowUnix: 1100, max: 5, regenSeconds: 10);
            Assert.AreEqual(5, data.Energy);
        }

        [Test]
        public void Energy_SpendFromFullStartsTimer()
        {
            var data = new WalletData { Energy = 5 };
            Assert.IsTrue(EnergySystem.TrySpend(data, nowUnix: 2000, max: 5, amount: 1));
            Assert.AreEqual(4, data.Energy);
            Assert.AreEqual(2000, data.EnergyTimestampUnix);
        }

        [Test]
        public void Shop_PurchaseDeductsCurrency()
        {
            var wallet = new Wallet(new WalletData { Coins = 100 });
            var shop = new Shop(wallet, new[]
            {
                new ShopItem { Id = "flowers", Kind = ShopItemKind.Gift, CostCurrency = CurrencyKind.Coins, CostAmount = 40 },
            });

            var ok = shop.Purchase("flowers");
            Assert.IsTrue(ok.Success);
            Assert.AreEqual(60, wallet.Get(CurrencyKind.Coins));

            var unknown = shop.Purchase("nope");
            Assert.IsFalse(unknown.Success);
        }

        [Test]
        public void Gacha_InsufficientGemsFails()
        {
            var wallet = new Wallet(new WalletData { Gems = 0 });
            var pool = new GachaPool();
            var result = GachaSystem.Pull(pool, wallet, gemCost: 50, pityCounter: 0, new DeterministicRng(1));
            Assert.IsFalse(result.Success);
        }

        [Test]
        public void Gacha_PityGuaranteesAtLeastRare()
        {
            var wallet = new Wallet(new WalletData { Gems = 500 });
            var pool = new GachaPool();
            pool.Rares.Add("rare_char");
            pool.Events.Add("event_char");
            pool.Commons.Add("common_char");

            var result = GachaSystem.Pull(pool, wallet, gemCost: 50, pityCounter: pool.PityThreshold - 1, new DeterministicRng(5));
            Assert.IsTrue(result.Success);
            Assert.AreNotEqual(Rarity.Common, result.Rarity);
            Assert.AreEqual(0, result.NewPityCounter); // Reset bei Rare/Event
        }
    }
}
