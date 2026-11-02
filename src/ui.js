/* Sahne, animasyon, arayüz ve oyun akışı. */
const $ = id => document.getElementById(id);
const SAVE_KEY = 'cini-sancaklari-v1';
const load = () => { try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || null; } catch (e) { return null; } };
const store = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(run)); } catch (e) { /* kayıt isteğe bağlıdır */ } };
const freshRun = old => ({ stage: 0, deck: STARTER_DECK.slice(), best: old ? old.best || 0 : 0, muted: old ? !!old.muted : false });
let run = load();
if (!run || !Array.isArray(run.deck)) run = freshRun(run);

let R, G = null, V = {}, thumbs = {}, sel = null, busy = false, inDuel = false, parts = [], shake = 0, last = 0, time = 0;
const speed = { k: matchMedia('(prefers-reduced-motion: reduce)').matches ? .15 : 1 };
const tweens = [];
const tw = (ms, fn) => new Promise(res => { if (!ms) { fn(1); res(); return; } tweens.push({ t: 0, ms: ms * speed.k, fn, res }); });
const wait = ms => tw(ms, () => {});
const ease = t => t * t * (3 - 2 * t);
const wx = x => x - 1, wz = y => 2 - y;
const CASTLE_Z = { p: 3.25, e: -3.25 };

/* Küçük ses efektleri */
let ac = null;
function beep(f, ms = 90, type = 'triangle', v = .05) {
  if (run.muted) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = f; g.gain.value = v;
    g.gain.exponentialRampToValueAtTime(.0001, ac.currentTime + ms / 1000);
    o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + ms / 1000);
  } catch (e) { /* ses isteğe bağlıdır */ }
}
const SFX = { pick: () => beep(620, 60), play: () => { beep(330, 120); beep(495, 160); }, hit: () => beep(120, 130, 'sawtooth', .07), block: () => beep(880, 90, 'square', .03), heal: () => beep(740, 200, 'sine'), turn: () => beep(440, 140, 'sine'), win: () => [523, 659, 784].forEach((f, i) => setTimeout(() => beep(f, 240, 'sine'), i * 130)) };

function burst(x, y, z, col, n = 12, pow = 1) {
  for (let i = 0; i < n && parts.length < 90; i++) {
    const a = Math.random() * 6.28, s = (.6 + Math.random() * 1.5) * pow;
    parts.push({ x, y, z, vx: Math.cos(a) * s, vy: 1 + Math.random() * 2.5 * pow, vz: Math.sin(a) * s, life: .4 + Math.random() * .45, max: .85, s: .05 + Math.random() * .07, col });
  }
}

function floatText(x, y, z, text, cls) {
  const [px, py] = R.project(x, y, z), el = document.createElement('div');
  el.className = 'float ' + cls; el.textContent = text; el.style.left = px + 'px'; el.style.top = py + 'px';
  $('labels').append(el);
  setTimeout(() => el.remove(), 900);
}

function makeVisual(u) {
  const lab = document.createElement('div');
  lab.className = 'chip ' + u.side;
  lab.innerHTML = '<b class="a"></b><b class="h"></b>';
  $('labels').append(lab);
  V[u.id] = { id: u.id, key: u.key, side: u.side, x: wx(u.x), z: wz(u.y), y: 0, s: 1, rot: u.side === 'p' ? Math.PI : 0, home: u.side === 'p' ? Math.PI : 0, clip: null, ct: u.id * .37, flash: 0, a: 1, hp: u.hp, atk: u.atk, lab, seed: u.id * 1.7, shield: u.shield, frozen: 0, fly: (u.kw || []).includes('fly') };
  refreshChip(V[u.id]);
  return V[u.id];
}
function refreshChip(v) {
  const c = v.lab; c.querySelector('.a').textContent = v.atk; c.querySelector('.h').textContent = v.hp;
  c.classList.toggle('shielded', !!v.shield); c.classList.toggle('frozen', !!v.frozen);
}
function setClip(v, c) { v.clip = c; v.ct = 0; }
function clearVisuals() { Object.values(V).forEach(v => v.lab.remove()); V = {}; parts = []; }

