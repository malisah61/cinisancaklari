/* Oyun kuralları: DOM ve WebGL kullanmaz, Node'da da test edilir. */
const COLS = 3, ROWS = 5, ALTAR = { x: 1, y: 2 }, SUDDEN_ROUND = 24, HAND_MAX = 7, MANA_MAX = 8;

const CARDS = {
  capulcu:  { name: 'Çapulcu',    type: 'unit', cost: 1, atk: 2, hp: 1, spd: 1, rng: 1, text: 'Ucuz ve hızlı bir öncü.' },
  kalkan:   { name: 'Kalkanlı',   type: 'unit', cost: 2, atk: 1, hp: 4, spd: 1, rng: 1, kw: ['shield'], text: 'Kalkan: İlk darbeyi tamamen engeller.' },
  okcu:     { name: 'Okçu',       type: 'unit', cost: 2, atk: 2, hp: 2, spd: 1, rng: 2, text: 'Menzil 2: Karşılık almadan vurur.' },
  akinci:   { name: 'Akıncı',     type: 'unit', cost: 3, atk: 3, hp: 2, spd: 2, rng: 1, kw: ['charge'], text: 'Hücum: Geldiği tur hareket edip saldırır.' },
  sifaci:   { name: 'Şifacı',     type: 'unit', cost: 3, atk: 1, hp: 3, spd: 1, rng: 1, kw: ['healer'], text: 'Her tur başında komşu dostları 2 iyileştirir.' },
  sancak:   { name: 'Sancaktar',  type: 'unit', cost: 3, atk: 2, hp: 3, spd: 1, rng: 1, kw: ['aura'], text: 'Komşu dostlara +1 saldırı verir.' },
  sipahi:   { name: 'Sipahi',     type: 'unit', cost: 4, atk: 4, hp: 4, spd: 1, rng: 1, text: 'Dengeli ve güçlü bir savaşçı.' },
  mancinik: { name: 'Mancınık',   type: 'unit', cost: 5, atk: 3, hp: 3, spd: 1, rng: 3, kw: ['siege'], text: 'Menzil 3. Kaleye iki kat hasar verir.' },
  dev:      { name: 'Taş Dev',    type: 'unit', cost: 6, atk: 6, hp: 7, spd: 1, rng: 1, text: 'Yavaş ama durdurması çok zor.' },
  ejder:    { name: 'Ejder',      type: 'unit', cost: 8, atk: 6, hp: 6, spd: 2, rng: 1, kw: ['fly', 'charge'], text: 'Uçar ve birimlerin üstünden geçer. Hücum.' },
  ates:     { name: 'Ateş Topu',  type: 'spell', cost: 2, target: 'enemy', text: 'Bir düşman birimine 3 hasar verir.' },
  yildirim: { name: 'Yıldırım',   type: 'spell', cost: 4, target: 'lane', text: 'Seçilen sütundaki düşmanlara 2 hasar verir.' },
  buz:      { name: 'Buz Büyüsü', type: 'spell', cost: 2, target: 'enemy', text: '1 hasar verir ve düşmanı bir tur dondurur.' },
  sifa:     { name: 'Şifa Suyu',  type: 'spell', cost: 1, target: 'ally', text: 'Bir dost birimi 4 iyileştirir.' },
  nara:     { name: 'Savaş Narası', type: 'spell', cost: 2, target: 'ally', text: 'Bir dost birime kalıcı +2 saldırı verir.' },
  onarim:   { name: 'Kale Onarımı', type: 'spell', cost: 2, target: 'none', text: 'Kalene 5 can kazandırır.' },
  ulak:     { name: 'Ulak',       type: 'spell', cost: 1, target: 'none', text: '2 kart çeker.' }
};

const KW_LABELS = { shield: 'Kalkan', charge: 'Hücum', healer: 'Şifa', aura: 'Aura', siege: 'Kuşatma', fly: 'Uçar' };

const STARTER_DECK = ['capulcu', 'capulcu', 'capulcu', 'kalkan', 'kalkan', 'okcu', 'okcu', 'akinci', 'sancak', 'sipahi',
  'sipahi', 'ates', 'ates', 'sifa', 'ulak', 'onarim'];

