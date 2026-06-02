using System;
using System.Collections.Generic;

namespace HeartMatch.Minigames.Match3
{
    /// <summary>Berechnet, welche Zellen ein Spezialstein räumt, inkl. Ketten-Aktivierung.</summary>
    public static class Match3Effects
    {
        /// <summary>Direkt betroffene Zellen eines einzelnen Spezialsteins (ohne Kettenreaktion).</summary>
        public static IEnumerable<GridPos> EffectCells(Board b, GridPos pos, SpecialKind kind, GemColor colorBombTarget)
        {
            switch (kind)
            {
                case SpecialKind.RocketHorizontal:
                    for (int x = 0; x < b.Width; x++) yield return new GridPos(x, pos.Y);
                    break;
                case SpecialKind.RocketVertical:
                    for (int y = 0; y < b.Height; y++) yield return new GridPos(pos.X, y);
                    break;
                case SpecialKind.Bomb:
                    for (int dx = -1; dx <= 1; dx++)
                    for (int dy = -1; dy <= 1; dy++)
                    {
                        int x = pos.X + dx, y = pos.Y + dy;
                        if (b.InBounds(x, y)) yield return new GridPos(x, y);
                    }
                    break;
                case SpecialKind.ColorBomb:
                    var target = colorBombTarget != GemColor.None ? colorBombTarget : MostFrequentColor(b);
                    for (int y = 0; y < b.Height; y++)
                    for (int x = 0; x < b.Width; x++)
                        if (b.Get(x, y).Color == target) yield return new GridPos(x, y);
                    break;
            }
        }

        /// <summary>
        /// Erweitert eine Anfangsmenge zu räumender Zellen, indem alle darin enthaltenen
        /// Spezialsteine (und die dadurch erfassten weiteren Spezialsteine) aktiviert werden.
        /// Terminiert garantiert, da jede Position höchstens einmal in die Queue gelangt.
        /// </summary>
        public static HashSet<GridPos> ExpandClear(Board b, IEnumerable<GridPos> seed, GemColor colorBombTarget)
        {
            var cleared = new HashSet<GridPos>(seed);
            var queue = new Queue<GridPos>();
            foreach (var p in cleared)
                if (b.Get(p).HasSpecial) queue.Enqueue(p);

            while (queue.Count > 0)
            {
                var pos = queue.Dequeue();
                var special = b.Get(pos).Special;
                if (special == SpecialKind.None) continue;
                foreach (var c in EffectCells(b, pos, special, colorBombTarget))
                {
                    if (cleared.Add(c) && b.Get(c).HasSpecial)
                        queue.Enqueue(c);
                }
            }
            return cleared;
        }

        public static GemColor MostFrequentColor(Board b)
        {
            Span<int> counts = stackalloc int[7];
            for (int y = 0; y < b.Height; y++)
            for (int x = 0; x < b.Width; x++)
            {
                var c = b.Get(x, y).Color;
                if (c != GemColor.None) counts[(int)c]++;
            }
            int best = 0, bestColor = (int)GemColor.Red;
            for (int i = 1; i < counts.Length; i++)
                if (counts[i] > best) { best = counts[i]; bestColor = i; }
            return (GemColor)bestColor;
        }
    }
}