function syncAll() {
  const alive = new Set(G.units.map(u => u.id));
  for (const id in V) if (!alive.has(+id)) { V[id].lab.remove(); delete V[id]; }
  for (const u of G.units) {
    const v = V[u.id] || makeVisual(u);
    v.x = wx(u.x); v.z = wz(u.y); v.y = 0; v.s = 1; v.a = 1; v.hp = u.hp; v.atk = u.atk; v.shield = u.shield; v.frozen = u.frozen;
    refreshChip(v);
  }
  renderHud();
}

async function playEvents() {
  const evs = G.ev; G.ev = [];
  for (const e of evs) await playEvent(e);
  syncAll();
}

async function playEvent(e) {
  const v = e.id ? V[e.id] : null;
  switch (e.k) {
    case 'summon': {
      const n = makeVisual(e.u); n.s = .01; n.y = 1.6; SFX.play();
      await tw(260, t => { n.s = .3 + ease(t) * .7; n.y = (1 - t) * (1 - t) * 1.6; });
      burst(n.x, .05, n.z, e.u.side === 'p' ? [.3, .9, .85] : [.95, .4, .3], 12); shake = .06; break;
    }
    case 'move': if (v) {
      setClip(v, 'walk');
      for (const [x, y] of e.path) {
        const sx = v.x, sz = v.z, tx = wx(x), tz = wz(y);
        v.rot = Math.atan2(tx - sx, tz - sz);
        await tw(220, t => { v.x = sx + (tx - sx) * t; v.z = sz + (tz - sz) * t; v.y = v.fly ? Math.sin(t * Math.PI) * .5 : 0; });
        beep(210, 35, 'triangle', .025);
      }
      setClip(v, null); v.rot = v.home;
    } break;
    case 'attack': if (v) {
      const tx = e.castle ? v.x : wx(e.x), tz = e.castle ? CASTLE_Z[other(e.side)] : wz(e.y);
      v.rot = Math.atan2(tx - v.x, tz - v.z);
      setClip(v, e.ranged ? 'holding-right-shoot' : 'attack-melee-right');
      if (e.ranged) {
        const b = { x: v.x, y: .7, z: v.z, k: 'bolt' }; beep(520, 80, 'square', .025);
        await tw(230, t => { b.x = v.x + (tx - v.x) * t; b.z = v.z + (tz - v.z) * t; b.y = .7 + Math.sin(t * Math.PI) * .9; burst(b.x, b.y, b.z, [1, .85, .45], 1, .2); });
      } else {
        const sx = v.x, sz = v.z, dx = (tx - sx) * .5, dz = (tz - sz) * (e.castle ? .3 : .5);
        await tw(120, t => { v.x = sx + dx * t * t; v.z = sz + dz * t * t; });
        tw(190, t => { v.x = sx + dx * (1 - t); v.z = sz + dz * (1 - t); }).then(() => { if (V[v.id]) { setClip(v, null); v.rot = v.home; } });
      }
      if (e.ranged) { setClip(v, null); v.rot = v.home; }
      break;
    }
    case 'dmg': if (v) {
      v.hp = e.hp; refreshChip(v); v.flash = 1; shake = .1; SFX.hit();
      burst(v.x, .6, v.z, [1, .75, .3], 10); floatText(v.x, 1.2, v.z, '-' + e.n, 'hurt');
      await wait(130);
    } break;
    case 'block': if (v) { v.shield = 0; refreshChip(v); SFX.block(); burst(v.x, .6, v.z, [.9, .95, 1], 12); floatText(v.x, 1.2, v.z, 'Engellendi', 'info'); await wait(170); } break;
    case 'death': if (v) {
      const c = v.side === 'p' ? [.3, .85, .8] : [.9, .35, .3]; burst(v.x, .5, v.z, c, 20, 1.1);
      setClip(v, 'die');
      await tw(420, t => { if (t > .6) { v.s = 1 - (t - .6) / .4; v.a = v.s; } });
      v.lab.remove(); delete V[e.id];
    } break;
    case 'heal': if (v) { v.hp = e.hp; refreshChip(v); SFX.heal(); burst(v.x, .5, v.z, [.5, 1, .6], 8, .5); floatText(v.x, 1.2, v.z, '+' + e.n, 'good'); await wait(150); } break;
    case 'buff': if (v) { v.atk = e.atk; refreshChip(v); SFX.heal(); burst(v.x, .6, v.z, [1, .85, .3], 14); floatText(v.x, 1.2, v.z, '+2 saldırı', 'info'); await wait(200); } break;
    case 'freeze': if (v) { v.frozen = 1; refreshChip(v); burst(v.x, .5, v.z, [.6, .9, 1], 14); await wait(120); } break;
    case 'thaw': if (v) { v.frozen = 0; refreshChip(v); } break;
    case 'castle': {
      const z = CASTLE_Z[e.side]; renderCastle(e.side, e.hp);
      if (e.n < 0) { shake = .22; SFX.hit(); burst(0, 1, z, [.9, .75, .55], 26, 1.4); floatText(0, 1.8, z, String(e.n), 'hurt'); } else if (e.n > 0) { SFX.heal(); burst(0, 1, z, [.5, 1, .6], 12); floatText(0, 1.8, z, '+' + e.n, 'good'); }
      await wait(260); break;
    }
    case 'spell': {
      const name = CARDS[e.card].name; banner(name, e.side === 'p' ? 'mine' : 'foe'); SFX.play();
      const col = { ates: [1, .5, .15], yildirim: [1, .9, .4], buz: [.6, .9, 1], sifa: [1, .45, .55], nara: [1, .8, .3], onarim: [.8, .75, .6], ulak: [.95, .9, .75] }[e.card];
      const tx = CARDS[e.card].target === 'none' ? 0 : wx(e.x), tz = CARDS[e.card].target === 'none' ? CASTLE_Z[e.side] : wz(e.y);
      if (e.card === 'yildirim') for (let y = 0; y < ROWS; y++) burst(tx, .4, wz(y), col, 8, 1.3); else burst(tx, .7, tz, col, 20, 1.2);
      await wait(e.side === 'e' ? 620 : 240); break;
    }
    case 'turn': {
      SFX.turn(); renderHud();
      const txt = e.side === 'p' ? 'Senin turun' : G.bossName + ' oynuyor';
      banner(e.altar ? txt + ' · Sunak +1 mana' : txt, e.side === 'p' ? 'mine' : 'foe');
      await wait(480); break;
    }
    case 'end': break;
  }
}

