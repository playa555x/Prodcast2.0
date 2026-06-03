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
  if (M3.renderer) { M3.renderer.dispose(); M3.renderer = null; M3.composer = null; }
  if (BS.renderer) { BS.renderer.dispose(); BS.renderer = null; BS.composer = null; }
};

function makeRenderer(mount, w, h) {
  const r = new T.WebGLRenderer({ antialias: true, alpha: true });
  r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  r.setSize(w, h);
  r.shadowMap.enabled = true; r.shadowMap.type = T.PCFSoftShadowMap;
  r.outputEncoding = T.sRGBEncoding;
  r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = 1.0;
  mount.innerHTML = ""; mount.appendChild(r.domElement);
  return r;
}
// Image-Based-Lighting (weiche Reflexe auf Eis/Glas) — einmal pro Renderer.
function makeEnv(renderer) {
  const p = new T.PMREMGenerator(renderer);
  const tex = p.fromScene(new T.RoomEnvironment(), 0.04).texture;
  p.dispose(); return tex;
}
// Post-Processing: Bloom-Glow + Vignette + FXAA.
function makeComposer(renderer, scene, cam, w, h) {
  const c = new T.EffectComposer(renderer);
  c.addPass(new T.RenderPass(scene, cam));
  c.addPass(new T.UnrealBloomPass(new T.Vector2(w / 2, h / 2), 0.5, 0.35, 0.9));
  const vign = new T.ShaderPass(T.VignetteShader);
  vign.uniforms.offset.value = 1.05; vign.uniforms.darkness.value = 1.15; c.addPass(vign);
  const fxaa = new T.ShaderPass(T.FXAAShader);
  const pr = renderer.getPixelRatio();
  fxaa.material.uniforms.resolution.value.set(1 / (w * pr), 1 / (h * pr)); c.addPass(fxaa);
  c.setSize(w, h);
  return c;
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
  mode: null, rng: Math.random, timed: 0, timeLeft: 0, lastT: 0, ended: false,
};

// --- Seedbarer RNG (Daily = reproduzierbares Board pro Tag) ---
function mulberry32(a) {
  return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function dateSeed() { const d = new Date(); return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate(); }
const rnd = () => (M3.rng || Math.random)();

// --- Modi als DATEN (geteilter Kern, nur Ziele/Regeln unterscheiden sich) ---
// Entspricht GameModeSO/IObjective/IRuleModifier aus docs/RESEARCH_MODES.md.
const MODES = {
  story:      { id: "story",      name: "Story",       icon: "📖", desc: "Ziele + Eis, Level-Progression", moves: 18, target: 700,  ice: true,  seeded: false, endless: false, timed: 0  },
  daily:      { id: "daily",      name: "Daily",       icon: "📅", desc: "Täglich gleiches Board (Seed)",   moves: 25, target: 1000, ice: false, seeded: true,  endless: false, timed: 0  },
  endless:    { id: "endless",    name: "Endlos",      icon: "♾️", desc: "Spielen bis keine Züge mehr",     moves: 0,  target: 0,    ice: false, seeded: false, endless: true,  timed: 0  },
  timeattack: { id: "timeattack", name: "Time Attack", icon: "⏱️", desc: "60 Sek — maximale Punkte",        moves: 0,  target: 0,    ice: false, seeded: false, endless: true,  timed: 60 },
};
function startMode(id) { M3.mode = MODES[id] || MODES.story; showTab("m3"); }
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
  const ring = new T.Mesh(new T.TorusGeometry(0.6, 0.07, 10, 28),
    new T.MeshStandardMaterial({ color: 0xffffff, emissive: kind === "color" ? 0xff5db0 : 0xffe066, emissiveIntensity: 2.6 }));
  g.add(ring); g.userData.ring = ring;
  const badge = new T.Sprite(new T.SpriteMaterial({ map: emojiTexture(kind === "color" ? "💥" : "🚀"), transparent: true }));
  badge.scale.set(0.62, 0.62, 0.62); badge.position.set(0.28, 0.32, 0.2); g.add(badge);
  g.userData.baseScale = 1.12;
  return g;
}

