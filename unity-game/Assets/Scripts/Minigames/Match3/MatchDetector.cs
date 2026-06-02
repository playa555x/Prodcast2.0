using System.Collections.Generic;

namespace HeartMatch.Minigames.Match3
{
    /// <summary>Ein maximaler Lauf gleichfarbiger Steine (>=3) horizontal oder vertikal.</summary>
    public sealed class Run
    {
        public readonly List<GridPos> Positions = new();
        public bool Horizontal;
        public GemColor Color;
        public int Length => Positions.Count;
    }

    /// <summary>Erkennt Matches (Linien-Runs). Reine Logik, ohne Seiteneffekte auf dem Board.</summary>
    public static class MatchDetector
    {
        public static List<Run> FindRuns(Board board)
        {
            var runs = new List<Run>();

            // Horizontale Läufe
            for (int y = 0; y < board.Height; y++)
            {
                int x = 0;
                while (x < board.Width)
                {
                    var color = board.Get(x, y).Color;
                    if (color == GemColor.None) { x++; continue; }
                    int start = x;
                    while (x < board.Width && board.Get(x, y).Color == color) x++;
                    int len = x - start;
                    if (len >= 3)
                    {
                        var run = new Run { Horizontal = true, Color = color };
                        for (int i = start; i < x; i++) run.Positions.Add(new GridPos(i, y));
                        runs.Add(run);
                    }
                }
            }

            // Vertikale Läufe
            for (int x = 0; x < board.Width; x++)
            {
                int y = 0;
                while (y < board.Height)
                {
                    var color = board.Get(x, y).Color;
                    if (color == GemColor.None) { y++; continue; }
                    int start = y;
                    while (y < board.Height && board.Get(x, y).Color == color) y++;
                    int len = y - start;
                    if (len >= 3)
                    {
                        var run = new Run { Horizontal = false, Color = color };
                        for (int i = start; i < y; i++) run.Positions.Add(new GridPos(x, i));
                        runs.Add(run);
                    }
                }
            }

            return runs;
        }

        public static bool HasAnyMatch(Board board) => FindRuns(board).Count > 0;

        /// <summary>Alle eindeutigen Positionen, die Teil mindestens eines Runs sind.</summary>
        public static HashSet<GridPos> MatchedPositions(List<Run> runs)
        {
            var set = new HashSet<GridPos>();
            foreach (var run in runs)
                foreach (var p in run.Positions)
                    set.Add(p);
            return set;
        }
    }
}
