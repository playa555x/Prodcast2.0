using System;
using System.Runtime.CompilerServices;
using UnityEngine.Networking;

namespace HeartMatch.Networking
{
    /// <summary>Ermöglicht `await unityWebRequest.SendWebRequest()` in async-Methoden.</summary>
    public static class UnityWebRequestExtensions
    {
        public static UnityWebRequestAwaiter GetAwaiter(this UnityWebRequestAsyncOperation op)
            => new(op);
    }

    public readonly struct UnityWebRequestAwaiter : INotifyCompletion
    {
        private readonly UnityWebRequestAsyncOperation _op;
        public UnityWebRequestAwaiter(UnityWebRequestAsyncOperation op) => _op = op;

        public bool IsCompleted => _op.isDone;

        public void OnCompleted(Action continuation)
        {
            _op.completed += _ => continuation();
        }

        public void GetResult() { /* Ergebnis wird über das UnityWebRequest-Objekt selbst gelesen */ }
    }
}
