/* Küçük WebGL çizicisi ve kodla üretilen düşük poligonlu modeller. Dış kütüphane ya da model dosyası gerektirmez. */
const V3 = {
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
};
const M4 = {
  mul(a, b) { const o = new Float32Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; },
  persp(fov, asp, n, f) { const t = 1 / Math.tan(fov / 2); return new Float32Array([t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, 2 * f * n / (n - f), 0]); },
  look(e, c, up) {
    const z = V3.norm(V3.sub(e, c)), x = V3.norm(V3.cross(up, z)), y = V3.cross(z, x);
    return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -V3.dot(x, e), -V3.dot(y, e), -V3.dot(z, e), 1]);
  },
  trs(x, y, z, ry, sx, sy, sz, rz) {
    const c = Math.cos(ry || 0), s = Math.sin(ry || 0), cz = Math.cos(rz || 0), sn = Math.sin(rz || 0);
    sy = sy === undefined ? sx : sy; sz = sz === undefined ? sx : sz;
    return new Float32Array([c * cz * sx, sn * sx, -s * cz * sx, 0, -c * sn * sy, cz * sy, s * sn * sy, 0, s * sz, 0, c * sz, 0, x, y, z, 1]);
  },
  inv(m) {
    const a = m, o = new Float32Array(16), s = [], c = [];
    for (let i = 0; i < 6; i++) { const [p, q, r, t] = [[0, 5, 1, 4], [0, 6, 2, 4], [0, 7, 3, 4], [1, 6, 2, 5], [1, 7, 3, 5], [2, 7, 3, 6]][i]; s[i] = a[p] * a[q] - a[r] * a[t]; const [P, Q, R, T] = [p + 8, q + 8, r + 8, t + 8]; c[i] = a[P] * a[Q] - a[R] * a[T]; }
    const d = 1 / (s[0] * c[5] - s[1] * c[4] + s[2] * c[3] + s[3] * c[2] - s[4] * c[1] + s[5] * c[0]);
    o[0] = (a[5] * c[5] - a[6] * c[4] + a[7] * c[3]) * d; o[1] = (-a[1] * c[5] + a[2] * c[4] - a[3] * c[3]) * d;
    o[2] = (a[13] * s[5] - a[14] * s[4] + a[15] * s[3]) * d; o[3] = (-a[9] * s[5] + a[10] * s[4] - a[11] * s[3]) * d;
    o[4] = (-a[4] * c[5] + a[6] * c[2] - a[7] * c[1]) * d; o[5] = (a[0] * c[5] - a[2] * c[2] + a[3] * c[1]) * d;
    o[6] = (-a[12] * s[5] + a[14] * s[2] - a[15] * s[1]) * d; o[7] = (a[8] * s[5] - a[10] * s[2] + a[11] * s[1]) * d;
    o[8] = (a[4] * c[4] - a[5] * c[2] + a[7] * c[0]) * d; o[9] = (-a[0] * c[4] + a[1] * c[2] - a[3] * c[0]) * d;
    o[10] = (a[12] * s[4] - a[13] * s[2] + a[15] * s[0]) * d; o[11] = (-a[8] * s[4] + a[9] * s[2] - a[11] * s[0]) * d;
    o[12] = (-a[4] * c[3] + a[5] * c[1] - a[6] * c[0]) * d; o[13] = (a[0] * c[3] - a[1] * c[1] + a[2] * c[0]) * d;
    o[14] = (-a[12] * s[3] + a[13] * s[1] - a[14] * s[0]) * d; o[15] = (a[8] * s[3] - a[9] * s[1] + a[10] * s[0]) * d;
    return o;
  }
};
const hex = h => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];

