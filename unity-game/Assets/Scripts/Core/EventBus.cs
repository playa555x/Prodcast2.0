using System;
using System.Collections.Generic;

namespace HeartMatch.Core
{
    /// <summary>
    /// Minimaler typbasierter Publish/Subscribe-Bus zur Entkopplung der Systeme
    /// (z.B. "RewardUnlocked", "CurrencyChanged", "TierUp"). UnityEngine-frei.
    /// </summary>
    public sealed class EventBus
    {
        private readonly Dictionary<Type, List<Delegate>> _handlers = new();

        public void Subscribe<T>(Action<T> handler)
        {
            var type = typeof(T);
            if (!_handlers.TryGetValue(type, out var list))
            {
                list = new List<Delegate>();
                _handlers[type] = list;
            }
            list.Add(handler);
        }

        public void Unsubscribe<T>(Action<T> handler)
        {
            if (_handlers.TryGetValue(typeof(T), out var list))
                list.Remove(handler);
        }

        public void Publish<T>(T evt)
        {
            if (!_handlers.TryGetValue(typeof(T), out var list)) return;
            // Kopie, damit Handler sich während des Publish ab-/anmelden dürfen.
            for (int i = 0; i < list.Count; i++)
                ((Action<T>)list[i])?.Invoke(evt);
        }

        public void Clear() => _handlers.Clear();
    }

    // --- Standard-Events ---------------------------------------------------
    public readonly struct CurrencyChanged
    {
        public readonly string Currency;
        public readonly long NewAmount;
        public CurrencyChanged(string currency, long newAmount) { Currency = currency; NewAmount = newAmount; }
    }

    public readonly struct RewardUnlocked
    {
        public readonly string CharacterId;
        public readonly int Tier;
        public RewardUnlocked(string characterId, int tier) { CharacterId = characterId; Tier = tier; }
    }

    public readonly struct TierUp
    {
        public readonly string CharacterId;
        public readonly int NewTier;
        public TierUp(string characterId, int newTier) { CharacterId = characterId; NewTier = newTier; }
    }

    public readonly struct CharacterChanged
    {
        public readonly string CharacterId;
        public CharacterChanged(string characterId) { CharacterId = characterId; }
    }
}
