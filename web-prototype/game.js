/* Heart & Match — Web-Prototyp (kein Build nötig).
   Bildet die Kernmechanik des Unity-Designs nach: Match-3, Ball-Sort, Sympathie/Tiers,
   Währung, Belohnungs-Freischaltung, Charakterwechsel nach 5 Story-Beats.
   Inhalte sind Platzhalter; nur fiktive, erwachsene Charaktere. */

// ---------- Daten ----------
const ROSTER = [
  { id: "luna", name: "Luna", emoji: "🌙" },
  { id: "mia",  name: "Mia",  emoji: "🌸" },
  { id: "sora", name: "Sora", emoji: "⭐" },
  { id: "nova", name: "Nova", emoji: "🔥" },
];
const LIKED = ["flowers", "music"];
const DISLIKED = ["bugs"];
const TIER_GATES = [ // [tier, affection, trust]
  [1, 15, 0], [2, 35, 20], [3, 55, 40], [4, 70, 50], [5, 85, 65],
];
const MAX_TIER = 5; // SFW-Prototyp

const state = {
  coins: 200, gems: 50, energy: 5,
  active: 0, storyBeats: 0,
  chars: {},
};
ROSTER.forEach(c => state.chars[c.id] = { affection: 0, trust: 0, mood: 50, tier: 0, unlocked: [] });

function cur() { return state.chars[ROSTER[state.active].id]; }

