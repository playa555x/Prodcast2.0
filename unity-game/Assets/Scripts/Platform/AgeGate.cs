using HeartMatch.Core;
using UnityEngine;
using UnityEngine.Events;

namespace HeartMatch.Platform
{
    /// <summary>
    /// Erzwingt im Adult-Build (CONTENT_ADULT) eine einmalige Altersbestätigung vor dem Spiel.
    /// Im SFW-Build ist das Gate inaktiv. UI wird über die UnityEvents angebunden.
    /// </summary>
    public sealed class AgeGate : MonoBehaviour
    {
        [SerializeField] private GameObject _gatePanel;
        public UnityEvent OnConfirmed;
        public UnityEvent OnDeclined;

        private void Start()
        {
            var state = GameManager.Instance != null ? GameManager.Instance.State : null;
            bool needed = ContentTier.RequiresAgeGate && (state == null || !state.Settings.AgeConfirmed);

            if (_gatePanel != null) _gatePanel.SetActive(needed);
            if (!needed) OnConfirmed?.Invoke();
        }

        /// <summary>Vom „Ich bin 18+“-Button aufzurufen.</summary>
        public void Confirm()
        {
            var gm = GameManager.Instance;
            if (gm != null)
            {
                gm.State.Settings.AgeConfirmed = true;
                gm.SaveGame();
            }
            if (_gatePanel != null) _gatePanel.SetActive(false);
            OnConfirmed?.Invoke();
        }

        /// <summary>Vom „Verlassen“-Button aufzurufen.</summary>
        public void Decline()
        {
            OnDeclined?.Invoke();
            Application.Quit();
        }
    }
}
