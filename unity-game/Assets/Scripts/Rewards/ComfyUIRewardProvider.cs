using System;
using System.Threading;
using System.Threading.Tasks;
using HeartMatch.Networking;

namespace HeartMatch.Rewards
{
    /// <summary>
    /// Beschafft Belohnungen über das Backend (das wiederum eine externe ComfyUI-Instanz anspricht).
    /// Fällt bei Fehlern/Nichtverfügbarkeit auf den <see cref="LocalRewardProvider"/> zurück, damit das
    /// Spiel nie ohne Belohnung dasteht (vgl. Design A6/B5 — Eventualitäten).
    /// </summary>
    public sealed class ComfyUIRewardProvider : IRewardProvider
    {
        private readonly IGenerationClient _client;
        private readonly IRewardProvider _fallback;

        public ComfyUIRewardProvider(IGenerationClient client, IRewardProvider fallback = null)
        {
            _client = client;
            _fallback = fallback ?? new LocalRewardProvider();
        }

        public async Task<RewardAsset> GetReward(RewardParams p, CancellationToken ct)
        {
            try
            {
                var path = await _client.RequestRewardImage(p, ct);
                if (!string.IsNullOrEmpty(path))
                {
                    return new RewardAsset
                    {
                        Kind = RewardMediaKind.Image,
                        LocalPath = path,
                        IsPlaceholder = false,
                    };
                }
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch (Exception e)
            {
                // Generierung fehlgeschlagen -> Fallback + Fehlerinfo (Retry kann der Aufrufer anbieten).
                var fb = await _fallback.GetReward(p, ct);
                fb.Failed = true;
                fb.Error = e.Message;
                return fb;
            }

            return await _fallback.GetReward(p, ct);
        }
    }
}
