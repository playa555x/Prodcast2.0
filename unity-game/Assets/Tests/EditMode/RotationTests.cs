using HeartMatch.Core;
using HeartMatch.Tamagotchi;
using NUnit.Framework;

namespace HeartMatch.Tests
{
    public class RotationTests
    {
        [Test]
        public void SwapsCharacterAfterFiveStoryBeats()
        {
            var rotation = new CharacterRotation(new[] { "a", "b", "c" });
            var state = new GameState { ActiveCharacterId = "a" };

            for (int i = 0; i < 4; i++)
                Assert.IsFalse(rotation.RegisterStoryBeat(state), $"Beat {i + 1} sollte keinen Wechsel auslösen");

            Assert.IsTrue(rotation.RegisterStoryBeat(state)); // 5. Beat
            Assert.AreEqual("b", state.ActiveCharacterId);
            Assert.AreEqual(0, state.StoryBeatsSinceSwap);
        }

        [Test]
        public void RosterWrapsAround()
        {
            var rotation = new CharacterRotation(new[] { "a", "b" });
            Assert.AreEqual("b", rotation.NextCharacterId("a"));
            Assert.AreEqual("a", rotation.NextCharacterId("b"));
        }
    }
}
