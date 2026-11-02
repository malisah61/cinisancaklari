/* Kenney Mini Dungeon GLB dosyalarını oyunun içine gömülen küçük bir biçime çevirir.
   Doku bir renk paleti olduğu için her köşenin rengi UV'den okunup köşeye yazılır. */
const fs = require('fs'), path = require('path');
const sharp = require(require('child_process').execSync('npm root -g').toString().trim() + '/sharp');
const DIR = process.argv[2], OUT = process.argv[3];
const STATIC = ['banner', 'barrel', 'chest', 'coin', 'column', 'floor-detail', 'gate', 'rocks', 'stairs', 'stones', 'trap', 'wall', 'wall-half', 'wall-narrow', 'wall-opening', 'wood-structure', 'wood-support'];
const CLIPS = ['idle', 'walk', 'attack-melee-right', 'holding-right', 'holding-both', 'holding-right-shoot', 'die', 'sit', 'emote-yes', 'interact-right'];
const qm = q => { const [x, y, z, w] = q; return [1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w), 0, 2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w), 0, 2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y), 0, 0, 0, 0, 1]; };
const mul = (a, b) => { const o = []; for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; };
const trs = n => { if (n.matrix) return n.matrix; const m = qm(n.rotation || [0, 0, 0, 1]), s = n.scale || [1, 1, 1], t = n.translation || [0, 0, 0]; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) m[i * 4 + j] *= s[i]; m[12] = t[0]; m[13] = t[1]; m[14] = t[2]; return m; };
const pt = (m, p, w = 1) => [0, 1, 2].map(i => m[i] * p[0] + m[4 + i] * p[1] + m[8 + i] * p[2] + m[12 + i] * w);
function glb(file) {
  const b = fs.readFileSync(file), n = b.readUInt32LE(12), j = JSON.parse(b.slice(20, 20 + n)), bin = b.slice(20 + n + 8);
  const acc = i => { const a = j.accessors[i], v = j.bufferViews[a.bufferView], c = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type], off = (v.byteOffset || 0) + (a.byteOffset || 0), sz = { 5126: 4, 5123: 2, 5125: 4, 5121: 1 }[a.componentType], st = v.byteStride || sz * c, o = [];
    for (let k = 0; k < a.count; k++) { const r = []; for (let e = 0; e < c; e++) { const p = off + k * st + e * sz; r.push(a.componentType === 5126 ? bin.readFloatLE(p) : a.componentType === 5123 ? bin.readUInt16LE(p) : a.componentType === 5125 ? bin.readUInt32LE(p) : bin[p]); } o.push(c === 1 ? r[0] : r); } return o; };
  return { j, acc };
}
function meshVerts(g, mi, M, pal) {
  const out = [], { j, acc } = g;
  for (const p of j.meshes[mi].primitives) {
    const P = acc(p.attributes.POSITION), N = acc(p.attributes.NORMAL), U = acc(p.attributes.TEXCOORD_0), I = p.indices !== undefined ? acc(p.indices) : P.map((_, i) => i);
    const tt = j.materials[p.material].pbrMetallicRoughness.baseColorTexture.extensions?.KHR_texture_transform || {}, os = tt.offset || [0, 0], sc = tt.scale || [1, 1];
    for (const i of I) {
      const a = pt(M, P[i]), n = pt(M, N[i], 0), l = Math.hypot(...n) || 1;
      const u = Math.min(pal.w - 1, Math.max(0, Math.floor((U[i][0] * sc[0] + os[0]) % 1 * pal.w))), v = Math.min(pal.h - 1, Math.max(0, Math.floor((U[i][1] * sc[1] + os[1]) % 1 * pal.h))), q = (v * pal.w + u) * pal.ch;
      out.push(a[0], a[1], a[2], n[0] / l, n[1] / l, n[2] / l, pal.d[q], pal.d[q + 1], pal.d[q + 2]);
    }
  }
  return out;
}
const pack = v => { const c = v.length / 9, b = Buffer.alloc(c * 12); for (let i = 0; i < c; i++) { const o = i * 9, q = i * 12; for (let k = 0; k < 3; k++) { b.writeInt16LE(Math.round(v[o + k] * 8000), q + k * 2); b.writeInt8(Math.round(v[o + 3 + k] * 127), q + 6 + k); b.writeUInt8(v[o + 6 + k], q + 9 + k); } } return b.toString('base64'); };
const bounds = v => { const a = [9, 9, 9], z = [-9, -9, -9]; for (let i = 0; i < v.length; i += 9) for (let k = 0; k < 3; k++) { a[k] = Math.min(a[k], v[i + k]); z[k] = Math.max(z[k], v[i + k]); } return [a.map(x => +x.toFixed(3)), z.map(x => +x.toFixed(3))]; };
(async () => {
  const { data, info } = await sharp(path.join(DIR, 'Textures/colormap.png')).raw().toBuffer({ resolveWithObject: true });
  const pal = { d: data, w: info.width, h: info.height, ch: info.channels }, res = { s: {}, c: {} };
  for (const n of STATIC) {
    const g = glb(path.join(DIR, n + '.glb')), v = [], walk = (i, W) => { const nd = g.j.nodes[i], M = mul(W, trs(nd)); if (nd.mesh !== undefined) v.push(...meshVerts(g, nd.mesh, M, pal)); (nd.children || []).forEach(c => walk(c, M)); };
    g.j.scenes[0].nodes.forEach(i => walk(i, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]));
    res.s[n] = pack(v); console.log(n, v.length / 27, JSON.stringify(bounds(v)));
  }
  for (const n of ['human', 'orc']) {
    const g = glb(path.join(DIR, 'character-' + n + '.glb')), id = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1], parts = {}, names = g.j.nodes.map(x => x.name);
    g.j.nodes.forEach(nd => {
      if (nd.mesh === undefined) return;
      const v = meshVerts(g, nd.mesh, id, pal);
      parts[nd.name] = { m: pack(v), t: nd.translation || [0, 0, 0], r: nd.rotation || [0, 0, 0, 1], kids: (nd.children || []).map(c => names[c]) };
      if (n === 'human') console.log(' ', nd.name, JSON.stringify(bounds(v)), JSON.stringify(parts[nd.name].t));
    });
    const root = g.j.nodes.find(x => x.name === 'root'), clips = {};
    console.log(' kök', JSON.stringify(root));
    for (const a of g.j.animations) {
      if (!CLIPS.includes(a.name)) continue;
      const tr = {}; let d = 0;
      for (const c of a.channels) {
        const s = a.samplers[c.sampler], T = g.acc(s.input), V = g.acc(s.output), nm = names[c.target.node], path2 = c.target.path;
        if (path2 === 'weights' || !parts[nm] && nm !== 'root') continue;
        d = Math.max(d, T[T.length - 1]);
        (tr[nm] = tr[nm] || {})[path2[0]] = { T: T.map(x => +x.toFixed(3)), V: V.flat().map(x => +x.toFixed(3)) };
      }
      clips[a.name] = { d: +d.toFixed(3), tr };
      console.log(' ', a.name, d.toFixed(2), Object.entries(tr).map(([k, o]) => k + ':' + Object.keys(o).join('') + o[Object.keys(o)[0]].T.length).join(' '));
    }
    res.c[n] = { parts, clips };
  }
  const js = '/* Kenney Mini Dungeon 1.4, CC0 1.0, www.kenney.nl. tools/bake.js ile üretildi. */\nconst KENNEY = ' + JSON.stringify(res) + ';\n';
  fs.writeFileSync(OUT, js); console.log('assets', (js.length / 1024).toFixed(0) + ' KB');
})();