function startMatch3() {
  const mode = M3.mode || (M3.mode = MODES.story);
  const lvl = (state && state.m3level) || 1;
  M3.rng = mode.seeded ? mulberry32(dateSeed()) : Math.random;
  M3.score = 0; M3.sel = null; M3.busy = false; M3.ended = false;
  M3.moves = mode.endless ? Infinity : (mode.moves + (mode.id === "story" ? Math.min(8, lvl) : 0));
  M3.target = mode.endless ? Infinity : (mode.target + (mode.id === "story" ? lvl * 120 : 0));
  M3.timed = mode.timed; M3.timeLeft = mode.timed; M3.lastT = performance.now();
  const mount = $("m3mount"); M3.mount = mount;
  const size = Math.min(440, (mount.clientWidth || 380));
  M3.scene = new T.Scene();
  M3.cam = new T.PerspectiveCamera(46, 1, 0.1, 100);
  M3.cam.position.set(0, -0.8, 12.2); M3.cam.lookAt(0, 0.25, 0);
  addLights(M3.scene);
  const back = new T.Mesh(new T.PlaneGeometry(46, 46),
    new T.MeshBasicMaterial({ map: gradientTex() }));
  back.position.z = -1.4; M3.scene.add(back);
  M3.raycaster = new T.Raycaster();
  M3.renderer = makeRenderer(mount, size, size);
  M3.cam.aspect = 1; M3.cam.updateProjectionMatrix();
  M3.scene.environment = makeEnv(M3.renderer);
  M3.composer = makeComposer(M3.renderer, M3.scene, M3.cam, size, size);

  // Board ohne Start-Matches
  M3.grid = [];
  for (let y = 0; y < M3.H; y++) { M3.grid[y] = [];
    for (let x = 0; x < M3.W; x++) {
      let c; do { c = (rnd() * M3.C) | 0; }
      while ((x >= 2 && M3.grid[y][x-1].c === c && M3.grid[y][x-2].c === c) ||
             (y >= 2 && M3.grid[y-1][x].c === c && M3.grid[y-2][x].c === c));
      M3.grid[y][x] = newCell(c, x, y, true);
    } }

  // Hindernis: Eis-Blocker säen (nur in Modi mit Eis). Stufe + Menge wachsen mit dem Level.
  M3.particles = []; M3.shake = 0; M3.iceLeft = 0;
  const style = iceStyleForLevel(lvl); M3.iceStyle = style;
  if (mode.ice) {
    const iceCount = Math.min(16, 3 + lvl * 2);
    const spots = new Set();
    for (let i = 0; i < iceCount; i++) {
      const x = (rnd() * M3.W) | 0, y = (rnd() * M3.H) | 0, k = x + "," + y;
      if (spots.has(k)) continue; spots.add(k);
      const layers = 1 + ((rnd() * style.maxLayers) | 0); // 1..maxLayers
      setIce(M3.grid[y][x], layers, style); M3.iceLeft++;
    }
  }

  // Weitere Blocker nach Bloom-Schedule (nur Story): 🔒 Lock ab L3, 💣 Countdown-Bombe ab L5.
  M3.bombLeft = 0;
  if (mode.id === "story") {
    const occ = new Set();
    for (let y = 0; y < M3.H; y++) for (let x = 0; x < M3.W; x++) if (M3.grid[y][x] && M3.grid[y][x].ice > 0) occ.add(x + "," + y);
    const pickFree = () => { for (let t = 0; t < 40; t++) { const x = (rnd() * M3.W) | 0, y = (rnd() * M3.H) | 0, k = x + "," + y; if (!occ.has(k)) { occ.add(k); return [x, y]; } } return null; };
    if (lvl >= 3) { const n = Math.min(6, lvl - 2); for (let i = 0; i < n; i++) { const p = pickFree(); if (p) setLock(M3.grid[p[1]][p[0]], true); } }
    if (lvl >= 5) { const n = Math.min(3, lvl - 4); for (let i = 0; i < n; i++) { const p = pickFree(); if (p) { setBomb(M3.grid[p[1]][p[0]], 9 + ((rnd() * 4) | 0)); M3.bombLeft++; } } }
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

// --- Canvas-Texturen für Eis (einmal erzeugt, geteilt) ---
let _frostTex, _sparkleTex, _puffTex; const _crackTex = {};
function frostTex() {
  if (_frostTex) return _frostTex;
  const s = 128, cv = document.createElement("canvas"); cv.width = cv.height = s;
  const ctx = cv.getContext("2d"); ctx.fillStyle = "#808080"; ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 1800; i++) { const v = (128 + (Math.random() - 0.5) * 190) | 0; ctx.fillStyle = `rgb(${v},${v},${v})`; ctx.fillRect((Math.random() * s) | 0, (Math.random() * s) | 0, 2, 2); }
  _frostTex = new T.CanvasTexture(cv); _frostTex.wrapS = _frostTex.wrapT = T.RepeatWrapping; return _frostTex;
}
function crackTex(n) {
  if (_crackTex[n]) return _crackTex[n];
  const s = 256, cv = document.createElement("canvas"); cv.width = cv.height = s;
  const ctx = cv.getContext("2d"); ctx.translate(s / 2, s / 2);
  const branches = 2 + n * 2;
  for (let b = 0; b < branches; b++) {
    let a = Math.random() * 6.28, x = 0, y = 0; ctx.beginPath(); ctx.moveTo(0, 0);
    const segs = 3 + ((Math.random() * 3) | 0);
    for (let k = 0; k < segs; k++) { a += (Math.random() - 0.5) * 1.0; const len = 12 + Math.random() * 24; x += Math.cos(a) * len; y += Math.sin(a) * len; ctx.lineTo(x, y); }
    ctx.lineWidth = 3.2; ctx.strokeStyle = "rgba(62,159,203,0.85)"; ctx.stroke();
    ctx.lineWidth = 1.2; ctx.strokeStyle = "rgba(255,255,255,0.95)"; ctx.stroke();
  }
  _crackTex[n] = new T.CanvasTexture(cv); return _crackTex[n];
}
function sparkleTex() {
  if (_sparkleTex) return _sparkleTex;
  const s = 64, cv = document.createElement("canvas"); cv.width = cv.height = s; const ctx = cv.getContext("2d");
  const g = ctx.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2);
  g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.4, "rgba(220,245,255,0.5)"); g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(s/2, 4); ctx.lineTo(s/2, s-4); ctx.moveTo(4, s/2); ctx.lineTo(s-4, s/2); ctx.stroke();
  _sparkleTex = new T.CanvasTexture(cv); return _sparkleTex;
}
function puffTex() {
  if (_puffTex) return _puffTex;
  const s = 64, cv = document.createElement("canvas"); cv.width = cv.height = s; const ctx = cv.getContext("2d");
  const g = ctx.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2);
  g.addColorStop(0, "rgba(255,255,255,0.9)"); g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, s, s); _puffTex = new T.CanvasTexture(cv); return _puffTex;
}
function jitter(geo, amt) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + (Math.random()-0.5)*amt, p.getY(i) + (Math.random()-0.5)*amt, p.getZ(i) + (Math.random()-0.5)*amt);
  geo.computeVertexNormals();
}