function banner(text, cls) {
  const b = $('banner'); b.textContent = text; b.className = cls; void b.offsetWidth; b.classList.add('show');
}

/* HUD ve el */
function renderCastle(s, hp) {
  const S = G.side[s], pct = Math.max(0, hp) / S.maxHp * 100;
  $(s + 'Hp').textContent = Math.max(0, hp); $(s + 'Bar').style.width = pct + '%';
}

function renderHud() {
  if (!G) return;
  renderCastle('p', G.side.p.hp); renderCastle('e', G.side.e.hp);
  const S = G.side.p;
  $('mana').textContent = S.mana + '/' + S.maxMana + (S.altar ? '+1' : '');
  $('manaPips').innerHTML = Array.from({ length: MANA_MAX + 1 }, (_, i) => `<i class="${i < S.mana ? 'on' : i < S.maxMana + (S.altar ? 1 : 0) ? 'spent' : ''}"></i>`).join('');
  $('round').textContent = 'Tur ' + G.round + (G.round >= SUDDEN_ROUND ? ' · Kaleler yıkılıyor' : '');
  $('eHand').textContent = G.side.e.hand.length;
  $('deckCount').textContent = S.deck.length;
  renderHand();
  const can = G.turn === 'p' && !G.winner && !busy, left = can && listActions(G).length > 0;
  $('endBtn').disabled = !can; $('endBtn').classList.toggle('ready', can && !left);
}

function cardHtml(key, extra = '') {
  const c = CARDS[key], kw = (c.kw || []).map(k => KW_LABELS[k]).join(' · ');
  const stats = c.type === 'unit' ? `<span class="st atk">${c.atk}</span><span class="st hp">${c.hp}</span>` : '<span class="st sp">Büyü</span>';
  return `<span class="cost">${c.cost}</span><span class="art"><img alt="" src="${thumbs[key] || ''}"></span><span class="nm">${c.name}</span><span class="stats">${stats}</span>${kw ? `<span class="kw">${kw}</span>` : ''}${extra}`;
}

