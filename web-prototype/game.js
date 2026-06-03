/* Heart & Match — Web-Prototyp (kein Build nötig).
   Bildet die Kernmechanik des Unity-Designs nach: Match-3, Ball-Sort, Sympathie/Tiers,
   Währung, Belohnungs-Freischaltung, Roster, Dialoge, Charakterwechsel nach 5 Story-Beats.
   Persistenz via localStorage. Inhalte = Platzhalter; nur fiktive, erwachsene Charaktere. */

// ---------- Stammdaten ----------
const GIFTS = [
  { tag: "romance", label: "🌹 Blumen", cost: 40 },
  { tag: "art",     label: "🎧 Musik",  cost: 60 },
  { tag: "tech",    label: "🎮 Gadget", cost: 50 },
];

const ROSTER = [
  { id: "luna", name: "Luna", emoji: "🌙", archetype: "Romantisch", liked: ["romance", "art"], disliked: ["tech"],
    lines: ["Oh… hallo. Kennen wir uns?", "Schön, dass du da bist.", "Mit dir wird's nie langweilig 💗",
            "Ich freu mich jedes Mal auf dich.", "Du bedeutest mir wirklich viel.", "Bei dir fühl ich mich zuhause ❤️"] },
  { id: "mia", name: "Mia", emoji: "🌸", archetype: "Verspielt", liked: ["art", "tech"], disliked: ["romance"],
    lines: ["Hey, Fremder!", "Na, Lust auf 'ne Runde Spaß?", "Du bist ganz schön cool 😎",
            "Okay, du gefällst mir echt.", "Wir zwei sind ein gutes Team!", "Du bist mein Lieblingsmensch 🌟"] },
  { id: "sora", name: "Sora", emoji: "⭐", archetype: "Mysteriös", liked: ["tech"], disliked: ["art"],
    lines: ["…", "Du bist hartnäckig, hm?", "Vielleicht mag ich das ja.",
            "Ich öffne mich nicht oft. Bei dir schon.", "Du verstehst mich.", "Niemand kam mir je so nah ✨"] },
  { id: "nova", name: "Nova", emoji: "🔥", archetype: "Sportlich", liked: ["romance", "tech"], disliked: [],
    lines: ["Bereit für 'ne Challenge?", "Nicht schlecht, weiter so!", "Du hältst mit mir mit 🔥",
            "Mit dir trainier ich gern.", "Du bringst mich zum Lachen.", "Mein Herz schlägt schneller bei dir 💥"] },
];

const TIER_GATES = [[1, 15, 0], [2, 35, 20], [3, 55, 40], [4, 70, 50], [5, 85, 65]];
const MAX_TIER = 5;
const SAVE_KEY = "heartmatch_save_v1";

// ---------- Zustand ----------
let state;
function freshState(tier) {
  const s = { coins: 200, gems: 50, energy: 5, active: 0, maxUnlocked: 0, storyBeats: 0, contentTier: tier || "sfw", sound: true, chars: {},
    passPoints: 0, passClaimed: [], passPremium: false, lastDaily: 0, streak: 0 };
  ROSTER.forEach(c => s.chars[c.id] = { affection: 0, trust: 0, mood: 50, tier: 0, unlocked: [], seen: [] });
  return s;
}

// Battle-Pass-Track (spiegelt backend /api/liveops/season): 10 Stufen, frei + Premium.
const PASS_TIERS = Array.from({ length: 10 }, (_, i) => ({
  tier: i, points: (i + 1) * 100,
  free: { type: "coins", qty: 100 + i * 20 },
  premium: i % 2 ? { type: "gems", qty: 10 + i * 5 } : { type: "coins", qty: 300 + i * 40 },
}));
function todayInt() { const d = new Date(); return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate(); }
const DAILY_REWARDS = [100, 150, 200, 300, 500, 750, 1000]; // nach Login-Streak
function cur() { return state.chars[ROSTER[state.active].id]; }
function curDef() { return ROSTER[state.active]; }

// ---------- Persistenz ----------
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) {} }
function load() {
  try { const raw = localStorage.getItem(SAVE_KEY); if (!raw) return false; state = JSON.parse(raw); return true; }
  catch (e) { return false; }
}

