/* ==========================================================================
   3D campus map (three.js) — buildings from OpenStreetMap, glowing walking
   route to Hall A5, traffic on the surrounding streets, HTML labels.
   ========================================================================== */
(() => {
  'use strict';
  const root = document.getElementById('map3d');
  const DATA = window.CAMPUS;
  if (!root || !DATA || !window.THREE_URL) return;

  const canvas = root.querySelector('.map3d__canvas');
  const labelsEl = root.querySelector('.map3d__labels');
  const hintEl = root.querySelector('.map3d__hint');
  const compassEl = root.querySelector('.compass span');
  const loadingEl = root.querySelector('.map3d__loading');
  const flyBtn = root.querySelector('[data-map="fly"]');
  const reduced = document.documentElement.classList.contains('reduced');
  const isSmall = () => root.clientWidth < 700;
  const emit = (n, d) => window.dispatchEvent(new CustomEvent(n, { detail: d }));

  let started = false, inView = false, api = null;
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    inView = e.isIntersecting;
    if (inView && !started) {
      started = true;
      import(window.THREE_URL).then((THREE) => { api = init(THREE); }).catch((err) => {
        console.warn('[map3d]', err);
        root.classList.add('is-failed');
        loadingEl.textContent = 'Không tải được bản đồ 3D — bạn xem Google Maps ngay bên dưới nhé.';
      });
    }
  }), { rootMargin: '500px 0px' });
  io.observe(root);

  // pause the background particles while the map fills the screen
  let bgPaused = false;
  new IntersectionObserver(([e]) => {
    const p = e.intersectionRatio > 0.55;
    if (p !== bgPaused) { bgPaused = p; emit('invite:bgpause', p); }
  }, { threshold: [0, 0.3, 0.55, 0.8] }).observe(root);

  function init(THREE) {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); // labels are HTML, so 1.5x is plenty for the scene
    renderer.setClearColor(0x070605, 1);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x070605, 700, 1900);
    const camera = new THREE.PerspectiveCamera(38, 1, 2, 5000);

    const clock = new THREE.Clock();
    const U = { uTime: { value: 0 } };
    const GOLD = new THREE.Color(0xc5a45e);
    const HS = 1.6;            // vertical exaggeration
    const FLOOR = 3.6 * HS;    // floor height in scene units

    const A5d = DATA.buildings.find((b) => b.n === 'A5');
    const a5c = DATA.markers.a5;
    const A5 = new THREE.Vector3(a5c[0], 0, a5c[1]);
    const a5H = (A5d ? A5d.l : 4) * FLOOR;

    /* ---------------- helpers ---------------- */
    const shapeOf = (poly) => {
      const s = new THREE.Shape();
      poly.forEach((p, i) => (i ? s.lineTo(p[0], -p[1]) : s.moveTo(p[0], -p[1])));
      s.closePath();
      return s;
    };
    const flat = (poly, y, mat) => {
      const g = new THREE.ShapeGeometry(shapeOf(poly));
      g.rotateX(-Math.PI / 2);
      const m = new THREE.Mesh(g, mat);
      m.position.y = y;
      scene.add(m);
      return m;
    };
    const lineOf = (pts, y, mat, closed) => {
      const arr = pts.map((p) => new THREE.Vector3(p[0], y, p[1]));
      if (closed) arr.push(arr[0].clone());
      const g = new THREE.BufferGeometry().setFromPoints(arr);
      const l = new THREE.Line(g, mat);
      scene.add(l);
      return l;
    };
    function ribbon(pts, width, y, out) {
      const n = pts.length; if (n < 2) return 0;
      const base = out.pos.length / 3;
      let acc = 0;
      for (let i = 0; i < n; i++) {
        const p = pts[i], pr = pts[Math.max(0, i - 1)], nx_ = pts[Math.min(n - 1, i + 1)];
        let d1x = p[0] - pr[0], d1z = p[1] - pr[1], d2x = nx_[0] - p[0], d2z = nx_[1] - p[1];
        let l1 = Math.hypot(d1x, d1z), l2 = Math.hypot(d2x, d2z);
        if (l1 < 1e-6) { d1x = d2x; d1z = d2z; l1 = l2; }
        if (l2 < 1e-6) { d2x = d1x; d2z = d1z; l2 = l1; }
        d1x /= l1; d1z /= l1; d2x /= l2; d2z /= l2;
        let nx = -(d1z + d2z), nz = d1x + d2x, nl = Math.hypot(nx, nz);
        if (nl < 1e-6) { nx = -d1z; nz = d1x; nl = 1; }
        nx /= nl; nz /= nl;
        const dot = nx * -d1z + nz * d1x;
        const hw = (width / 2) * Math.min(2.4, 1 / Math.max(dot, 0.42));
        if (i > 0) acc += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]);
        out.pos.push(p[0] + nx * hw, y, p[1] + nz * hw, p[0] - nx * hw, y, p[1] - nz * hw);
        out.uv.push(acc, 0, acc, 1);
        if (i < n - 1) { const a = base + i * 2; out.idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      }
      return acc;
    }
    const ribbonMesh = (out, mat) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(out.pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(out.uv, 2));
      g.setIndex(out.idx);
      const m = new THREE.Mesh(g, mat);
      scene.add(m);
      return m;
    };
    const plen = (pts) => { let s = 0; for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return s; };
    const sampler = (pts) => {
      const cum = [0];
      for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
      const L = cum[cum.length - 1];
      return {
        L,
        at(d, out = new THREE.Vector3()) {
          d = Math.max(0, Math.min(L, d));
          let i = 1; while (i < cum.length - 1 && cum[i] < d) i++;
          const t = (d - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1);
          return out.set(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, 0, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t);
        },
      };
    };
    const glowTex = (() => {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, 'rgba(255,248,225,1)'); gr.addColorStop(.25, 'rgba(255,220,140,.75)'); gr.addColorStop(1, 'rgba(255,200,100,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    })();

    /* ---------------- ground ---------------- */
    const groundMat = new THREE.ShaderMaterial({
      uniforms: { ...U, uA5: { value: A5 } },
      vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `
        uniform float uTime; uniform vec3 uA5; varying vec3 vW;
        float gl(vec2 p, float s, float w){ vec2 g = abs(fract(p / s - 0.5) - 0.5) * s; vec2 fw = fwidth(p) * w; vec2 l = 1.0 - smoothstep(vec2(0.0), fw, g); return max(l.x, l.y); }
        void main(){
          vec2 p = vW.xz; float d = length(p - uA5.xz);
          vec3 col = vec3(0.028, 0.023, 0.017);
          float fade = smoothstep(1600.0, 150.0, length(p));
          col += vec3(0.83, 0.66, 0.32) * (gl(p, 20.0, 1.0) * 0.07 + gl(p, 100.0, 1.4) * 0.13) * fade;
          col += vec3(0.9, 0.66, 0.3) * 0.11 * exp(-d / 85.0);
          float rip = pow(0.5 + 0.5 * sin(d * 0.075 - uTime * 2.0), 10.0);
          col += vec3(1.0, 0.78, 0.4) * 0.05 * rip * exp(-d / 220.0);
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000), groundMat);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    /* ---------------- campus base, pitches, water ---------------- */
    flat(DATA.campus, 0.15, new THREE.MeshBasicMaterial({ color: 0x15100a }));
    const fence = new THREE.LineBasicMaterial({ color: 0xc5a45e, transparent: true, opacity: 0.75 });
    lineOf(DATA.campus, 0.6, fence, true);
    lineOf(DATA.campus, 5, new THREE.LineBasicMaterial({ color: 0xc5a45e, transparent: true, opacity: 0.18 }), true);
    const pitchMat = new THREE.MeshBasicMaterial({ color: 0x18180d });
    const pitchLine = new THREE.LineBasicMaterial({ color: 0xd7bd84, transparent: true, opacity: 0.35 });
    DATA.pitches.forEach((p) => { flat(p, 0.3, pitchMat); lineOf(p, 0.45, pitchLine, true); });
    const waterMat = new THREE.ShaderMaterial({
      uniforms: U,
      vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform float uTime; varying vec3 vW; void main(){ float s = sin(vW.x * 0.5 + uTime * 1.5) * sin(vW.z * 0.6 - uTime * 1.1); vec3 c = vec3(0.04, 0.07, 0.1) + vec3(0.9, 0.75, 0.4) * pow(max(s, 0.0), 6.0) * 0.35; gl_FragColor = vec4(c, 1.0); }`,
    });
    DATA.water.forEach((w) => { flat(w, 0.35, waterMat); lineOf(w, 0.5, pitchLine, true); });

    /* ---------------- roads ---------------- */
    const majorOut = { pos: [], uv: [], idx: [] }, minorOut = { pos: [], uv: [], idx: [] }, pathOut = { pos: [], uv: [], idx: [] };
    DATA.major.forEach((r) => ribbon(r.p, r.n === 'Lý Thường Kiệt' ? 11 : 13, 0.4, majorOut));
    DATA.minor.forEach((r) => ribbon(r.p, 6, 0.32, minorOut));
    DATA.paths.forEach((p) => ribbon(p, 3.2, 0.5, pathOut));
    ribbonMesh(majorOut, new THREE.MeshBasicMaterial({ color: 0x221b11, side: THREE.DoubleSide }));
    ribbonMesh(minorOut, new THREE.MeshBasicMaterial({ color: 0x15110b, side: THREE.DoubleSide }));
    ribbonMesh(pathOut, new THREE.MeshBasicMaterial({ color: 0x2a2113, side: THREE.DoubleSide }));
    const centerDash = new THREE.LineDashedMaterial({ color: 0xc5a45e, transparent: true, opacity: 0.32, dashSize: 6, gapSize: 7 });
    DATA.major.forEach((r) => { const l = lineOf(r.p, 0.7, centerDash); l.computeLineDistances(); });

    /* ---------------- buildings ---------------- */
    const bldgVS = `
      varying vec3 vN; varying vec3 vW;
      void main(){ vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
    const bldgFS = `
      uniform float uTime, uHi, uDim, uFloor; uniform vec3 uA5, uCam; varying vec3 vN; varying vec3 vW;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main(){
        vec3 n = normalize(vN);
        float top = step(0.6, n.y);
        float h = clamp(vW.y / 40.0, 0.0, 1.0);
        float l = 0.5 + 0.5 * dot(n, normalize(vec3(-0.45, 0.75, 0.55)));
        vec3 col = vec3(0.075, 0.06, 0.04) * (0.55 + 0.9 * h) * (0.55 + 0.75 * l);
        col = mix(col, vec3(0.14, 0.11, 0.07), top * 0.75);
        vec2 tang = normalize(vec2(-n.z, n.x) + 1e-5);
        float u = dot(vW.xz, tang);
        vec2 cell = vec2(u / 3.4, vW.y / uFloor);
        vec2 f = fract(cell); vec2 id = floor(cell);
        float win = step(0.22, f.x) * step(f.x, 0.78) * step(0.32, f.y) * step(f.y, 0.78);
        float seed = hash(id + floor(vW.xz / 37.0) * 7.0);
        float lit = step(0.6, seed) * (0.75 + 0.25 * sin(uTime * (0.6 + seed) + seed * 50.0));
        float band = smoothstep(0.93, 1.0, f.y);
        col += (1.0 - top) * (win * lit * vec3(1.0, 0.76, 0.38) * 0.75 + band * vec3(0.6, 0.47, 0.22) * 0.16) * step(1.0, vW.y) * uDim;
        float d = length(vW.xz - uA5.xz);
        col += vec3(1.0, 0.72, 0.32) * 0.4 * exp(-d / 60.0) * (0.25 + 0.75 * h) * (1.0 - uHi);
        vec3 v = normalize(uCam - vW);
        col += vec3(0.9, 0.72, 0.38) * pow(1.0 - max(dot(n, v), 0.0), 3.0) * 0.16;
        vec3 gold = mix(vec3(0.42, 0.28, 0.09), vec3(1.0, 0.86, 0.52), h * 1.4) * (0.7 + 0.35 * l);
        gold += vec3(1.0, 0.9, 0.65) * top * 0.25 + win * vec3(1.0, 0.95, 0.8) * 0.35 * (1.0 - top);
        gold *= 0.85 + 0.15 * sin(uTime * 2.2);
        col = mix(col * uDim, gold, uHi);
        gl_FragColor = vec4(col, 1.0);
      }`;
    const camU = { value: new THREE.Vector3() };
    const mkBldgMat = (hi, dim) => new THREE.ShaderMaterial({
      uniforms: { ...U, uA5: { value: A5 }, uCam: camU, uHi: { value: hi }, uDim: { value: dim }, uFloor: { value: FLOOR } },
      vertexShader: bldgVS, fragmentShader: bldgFS,
    });
    const bMat = mkBldgMat(0, 1), a5Mat = mkBldgMat(1, 1), ctxMat = mkBldgMat(0, 0.55);
    const edgeMat = new THREE.LineBasicMaterial({ color: 0xc5a45e, transparent: true, opacity: 0.5 });
    const ctxEdge = new THREE.LineBasicMaterial({ color: 0xc5a45e, transparent: true, opacity: 0.14 });
    const a5Edge = new THREE.LineBasicMaterial({ color: 0xefe3c4 });
    const buildings = [];
    const centroid = (poly) => poly.reduce((a, p) => [a[0] + p[0] / poly.length, a[1] + p[1] / poly.length], [0, 0]);
    function addBuilding(b, isCtx) {
      const h = b.l * FLOOR;
      const g = new THREE.ExtrudeGeometry(shapeOf(b.p), { depth: h, bevelEnabled: false });
      g.rotateX(-Math.PI / 2);
      const isA5 = b.n === 'A5';
      const group = new THREE.Group();
      group.add(new THREE.Mesh(g, isA5 ? a5Mat : isCtx ? ctxMat : bMat));
      group.add(new THREE.LineSegments(new THREE.EdgesGeometry(g, 30), isA5 ? a5Edge : isCtx ? ctxEdge : edgeMat));
      const c = centroid(b.p);
      group.scale.y = 0.001;
      scene.add(group);
      buildings.push({ group, delay: Math.hypot(c[0] - A5.x, c[1] - A5.z) / 260 });
      return { c, h };
    }
    const bInfo = DATA.buildings.map((b) => ({ b, ...addBuilding(b, false) }));
    DATA.context.forEach((b) => addBuilding(b, true));

    /* ---------------- A5 beacon, rings, marker ---------------- */
    const beamMat = new THREE.ShaderMaterial({
      uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float uTime; varying vec2 vUv; void main(){ float a = pow(1.0 - vUv.y, 2.2) * (0.55 + 0.25 * sin(uTime * 2.4 + vUv.y * 8.0)); float streak = 0.5 + 0.5 * sin(vUv.x * 62.83 + uTime * 3.0); gl_FragColor = vec4(vec3(1.0, 0.8, 0.42) * (0.8 + streak * 0.4), a * 0.42); }`,
    });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(9, 15, 300, 48, 1, true), beamMat);
    beam.position.set(A5.x, 150 + a5H * 0.5, A5.z);
    scene.add(beam);
    const core = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 300, 12, 1, true), beamMat);
    core.position.copy(beam.position);
    scene.add(core);
    const ringMat = (o) => new THREE.MeshBasicMaterial({ color: 0xe4d0a0, transparent: true, opacity: o, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const ripples = [0, 1, 2].map((i) => {
      const m = new THREE.Mesh(new THREE.RingGeometry(30, 32.5, 72), ringMat(0.6));
      m.rotation.x = -Math.PI / 2; m.position.set(A5.x, 0.9, A5.z); scene.add(m);
      return { m, off: i / 3 };
    });
    const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(7, 0), new THREE.MeshBasicMaterial({ color: 0xeedcb0 }));
    diamond.scale.y = 1.5;
    diamond.position.set(A5.x, a5H + 26, A5.z);
    scene.add(diamond);
    const dEdges = new THREE.LineSegments(new THREE.EdgesGeometry(diamond.geometry), new THREE.LineBasicMaterial({ color: 0x7a5a1c }));
    diamond.add(dEdges);
    const dGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xe9cf98, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    dGlow.scale.set(60, 60, 1); dGlow.position.copy(diamond.position); scene.add(dGlow);

    /* ---------------- gates ---------------- */
    const gateGroup = {};
    [['main', DATA.markers.mainGate], ['tht', DATA.markers.thtGate]].forEach(([k, p]) => {
      const g = new THREE.Group();
      const pillarMat = new THREE.MeshBasicMaterial({ color: 0xd7bd84 });
      const pill = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 16, 12), pillarMat); pill.position.y = 8; g.add(pill);
      const ring = new THREE.Mesh(new THREE.RingGeometry(7, 8.6, 48), ringMat(0.8)); ring.rotation.x = -Math.PI / 2; ring.position.y = 1; g.add(ring);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xe9cf98, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      glow.scale.set(34, 34, 1); glow.position.y = 16; g.add(glow);
      g.position.set(p[0], 0, p[1]);
      scene.add(g);
      gateGroup[k] = { g, ring, glow };
    });

    /* ---------------- route ---------------- */
    const routeU = { ...U, uReveal: { value: 0 } };
    const routeFS = (k) => `
        uniform float uTime, uReveal; varying vec2 vUv;
        void main(){
          if (vUv.x > uReveal) discard;
          float across = abs(vUv.y - 0.5) * 2.0;
          float glow = pow(1.0 - across, 1.6);
          float ch = fract((vUv.x - across * 3.6) / 11.0 - uTime * 0.75);
          float chev = smoothstep(0.0, 0.06, ch) * smoothstep(0.34, 0.2, ch) * step(across, 0.78);
          float head = smoothstep(uReveal - 16.0, uReveal, vUv.x);
          vec3 c = vec3(1.0, 0.74, 0.3) * glow * 0.95 + vec3(1.0, 0.96, 0.84) * chev * 1.2 + vec3(1.0, 0.9, 0.6) * head * glow;
          gl_FragColor = vec4(c, (glow * 0.7 + chev * 0.95 + head * 0.5) * ${k});
        }`;
    const routeVS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
    const routeMat = new THREE.ShaderMaterial({
      uniforms: routeU, vertexShader: routeVS, fragmentShader: routeFS('1.0'),
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });
    // faint "x-ray" pass so the path stays readable behind buildings
    const routeGhostMat = new THREE.ShaderMaterial({
      uniforms: routeU, vertexShader: routeVS, fragmentShader: routeFS('0.38'),
      transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    let routeMesh = null, routeGhost = null, routeS = null, routeLen = 1, revealT = 0;
    const comet = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xf2e8cf, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending }));
    comet.scale.set(30, 30, 1); comet.renderOrder = 7; scene.add(comet);
    const cometCore = new THREE.Mesh(new THREE.SphereGeometry(2.4, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false, transparent: true }));
    cometCore.renderOrder = 8;
    scene.add(cometCore);
    let routeKey = (window.INVITE_ROUTE && window.INVITE_ROUTE()) || 'main';
    function buildRoute(key) {
      const pts = DATA.routes[key]; if (!pts) return;
      if (routeMesh) { scene.remove(routeMesh); scene.remove(routeGhost); routeMesh.geometry.dispose(); }
      const out = { pos: [], uv: [], idx: [] };
      routeLen = ribbon(pts, 12, 1.1, out);
      routeMesh = ribbonMesh(out, routeMat);
      routeMesh.renderOrder = 5;
      routeGhost = new THREE.Mesh(routeMesh.geometry, routeGhostMat);
      routeGhost.renderOrder = 6;
      scene.add(routeGhost);
      routeS = sampler(pts);
      revealT = 0;
      Object.entries(gateGroup).forEach(([k, o]) => { const on = k === key; o.ring.material.opacity = on ? 0.9 : 0.25; o.glow.material.opacity = on ? 1 : 0.35; });
      labels.forEach((L) => L.gate && L.el.classList.toggle('is-active', L.gate === key));
    }

    /* ---------------- traffic ---------------- */
    const carRoads = DATA.major.filter((r) => r.p.length > 1 && plen(r.p) > 60).map((r) => ({ s: sampler(r.p), oneway: r.n === 'Lý Thường Kiệt' }));
    const CARS = isSmall() ? 70 : 150;
    const cars = [];
    for (let i = 0; i < CARS && carRoads.length; i++) {
      const road = carRoads[Math.floor(Math.random() * carRoads.length)];
      const dir = road.oneway ? 1 : Math.random() < 0.5 ? 1 : -1;
      cars.push({ road, d: Math.random() * road.s.L, v: (9 + Math.random() * 9) * dir, side: road.oneway ? (Math.random() - 0.5) * 6 : dir * 2.8 });
    }
    const carPos = new Float32Array(CARS * 3), carCol = new Float32Array(CARS * 3);
    cars.forEach((c, i) => { const warm = Math.random() < 0.55; carCol.set(warm ? [1, 0.8, 0.45] : [1, 0.97, 0.88], i * 3); });
    const carGeo = new THREE.BufferGeometry();
    carGeo.setAttribute('position', new THREE.BufferAttribute(carPos, 3));
    carGeo.setAttribute('color', new THREE.BufferAttribute(carCol, 3));
    const carPts = new THREE.Points(carGeo, new THREE.PointsMaterial({ size: 7, map: glowTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
    carPts.frustumCulled = false;
    scene.add(carPts);
    const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
    function updateCars(dt) {
      cars.forEach((c, i) => {
        c.d += c.v * dt;
        const L = c.road.s.L;
        if (c.d > L) c.d -= L; if (c.d < 0) c.d += L;
        c.road.s.at(c.d, tmpA); c.road.s.at(c.d + 1, tmpB);
        const dx = tmpB.x - tmpA.x, dz = tmpB.z - tmpA.z, l = Math.hypot(dx, dz) || 1;
        carPos[i * 3] = tmpA.x + (-dz / l) * c.side; carPos[i * 3 + 1] = 2.2; carPos[i * 3 + 2] = tmpA.z + (dx / l) * c.side;
      });
      carGeo.attributes.position.needsUpdate = true;
    }

    /* ---------------- HTML labels ---------------- */
    const labels = [];
    const addLabel = (cls, html, pos, extra = {}) => {
      const el = document.createElement('div');
      el.className = 'ml ' + cls;
      el.innerHTML = `<span class="ml__in">${html}</span>`;
      labelsEl.appendChild(el);
      const L = { el, pos, ...extra };
      labels.push(L);
      return L;
    };
    addLabel('ml--a5', '<b><em>A5</em>Hội trường · Lễ tốt nghiệp</b><i></i>', new THREE.Vector3(A5.x, a5H + 40, A5.z), { grow: true });
    bInfo.forEach(({ b, c, h }) => {
      if (!b.n || b.n === 'A5') return;
      addLabel('ml--bldg', b.n, new THREE.Vector3(c[0], h + 2, c[1]), { bldg: true, grow: true });
    });
    const mg = DATA.markers.mainGate, tg = DATA.markers.thtGate;
    addLabel('ml--gate', 'Cổng chính · 268 Lý Thường Kiệt', new THREE.Vector3(mg[0], 20, mg[1]), { gate: 'main', always: true });
    addLabel('ml--gate', 'Cổng Tô Hiến Thành', new THREE.Vector3(tg[0], 20, tg[1]), { gate: 'tht', always: true });
    DATA.streets.forEach((s) => s.p && addLabel('ml--street', s.n, new THREE.Vector3(s.p[0], 2, s.p[1]), { street: true }));
    const P = DATA.markers;
    if (P.parking) addLabel('ml--poi', '<svg class="ic" viewBox="0 0 24 24"><use href="#i-parking"/></svg>Nhà xe', new THREE.Vector3(P.parking[0], 4, P.parking[1]), { poi: true });
    if (P.busMain) addLabel('ml--poi', '<svg class="ic" viewBox="0 0 24 24"><use href="#i-bus"/></svg>Trạm xe buýt', new THREE.Vector3(P.busMain[0], 4, P.busMain[1]), { poi: true });
    if (P.pond) addLabel('ml--poi', 'Hồ nước', new THREE.Vector3(P.pond[0], 2, P.pond[1]), { poi: true, small: true });

    const v3 = new THREE.Vector3();
    function updateLabels(W, H) {
      const r = cam.r;
      labels.forEach((L) => {
        v3.copy(L.pos);
        if (L.grow) v3.y *= buildingGrow; // follow rising buildings
        v3.project(camera);
        const vis = v3.z < 1 && v3.x > -1.2 && v3.x < 1.2 && v3.y > -1.2 && v3.y < 1.2;
        let o = vis ? 1 : 0;
        if (L.bldg) o *= Math.min(1, Math.max(0, (920 - r) / 260)) * buildingGrow;
        if (L.street) o *= 0.9;
        if (L.poi) o *= Math.min(1, Math.max(0, (760 - r) / 200));
        if (o !== L.o) { L.el.style.opacity = o.toFixed(2); L.o = o; }
        if (o > 0) L.el.style.transform = `translate3d(${((v3.x * 0.5 + 0.5) * W).toFixed(1)}px,${((-v3.y * 0.5 + 0.5) * H).toFixed(1)}px,0)`;
      });
    }

    /* ---------------- camera rig ---------------- */
    const cam = { tx: 0, tz: 40, r: 1500, th: -0.35, ph: 0.32 };
    const goal = { tx: 0, tz: 40, r: 640, th: -0.35, ph: 0.98 };
    const fitR = (r) => { const asp = root.clientWidth / Math.max(1, root.clientHeight); return r * Math.max(1, Math.pow(1.25 / asp, 0.85)); };
    function frameRoute(key) {
      const pts = DATA.routes[key] || DATA.routes.main;
      let minX = 1e9, maxX = -1e9, minZ = 1e9, maxZ = -1e9;
      pts.concat([[A5.x, A5.z]]).forEach((p) => { minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]); minZ = Math.min(minZ, p[1]); maxZ = Math.max(maxZ, p[1]); });
      goal.tx = (minX + maxX) / 2; goal.tz = (minZ + maxZ) / 2 + 10;
      goal.r = fitR(Math.max(maxX - minX, maxZ - minZ) * 1.25 + 260);
      goal.ph = 0.92;
    }
    function overview() { goal.tx = 0; goal.tz = 40; goal.r = fitR(680); goal.ph = 0.96; goal.th = -0.35; }

    let lastInteract = 0, flying = false, flyT = 0, flyHold = 0;
    const now = () => performance.now();
    const wrapAngle = (a, ref) => { while (a - ref > Math.PI) a -= Math.PI * 2; while (a - ref < -Math.PI) a += Math.PI * 2; return a; };
    function startFly() {
      if (!routeS) return;
      flying = true; flyT = 0; flyHold = 0;
      flyBtn && flyBtn.classList.add('is-on');
      if (flyBtn) flyBtn.querySelector('span').textContent = 'Dừng';
    }
    function stopFly(reframe) {
      if (!flying) return;
      flying = false;
      flyBtn && flyBtn.classList.remove('is-on');
      if (flyBtn) flyBtn.querySelector('span').textContent = 'Bay theo lộ trình';
      if (reframe) frameRoute(routeKey);
    }

    /* pointer controls */
    canvas.tabIndex = 0;
    const pointers = new Map();
    let pinchD = 0, pinchY = 0;
    canvas.addEventListener('pointerdown', (e) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
      lastInteract = now(); stopFly(false);
      if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinchD = Math.hypot(a.x - b.x, a.y - b.y); pinchY = (a.y + b.y) / 2; }
    });
    canvas.addEventListener('pointermove', (e) => {
      const p = pointers.get(e.pointerId); if (!p) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      lastInteract = now();
      if (pointers.size === 1) {
        goal.th -= dx * 0.0055;
        if (e.pointerType !== 'touch') goal.ph = Math.min(1.36, Math.max(0.2, goal.ph - dy * 0.004));
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y), my = (a.y + b.y) / 2;
        if (pinchD > 0) goal.r = Math.min(1500, Math.max(110, goal.r * (pinchD / d)));
        goal.ph = Math.min(1.36, Math.max(0.2, goal.ph - (my - pinchY) * 0.004));
        pinchD = d; pinchY = my;
      }
    });
    const endPtr = (e) => { pointers.delete(e.pointerId); pinchD = 0; };
    canvas.addEventListener('pointerup', endPtr);
    canvas.addEventListener('pointercancel', endPtr);
    canvas.addEventListener('lostpointercapture', endPtr);
    let hintTimer;
    canvas.addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        lastInteract = now(); stopFly(false);
        goal.r = Math.min(1500, Math.max(110, goal.r * Math.exp(e.deltaY * 0.0016)));
      } else if (hintEl) {
        hintEl.classList.add('is-on');
        clearTimeout(hintTimer);
        hintTimer = setTimeout(() => hintEl.classList.remove('is-on'), 1100);
      }
    }, { passive: false });
    canvas.addEventListener('keydown', (e) => {
      const k = e.key; let used = true;
      if (k === 'ArrowLeft') goal.th += 0.15; else if (k === 'ArrowRight') goal.th -= 0.15;
      else if (k === 'ArrowUp') goal.ph = Math.max(0.2, goal.ph - 0.08); else if (k === 'ArrowDown') goal.ph = Math.min(1.36, goal.ph + 0.08);
      else if (k === '+' || k === '=') goal.r = Math.max(110, goal.r * 0.82); else if (k === '-') goal.r = Math.min(1500, goal.r * 1.2);
      else used = false;
      if (used) { e.preventDefault(); lastInteract = now(); }
    });
    root.querySelectorAll('[data-map]').forEach((b) => b.addEventListener('click', () => {
      const a = b.dataset.map; lastInteract = now();
      if (a === 'fly') { flying ? stopFly(true) : startFly(); return; }
      stopFly(false);
      if (a === 'reset') overview();
      if (a === 'in') goal.r = Math.max(110, goal.r * 0.72);
      if (a === 'out') goal.r = Math.min(1500, goal.r * 1.35);
    }));
    addEventListener('invite:route', (e) => {
      routeKey = e.detail.route; stopFly(false);
      buildRoute(routeKey); frameRoute(routeKey); lastInteract = now();
    });

    /* ---------------- resize ---------------- */
    let W = 1, H = 1;
    function resize() {
      W = root.clientWidth; H = root.clientHeight;
      renderer.setSize(W, H, false);
      camera.aspect = W / H; camera.updateProjectionMatrix();
    }
    resize();
    new ResizeObserver(resize).observe(root);

    /* ---------------- loop ---------------- */
    buildRoute(routeKey);
    frameRoute(routeKey);
    let buildingGrow = 0, buildStart = -1, ready = false;
    const ease = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
    function loop() {
      requestAnimationFrame(loop);
      if (!inView || document.hidden) { clock.getDelta(); return; }
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = (U.uTime.value += dt);
      if (buildStart < 0) buildStart = t;

      // buildings rise, rippling out from A5
      const bt = t - buildStart;
      if (buildingGrow < 1) {
        let minG = 1;
        buildings.forEach((b) => { const g = reduced ? 1 : ease((bt - 0.3 - b.delay) / 1.1); b.group.scale.y = Math.max(0.001, g); minG = Math.min(minG, g); });
        buildingGrow = reduced ? 1 : ease((bt - 0.2) / 1.6);
        if (minG >= 1) buildingGrow = 1;
      }
      // route reveal
      revealT += dt;
      routeMat.uniforms.uReveal.value = reduced ? routeLen : routeLen * ease((revealT - (bt < 2 ? 1.4 : 0.1)) / 2.2) + 0.001;

      // comet + fly-through
      if (routeS) {
        let d;
        if (flying) {
          flyT += dt;
          const speed = 26;
          d = Math.min(routeS.L, flyT * speed);
          const ahead = routeS.at(Math.min(routeS.L, d + 12), tmpB);
          const here = routeS.at(d, tmpA);
          const hx = ahead.x - here.x, hz = ahead.z - here.z;
          if (Math.hypot(hx, hz) > 0.01) goal.th = wrapAngle(Math.atan2(-hx, -hz), cam.th);
          goal.tx = here.x; goal.tz = here.z; goal.r = 150; goal.ph = 1.02;
          if (d >= routeS.L) {
            flyHold += dt;
            goal.tx = A5.x; goal.tz = A5.z; goal.r = 190; goal.ph = 0.9;
            if (flyHold > 2.2) stopFly(true);
          }
        } else {
          const cycle = routeS.L / 30 + 1.2;
          d = Math.min(routeS.L, ((t % cycle) / (cycle - 1.2)) * routeS.L);
        }
        routeS.at(d, tmpA);
        const vis = routeMat.uniforms.uReveal.value >= routeLen * 0.98;
        comet.visible = cometCore.visible = vis;
        comet.position.set(tmpA.x, 4, tmpA.z); cometCore.position.copy(comet.position);
      }

      // idle drift
      if (!flying && now() - lastInteract > 7000 && !reduced) goal.th += dt * 0.035;

      // ease camera rig
      const k = reduced ? 1 : 1 - Math.exp(-dt * (flying ? 2.4 : 4.2));
      const kr = reduced ? 1 : 1 - Math.exp(-dt * 2.6);
      cam.tx += (goal.tx - cam.tx) * k; cam.tz += (goal.tz - cam.tz) * k;
      cam.r += (goal.r - cam.r) * kr;
      cam.th += (goal.th - cam.th) * k; cam.ph += (goal.ph - cam.ph) * kr;
      const sp = Math.sin(cam.ph);
      camera.position.set(cam.tx + cam.r * sp * Math.sin(cam.th), cam.r * Math.cos(cam.ph), cam.tz + cam.r * sp * Math.cos(cam.th));
      camera.lookAt(cam.tx, 0, cam.tz);
      camU.value.copy(camera.position);
      if (compassEl) compassEl.style.setProperty('--rot', `${(cam.th * 180) / Math.PI}deg`);

      // A5 fx
      ripples.forEach((rp) => { const p = (t * 0.33 + rp.off) % 1; const s = 0.4 + p * 3.2; rp.m.scale.set(s, s, s); rp.m.material.opacity = (1 - p) * 0.55; });
      diamond.rotation.y = t * 1.2;
      diamond.position.y = a5H * buildingGrow + 26 + Math.sin(t * 2) * 3;
      dGlow.position.copy(diamond.position);
      dGlow.material.opacity = 0.75 + Math.sin(t * 2.4) * 0.25;
      beam.scale.y = core.scale.y = Math.max(0.001, buildingGrow);
      beam.position.y = core.position.y = (150 + a5H * 0.5) * buildingGrow;
      Object.values(gateGroup).forEach((o, i) => { const s = 1 + 0.15 * Math.sin(t * 3 + i); o.ring.scale.set(s, s, s); });

      updateCars(dt);
      renderer.render(scene, camera);
      updateLabels(W, H);
      if (!ready) { ready = true; root.classList.add('is-ready'); }
    }
    loop();
    return { overview, startFly };
  }
})();
