using System;
using System.Collections.Generic;
using UnityEngine;

namespace HeartMatch.Data
{
    public enum MinigameKind { Match3, BallSort }

    [Serializable]
    public struct ObjectiveSpec
    {
        public string Type;   // "Score" | "CollectColor"
        public int ColorId;   // bei CollectColor (1..6)
        public int Target;
    }

    /// <summary>Daten eines Levels: welches Minispiel + Parameter + Ziele. Befüllt die Logik-Configs.</summary>
    [CreateAssetMenu(fileName = "Level", menuName = "HeartMatch/Level")]
    public sealed class LevelDef : ScriptableObject
    {
        public string Id;
        public MinigameKind Minigame = MinigameKind.Match3;

        [Header("Match-3")]
        public int Width = 8;
        public int Height = 8;
        public int ColorCount = 6;
        public int MoveLimit = 25;
        public int Star1 = 500;
        public int Star2 = 1200;
        public int Star3 = 2500;
        public List<ObjectiveSpec> Objectives = new();

        [Header("Ball-Sort")]
        public int Colors = 4;
        public int Capacity = 4;
        public int EmptyTubes = 2;
        public int ShuffleMoves = 40;
        public int ParMoves = 20;

        [Header("Belohnung")]
        public int CoinsOnWin = 60;
    }
}
