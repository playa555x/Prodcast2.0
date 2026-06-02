using System.Collections.Generic;
using HeartMatch.Core;

namespace HeartMatch.Minigames.Match3
{
    public sealed class ResolveResult
    {
        public bool Valid;       // war der Zug regelkonform?
        public int Score;        // erzielte Punkte
        public int Cascades;     // Anzahl Kaskaden-Durchläufe
        public int ClearedCount; // entfernte Steine gesamt
        // Pro Farbe entfernte Steine (für Objectives "Sammle N x Farbe").
        public readonly Dictionary<GemColor, int> ClearedByColor = new();
    }

    /// <summary>
    /// Vollständige Zug-Auflösung für Match-3. Reine Logik (UnityEngine-frei), deterministisch über
    /// den injizierten RNG. Behandelt normale Matches, Spezialstein-Erzeugung, Spezial+Spezial-Kombis,
    /// Farbbombe-auf-Stein, Ketten-Aktivierung, Schwerkraft und Nachfüllen.
    /// </summary>
    public sealed class Match3Resolver
    {
        private const int BaseScorePerTile = 10;
        private readonly DeterministicRng _rng;

        public Match3Resolver(DeterministicRng rng) => _rng = rng;

        public ResolveResult ResolveSwap(Board board, GridPos a, GridPos b)
        {
            var r = new ResolveResult();
            if (!board.InBounds(a) || !board.InBounds(b) || !Board.AreAdjacent(a, b))
                return r; // ungültig

            var ca = board.Get(a);
            var cb = board.Get(b);

            // 1) Spezial + Spezial -> Kombi
            if (ca.HasSpecial && cb.HasSpecial)
            {
                board.Swap(a, b);
                var combo = ComboMatrix.Combine(board, a, b);
                var full = Match3Effects.ExpandClear(board, combo, GemColor.None);
                ApplyClear(board, full, r, 1);
                Settle(board, null, r);
                r.Valid = true;
                return r;
            }

            // 2) Farbbombe auf normalen Stein -> dessen Farbe komplett räumen
            if (ca.Special == SpecialKind.ColorBomb && !cb.HasSpecial && cb.Color != GemColor.None)
                return ResolveColorBombOnGem(board, a, b, r);
            if (cb.Special == SpecialKind.ColorBomb && !ca.HasSpecial && ca.Color != GemColor.None)
                return ResolveColorBombOnGem(board, b, a, r);

            // 3) Normaler Tausch
            board.Swap(a, b);
            var runs = MatchDetector.FindRuns(board);
            if (runs.Count == 0)
            {
                board.Swap(a, b); // zurücktauschen — kein Match
                return r;
            }
            GridPos? hint = RunsContain(runs, a) ? a : (RunsContain(runs, b) ? b : (GridPos?)null);
            Settle(board, hint, r);
            r.Valid = true;
            return r;
        }

        private ResolveResult ResolveColorBombOnGem(Board board, GridPos cbPos, GridPos gemPos, ResolveResult r)
        {
            board.Swap(cbPos, gemPos); // Farbbombe liegt jetzt auf gemPos-Position? -> wir nutzen Zielfarbe
            var target = board.Get(cbPos).Color; // der Stein, der vorher die Bombe war? nach Swap vertauscht
            // Nach dem Swap liegt die Farbbombe auf der ursprünglichen Stein-Position (gemPos),
            // der Stein auf cbPos. Zielfarbe ist die Farbe dieses Steins.
            if (target == GemColor.None) target = Match3Effects.MostFrequentColor(board);
            var seed = new HashSet<GridPos> { gemPos };
            var full = Match3Effects.ExpandClear(board, seed, target);
            ApplyClear(board, full, r, 1);
            Settle(board, null, r);
            r.Valid = true;
            return r;
        }

        /// <summary>Kaskaden-Schleife bis zur Stabilität: Matches räumen, Specials setzen, fallen, nachfüllen.</summary>
        private void Settle(Board board, GridPos? swapHint, ResolveResult r)
        {
            int combo = r.Cascades;
            while (true)
            {
                var runs = MatchDetector.FindRuns(board);
                if (runs.Count == 0) break;
                combo++;

                var spawns = SpecialFactory.Determine(runs, swapHint);
                var spawnByPos = new Dictionary<GridPos, SpecialSpawn>();
                foreach (var s in spawns) spawnByPos[s.Pos] = s;

                var matched = MatchDetector.MatchedPositions(runs);
                var toClear = Match3Effects.ExpandClear(board, matched, GemColor.None);

                ApplyClear(board, toClear, r, combo, spawnByPos);

                // Spezialsteine an ihren Positionen setzen.
                foreach (var s in spawns)
                    board.Set(s.Pos, new Cell { Color = s.Color, Special = s.Kind });

                ApplyGravity(board);
                Refill(board);

                swapHint = null; // nur der erste Durchlauf nutzt die Tausch-Position
            }
            r.Cascades = combo;
        }

        private void ApplyClear(Board board, HashSet<GridPos> clear, ResolveResult r, int combo,
            Dictionary<GridPos, SpecialSpawn> keep = null)
        {
            int cleared = 0;
            foreach (var pos in clear)
            {
                if (keep != null && keep.ContainsKey(pos)) continue; // wird zum Spezialstein
                var cell = board.Get(pos);
                if (cell.Color == GemColor.None && cell.Special == SpecialKind.None) continue;
                if (cell.Color != GemColor.None)
                {
                    r.ClearedByColor.TryGetValue(cell.Color, out var n);
                    r.ClearedByColor[cell.Color] = n + 1;
                }
                board.Set(pos, default);
                cleared++;
            }
            // Combo-Multiplikator: +20 % pro zusätzlicher Kaskade.
            double mult = 1.0 + 0.2 * (combo - 1 < 0 ? 0 : combo - 1);
            r.Score += (int)(cleared * BaseScorePerTile * mult);
            r.ClearedCount += cleared;
        }

        private static void ApplyGravity(Board board)
        {
            for (int x = 0; x < board.Width; x++)
            {
                int write = 0;
                for (int y = 0; y < board.Height; y++)
                {
                    var cell = board.Get(x, y);
                    bool empty = cell.Color == GemColor.None && cell.Special == SpecialKind.None;
                    if (!empty)
                    {
                        if (write != y)
                        {
                            board.Set(x, write, cell);
                            board.Set(x, y, default);
                        }
                        write++;
                    }
                }
            }
        }

        private void Refill(Board board)
        {
            for (int x = 0; x < board.Width; x++)
            for (int y = 0; y < board.Height; y++)
            {
                var cell = board.Get(x, y);
                if (cell.Color == GemColor.None && cell.Special == SpecialKind.None)
                    board.SetColor(x, y, (GemColor)_rng.Range(1, board.ColorCount + 1));
            }
        }

        private static bool RunsContain(List<Run> runs, GridPos p)
        {
            foreach (var run in runs)
                if (run.Positions.Contains(p)) return true;
            return false;
        }
    }
}
