using System.Collections.Generic;
using HeartMatch.Minigames;
using HeartMatch.Minigames.BallSort;
using HeartMatch.Minigames.Match3;

namespace HeartMatch.Data
{
    /// <summary>Wandelt datengetriebene <see cref="LevelDef"/> in lauffähige Minispiel-Sitzungen um.</summary>
    public static class LevelFactory
    {
        public static IMinigameSession CreateSession(LevelDef level, int seed)
        {
            return level.Minigame == MinigameKind.BallSort
                ? new BallSortSession(BuildBallSortConfig(level), seed)
                : new Match3Session(BuildMatch3Config(level), BuildObjectives(level), seed);
        }

        public static Match3Config BuildMatch3Config(LevelDef l) => new()
        {
            Width = l.Width,
            Height = l.Height,
            ColorCount = l.ColorCount,
            MoveLimit = l.MoveLimit,
            Star1Score = l.Star1,
            Star2Score = l.Star2,
            Star3Score = l.Star3,
        };

        public static List<Objective> BuildObjectives(LevelDef l)
        {
            var list = new List<Objective>();
            foreach (var spec in l.Objectives)
            {
                if (spec.Type == "CollectColor")
                    list.Add(new Objective { Type = ObjectiveType.CollectColor, Color = (GemColor)spec.ColorId, Target = spec.Target });
                else
                    list.Add(new Objective { Type = ObjectiveType.Score, Target = spec.Target });
            }
            if (list.Count == 0)
                list.Add(new Objective { Type = ObjectiveType.Score, Target = l.Star1 });
            return list;
        }

        public static BallSortConfig BuildBallSortConfig(LevelDef l) => new()
        {
            Colors = l.Colors,
            Capacity = l.Capacity,
            EmptyTubes = l.EmptyTubes,
            ShuffleMoves = l.ShuffleMoves,
            ParMoves = l.ParMoves,
            CoinsOnWin = l.CoinsOnWin,
        };
    }
}