function renderHand() {
  const box = $('hand'), S = G.side.p;
  box.innerHTML = '';
  S.hand.forEach((key, i) => {
    const b = document.createElement('button');
    const off = CARDS[key].cost > S.mana || G.turn !== 'p' || busy;
    b.className = 'card ' + CARDS[key].type + (off ? ' off' : '') + (sel && sel.card === i ? ' sel' : '');
    b.id = 'hc' + i; b.innerHTML = cardHtml(key);
    b.setAttribute('aria-label', CARDS[key].name + ', ' + CARDS[key].cost + ' mana. ' + CARDS[key].text);
    b.onclick = () => tapCard(i);
    box.append(b);
  });
}

function setInfo(html, action) {
  $('infoText').innerHTML = html;
  const b = $('actBtn'); b.hidden = !action;
  if (action) { b.textContent = action.label; b.onclick = action.fn; }
}
function idleInfo() {
  if (!G || G.turn !== 'p') { setInfo('Rakip düşünüyor.'); return; }
  setInfo(G.units.some(u => u.side === 'p' && !u.attacked && !u.frozen) ? 'Bir kart ya da birimini seç.' : 'Bir kart seç ya da turu bitir.');
}

function unitInfo(u) {
  const c = CARDS[u.key], state = u.frozen ? ' Donmuş.' : u.side === 'p' && u.attacked ? ' Bu tur hamlesini yaptı.' : '';
  return `<b>${c.name}</b> · Saldırı ${effAtk(G, u)} · Can ${u.hp}/${u.maxHp} · Menzil ${u.rng}<br>${c.text}${state}`;
}

function tapCard(i) {
  if (busy || G.turn !== 'p') return;
  const key = G.side.p.hand[i], c = CARDS[key];
  if (sel && sel.card === i) { sel = null; idleInfo(); renderHand(); return; }
  SFX.pick();
  sel = { card: i, key };
  const paid = c.cost <= G.side.p.mana;
  let text = `<b>${c.name}</b> · ${c.cost} mana<br>${c.text}`;
  if (!paid) { text += ` <em>${c.cost - G.side.p.mana} mana eksik.</em>`; sel = { card: i, key, view: true }; setInfo(text); renderHand(); return; }
  if (c.type === 'spell' && c.target === 'none') { setInfo(text, { label: 'Oyna', fn: () => act(() => play(G, i, 0, 0)) }); renderHand(); return; }
  const hasTarget = c.type === 'unit' ? summonTiles(G, 'p').length : spellTargets(G, 'p', key).length;
  setInfo(text + (hasTarget ? ' Parlayan kareye dokun.' : ' <em>Uygun hedef yok.</em>'));
  renderHand();
}

function highlights() {
  if (!G || G.turn !== 'p' || busy || !sel) return [];
  const out = [];
  if (sel.card !== undefined && !sel.view) {
    const c = CARDS[sel.key];
    if (c.type === 'unit') summonTiles(G, 'p').forEach(t => out.push({ ...t, c: [.55, 1, .9] }));
    else if (c.target === 'lane') spellTargets(G, 'p', sel.key).forEach(t => { for (let y = 0; y < ROWS; y++) out.push({ x: t.x, y, c: [1, .85, .35] }); });
    else spellTargets(G, 'p', sel.key).forEach(t => out.push({ ...t, c: c.target === 'ally' ? [.55, 1, .6] : [1, .35, .3] }));
  }
  if (sel.unit) {
    const u = unitById(G, sel.unit);
    if (u && u.side === 'p') {
      out.push({ x: u.x, y: u.y, c: [1, .85, .35] });
      Object.keys(reach(G, u)).forEach(k => { const [x, y] = k.split(',').map(Number); out.push({ x, y, c: [.55, 1, .9] }); });
      targets(G, u).forEach(t => { if (t.id) { const o = unitById(G, t.id); out.push({ x: o.x, y: o.y, c: [1, .35, .3] }); } });
    }
  }
  return out;
}