class Mesh {
  constructor() { this.v = []; }
  tri(a, b, c, col) {
    const n = V3.norm(V3.cross(V3.sub(b, a), V3.sub(c, a)));
    for (const p of [a, b, c]) this.v.push(p[0], p[1], p[2], n[0], n[1], n[2], col[0], col[1], col[2]);
    return this;
  }
  quad(a, b, c, d, col) { return this.tri(a, b, c, col).tri(a, c, d, col); }
  box(x, y, z, w, h, d, col, ry = 0, rz = 0) {
    const R = (px, py, pz) => {
      const c2 = Math.cos(rz), s2 = Math.sin(rz), X = px * c2 - py * s2, Y = px * s2 + py * c2;
      const c = Math.cos(ry), s = Math.sin(ry);
      return [x + X * c + pz * s, y + Y, z - X * s + pz * c];
    };
    const w2 = w / 2, h2 = h / 2, d2 = d / 2;
    const p = [R(-w2, -h2, -d2), R(w2, -h2, -d2), R(w2, h2, -d2), R(-w2, h2, -d2), R(-w2, -h2, d2), R(w2, -h2, d2), R(w2, h2, d2), R(-w2, h2, d2)];
    this.quad(p[4], p[5], p[6], p[7], col).quad(p[1], p[0], p[3], p[2], col).quad(p[0], p[4], p[7], p[3], col)
      .quad(p[5], p[1], p[2], p[6], col).quad(p[3], p[7], p[6], p[2], col).quad(p[0], p[1], p[5], p[4], col);
    return this;
  }
  cyl(x, y, z, r0, r1, h, n, col, top) {
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2, b = (i + 1) / n * Math.PI * 2;
      const P = (r, an, yy) => [x + Math.sin(an) * r, yy, z + Math.cos(an) * r];
      const p0 = P(r0, a, y), p1 = P(r0, b, y), p2 = P(r1, b, y + h), p3 = P(r1, a, y + h);
      if (r1 > 0) { this.quad(p0, p1, p2, p3, col); this.tri([x, y + h, z], p3, p2, top || col); } else this.tri(p0, p1, [x, y + h, z], col);
      if (r0 > 0) this.tri([x, y, z], p1, p0, col);
    }
    return this;
  }
  ball(x, y, z, r, col, sy = 1, n = 7, m = 5) {
    const P = (i, j) => { const t = j / m * Math.PI, a = i / n * Math.PI * 2; return [x + Math.sin(t) * Math.sin(a) * r, y + Math.cos(t) * r * sy, z + Math.sin(t) * Math.cos(a) * r]; };
    for (let j = 0; j < m; j++) for (let i = 0; i < n; i++) {
      const a = P(i, j), b = P(i, j + 1), c = P(i + 1, j + 1), d = P(i + 1, j);
      if (j > 0) this.tri(a, b, d, col);
      if (j < m - 1) this.tri(d, b, c, col);
    }
    return this;
  }
}

