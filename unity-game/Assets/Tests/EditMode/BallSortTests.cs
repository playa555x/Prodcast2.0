using HeartMatch.Minigames.BallSort;
using NUnit.Framework;

namespace HeartMatch.Tests
{
    public class BallSortTests
    {
        [Test]
        public void CanMove_OntoEmptyOrSameColorWithSpace()
        {
            var t0 = new Tube(4); t0.Push(1); t0.Push(1);
            var t1 = new Tube(4); t1.Push(1);
            var t2 = new Tube(4); // leer
            var t3 = new Tube(4); t3.Push(2);
            var board = new BallSortBoard(new[] { t0, t1, t2, t3 });

            Assert.IsTrue(board.CanMove(0, 1));  // gleiche Farbe, Platz
            Assert.IsTrue(board.CanMove(0, 2));  // leeres Glas
            Assert.IsFalse(board.CanMove(0, 3)); // andere Oberfarbe
            Assert.IsFalse(board.CanMove(2, 0)); // Quelle leer
        }

        [Test]
        public void TryMove_MovesWholeTopGroup()
        {
            var t0 = new Tube(4); t0.Push(1); t0.Push(1); t0.Push(1);
            var t1 = new Tube(4);
            var board = new BallSortBoard(new[] { t0, t1 });

            int moved = board.TryMove(0, 1);
            Assert.AreEqual(3, moved);
            Assert.AreEqual(0, board[0].Count);
            Assert.AreEqual(3, board[1].Count);
        }

        [Test]
        public void TryMove_LimitedByCapacity()
        {
            var t0 = new Tube(4); t0.Push(1); t0.Push(1); t0.Push(1);
            var t1 = new Tube(4); t1.Push(1); t1.Push(1); // nur 2 Plätze frei
            var board = new BallSortBoard(new[] { t0, t1 });

            int moved = board.TryMove(0, 1);
            Assert.AreEqual(2, moved);
            Assert.IsTrue(board[1].IsFull);
        }

        [Test]
        public void IsSolved_WhenAllTubesSingleColorFullOrEmpty()
        {
            var t0 = new Tube(2); t0.Push(1); t0.Push(1);
            var t1 = new Tube(2); t1.Push(2); t1.Push(2);
            var t2 = new Tube(2); // leer
            var board = new BallSortBoard(new[] { t0, t1, t2 });
            Assert.IsTrue(board.IsSolved);
        }

        [Test]
        public void Generator_ProducesValidScrambledBoard()
        {
            var board = BallSortLevelGenerator.Generate(colors: 4, capacity: 4, emptyTubes: 2, shuffleMoves: 60, seed: 99);

            Assert.AreEqual(6, board.TubeCount);          // 4 Farben + 2 leere
            Assert.IsFalse(board.IsSolved);               // gemischt
            Assert.IsTrue(board.HasAnyMove());            // kein Start-Soft-Lock

            // Jede Farbe kommt genau 'capacity' (=4) mal vor.
            var counts = new int[5];
            for (int i = 0; i < board.TubeCount; i++)
                foreach (var c in board[i].Balls)
                    counts[c]++;
            for (int c = 1; c <= 4; c++)
                Assert.AreEqual(4, counts[c], $"Farbe {c}");
        }

        [Test]
        public void Generator_IsDeterministicForSameSeed()
        {
            var a = BallSortLevelGenerator.Generate(4, 4, 2, 50, 1234);
            var b = BallSortLevelGenerator.Generate(4, 4, 2, 50, 1234);
            for (int i = 0; i < a.TubeCount; i++)
            {
                Assert.AreEqual(a[i].Count, b[i].Count);
                for (int k = 0; k < a[i].Count; k++)
                    Assert.AreEqual(a[i].Balls[k], b[i].Balls[k]);
            }
        }
    }
}
