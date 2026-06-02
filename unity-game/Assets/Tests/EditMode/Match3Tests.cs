using System.Collections.Generic;
using HeartMatch.Core;
using HeartMatch.Minigames.Match3;
using NUnit.Framework;

namespace HeartMatch.Tests
{
    public class Match3Tests
    {
        // Muster (x+y)%3+1 -> nie zwei gleiche benachbart => garantiert matchfrei. Farbe 6 (Purple)
        // taucht im Muster nie auf und eignet sich daher für kontrollierte Test-Matches.
        private static Board PatternBoard(int w = 8, int h = 8)
        {
            var b = new Board(w, h, 6);
            for (int y = 0; y < h; y++)
            for (int x = 0; x < w; x++)
                b.SetColor(x, y, (GemColor)((x + y) % 3 + 1));
            return b;
        }

        [Test]
        public void PatternBoard_HasNoMatches()
        {
            Assert.IsFalse(MatchDetector.HasAnyMatch(PatternBoard()));
        }

        [Test]
        public void FillRandomNoMatches_ProducesNoStartMatches()
        {
            var b = new Board(8, 8, 6);
            b.FillRandomNoMatches(new DeterministicRng(12345));
            Assert.IsFalse(MatchDetector.HasAnyMatch(b));
        }

        [Test]
        public void MatchDetector_FindsHorizontalRunOfThree()
        {
            var b = PatternBoard();
            b.SetColor(0, 0, GemColor.Purple);
            b.SetColor(1, 0, GemColor.Purple);
            b.SetColor(2, 0, GemColor.Purple);

            var runs = MatchDetector.FindRuns(b);
            Assert.AreEqual(1, runs.Count);
            Assert.AreEqual(3, runs[0].Length);
            Assert.IsTrue(runs[0].Horizontal);
        }

        [Test]
        public void Resolver_RejectsNonAdjacentSwap()
        {
            var b = PatternBoard();
            var resolver = new Match3Resolver(new DeterministicRng(1));
            var r = resolver.ResolveSwap(b, new GridPos(0, 0), new GridPos(5, 5));
            Assert.IsFalse(r.Valid);
        }

        [Test]
        public void Resolver_AcceptsSwapThatFormsMatch_AndScores()
        {
            var b = PatternBoard();
            // Vorbereitung: zwei Purple in Reihe 0 + ein Purple darüber bei (2,1).
            b.SetColor(0, 0, GemColor.Purple);
            b.SetColor(1, 0, GemColor.Purple);
            b.SetColor(2, 1, GemColor.Purple);
            // (2,0) bleibt Muster -> Swap (2,0)<->(2,1) erzeugt Purple-Tripel in Reihe 0.

            var resolver = new Match3Resolver(new DeterministicRng(7));
            var r = resolver.ResolveSwap(b, new GridPos(2, 0), new GridPos(2, 1));

            Assert.IsTrue(r.Valid);
            Assert.Greater(r.Score, 0);
            Assert.Greater(r.ClearedCount, 0);
        }

        [Test]
        public void SpecialFactory_FourInLineSpawnsRocket()
        {
            var run = new Run { Horizontal = true, Color = GemColor.Red };
            for (int x = 0; x < 4; x++) run.Positions.Add(new GridPos(x, 0));

            var spawns = SpecialFactory.Determine(new List<Run> { run }, null);
            Assert.AreEqual(1, spawns.Count);
            Assert.AreEqual(SpecialKind.RocketVertical, spawns[0].Kind);
        }

        [Test]
        public void SpecialFactory_FiveInLineSpawnsColorBomb()
        {
            var run = new Run { Horizontal = true, Color = GemColor.Blue };
            for (int x = 0; x < 5; x++) run.Positions.Add(new GridPos(x, 0));

            var spawns = SpecialFactory.Determine(new List<Run> { run }, null);
            Assert.AreEqual(1, spawns.Count);
            Assert.AreEqual(SpecialKind.ColorBomb, spawns[0].Kind);
        }

        [Test]
        public void SpecialFactory_IntersectionSpawnsBomb()
        {
            var h = new Run { Horizontal = true, Color = GemColor.Green };
            h.Positions.Add(new GridPos(0, 0));
            h.Positions.Add(new GridPos(1, 0));
            h.Positions.Add(new GridPos(2, 0));
            var v = new Run { Horizontal = false, Color = GemColor.Green };
            v.Positions.Add(new GridPos(1, 0));
            v.Positions.Add(new GridPos(1, 1));
            v.Positions.Add(new GridPos(1, 2));

            var spawns = SpecialFactory.Determine(new List<Run> { h, v }, null);
            Assert.AreEqual(1, spawns.Count);
            Assert.AreEqual(SpecialKind.Bomb, spawns[0].Kind);
            Assert.AreEqual(new GridPos(1, 0), spawns[0].Pos);
        }

        [Test]
        public void ColorBomb_OnGem_ClearsThatColor()
        {
            var b = PatternBoard();
            // Farbbombe bei (0,0), benachbarter Stein (1,0) hat eine bekannte Farbe.
            b.Set(0, 0, new Cell { Color = GemColor.None, Special = SpecialKind.ColorBomb });
            b.SetColor(1, 0, GemColor.Red);

            var resolver = new Match3Resolver(new DeterministicRng(3));
            var r = resolver.ResolveSwap(b, new GridPos(0, 0), new GridPos(1, 0));

            Assert.IsTrue(r.Valid);
            Assert.Greater(r.ClearedCount, 0);
        }
    }
}