class Renderer {
  constructor(canvas) {
    const gl = canvas.getContext('webgl', { antialias: true, alpha: true, preserveDrawingBuffer: false, powerPreference: 'low-power' });
    if (!gl) throw new Error('WebGL yok');
    this.gl = gl; this.canvas = canvas; this.meshes = {};
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, `attribute vec3 aP,aN,aC;uniform mat4 uVP,uM;varying vec3 vN,vC,vW;
      void main(){vec4 w=uM*vec4(aP,1.);vW=w.xyz;vN=mat3(uM[0].xyz,uM[1].xyz,uM[2].xyz)*aN;vC=aC;gl_Position=uVP*w;}`));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, `precision mediump float;varying vec3 vN,vC,vW;uniform vec4 uTint;uniform float uA,uLit;uniform vec3 uFog,uEye;
      void main(){vec3 n=normalize(vN);float d=max(dot(n,normalize(vec3(-.45,.8,.4))),0.);float h=n.y*.5+.5;
      vec3 l=mix(vec3(.46,.4,.58),vec3(.86,.8,.74),h)*.72+vec3(1.,.82,.6)*d*.62;vec3 c=mix(vC,vC*l,uLit);c=mix(c,uTint.rgb,uTint.a);
      float f=smoothstep(11.,27.,length(vW-uEye));gl_FragColor=vec4(mix(c,uFog,f*uLit)*uA,uA);}`));
    gl.linkProgram(p); gl.useProgram(p); this.p = p;
    this.u = {}; for (const n of ['uVP', 'uM', 'uTint', 'uA', 'uLit', 'uFog', 'uEye']) this.u[n] = gl.getUniformLocation(p, n);
    this.a = ['aP', 'aN', 'aC'].map(n => gl.getAttribLocation(p, n));
    this.a.forEach(i => gl.enableVertexAttribArray(i));
    gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.uniform3f(this.u.uFog, .29, .24, .39);
    gl.uniform1f(this.u.uLit, 1);
    this.eye = [0, 8, 6]; this.target = [0, 0, 0];
  }
  add(name, mesh) {
    const gl = this.gl, b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(mesh.v), gl.STATIC_DRAW);
    this.meshes[name] = { b, n: mesh.v.length / 9 };
  }
  resize() {
    const c = this.canvas, dpr = Math.min(window.devicePixelRatio || 1, 1.75), w = Math.round(c.clientWidth * dpr), h = Math.round(c.clientHeight * dpr);
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    this.gl.viewport(0, 0, c.width, c.height);
  }
  camera(eye, target, fov, asp, sx = 0, sy = 0) {
    this.eye = eye; this.target = target;
    const P = M4.persp(fov, asp, .1, 80); P[8] = -sx; P[9] = -sy;
    this.vp = M4.mul(P, M4.look(eye, target, [0, 1, 0]));
    this.ivp = M4.inv(this.vp);
    const g = this.gl; g.uniformMatrix4fv(this.u.uVP, false, this.vp); g.uniform3f(this.u.uEye, eye[0], eye[1], eye[2]);
  }
  clear(r, g, b, a) { const c = this.gl; c.clearColor(r, g, b, a); c.clear(c.COLOR_BUFFER_BIT | c.DEPTH_BUFFER_BIT); }
  draw(name, m, tint, alpha, unlit) {
    const gl = this.gl, me = this.meshes[name];
    gl.bindBuffer(gl.ARRAY_BUFFER, me.b);
    gl.vertexAttribPointer(this.a[0], 3, gl.FLOAT, false, 36, 0);
    gl.vertexAttribPointer(this.a[1], 3, gl.FLOAT, false, 36, 12);
    gl.vertexAttribPointer(this.a[2], 3, gl.FLOAT, false, 36, 24);
    gl.uniformMatrix4fv(this.u.uM, false, m);
    gl.uniform4fv(this.u.uTint, tint || [0, 0, 0, 0]);
    gl.uniform1f(this.u.uA, alpha === undefined ? 1 : alpha);
    gl.uniform1f(this.u.uLit, unlit ? 0 : 1);
    gl.drawArrays(gl.TRIANGLES, 0, me.n);
  }
  project(x, y, z) {
    const m = this.vp, w = m[3] * x + m[7] * y + m[11] * z + m[15];
    return [((m[0] * x + m[4] * y + m[8] * z + m[12]) / w * .5 + .5) * this.canvas.clientWidth, (.5 - (m[1] * x + m[5] * y + m[9] * z + m[13]) / w * .5) * this.canvas.clientHeight];
  }
  /* Ekrandaki noktayı y=0 düzlemine indirir. */
  ground(px, py) {
    const nx = px / this.canvas.clientWidth * 2 - 1, ny = 1 - py / this.canvas.clientHeight * 2, m = this.ivp;
    const un = (z) => { const w = m[3] * nx + m[7] * ny + m[11] * z + m[15]; return [(m[0] * nx + m[4] * ny + m[8] * z + m[12]) / w, (m[1] * nx + m[5] * ny + m[9] * z + m[13]) / w, (m[2] * nx + m[6] * ny + m[10] * z + m[14]) / w]; };
    const a = un(-1), b = un(1), t = a[1] / (a[1] - b[1]);
    return [a[0] + (b[0] - a[0]) * t, a[2] + (b[2] - a[2]) * t];
  }
}

const SKIN = hex('#e3b085'), STEEL = hex('#c6ced6'), WOOD = hex('#7a4d2a'), DARK = hex('#2b2a38'), GOLD = hex('#e7bd5b'), BONE = hex('#efe5cc');

const TEAMS = {
  p: { main: hex('#1db0a4'), trim: hex('#f0c766'), dark: hex('#17476d'), char: 'human' },
  e: { main: hex('#c5403c'), trim: hex('#35234a'), dark: hex('#4c2433'), char: 'orc' }
};

