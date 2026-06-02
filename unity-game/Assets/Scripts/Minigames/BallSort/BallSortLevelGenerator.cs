using System.Collections.Generic;
using HeartMatch.Core;

namespace HeartMatch.Minigames.BallSort
{
    /// <summary>
    /// Erzeugt lösbare Ball-Sort-Level. Ansatz: vom gelösten Zustand ausgehend werden ausschließlich
    /// LEGALE Einzelzüge ausgeführt. Da jeder legale Zug umkehrbar ist, ist der resultierende Zustand
    /// garantiert wieder lösbar. Schwierigkeit über Farbanzahl/Kapazität/Mischtiefe.
    /// </summary>
    public static class BallSortLevelGenerator
    {
        public static BallSortBoard Generate(int colors, int capacity, int emptyTubes, int shuffleMoves, int seed)
        {
            var rng = new DeterministicRng(seed);

            var tubes = new List<Tube>(colors + emptyTubes);
            for (int c = 1; c <= colors; c++)
            {
                var t = new Tube(capacity);
                for (int k = 0; k < capacity; k++) t.Push(c);
                tubes.Add(t);
            }
            for (int e = 0; e < emptyTubes; e++) tubes.Add(new Tube(capacity));

            var board = new BallSortBoard(tubes);

            // Zufällige legale Einzelzüge zum Mischen.
            int attempts = 0;
            int done = 0;
            int maxAttempts = shuffleMoves * 20 + 100;
            while (done < shuffleMoves && attempts < maxAttempts)
            {
                attempts++;
                int from = rng.Range(0, board.TubeCount);
                int to = rng.Range(0, board.TubeCount);
                if (board.TryMoveSingle(from, to)) done++;
            }

            // Falls (zufällig) wieder gelöst: ein paar erzwungene Mischzüge.
            int guard = 0;
            while (board.IsSolved && guard < 200)
            {
                guard++;
                int from = rng.Range(0, board.TubeCount);
                int to = rng.Range(0, board.TubeCount);
                board.TryMoveSingle(from, to);
            }

            return board;
        }
    }
}
