using System.Collections.Generic;
using HeartMatch.Core;

namespace HeartMatch.Tamagotchi
{
    /// <summary>
    /// Charakter-Rotation: zählt abgeschlossene Story-Beats und wechselt nach
    /// <see cref="BeatsPerCharacter"/> (Standard 5) zum nächsten freigeschalteten Charakter.
    /// Fortschritt pro Charakter bleibt im GameState erhalten (Rückkehr jederzeit möglich).
    /// </summary>
    public sealed class CharacterRotation
    {
        public const int BeatsPerCharacter = 5;

        private readonly List<string> _rosterOrder;

        public CharacterRotation(IEnumerable<string> rosterOrder)
        {
            _rosterOrder = new List<string>(rosterOrder);
        }

        /// <summary>
        /// Registriert einen abgeschlossenen Story-Beat. Liefert true, wenn ein Charakterwechsel
        /// fällig ist; der neue aktive Charakter wird in <paramref name="state"/> gesetzt.
        /// </summary>
        public bool RegisterStoryBeat(GameState state)
        {
            state.StoryBeatsSinceSwap++;
            if (state.StoryBeatsSinceSwap < BeatsPerCharacter) return false;

            state.StoryBeatsSinceSwap = 0;
            state.ActiveCharacterId = NextCharacterId(state.ActiveCharacterId);
            return true;
        }

        public string NextCharacterId(string current)
        {
            if (_rosterOrder.Count == 0) return current;
            int idx = _rosterOrder.IndexOf(current);
            int next = (idx + 1) % _rosterOrder.Count;
            return _rosterOrder[next];
        }
    }
}
