const L = require('../src/logic.js');
const assert = require('assert');

// Kural birim testleri
const boss = L.BOSSES[0];
function blank() { const G = L.newGame(L.STARTER_DECK, boss); G.ev = []; return G; }
function put(G, key, side, x, y, extra) {
  const c = L.CARDS[key];
  const u = Object.assign({ id: G.nextId++, key, side, x, y, atk: c.atk, hp: c.hp, maxHp: c.hp, spd: c.spd, rng: c.rng, kw: c.kw || [], shield: (c.kw || []).includes('shield') ? 1 : 0, frozen: 0, moved: false, attacked: false }, extra);
  G.units.push(u); return u;
}
{ // kalkan ilk darbeyi engeller, karşılık gelir
  const G = blank(); const a = put(G, 'sipahi', 'p', 1, 1); const d = put(G, 'kalkan', 'e', 1, 2);
  assert(L.attack(G, a.id, { id: d.id })); assert.equal(d.hp, 4); assert.equal(d.shield, 0); assert.equal(a.hp, 3);
}
{ // menzilli saldırı karşılık almaz
  const G = blank(); const a = put(G, 'okcu', 'p', 0, 1); const d = put(G, 'sipahi', 'e', 0, 3);
  assert(L.attack(G, a.id, { id: d.id })); assert.equal(a.hp, 2); assert.equal(d.hp, 2);
}
{ // kuşatma kaleye iki kat, menzil 3
  const G = blank(); const a = put(G, 'mancinik', 'p', 0, 2); const hp = G.side.e.hp;
  assert(L.attack(G, a.id, { castle: true })); assert.equal(G.side.e.hp, hp - 6);
}
{ // kale uzaktan vurulamaz
  const G = blank(); const a = put(G, 'sipahi', 'p', 0, 3);
  assert.equal(L.attack(G, a.id, { castle: true }), false);
}
{ // aura +1, sunak +1 mana
  const G = blank(); const a = put(G, 'sipahi', 'p', 1, 2); put(G, 'sancak', 'p', 0, 2);
  assert.equal(L.effAtk(G, a), 5);
  L.endTurn(G); L.endTurn(G);
  assert(G.side.p.altar); assert.equal(G.side.p.mana, G.side.p.maxMana + 1);
}
{ // uçan birim üstünden geçer, yaya geçemez
  const G = blank(); const f = put(G, 'ejder', 'p', 1, 0); put(G, 'kalkan', 'e', 1, 1); const w = put(G, 'akinci', 'p', 0, 2);
  assert(L.reach(G, f)['1,2']); put(G, 'kalkan', 'e', 1, 3);
  assert(!L.reach(G, Object.assign(w, { x: 1, y: 2 }))['1,4']);
}
{ // donan birim bir tur bekler
  const G = blank(); const u = put(G, 'sipahi', 'p', 1, 1, { frozen: 1 });
  L.endTurn(G); L.endTurn(G);
  assert.equal(Object.keys(L.reach(G, u)).length, 0); L.endTurn(G); L.endTurn(G);
  assert(Object.keys(L.reach(G, u)).length > 0);
}
{ // mana yetmezse kart oynanmaz, boş olmayan kareye çağrılmaz
  const G = blank(); G.side.p.hand = ['dev']; G.side.p.mana = 1;
  assert.equal(L.play(G, 0, 0, 0), false);
  G.side.p.hand = ['capulcu']; G.side.p.mana = 5; put(G, 'kalkan', 'p', 0, 0);
  assert.equal(L.play(G, 0, 0, 0), false); assert(L.play(G, 0, 1, 0));
}

// Yapay zekâ benzetimi: bitme garantisi, tutarlılık ve denge
function sim(deck, b, n) {
  let wins = 0, rounds = 0, maxTime = 0;
  for (let i = 0; i < n; i++) {
    const G = L.newGame(deck, b);
    let guard = 0;
    while (!G.winner) {
      assert(++guard < 3000, 'oyun bitmedi');
      const t = Date.now();
      const a = L.aiChoose(G, G.turn === 'p' ? 2.5 : b.noise);
      maxTime = Math.max(maxTime, Date.now() - t);
      if (a) assert(L.apply(G, a), 'yapay zekâ geçersiz hamle: ' + JSON.stringify(a));
      else L.endTurn(G);
      const seen = new Set();
      for (const u of G.units) {
        const k = u.x + ',' + u.y; assert(!seen.has(k), 'aynı karede iki birim'); seen.add(k);
        assert(u.hp > 0 && u.hp <= u.maxHp); assert(u.x >= 0 && u.x < 3 && u.y >= 0 && u.y < 5);
      }
      for (const s of ['p', 'e']) {
        const S = G.side[s]; assert(S.mana >= 0); assert(S.hp <= S.maxHp); assert(S.hand.length <= L.HAND_MAX);
      }
    }
    if (G.winner === 'p') wins++;
    rounds += G.round;
  }
  return { wins: wins / n, rounds: rounds / n, maxTime };
}
const N = +process.argv[2] || 60;
for (const b of L.BOSSES) {
  const r = sim(L.STARTER_DECK, b, N);
  console.log(b.name.padEnd(16), 'oyuncu kazanma', (r.wins * 100).toFixed(0).padStart(3) + '%', 'ort. tur', r.rounds.toFixed(1), 'en uzun karar', r.maxTime + 'ms');
}
const up = L.STARTER_DECK.concat(['sipahi', 'dev', 'ates', 'sancak']);
const r5 = sim(up, L.BOSSES[4], N);
console.log('Güçlenmiş deste, son bey', (r5.wins * 100).toFixed(0) + '%');
console.log('Tüm testler geçti');
