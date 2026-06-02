using System.Collections.Generic;
using HeartMatch.Core;

namespace HeartMatch.Minigames.Match3
{
    /// <summary>Reine Konfigurationswerte eines Match-3-Levels (von LevelDef befüllt).</summary>
    public sealed class Match3Config
    {
        public int Width = 8;
        public int Height = 8;
        public int ColorCount = 6;
        public int MoveLimit = 25;
        public int Star1Score = 500;
        public int Star2Score = 1200;
        public int Star3Score = 2500;
        public int CoinsPerStar = 25;
    }

    /// <summary>
    /// Spielsitzung für Match-3: hält Board, Zuglimit und Ziele und wertet jeden Zug aus.
    /// UnityEngine-frei und damit vollständig im EditMode testbar.
    /// </summary>
    public sealed class Match3Session : IMinigameSession
    {
        public Board Board { get; }
        public int MovesLeft { get; private set; }
        public int TotalScore { get; private set; }
        public ObjectiveTracker Objectives { get; }

        private readonly Match3Resolver _resolver;
        private readonly Match3Config _config;
        private bool _finished;
        private bool _won;

        public Match3Session(Match3Config config, IEnumerable<Objective> objectives, int seed)
        {
            _config = config;
            var rng = new DeterministicRng(seed);
            Board = new Board(config.Width, config.Height, config.ColorCount);
            Board.FillRandomNoMatches(rng);
            _resolver = new Match3Resolver(rng);
            Objectives = new ObjectiveTracker(objectives);
            MovesLeft = config.MoveLimit;
        }

        /// <summary>Versucht einen Tausch. Liefert false (ohne Zugverbrauch) bei ungültigem Zug.</summary>
        public bool TryMove(GridPos a, GridPos b)
        {
            if (_finished) return false;
            var result = _resolver.ResolveSwap(Board, a, b);
            if (!result.Valid) return false;

            MovesLeft--;
            TotalScore += result.Score;
            Objectives.OnResolve(result);
            CheckEnd();
            return true;
        }

        private void CheckEnd()
        {
            if (Objectives.AllComplete) { _finished = true; _won = true; }
            else if (MovesLeft <= 0) { _finished = true; _won = false; }
        }

        public bool IsFinished => _finished;

        public MinigameResult Result => new()
        {
            Won = _won,
            Score = TotalScore,
            Stars = ComputeStars(),
            CoinsEarned = _won ? ComputeStars() * _config.CoinsPerStar : 0,
            Objectives = null,
        };

        private int ComputeStars()
        {
            if (TotalScore >= _config.Star3Score) return 3;
            if (TotalScore >= _config.Star2Score) return 2;
            if (TotalScore >= _config.Star1Score) return 1;
            return 0;
        }
    }
}