const BOSSES = [
  { name: 'Çoban Beyi', hp: 15, noise: 4.5, deck: ['capulcu', 'capulcu', 'capulcu', 'capulcu', 'kalkan', 'kalkan', 'okcu', 'okcu', 'sancak', 'sipahi', 'sifa', 'ulak', 'capulcu', 'kalkan'] },
  { name: 'Haydut Reisi', hp: 18, noise: 3, deck: ['capulcu', 'capulcu', 'akinci', 'akinci', 'akinci', 'okcu', 'okcu', 'sipahi', 'sipahi', 'ates', 'ates', 'ulak', 'kalkan', 'sancak', 'nara', 'capulcu'] },
  { name: 'Buz Cadısı', hp: 20, noise: 2, deck: ['buz', 'buz', 'buz', 'ates', 'ates', 'yildirim', 'kalkan', 'kalkan', 'sifaci', 'sifaci', 'okcu', 'okcu', 'sipahi', 'ulak', 'ulak', 'onarim'] },
  { name: 'Kuşatma Paşası', hp: 20, noise: 1.5, deck: ['mancinik', 'mancinik', 'kalkan', 'kalkan', 'kalkan', 'sancak', 'sancak', 'sipahi', 'sipahi', 'okcu', 'okcu', 'dev', 'ates', 'nara', 'onarim', 'ulak'] },
  { name: 'Ejder Hanı', hp: 24, noise: 1, deck: ['ejder', 'ejder', 'dev', 'dev', 'sipahi', 'sipahi', 'akinci', 'akinci', 'sancak', 'sifaci', 'kalkan', 'kalkan', 'okcu', 'ates', 'ates', 'yildirim', 'nara', 'ulak'] }
];

const other = s => (s === 'p' ? 'e' : 'p');
const shuffled = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const dist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const inside = (x, y) => x >= 0 && x < COLS && y >= 0 && y < ROWS;
const has = (u, k) => (u.kw || []).includes(k);
const castleDist = u => (u.side === 'p' ? ROWS - u.y : u.y + 1);
const unitAt = (G, x, y) => G.units.find(u => u.x === x && u.y === y);
const unitById = (G, id) => G.units.find(u => u.id === id);

function newGame(playerDeck, boss) {
  const G = {
    turn: 'p', round: 0, winner: null, nextId: 1, units: [], ev: [],
    side: {
      p: { hp: 20, maxHp: 20, mana: 0, maxMana: 0, deck: shuffled(playerDeck), hand: [], used: [] },
      e: { hp: boss.hp, maxHp: boss.hp, mana: 0, maxMana: 0, deck: shuffled(boss.deck), hand: [], used: [] }
    }
  };
  for (let i = 0; i < 4; i++) { draw(G, 'p'); draw(G, 'e'); }
  draw(G, 'e');
  G.ev = [];
  startTurn(G, 'p');
  return G;
}

function draw(G, s) {
  const S = G.side[s];
  if (!S.deck.length) { S.deck = shuffled(S.used); S.used = []; }
  if (!S.deck.length) return;
  const c = S.deck.pop();
  if (S.hand.length >= HAND_MAX) { S.used.push(c); return; }
  S.hand.push(c);
}

function effAtk(G, u) {
  let a = u.atk;
  for (const o of G.units) if (o.side === u.side && o !== u && has(o, 'aura') && dist(o, u) === 1) a++;
  return a;
}

function hurtCastle(G, s, n) {
  const S = G.side[s];
  S.hp = Math.max(0, S.hp - n);
  G.ev.push({ k: 'castle', side: s, n: -n, hp: S.hp });
  if (S.hp <= 0 && !G.winner) { G.winner = other(s); G.ev.push({ k: 'end', winner: G.winner }); }
}

function hurt(G, u, n) {
  if (u.shield) { u.shield = 0; G.ev.push({ k: 'block', id: u.id }); return; }
  u.hp -= n;
  G.ev.push({ k: 'dmg', id: u.id, n, hp: u.hp });
  if (u.hp <= 0) { G.units = G.units.filter(o => o !== u); G.ev.push({ k: 'death', id: u.id }); }
}

function heal(G, u, n) {
  const h = Math.min(n, u.maxHp - u.hp);
  if (h > 0) { u.hp += h; G.ev.push({ k: 'heal', id: u.id, n: h, hp: u.hp }); }
}

function startTurn(G, s) {
  if (G.winner) return;
  G.turn = s;
  if (s === 'p') G.round++;
  const S = G.side[s];
  S.maxMana = Math.min(MANA_MAX, S.maxMana + 1);
  const holder = unitAt(G, ALTAR.x, ALTAR.y);
  S.altar = !!(holder && holder.side === s);
  S.mana = S.maxMana + (S.altar ? 1 : 0);
  G.ev.push({ k: 'turn', side: s, round: G.round, altar: S.altar });
  draw(G, s);
  for (const u of G.units.filter(o => o.side === s)) {
    u.moved = u.attacked = false;
    if (u.frozen) { u.frozen = 0; u.moved = u.attacked = true; G.ev.push({ k: 'thaw', id: u.id }); }
    if (has(u, 'healer')) for (const o of G.units.filter(a => a.side === s && dist(a, u) === 1)) heal(G, o, 2);
  }
  if (G.round >= SUDDEN_ROUND) hurtCastle(G, s, 2);
}

