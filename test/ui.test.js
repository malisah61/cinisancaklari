const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const path = require('path'), assert = require('assert');
const OUT = process.env.OUT || '.';
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await b.newContext({ viewport: { width: 400, height: 800 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push('pageerror: ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await ctx.setOffline(true); // internetsiz açılış
  await p.goto('file://' + path.resolve('dist/index.html'));
  await p.waitForTimeout(1500);
  assert(await p.isVisible('#startBtn'), 'başlangıç ekranı görünmüyor');
  await p.screenshot({ path: OUT + '/1-title.png' });
  await p.evaluate(() => { __cini.speed.k = .05; });
  await p.tap('#startBtn');
  await p.waitForTimeout(800);
  await p.evaluate(() => { const S = __cini.G.side.p; S.hand = ['capulcu', 'okcu', 'ates', 'ulak', 'kalkan']; S.mana = 5; S.maxMana = 5; });
  await p.evaluate(() => document.getElementById('hc0') && 0);
  const tapTile = async (x, y) => { const [sx, sy] = await p.evaluate(([x, y]) => __cini.project(x, y), [x, y]); await p.touchscreen.tap(sx, sy); await p.waitForTimeout(350); };
  const idle = () => p.waitForFunction(() => !__cini.busy && __cini.G && __cini.G.turn === 'p', null, { timeout: 30000 });
  await p.tap('#endBtn', { force: true }); await idle();   // el arayüzünü tazeler
  await p.evaluate(() => { const S = __cini.G.side.p; S.hand = ['capulcu', 'okcu', 'ates', 'ulak', 'kalkan']; S.mana = 6; S.maxMana = 6; __cini.G.units = __cini.G.units.filter(u => u.side === 'p'); });
  await p.tap('#endBtn', { force: true }); await idle();
  await p.evaluate(() => { const G = __cini.G, S = G.side.p; S.hand = ['capulcu', 'okcu', 'ates', 'ulak', 'kalkan']; S.mana = 7; S.maxMana = 7; G.units = []; });
  // Tahtayı senkronla: bir kart seçip bırak
  await p.tap('#hc0'); await p.tap('#hc0');
  // Ekranın altındaki kartın karesi: çağırma
  await p.tap('#hc0');
  await p.screenshot({ path: OUT + '/2-select.png' });
  await tapTile(1, 1); await idle();
  assert.equal(await p.evaluate(() => __cini.G.units.filter(u => u.side === 'p').length), 1, 'kart oynanmadı');
  // Mana düştü, el azaldı
  assert.equal(await p.evaluate(() => __cini.G.side.p.hand.length), 4);
  await p.tap('#hc0'); await tapTile(0, 1); await idle(); // okçu
  // Sıradaki tura geç, birimi yürüt
  await p.tap('#endBtn', { force: true }); await idle();
  await p.evaluate(() => { __cini.G.units = __cini.G.units.filter(u => u.side === 'p'); });
  await tapTile(1, 1);
  await tapTile(1, 2); await idle();
  const mv = await p.evaluate(() => { const u = __cini.G.units.find(u => u.key === 'capulcu'); return u && [u.x, u.y]; });
  assert.deepEqual(mv, [1, 2], 'birim sunağa yürümedi: ' + mv);
  await p.evaluate(() => { const G = __cini.G, mk = (id, key, side, x, y) => { const c = __cini.CARDS[key]; G.units.push({ id, key, side, x, y, atk: c.atk, hp: c.hp, maxHp: c.hp, spd: c.spd, rng: c.rng, kw: c.kw || [], shield: 0, frozen: 0, moved: true, attacked: true }); };
    [['sipahi', 'p', 2, 0], ['akinci', 'p', 2, 1], ['sifaci', 'p', 0, 0], ['sancak', 'p', 1, 0], ['kalkan', 'e', 0, 4], ['dev', 'e', 1, 4], ['ejder', 'e', 2, 3], ['mancinik', 'e', 0, 3], ['sipahi', 'e', 2, 4]].forEach((a, i) => mk(800 + i, ...a)); __cini.sync(); });
  await p.waitForTimeout(500);
  await p.screenshot({ path: OUT + '/3-board.png' });
  await p.evaluate(() => { __cini.G.units = __cini.G.units.filter(u => u.id < 800); __cini.sync(); });
  // Saldırı: düşman ekle, görsel oluşsun diye el ile çağır
  await p.evaluate(() => { const G = __cini.G; G.units.push({ id: 900, key: 'kalkan', side: 'e', x: 1, y: 3, atk: 1, hp: 4, maxHp: 4, spd: 1, rng: 1, kw: ['shield'], shield: 0, frozen: 0, moved: true, attacked: true }); const u = G.units.find(u => u.key === 'capulcu'); u.attacked = false; u.moved = true; });
  await p.tap('#endBtn', { force: true }); await idle();
  const after = await p.evaluate(() => __cini.G.units.map(u => u.key + u.side));
  console.log('tahta', after);
  // Tam oyun: yapay zekâ yerine kart oynayan hızlı döngü, oyun sonu ve ödül ekranı
  await p.evaluate(() => { __cini.G.side.e.hp = 1; __cini.G.units = __cini.G.units.filter(u => u.side === 'p'); __cini.G.units.push({ id: 901, key: 'okcu', side: 'p', x: 2, y: 4, atk: 3, hp: 2, maxHp: 2, spd: 1, rng: 2, kw: [], shield: 0, frozen: 0, moved: false, attacked: false }); });
  await p.tap('#endBtn', { force: true }); await idle();
  const fin = await p.evaluate(() => { const G = __cini.G, u = G.units.find(q => q.id === 901); u.moved = u.attacked = false; G.side.e.hp = 1; return !!u; });
  assert(fin, 'okçu kayboldu');
  await p.tap('#hand .card', { timeout: 2000 }).catch(() => {});
  await p.tap('#hand .card', { timeout: 2000 }).catch(() => {});
  await tapTile(2, 4); await p.waitForTimeout(200);
  await p.screenshot({ path: OUT + '/4-castle.png' });
  await p.tap('#actBtn'); await p.waitForSelector('#rewardScreen:not([hidden])', { timeout: 15000 });
  await p.screenshot({ path: OUT + '/5-reward.png' });
  await p.tap('#rw0');
  assert(await p.isVisible('#titleScreen'));
  assert.equal(await p.evaluate(() => __cini.run.stage), 1);
  assert.equal(await p.evaluate(() => __cini.run.deck.length), 17);
  // Kayıt: yenile, ilerleme kalsın, 2. düello açılır, kaybetme ekranı
  await p.reload(); await p.waitForTimeout(800);
  assert.equal(await p.evaluate(() => __cini.run.stage), 1, 'kayıt korunmadı');
  await p.evaluate(() => { __cini.speed.k = .05; });
  await p.tap('#startBtn'); await p.waitForTimeout(300);
  await p.evaluate(() => { __cini.G.side.p.hp = 1; __cini.G.units.push({ id: 902, key: 'okcu', side: 'e', x: 0, y: 1, atk: 5, hp: 2, maxHp: 2, spd: 1, rng: 2, kw: [], shield: 0, frozen: 0, moved: false, attacked: false }); });
  await p.tap('#endBtn', { force: true }); await p.waitForSelector('#endScreen:not([hidden])', { timeout: 20000 });
  await p.screenshot({ path: OUT + '/6-end.png' });
  await p.tap('#endGo');
  assert.equal(await p.evaluate(() => __cini.run.stage), 0);
  // Taşma ve yatay ekran
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'yatay taşma');
  await p.setViewportSize({ width: 800, height: 380 }); await p.tap('#startBtn'); await p.waitForTimeout(600);
  await p.screenshot({ path: OUT + '/7-land.png' });
  await p.setViewportSize({ width: 360, height: 640 }); await p.waitForTimeout(400);
  await p.screenshot({ path: OUT + '/8-small.png' });
  console.log('hatalar:', errors);
  assert.equal(errors.length, 0, errors.join('\n'));
  await b.close();
  console.log('Arayüz testi geçti');
})().catch(e => { console.error('BAŞARISIZ', e.message); process.exit(1); });
