using System;
using System.IO;
using Newtonsoft.Json;
using UnityEngine;

namespace HeartMatch.Core
{
    /// <summary>
    /// Lokale Persistenz des <see cref="GameState"/> als JSON unter Application.persistentDataPath.
    /// Enthält einen Versions-/Migrationspfad und ist defensiv gegen beschädigte Dateien.
    /// Cloud-Sync (Backend) ist optional und läuft über den BackendClient.
    /// </summary>
    public sealed class SaveSystem
    {
        private const string FileName = "savegame.json";
        private readonly string _path;
        private readonly JsonSerializerSettings _json = new()
        {
            NullValueHandling = NullValueHandling.Include,
            Formatting = Formatting.None,
        };

        public SaveSystem()
        {
            _path = Path.Combine(Application.persistentDataPath, FileName);
        }

        public bool HasSave => File.Exists(_path);

        public GameState LoadOrCreate(string playerId = "")
        {
            if (!HasSave) return new GameState { PlayerId = playerId };
            try
            {
                var text = File.ReadAllText(_path);
                var state = JsonConvert.DeserializeObject<GameState>(text, _json) ?? new GameState();
                return Migrate(state);
            }
            catch (Exception e)
            {
                Debug.LogError($"[SaveSystem] Save beschädigt, starte neu: {e.Message}");
                BackupCorrupted();
                return new GameState { PlayerId = playerId };
            }
        }

        public void Save(GameState state)
        {
            try
            {
                state.LastSyncUnix = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
                var text = JsonConvert.SerializeObject(state, _json);
                File.WriteAllText(_path, text);
            }
            catch (Exception e)
            {
                Debug.LogError($"[SaveSystem] Speichern fehlgeschlagen: {e.Message}");
            }
        }

        /// <summary>Hängt zukünftige Schema-Migrationen hier ein (version-by-version).</summary>
        private static GameState Migrate(GameState state)
        {
            // Beispielgerüst: while (state.Version < GameState.CurrentVersion) { ... ; state.Version++; }
            state.Version = GameState.CurrentVersion;
            return state;
        }

        private void BackupCorrupted()
        {
            try
            {
                if (File.Exists(_path))
                    File.Move(_path, _path + $".corrupt-{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}");
            }
            catch { /* best effort */ }
        }
    }
}