function castleTargetable() {
  if (!G || !sel || !sel.unit || busy || G.turn !== 'p') return false;
  const u = unitById(G, sel.unit);
  return !!u && targets(G, u).some(t => t.castle);
}

async function act(fn) {
  if (busy) return false;
  const ok = fn();
  if (!ok) return false;
  sel = null; busy = true; renderHud(); setInfo('');
  await playEvents();
  busy = false;
  if (G.winner) return finish();
  renderHud(); idleInfo();
  return true;
}

function pick(px, py) {
  // Önce görünen birimler, sonra zemin
  let best = null, bd = 34;
  for (const id in V) {
    const v = V[id], [sx, sy] = R.project(v.x, .45, v.z), d = Math.hypot(sx - px, sy - py);
    if (d < bd) { bd = d; best = v; }
  }
  if (best) { const u = unitById(G, best.id); if (u) return { x: u.x, y: u.y }; }
  const [gx, gz] = R.ground(px, py), x = Math.round(gx + 1), y = Math.round(2 - gz);
  if (x >= -1 && x <= 3 && y >= 5 && y <= 6) return { castle: true };
  return inside(x, y) ? { x, y } : null;
}

function tapBoard(px, py) {
  if (!G || busy || G.winner || !inDuel) return;
  const t = pick(px, py);
  if (!t) { sel = null; idleInfo(); renderHand(); return; }
  if (t.castle) {
    if (castleTargetable()) act(() => attack(G, sel.unit, { castle: true }));
    else setInfo(`<b>${G.bossName}</b> · Kale ${G.side.e.hp}/${G.side.e.maxHp}<br>Kaleye yalnızca menzildeki birimlerin vurabilir.`);
    return;
  }
  const at = unitAt(G, t.x, t.y);
  if (G.turn === 'p' && sel && sel.card !== undefined && !sel.view) {
    const i = sel.card, c = CARDS[sel.key];
    const yes = c.type === 'unit' ? summonTiles(G, 'p').some(q => q.x === t.x && q.y === t.y)
      : c.target === 'lane' ? spellTargets(G, 'p', sel.key).some(q => q.x === t.x)
        : spellTargets(G, 'p', sel.key).some(q => q.x === t.x && q.y === t.y);
    if (yes) { act(() => play(G, i, t.x, t.y)); return; }
  }
  if (G.turn === 'p' && sel && sel.unit) {
    const u = unitById(G, sel.unit);
    if (u) {
      if (at && at.side === 'e' && targets(G, u).some(q => q.id === at.id)) { act(() => attack(G, u.id, { id: at.id })); return; }
      if (!at && reach(G, u)[t.x + ',' + t.y]) {
        const id = u.id; sel = null; moveAndKeep(id, t.x, t.y); return;
      }
    }
  }
  if (at) {
    SFX.pick(); sel = at.side === 'p' ? { unit: at.id } : null;
    let extra = null;
    if (sel && castleTargetable()) extra = { label: 'Kaleye vur', fn: () => act(() => attack(G, at.id, { castle: true })) };
    setInfo(unitInfo(at), extra); renderHand(); return;
  }
  if (t.x === ALTAR.x && t.y === ALTAR.y) { sel = null; setInfo('<b>Sunak</b><br>Turunun başında üzerinde birimin varsa +1 mana kazanırsın.'); renderHand(); return; }
  sel = null; idleInfo(); renderHand();
}

/* Hareketten sonra birim seçili kalır, böylece saldırabilir. */
async function moveAndKeep(id, x, y) {
  await act(() => moveUnit(G, id, x, y));
  const u = G && !G.winner ? unitById(G, id) : null;
  if (!u) return;
  if (targets(G, u).length) {
    sel = { unit: id };
    setInfo(unitInfo(u), castleTargetable() ? { label: 'Kaleye vur', fn: () => act(() => attack(G, id, { castle: true })) } : null);
  }
}

async function enemyTurn() {
  busy = true; renderHud(); setInfo('Rakip düşünüyor.');
  await playEvents();
  let guard = 0;
  while (G && !G.winner && G.turn === 'e' && guard++ < 30) {
    await wait(260);
    const a = aiChoose(G, G.noise);
    if (!a) break;
    apply(G, a);
    await playEvents();
  }
  if (!G) return;
  if (!G.winner) { endTurn(G); await playEvents(); }
  busy = false;
  if (G.winner) return finish();
  renderHud(); idleInfo();
}

