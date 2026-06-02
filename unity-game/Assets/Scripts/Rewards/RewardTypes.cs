using System.Threading;
using System.Threading.Tasks;

namespace HeartMatch.Rewards
{
    public enum RewardMediaKind { Image, Video }

    /// <summary>Parameter für die Erzeugung/Auswahl einer Belohnung.</summary>
    public sealed class RewardParams
    {
        public string CharacterId;
        public int Tier;
        public string PromptStyle = "2d semi-realistic portrait"; // Stil-Basis (Design-Entscheidung)
        public string Outfit;
        public string Pose;
        public int Seed;
    }

    /// <summary>Beschreibt eine ausgelieferte Belohnung (Metadaten; das Laden erfolgt Unity-seitig).</summary>
    public sealed class RewardAsset
    {
        public RewardMediaKind Kind = RewardMediaKind.Image;
        public string LocalPath;      // Dateipfad oder Resources-Pfad
        public bool IsPlaceholder;    // true bei Fallback/SFW-Platzhalter
        public bool Failed;           // true wenn Erzeugung scheiterte
        public string Error;
    }

    /// <summary>Strategie zur Beschaffung von Belohnungen (Local-Platzhalter oder ComfyUI-Generierung).</summary>
    public interface IRewardProvider
    {
        Task<RewardAsset> GetReward(RewardParams p, CancellationToken ct);
    }
}
