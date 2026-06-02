using System.Collections.Generic;

namespace HeartMatch.Minigames
{
    /// <summary>Einheitliches Ergebnis eines Minispiel-Durchgangs (feeds Economy & Relationship).</summary>
    public struct MinigameResult
    {
        public bool Won;
        public int Score;
        public int Stars;            // 1..3 je nach Score-Schwellen
        public int CoinsEarned;
        public Dictionary<string, int> Objectives; // optionale Detailwerte

        public static MinigameResult Lose(int score) => new() { Won = false, Score = score, Stars = 0 };
    }

    /// <summary>
    /// Vertrag für eine Minispiel-Sitzung. Bewusst sitzungsbasiert (statt eines blockierenden Play()),
    /// da Eingaben interaktiv über Zeit kommen. Jede Implementierung meldet, wenn sie beendet ist.
    /// </summary>
    public interface IMinigameSession
    {
        bool IsFinished { get; }
        MinigameResult Result { get; }
    }
}