function endPlayerTurn() {
  if (busy || !G || G.turn !== 'p' || G.winner) return;
  sel = null; endTurn(G); enemyTurn();
}

/* Ekranlar */
function show(id) {
  document.querySelectorAll('.screen').forEach(s => { s.hidden = s.id !== id; });
  document.body.classList.toggle('playing', id === null);
}

function renderTitle() {
  $('stages').innerHTML = BOSSES.map((b, i) => `<li class="${i < run.stage ? 'done' : i === run.stage ? 'now' : ''}"><span>${i + 1}</span><b>${b.name}</b><small>Kale ${b.hp}</small></li>`).join('');
  $('startBtn').textContent = run.stage ? (run.stage + 1) + '. düelloya devam et' : 'Düelloya başla';
  $('resetBtn').hidden = !run.stage;
  $('bestText').textContent = run.best ? 'En iyi sefer: ' + run.best + ' / ' + BOSSES.length + ' bey' : 'Beş beyi yen, çini meydanını kazan.';
  $('deckLine').textContent = 'Destende ' + run.deck.length + ' kart var.';
  $('muteBtn').textContent = run.muted ? 'Sesi aç' : 'Sesi kapat';
}

function startDuel() {
  const b = BOSSES[run.stage];
  clearVisuals(); G = newGame(run.deck, b); G.bossName = b.name; G.noise = b.noise;
  inDuel = true; sel = null; busy = false;
  $('eName').textContent = b.name;
  show(null); syncAll(); G.ev = []; idleInfo();
  banner(run.stage + 1 + '. düello: ' + b.name, 'foe');
}

function finish() {
  inDuel = false; const won = G.winner === 'p';
  if (won) {
    SFX.win(); run.stage++; run.best = Math.max(run.best || 0, run.stage);
    if (run.stage >= BOSSES.length) { const best = run.best, m = run.muted; run = freshRun({ best, muted: m }); store(); return endScreen('Meydan senin', 'Beş beyi de yendin. Çini sancakların artık bozkırın her yanında dalgalanıyor.', 'Yeni sefere başla', toTitle); }
    store();
    const pool = Object.keys(CARDS).filter(k => CARDS[k].cost >= 2 || CARDS[k].type === 'spell'), opts = [];
    while (opts.length < 3) { const k = pool[Math.floor(Math.random() * pool.length)]; if (!opts.includes(k)) opts.push(k); }
    $('rewards').innerHTML = '';
    opts.forEach((k, i) => {
      const b = document.createElement('button'); b.className = 'card big ' + CARDS[k].type; b.id = 'rw' + i;
      b.innerHTML = cardHtml(k, `<span class="tx">${CARDS[k].text}</span>`);
      b.onclick = () => { run.deck.push(k); store(); SFX.play(); toTitle(); };
      $('rewards').append(b);
    });
    show('rewardScreen');
  } else {
    const best = run.best, m = run.muted, st = run.stage; run = freshRun({ best, muted: m }); store();
    endScreen('Kalen düştü', `${st} bey yendin. Yeni sefer başlangıç destesiyle başlar.`, 'Ana ekrana dön', toTitle);
  }
}

function endScreen(t, p, label, fn) { $('endTitle').textContent = t; $('endText').textContent = p; $('endGo').textContent = label; $('endGo').onclick = fn; show('endScreen'); }
function toTitle() { inDuel = false; G = null; clearVisuals(); renderTitle(); show('titleScreen'); }

/* Sahne döngüsü */
const FIT = [[-1.75, 0, 3], [1.75, 0, 3], [-1.75, 0, -2.7], [1.75, 0, -2.7], [-2.1, 2.5, -3.4], [2.1, 2.5, -3.4]];
const CAM_DIR = [0, .76, .65], FOV = .62;
let fit = { key: '', d: 16, sx: 0, sy: 0 };

