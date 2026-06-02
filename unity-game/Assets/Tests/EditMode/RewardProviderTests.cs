using System;
using System.Threading;
using System.Threading.Tasks;
using HeartMatch.Networking;
using HeartMatch.Rewards;
using NUnit.Framework;

namespace HeartMatch.Tests
{
    public class RewardProviderTests
    {
        private sealed class OkClient : IGenerationClient
        {
            public Task<string> RequestRewardImage(RewardParams p, CancellationToken ct)
                => Task.FromResult("/tmp/generated.png");
        }

        private sealed class FailingClient : IGenerationClient
        {
            public Task<string> RequestRewardImage(RewardParams p, CancellationToken ct)
                => throw new Exception("comfy down");
        }

        [Test]
        public async Task ReturnsGeneratedAsset_OnSuccess()
        {
            var provider = new ComfyUIRewardProvider(new OkClient());
            var asset = await provider.GetReward(new RewardParams { CharacterId = "luna", Tier = 2 }, CancellationToken.None);

            Assert.IsFalse(asset.IsPlaceholder);
            Assert.IsFalse(asset.Failed);
            Assert.AreEqual("/tmp/generated.png", asset.LocalPath);
        }

        [Test]
        public async Task FallsBackToLocal_OnFailure()
        {
            var provider = new ComfyUIRewardProvider(new FailingClient(), new LocalRewardProvider());
            var asset = await provider.GetReward(new RewardParams { CharacterId = "luna", Tier = 2 }, CancellationToken.None);

            Assert.IsTrue(asset.IsPlaceholder);
            Assert.IsTrue(asset.Failed);
            Assert.AreEqual("Rewards/luna/tier_2", asset.LocalPath);
            StringAssert.Contains("comfy down", asset.Error);
        }

        [Test]
        public async Task LocalProvider_BuildsResourcePath()
        {
            var provider = new LocalRewardProvider();
            var asset = await provider.GetReward(new RewardParams { CharacterId = "mia", Tier = 3 }, CancellationToken.None);
            Assert.AreEqual("Rewards/mia/tier_3", asset.LocalPath);
            Assert.IsTrue(asset.IsPlaceholder);
        }
    }
}