// ---------- Hilfen ----------
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
let toastTimer;
function toast(msg) {
  const t = $("toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 1800);
}
function computeTier(aff, trust) {
  let r = 0;
  for (const [tier, a, t] of TIER_GATES) if (tier <= MAX_TIER && aff >= a && trust >= t) r = tier;
  return r;
}

// ---------- Hub / Beziehung ----------
function showTab(tab) {
  ["hub", "m3", "bs", "gal"].forEach(t => $("tab-" + t).classList.toggle("hidden", t !== tab));
  if (tab === "hub") refreshHub();
  if (tab === "m3") startMatch3();
  if (tab === "bs") startBallSort();
  if (tab === "gal") renderGallery();
}

function refreshWallet() {
  $("coins").textContent = state.coins;
  $("gems").textContent = state.gems;
  $("energy").textContent = state.energy;
}

function refreshHub() {
  const c = cur(), info = ROSTER[state.active];
  $("portrait").textContent = info.emoji;
  $("charName").textContent = info.name;
  $("tier").textContent = c.tier;
  $("affBar").style.width = c.affection + "%"; $("affTxt").textContent = Math.round(c.affection);
  $("trustBar").style.width = c.trust + "%"; $("trustTxt").textContent = Math.round(c.trust);
  $("moodBar").style.width = c.mood + "%"; $("moodTxt").textContent = Math.round(c.mood);
  $("storyHint").textContent = `Story-Beats bis zur nächsten Person: ${5 - state.storyBeats}`;
  refreshWallet();
}

function giveGift(tag, label, cost) {
  if (state.coins < cost) { toast("Zu wenig 🪙"); return; }
  state.coins -= cost;
  const c = cur();
  let affinity = 1.0, moodDelta = 2;
  if (LIKED.includes(tag)) { affinity = 1.8; moodDelta = 8; }
  else if (DISLIKED.includes(tag)) { affinity = 0.5; moodDelta = -10; }

  const base = 12;
  const gain = base * (0.5 + c.mood / 100) * affinity;
  c.affection = clamp(c.affection + gain, 0, 100);
  c.trust = clamp(c.trust + gain * 0.3, 0, 100);
  c.mood = clamp(c.mood + moodDelta, 0, 100);

  checkTierUp(c);
  toast(`${label}: +${gain.toFixed(0)} Sympathie`);
  refreshHub();
}

function goOnDate() {
  if (state.energy < 1) { toast("Keine ⚡ Energie"); return; }
  state.energy -= 1;
  const c = cur();
  c.affection = clamp(c.affection + 4, 0, 100);
  c.trust = clamp(c.trust + 3, 0, 100);
  checkTierUp(c);
  state.storyBeats++;
  if (state.storyBeats >= 5) {
    state.storyBeats = 0;
    state.active = (state.active + 1) % ROSTER.length;
    toast("💞 Neue Person freigeschaltet: " + ROSTER[state.active].name);
  } else {
    toast("Schönes Date! ❤️");
  }
  refreshHub();
}

function checkTierUp(c) {
  const newTier = computeTier(c.affection, c.trust);
  if (newTier > c.tier) {
    for (let t = c.tier + 1; t <= newTier; t++) if (!c.unlocked.includes(t)) c.unlocked.push(t);
    c.tier = newTier;
    toast("🎁 Tier " + newTier + " — neue Belohnung freigeschaltet!");
  }
}

// ---------- Galerie ----------
function renderGallery() {
  $("galChar").textContent = ROSTER[state.active].name;
  const c = cur(), g = $("gallery"); g.innerHTML = "";
  for (let t = 1; t <= MAX_TIER; t++) {
    const d = document.createElement("div");
    if (c.unlocked.includes(t)) { d.className = "reward"; d.textContent = "Belohnung Tier " + t; }
    else { d.className = "reward locked"; d.textContent = "🔒 Tier " + t; }
    g.appendChild(d);
  }
}

// ---------- Match-3 ----------
const M3 = { W: 8, H: 8, C: 6, grid: [], sel: null, score: 0, moves: 20, target: 800, busy: false };
const GEM_COLORS = ["#ff5d6c", "#ffa94d", "#ffe066", "#69db7c", "#4dabf7", "#b197fc"];

function startMatch3() {
  M3.score = 0; M3.moves = 20; M3.sel = null; M3.busy = false;
  M3.grid = [];
  for (let y = 0; y < M3.H; y++) {
    M3.grid[y] = [];
    for (let x = 0; x < M3.W; x++) {
      let col;
      do { col = (Math.random() * M3.C) | 0; }
      while ((x >= 2 && M3.grid[y][x-1].c === col && M3.grid[y][x-2].c === col) ||
             (y >= 2 && M3.grid[y-1][x].c === col && M3.grid[y-2][x].c === col));
      M3.grid[y][x] = { c: col, s: null };
    }
  }
  renderM3();
  updateM3Hud();
}

function updateM3Hud() {
  $("m3score").textContent = M3.score; $("m3moves").textContent = M3.moves; $("m3target").textContent = M3.target;
}

function renderM3() {
  const g = $("m3grid");
  g.style.gridTemplateColumns = `repeat(${M3.W}, 1fr)`;
  g.style.maxWidth = "420px";
  g.innerHTML = "";
  for (let y = 0; y < M3.H; y++) for (let x = 0; x < M3.W; x++) {
    const cell = M3.grid[y][x];
    const d = document.createElement("div");
    d.className = "gem" + (cell.s ? " special" : "");
    d.style.background = cell.c >= 0 ? GEM_COLORS[cell.c] : "transparent";
    d.textContent = cell.s === "color" ? "💥" : cell.s === "bomb" ? "💣" : (cell.s ? "🚀" : "");
    if (M3.sel && M3.sel.x === x && M3.sel.y === y) d.classList.add("sel");
    d.onclick = () => clickGem(x, y);
    g.appendChild(d);
  }
}

function clickGem(x, y) {
  if (M3.busy || M3.moves <= 0) return;
  if (!M3.sel) { M3.sel = { x, y }; renderM3(); return; }
  const a = M3.sel, b = { x, y };
  M3.sel = null;
  if (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) !== 1) { renderM3(); return; }
  swap(a, b);
  if (resolve(a, b)) { M3.moves--; }
  else { swap(a, b); } // zurück, kein Match
  renderM3(); updateM3Hud();
  if (M3.score >= M3.target) endM3(true);
  else if (M3.moves <= 0) endM3(false);
}

function swap(a, b) { const t = M3.grid[a.y][a.x]; M3.grid[a.y][a.x] = M3.grid[b.y][b.x]; M3.grid[b.y][b.x] = t; }