/* Tahtayı üst bilgi ile kart bölgesinin arasına sığdıran uzaklığı ve kaymayı bulur. */
function fitCamera() {
  const c = R.canvas, W = c.clientWidth, H = c.clientHeight, dock = $('dock').getBoundingClientRect(), side = innerWidth > innerHeight && dock.width < W * .7;
  const key = [W, H, Math.round(dock.width), Math.round(dock.height), inDuel].join();
  if (key === fit.key) return;
  fit.key = key;
  const x0 = side ? dock.right : 0, y0 = 54, y1 = side ? H : Math.max(y0 + 120, dock.top + 16);
  const rw = W - x0, rh = y1 - y0;
  fit.sx = (2 * x0 + rw) / W - 1; fit.sy = 1 - (y0 + y1) / H;
  let d = 16;
  for (let i = 0; i < 4; i++) {
    R.camera(CAM_DIR.map(v => v * d), [0, 0, 0], FOV, W / H);
    const pts = FIT.map(p => R.project(p[0], p[1], p[2])), xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    d *= Math.max((Math.max(...xs) - Math.min(...xs)) / (rw - 8), (Math.max(...ys) - Math.min(...ys)) / (rh - 8));
  }
  // Küçük bir düzeltme: yansıtılan kutuyu tam ortala
  R.camera(CAM_DIR.map(v => v * d), [0, 0, 0], FOV, W / H, fit.sx, fit.sy);
  const pts = FIT.map(p => R.project(p[0], p[1], p[2])), ys = pts.map(p => p[1]);
  fit.sy += ((Math.min(...ys) + Math.max(...ys)) / 2 - (y0 + y1) / 2) * 2 / H;
  fit.d = d;
}

function setCamera() {
  const c = R.canvas, asp = c.clientWidth / Math.max(1, c.clientHeight), title = !inDuel && !G;
  let eye, sx = 0, sy = 0;
  if (title) {
    const a = time * .12, d = Math.max(13, 13 / asp * .62);
    eye = [Math.sin(a) * d * .53, d * .85, Math.cos(a) * d * .53];
  } else {
    fitCamera();
    eye = CAM_DIR.map(v => v * fit.d); sx = fit.sx; sy = fit.sy;
  }
  if (shake > .001) { eye[0] += (Math.random() - .5) * shake; eye[1] += (Math.random() - .5) * shake; }
  R.camera(eye, [0, 0, 0], FOV, asp, sx, sy);
}

function frame(ts) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (ts - last) / 1000 || .016); last = ts; time += dt;
  for (let i = tweens.length - 1; i >= 0; i--) {
    const w = tweens[i]; w.t += dt * 1000; const t = Math.min(1, w.t / w.ms); w.fn(t);
    if (t >= 1) { tweens.splice(i, 1); w.res(); }
  }
  shake *= .86;
  R.resize(); setCamera(); R.clear(.29, .24, .39, 1);
  const gl = R.gl;
  R.draw('board', M4.trs(0, 0, 0, 0, 1));
  R.draw('castle_p', M4.trs(0, 0, 3.45, Math.PI, 1));
  R.draw('castle_e', M4.trs(0, 0, -3.45, 0, 1));
  if (!G || !unitAt(G, ALTAR.x, ALTAR.y)) R.draw('coin', M4.trs(0, .14 + Math.sin(time * 1.6) * .04, 0, time * 1.1, .9));
  const list = Object.values(V);
  for (const v of list) {
    v.ct += dt;
    const air = v.fly ? .22 + Math.sin(time * 1.8 + v.seed) * .05 : 0;
    const tint = v.flash > .01 ? [1, .3, .2, v.flash * .75] : v.frozen ? [.6, .88, 1, .42] : null;
    drawUnit(R, v.key, v.side, v.x, v.y + air, v.z, v.rot, v.s, v.clip, v.ct, tint);
    v.flash *= .88;
  }
  gl.enable(gl.BLEND); gl.depthMask(false); gl.disable(gl.CULL_FACE);
  for (const v of list) R.draw('disc', M4.trs(v.x, .03, v.z, 0, .62 * v.s), null, .28 * v.a, true);
  const pulse = .3 + Math.sin(time * 5) * .1;
  for (const h of highlights()) R.draw('tile', M4.trs(wx(h.x), .035, wz(h.y), 0, .92), [h.c[0], h.c[1], h.c[2], 1], pulse + .12, true);
  if (castleTargetable()) R.draw('tile', M4.trs(0, .4, -3.1, 0, 3.2, 1, .5), [1, .35, .3, 1], pulse + .1, true);
  gl.disable(gl.BLEND); gl.depthMask(true); gl.enable(gl.CULL_FACE);
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]; p.life -= dt; p.vy -= 6 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    if (p.life <= 0) { parts.splice(i, 1); continue; }
    R.draw('cube', M4.trs(p.x, Math.max(.02, p.y), p.z, p.life * 8, p.s * Math.min(1, p.life * 3)), [p.col[0], p.col[1], p.col[2], 1], 1, true);
  }
  for (const v of list) {
    const [sx, sy] = R.project(v.x, v.y - .02, v.z + .34);
    v.lab.style.transform = `translate(${sx.toFixed(1)}px,${sy.toFixed(1)}px) translate(-50%,-30%)`;
    v.lab.style.opacity = v.a;
  }
}