// Eis-Stufen: ändern sich mit dem Level (Aussehen + max. Schichten/Zähigkeit).
function iceStyleForLevel(lvl) {
  if (lvl <= 2) return { key: "raureif",    label: "Raureif",        emissive: 0x000000, detail: 0, scale: 0.74, maxLayers: 1 };
  if (lvl <= 4) return { key: "eis",        label: "Eis",            emissive: 0x113355, detail: 0, scale: 0.76, maxLayers: 2 };
  if (lvl <= 6) return { key: "frost",      label: "Frost-Kristall", emissive: 0x2277bb, detail: 1, scale: 0.80, maxLayers: 3 };
  return              { key: "permafrost", label: "Permafrost",     emissive: 0x1144aa, detail: 1, scale: 0.84, maxLayers: 4 };
}

// Eis-Blocker nach Recherche-Spec: dünn=klar/bläulich (Frucht sichtbar), dick=weiß/opak + viele Risse.
// Teile: facettierter Kern-Kristall (Frost-Bump) + weißer Rim-Glanz + Riss-Overlay + Funkeln.
function setIce(cell, layers, style) {
  cell.ice = layers;
  if (style) cell.iceStyle = style;
  const st = cell.iceStyle || iceStyleForLevel(1);
  const g = cell.mesh;
  if (g.userData.iceParts) g.userData.iceParts.forEach(p => { g.remove(p); if (p.geometry) p.geometry.dispose(); });
  g.userData.iceParts = [];
  if (layers <= 0) { g.userData.frozen = false; return; }
  g.userData.frozen = true;

  const t = Math.min(1, (layers - 1) / 3);            // 0 = dünn .. 1 = dick
  const body = new T.Color(0x6fc8ec).lerp(new T.Color(0xeaf6ff), t * 0.5);
  const opacity = 0.38 + t * 0.42;                     // dünn durchsichtig -> dick opak

  const geo = new T.IcosahedronGeometry(st.scale, st.detail); jitter(geo, 0.04);
  const core = new T.Mesh(geo, new T.MeshPhysicalMaterial({
    color: body, emissive: new T.Color(st.emissive), emissiveIntensity: 0.3,
    transparent: true, opacity, roughness: 0.22, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.12,
    bumpMap: frostTex(), bumpScale: 0.05 + t * 0.07, flatShading: true, depthWrite: false, side: T.DoubleSide,
  }));
  core.renderOrder = 2; g.add(core); g.userData.iceParts.push(core);

  const rim = new T.Mesh(geo.clone(), new T.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.16 + t * 0.12, blending: T.AdditiveBlending, side: T.BackSide, depthWrite: false }));
  rim.scale.setScalar(1.07); rim.renderOrder = 2; g.add(rim); g.userData.iceParts.push(rim);

  const crack = new T.Sprite(new T.SpriteMaterial({ map: crackTex(layers),
    transparent: true, opacity: 0.45 + t * 0.4, blending: T.AdditiveBlending, depthWrite: false }));
  crack.scale.setScalar(st.scale * 2.0); crack.position.z = 0.1; crack.renderOrder = 3;
  g.add(crack); g.userData.iceParts.push(crack);

  for (let i = 0; i < 2; i++) {
    const sp = new T.Sprite(new T.SpriteMaterial({ map: sparkleTex(), transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
    sp.position.set((Math.random()-0.5)*st.scale, (Math.random()-0.5)*st.scale, 0.2);
    sp.userData.sparkle = Math.random() * 6.28; sp.scale.setScalar(0.16); sp.renderOrder = 4;
    g.add(sp); g.userData.iceParts.push(sp);
  }
}

// Shatter beim endgültigen Brechen: Eis-Splitter + Schnee-Puff.
function iceShatter(x, y, style) {
  const p = worldPos(x, y); beep(880, .09, "triangle"); beep(1240, .06);
  for (let i = 0; i < 11; i++) {
    const m = new T.Mesh(new T.TetrahedronGeometry(0.12 + Math.random() * 0.08),
      new T.MeshStandardMaterial({ color: 0xd6f1ff, transparent: true, opacity: 0.95, roughness: 0.2, metalness: 0, flatShading: true }));
    m.position.set(p.x, p.y, 0.2); M3.scene.add(m);
    M3.particles.push({ mesh: m, vx: (Math.random()-0.5)*0.42, vy: Math.random()*0.35+0.06, vz: (Math.random()-0.5)*0.2,
      life: 0.5 + Math.random()*0.3, maxlife: 0.8, spin: (Math.random()-0.5)*0.45, shard: true });
  }
  for (let i = 0; i < 6; i++) {
    const s = new T.Sprite(new T.SpriteMaterial({ map: puffTex(), transparent: true, opacity: 0.85, blending: T.AdditiveBlending, depthWrite: false }));
    s.position.set(p.x + (Math.random()-0.5)*0.6, p.y + (Math.random()-0.5)*0.6, 0.3); s.scale.setScalar(0.3); M3.scene.add(s);
    M3.particles.push({ mesh: s, vx: (Math.random()-0.5)*0.1, vy: Math.random()*0.06, vz: 0, life: 0.45, maxlife: 0.45, grow: true, base: 0.3 });
  }
}

function tickM3() {
  if (!M3.renderer) return;
  const now = performance.now() / 1000;
  if (M3.timed && !M3.ended) {                         // Time-Attack-Timer
    const tn = performance.now(), dt = (tn - (M3.lastT || tn)) / 1000; M3.lastT = tn;
    if (!M3.busy) { M3.timeLeft -= dt; if (M3.timeLeft <= 0) { M3.timeLeft = 0; updateM3Hud(); endMode(true); } }
    M3._hud = (M3._hud || 0) + dt; if (M3._hud > 0.25) { M3._hud = 0; updateM3Hud(); }
  }
  M3.scene.traverse(o => {
    if (o.isGroup && o.userData && o.userData.body) {
      const u = o.userData;
      o.scale.x = lerp(o.scale.x, u.baseScale * u.ts, 0.25);
      o.scale.y = o.scale.x; o.scale.z = o.scale.x;
      if (u.tx !== undefined) { o.position.x = lerp(o.position.x, u.tx, 0.28); o.position.y = lerp(o.position.y, u.ty, 0.28); }
      if (u.ring) u.ring.rotation.x += 0.05;
    } else if (o.isSprite && o.userData && o.userData.sparkle !== undefined) {
      o.scale.setScalar(0.14 + 0.07 * Math.sin(now * 5 + o.userData.sparkle));
    }
  });
  // Partikel: Burst (Frucht), Eis-Splitter (shard) und Schnee-Puff (grow)
  for (let i = M3.particles.length - 1; i >= 0; i--) {
    const p = M3.particles[i]; p.life -= 0.016;
    if (p.life <= 0) { M3.scene.remove(p.mesh); M3.particles.splice(i, 1); continue; }
    if (!p.text && !p.ring) p.vy -= 0.018;            // Schwerkraft (außer Text/Ring)
    p.mesh.position.x += p.vx; p.mesh.position.y += p.vy; p.mesh.position.z += p.vz;
    if (p.text) {
      const k = p.life / p.maxlife; if (p.mesh.material) p.mesh.material.opacity = Math.min(1, k * 1.4);
      const sc = p.base * (1.3 - 0.3 * k); p.mesh.scale.set(sc * 1.8, sc * 0.9, 1);
    } else if (p.ring) {
      const k = 1 - p.life / p.maxlife; p.mesh.scale.setScalar(1 + k * 6);
      if (p.mesh.material) p.mesh.material.opacity = 0.9 * (1 - k);
    } else if (p.grow) {
      const k = 1 - p.life / p.maxlife; p.mesh.scale.setScalar(p.base * (1 + k * 2.2));
      if (p.mesh.material) p.mesh.material.opacity = 0.9 * (1 - k);
    } else if (p.shard) {
      p.mesh.rotation.x += p.spin; p.mesh.rotation.y += p.spin * 0.7;
      if (p.mesh.material) p.mesh.material.opacity = Math.min(1, p.life / 0.3);
    } else {
      p.mesh.scale.setScalar(Math.max(0.01, p.life * 2.2));
    }
  }
  // Screenshake (skaliert mit Combo/Spezial) — klingt schnell ab
  if (M3.shake > 0.001) {
    M3.cam.position.set(M3.camBase.x + (Math.random() - 0.5) * M3.shake,
                        M3.camBase.y + (Math.random() - 0.5) * M3.shake, M3.camBase.z);
    M3.shake *= 0.86;
  } else { M3.cam.position.copy(M3.camBase); }
  M3.composer.render();
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

// --- Juice: schwebende Punkte-Popups, Spezial-Lichtblitz, Gradient-Hintergrund ---
const _txtCache = {}; let _gradTex;
function textTexture(text, color) {
  const key = text + "|" + color; if (_txtCache[key]) return _txtCache[key];
  const w = 256, h = 128, cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  const ctx = cv.getContext("2d"); ctx.font = "bold 72px system-ui,Arial,sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.lineWidth = 9; ctx.strokeStyle = "rgba(0,0,0,0.65)"; ctx.strokeText(text, w / 2, h / 2);
  ctx.fillStyle = color; ctx.fillText(text, w / 2, h / 2);
  const t = new T.CanvasTexture(cv); _txtCache[key] = t; return t;
}
function scorePopup(x, y, text, color, scale) {
  const m = new T.Sprite(new T.SpriteMaterial({ map: textTexture(text, color), transparent: true, depthWrite: false }));
  const p = worldPos(x, y); m.position.set(p.x, p.y, 0.6); m.renderOrder = 6;
  m.scale.set(scale * 1.8, scale * 0.9, 1); M3.scene.add(m);
  M3.particles.push({ mesh: m, vx: 0, vy: 0.05, vz: 0, life: 0.95, maxlife: 0.95, text: true, base: scale });
}
function flashAt(x, y, color) {
  const s = new T.Sprite(new T.SpriteMaterial({ map: puffTex(), transparent: true, opacity: 0.95,
    blending: T.AdditiveBlending, depthWrite: false, color: new T.Color(color) }));
  const p = worldPos(x, y); s.position.set(p.x, p.y, 0.7); s.scale.setScalar(0.6); s.renderOrder = 5; M3.scene.add(s);
  M3.particles.push({ mesh: s, vx: 0, vy: 0, vz: 0, life: 0.45, maxlife: 0.45, grow: true, base: 1.0 });
}
function ringShock(x, y, color) {
  const m = new T.Mesh(new T.RingGeometry(0.12, 0.34, 36),
    new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, side: T.DoubleSide, blending: T.AdditiveBlending, depthWrite: false }));
  const p = worldPos(x, y); m.position.set(p.x, p.y, 0.55); m.renderOrder = 5; M3.scene.add(m);
  M3.particles.push({ mesh: m, vx: 0, vy: 0, vz: 0, life: 0.5, maxlife: 0.5, ring: true });
}
function gradientTex() {
  if (_gradTex) return _gradTex;
  const s = 256, cv = document.createElement("canvas"); cv.width = cv.height = s; const ctx = cv.getContext("2d");
  const g = ctx.createRadialGradient(s/2, s*0.42, 10, s/2, s/2, s*0.72);
  g.addColorStop(0, "#4a3470"); g.addColorStop(0.55, "#2a1f3d"); g.addColorStop(1, "#140f1f");
  ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  _gradTex = new T.CanvasTexture(cv); return _gradTex;
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
  const pcell = M3.grid[pos.y][pos.x];
  if (pcell.ice > 0) { beep(180, .1, "square"); toast("🧊 Erst das Eis schmelzen — Match direkt daneben!"); return; }
  if (pcell.locked) { beep(180, .1, "square"); toast("🔒 Erst das Schloss knacken — Match direkt daneben!"); return; }
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
  let valid = false;
  if (await resolveBoard(b)) { valid = true; if (M3.moves !== Infinity) M3.moves--; beep(620, .07); }
  else { swapCells(a, b); beep(200, .08, "square"); await wait(160); }
  const playable = ensurePlayable();
  const exploded = valid ? tickBombs() : false;   // Bomben nur bei gültigem Zug runterzählen
  updateM3Hud();
  M3.busy = false;
  const mode = M3.mode;
  if (exploded) { toast("💣 Bombe explodiert!"); beep(120, .3, "sawtooth"); endMode(false); return; }
  if (!mode.endless && M3.score >= M3.target && M3.iceLeft <= 0) endMode(true);
  else if (!mode.endless && M3.moves <= 0) endMode(false);
  else if (mode.endless && !mode.timed && !playable) endMode(true);  // Endlos: stuck -> auszahlen
}

// Solvability (aus der Architektur-Recherche): gibt es ≥1 gültigen Zug? Sonst neu mischen.
function hasValidMove() {
  for (let y = 0; y < M3.H; y++) for (let x = 0; x < M3.W; x++) {
    if (cAt(x, y) < 0) continue;
    for (const [dx, dy] of [[1, 0], [0, 1]]) {
      const nx = x + dx, ny = y + dy; if (nx >= M3.W || ny >= M3.H || cAt(nx, ny) < 0) continue;
      const t = M3.grid[y][x]; M3.grid[y][x] = M3.grid[ny][nx]; M3.grid[ny][nx] = t;  // probeweise tauschen
      const ok = runs().length > 0;
      const t2 = M3.grid[y][x]; M3.grid[y][x] = M3.grid[ny][nx]; M3.grid[ny][nx] = t2; // zurück
      if (ok) return true;
    }
  }
  return false;
}
function setFruitType(cell, type) {
  cell.c = type; const b = cell.mesh.userData.body;
  b.material.map = emojiTexture(FRUIT[type].emoji); b.material.needsUpdate = true;
}
function reshuffle() {
  const cells = [];
  for (let y = 0; y < M3.H; y++) for (let x = 0; x < M3.W; x++) { const c = M3.grid[y][x]; if (c && c.ice <= 0 && !c.s) cells.push(c); }
  for (let tries = 0; tries < 25; tries++) {
    cells.forEach(c => setFruitType(c, (rnd() * M3.C) | 0));
    if (runs().length === 0 && hasValidMove()) return true;
  }
  return hasValidMove();
}
function ensurePlayable() {
  if (hasValidMove()) return true;
  beep(300, .1); toast("🔀 Keine Züge — neu gemischt");
  return reshuffle();
}

function endMode(won) {
  if (M3.ended) return; M3.ended = true; M3.busy = true;
  const mode = M3.mode;
  if (won) {
    if (mode.id === "story") state.m3level = (state.m3level || 1) + 1;
    if (mode.id === "daily") { state.dailyDone = dateSeed(); state.dailyBest = Math.max(state.dailyBest || 0, M3.score); }
    if (mode.endless) state.endlessBest = Math.max(state.endlessBest || 0, M3.score);
    const reward = Math.max(10, Math.floor(M3.score / 7));
    beep(990, .2); minigameFinished(reward);
  } else { toast("Geschafft? Nicht ganz — probier's nochmal."); }
}
function swapCells(a, b) {
  const ca = M3.grid[a.y][a.x], cb = M3.grid[b.y][b.x];
  M3.grid[a.y][a.x] = cb; M3.grid[b.y][b.x] = ca;
  setTarget(ca, b.x, b.y); setTarget(cb, a.x, a.y);
}
function setTarget(cell, x, y) { const p = worldPos(x, y); cell.mesh.userData.tx = p.x; cell.mesh.userData.ty = p.y; }

// Farbe einer Zelle fürs Matching; vereiste (frozen) Zellen sind nicht matchbar (-1).
function cAt(x, y) { const cell = M3.grid[y][x]; return (!cell || cell.c == null || cell.ice > 0 || cell.locked) ? -1 : cell.c; }
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
        const next = cell.ice - 1;
        if (next <= 0) { iceShatter(nx, ny, cell.iceStyle); setIce(cell, 0); M3.iceLeft--; }
        else { setIce(cell, next); burst(nx, ny, 0xcde7ff, 4); beep(520, .05, "triangle"); }
      } else if (cell && cell.locked) {       // Schloss durch Nachbar-Match knacken
        seen.add(nk); setLock(cell, false); burst(nx, ny, 0xffd166, 5); beep(640, .06);
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
    const gained = Math.round(n * 12 * (1 + 0.25 * (combo - 1)));
    M3.score += gained;
    if (n > 0) scorePopup(b.x, b.y, "+" + gained + (combo > 1 ? " ×" + combo : ""),
      combo >= 3 ? "#ffd166" : "#ffffff", 0.55 + Math.min(0.55, combo * 0.13));
    spawns.forEach(s => {
      const col = s.kind === "color" ? 0xff5db0 : 0xffe066;
      flashAt(s.p.x, s.p.y, col); ringShock(s.p.x, s.p.y, col);
    });

    // Juice: "bigger action = bigger feedback" — Screenshake + Hit-Stop bei Spezial/Combo
    if (spawns.length) { M3.shake = 0.6; beep(180, .18, "sawtooth"); }
    else if (combo >= 3) { M3.shake = Math.max(M3.shake, 0.3); }
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
    for (; y >= 0; y--) M3.grid[y][x] = newCell((rnd() * M3.C) | 0, x, y, true);
  }
}
function updateM3Hud() {
  const mode = M3.mode || MODES.story;
  let left = `Punkte: <b>${M3.score}</b>`;
  if (M3.target !== Infinity) left += ` / ${M3.target}`;
  if (mode.ice) left += ` · 🧊 <b>${M3.iceLeft}</b>` + (M3.iceLeft > 0 && M3.iceStyle ? ` <span class="muted">(${M3.iceStyle.label})</span>` : "");
  $("m3left").innerHTML = left;
  $("m3right").innerHTML = M3.timed ? `⏱️ <b>${Math.ceil(M3.timeLeft)}s</b>` : `Züge: <b>${M3.moves === Infinity ? "∞" : M3.moves}</b>`;
}
function m3Finish() { endMode(M3.mode && M3.mode.endless ? true : false); }

