using System;
using System.IO;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using HeartMatch.Rewards;
using Newtonsoft.Json;
using UnityEngine;
using UnityEngine.Networking;

namespace HeartMatch.Networking
{
    /// <summary>
    /// HTTP-Client zum Heart-&-Match-Backend (Auth, Cloud-Save, ComfyUI-Generierung).
    /// Implementiert <see cref="IGenerationClient"/> für den ComfyUI-Reward-Provider.
    /// </summary>
    public sealed class BackendClient : IGenerationClient
    {
        private readonly string _baseUrl;
        private string _token;

        public BackendClient(string baseUrl) => _baseUrl = baseUrl.TrimEnd('/');

        public bool IsAuthenticated => !string.IsNullOrEmpty(_token);

        public async Task<TokenResponseDto> RegisterAsync(string deviceId, string username, string contentTier)
        {
            var body = new AuthRequestDto { device_id = deviceId, username = username, content_tier = contentTier };
            var resp = await SendJson<TokenResponseDto>("POST", "/api/auth/register", body, auth: false);
            if (resp != null) _token = resp.access_token;
            return resp;
        }

        public Task PutSaveAsync(int version, object data) =>
            SendJson<object>("PUT", "/api/game/save", new { version, data }, auth: true);

        // --- IGenerationClient -------------------------------------------
        public async Task<string> RequestRewardImage(RewardParams p, CancellationToken ct)
        {
            var req = new GenerateRequestDto
            {
                character_id = p.CharacterId,
                tier = p.Tier,
                prompt = BuildPrompt(p),
                seed = p.Seed,
            };

            var job = await SendJson<JobDto>("POST", "/api/comfyui/generate", req, auth: true);
            if (job == null) throw new Exception("Keine Antwort vom Backend (generate)");

            job = await PollUntilDone(job.id, ct);
            if (job.status != "done")
                throw new Exception($"Generierung fehlgeschlagen: {job.error ?? job.status}");

            var bytes = await Download($"/api/comfyui/image/{job.id}", ct);
            var path = Path.Combine(Application.persistentDataPath, $"reward_{job.id}.png");
            File.WriteAllBytes(path, bytes);
            return path;
        }

        private async Task<JobDto> PollUntilDone(string jobId, CancellationToken ct)
        {
            for (int i = 0; i < 600; i++) // ~ max. 600 * 1s
            {
                ct.ThrowIfCancellationRequested();
                var job = await SendJson<JobDto>("GET", $"/api/comfyui/jobs/{jobId}", null, auth: true);
                if (job != null && (job.status == "done" || job.status == "failed"))
                    return job;
                await Task.Delay(1000, ct);
            }
            throw new TimeoutException("Timeout beim Warten auf das Generierungs-Ergebnis");
        }

        private static string BuildPrompt(RewardParams p)
        {
            // Generische, stilbasierte Prompt-Bausteine. KEINE expliziten Inhalte (siehe CONTENT_POLICY).
            var sb = new StringBuilder();
            sb.Append(p.PromptStyle);
            if (!string.IsNullOrEmpty(p.Outfit)) sb.Append(", ").Append(p.Outfit);
            if (!string.IsNullOrEmpty(p.Pose)) sb.Append(", ").Append(p.Pose);
            sb.Append(", character ").Append(p.CharacterId).Append(", tier ").Append(p.Tier);
            return sb.ToString();
        }

        // --- HTTP-Helfer --------------------------------------------------
        private async Task<T> SendJson<T>(string method, string path, object body, bool auth) where T : class
        {
            using var req = new UnityWebRequest(_baseUrl + path, method)
            {
                downloadHandler = new DownloadHandlerBuffer(),
            };
            if (body != null)
            {
                var json = JsonConvert.SerializeObject(body);
                req.uploadHandler = new UploadHandlerRaw(Encoding.UTF8.GetBytes(json));
                req.SetRequestHeader("Content-Type", "application/json");
            }
            if (auth && IsAuthenticated)
                req.SetRequestHeader("Authorization", "Bearer " + _token);

            await req.SendWebRequest();

            if (req.result != UnityWebRequest.Result.Success)
            {
                Debug.LogError($"[BackendClient] {method} {path} -> {req.responseCode} {req.error}");
                return null;
            }
            var text = req.downloadHandler.text;
            return string.IsNullOrEmpty(text) ? null : JsonConvert.DeserializeObject<T>(text);
        }

        private async Task<byte[]> Download(string path, CancellationToken ct)
        {
            using var req = UnityWebRequest.Get(_baseUrl + path);
            if (IsAuthenticated) req.SetRequestHeader("Authorization", "Bearer " + _token);
            await req.SendWebRequest();
            ct.ThrowIfCancellationRequested();
            if (req.result != UnityWebRequest.Result.Success)
                throw new Exception($"Download fehlgeschlagen: {req.responseCode} {req.error}");
            return req.downloadHandler.data;
        }
    }
}
