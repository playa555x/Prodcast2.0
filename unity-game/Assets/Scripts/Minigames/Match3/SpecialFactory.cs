using System.Collections.Generic;

namespace HeartMatch.Minigames.Match3
{
    public sealed class SpecialSpawn
    {
        public GridPos Pos;
        public SpecialKind Kind;
        public GemColor Color;
    }

    /// <summary>
    /// Leitet aus erkannten Runs die zu erzeugenden Spezialsteine ab.
    /// Priorität: 5er-Linie -> Farbbombe; L/T-Kreuzung -> Bombe; 4er-Linie -> Rakete (senkrecht zur Linie).
    /// </summary>
    public static class SpecialFactory
    {
        public static List<SpecialSpawn> Determine(List<Run> runs, GridPos? swapPos)
        {
            var spawns = new List<SpecialSpawn>();
            var handled = new HashSet<Run>();

            var posToRuns = new Dictionary<GridPos, List<Run>>();
            foreach (var run in runs)
                foreach (var p in run.Positions)
                {
                    if (!posToRuns.TryGetValue(p, out var list))
                        posToRuns[p] = list = new List<Run>();
                    list.Add(run);
                }

            // 1) Farbbombe: jede Linie >= 5
            foreach (var run in runs)
            {
                if (run.Length >= 5 && !handled.Contains(run))
                {
                    spawns.Add(new SpecialSpawn { Pos = Choose(run, swapPos), Kind = SpecialKind.ColorBomb, Color = run.Color });
                    handled.Add(run);
                }
            }

            // 2) Bombe: Kreuzung aus horizontalem UND vertikalem Lauf (L/T-Form)
            foreach (var kv in posToRuns)
            {
                Run h = null, v = null;
                foreach (var run in kv.Value)
                {
                    if (handled.Contains(run)) continue;
                    if (run.Horizontal && h == null) h = run;
                    else if (!run.Horizontal && v == null) v = run;
                }
                if (h != null && v != null)
                {
                    spawns.Add(new SpecialSpawn { Pos = kv.Key, Kind = SpecialKind.Bomb, Color = h.Color });
                    handled.Add(h);
                    handled.Add(v);
                }
            }

            // 3) Rakete: verbleibende 4er-Linien
            foreach (var run in runs)
            {
                if (handled.Contains(run)) continue;
                if (run.Length == 4)
                {
                    var kind = run.Horizontal ? SpecialKind.RocketVertical : SpecialKind.RocketHorizontal;
                    spawns.Add(new SpecialSpawn { Pos = Choose(run, swapPos), Kind = kind, Color = run.Color });
                    handled.Add(run);
                }
            }

            return spawns;
        }

        private static GridPos Choose(Run run, GridPos? swapPos)
        {
            if (swapPos.HasValue && run.Positions.Contains(swapPos.Value))
                return swapPos.Value;
            return run.Positions[run.Positions.Count / 2];
        }
    }
}
