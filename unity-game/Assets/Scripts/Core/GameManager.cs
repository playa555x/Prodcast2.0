using System;
using HeartMatch.Data;
using HeartMatch.Economy;
using HeartMatch.Networking;
using HeartMatch.Platform;
using HeartMatch.Rewards;
using HeartMatch.Tamagotchi;
using UnityEngine;

namespace HeartMatch.Core
{
    /// <summary>
    /// Zentraler Bootstrapper: registriert Services, lädt/erzeugt den Spielstand und holt die
    /// Echtzeit-Stats (Energie-Regen, Bedürfnis-Verfall) beim Start/Resume nach.
    /// Bewusst dünn — die eigentliche Logik liegt in den (testbaren) reinen Systemen.
    /// </summary>
    public sealed class GameManager : MonoBehaviour
    {
        public static GameManager Instance { get; private set; }

        [Header("Backend")]
        [SerializeField] private string _backendBaseUrl = "http://localhost:8000";

        [Header("Konfiguration")]
        [SerializeField] private EconomyConfig _economy;
        [SerializeField] private ContentTierConfig _contentConfig;

        public GameState State { get; private set; }
        public EventBus Bus { get; private set; }
        public SaveSystem Saves { get; private set; }
        public RelationshipManager Relationship { get; private set; }
        public BackendClient Backend { get; private set; }
        public IRewardProvider Rewards { get; private set; }
        public Wallet Wallet { get; private set; }

        private void Awake()
        {
            if (Instance != null) { Destroy(gameObject); return; }
            Instance = this;
            DontDestroyOnLoad(gameObject);

            Bus = new EventBus();
            Saves = new SaveSystem();
            Backend = new BackendClient(_backendBaseUrl);
            Rewards = new ComfyUIRewardProvider(Backend, new LocalRewardProvider());
            Relationship = new RelationshipManager(ContentTier.MaxRomanceTier);

            var sl = ServiceLocator.Instance;
            sl.Register(Bus);
            sl.Register(Saves);
            sl.Register(Backend);
            sl.Register(Rewards);
            sl.Register(Relationship);
            sl.Register<IAnalytics>(new NullAnalytics());
            sl.Register<IAds>(new NullAds());
            sl.Register<IStore>(new NullStore());
            sl.Register<IRemoteConfig>(new DefaultRemoteConfig());

            LoadGame();
        }

        private void LoadGame()
        {
            State = Saves.LoadOrCreate();
            Wallet = new Wallet(State.Wallet);
            CatchUpOfflineProgress();
        }

        /// <summary>Holt Energie-Regen und Bedürfnis-Verfall für die abwesende Zeit nach.</summary>
        public void CatchUpOfflineProgress()
        {
            long now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            int max = _economy != null ? _economy.EnergyMax : 5;
            int regen = _economy != null ? _economy.EnergyRegenSeconds : 1200;

            EnergySystem.UpdateToNow(State.Wallet, now, max, regen);
            foreach (var c in State.Characters)
                NeedsSystem.UpdateToNow(c, now);
        }

        public void SaveGame() => Saves.Save(State);

        private void OnApplicationPause(bool paused)
        {
            if (paused) SaveGame();
            else CatchUpOfflineProgress();
        }

        private void OnApplicationQuit() => SaveGame();
    }
}
