using System.Collections.Generic;
using UnityEngine;

namespace HeartMatch.Data
{
    /// <summary>
    /// Erzeugt Beispiel-Content zur Laufzeit, damit das Spiel ohne manuelles Asset-Authoring spielbar ist.
    /// In Produktion werden stattdessen kuratierte ScriptableObject-Assets verwendet (CreateAssetMenu).
    /// Alle Charaktere sind fiktiv und erwachsen (Age >= 18, siehe CONTENT_POLICY).
    /// </summary>
    public static class DefaultContent
    {
        public static readonly string[] StarterRoster =
            { "luna", "mia", "sora", "nova", "ivy", "ren", "kai", "remy" };

        public static List<CharacterDef> CreateStarterCharacters()
        {
            var list = new List<CharacterDef>();
            foreach (var id in StarterRoster)
            {
                var c = ScriptableObject.CreateInstance<CharacterDef>();
                c.Id = id;
                c.DisplayName = char.ToUpper(id[0]) + id.Substring(1);
                c.Age = 22;
                c.Bio = "Fiktiver, erwachsener Charakter (Platzhalter).";
                c.LikedGiftTags = new List<string> { "flowers", "music" };
                c.DislikedGiftTags = new List<string> { "bugs" };
                c.RewardTierCount = 6;
                c.Rarity = CharacterRarity.Common;
                list.Add(c);
            }
            return list;
        }

        public static LevelDef SampleMatch3Level()
        {
            var l = ScriptableObject.CreateInstance<LevelDef>();
            l.Id = "m3_001";
            l.Minigame = MinigameKind.Match3;
            l.Width = 8; l.Height = 8; l.ColorCount = 6; l.MoveLimit = 25;
            l.Star1 = 500; l.Star2 = 1200; l.Star3 = 2500;
            l.Objectives = new List<ObjectiveSpec> { new() { Type = "Score", Target = 800 } };
            l.CoinsOnWin = 60;
            return l;
        }

        public static LevelDef SampleBallSortLevel()
        {
            var l = ScriptableObject.CreateInstance<LevelDef>();
            l.Id = "bs_001";
            l.Minigame = MinigameKind.BallSort;
            l.Colors = 4; l.Capacity = 4; l.EmptyTubes = 2; l.ShuffleMoves = 40; l.ParMoves = 20;
            l.CoinsOnWin = 60;
            return l;
        }
    }
}
