using HeartMatch.Core;

namespace HeartMatch.Minigames.Match3
{
    /// <summary>
    /// Match-3-Spielfeld als reines Modell (UnityEngine-frei).
    /// Koordinaten: X = Spalte (0..W-1), Y = Zeile (0 = unten). Schwerkraft zieht nach Y=0.
    /// </summary>
    public sealed class Board
    {
        public int Width { get; }
        public int Height { get; }
        public int ColorCount { get; }

        private readonly Cell[,] _cells;

        public Board(int width, int height, int colorCount = 6)
        {
            Width = width;
            Height = height;
            ColorCount = colorCount < 3 ? 3 : (colorCount > 6 ? 6 : colorCount);
            _cells = new Cell[width, height];
        }

        public bool InBounds(int x, int y) => x >= 0 && x < Width && y >= 0 && y < Height;
        public bool InBounds(GridPos p) => InBounds(p.X, p.Y);

        public Cell Get(int x, int y) => _cells[x, y];
        public Cell Get(GridPos p) => _cells[p.X, p.Y];
        public void Set(int x, int y, Cell c) => _cells[x, y] = c;
        public void Set(GridPos p, Cell c) => _cells[p.X, p.Y] = c;

        public void SetColor(int x, int y, GemColor color) => _cells[x, y] = Cell.Of(color);

        /// <summary>Tauscht zwei Zellen (ohne Regelprüfung).</summary>
        public void Swap(GridPos a, GridPos b)
        {
            (_cells[a.X, a.Y], _cells[b.X, b.Y]) = (_cells[b.X, b.Y], _cells[a.X, a.Y]);
        }

        public static bool AreAdjacent(GridPos a, GridPos b)
        {
            int dx = a.X - b.X, dy = a.Y - b.Y;
            return (dx == 0 && (dy == 1 || dy == -1)) || (dy == 0 && (dx == 1 || dx == -1));
        }

        /// <summary>Befüllt das gesamte Feld zufällig OHNE Start-Matches (für saubere Startaufstellung).</summary>
        public void FillRandomNoMatches(DeterministicRng rng)
        {
            for (int y = 0; y < Height; y++)
            for (int x = 0; x < Width; x++)
            {
                GemColor color;
                int guard = 0;
                do
                {
                    color = (GemColor)rng.Range(1, ColorCount + 1);
                    guard++;
                } while (guard < 50 && CreatesImmediateMatch(x, y, color));
                _cells[x, y] = Cell.Of(color);
            }
        }

        private bool CreatesImmediateMatch(int x, int y, GemColor color)
        {
            // Zwei gleiche links?
            if (x >= 2 && _cells[x - 1, y].Color == color && _cells[x - 2, y].Color == color)
                return true;
            // Zwei gleiche darunter?
            if (y >= 2 && _cells[x, y - 1].Color == color && _cells[x, y - 2].Color == color)
                return true;
            return false;
        }

        public Board Clone()
        {
            var b = new Board(Width, Height, ColorCount);
            for (int y = 0; y < Height; y++)
            for (int x = 0; x < Width; x++)
                b._cells[x, y] = _cells[x, y];
            return b;
        }
    }
}
