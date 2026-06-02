using System.Threading;
using System.Threading.Tasks;

namespace HeartMatch.Rewards
{
    /// <summary>
    /// Liefert gebündelte (SFW-)Platzhalter-Assets aus den Resources. Standardquelle in der Entwicklung
    /// und Fallback, wenn die ComfyUI-Generierung nicht verfügbar ist.
    /// Konvention: Resources/Rewards/{characterId}/tier_{n}
    /// </summary>
    public sealed class LocalRewardProvider : IRewardProvider
    {
        public Task<RewardAsset> GetReward(RewardParams p, CancellationToken ct)
        {
            var path = $"Rewards/{p.CharacterId}/tier_{p.Tier}";
            return Task.FromResult(new RewardAsset
            {
                Kind = RewardMediaKind.Image,
                LocalPath = path,
                IsPlaceholder = true,
            });
        }
    }
}
