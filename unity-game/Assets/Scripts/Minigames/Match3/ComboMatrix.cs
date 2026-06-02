using System.Collections.Generic;

namespace HeartMatch.Minigames.Match3
{
    /// <summary>
    /// Bestimmt das Räum-Set, wenn zwei Spezialsteine getauscht werden. Erwartet, dass das Board
    /// bereits getauscht wurde; <paramref name="a"/> und <paramref name="b"/> sind die beiden
    /// Spezialstein-Positionen. Das Ergebnis wird vom Resolver noch über ExpandClear verkettet.
    /// </summary>
    public static class ComboMatrix
    {
        public static HashSet<GridPos> Combine(Board board, GridPos a, GridPos b)
        {
            var ka = board.Get(a).Special;
            var kb = board.Get(b).Special;
            var result = new HashSet<GridPos> { a, b };

            bool aCB = ka == SpecialKind.ColorBomb;
            bool bCB = kb == SpecialKind.ColorBomb;

            // Farbbombe + Farbbombe -> gesamtes Feld
            if (aCB && bCB)
            {
                for (int y = 0; y < board.Height; y++)
                for (int x = 0; x < board.Width; x++)
                    result.Add(new GridPos(x, y));
                return result;
            }

            // Farbbombe + (Rakete/Bombe): alle Steine der Partnerfarbe übernehmen dessen Effekt
            if (aCB || bCB)
            {
                var cbPos = aCB ? a : b;
                var otherPos = aCB ? b : a;
                var otherKind = board.Get(otherPos).Special;
                var targetColor = board.Get(otherPos).Color;
                if (targetColor == GemColor.None)
                    targetColor = Match3Effects.MostFrequentColor(board);

                result.Add(cbPos);
                for (int y = 0; y < board.Height; y++)
                for (int x = 0; x < board.Width; x++)
                {
                    if (board.Get(x, y).Color != targetColor) continue;
                    var p = new GridPos(x, y);
                    result.Add(p);
                    // jeder dieser Steine wirkt wie der Partner-Spezialstein
                    var asKind = otherKind == SpecialKind.ColorBomb ? SpecialKind.Bomb : otherKind;
                    foreach (var c in Match3Effects.EffectCells(board, p, asKind, targetColor))
                        result.Add(c);
                }
                return result;
            }

            // Zwei Linien-/Bomben-Specials -> kombinierter, größerer Blast (zentriert auf b)
            bool aRocket = ka == SpecialKind.RocketHorizontal || ka == SpecialKind.RocketVertical;
            bool bRocket = kb == SpecialKind.RocketHorizontal || kb == SpecialKind.RocketVertical;
            bool aBomb = ka == SpecialKind.Bomb;
            bool bBomb = kb == SpecialKind.Bomb;

            if (aRocket && bRocket)
            {
                AddRow(board, b.Y, result);
                AddCol(board, b.X, result);
            }
            else if ((aRocket && bBomb) || (aBomb && bRocket))
            {
                AddRow(board, b.Y - 1, result); AddRow(board, b.Y, result); AddRow(board, b.Y + 1, result);
                AddCol(board, b.X - 1, result); AddCol(board, b.X, result); AddCol(board, b.X + 1, result);
            }
            else if (aBomb && bBomb)
            {
                for (int dx = -2; dx <= 2; dx++)
                for (int dy = -2; dy <= 2; dy++)
                {
                    int x = b.X + dx, y = b.Y + dy;
                    if (board.InBounds(x, y)) result.Add(new GridPos(x, y));
                }
            }

            return result;
        }

        private static void AddRow(Board b, int y, HashSet<GridPos> set)
        {
            if (y < 0 || y >= b.Height) return;
            for (int x = 0; x < b.Width; x++) set.Add(new GridPos(x, y));
        }

        private static void AddCol(Board b, int x, HashSet<GridPos> set)
        {
            if (x < 0 || x >= b.Width) return;
            for (int y = 0; y < b.Height; y++) set.Add(new GridPos(x, y));
        }
    }
}