function endTurn(G) {
  if (G.winner) return false;
  startTurn(G, other(G.turn));
  return true;
}

/* Birimin ulaşabileceği boş kareler: { "x,y": [yol] } */
function reach(G, u) {
  const out = {};
  if (u.moved || u.attacked || u.side !== G.turn) return out;
  const seen = { [u.x + ',' + u.y]: [] };
  let front = [[u.x, u.y]];
  for (let step = 0; step < u.spd; step++) {
    const next = [];
    for (const [x, y] of front) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, key = nx + ',' + ny;
        if (!inside(nx, ny) || key in seen) continue;
        const occ = unitAt(G, nx, ny);
        if (occ && !has(u, 'fly')) continue;
        seen[key] = seen[x + ',' + y].concat([[nx, ny]]);
        next.push([nx, ny]);
        if (!occ) out[key] = seen[key];
      }
    }
    front = next;
  }
  return out;
}

/* Birimin bulunduğu kareden vurabileceği hedefler. */
function targets(G, u, from) {
  const p = { x: from ? from.x : u.x, y: from ? from.y : u.y, side: u.side };
  const out = [];
  if (u.attacked || u.atk <= 0 || u.side !== G.turn) return out;
  for (const o of G.units) if (o.side !== u.side && dist(p, o) <= u.rng) out.push({ id: o.id });
  if (castleDist(p) <= u.rng) out.push({ castle: true });
  return out;
}

function summonTiles(G, s) {
  const rows = s === 'p' ? [0, 1] : [ROWS - 1, ROWS - 2], out = [];
  for (const y of rows) for (let x = 0; x < COLS; x++) if (!unitAt(G, x, y)) out.push({ x, y });
  return out;
}

function spellTargets(G, s, card) {
  const c = CARDS[card];
  if (c.target === 'enemy') return G.units.filter(u => u.side !== s).map(u => ({ x: u.x, y: u.y }));
  if (c.target === 'ally') return G.units.filter(u => u.side === s).map(u => ({ x: u.x, y: u.y }));
  if (c.target === 'lane') return [0, 1, 2].filter(x => G.units.some(u => u.side !== s && u.x === x)).map(x => ({ x, y: 2 }));
  return [];
}

function canPay(G, idx) {
  const S = G.side[G.turn], card = S.hand[idx];
  return !!card && CARDS[card].cost <= S.mana;
}

function play(G, idx, x, y) {
  const s = G.turn, S = G.side[s], key = S.hand[idx];
  if (G.winner || !canPay(G, idx)) return false;
  const c = CARDS[key];
  if (c.type === 'unit') {
    if (!summonTiles(G, s).some(t => t.x === x && t.y === y)) return false;
    pay(S, idx, c);
    const u = {
      id: G.nextId++, key, side: s, x, y, atk: c.atk, hp: c.hp, maxHp: c.hp, spd: c.spd, rng: c.rng, kw: c.kw || [],
      shield: (c.kw || []).includes('shield') ? 1 : 0, frozen: 0, moved: true, attacked: true
    };
    if (has(u, 'charge')) u.moved = u.attacked = false;
    G.units.push(u);
    G.ev.push({ k: 'summon', u: Object.assign({}, u) });
    return true;
  }
  if (c.target !== 'none' && !spellTargets(G, s, key).some(t => t.x === x && (c.target === 'lane' || t.y === y))) return false;
  pay(S, idx, c);
  G.ev.push({ k: 'spell', card: key, side: s, x, y });
  const tgt = c.target === 'enemy' || c.target === 'ally' ? unitAt(G, x, y) : null;
  if (key === 'ates') hurt(G, tgt, 3);
  if (key === 'buz') { tgt.frozen = 1; G.ev.push({ k: 'freeze', id: tgt.id }); hurt(G, tgt, 1); }
  if (key === 'sifa') heal(G, tgt, 4);
  if (key === 'nara') { tgt.atk += 2; G.ev.push({ k: 'buff', id: tgt.id, atk: tgt.atk }); }
  if (key === 'onarim') { const n = Math.min(5, S.maxHp - S.hp); S.hp += n; G.ev.push({ k: 'castle', side: s, n, hp: S.hp }); }
  if (key === 'ulak') { draw(G, s); draw(G, s); }
  if (key === 'yildirim') for (const u of G.units.filter(o => o.side !== s && o.x === x)) hurt(G, u, 2);
  return true;
}

