using System.Collections.Generic;
using HeartMatch.Core;

namespace HeartMatch.Economy
{
    public enum Rarity { Common, Rare, Event }

    public sealed class GachaPool
    {
        // Gewichte je Seltenheit (relative Wahrscheinlichkeit).
        public int CommonWeight = 70;
        public int RareWeight = 27;
        public int EventWeight = 3;
        // Nach so vielen Zügen ohne Rare/Event ist das nächste Ziehen garantiert mind. Rare.
        public int PityThreshold = 10;
        // Charakter-IDs je Seltenheit.
        public List<string> Commons = new();
        public List<string> Rares = new();
        public List<string> Events = new();
    }

    public sealed class GachaResult
    {
        public bool Success;
        public Rarity Rarity;
        public string CharacterId;
        public int NewPityCounter;
    }

    /// <summary>
    /// Gacha-Ziehung mit Pity-Timer (vgl. Design A3/A5). Reine Logik: Kosten werden über das Wallet
    /// gebucht, der Pity-Zähler wird ein- und ausgegeben (Persistenz übernimmt der Aufrufer).
    /// </summary>
    public static class GachaSystem
    {
        public static GachaResult Pull(GachaPool pool, Wallet wallet, long gemCost, int pityCounter, DeterministicRng rng)
        {
            if (!wallet.TrySpend(CurrencyKind.Gems, gemCost))
                return new GachaResult { Success = false, NewPityCounter = pityCounter };

            Rarity rarity;
            // Pity: garantiert mindestens Rare.
            if (pityCounter + 1 >= pool.PityThreshold)
            {
                rarity = RollAtLeastRare(pool, rng);
            }
            else
            {
                int total = pool.CommonWeight + pool.RareWeight + pool.EventWeight;
                int roll = rng.Range(0, total);
                rarity = roll < pool.CommonWeight ? Rarity.Common
                       : roll < pool.CommonWeight + pool.RareWeight ? Rarity.Rare
                       : Rarity.Event;
            }

            int newPity = rarity == Rarity.Common ? pityCounter + 1 : 0;
            return new GachaResult
            {
                Success = true,
                Rarity = rarity,
                CharacterId = Pick(pool, rarity, rng),
                NewPityCounter = newPity,
            };
        }

        private static Rarity RollAtLeastRare(GachaPool pool, DeterministicRng rng)
        {
            int total = pool.RareWeight + pool.EventWeight;
            if (total <= 0) return Rarity.Rare;
            return rng.Range(0, total) < pool.RareWeight ? Rarity.Rare : Rarity.Event;
        }

        private static string Pick(GachaPool pool, Rarity rarity, DeterministicRng rng)
        {
            var list = rarity switch
            {
                Rarity.Rare => pool.Rares,
                Rarity.Event => pool.Events,
                _ => pool.Commons,
            };
            if (list == null || list.Count == 0) return null;
            return list[rng.Range(0, list.Count)];
        }
    }
}