function findRuns() {
  const runs = [];
  for (let y = 0; y < M3.H; y++) { let x = 0; while (x < M3.W) {
    const col = M3.grid[y][x].c; if (col < 0) { x++; continue; }
    let s = x; while (x < M3.W && M3.grid[y][x].c === col) x++;
    if (x - s >= 3) { const r = { cells: [], h: true, color: col }; for (let i = s; i < x; i++) r.cells.push({ x: i, y }); runs.push(r); }
  }}
  for (let x = 0; x < M3.W; x++) { let y = 0; while (y < M3.H) {
    const col = M3.grid[y][x].c; if (col < 0) { y++; continue; }
    let s = y; while (y < M3.H && M3.grid[y][x].c === col) y++;
    if (y - s >= 3) { const r = { cells: [], h: false, color: col }; for (let i = s; i < y; i++) r.cells.push({ x, y: i }); runs.push(r); }
  }}
  return runs;
}

function effectCells(x, y, s) {
  const out = [];
  if (s === "rocketH") for (let i = 0; i < M3.W; i++) out.push({ x: i, y });
  else if (s === "rocketV") for (let i = 0; i < M3.H; i++) out.push({ x, y: i });
  else if (s === "bomb") for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
    const nx = x + dx, ny = y + dy; if (nx >= 0 && nx < M3.W && ny >= 0 && ny < M3.H) out.push({ x: nx, y: ny });
  } else if (s === "color") {
    const target = M3.grid[y][x]._t ?? mostColor();
    for (let yy = 0; yy < M3.H; yy++) for (let xx = 0; xx < M3.W; xx++) if (M3.grid[yy][xx].c === target) out.push({ x: xx, y: yy });
  }
  return out;
}
function mostColor() { const cnt = Array(M3.C).fill(0); for (let y=0;y<M3.H;y++) for (let x=0;x<M3.W;x++) if(M3.grid[y][x].c>=0) cnt[M3.grid[y][x].c]++; let m=0,mi=0; cnt.forEach((v,i)=>{if(v>m){m=v;mi=i;}}); return mi; }

function resolve(a, b) {
  let runs = findRuns();
  if (runs.length === 0) return false;
  let combo = 0;
  while (runs.length > 0) {
    combo++;
    // Spezialstein-Spawns
    const spawns = [];
    for (const r of runs) {
      if (r.cells.length >= 5) spawns.push({ p: pickSpawn(r, b), s: "color", color: r.color });
      else if (r.cells.length === 4) spawns.push({ p: pickSpawn(r, b), s: r.h ? "rocketH" : "rocketV", color: r.color });
    }
    const spawnKey = new Set(spawns.map(s => s.p.x + "," + s.p.y));
    // Zu räumende Zellen (inkl. Spezial-Kettenreaktion)
    const cleared = new Set(); const queue = [];
    for (const r of runs) for (const p of r.cells) { const k = p.x + "," + p.y; if (!cleared.has(k)) { cleared.add(k); if (M3.grid[p.y][p.x].s) queue.push(p); } }
    while (queue.length) { const p = queue.shift(); for (const e of effectCells(p.x, p.y, M3.grid[p.y][p.x].s)) { const k = e.x + "," + e.y; if (!cleared.has(k)) { cleared.add(k); if (M3.grid[e.y][e.x].s) queue.push(e); } } }
    // Räumen (Spawns bleiben)
    let n = 0;
    cleared.forEach(k => { const [x, y] = k.split(",").map(Number); if (spawnKey.has(k)) return; if (M3.grid[y][x].c < 0 && !M3.grid[y][x].s) return; M3.grid[y][x] = { c: -1, s: null }; n++; });
    spawns.forEach(s => { M3.grid[s.p.y][s.p.x] = { c: s.color, s: s.s, _t: s.color }; });
    M3.score += Math.round(n * 10 * (1 + 0.2 * (combo - 1)));
    gravity();
    runs = findRuns();
  }
  return true;
}
function pickSpawn(run, b) { for (const p of run.cells) if (p.x === b.x && p.y === b.y) return p; return run.cells[(run.cells.length / 2) | 0]; }

function gravity() {
  for (let x = 0; x < M3.W; x++) {
    const stack = [];
    for (let y = M3.H - 1; y >= 0; y--) if (M3.grid[y][x].c >= 0 || M3.grid[y][x].s) stack.push(M3.grid[y][x]);
    let y = M3.H - 1;
    for (const cell of stack) { M3.grid[y][x] = cell; y--; }
    for (; y >= 0; y--) M3.grid[y][x] = { c: (Math.random() * M3.C) | 0, s: null };
  }
}

