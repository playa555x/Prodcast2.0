using System.Collections.Generic;

namespace HeartMatch.Minigames.Match3
{
    public enum ObjectiveType
    {
        Score,        // erreiche Target Punkte
        CollectColor, // entferne Target Steine einer Farbe
    }

    public sealed class Objective
    {
        public ObjectiveType Type;
        public GemColor Color;   // nur bei CollectColor
        public int Target;
        public int Current;
        public bool IsComplete => Current >= Target;
    }

    /// <summary>Verfolgt Levelziele über die ResolveResults der Züge.</summary>
    public sealed class ObjectiveTracker
    {
        public readonly List<Objective> Objectives;

        public ObjectiveTracker(IEnumerable<Objective> objectives)
        {
            Objectives = new List<Objective>(objectives);
        }

        public void OnResolve(ResolveResult result)
        {
            foreach (var o in Objectives)
            {
                switch (o.Type)
                {
                    case ObjectiveType.Score:
                        o.Current += result.Score;
                        break;
                    case ObjectiveType.CollectColor:
                        if (result.ClearedByColor.TryGetValue(o.Color, out var n))
                            o.Current += n;
                        break;
                }
            }
        }

        public bool AllComplete
        {
            get
            {
                foreach (var o in Objectives)
                    if (!o.IsComplete) return false;
                return true;
            }
        }
    }
}