/* Kenney modelini köşe dizisine açar. */
function decodeKenney(b64) {
  const s = atob(b64), n = s.length / 12, o = new Array(n * 9), b = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
  const d = new DataView(b.buffer);
  for (let i = 0; i < n; i++) {
    const q = i * 12, p = i * 9;
    for (let k = 0; k < 3; k++) { o[p + k] = d.getInt16(q + k * 2, true) / 8000; o[p + 3 + k] = d.getInt8(q + 6 + k) / 127; o[p + 6 + k] = b[q + 9 + k] / 255; }
  }
  return o;
}
function put(m, name, x = 0, y = 0, z = 0, ry = 0, s = 1, team) {
  const v = decodeKenney(KENNEY.s[name]), c = Math.cos(ry), n = Math.sin(ry);
  for (let i = 0; i < v.length; i += 9) {
    const px = v[i] * s, pz = v[i + 2] * s, nx = v[i + 3], nz = v[i + 5];
    let r = v[i + 6], g = v[i + 7], b = v[i + 8];
    if (team && r > g + .25 && r > b + .25) { const l = r; r = team.main[0] * l * 1.15; g = team.main[1] * l * 1.15; b = team.main[2] * l * 1.15; }
    m.v.push(x + px * c + pz * n, y + v[i + 1] * s, z - px * n + pz * c, nx * c + nz * n, v[i + 4], -nx * n + nz * c, r, g, b);
  }
  return m;
}

const HAND = { x: -.25, y: 0, z: .04 }, LHAND = { x: .25, y: 0, z: .04 };

/* Kenney karakterine takılan ekipman. Parça kendi eklem noktasına göre konumlanır. */
const EQUIP = {
  capulcu: { hold: 'holding-right', parts: {
    'arm-right': (m, t) => { m.box(HAND.x, .08, HAND.z, .06, .34, .06, WOOD).ball(HAND.x, .29, HAND.z, .09, STEEL); },
    head: (m, t) => { m.cyl(0, .34, .02, .25, .1, .13, 7, t.main); } } },
  kalkan: { hold: 'holding-both', parts: {
    'arm-left': (m, t) => { m.box(LHAND.x + .07, 0, .1, .06, .46, .36, t.main).box(LHAND.x + .11, 0, .1, .03, .26, .2, t.trim).box(LHAND.x + .13, 0, .1, .02, .08, .08, BONE); },
    'arm-right': (m, t) => { m.box(HAND.x, .17, HAND.z, .04, .44, .08, STEEL).box(HAND.x, -.01, HAND.z, .16, .04, .05, GOLD); },
    head: (m, t) => { m.cyl(0, .34, .02, .22, .03, .18, 7, STEEL); } } },
  okcu: { hold: 'holding-right-shoot', parts: {
    'arm-right': (m, t) => { for (let i = -3; i <= 3; i++) m.box(HAND.x - .02 + i * i * .009, i * .08, HAND.z, .04, .1, .04, WOOD); m.box(HAND.x + .1, 0, HAND.z, .01, .5, .01, BONE); },
    torso: (m, t) => { m.box(.06, .12, -.16, .12, .3, .1, WOOD); m.box(.06, .3, -.16, .05, .1, .05, BONE); },
    head: (m, t) => { m.cyl(0, .33, .01, .22, 0, .24, 6, t.dark); } } },
  sifaci: { hold: 'holding-right', parts: {
    'arm-right': (m, t) => { m.box(HAND.x, .2, HAND.z, .05, .82, .05, WOOD).ball(HAND.x, .66, HAND.z, .1, t.trim); },
    torso: (m, t) => { m.cyl(0, -.12, 0, .3, .16, .22, 8, BONE); m.box(0, .08, .15, .15, .04, .02, t.trim).box(0, .08, .15, .04, .15, .02, t.trim); },
    head: (m, t) => { m.cyl(0, .35, .02, .2, .08, .14, 7, BONE); } } },
  sancak: { hold: 'holding-right', parts: {
    'arm-right': (m, t) => { m.box(HAND.x, .32, HAND.z, .045, 1.1, .045, WOOD).box(HAND.x, .88, HAND.z, .07, .07, .07, GOLD); m.box(HAND.x, .6, HAND.z - .23, .025, .38, .46, t.main).box(HAND.x, .6, HAND.z - .23, .035, .14, .18, t.trim); },
    head: (m, t) => { m.cyl(0, .35, .02, .2, .05, .11, 7, t.trim); } } },
  sipahi: { hold: 'holding-right', parts: {
    'arm-right': (m, t) => { m.box(HAND.x, .23, HAND.z, .045, .56, .09, STEEL).box(HAND.x, -.01, HAND.z, .18, .04, .05, GOLD); },
    torso: (m, t) => { m.box(0, .03, -.15, .3, .44, .03, t.main); m.box(0, .1, .14, .2, .13, .02, STEEL); },
    head: (m, t) => { m.cyl(0, .34, .02, .22, .02, .2, 7, STEEL); m.ball(0, .55, .02, .035, t.trim); } } },
  akinci: { clip: 'sit', hold: 'holding-right', y: .56, base: 'horse', parts: {
    'arm-right': (m, t) => { m.box(HAND.x, .25, HAND.z, .05, .72, .05, WOOD).box(HAND.x, .66, HAND.z, .07, .16, .07, STEEL); },
    head: (m, t) => { m.cyl(0, .34, .02, .21, 0, .22, 6, t.trim); } } },
  dev: { scale: 1.65, tint: [.52, .56, .62, .55], hold: 'holding-both', parts: {} }
};

