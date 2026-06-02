using System;

namespace HeartMatch.Minigames.Match3
{
    /// <summary>Grundfarben der Steine. <see cref="None"/> = leere Zelle.</summary>
    public enum GemColor
    {
        None = 0,
        Red = 1,
        Orange = 2,
        Yellow = 3,
        Green = 4,
        Blue = 5,
        Purple = 6,
    }

    /// <summary>Spezialstein-Typ, der durch besondere Matches entsteht.</summary>
    public enum SpecialKind
    {
        None = 0,
        RocketHorizontal = 1, // räumt die gesamte Reihe
        RocketVertical = 2,   // räumt die gesamte Spalte
        Bomb = 3,             // räumt 3x3-Umgebung
        ColorBomb = 4,        // räumt alle Steine einer Farbe
    }

    /// <summary>Optionaler Blocker auf einer Zelle (mehrstufig über <see cref="BlockerHealth"/>).</summary>
    public enum BlockerKind
    {
        None = 0,
        Ice = 1,   // schmilzt bei benachbartem Match
        Crate = 2, // bricht bei benachbartem Match
    }

    public readonly struct GridPos : IEquatable<GridPos>
    {
        public readonly int X;
        public readonly int Y;
        public GridPos(int x, int y) { X = x; Y = y; }
        public bool Equals(GridPos o) => X == o.X && Y == o.Y;
        public override bool Equals(object o) => o is GridPos g && Equals(g);
        public override int GetHashCode() => (X * 397) ^ Y;
        public override string ToString() => $"({X},{Y})";
    }

    public struct Cell
    {
        public GemColor Color;
        public SpecialKind Special;
        public BlockerKind Blocker;
        public int BlockerHealth;

        public bool IsEmpty => Color == GemColor.None && Special == SpecialKind.None;
        public bool HasSpecial => Special != SpecialKind.None;
        public bool IsBlocked => Blocker != BlockerKind.None && BlockerHealth > 0;

        public static Cell Of(GemColor color) => new() { Color = color };
    }
}