// ---------- Sound (WebAudio) ----------
let audio;
function beep(freq, dur = 0.08, type = "sine", vol = 0.15) {
  if (!state || !state.sound) return;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const o = audio.createOscillator(), g = audio.createGain();
    o.type = type; o.frequency.value = freq; o.connect(g); g.connect(audio.destination);
    g.gain.setValueAtTime(vol, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + dur);
    o.start(); o.stop(audio.currentTime + dur);
  } catch (e) {}
}

// ---------- Hilfen ----------
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
let toastTimer;
function toast(msg) {
  const t = $("toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 1800);
}
function computeTier(aff, trust) {
  let r = 0; for (const [tier, a, t] of TIER_GATES) if (tier <= MAX_TIER && aff >= a && trust >= t) r = tier; return r;
}

// ---------- Start / Gate ----------
function askAdult() {
  $("ageNote").innerHTML = "Bist du 18 Jahre oder älter? " +
    '<button class="primary" style="margin-top:8px" onclick="enterGame(\'adult\')">Ja, ich bin 18+</button>';
}
function enterGame(tier) {
  if (!state) state = freshState(tier);
  state.contentTier = tier;
  $("gate").style.display = "none";
  $("tierBadge").textContent = tier === "adult" ? "18+" : "SFW";
  $("setTier").textContent = tier === "adult" ? "18+ (Adult)" : "SFW";
  save(); showTab("hub");
}

// ---------- Tabs ----------
function showTab(tab) {
  if (typeof stopGame3D === "function") stopGame3D();
  ["hub", "modes", "m3", "bs", "roster", "gal", "pass", "set"].forEach(t => $("tab-" + t).classList.toggle("hidden", t !== tab));
  if (tab === "hub") refreshHub();
  if (tab === "modes") renderModes();
  if (tab === "m3") startMatch3();
  if (tab === "bs") startBallSort();
  if (tab === "roster") renderRoster();
  if (tab === "gal") renderGallery();
  if (tab === "pass") renderPass();
}

// ---------- Battle-Pass / Saison ----------
function renderPass() {
  const wrap = $("passTrack"); wrap.innerHTML = "";
  $("passPoints").textContent = state.passPoints || 0;
  $("passPremiumBtn").style.display = state.passPremium ? "none" : "inline-block";
  $("passPremiumTag").textContent = state.passPremium ? "Premium aktiv ⭐" : "";
  PASS_TIERS.forEach(t => {
    const reached = (state.passPoints || 0) >= t.points;
    const row = document.createElement("div");
    row.className = "setrow";
    row.innerHTML = `<span>Stufe ${t.tier + 1} · ${t.points} 🎟️</span>`;
    row.appendChild(passReward("free", t, reached));
    row.appendChild(passReward("premium", t, reached));
    wrap.appendChild(row);
  });
}
function passReward(track, t, reached) {
  const r = t[track]; const key = `${track}:${t.tier}`;
  const claimed = (state.passClaimed || []).includes(key);
  const b = document.createElement("button");
  const icon = r.type === "gems" ? "💎" : "🪙";
  b.textContent = `${track === "premium" ? "⭐" : ""}${r.qty} ${icon}`;
  if (claimed) { b.disabled = true; b.textContent += " ✓"; }
  else if (!reached || (track === "premium" && !state.passPremium)) { b.disabled = true; }
  else { b.className = "primary"; b.onclick = () => claimPass(track, t); }
  return b;
}
function claimPass(track, t) {
  const key = `${track}:${t.tier}`;
  if ((state.passClaimed || []).includes(key)) return;
  const r = t[track];
  if (r.type === "gems") state.gems += r.qty; else state.coins += r.qty;
  state.passClaimed = state.passClaimed || []; state.passClaimed.push(key);
  beep(880, .12); toast(`Belohnung: +${r.qty} ${r.type === "gems" ? "💎" : "🪙"}`); save(); refreshWallet(); renderPass();
}
function unlockPremium() {
  const cost = 50;
  if (state.gems < cost) { toast("Zu wenig 💎 (50 nötig)"); return; }
  state.gems -= cost; state.passPremium = true; beep(990, .15); toast("⭐ Premium-Pass freigeschaltet"); save(); refreshWallet(); renderPass();
}

// ---------- Tages-Belohnung / Login-Streak ----------
function claimDaily() {
  const today = todayInt();
  if (state.lastDaily === today) { toast("Heute schon abgeholt"); return; }
  state.streak = (state.lastDaily === today - 1) ? (state.streak || 0) + 1 : 1;
  state.lastDaily = today;
  const idx = Math.min(DAILY_REWARDS.length - 1, (state.streak - 1));
  const reward = DAILY_REWARDS[idx];
  state.coins += reward;
  if (state.streak % 7 === 0) state.gems += 20;
  beep(990, .18); toast(`🎁 Tag ${state.streak}: +${reward} 🪙` + (state.streak % 7 === 0 ? " +20 💎" : ""));
  save(); refreshHub();
}

// Modus-Auswahl-Hub (datengetrieben aus games3d.js — MODES). Klick startet den Modus.
function renderModes() {
  const grid = $("modeGrid"); grid.innerHTML = "";
  Object.values(window.M3MODES || {}).forEach(m => {
    let extra = "";
    if (m.id === "story") extra = `Level ${state.m3level || 1}`;
    else if (m.id === "endless") extra = `Best ${state.endlessBest || 0}`;
    else if (m.id === "daily") extra = (state.dailyDone === window.dateSeedVal() ? "heute ✓ · " : "") + `Best ${state.dailyBest || 0}`;
    const d = document.createElement("div");
    d.className = "rchar";
    d.innerHTML = `<div class="rface">${m.icon}</div><div><b>${m.name}</b></div><div class="muted">${m.desc}</div><div class="muted">${extra}</div>`;
    d.onclick = () => { beep(520, .08); window.startMode(m.id); };
    grid.appendChild(d);
  });
}

function refreshWallet() {
  $("coins").textContent = state.coins; $("gems").textContent = state.gems; $("energy").textContent = state.energy;
}

function refreshHub() {
  const c = cur(), info = curDef();
  $("portrait").textContent = info.emoji;
  $("charName").textContent = info.name + " · " + info.archetype;
  $("tier").textContent = c.tier;
  $("affBar").style.width = c.affection + "%"; $("affTxt").textContent = Math.round(c.affection);
  $("trustBar").style.width = c.trust + "%"; $("trustTxt").textContent = Math.round(c.trust);
  $("moodBar").style.width = c.mood + "%"; $("moodTxt").textContent = Math.round(c.mood);
  $("bubble").textContent = info.lines[Math.min(c.tier, info.lines.length - 1)];
  $("storyHint").textContent = `Story-Beats bis zur nächsten Person: ${5 - state.storyBeats}`;
  GIFTS.forEach((g, i) => {
    const pref = info.liked.includes(g.tag) ? " 💗" : info.disliked.includes(g.tag) ? " 💤" : "";
    $("gift" + i).textContent = `${g.label} (${g.cost})${pref}`;
  });
  const dailyReady = state.lastDaily !== todayInt();
  $("dailyBtn").style.display = dailyReady ? "inline-block" : "none";
  $("dailyInfo").textContent = dailyReady
    ? `🎁 Tagesgeschenk bereit! (Streak ${state.streak || 0})`
    : `✓ Heute abgeholt · Streak ${state.streak || 0}`;
  refreshWallet();
}

function giveGift(i) {
  const g = GIFTS[i], c = cur(), info = curDef();
  if (state.coins < g.cost) { toast("Zu wenig 🪙"); beep(160, .12, "square"); return; }
  state.coins -= g.cost;
  let affinity = 1.0, moodDelta = 2;
  if (info.liked.includes(g.tag)) { affinity = 1.8; moodDelta = 8; }
  else if (info.disliked.includes(g.tag)) { affinity = 0.5; moodDelta = -10; }
  const gain = 12 * (0.5 + c.mood / 100) * affinity;
  c.affection = clamp(c.affection + gain, 0, 100);
  c.trust = clamp(c.trust + gain * 0.3, 0, 100);
  c.mood = clamp(c.mood + moodDelta, 0, 100);
  beep(affinity >= 1.8 ? 660 : affinity <= .5 ? 220 : 440, .1);
  checkTierUp(c); toast(`${g.label}: +${gain.toFixed(0)} Sympathie`); save(); refreshHub();
}

function goOnDate() {
  if (state.energy < 1) { toast("Keine ⚡ Energie"); beep(160, .12, "square"); return; }
  state.energy -= 1;
  const c = cur();
  c.affection = clamp(c.affection + 4, 0, 100); c.trust = clamp(c.trust + 3, 0, 100);
  checkTierUp(c); state.storyBeats++;
  if (state.storyBeats >= 5) {
    state.storyBeats = 0;
    state.maxUnlocked = Math.min(ROSTER.length - 1, state.maxUnlocked + 1);
    state.active = state.maxUnlocked;
    beep(880, .15); toast("💞 Neue Person: " + curDef().name);
  } else { beep(560, .1); toast("Schönes Date! ❤️"); }
  save(); refreshHub();
}

function checkTierUp(c) {
  const nt = computeTier(c.affection, c.trust);
  if (nt > c.tier) {
    for (let t = c.tier + 1; t <= nt; t++) if (!c.unlocked.includes(t)) c.unlocked.push(t);
    c.tier = nt; beep(990, .18); toast("🎁 Tier " + nt + " — neue Belohnung!");
  }
}

// ---------- Roster ----------
function renderRoster() {
  const grid = $("rosterGrid"); grid.innerHTML = "";
  ROSTER.forEach((info, i) => {
    const unlocked = i <= state.maxUnlocked;
    const d = document.createElement("div");
    d.className = "rchar" + (i === state.active ? " active" : "") + (unlocked ? "" : " locked");
    d.innerHTML = `<div class="rface">${unlocked ? info.emoji : "🔒"}</div>
      <div><b>${unlocked ? info.name : "???"}</b></div>
      <div class="muted">${unlocked ? info.archetype : "gesperrt"}</div>
      <div class="muted">Tier ${state.chars[info.id].tier}</div>`;
    if (unlocked) d.onclick = () => { state.active = i; beep(520, .08); save(); showTab("hub"); };
    grid.appendChild(d);
  });
}

// ---------- Galerie ----------
function renderGallery() {
  $("galChar").textContent = curDef().name;
  const c = cur(), g = $("gallery"); g.innerHTML = "";
  for (let t = 1; t <= MAX_TIER; t++) {
    const d = document.createElement("div");
    if (c.unlocked.includes(t)) {
      d.className = "reward"; d.textContent = "Belohnung Tier " + t;
      if (!c.seen.includes(t)) { const b = document.createElement("span"); b.className = "new"; b.textContent = "NEU"; d.appendChild(b); }
    } else { d.className = "reward locked"; d.textContent = "🔒 Tier " + t; }
    g.appendChild(d);
  }
  c.unlocked.forEach(t => { if (!c.seen.includes(t)) c.seen.push(t); }); save();
}

// ---------- Settings ----------
function toggleSound() { state.sound = !state.sound; $("soundBtn").textContent = state.sound ? "🔊 An" : "🔇 Aus"; save(); }
function resetProgress() {
  if (!confirm("Fortschritt wirklich zurücksetzen?")) return;
  state = freshState(state.contentTier); save(); toast("Zurückgesetzt"); showTab("hub");
}

// ---------- Minispiel-Ergebnis (die 3D-Spiele in games3d.js rufen das auf) ----------
function minigameFinished(coins) {
  state.coins += coins;
  state.passPoints = (state.passPoints || 0) + 20;     // Pass-Punkte aus jedem Sieg
  const c = cur();
  c.mood = clamp(c.mood + 6, 0, 100);
  c.affection = clamp(c.affection + 2, 0, 100);          // Minispiel-Sieg vertieft auch die Beziehung
  checkTierUp(c);
  beep(990, .2); toast(`🎉 +${coins} 🪙  ·  +20 🎟️`); save(); refreshWallet();
  setTimeout(() => showTab("hub"), 1300);
}

// ---------- Energie-Regen ----------
setInterval(() => { if (state && state.energy < 5) { state.energy++; refreshWallet(); save(); } }, 15000);

// ---------- Boot ----------
if (load()) { enterGame(state.contentTier); } // gespeicherten Stand fortsetzen
// sonst bleibt das Start-/Age-Gate sichtbar
