using System;

namespace HeartMatch.Networking
{
    // (De)serialisiert via Newtonsoft. Felder spiegeln die Backend-Responses (siehe backend/app/api).

    [Serializable]
    public sealed class AuthRequestDto
    {
        public string device_id;
        public string username;
        public string content_tier = "sfw";
    }

    [Serializable]
    public sealed class PlayerDto
    {
        public string id;
        public string username;
        public string content_tier;
    }

    [Serializable]
    public sealed class TokenResponseDto
    {
        public string access_token;
        public string token_type;
        public PlayerDto player;
    }

    [Serializable]
    public sealed class GenerateRequestDto
    {
        public string character_id;
        public int tier;
        public string prompt;
        public string negative = "lowres, blurry, deformed";
        public int seed;
        public int width = 768;
        public int height = 1024;
        public int steps = 25;
        public float cfg = 6.5f;
    }

    [Serializable]
    public sealed class JobDto
    {
        public string id;
        public string status;       // queued | running | done | failed
        public string character_id;
        public int tier;
        public string error;
    }
}
