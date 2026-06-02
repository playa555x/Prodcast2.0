using System.Collections.Generic;

namespace HeartMatch.Minigames.BallSort
{
    /// <summary>Ball-Sort-Spielfeld als reines Modell. Zug = oberste(r) Ball/Gruppe in anderes Glas.</summary>
    public sealed class BallSortBoard
    {
        private readonly List<Tube> _tubes;
        public IReadOnlyList<Tube> Tubes => _tubes;
        public int TubeCount => _tubes.Count;

        public BallSortBoard(IEnumerable<Tube> tubes) => _tubes = new List<Tube>(tubes);

        public Tube this[int i] => _tubes[i];

        /// <summary>Regel: Quelle nicht leer, Ziel != Quelle, Ziel leer ODER gleiche Oberfarbe mit Platz.</summary>
        public bool CanMove(int from, int to)
        {
            if (from == to) return false;
            if (from < 0 || to < 0 || from >= _tubes.Count || to >= _tubes.Count) return false;
            var src = _tubes[from];
            var dst = _tubes[to];
            if (src.IsEmpty || dst.IsFull) return false;
            return dst.IsEmpty || dst.Top == src.Top;
        }

        /// <summary>Bewegt die gesamte gleichfarbige Oberkanten-Gruppe (soweit Platz). Liefert bewegte Anzahl.</summary>
        public int TryMove(int from, int to)
        {
            if (!CanMove(from, to)) return 0;
            var src = _tubes[from];
            var dst = _tubes[to];
            int color = src.Top;
            int movable = src.TopGroupSize();
            int space = dst.Capacity - dst.Count;
            int n = movable < space ? movable : space;
            for (int i = 0; i < n; i++) { src.Pop(); dst.Push(color); }
            return n;
        }

        /// <summary>Bewegt genau einen Ball (für den Level-Generator).</summary>
        public bool TryMoveSingle(int from, int to)
        {
            if (!CanMove(from, to)) return false;
            _tubes[to].Push(_tubes[from].Pop());
            return true;
        }

        public bool IsSolved
        {
            get
            {
                foreach (var t in _tubes)
                    if (!t.IsComplete) return false;
                return true;
            }
        }

        /// <summary>Soft-Lock-Erkennung: existiert überhaupt ein legaler Zug?</summary>
        public bool HasAnyMove()
        {
            for (int i = 0; i < _tubes.Count; i++)
            for (int j = 0; j < _tubes.Count; j++)
                if (i != j && CanMove(i, j)) return true;
            return false;
        }

        public BallSortBoard Clone()
        {
            var clones = new List<Tube>(_tubes.Count);
            foreach (var t in _tubes) clones.Add(t.Clone());
            return new BallSortBoard(clones);
        }
    }
}
