using System;

namespace HeartMatch.Core
{
    /// <summary>
    /// Deterministischer, seedbarer Zufallszahlengenerator (xorshift128).
    /// Bewusst UnityEngine-frei, damit Spiellogik (Daily-Seeds, Level-Generator, Tests)
    /// reproduzierbar und ohne Editor testbar ist.
    /// </summary>
    public sealed class DeterministicRng
    {
        private uint _x, _y, _z, _w;

        public DeterministicRng(int seed)
        {
            // Vermeide den entarteten All-Zero-Zustand.
            uint s = unchecked((uint)seed);
            _x = s == 0 ? 0x9E3779B9u : s;
            _y = 0x243F6A88u;
            _z = 0xB7E15162u;
            _w = 0xDEADBEEFu ^ s;
        }

        public uint NextUInt()
        {
            uint t = _x ^ (_x << 11);
            _x = _y; _y = _z; _z = _w;
            _w = _w ^ (_w >> 19) ^ (t ^ (t >> 8));
            return _w;
        }

        /// <summary>Ganzzahl im Bereich [minInclusive, maxExclusive).</summary>
        public int Range(int minInclusive, int maxExclusive)
        {
            if (maxExclusive <= minInclusive) return minInclusive;
            uint span = (uint)(maxExclusive - minInclusive);
            return minInclusive + (int)(NextUInt() % span);
        }

        /// <summary>Float im Bereich [0, 1).</summary>
        public double NextDouble() => NextUInt() / (double)uint.MaxValue;

        /// <summary>Fisher-Yates In-Place-Shuffle.</summary>
        public void Shuffle<T>(System.Collections.Generic.IList<T> list)
        {
            for (int i = list.Count - 1; i > 0; i--)
            {
                int j = Range(0, i + 1);
                (list[i], list[j]) = (list[j], list[i]);
            }
        }
    }
}