// --- Weitere Blocker: Lock (Schloss) & Countdown-Bombe ---
const _numTex = {};
function numberTexture(n) {
  if (_numTex[n]) return _numTex[n];
  const s = 64, cv = document.createElement("canvas"); cv.width = cv.height = s; const ctx = cv.getContext("2d");
  ctx.fillStyle = "#fff"; ctx.font = "bold 44px system-ui,sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0,0,0,0.7)"; ctx.shadowBlur = 5; ctx.fillText(String(n), s / 2, s / 2 + 2);
  _numTex[n] = new T.CanvasTexture(cv); return _numTex[n];
}
function setLock(cell, on) {
  cell.locked = on; const g = cell.mesh;
  if (g.userData.lockMesh) { g.remove(g.userData.lockMesh); g.userData.lockMesh = null; }
  if (on) {
    const s = new T.Sprite(new T.SpriteMaterial({ map: emojiTexture("🔒"), transparent: true, depthWrite: false }));
    s.scale.setScalar(0.7); s.position.z = 0.18; s.renderOrder = 3; g.add(s); g.userData.lockMesh = s;
  }
}
function setBomb(cell, n) {
  cell.bomb = n; const g = cell.mesh;
  if (g.userData.bombParts) g.userData.bombParts.forEach(p => { g.remove(p); if (p.geometry) p.geometry.dispose(); });
  g.userData.bombParts = [];
  if (n > 0) {
    const ring = new T.Mesh(new T.TorusGeometry(0.52, 0.07, 8, 22),
      new T.MeshStandardMaterial({ color: 0x111111, emissive: 0xff3322, emissiveIntensity: 0.6 }));
    ring.renderOrder = 2; g.add(ring); g.userData.bombParts.push(ring);
    const num = new T.Sprite(new T.SpriteMaterial({ map: numberTexture(n), transparent: true, depthWrite: false }));
    num.scale.setScalar(0.6); num.position.set(0.28, 0.3, 0.25); num.renderOrder = 4; g.add(num); g.userData.bombParts.push(num);
  }
}
function tickBombs() {           // pro gültigem Zug: Countdown −1; 0 -> Explosion (verloren)
  let exploded = false;
  for (let y = 0; y < M3.H; y++) for (let x = 0; x < M3.W; x++) {
    const c = M3.grid[y][x];
    if (c && c.bomb > 0) { setBomb(c, c.bomb - 1); if (c.bomb <= 0) exploded = true; }
  }
  return exploded;
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
  BS.scene.environment = makeEnv(BS.renderer);
  BS.composer = makeComposer(BS.renderer, BS.scene, BS.cam, w, h);

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
  BS.composer.render();
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
window.startMode = startMode;
window.m3Finish = m3Finish;
window.M3MODES = MODES;
window.dateSeedVal = dateSeed;
window.startBallSort = startBallSort;
window.bsUndo = bsUndo;
})();
