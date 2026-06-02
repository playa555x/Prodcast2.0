using System;
using System.Collections.Generic;

namespace HeartMatch.Core
{
    /// <summary>
    /// Schlanker Service-Container. Erlaubt es, Implementierungen (echte SDKs vs. lokale Stubs)
    /// zur Laufzeit zu registrieren, ohne dass die Spiellogik harte Referenzen hält.
    /// </summary>
    public sealed class ServiceLocator
    {
        private static readonly Lazy<ServiceLocator> _instance = new(() => new ServiceLocator());
        public static ServiceLocator Instance => _instance.Value;

        private readonly Dictionary<Type, object> _services = new();

        public void Register<T>(T service) where T : class => _services[typeof(T)] = service;

        public T Get<T>() where T : class
        {
            if (_services.TryGetValue(typeof(T), out var svc)) return (T)svc;
            throw new InvalidOperationException($"Service nicht registriert: {typeof(T).Name}");
        }

        public bool TryGet<T>(out T service) where T : class
        {
            if (_services.TryGetValue(typeof(T), out var svc)) { service = (T)svc; return true; }
            service = null;
            return false;
        }

        public void Clear() => _services.Clear();
    }
}