const MODELS = {
  horse(m, t) {
    m.box(0, .46, 0, .3, .28, .76, WOOD); for (const [x, z] of [[-.1, .28], [.1, .28], [-.1, -.28], [.1, -.28]]) m.box(x, .17, z, .09, .34, .09, DARK);
    m.box(0, .7, .44, .17, .4, .2, WOOD).box(0, .84, .58, .15, .15, .3, WOOD).box(0, .94, .38, .05, .24, .1, DARK).box(0, .52, -.44, .07, .3, .07, DARK); m.box(0, .62, 0, .34, .05, .38, t.main);
  },
  mancinik(m, t) {
    put(m, 'wood-structure', 0, .16, 0, 0, .56);
    m.box(0, .13, 0, .66, .1, .96, WOOD); for (const [x, z] of [[-.38, .3], [.38, .3], [-.38, -.3], [.38, -.3]]) m.box(x, .13, z, .1, .24, .24, DARK);
    m.box(0, .7, -.14, .08, .08, .98, WOOD); m.box(0, .79, .3, .24, .08, .24, t.main); put(m, 'barrel', 0, .1, -.32, 0, .42, t); m.ball(0, .9, .3, .1, STEEL);
  },
  ejder(m, t) {
    m.ball(0, .68, 0, .34, t.main, .9, 7, 5); m.ball(0, .6, -.34, .24, t.main, .9, 6, 4); m.cyl(0, .55, -.5, .15, 0, .05, 5, t.main);
    m.box(0, .36, -.72, .1, .1, .6, t.main); m.box(0, .34, -1.04, .22, .03, .16, t.trim);
    m.box(0, .98, .3, .2, .5, .2, t.main); m.box(0, 1.24, .46, .3, .2, .42, t.main); m.box(0, 1.17, .72, .22, .1, .2, t.trim); m.box(-.1, 1.4, .36, .05, .22, .05, BONE).box(.1, 1.4, .36, .05, .22, .05, BONE); m.box(-.15, 1.3, .55, .04, .06, .04, GOLD).box(.15, 1.3, .55, .04, .06, .04, GOLD);
    for (const s of [-1, 1]) { m.quad([s * .2, .95, .18], [s * 1.12, 1.25, .05], [s * .92, .9, -.45], [s * .2, .8, -.3], t.trim); m.quad([s * .2, .8, -.3], [s * .92, .9, -.45], [s * 1.12, 1.25, .05], [s * .2, .95, .18], t.trim); m.box(s * .22, .2, .18, .14, .4, .15, t.dark).box(s * .22, .2, -.25, .14, .4, .15, t.dark); }
  },
  ates(m) { const f = hex('#f2662d'); m.ball(0, .68, 0, .36, f); m.ball(.05, .75, .16, .24, hex('#ffc44f')); m.cyl(-.02, .86, 0, .24, 0, .52, 6, f); },
  yildirim(m) { const c = hex('#ffe066'); m.box(.06, 1.0, 0, .2, .56, .1, c, 0, -.5); m.box(-.07, .62, 0, .22, .36, .1, c, 0, .35); m.box(.02, .3, 0, .14, .46, .1, c, 0, -.5); },
  buz(m) { const c = hex('#9fe6f2'); m.cyl(0, .08, 0, .3, 0, 1.05, 6, c); m.cyl(-.3, .08, .05, .17, 0, .66, 5, hex('#d8f8fb')); m.cyl(.3, .08, .05, .17, 0, .54, 5, hex('#55c0da')); },
  sifa(m) { const c = hex('#ef5a7a'); m.ball(0, .46, 0, .36, c); m.box(0, .9, 0, .15, .28, .15, BONE); m.box(0, 1.08, 0, .2, .09, .2, WOOD); m.box(0, .47, .35, .22, .07, .03, BONE).box(0, .47, .35, .07, .22, .03, BONE); },
  nara(m) { m.cyl(.0, .16, 0, .32, .08, .74, 7, GOLD); m.cyl(0, .9, 0, .08, .02, .24, 6, BONE); m.box(0, .2, 0, .72, .05, .72, WOOD); m.box(0, .5, .22, .16, .16, .03, hex('#c43838')); },
  onarim(m) { put(m, 'wall-half', 0, 0, 0, 0, .78); m.box(.3, .96, .2, .3, .2, .2, STEEL); m.box(.3, .68, .2, .07, .5, .07, WOOD); },
  ulak(m) { m.box(0, .62, 0, .78, .56, .05, BONE); m.cyl(-.42, .32, 0, .07, .07, .62, 6, WOOD); m.cyl(.42, .32, 0, .07, .07, .62, 6, WOOD); m.ball(0, .62, .05, .11, hex('#c43838')); for (let i = 0; i < 3; i++) m.box(0, .46 + i * .18, .03, .5, .02, .01, DARK); }
};

