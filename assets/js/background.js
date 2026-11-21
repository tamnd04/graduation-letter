/* ==========================================================================
   Gold-dust particle field (three.js) — morphs into a new shape per section:
   stars → galaxy → clock ring → "29.11" → mortarboard → floor grid → globe → heart
   ========================================================================== */
(() => {
  'use strict';
  const canvas = document.getElementById('bg-canvas');
  if (!canvas || !window.THREE_URL) return;
  const reduced = document.documentElement.classList.contains('reduced');
  const isSmall = matchMedia('(max-width: 760px)').matches || matchMedia('(pointer: coarse)').matches;

  import(window.THREE_URL).then(init).catch((e) => console.warn('[bg] three.js unavailable', e));

  async function init(THREE) {
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
    } catch (e) { return; }
    // soft glowing points don't need full retina resolution — big fill-rate saving on 2x/3x screens
    const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    renderer.setPixelRatio(DPR);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100);
    camera.position.set(0, 0, 9);

    const N = reduced ? 3000 : 10000;
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const R = Math.random;
    const gauss = () => (R() + R() + R() + R() + R() + R() - 3) / 3;
    const TAU = Math.PI * 2;

    /* -------- shape generators (all return Float32Array N*3) -------- */
    const rotX = (a, ang) => { const c = Math.cos(ang), s = Math.sin(ang); for (let i = 0; i < a.length; i += 3) { const y = a[i + 1], z = a[i + 2]; a[i + 1] = y * c - z * s; a[i + 2] = y * s + z * c; } return a; };
    const rotZ = (a, ang) => { const c = Math.cos(ang), s = Math.sin(ang); for (let i = 0; i < a.length; i += 3) { const x = a[i], y = a[i + 1]; a[i] = x * c - y * s; a[i + 1] = x * s + y * c; } return a; };

    function stars() {
      const a = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) { a[i * 3] = (R() * 2 - 1) * 11; a[i * 3 + 1] = (R() * 2 - 1) * 7; a[i * 3 + 2] = -9 + R() * 12; }
      return a;
    }
    function galaxy() {
      const a = new Float32Array(N * 3), arms = 4;
      for (let i = 0; i < N; i++) {
        let x, y, z;
        if (i % 9 === 0) { const r = Math.pow(R(), 2.2) * .75; const th = R() * TAU, ph = Math.acos(2 * R() - 1); x = r * Math.sin(ph) * Math.cos(th); y = r * Math.cos(ph) * .55; z = r * Math.sin(ph) * Math.sin(th); }
        else {
          const r = Math.pow(R(), 1.05) * 3.7 + .15;
          const ang = ((i % arms) / arms) * TAU + r * 1.35;
          const spread = .32 * (.3 + r * .14);
          x = Math.cos(ang) * r + gauss() * spread; z = Math.sin(ang) * r + gauss() * spread; y = gauss() * .2 * (1.2 - r / 4.2);
        }
        a[i * 3] = x; a[i * 3 + 1] = y; a[i * 3 + 2] = z;
      }
      return rotZ(rotX(a, 1.08), .25);
    }
    function ring() {
      const a = new Float32Array(N * 3);
      for (let i = 0; i < N; i++) {
        const k = R(); let r, th = R() * TAU, z = gauss() * .06;
        if (k < .5) r = 3.15 + gauss() * .05;
        else if (k < .66) r = 2.78 + gauss() * .02;
        else if (k < .84) { const tick = Math.floor(R() * 60); th = tick / 60 * TAU; const major = tick % 5 === 0; r = (major ? 2.86 : 2.9) + R() * (major ? .22 : .12); }
        else { r = 3.6 + Math.abs(gauss()) * 1.4; z = gauss() * .5; }
        a[i * 3] = Math.cos(th) * r; a[i * 3 + 1] = Math.sin(th) * r; a[i * 3 + 2] = z;
      }
      return rotX(a, .32);
    }
    function textShape(text) {
      const W = 1024, H = 380, c = document.createElement('canvas');
      c.width = W; c.height = H;
      const g = c.getContext('2d');
      g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '500 320px "Cormorant Garamond", "Times New Roman", serif';
      g.fillText(text, W / 2, H / 2 + 12);
      const d = g.getImageData(0, 0, W, H).data, pts = [];
      for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (d[(y * W + x) * 4 + 3] > 140) pts.push(x, y);
      const a = new Float32Array(N * 3), S = 7.4;
      const count = pts.length / 2;
      for (let i = 0; i < N; i++) {
        if (i % 9 === 0 || !count) { a[i * 3] = (R() - .5) * 9; a[i * 3 + 1] = (R() - .5) * 4; a[i * 3 + 2] = gauss() * 1.5; continue; }
        const j = Math.floor(R() * count) * 2;
        a[i * 3] = (pts[j] / W - .5) * S + (R() - .5) * .02;
        a[i * 3 + 1] = -(pts[j + 1] / H - .5) * S * (H / W);
        a[i * 3 + 2] = gauss() * .22;
      }
      return a;
    }
    function cap() {
      const a = new Float32Array(N * 3), c45 = Math.SQRT1_2, half = 1.75, top = .6;
      for (let i = 0; i < N; i++) {
        const k = R(); let x, y, z;
        if (k < .6) { // board (edges emphasised)
          let u = (R() * 2 - 1) * half, v = (R() * 2 - 1) * half;
          if (R() < .45) { if (R() < .5) u = Math.sign(u) * half; else v = Math.sign(v) * half; }
          x = u * c45 - v * c45; z = u * c45 + v * c45; y = top + (R() < .25 ? -R() * .12 : 0);
        } else if (k < .8) { // skull cap — front half only so it reads as a solid band
          const th = Math.PI * (.08 + R() * .84), h = Math.pow(R(), .8); const rr = 1.12 - h * .06;
          x = Math.cos(th) * rr; z = Math.sin(th) * rr * .92; y = top - .06 - h * .85;
        } else if (k < .82) { // button
          const th = R() * TAU, ph = Math.acos(2 * R() - 1), r = .13;
          x = r * Math.sin(ph) * Math.cos(th); y = top + .08 + r * Math.cos(ph) * .6; z = r * Math.sin(ph) * Math.sin(th);
        } else if (k < .9) { // cord along board to the right corner
          const t = R(); x = t * 2.35; y = top + .06 - t * .02 + gauss() * .015; z = gauss() * .015;
        } else if (k < .97) { // tassel hanging + fringe
          const t = R();
          if (t < .55) { const s = t / .55; x = 2.4 + Math.sin(s * 1.4) * .08; y = top - s * 1.45; z = gauss() * .02; }
          else { const s = (t - .55) / .45, th = R() * TAU, rr = s * .2 * R(); x = 2.42 + Math.cos(th) * rr; y = top - 1.45 - s * .75; z = Math.sin(th) * rr; }
        } else { const th = R() * TAU, ph = Math.acos(2 * R() - 1), r = 3 + R() * 2.5; x = r * Math.sin(ph) * Math.cos(th); y = r * Math.cos(ph) * .7; z = r * Math.sin(ph) * Math.sin(th) * .5; }
        a[i * 3] = x - .45; a[i * 3 + 1] = y + .1; a[i * 3 + 2] = z;
      }
      return rotZ(rotX(a, .3), -.1);
    }
    function grid() {
      const a = new Float32Array(N * 3), side = Math.ceil(Math.sqrt(N)), span = 22;
      for (let i = 0; i < N; i++) {
        const gx = i % side, gz = Math.floor(i / side);
        const x = (gx / (side - 1) - .5) * span, z = -16 + (gz / (side - 1)) * 20;
        a[i * 3] = x; a[i * 3 + 2] = z;
        a[i * 3 + 1] = -2.6 + Math.sin(x * .55) * Math.cos(z * .45) * .45;
      }
      return a;
    }
    function globe() {
      const a = new Float32Array(N * 3), r = 2.7;
      for (let i = 0; i < N; i++) {
        const k = R(); let th, ph;
        if (k < .42) { th = Math.floor(R() * 12) / 12 * TAU; ph = R() * Math.PI; }
        else if (k < .66) { const lat = (Math.floor(R() * 7) - 3) / 4 * (Math.PI / 2); ph = Math.PI / 2 - lat; th = R() * TAU; }
        else { th = R() * TAU; ph = Math.acos(2 * R() - 1); }
        const rr = k > .97 ? r * (1.25 + R() * .6) : r;
        a[i * 3] = rr * Math.sin(ph) * Math.cos(th); a[i * 3 + 1] = rr * Math.cos(ph); a[i * 3 + 2] = rr * Math.sin(ph) * Math.sin(th);
      }
      return rotZ(rotX(a, .38), .2);
    }
    function heart() {
      const a = new Float32Array(N * 3), S = .165;
      for (let i = 0; i < N; i++) {
        const t = R() * TAU, s = R() < .42 ? 1 : Math.sqrt(R());
        const hx = 16 * Math.pow(Math.sin(t), 3);
        const hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        a[i * 3] = hx * S * s; a[i * 3 + 1] = hy * S * s + .35; a[i * 3 + 2] = gauss() * .75 * (1 - s * s * .75);
      }
      return a;
    }

    if (document.fonts) { try { await document.fonts.load('500 320px "Cormorant Garamond"'); } catch (e) { /* fallback font */ } }
    const SHAPES = {
      stars: { make: stars, opacity: .62, spin: .035, scaled: false },
      galaxy: { make: galaxy, opacity: .8, spin: .13, scaled: false },
      ring: { make: ring, opacity: .74, face: true, spinZ: .13 },
      date: { make: () => textShape('29.11'), opacity: .6, face: true, sway: .18 },
      cap: { make: cap, opacity: .7, face: true, sway: .5 },
      grid: { make: grid, opacity: .5, face: true, scaled: false },
      globe: { make: globe, opacity: .7, spin: .32 },
      heart: { make: heart, opacity: .82, face: true, sway: .35 },
    };
    const cache = {};
    const shapeData = (k) => (cache[k] || (cache[k] = SHAPES[k].make()));

    /* -------- geometry -------- */
    const from = new Float32Array(N * 3);
    const to = new Float32Array(N * 3);
    const rand = new Float32Array(N * 4);
    const dir = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      rand[i * 4] = R(); rand[i * 4 + 1] = R(); rand[i * 4 + 2] = R(); rand[i * 4 + 3] = R();
      let dx = gauss(), dy = gauss(), dz = gauss(); const l = Math.hypot(dx, dy, dz) || 1;
      dir[i * 3] = dx / l; dir[i * 3 + 1] = dy / l; dir[i * 3 + 2] = dz / l;
    }
    const st = shapeData('stars');
    from.set(st); to.set(st);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(to, 3));
    geo.setAttribute('aFrom', new THREE.BufferAttribute(from, 3));
    geo.setAttribute('aRand', new THREE.BufferAttribute(rand, 4));
    geo.setAttribute('aDir', new THREE.BufferAttribute(dir, 3));

    const uniforms = {
      uTime: { value: 0 }, uProgress: { value: 1 }, uSwirl: { value: 1.2 },
      uPixelRatio: { value: DPR }, uSize: { value: isSmall ? 38 : 36 },
      uTurb: { value: 0 }, uMouse: { value: new THREE.Vector2(99, 99) }, uMouseOn: { value: 0 },
      uOpacity: { value: 0 },
      uColA: { value: new THREE.Vector3(0.62, 0.49, 0.26) },  // antique gold
      uColB: { value: new THREE.Vector3(0.92, 0.86, 0.7) },   // champagne
      uColC: { value: new THREE.Vector3(0.58, 0.71, 1.0) },   // sapphire accent
    };
    const DMAX = 0.45;
    const mat = new THREE.ShaderMaterial({
      uniforms, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */`
        uniform float uTime, uProgress, uSwirl, uPixelRatio, uSize, uTurb, uMouseOn, uOpacity;
        uniform vec2 uMouse; uniform vec3 uColA, uColB, uColC;
        attribute vec3 aFrom; attribute vec4 aRand; attribute vec3 aDir;
        varying vec3 vColor; varying float vAlpha;
        void main() {
          float p = clamp((uProgress - aRand.w * ${DMAX.toFixed(2)}) / ${(1 - DMAX).toFixed(2)}, 0.0, 1.0);
          float e = p * p * (3.0 - 2.0 * p);
          vec3 pos = mix(aFrom, position, e);
          pos += aDir * sin(p * 3.14159265) * uSwirl;
          float t = uTime * 0.95 + aRand.y * 6.2831853;
          float amp = 0.045 + uTurb * 0.42;
          pos += vec3(sin(t + pos.y * 1.7), cos(t * 0.83 + pos.x * 1.3), sin(t * 1.13 + pos.z * 1.1)) * amp * (0.4 + aRand.x);
          vec4 world = modelMatrix * vec4(pos, 1.0);
          vec2 dm = world.xy - uMouse; float dl = length(dm);
          float push = smoothstep(1.05, 0.0, dl) * uMouseOn;
          world.xy += (dm / max(dl, 0.001)) * push * 0.32;
          world.z += push * 0.5;
          vec4 mv = viewMatrix * world;
          gl_Position = projectionMatrix * mv;
          float big = step(0.985, aRand.x);
          float size = uSize * (0.32 + aRand.x * aRand.x * 1.45) * (1.0 + big * 3.2);
          float tw = 0.55 + 0.45 * sin(uTime * (1.1 + aRand.y * 2.2) + aRand.z * 40.0);
          gl_PointSize = size * uPixelRatio / max(-mv.z, 0.6);
          vAlpha = tw * (1.0 - big * 0.78) * smoothstep(24.0, 5.0, -mv.z) * smoothstep(0.3, 2.0, -mv.z) * uOpacity * (0.8 + push * 0.6);
          // ~30% of the dust is sapphire, the rest antique gold → champagne
          float blue = step(0.7, fract(aRand.x * 7.31 + aRand.z * 3.17));
          vColor = mix(mix(uColA, uColB, aRand.z), uColC, blue);
        }`,
      fragmentShader: /* glsl */`
        varying vec3 vColor; varying float vAlpha;
        void main() {
          vec2 c = gl_PointCoord - 0.5; float r = length(c);
          if (r > 0.5) discard;
          float a = pow(1.0 - r * 2.0, 1.8);
          float core = smoothstep(0.16, 0.0, r);
          gl_FragColor = vec4(vColor * (0.82 + core * 0.35), (a * 0.85 + core * 0.35) * vAlpha);
        }`,
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    scene.add(points);

    /* -------- morph control -------- */
    let current = 'stars', target = 'stars', duration = 2.2, opacityTarget = SHAPES.stars.opacity, swirlTarget = 1.2;
    let pendingShape = 'galaxy';
    let opened = !!(window.INVITE_STATE && window.INVITE_STATE.opened);
    const fitScale = () => { const asp = innerWidth / innerHeight; return Math.min(1, Math.max(.5, asp / 1.45)); };

    function snapshot() {
      // freeze the in-between positions into `from` so a new morph starts seamlessly
      const P = uniforms.uProgress.value, sw = uniforms.uSwirl.value;
      for (let i = 0; i < N; i++) {
        const p = Math.min(1, Math.max(0, (P - rand[i * 4 + 3] * DMAX) / (1 - DMAX)));
        const e = p * p * (3 - 2 * p), s = Math.sin(p * Math.PI) * sw;
        for (let k = 0; k < 3; k++) from[i * 3 + k] = from[i * 3 + k] + (to[i * 3 + k] - from[i * 3 + k]) * e + dir[i * 3 + k] * s;
      }
    }
    function morphTo(name, opts = {}) {
      if (!SHAPES[name]) return;
      if (name === target && !opts.force) return;
      snapshot();
      const src = shapeData(name), sc = SHAPES[name].scaled === false ? 1 : fitScale();
      for (let i = 0; i < src.length; i++) to[i] = src[i] * sc;
      geo.attributes.aFrom.needsUpdate = true;
      geo.attributes.position.needsUpdate = true;
      uniforms.uProgress.value = 0;
      duration = opts.duration || 1.7;
      swirlTarget = opts.swirl != null ? opts.swirl : 1.1;
      uniforms.uSwirl.value = swirlTarget;
      target = name; current = name;
      opacityTarget = SHAPES[name].opacity;
    }

    addEventListener('invite:shape', (e) => {
      pendingShape = e.detail.shape;
      if (opened) morphTo(pendingShape);
    });
    addEventListener('invite:opening', () => {
      opened = true;
      const s = (window.INVITE_STATE && window.INVITE_STATE.shape) || pendingShape || 'galaxy';
      morphTo(s === 'stars' ? 'galaxy' : s, { duration: 2.6, swirl: 2.6, force: true });
      turbKick = 1;
    });
    addEventListener('invite:open', () => {
      if (!opened) { opened = true; morphTo((window.INVITE_STATE && window.INVITE_STATE.shape) || 'galaxy', { force: true }); }
    });
    let turbKick = 0;
    addEventListener('invite:celebrate', () => { turbKick = 1.4; });
    let paused = false;
    addEventListener('invite:bgpause', (e) => { paused = !!e.detail; });    if (opened) {
      const s0 = window.INVITE_STATE && window.INVITE_STATE.shape;
      morphTo(s0 && s0 !== 'stars' ? s0 : 'galaxy', { force: true, duration: 2.2, swirl: 2 });
    }

    /* -------- sizing -------- */
    function resize() {
      const w = innerWidth, h = innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    resize();
    let rT;
    addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(() => { resize(); if (SHAPES[target].scaled !== false) morphTo(target, { force: true, duration: 1.2, swirl: .3 }); }, 180); });

    /* -------- loop -------- */
    const clock = new THREE.Clock();
    let rotY = 0, rotZv = 0, mx = 0, my = 0, shown = false, turb = 0;
    const halfH = Math.tan(THREE.MathUtils.degToRad(22.5)) * 9;
    function frame() {
      requestAnimationFrame(frame);
      if (document.hidden) return;
      const dt = Math.min(clock.getDelta(), .05);
      if (paused && uniforms.uOpacity.value < .02) return;
      const t = (uniforms.uTime.value += dt * (reduced ? .3 : 1));

      // morph progress
      if (uniforms.uProgress.value < 1) uniforms.uProgress.value = Math.min(1, uniforms.uProgress.value + dt / duration);

      // opacity
      const oT = paused ? 0 : opacityTarget;
      uniforms.uOpacity.value += (oT - uniforms.uOpacity.value) * Math.min(1, dt * 2.2);

      // scroll turbulence
      const v = Math.abs((window.INVITE_STATE && window.INVITE_STATE.velocity) || 0);
      turbKick = Math.max(0, turbKick - dt * .8);
      turb += (Math.min(v / 45, 1) + turbKick - turb) * Math.min(1, dt * 4);
      uniforms.uTurb.value = reduced ? 0 : turb;

      // rotation behaviour per shape
      const S = SHAPES[current];
      if (S.face) {
        const base = Math.round(rotY / TAU) * TAU;
        const goal = base + (S.sway ? Math.sin(t * .85) * S.sway : 0);
        rotY += (goal - rotY) * Math.min(1, dt * 1.6);
      } else rotY += dt * (S.spin || 0) * (1 + turb * 4);
      if (S.spinZ) rotZv += dt * S.spinZ * (1 + turb * 3);
      else { const b = Math.round(rotZv / TAU) * TAU; rotZv += (b - rotZv) * Math.min(1, dt * 1.4); }
      points.rotation.y = rotY;
      points.rotation.z = rotZv;

      // pointer parallax + repulsion
      const ptr = (finePointer && window.INVITE_STATE && window.INVITE_STATE.pointer) || null;
      if (ptr) {
        mx += ((ptr[0] - .5) - mx) * Math.min(1, dt * 2.5);
        my += ((ptr[1] - .5) - my) * Math.min(1, dt * 2.5);
        const asp = innerWidth / innerHeight;
        uniforms.uMouse.value.set((ptr[0] * 2 - 1) * halfH * asp, -(ptr[1] * 2 - 1) * halfH);
        uniforms.uMouseOn.value += (1 - uniforms.uMouseOn.value) * Math.min(1, dt * 3);
      }
      camera.position.x = mx * .8;
      camera.position.y = -my * .55;
      camera.lookAt(0, 0, 0);
      camera.rotation.z += ((window.INVITE_STATE && window.INVITE_STATE.velocity) || 0) * -.0006;

      renderer.render(scene, camera);
      if (!shown) { shown = true; canvas.classList.add('is-on'); }
    }
    frame();
  }
})();
