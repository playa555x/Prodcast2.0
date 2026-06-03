/* Heart & Match — 3D-Minispiele mit Three.js (r128, lokal in vendor/).
   Match-3 mit 3D-Früchten, Ball-Sort mit Glas-Reagenzgläsern & 3D-Kugeln.
   Greift auf Globals aus game.js zu: state, cur, clamp, toast, beep, showTab, minigameFinished. */
(function () {
const T = THREE;
const wait = ms => new Promise(r => setTimeout(r, ms));

// gemeinsamer Animations-Loop (immer nur ein Spiel aktiv)
let rafId = null, ticks = [];
function loop() { rafId = requestAnimationFrame(loop); for (const fn of ticks) fn(); }
function startLoop() { if (!rafId) loop(); }
window.stopGame3D = function () {
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  ticks = [];
  if (M3.renderer) { M3.renderer.dispose(); M3.renderer = null; }
  if (BS.renderer) { BS.renderer.dispose(); BS.renderer = null; }
};

function makeRenderer(mount, w, h) {
  const r = new T.WebGLRenderer({ antialias: true, alpha: true });
  r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  r.setSize(w, h);
  r.shadowMap.enabled = true; r.shadowMap.type = T.PCFSoftShadowMap;
  r.outputEncoding = T.sRGBEncoding;
  mount.innerHTML = ""; mount.appendChild(r.domElement);
  return r;
}
function addLights(scene) {
  scene.add(new T.AmbientLight(0xffffff, 0.55));
  const key = new T.DirectionalLight(0xffffff, 1.15);
  key.position.set(4, 7, 8); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024); key.shadow.camera.near = 1; key.shadow.camera.far = 40;
  key.shadow.camera.left = -10; key.shadow.camera.right = 10; key.shadow.camera.top = 10; key.shadow.camera.bottom = -10;
  scene.add(key);
  const fill = new T.DirectionalLight(0xff9ad1, 0.35); fill.position.set(-6, 2, 4); scene.add(fill);
  const rim = new T.PointLight(0x8a5cff, 0.6, 50); rim.position.set(0, -4, 6); scene.add(rim);
}
const lerp = (a, b, t) => a + (b - a) * t;

// =====================================================================
//  MATCH-3 (3D-Früchte)
// =====================================================================
const M3 = {
  W: 8, H: 8, C: 6, cs: 1.18, grid: [], sel: null, score: 0, moves: 20, target: 800,
  busy: false, scene: null, cam: null, renderer: null, raycaster: null, mount: null,
  particles: [], shake: 0, camBase: new THREE.Vector3(0, -0.8, 12.2), iceLeft: 0,
};
// Echte Frucht-Designs als Emoji-Textur (klar erkennbar, offline, voll farbig).
const FRUIT = [
  { name: "apfel",        emoji: "🍎", color: 0xff4356 },
  { name: "orange",       emoji: "🍊", color: 0xff9f1a },
  { name: "zitrone",      emoji: "🍋", color: 0xffe04d },
  { name: "wassermelone", emoji: "🍉", color: 0x7bd64b },
  { name: "heidelbeere",  emoji: "🫐", color: 0x5a78ff },
  { name: "traube",       emoji: "🍇", color: 0xb15cff },
];

const _texCache = {};
function emojiTexture(emoji) {
  if (_texCache[emoji]) return _texCache[emoji];
  const s = 256, cv = document.createElement("canvas"); cv.width = cv.height = s;
  const ctx = cv.getContext("2d");
  ctx.font = `${Math.floor(s * 0.76)}px "Apple Color Emoji","Noto Color Emoji","Segoe UI Emoji",sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.38)"; ctx.shadowBlur = 16; ctx.shadowOffsetY = 8;
  ctx.fillText(emoji, s / 2, s / 2 + 8);
  const tex = new T.CanvasTexture(cv); tex.encoding = T.sRGBEncoding; tex.needsUpdate = true;
  _texCache[emoji] = tex; return tex;
}

function worldPos(x, y) {
  return new T.Vector3((x - (M3.W - 1) / 2) * M3.cs, ((M3.H - 1) / 2 - y) * M3.cs, 0);
}

function makeFruit(type) {
  const f = FRUIT[type], g = new T.Group();
  const spr = new T.Sprite(new T.SpriteMaterial({ map: emojiTexture(f.emoji), transparent: true }));
  spr.scale.set(1.12, 1.12, 1.12); g.add(spr);
  g.userData = { type, body: spr, mat: spr.material, ts: 1, baseScale: 1, spin: 0, frozen: false };
  g.scale.setScalar(0.01); // poppt rein
  return g;
}

function makeSpecial(type, kind) {
  const g = makeFruit(type);
  g.userData.kind = kind;
  const ring = new T.Mesh(new T.TorusGeometry(0.6, 0.06, 8, 24),
    new T.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.9 }));
  g.add(ring); g.userData.ring = ring;
  const badge = new T.Sprite(new T.SpriteMaterial({ map: emojiTexture(kind === "color" ? "💥" : "🚀"), transparent: true }));
  badge.scale.set(0.62, 0.62, 0.62); badge.position.set(0.28, 0.32, 0.2); g.add(badge);
  g.userData.baseScale = 1.12;
  return g;
}

function startMatch3() {
  const lvl = (state && state.m3level) || 1;
  M3.score = 0; M3.moves = 18 + Math.min(8, lvl); M3.target = 700 + lvl * 120; M3.sel = null; M3.busy = false;
  const mount = $("m3mount"); M3.mount = mount;
  const size = Math.min(440, (mount.clientWidth || 380));
  M3.scene = new T.Scene();
  M3.cam = new T.PerspectiveCamera(46, 1, 0.1, 100);
  M3.cam.position.set(0, -0.8, 12.2); M3.cam.lookAt(0, 0.25, 0);
  addLights(M3.scene);
  const back = new T.Mesh(new T.PlaneGeometry(40, 40),
    new T.MeshStandardMaterial({ color: 0x241a36, roughness: 1 }));
  back.position.z = -1.4; back.receiveShadow = true; M3.scene.add(back);
  M3.raycaster = new T.Raycaster();
  M3.renderer = makeRenderer(mount, size, size);
  M3.cam.aspect = 1; M3.cam.updateProjectionMatrix();

  // Board ohne Start-Matches
  M3.grid = [];
  for (let y = 0; y < M3.H; y++) { M3.grid[y] = [];
    for (let x = 0; x < M3.W; x++) {
      let c; do { c = (Math.random() * M3.C) | 0; }
      while ((x >= 2 && M3.grid[y][x-1].c === c && M3.grid[y][x-2].c === c) ||
             (y >= 2 && M3.grid[y-1][x].c === c && M3.grid[y-2][x].c === c));
      M3.grid[y][x] = newCell(c, x, y, true);
    } }

  // Hindernis: Eis-Blocker säen. Stufe + Menge wachsen mit dem Level.
  M3.particles = []; M3.shake = 0; M3.iceLeft = 0;
  const style = iceStyleForLevel(lvl);
  M3.iceStyle = style;
  const iceCount = Math.min(16, 3 + lvl * 2);
  const spots = new Set();
  for (let i = 0; i < iceCount; i++) {
    const x = (Math.random() * M3.W) | 0, y = (Math.random() * M3.H) | 0, k = x + "," + y;
    if (spots.has(k)) continue; spots.add(k);
    const layers = 1 + ((Math.random() * style.maxLayers) | 0); // 1..maxLayers
    setIce(M3.grid[y][x], layers, style); M3.iceLeft++;
  }

  M3.renderer.domElement.style.cursor = "pointer";
  M3.renderer.domElement.onpointerdown = onM3Pointer;
  ticks.push(tickM3); startLoop();
  updateM3Hud();
}

function newCell(type, x, y, dropFromTop, ice) {
  const mesh = makeFruit(type);
  const p = worldPos(x, y);
  mesh.position.set(p.x, dropFromTop ? p.y + 6 : p.y, 0);
  mesh.userData.tx = p.x; mesh.userData.ty = p.y;
  M3.scene.add(mesh);
  const cell = { c: type, s: null, mesh, ice: 0 };
  if (ice) setIce(cell, ice);
  return cell;
}

// Eis-Stufen: ändern sich mit dem Level (Aussehen + max. Schichten/Zähigkeit).
function iceStyleForLevel(lvl) {
  if (lvl <= 2) return { key: "raureif",    label: "Raureif",       color: 0xdff1ff, emissive: 0x000000, detail: 0, scale: 0.70, maxLayers: 1, op: 0.28 };
  if (lvl <= 4) return { key: "eis",        label: "Eis",           color: 0x9ad4ff, emissive: 0x113355, detail: 0, scale: 0.74, maxLayers: 2, op: 0.40 };
  if (lvl <= 6) return { key: "frost",      label: "Frost-Kristall",color: 0xeaf6ff, emissive: 0x2277bb, detail: 1, scale: 0.78, maxLayers: 3, op: 0.44 };
  return            { key: "permafrost", label: "Permafrost",    color: 0x6fa8ff, emissive: 0x1144aa, detail: 1, scale: 0.82, maxLayers: 4, op: 0.52 };
}

// Eis-Blocker: durchscheinende Hülle um die Frucht; taut Schicht für Schicht durch benachbarte Matches.
function setIce(cell, layers, style) {
  cell.ice = layers;
  if (style) cell.iceStyle = style;
  const st = cell.iceStyle || iceStyleForLevel(1);
  const g = cell.mesh;
  if (g.userData.iceMesh) { g.remove(g.userData.iceMesh); g.userData.iceMesh.geometry.dispose(); g.userData.iceMesh = null; }
  if (layers > 0) {
    const shell = new T.Mesh(
      new T.IcosahedronGeometry(st.scale, st.detail),
      new T.MeshPhysicalMaterial({ color: st.color, emissive: st.emissive, emissiveIntensity: 0.35,
        transparent: true, opacity: Math.min(0.85, st.op + (layers - 1) * 0.12),
        roughness: 0.12, metalness: 0, clearcoat: 1, flatShading: true })
    );
    g.add(shell); g.userData.iceMesh = shell; g.userData.frozen = true;
  } else { g.userData.frozen = false; }
}

function tickM3() {
  if (!M3.renderer) return;
  M3.scene.traverse(o => {
    if (o.isGroup && o.userData && o.userData.body) {
      const u = o.userData;
      o.scale.x = lerp(o.scale.x, u.baseScale * u.ts, 0.25);
      o.scale.y = o.scale.x; o.scale.z = o.scale.x;
      if (u.tx !== undefined) { o.position.x = lerp(o.position.x, u.tx, 0.28); o.position.y = lerp(o.position.y, u.ty, 0.28); }
      if (!u.frozen) o.rotation.y += u.spin;
      if (u.ring) u.ring.rotation.x += 0.05;
    }
  });
  // Partikel (Burst beim Auflösen)
  for (let i = M3.particles.length - 1; i >= 0; i--) {
    const p = M3.particles[i]; p.life -= 0.016;
    if (p.life <= 0) { M3.scene.remove(p.mesh); M3.particles.splice(i, 1); continue; }
    p.vy -= 0.018; p.mesh.position.x += p.vx; p.mesh.position.y += p.vy; p.mesh.position.z += p.vz;
    const s = Math.max(0.01, p.life * 2.2); p.mesh.scale.setScalar(s);
  }
  // Screenshake (skaliert mit Combo/Spezial) — klingt schnell ab
  if (M3.shake > 0.001) {
    M3.cam.position.set(M3.camBase.x + (Math.random() - 0.5) * M3.shake,
                        M3.camBase.y + (Math.random() - 0.5) * M3.shake, M3.camBase.z);
    M3.shake *= 0.86;
  } else { M3.cam.position.copy(M3.camBase); }
  M3.renderer.render(M3.scene, M3.cam);
}

function burst(x, y, colorHex, n) {
  for (let i = 0; i < (n || 5); i++) {
    const m = new T.Mesh(new T.SphereGeometry(0.13, 8, 6),
      new T.MeshBasicMaterial({ color: colorHex }));
    const p = worldPos(x, y); m.position.set(p.x, p.y, 0.3);
    M3.scene.add(m);
    M3.particles.push({ mesh: m, vx: (Math.random() - 0.5) * 0.32, vy: Math.random() * 0.3 + 0.05,
      vz: Math.random() * 0.2, life: 0.5 + Math.random() * 0.3 });
  }
}

function onM3Pointer(e) {
  if (M3.busy || M3.moves <= 0) return;
  const rect = M3.renderer.domElement.getBoundingClientRect();
  const ndc = new T.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
  M3.raycaster.setFromCamera(ndc, M3.cam);
  const hits = M3.raycaster.intersectObjects(M3.scene.children, true);
  let grp = null;
  for (const h of hits) { let o = h.object; while (o && !o.userData?.body) o = o.parent; if (o) { grp = o; break; } }
  if (!grp) return;
  const pos = findCell(grp); if (!pos) return;
  if (M3.grid[pos.y][pos.x].ice > 0) { beep(180, .1, "square"); toast("🧊 Erst das Eis schmelzen — Match direkt daneben!"); return; }
  if (!M3.sel) { M3.sel = pos; highlight(grp, true); beep(420, .05); return; }
  const a = M3.sel, b = pos; const aMesh = M3.grid[a.y][a.x].mesh; highlight(aMesh, false); M3.sel = null;
  if (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) !== 1) { if (a.x !== b.x || a.y !== b.y) { M3.sel = b; highlight(grp, true); } return; }
  doSwap(a, b);
}
function findCell(grp) {
  for (let y = 0; y < M3.H; y++) for (let x = 0; x < M3.W; x++) if (M3.grid[y][x] && M3.grid[y][x].mesh === grp) return { x, y };
  return null;
}
function highlight(grp, on) {
  if (!grp || !grp.userData) return;
  grp.userData.ts = on ? 1.2 : 1.0;
}

async function doSwap(a, b) {
  M3.busy = true;
  swapCells(a, b);
  await wait(180);
  if (await resolveBoard(b)) { M3.moves--; beep(620, .07); }
  else { swapCells(a, b); beep(200, .08, "square"); await wait(160); }
  updateM3Hud();
  M3.busy = false;
  if (M3.score >= M3.target && M3.iceLeft <= 0) endM3(true);
  else if (M3.moves <= 0) endM3(false);
}
function swapCells(a, b) {
  const ca = M3.grid[a.y][a.x], cb = M3.grid[b.y][b.x];
  M3.grid[a.y][a.x] = cb; M3.grid[b.y][b.x] = ca;
  setTarget(ca, b.x, b.y); setTarget(cb, a.x, a.y);
}
function setTarget(cell, x, y) { const p = worldPos(x, y); cell.mesh.userData.tx = p.x; cell.mesh.userData.ty = p.y; }

// Farbe einer Zelle fürs Matching; vereiste (frozen) Zellen sind nicht matchbar (-1).
function cAt(x, y) { const cell = M3.grid[y][x]; return (!cell || cell.c == null || cell.ice > 0) ? -1 : cell.c; }
function runs() {
  const out = [];
  for (let y = 0; y < M3.H; y++) { let x = 0; while (x < M3.W) {
    const c = cAt(x, y); if (c < 0) { x++; continue; }
    let s = x; while (x < M3.W && cAt(x, y) === c) x++;
    if (x - s >= 3) { const r = { cells: [], h: true, color: c }; for (let i = s; i < x; i++) r.cells.push({ x: i, y }); out.push(r); }
  }}
  for (let x = 0; x < M3.W; x++) { let y = 0; while (y < M3.H) {
    const c = cAt(x, y); if (c < 0) { y++; continue; }
    let s = y; while (y < M3.H && cAt(x, y) === c) y++;
    if (y - s >= 3) { const r = { cells: [], h: false, color: c }; for (let i = s; i < y; i++) r.cells.push({ x, y: i }); out.push(r); }
  }}
  return out;
}
// Eis benachbart zu geräumten Zellen um eine Schicht auftauen.
function thawAround(clearedSet) {
  const seen = new Set();
  clearedSet.forEach(k => {
    const [x, y] = k.split(",").map(Number);
    [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx, dy]) => {
      const nx = x + dx, ny = y + dy, nk = nx + "," + ny;
      if (nx < 0 || nx >= M3.W || ny < 0 || ny >= M3.H || seen.has(nk)) return;
      const cell = M3.grid[ny][nx];
      if (cell && cell.ice > 0) {
        seen.add(nk);
        setIce(cell, cell.ice - 1);
        burst(nx, ny, 0xcde7ff, 4); beep(520, .05, "triangle");
        if (cell.ice === 0) { M3.iceLeft--; beep(760, .08); }
      }
    });
  });
}
function effect(x, y, kind, t) {
  const out = [];
  if (kind === "rocketH") for (let i = 0; i < M3.W; i++) out.push({ x: i, y });
  else if (kind === "rocketV") for (let i = 0; i < M3.H; i++) out.push({ x, y: i });
  else if (kind === "color") for (let yy = 0; yy < M3.H; yy++) for (let xx = 0; xx < M3.W; xx++) if (M3.grid[yy][xx] && M3.grid[yy][xx].c === t) out.push({ x: xx, y: yy });
  return out;
}

async function resolveBoard(b) {
  let rs = runs(); if (rs.length === 0) return false;
  let combo = 0;
  while (rs.length > 0) {
    combo++;
    const spawns = [];
    for (const r of rs) {
      if (r.cells.length >= 5) spawns.push({ p: pick(r, b), kind: "color", color: r.color });
      else if (r.cells.length === 4) spawns.push({ p: pick(r, b), kind: r.h ? "rocketH" : "rocketV", color: r.color });
    }
    const spawnKeys = new Set(spawns.map(s => s.p.x + "," + s.p.y));
    const cleared = new Set(), queue = [];
    for (const r of rs) for (const p of r.cells) { const k = p.x + "," + p.y; if (!cleared.has(k)) { cleared.add(k); const cell = M3.grid[p.y][p.x]; if (cell && cell.s) queue.push({ x: p.x, y: p.y, s: cell.s, t: cell.c }); } }
    while (queue.length) { const q = queue.shift(); for (const e of effect(q.x, q.y, q.s, q.t)) { const k = e.x + "," + e.y; if (!cleared.has(k)) { cleared.add(k); const cell = M3.grid[e.y][e.x]; if (cell && cell.s) queue.push({ x: e.x, y: e.y, s: cell.s, t: cell.c }); } } }

    // benachbartes Eis auftauen (eine Schicht pro Auflöse-Schritt)
    thawAround(cleared);

    let n = 0;
    cleared.forEach(k => {
      const [x, y] = k.split(",").map(Number);
      if (spawnKeys.has(k)) return;
      const cell = M3.grid[y][x]; if (!cell) return;
      burst(x, y, FRUIT[cell.c] ? FRUIT[cell.c].color : 0xffffff, 5);
      popOut(cell.mesh); M3.grid[y][x] = null; n++;
    });
    spawns.forEach(s => {
      const old = M3.grid[s.p.y][s.p.x]; if (old) popOut(old.mesh);
      const sp = makeSpecial(s.color, s.kind); const p = worldPos(s.p.x, s.p.y);
      sp.position.set(p.x, p.y, 0); sp.userData.tx = p.x; sp.userData.ty = p.y; M3.scene.add(sp);
      M3.grid[s.p.y][s.p.x] = { c: s.color, s: s.kind, mesh: sp };
    });
    M3.score += Math.round(n * 12 * (1 + 0.25 * (combo - 1)));

    // Juice: "bigger action = bigger feedback" — Screenshake + Hit-Stop bei Spezial/Combo
    if (spawns.length) { M3.shake = 0.55; beep(180, .18, "sawtooth"); }
    else if (combo >= 3) { M3.shake = Math.max(M3.shake, 0.28); }
    if (combo > 1) beep(700 + combo * 70, .06);
    updateM3Hud();
    await wait(spawns.length ? 320 : 200); // Hit-Stop: kurze Pause beim Spezial-Zünden
    gravity();
    await wait(220);
    rs = runs();
  }
  return true;
}
function pick(r, b) { for (const p of r.cells) if (p.x === b.x && p.y === b.y) return p; return r.cells[(r.cells.length / 2) | 0]; }
function popOut(mesh) {
  if (!mesh) return;
  mesh.userData.ts = 0.01; mesh.userData.spin = 0.4;
  setTimeout(() => { if (mesh.parent) mesh.parent.remove(mesh); }, 220);
}
function gravity() {
  for (let x = 0; x < M3.W; x++) {
    const stack = [];
    for (let y = M3.H - 1; y >= 0; y--) if (M3.grid[y][x]) stack.push(M3.grid[y][x]);
    let y = M3.H - 1;
    for (const cell of stack) { M3.grid[y][x] = cell; setTarget(cell, x, y); y--; }
    for (; y >= 0; y--) M3.grid[y][x] = newCell((Math.random() * M3.C) | 0, x, y, true);
  }
}
function updateM3Hud() {
  $("m3score").textContent = M3.score; $("m3moves").textContent = M3.moves;
  $("m3target").textContent = M3.target; $("m3ice").textContent = M3.iceLeft;
  $("m3icetype").textContent = (M3.iceLeft > 0 && M3.iceStyle) ? "(" + M3.iceStyle.label + ")" : "";
}
function endM3(won) {
  M3.busy = true;
  if (won) {
    state.m3level = ((state.m3level || 1) + 1);
    const reward = Math.floor(M3.score / 7);
    beep(990, .2); minigameFinished(reward);
  } else { toast("Keine Züge mehr — probier's nochmal."); }
}

// =====================================================================
//  BALL-SORT (3D, Glas-Reagenzgläser)
// =====================================================================
const BS = {
  cap: 4, colors: 4, tubes: [], meshes: [], sel: null, moves: 0, history: [], busy: false,
  scene: null, cam: null, renderer: null, raycaster: null, tubeMeshes: [], spacing: 1.5, ballR: 0.42,
};
const BALL_COLORS = [0xff5d6c, 0x4dabf7, 0x69db7c, 0xffd43b, 0xb197fc, 0xff922b, 0x4dd6c8];

function tubeX(i) { return (i - (BS.tubes.length - 1) / 2) * BS.spacing; }
function slotY(slot) { return -BS.cap * 0.45 + slot * 0.9 + 0.45; }

function startBallSort() {
  const lvl = (state && state.bslevel) || 1;
  BS.colors = Math.min(BALL_COLORS.length, 4 + Math.floor((lvl - 1) / 2));
  BS.cap = 4; BS.sel = null; BS.moves = 0; BS.history = []; BS.busy = false;
  const mount = $("bsmount");
  const w = Math.min(460, (mount.clientWidth || 400)), h = 380;
  BS.scene = new T.Scene();
  BS.cam = new T.PerspectiveCamera(45, w / h, 0.1, 100);
  BS.cam.position.set(0, 0.4, 9.5); BS.cam.lookAt(0, -0.2, 0);
  addLights(BS.scene);
  const floor = new T.Mesh(new T.PlaneGeometry(40, 40), new T.MeshStandardMaterial({ color: 0x190f2b, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -BS.cap * 0.45 - 0.35; floor.receiveShadow = true; BS.scene.add(floor);
  BS.raycaster = new T.Raycaster();
  BS.renderer = makeRenderer(mount, w, h);

  // Logik: gelöst -> mischen mit legalen Einzelzügen
  BS.tubes = [];
  for (let c = 0; c < BS.colors; c++) { const t = []; for (let k = 0; k < BS.cap; k++) t.push(c); BS.tubes.push(t); }
  BS.tubes.push([]); BS.tubes.push([]);
  for (let i = 0; i < 120; i++) { const a = (Math.random() * BS.tubes.length) | 0, b = (Math.random() * BS.tubes.length) | 0; if (canMove(a, b)) BS.tubes[b].push(BS.tubes[a].pop()); }

  buildTubes();
  BS.renderer.domElement.style.cursor = "pointer";
  BS.renderer.domElement.onpointerdown = onBSPointer;
  ticks.push(tickBS); startLoop();
  $("bsstatus").textContent = `Level ${lvl} · ${BS.colors} Farben`; $("bsmoves").textContent = 0;
}

function buildTubes() {
  BS.tubeMeshes = []; BS.meshes = [];
  const glassMat = new T.MeshPhysicalMaterial({ color: 0xbfd4ff, transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, reflectivity: 0.6, side: T.DoubleSide });
  const tubeH = BS.cap * 0.9 + 0.5;
  BS.tubes.forEach((stack, i) => {
    const grp = new T.Group(); grp.position.x = tubeX(i);
    const wall = new T.Mesh(new T.CylinderGeometry(0.56, 0.56, tubeH, 28, 1, true), glassMat);
    wall.position.y = slotY(0) - 0.45 + tubeH / 2 - 0.0; grp.add(wall);
    const bottom = new T.Mesh(new T.CylinderGeometry(0.56, 0.5, 0.18, 28), glassMat);
    bottom.position.y = slotY(0) - 0.45; grp.add(bottom);
    wall.userData.tube = i; bottom.userData.tube = i;
    BS.tubeMeshes.push(wall, bottom);
    BS.scene.add(grp);
    const meshStack = [];
    stack.forEach((col, slot) => { const b = makeBall(col); b.position.set(tubeX(i), slotY(slot), 0); b.userData.tx = tubeX(i); b.userData.ty = slotY(slot); BS.scene.add(b); meshStack.push(b); });
    BS.meshes.push(meshStack);
  });
}
function makeBall(col) {
  const m = new T.Mesh(new T.SphereGeometry(BS.ballR, 26, 20),
    new T.MeshStandardMaterial({ color: BALL_COLORS[col], roughness: 0.25, metalness: 0.1 }));
  m.castShadow = true; m.userData = { tx: 0, ty: 0, col };
  return m;
}
function tickBS() {
  if (!BS.renderer) return;
  BS.scene.traverse(o => { if (o.isMesh && o.userData && o.userData.tx !== undefined && o.userData.col !== undefined) {
    o.position.x = lerp(o.position.x, o.userData.tx, 0.2); o.position.y = lerp(o.position.y, o.userData.ty, 0.2);
  }});
  BS.renderer.render(BS.scene, BS.cam);
}
function canMove(from, to) {
  if (from === to) return false; const s = BS.tubes[from], d = BS.tubes[to];
  if (s.length === 0 || d.length >= BS.cap) return false;
  return d.length === 0 || d[d.length - 1] === s[s.length - 1];
}
function onBSPointer(e) {
  if (BS.busy) return;
  const rect = BS.renderer.domElement.getBoundingClientRect();
  const ndc = new T.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
  BS.raycaster.setFromCamera(ndc, BS.cam);
  const hits = BS.raycaster.intersectObjects(BS.tubeMeshes, false);
  if (!hits.length) return;
  clickTube(hits[0].object.userData.tube);
}
async function clickTube(i) {
  if (BS.sel === null) { if (BS.tubes[i].length) { BS.sel = i; liftTop(i, true); beep(420, .05); } return; }
  const from = BS.sel, to = i; liftTop(from, false); BS.sel = null;
  if (from === to || !canMove(from, to)) { beep(200, .07, "square"); return; }
  BS.busy = true;
  const color = BS.tubes[from][BS.tubes[from].length - 1]; let moved = 0;
  const movingMeshes = [];
  while (canMove(from, to) && BS.tubes[from][BS.tubes[from].length - 1] === color) {
    BS.tubes[to].push(BS.tubes[from].pop());
    const m = BS.meshes[from].pop(); BS.meshes[to].push(m); movingMeshes.push(m); moved++;
  }
  BS.history.push({ from, to, moved }); BS.moves++; $("bsmoves").textContent = BS.moves; beep(560, .06);
  // Phase 1: hochheben
  movingMeshes.forEach(m => { m.userData.ty = slotY(BS.cap) + 1.2; });
  await wait(170);
  // Phase 2: rüber
  movingMeshes.forEach(m => { m.userData.tx = tubeX(to); });
  await wait(170);
  // Phase 3: einsetzen
  const base = BS.tubes[to].length - moved;
  movingMeshes.forEach((m, k) => { m.userData.ty = slotY(base + k); });
  await wait(200);
  BS.busy = false;
  if (isSolved()) endBS();
}
function liftTop(i, on) {
  const st = BS.meshes[i]; if (!st.length) return; const m = st[st.length - 1];
  m.userData.ty = on ? slotY(BS.tubes[i].length - 1) + 0.5 : slotY(BS.tubes[i].length - 1);
}
function bsUndo() {
  if (!BS.history.length || BS.busy) return;
  const { from, to, moved } = BS.history.pop();
  for (let k = 0; k < moved; k++) { BS.tubes[from].push(BS.tubes[to].pop()); const m = BS.meshes[to].pop(); BS.meshes[from].push(m); }
  BS.meshes[from].forEach((m, slot) => { m.userData.tx = tubeX(from); m.userData.ty = slotY(slot); });
  BS.moves++; $("bsmoves").textContent = BS.moves;
}
function isSolved() { return BS.tubes.every(t => t.length === 0 || (t.length === BS.cap && t.every(c => c === t[0]))); }
function endBS() {
  state.bslevel = ((state.bslevel || 1) + 1);
  const reward = Math.max(50, 140 - BS.moves * 3);
  $("bsstatus").textContent = "Gelöst! 🎉"; beep(990, .2);
  minigameFinished(reward);
}

// Globals exportieren (Buttons in index.html)
window.startMatch3 = startMatch3;
window.startBallSort = startBallSort;
window.bsUndo = bsUndo;
})();