function buildBoard() {
  const m = new Mesh(), rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const COB = hex('#1f4e99'), TUR = hex('#21a8a6'), WHITE = hex('#f3ecd8'), ROSE = hex('#d85d48');
  m.box(0, -.32, 0, 3.4, .5, 5.4, hex('#5c5f78')); m.box(0, -.1, 0, 3.2, .1, 5.2, hex('#d9c7a1'));
  for (let x = 0; x < 3; x++) for (let y = 0; y < 5; y++) {
    const cx = x - 1, cz = 2 - y, c = (x + y) % 2 ? COB : TUR;
    m.box(cx, -.03, cz, .95, .06, .95, c);
    const star = (s, col, h) => { m.box(cx, h, cz, s, .01, s, col); m.box(cx, h, cz, s, .01, s, col, Math.PI / 4); };
    star(.5, WHITE, .004); star(.3, (x + y) % 2 ? TUR : COB, .012); star(.11, ROSE, .02);
    for (const [a, b] of [[-.39, -.39], [.39, -.39], [-.39, .39], [.39, .39]]) m.box(cx + a, .003, cz + b, .1, .012, .1, WHITE, Math.PI / 4);
  }
  m.cyl(0, 0, 0, .3, .27, .05, 8, GOLD); m.cyl(0, .05, 0, .2, .17, .03, 8, hex('#f6ecd2'));
  m.cyl(0, -.62, 0, 34, 34, .02, 24, hex('#6f6a7c'));
  const props = ['rocks', 'stones', 'barrel', 'wood-structure', 'wall-half', 'column', 'chest', 'floor-detail', 'trap', 'wood-support', 'rocks'];
  for (let i = 0; i < 70; i++) {
    const a = rnd() * 6.283, r = 4.3 + rnd() * 15, x = Math.cos(a) * r * .95, z = Math.sin(a) * r, k = props[Math.floor(rnd() * props.length)], ry = Math.floor(rnd() * 4) * Math.PI / 2;
    if (Math.abs(x) < 2.6 && Math.abs(z) < 5.4) continue;
    put(m, k, x, -.6, z, ry, k === 'rocks' ? 1.5 : 1.2);
  }
  return m;
}

function buildCastle(t) {
  const m = new Mesh();
  for (const x of [-1, 1]) { put(m, 'wall', x, -.6, 0, 0, 1.2); put(m, 'banner', x, -.46, .08, Math.PI, 1, t); }
  put(m, 'wall-opening', 0, -.6, 0, 0, 1.2); put(m, 'gate', 0, -.6, .46, 0, 1.15);
  for (const x of [-1.72, 1.72]) { put(m, 'column', x, -.6, .1, 0, 1.75); m.cyl(x, 1.3, .1, .54, 0, .68, 8, t.main); }
  return m;
}