function pay(S, idx, c) {
  S.mana -= c.cost;
  S.used.push(S.hand[idx]);
  S.hand.splice(idx, 1);
}

function moveUnit(G, id, x, y) {
  const u = unitById(G, id);
  if (!u || G.winner) return false;
  const path = reach(G, u)[x + ',' + y];
  if (!path) return false;
  u.x = x; u.y = y; u.moved = true;
  G.ev.push({ k: 'move', id, path, side: u.side });
  return true;
}

function attack(G, id, tgt) {
  const u = unitById(G, id);
  if (!u || G.winner) return false;
  const ok = targets(G, u).some(t => (tgt.castle ? t.castle : t.id === tgt.id));
  if (!ok) return false;
  u.moved = u.attacked = true;
  const dmg = effAtk(G, u);
  if (tgt.castle) {
    G.ev.push({ k: 'attack', id, castle: true, ranged: u.rng > 1, side: u.side });
    hurtCastle(G, other(u.side), has(u, 'siege') ? dmg * 2 : dmg);
    return true;
  }
  const d = unitById(G, tgt.id), adjacent = dist(u, d) === 1;
  G.ev.push({ k: 'attack', id, tid: d.id, x: d.x, y: d.y, ranged: u.rng > 1, side: u.side });
  hurt(G, d, dmg);
  if (adjacent && d.hp > 0 && u.hp > 0) {
    const back = effAtk(G, d);
    if (back > 0) { G.ev.push({ k: 'attack', id: d.id, tid: u.id, x: u.x, y: u.y, ranged: false, side: d.side, back: true }); hurt(G, u, back); }
  }
  return true;
}

/* Yapay zekâ: olası hamleleri kopya üzerinde dener, en iyi tahtayı seçer. */
function evaluate(G, s) {
  if (G.winner) return G.winner === s ? 9999 : -9999;
  const me = G.side[s], foe = G.side[other(s)];
  let v = (me.hp - foe.hp * 1.2) * 2.5 + (me.hp < 8 ? me.hp - 8 : 0) * 2 + (foe.hp < 8 ? 8 - foe.hp : 0) * 2 + me.hand.length * 0.4;
  for (const u of G.units) {
    const worth = effAtk(G, u) * 1.3 + u.hp * 0.9 + u.shield * 1.5 + CARDS[u.key].cost * 0.4 - (u.frozen ? 2 : 0);
    const pressure = Math.max(0, 5 - castleDist(u)) * (0.3 + effAtk(G, u) * 0.18);
    const altar = u.x === ALTAR.x && u.y === ALTAR.y ? 2.5 : 0;
    v += (u.side === s ? 1 : -1) * (worth + pressure + altar);
  }
  return v;
}

function apply(G, a) {
  if (a.t === 'play') return play(G, a.i, a.x, a.y);
  let ok = true;
  if (a.to) ok = moveUnit(G, a.id, a.to.x, a.to.y);
  if (ok && a.tgt) ok = attack(G, a.id, a.tgt);
  return ok;
}

function listActions(G) {
  const s = G.turn, S = G.side[s], out = [];
  [...new Set(S.hand)].forEach(card => {
    const i = S.hand.indexOf(card), c = CARDS[card];
    if (c.cost > S.mana) return;
    const spots = c.type === 'unit' ? summonTiles(G, s) : c.target === 'none' ? [{ x: 0, y: 0 }] : spellTargets(G, s, card);
    for (const t of spots) out.push({ t: 'play', i, x: t.x, y: t.y });
  });
  for (const u of G.units.filter(o => o.side === s && !o.attacked && !o.frozen)) {
    const spots = [null].concat(Object.keys(reach(G, u)).map(k => { const [x, y] = k.split(',').map(Number); return { x, y }; }));
    for (const to of spots) {
      if (to) out.push({ t: 'unit', id: u.id, to });
      for (const tgt of targets(G, u, to || u)) out.push({ t: 'unit', id: u.id, to, tgt });
    }
  }
  return out;
}

function aiChoose(G, noise) {
  const s = G.turn;
  let best = null, top = evaluate(G, s) + 0.05;
  for (const a of listActions(G)) {
    const C = JSON.parse(JSON.stringify(G));
    C.ev = [];
    if (!apply(C, a)) continue;
    const v = evaluate(C, s) + (noise ? Math.random() * noise : 0);
    if (v > top) { top = v; best = a; }
  }
  return best;
}

if (typeof module !== 'undefined') module.exports = { CARDS, BOSSES, STARTER_DECK, ROWS, COLS, ALTAR, HAND_MAX, MANA_MAX, newGame, play, moveUnit, attack, endTurn, reach, targets, summonTiles, spellTargets, aiChoose, apply, listActions, evaluate, effAtk };
