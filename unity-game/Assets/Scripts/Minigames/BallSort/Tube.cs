using System.Collections.Generic;

namespace HeartMatch.Minigames.BallSort
{
    /// <summary>Ein Reagenzglas: Stapel von Farb-IDs (Index 0 = unten). Farb-ID 0 ist ungenutzt.</summary>
    public sealed class Tube
    {
        public int Capacity { get; }
        private readonly List<int> _balls = new();

        public Tube(int capacity) => Capacity = capacity;

        public int Count => _balls.Count;
        public bool IsEmpty => _balls.Count == 0;
        public bool IsFull => _balls.Count >= Capacity;
        public int Top => _balls[_balls.Count - 1];
        public IReadOnlyList<int> Balls => _balls;

        public void Push(int color) => _balls.Add(color);

        public int Pop()
        {
            int v = _balls[_balls.Count - 1];
            _balls.RemoveAt(_balls.Count - 1);
            return v;
        }

        /// <summary>Anzahl gleichfarbiger Bälle direkt unter/auf der Oberkante.</summary>
        public int TopGroupSize()
        {
            if (IsEmpty) return 0;
            int top = Top, n = 0;
            for (int i = _balls.Count - 1; i >= 0 && _balls[i] == top; i--) n++;
            return n;
        }

        public bool IsSingleColor()
        {
            for (int i = 1; i < _balls.Count; i++)
                if (_balls[i] != _balls[0]) return false;
            return true;
        }

        /// <summary>Gelöst = leer ODER komplett gefüllt und einfarbig.</summary>
        public bool IsComplete => IsEmpty || (IsFull && IsSingleColor());

        public Tube Clone()
        {
            var t = new Tube(Capacity);
            t._balls.AddRange(_balls);
            return t;
        }
    }
}
