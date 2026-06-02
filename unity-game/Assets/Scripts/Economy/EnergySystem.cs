using System;
using HeartMatch.Core;

namespace HeartMatch.Economy
{
    /// <summary>Zeitbasierte Energie-Regeneration + Verbrauch. Reine Logik (Zeit wird übergeben).</summary>
    public static class EnergySystem
    {
        /// <summary>Rechnet die seit dem letzten Tick verstrichene Zeit in Energie um (bis Max).</summary>
        public static void UpdateToNow(WalletData w, long nowUnix, int max, int regenSeconds)
        {
            if (regenSeconds <= 0) return;
            if (w.Energy >= max) { w.EnergyTimestampUnix = nowUnix; return; }
            if (w.EnergyTimestampUnix == 0) { w.EnergyTimestampUnix = nowUnix; return; }

            long elapsed = nowUnix - w.EnergyTimestampUnix;
            if (elapsed <= 0) return;

            int ticks = (int)(elapsed / regenSeconds);
            if (ticks <= 0) return;

            w.Energy = (int)Math.Min(max, (long)w.Energy + ticks);
            if (w.Energy >= max) w.EnergyTimestampUnix = nowUnix;
            else w.EnergyTimestampUnix += (long)ticks * regenSeconds;
        }

        /// <summary>Verbraucht Energie (Standard 1). Startet den Regen-Timer, falls vorher voll.</summary>
        public static bool TrySpend(WalletData w, long nowUnix, int max, int amount = 1)
        {
            if (w.Energy < amount) return false;
            bool wasFull = w.Energy >= max;
            w.Energy -= amount;
            if (wasFull) w.EnergyTimestampUnix = nowUnix;
            return true;
        }

        /// <summary>Sekunden bis zur nächsten Energie-Einheit (0, wenn voll).</summary>
        public static long SecondsToNext(WalletData w, long nowUnix, int max, int regenSeconds)
        {
            if (w.Energy >= max || w.EnergyTimestampUnix == 0) return 0;
            long next = w.EnergyTimestampUnix + regenSeconds - nowUnix;
            return next < 0 ? 0 : next;
        }
    }
}
