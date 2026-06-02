using System.Collections.Generic;

namespace HeartMatch.Platform
{
    /// <summary>
    /// Plattform-Abstraktionen für externe SDKs. In Phase 1 existieren lokale No-Op-Implementierungen;
    /// echte SDKs (Analytics, IAP, Ads, Remote-Config) werden in Phase 3 ohne Spielcode-Änderung eingesteckt.
    /// </summary>
    public interface IAnalytics
    {
        void Track(string eventName, IDictionary<string, object> properties = null);
    }

    public interface IAds
    {
        bool IsRewardedReady { get; }
        // Liefert true, wenn der Spieler die belohnte Werbung vollständig gesehen hat.
        System.Threading.Tasks.Task<bool> ShowRewarded(string placement);
    }

    public sealed class Product
    {
        public string Sku;
        public string LocalizedPrice;
    }

    public interface IStore
    {
        IReadOnlyList<Product> Products { get; }
        System.Threading.Tasks.Task<bool> Purchase(string sku);
    }

    public interface IRemoteConfig
    {
        int GetInt(string key, int fallback);
        bool GetBool(string key, bool fallback);
        string GetString(string key, string fallback);
    }

    // --- Lokale No-Op-/Stub-Implementierungen (Phase 1) -------------------

    public sealed class NullAnalytics : IAnalytics
    {
        public void Track(string eventName, IDictionary<string, object> properties = null) { }
    }

    public sealed class NullAds : IAds
    {
        public bool IsRewardedReady => false;
        public System.Threading.Tasks.Task<bool> ShowRewarded(string placement)
            => System.Threading.Tasks.Task.FromResult(false);
    }

    public sealed class NullStore : IStore
    {
        public IReadOnlyList<Product> Products => System.Array.Empty<Product>();
        public System.Threading.Tasks.Task<bool> Purchase(string sku)
            => System.Threading.Tasks.Task.FromResult(false);
    }

    public sealed class DefaultRemoteConfig : IRemoteConfig
    {
        public int GetInt(string key, int fallback) => fallback;
        public bool GetBool(string key, bool fallback) => fallback;
        public string GetString(string key, string fallback) => fallback;
    }
}