/* Kenney karakterini parça parça çizer; ekipman parçayla birlikte hareket eder. */
function sampleTrack(tr, t, n) {
  const T = tr.T, i1 = T.findIndex(x => x > t);
  if (i1 <= 0) { const i = i1 === 0 ? 0 : T.length - 1; return tr.V.slice(i * n, i * n + n); }
  const i0 = i1 - 1, k = (t - T[i0]) / (T[i1] - T[i0] || 1), o = [];
  let sgn = 1;
  if (n === 4) { let d = 0; for (let e = 0; e < 4; e++) d += tr.V[i0 * 4 + e] * tr.V[i1 * 4 + e]; if (d < 0) sgn = -1; }
  for (let e = 0; e < n; e++) o.push(tr.V[i0 * n + e] * (1 - k) + tr.V[i1 * n + e] * sgn * k);
  if (n === 4) { const l = Math.hypot(...o) || 1; for (let e = 0; e < 4; e++) o[e] /= l; }
  return o;
}
function partM(parent, q, t) {
  const [x, y, z, w] = q;
  return M4.mul(parent, new Float32Array([1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w), 0, 2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w), 0, 2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y), 0, t[0], t[1], t[2], 1]));
}
function drawFigure(R, key, side, base, clipName, time, tint, alpha) {
  const e = EQUIP[key], T = TEAMS[side], C = KENNEY.c[T.char], clip = C.clips[clipName || e.clip || 'idle'] || C.clips.idle;
  const t = clip.d ? (clipName === 'die' ? Math.min(time, clip.d) : time % clip.d) : 0, hold = e.hold && clipName !== 'die' && clipName !== 'attack-melee-right' ? C.clips[e.hold] : null;
  const pose = (name, part) => {
    const src = hold && hold.tr[name] && name.startsWith('arm') ? hold : clip, tr = src.tr[name], tt = src === hold ? .05 : t;
    return { r: tr && tr.r ? sampleTrack(tr.r, tt, 4) : part ? part.r : [0, 0, 0, 1], t: tr && tr.t ? sampleTrack(tr.t, tt, 3) : part ? part.t : [0, 0, 0] };
  };
  const p = pose('root'), root = partM(base, p.r, p.t), pt = T.char, f = tint || e.tint || null;
  const one = (name, parent) => {
    const part = C.parts[name], o = pose(name, part), M = partM(parent, o.r, o.t);
    R.draw('ch_' + pt + '_' + name, M, f, alpha);
    const eq = 'eq_' + key + '_' + side + '_' + name;
    if (R.meshes[eq]) R.draw(eq, M, tint || null, alpha);
    part.kids.forEach(k => one(k, M));
  };
  ['leg-left', 'leg-right', 'torso'].forEach(n => one(n, root));
}
function drawUnit(R, key, side, x, y, z, ry, s, clip, time, tint, alpha) {
  const e = EQUIP[key], sc = s * (e && e.scale || 1);
  if (!e) { R.draw(key + '_' + side, M4.trs(x, y, z, ry, s * (key === 'ejder' ? .78 : 1)), tint, alpha); return; }
  const k = sc * 1.12;
  if (e.base) R.draw(e.base + '_' + side, M4.trs(x, y, z, ry, s), tint, alpha);
  drawFigure(R, key, side, M4.trs(x, y + (e.y || 0) * s, z, ry, k), clip, time, tint, alpha);
}
function buildAllMeshes(R) {
  R.add('board', buildBoard());
  R.add('castle_p', buildCastle(TEAMS.p)); R.add('castle_e', buildCastle(TEAMS.e));
  for (const k in MODELS) for (const s of ['p', 'e']) { const m = new Mesh(); MODELS[k](m, TEAMS[s]); R.add(k + '_' + s, m); }
  for (const c of ['human', 'orc']) for (const n in KENNEY.c[c].parts) { const m = new Mesh(); m.v = decodeKenney(KENNEY.c[c].parts[n].m); R.add('ch_' + c + '_' + n, m); }
  for (const k in EQUIP) for (const s of ['p', 'e']) for (const n in EQUIP[k].parts) { const m = new Mesh(); EQUIP[k].parts[n](m, TEAMS[s]); R.add('eq_' + k + '_' + s + '_' + n, m); }
  const coin = new Mesh(); put(coin, 'coin', 0, 0, 0, 0, 1); R.add('coin', coin);
  const q = new Mesh(); q.tri([-.5, 0, .5], [.5, 0, .5], [.5, 0, -.5], [1, 1, 1]).tri([-.5, 0, .5], [.5, 0, -.5], [-.5, 0, -.5], [1, 1, 1]); R.add('tile', q);
  const disc = new Mesh(); disc.cyl(0, 0, 0, 0, .5, .001, 16, [0, 0, 0]); R.add('disc', disc);
  const cube = new Mesh(); cube.box(0, 0, 0, 1, 1, 1, [1, 1, 1]); R.add('cube', cube);
}