function endM3(won) {
  M3.busy = true;
  if (won) {
    const reward = Math.floor(M3.score / 8);
    state.coins += reward;
    const c = cur(); c.mood = clamp(c.mood + 6, 0, 100);
    toast(`🎉 Gewonnen! +${reward} 🪙`);
  } else { toast("Keine Züge mehr — probier's nochmal."); }
  refreshWallet();
  setTimeout(() => { if (won) showTab("hub"); }, 1400);
}

// ---------- Ball-Sort ----------
const BS = { tubes: [], cap: 4, colors: 4, sel: null, moves: 0, history: [] };
const BS_COLORS = ["#ff6b6b", "#4dabf7", "#69db7c", "#ffd43b", "#b197fc", "#ff922b"];

function startBallSort() {
  BS.cap = 4; BS.colors = 4; BS.sel = null; BS.moves = 0; BS.history = [];
  BS.tubes = [];
  for (let c = 0; c < BS.colors; c++) { const t = []; for (let k = 0; k < BS.cap; k++) t.push(c); BS.tubes.push(t); }
  BS.tubes.push([]); BS.tubes.push([]); // 2 leere
  // Mischen mit legalen Einzelzügen (=> lösbar)
  for (let i = 0; i < 80; i++) {
    const from = (Math.random() * BS.tubes.length) | 0, to = (Math.random() * BS.tubes.length) | 0;
    if (canMove(from, to)) { BS.tubes[to].push(BS.tubes[from].pop()); }
  }
  $("bsstatus").textContent = "Sortiere alle Farben.";
  renderBS(); $("bsmoves").textContent = 0;
}

function canMove(from, to) {
  if (from === to) return false;
  const s = BS.tubes[from], d = BS.tubes[to];
  if (s.length === 0 || d.length >= BS.cap) return false;
  return d.length === 0 || d[d.length - 1] === s[s.length - 1];
}

function renderBS() {
  const wrap = $("tubes"); wrap.innerHTML = "";
  BS.tubes.forEach((t, i) => {
    const el = document.createElement("div");
    el.className = "tube" + (BS.sel === i ? " sel" : "");
    el.style.height = (BS.cap * 38 + 12) + "px";
    el.onclick = () => clickTube(i);
    t.forEach(c => { const b = document.createElement("div"); b.className = "ball"; b.style.background = BS_COLORS[c]; el.appendChild(b); });
    wrap.appendChild(el);
  });
}

function clickTube(i) {
  if (BS.sel === null) { if (BS.tubes[i].length) { BS.sel = i; renderBS(); } return; }
  const from = BS.sel, to = i; BS.sel = null;
  if (canMove(from, to)) {
    const color = BS.tubes[from][BS.tubes[from].length - 1];
    let moved = 0;
    while (canMove(from, to) && BS.tubes[from][BS.tubes[from].length - 1] === color) { BS.tubes[to].push(BS.tubes[from].pop()); moved++; }
    BS.history.push({ from, to, moved }); BS.moves++; $("bsmoves").textContent = BS.moves;
  }
  renderBS();
  if (isSolved()) endBS();
}

function bsUndo() {
  if (!BS.history.length) return;
  const { from, to, moved } = BS.history.pop();
  for (let k = 0; k < moved; k++) BS.tubes[from].push(BS.tubes[to].pop());
  BS.moves++; $("bsmoves").textContent = BS.moves; renderBS();
}

function isSolved() {
  return BS.tubes.every(t => t.length === 0 || (t.length === BS.cap && t.every(c => c === t[0])));
}

function endBS() {
  const reward = Math.max(40, 120 - BS.moves * 3);
  state.coins += reward;
  const c = cur(); c.mood = clamp(c.mood + 6, 0, 100);
  $("bsstatus").textContent = "Gelöst! 🎉";
  toast(`🎉 Sortiert in ${BS.moves} Zügen! +${reward} 🪙`);
  refreshWallet();
  setTimeout(() => showTab("hub"), 1400);
}

// ---------- Energie-Regen (Demo) ----------
setInterval(() => { if (state.energy < 5) { state.energy++; refreshWallet(); } }, 15000);

// ---------- Start ----------
refreshHub();