function makeThumbs() {
  const c = document.createElement('canvas'); c.width = c.height = 168;
  let T;
  try { T = new Renderer(c); } catch (e) { return; }
  Object.defineProperty(c, 'clientWidth', { value: 168 }); Object.defineProperty(c, 'clientHeight', { value: 168 });
  buildAllMeshes(T); T.resize();
  const tall = { dev: 1.65, ejder: 1.4, akinci: 1.7, sancak: 1.55, mancinik: 1.2, sifaci: 1.4, sipahi: 1.25 };
  for (const k in CARDS) {
    T.clear(0, 0, 0, 0);
    const h = tall[k] || 1.12;
    T.camera([1.05 * h, h * .92, 2.25 * h], [0, h * .5, 0], .62, 1);
    if (CARDS[k].type === 'unit') drawUnit(T, k, 'p', 0, 0, 0, -.25, 1, null, .4); else T.draw(k + '_p', M4.trs(0, 0, 0, -.25, 1));
    thumbs[k] = c.toDataURL('image/png');
  }
  const ext = T.gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext();
}

function boot() {
  try { R = new Renderer($('scene')); buildAllMeshes(R); } catch (e) {
    $('titleScreen').hidden = true; $('noGl').hidden = false; return;
  }
  makeThumbs();
  $('startBtn').onclick = () => { beep(1, 1); startDuel(); };
  $('resetBtn').onclick = () => { const ok = $('resetBtn').dataset.sure; if (ok) { const best = run.best, m = run.muted; run = freshRun({ best, muted: m }); store(); delete $('resetBtn').dataset.sure; $('resetBtn').textContent = 'Seferi sıfırla'; renderTitle(); } else { $('resetBtn').dataset.sure = '1'; $('resetBtn').textContent = 'Emin misin? Tekrar dokun'; } };
  $('rulesBtn').onclick = () => { $('rules').hidden = !$('rules').hidden; };
  $('muteBtn').onclick = () => { run.muted = !run.muted; store(); renderTitle(); };
  $('endBtn').onclick = endPlayerTurn;
  $('quitBtn').onclick = () => { if (busy) return; const b = $('quitBtn'); if (b.dataset.sure) { delete b.dataset.sure; b.textContent = 'Çık'; toTitle(); } else { b.dataset.sure = '1'; b.textContent = 'Emin misin?'; setTimeout(() => { delete b.dataset.sure; b.textContent = 'Çık'; }, 2500); } };
  let down = null;
  const cv = $('scene');
  cv.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
  cv.addEventListener('pointerup', e => { if (down && Math.hypot(e.clientX - down[0], e.clientY - down[1]) < 16) { const r = cv.getBoundingClientRect(); tapBoard(e.clientX - r.left, e.clientY - r.top); } down = null; });
  renderTitle(); show('titleScreen');
  window.__cini = { thumbs, CARDS, sync: syncAll, get G() { return G; }, get busy() { return busy; }, speed, project: (x, y) => R.project(wx(x), .45, wz(y)), get run() { return run; } };
  requestAnimationFrame(frame);
}
boot();
