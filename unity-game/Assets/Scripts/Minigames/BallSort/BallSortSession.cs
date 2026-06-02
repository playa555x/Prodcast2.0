using System.Collections.Generic;

namespace HeartMatch.Minigames.BallSort
{
    public sealed class BallSortConfig
    {
        public int Colors = 4;
        public int Capacity = 4;
        public int EmptyTubes = 2;
        public int ShuffleMoves = 40;
        public int MoveLimit = 0;     // 0 = unbegrenzt
        public int ParMoves = 20;     // Referenz für Sterne-Bewertung
        public int CoinsOnWin = 60;
    }

    /// <summary>Ball-Sort-Sitzung mit Undo, Soft-Lock-Erkennung und Sterne-Bewertung. UnityEngine-frei.</summary>
    public sealed class BallSortSession : IMinigameSession
    {
        public BallSortBoard Board { get; }
        public int MovesUsed { get; private set; }

        private readonly BallSortConfig _config;
        private readonly Stack<(int from, int to, int count)> _history = new();
        private bool _finished;
        private bool _won;

        public BallSortSession(BallSortConfig config, int seed)
        {
            _config = config;
            Board = BallSortLevelGenerator.Generate(
                config.Colors, config.Capacity, config.EmptyTubes, config.ShuffleMoves, seed);
        }

        public bool TryMove(int from, int to)
        {
            if (_finished) return false;
            int moved = Board.TryMove(from, to);
            if (moved == 0) return false;

            _history.Push((from, to, moved));
            MovesUsed++;
            CheckEnd();
            return true;
        }

        public bool Undo()
        {
            if (_finished || _history.Count == 0) return false;
            var (from, to, count) = _history.Pop();
            // Rücktransport derselben Anzahl Bälle.
            int color = Board[to].Top;
            for (int i = 0; i < count; i++) { Board[to].Pop(); Board[from].Push(color); }
            MovesUsed++;
            return true;
        }

        /// <summary>Stecken geblieben (kein Sieg, kein legaler Zug)?</summary>
        public bool IsSoftLocked => !_finished && !Board.IsSolved && !Board.HasAnyMove();

        private void CheckEnd()
        {
            if (Board.IsSolved) { _finished = true; _won = true; }
            else if (_config.MoveLimit > 0 && MovesUsed >= _config.MoveLimit) { _finished = true; _won = false; }
        }

        public bool IsFinished => _finished;

        public MinigameResult Result => new()
        {
            Won = _won,
            Score = _won ? ScoreFromMoves() : 0,
            Stars = _won ? Stars() : 0,
            CoinsEarned = _won ? _config.CoinsOnWin : 0,
        };

        private int ScoreFromMoves()
        {
            // Weniger Züge -> mehr Punkte (mind. 100).
            int over = MovesUsed - _config.ParMoves;
            int score = 1000 - (over > 0 ? over * 20 : 0);
            return score < 100 ? 100 : score;
        }

        private int Stars()
        {
            if (MovesUsed <= _config.ParMoves) return 3;
            if (MovesUsed <= _config.ParMoves * 1.5) return 2;
            return 1;
        }
    }
}
