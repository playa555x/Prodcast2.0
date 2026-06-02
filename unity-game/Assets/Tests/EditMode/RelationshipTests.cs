using System.Collections.Generic;
using HeartMatch.Core;
using HeartMatch.Tamagotchi;
using NUnit.Framework;

namespace HeartMatch.Tests
{
    public class RelationshipTests
    {
        [Test]
        public void ComputeTier_RespectsThresholds()
        {
            Assert.AreEqual(0, RomanceTiers.ComputeTier(0, 0, 0, 5));
            Assert.AreEqual(1, RomanceTiers.ComputeTier(20, 0, 0, 5));
            Assert.AreEqual(2, RomanceTiers.ComputeTier(40, 25, 0, 5));
            Assert.AreEqual(3, RomanceTiers.ComputeTier(60, 45, 0, 5));
        }

        [Test]
        public void ComputeTier_CapsAtBuildMaxTier()
        {
            Assert.AreEqual(5, RomanceTiers.ComputeTier(100, 100, 100, 5)); // SFW
            Assert.AreEqual(6, RomanceTiers.ComputeTier(100, 100, 100, 6)); // Adult
        }

        [Test]
        public void Tier6_RequiresTension()
        {
            Assert.AreEqual(5, RomanceTiers.ComputeTier(100, 100, 0, 6));   // ohne Tension nur Tier 5
            Assert.AreEqual(6, RomanceTiers.ComputeTier(100, 100, 80, 6));  // mit Tension Tier 6
        }

        [Test]
        public void ApplyInteraction_RaisesAffectionAndTier()
        {
            var c = new CharacterProgress { Mood = 50f, Boredom = 0f };
            var rm = new RelationshipManager(maxTier: 5);

            var outcome = rm.ApplyInteraction(c, baseAffection: 30f, baseTrust: 30f, affinity: 1f, moodDelta: 5f);

            Assert.AreEqual(30f, c.Affection, 0.001f); // 30 * (0.5+0.5) * 1 * 1
            Assert.AreEqual(1, c.Tier);
            Assert.AreEqual(0, outcome.OldTier);
            Assert.IsTrue(outcome.TierChanged);
        }

        [Test]
        public void ApplyInteraction_ClampsAtHundred()
        {
            var c = new CharacterProgress { Affection = 95f, Mood = 100f, Boredom = 0f };
            var rm = new RelationshipManager(5);
            rm.ApplyInteraction(c, 50f, 0f, 2f, 0f);
            Assert.AreEqual(100f, c.Affection);
        }

        [Test]
        public void GiftAffinity_ReflectsPreferences()
        {
            var liked = new HashSet<string> { "flowers" };
            var disliked = new HashSet<string> { "bugs" };

            var (mLiked, dLiked) = GiftAffinity.Compute(new[] { "flowers" }, liked, disliked);
            Assert.AreEqual(GiftAffinity.Liked, mLiked);
            Assert.Greater(dLiked, 0f);

            var (mDisliked, dDisliked) = GiftAffinity.Compute(new[] { "bugs" }, liked, disliked);
            Assert.AreEqual(GiftAffinity.Disliked, mDisliked);
            Assert.Less(dDisliked, 0f);

            var (mNeutral, _) = GiftAffinity.Compute(new[] { "rock" }, liked, disliked);
            Assert.AreEqual(GiftAffinity.Neutral, mNeutral);
        }

        [Test]
        public void NeedsSystem_DecaysOverTime()
        {
            var c = new CharacterProgress { Affection = 50f, Mood = 80f };
            NeedsSystem.ApplyDecay(c, 3600); // 1 Stunde
            Assert.AreEqual(49f, c.Affection, 0.001f);     // -1/h
            Assert.AreEqual(76f, c.Mood, 0.001f);          // -4/h
        }
    }
}
