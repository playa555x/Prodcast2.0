using System.Threading;
using System.Threading.Tasks;
using HeartMatch.Rewards;

namespace HeartMatch.Networking
{
    /// <summary>
    /// Abstraktion der Belohnungs-Generierung. Erlaubt es, den Reward-Provider ohne echte Netzwerk-
    /// abhängigkeit zu testen (Mock-Implementierung) und das echte Backend später einzustecken.
    /// </summary>
    public interface IGenerationClient
    {
        /// <summary>Stößt die Generierung an, wartet auf Fertigstellung und liefert den lokalen Dateipfad.</summary>
        Task<string> RequestRewardImage(RewardParams p, CancellationToken ct);
    }
}
