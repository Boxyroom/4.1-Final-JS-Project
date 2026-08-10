(() => {
  "use strict";

  const STORAGE_KEY = "little-drone-v1";
  const RING_COUNT = 12;
  const GEM_COUNT = 28;
  const CRATE_COUNT = 6;

  const $ = (id) => document.getElementById(id);
  const els = {
    canvas: $("game"),
    hud: $("hud"),
    touch: $("touch"),
    title: $("title"),
    howto: $("howto"),
    pause: $("pause"),
    win: $("win"),
    gameover: $("gameover"),
    batteryFill: $("battery-fill"),
    batteryNum: $("battery-num"),
    hudScore: $("hud-score"),
    hudRings: $("hud-rings"),
    nextHint: $("next-hint"),
    toast: $("toast"),
    stick: $("stick"),
    knob: $("stick-knob"),
    btnLift: $("btn-lift"),
    btnBoost: $("btn-boost"),
    btnRadar: $("btn-radar"),
    btnScan: $("btn-scan"),
    btnPause: $("btn-pause"),
    rotateHint: $("rotate-hint"),
    metaBest: $("meta-best"),
    metaRuns: $("meta-runs"),
  };

  function loadSave() {
    try {
      return Object.assign({ best: 0, runs: 0 }, JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"));
    } catch {
      return { best: 0, runs: 0 };
    }
  }
  function writeSave() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  }
  function refreshMeta() {
    els.metaBest.textContent = String(save.best);
    els.metaRuns.textContent = String(save.runs);
  }
  const save = loadSave();
  refreshMeta();

  // ---------- Audio ----------
  let audioCtx = null;
  function ensureAudio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }
  function beep(freq, dur, type = "sine", gain = 0.04, slide = 0) {
    const ctx = ensureAudio();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }
  const sfx = {
    ring: () => { beep(660, 0.12, "triangle", 0.05); beep(990, 0.18, "sine", 0.035, 200); },
    gem: () => beep(880, 0.08, "sine", 0.035, 400),
    crate: () => { beep(220, 0.1, "square", 0.03); beep(440, 0.16, "triangle", 0.04, 180); },
    boost: () => beep(180, 0.18, "sawtooth", 0.022, 320),
    radar: () => beep(520, 0.25, "sine", 0.03, -200),
    scan: () => beep(360, 0.22, "triangle", 0.03, 120),
    hurt: () => beep(140, 0.2, "sawtooth", 0.04, -80),
    win: () => { beep(523, 0.12); setTimeout(() => beep(659, 0.12), 100); setTimeout(() => beep(784, 0.2), 200); },
    fail: () => beep(180, 0.35, "triangle", 0.04, -100),
  };

  // ---------- Renderer / scene ----------
  const renderer = new THREE.WebGLRenderer({
    canvas: els.canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x4aa8ff);
  scene.fog = new THREE.Fog(0x6ec1ff, 75, 230);

  const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 400);
  camera.position.set(0, 8, 14);

  scene.add(new THREE.HemisphereLight(0xb8e4ff, 0x6a9e4a, 0.95));
  const sun = new THREE.DirectionalLight(0xfff2d6, 1.15);
  sun.position.set(40, 70, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  const sc = sun.shadow.camera;
  sc.near = 10; sc.far = 160;
  sc.left = -70; sc.right = 70; sc.top = 70; sc.bottom = -70;
  scene.add(sun);

  // Clouds
  const clouds = [];
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.88 });
  for (let i = 0; i < 16; i++) {
    const g = new THREE.Group();
    const blobs = 3 + (i % 3);
    for (let b = 0; b < blobs; b++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(2.2 + Math.random() * 1.6, 8, 8), cloudMat);
      m.position.set((b - 1) * 2.1, Math.random() * 0.7, (Math.random() - 0.5) * 1.8);
      m.scale.y = 0.55;
      g.add(m);
    }
    g.position.set((Math.random() - 0.5) * 200, 28 + Math.random() * 28, (Math.random() - 0.5) * 200);
    g.userData.drift = 0.35 + Math.random() * 0.55;
    scene.add(g);
    clouds.push(g);
  }

  // Water
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(170, 48),
    new THREE.MeshStandardMaterial({
      color: 0x2f8fd6, roughness: 0.32, metalness: 0.12, transparent: true, opacity: 0.92,
    })
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = -6;
  scene.add(water);

  // ---------- Drone ----------
  function makeDrone() {
    const root = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf4f7fb, roughness: 0.35, metalness: 0.05 });
    const orangeMat = new THREE.MeshStandardMaterial({ color: 0xff8a32, roughness: 0.45, metalness: 0.1 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1c222c, roughness: 0.6 });
    const cyanMat = new THREE.MeshStandardMaterial({
      color: 0x46e4ff, emissive: 0x46e4ff, emissiveIntensity: 0.85, roughness: 0.3,
    });
    const armMat = new THREE.MeshStandardMaterial({ color: 0x2a3038, roughness: 0.7 });

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 28, 28), bodyMat);
    body.castShadow = true;
    root.add(body);

    const face = new THREE.Mesh(new THREE.CircleGeometry(0.32, 24), darkMat);
    face.position.set(0, 0.02, 0.48);
    root.add(face);

    const eyeGeo = new THREE.TorusGeometry(0.07, 0.018, 8, 16, Math.PI);
    const leftEye = new THREE.Mesh(eyeGeo, cyanMat);
    leftEye.position.set(-0.1, 0.05, 0.5);
    leftEye.rotation.z = Math.PI;
    const rightEye = new THREE.Mesh(eyeGeo, cyanMat);
    rightEye.position.set(0.1, 0.05, 0.5);
    rightEye.rotation.z = Math.PI;
    root.add(leftEye, rightEye);

    for (const sx of [-1, 1]) {
      const ant = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), orangeMat);
      ant.position.set(sx * 0.18, 0.55, 0.05);
      root.add(ant);
    }

    const sensor = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 10), cyanMat);
    sensor.position.set(0, -0.52, 0);
    root.add(sensor);

    const rotors = [];
    const rotorOffsets = [
      [-0.62, 0.12, -0.5],
      [0.62, 0.12, -0.5],
      [-0.62, 0.12, 0.5],
      [0.62, 0.12, 0.5],
    ];
    for (const [x, y, z] of rotorOffsets) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(x) * 0.7, 0.06, 0.06), armMat);
      arm.position.set(x * 0.45, y, z * 0.55);
      root.add(arm);

      const guard = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.05, 8, 20), orangeMat);
      guard.rotation.x = Math.PI / 2;
      guard.position.set(x, y + 0.02, z);
      guard.castShadow = true;
      root.add(guard);

      const glow = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.02, 6, 16), cyanMat);
      glow.rotation.x = Math.PI / 2;
      glow.position.copy(guard.position);
      root.add(glow);

      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.02, 0.06),
        new THREE.MeshStandardMaterial({ color: 0xdde7f2, transparent: true, opacity: 0.55 })
      );
      blade.position.copy(guard.position);
      root.add(blade);
      rotors.push(blade);
    }

    root.userData = { leftEye, rightEye, rotors };
    return root;
  }

  function setExpression(kind) {
    const { leftEye, rightEye } = drone.userData;
    leftEye.position.y = 0.05;
    rightEye.position.y = 0.05;
    leftEye.scale.set(1, 1, 1);
    rightEye.scale.set(1, 1, 1);
    if (kind === "happy") {
      leftEye.rotation.z = Math.PI;
      rightEye.rotation.z = Math.PI;
    } else if (kind === "curious") {
      leftEye.rotation.z = 0;
      rightEye.rotation.z = 0;
      leftEye.scale.set(0.75, 0.75, 0.75);
      rightEye.scale.set(0.75, 0.75, 0.75);
    } else if (kind === "surprised") {
      leftEye.rotation.z = 0;
      rightEye.rotation.z = 0;
      leftEye.scale.set(1.3, 1.3, 1.3);
      rightEye.scale.set(1.3, 1.3, 1.3);
    } else if (kind === "sad") {
      leftEye.rotation.z = 0;
      rightEye.rotation.z = 0;
      leftEye.position.y = -0.02;
      rightEye.position.y = -0.02;
    } else if (kind === "love") {
      leftEye.rotation.z = Math.PI;
      rightEye.rotation.z = Math.PI;
      leftEye.scale.set(1.15, 0.9, 1);
      rightEye.scale.set(1.15, 0.9, 1);
    }
  }

  const drone = makeDrone();
  drone.position.set(0, 4, 10);
  scene.add(drone);

  const boostTrail = new THREE.Mesh(
    new THREE.ConeGeometry(0.2, 1.35, 10),
    new THREE.MeshBasicMaterial({ color: 0x46e4ff, transparent: true, opacity: 0.8 })
  );
  boostTrail.rotation.x = Math.PI / 2;
  boostTrail.position.set(0, -0.05, -0.95);
  boostTrail.visible = false;
  drone.add(boostTrail);

  const flyTrails = [];
  for (let i = 0; i < 3; i++) {
    const t = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.01, 0.55, 6),
      new THREE.MeshBasicMaterial({ color: 0x7adfff, transparent: true, opacity: 0.5 })
    );
    t.position.set((i - 1) * 0.12, -0.48, -0.1);
    drone.add(t);
    flyTrails.push(t);
  }

  const radarRings = [];
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.7 + i * 0.6, 0.78 + i * 0.6, 28),
      new THREE.MeshBasicMaterial({
        color: 0x46e4ff, transparent: true, opacity: 0.4, side: THREE.DoubleSide,
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.45;
    ring.visible = false;
    drone.add(ring);
    radarRings.push(ring);
  }

  const scanCone = new THREE.Mesh(
    new THREE.ConeGeometry(1.5, 3.4, 20, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0x46e4ff, transparent: true, opacity: 0.2, side: THREE.DoubleSide,
    })
  );
  scanCone.position.set(0, -2.1, 0);
  scanCone.visible = false;
  drone.add(scanCone);

  // ---------- Islands ----------
  const islands = [];
  const islandMatRock = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.92, flatShading: true });
  const islandMatGrass = new THREE.MeshStandardMaterial({ color: 0x5ecf6a, roughness: 0.85, flatShading: true });
  const bushMat = new THREE.MeshStandardMaterial({ color: 0x3aaa4a, roughness: 0.8, flatShading: true });

  function makeIsland(radius, height) {
    const g = new THREE.Group();
    const rock = new THREE.Mesh(
      new THREE.ConeGeometry(radius, height, 7 + Math.floor(Math.random() * 3)),
      islandMatRock
    );
    rock.rotation.x = Math.PI;
    rock.position.y = -height * 0.35;
    rock.castShadow = true;
    rock.receiveShadow = true;
    g.add(rock);

    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.95, radius * 0.85, 0.45, 10),
      islandMatGrass
    );
    top.position.y = 0.15;
    top.receiveShadow = true;
    top.castShadow = true;
    g.add(top);

    const count = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = Math.random() * radius * 0.55;
      const bush = new THREE.Mesh(
        new THREE.ConeGeometry(0.35 + Math.random() * 0.3, 0.9 + Math.random() * 0.8, 6),
        bushMat
      );
      bush.position.set(Math.cos(ang) * dist, 0.7, Math.sin(ang) * dist);
      bush.castShadow = true;
      g.add(bush);
    }

    if (Math.random() > 0.5) {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.1, 3.2, 8),
        new THREE.MeshStandardMaterial({ color: 0xe8eef5 })
      );
      pole.position.set(radius * 0.3, 1.8, -radius * 0.15);
      g.add(pole);
      const hub = new THREE.Group();
      hub.position.set(pole.position.x, pole.position.y + 1.55, pole.position.z);
      const bladeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
      for (let b = 0; b < 3; b++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.55, 0.08), bladeMat);
        blade.position.y = 0.7;
        const holder = new THREE.Group();
        holder.rotation.z = (b * Math.PI * 2) / 3;
        holder.add(blade);
        hub.add(holder);
      }
      g.add(hub);
      g.userData.turbine = hub;
    }

    g.userData.radius = radius;
    return g;
  }

  const islandLayouts = [
    { x: 0, y: 0, z: 0, r: 10, h: 8 },
    { x: -22, y: 3, z: -18, r: 7, h: 7 },
    { x: 26, y: 5, z: -12, r: 8, h: 9 },
    { x: 8, y: 8, z: -36, r: 6.5, h: 7 },
    { x: -30, y: 6, z: 10, r: 7.5, h: 8 },
    { x: 34, y: 10, z: 18, r: 6, h: 6 },
    { x: -8, y: 12, z: 32, r: 9, h: 10 },
    { x: 18, y: 14, z: -52, r: 7, h: 8 },
    { x: -40, y: 9, z: -40, r: 8, h: 9 },
    { x: 48, y: 7, z: -28, r: 5.5, h: 6 },
    { x: -15, y: 16, z: -60, r: 6, h: 7 },
    { x: 5, y: 4, z: 48, r: 7, h: 7 },
  ];

  for (const layout of islandLayouts) {
    const island = makeIsland(layout.r, layout.h);
    island.position.set(layout.x, layout.y, layout.z);
    scene.add(island);
    islands.push(island);
  }

  const rockMat = new THREE.MeshStandardMaterial({ color: 0x9a8570, flatShading: true, roughness: 1 });
  for (let i = 0; i < 18; i++) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(1 + Math.random() * 1.8, 0), rockMat);
    rock.position.set((Math.random() - 0.5) * 200, 10 + Math.random() * 36, (Math.random() - 0.5) * 200);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    scene.add(rock);
  }

  // ---------- Collectibles & course ----------
  const gemMat = new THREE.MeshStandardMaterial({
    color: 0xffd447, emissive: 0xffb020, emissiveIntensity: 0.55, metalness: 0.35, roughness: 0.25,
  });
  const gemHighlightMat = gemMat.clone();
  gemHighlightMat.emissiveIntensity = 1.2;

  const gems = [];
  function placeGems() {
    for (const g of gems) scene.remove(g);
    gems.length = 0;
    for (let i = 0; i < GEM_COUNT; i++) {
      const island = islands[1 + (i % (islands.length - 1))];
      const ang = Math.random() * Math.PI * 2;
      const dist = 2 + Math.random() * (island.userData.radius * 0.7);
      const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), gemMat);
      mesh.castShadow = true;
      mesh.position.set(
        island.position.x + Math.cos(ang) * dist,
        island.position.y + 2.2 + Math.random() * 5,
        island.position.z + Math.sin(ang) * dist
      );
      mesh.userData = { taken: false, pulse: Math.random() * Math.PI * 2, highlighted: false };
      scene.add(mesh);
      gems.push(mesh);
    }
  }

  const crateMat = new THREE.MeshStandardMaterial({ color: 0xc48a3a, roughness: 0.85 });
  const crateEdge = new THREE.MeshStandardMaterial({ color: 0x7a4e1e, roughness: 0.9 });
  const crates = [];
  function placeCrates() {
    for (const c of crates) scene.remove(c);
    crates.length = 0;
    for (let i = 0; i < CRATE_COUNT; i++) {
      const island = islands[i % islands.length];
      const ang = (i / CRATE_COUNT) * Math.PI * 2 + 0.4;
      const dist = island.userData.radius * 0.45;
      const g = new THREE.Group();
      const box = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.05, 1.05), crateMat);
      box.castShadow = true;
      g.add(box);
      g.add(new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 1.1), crateEdge));
      g.position.set(
        island.position.x + Math.cos(ang) * dist,
        island.position.y + 0.75,
        island.position.z + Math.sin(ang) * dist
      );
      g.userData = { taken: false, hidden: true, revealed: false };
      g.visible = false;
      scene.add(g);
      crates.push(g);
    }
  }

  const ringActiveMat = new THREE.MeshStandardMaterial({
    color: 0xffd447, emissive: 0xffc014, emissiveIntensity: 0.9, metalness: 0.2, roughness: 0.35,
    side: THREE.DoubleSide,
  });
  const ringDoneMat = new THREE.MeshStandardMaterial({
    color: 0x9ad0ff, emissive: 0x3a8dff, emissiveIntensity: 0.25, transparent: true, opacity: 0.35,
    side: THREE.DoubleSide,
  });
  const ringIdleMat = new THREE.MeshStandardMaterial({
    color: 0xffe08a, emissive: 0xffa800, emissiveIntensity: 0.25, transparent: true, opacity: 0.55,
    side: THREE.DoubleSide,
  });

  const rings = [];
  const ringPath = [
    [0, 5, -6],
    [-10, 7, -16],
    [-20, 8, -22],
    [-8, 11, -32],
    [10, 12, -38],
    [24, 11, -28],
    [30, 10, -8],
    [28, 13, 12],
    [10, 15, 28],
    [-12, 16, 30],
    [-28, 12, 8],
    [-18, 10, -8],
  ];

  function placeRings() {
    for (const r of rings) scene.remove(r.mesh);
    rings.length = 0;
    for (let i = 0; i < RING_COUNT; i++) {
      const [x, y, z] = ringPath[i];
      const mesh = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.18, 12, 40), ringIdleMat);
      // Face along course direction
      const next = ringPath[(i + 1) % RING_COUNT];
      const dir = new THREE.Vector3(next[0] - x, next[1] - y, next[2] - z).normalize();
      const look = new THREE.Vector3(x, y, z).add(dir);
      mesh.position.set(x, y, z);
      mesh.lookAt(look);
      mesh.rotateX(Math.PI / 2);
      mesh.userData.index = i;
      scene.add(mesh);
      rings.push({ mesh, taken: false, index: i });
    }
  }

  // Birds (simple obstacles)
  const birds = [];
  const birdMat = new THREE.MeshStandardMaterial({ color: 0xe24b4b, roughness: 0.55 });
  function placeBirds() {
    for (const b of birds) scene.remove(b);
    birds.length = 0;
    for (let i = 0; i < 8; i++) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 10), birdMat);
      body.scale.set(1, 0.7, 1.3);
      g.add(body);
      const wingL = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.3), birdMat);
      wingL.position.set(-0.4, 0.05, 0);
      const wingR = wingL.clone();
      wingR.position.x = 0.4;
      g.add(wingL, wingR);
      g.position.set((Math.random() - 0.5) * 80, 6 + Math.random() * 16, (Math.random() - 0.5) * 80);
      g.userData = {
        wingL, wingR,
        angle: Math.random() * Math.PI * 2,
        radius: 8 + Math.random() * 18,
        speed: 0.4 + Math.random() * 0.5,
        center: g.position.clone(),
        baseY: g.position.y,
      };
      scene.add(g);
      birds.push(g);
    }
  }

  // ---------- Input ----------
  const input = {
    stickX: 0,
    stickY: 0,
    lift: false,
    boost: false,
    keys: Object.create(null),
  };

  const stickState = { active: false, id: null, cx: 0, cy: 0 };
  const STICK_MAX = 48;

  function setKnob(x, y) {
    els.knob.style.transform = `translate(${x}px, ${y}px)`;
  }

  function updateStickFromEvent(clientX, clientY) {
    const rect = els.stick.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const len = Math.hypot(dx, dy) || 1;
    if (len > STICK_MAX) {
      dx = (dx / len) * STICK_MAX;
      dy = (dy / len) * STICK_MAX;
    }
    input.stickX = dx / STICK_MAX;
    input.stickY = dy / STICK_MAX;
    setKnob(dx, dy);
  }

  function endStick() {
    stickState.active = false;
    stickState.id = null;
    input.stickX = 0;
    input.stickY = 0;
    setKnob(0, 0);
  }

  els.stick.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    stickState.active = true;
    stickState.id = e.pointerId;
    els.stick.setPointerCapture(e.pointerId);
    updateStickFromEvent(e.clientX, e.clientY);
  });
  els.stick.addEventListener("pointermove", (e) => {
    if (!stickState.active || e.pointerId !== stickState.id) return;
    updateStickFromEvent(e.clientX, e.clientY);
  });
  els.stick.addEventListener("pointerup", endStick);
  els.stick.addEventListener("pointercancel", endStick);

  function bindHold(btn, key) {
    const on = (e) => { e.preventDefault(); input[key] = true; btn.classList.add("active"); };
    const off = () => { input[key] = false; btn.classList.remove("active"); };
    btn.addEventListener("pointerdown", on);
    btn.addEventListener("pointerup", off);
    btn.addEventListener("pointerleave", off);
    btn.addEventListener("pointercancel", off);
  }
  bindHold(els.btnLift, "lift");
  bindHold(els.btnBoost, "boost");

  window.addEventListener("keydown", (e) => {
    input.keys[e.code] = true;
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
    if (e.code === "KeyP" || e.code === "Escape") {
      if (state.mode === "play") pauseGame();
      else if (state.mode === "pause") resumeGame();
    }
  });
  window.addEventListener("keyup", (e) => { input.keys[e.code] = false; });

  // ---------- Game state ----------
  const state = {
    mode: "title", // title | play | pause | win | over
    battery: 100,
    score: 0,
    gems: 0,
    ringsCleared: 0,
    nextRing: 0,
    time: 0,
    invuln: 0,
    radarT: 0,
    scanT: 0,
    radarCd: 0,
    scanCd: 0,
    vel: new THREE.Vector3(),
    yaw: 0,
    toastT: 0,
  };

  const tmp = new THREE.Vector3();
  const camTarget = new THREE.Vector3();
  const camPos = new THREE.Vector3();

  function showPanel(name) {
    for (const id of ["title", "howto", "pause", "win", "gameover"]) {
      $(id).classList.toggle("hidden", id !== name);
    }
  }

  function showToast(msg, dur = 1.4) {
    els.toast.textContent = msg;
    els.toast.classList.remove("hidden");
    state.toastT = dur;
  }

  function updateHud() {
    const b = Math.max(0, Math.ceil(state.battery));
    els.batteryNum.textContent = String(b);
    els.batteryFill.style.width = `${Math.max(0, Math.min(100, state.battery))}%`;
    els.batteryFill.classList.toggle("low", state.battery < 35 && state.battery >= 18);
    els.batteryFill.classList.toggle("critical", state.battery < 18);
    els.hudScore.textContent = String(state.score);
    els.hudRings.textContent = `${state.ringsCleared} / ${RING_COUNT}`;
    if (state.nextRing < RING_COUNT) {
      els.nextHint.textContent = `Next ring ${state.nextRing + 1} of ${RING_COUNT}`;
      els.nextHint.classList.remove("fade");
    } else {
      els.nextHint.textContent = "Course clear!";
    }
  }

  function refreshRingMats() {
    for (const r of rings) {
      if (r.taken) r.mesh.material = ringDoneMat;
      else if (r.index === state.nextRing) r.mesh.material = ringActiveMat;
      else r.mesh.material = ringIdleMat;
    }
  }

  function resetRun() {
    state.battery = 100;
    state.score = 0;
    state.gems = 0;
    state.ringsCleared = 0;
    state.nextRing = 0;
    state.time = 0;
    state.invuln = 0;
    state.radarT = 0;
    state.scanT = 0;
    state.radarCd = 0;
    state.scanCd = 0;
    state.vel.set(0, 0, 0);
    state.yaw = 0;
    drone.position.set(0, 4.5, 10);
    drone.rotation.set(0, 0, 0);
    setExpression("happy");
    placeGems();
    placeCrates();
    placeRings();
    placeBirds();
    refreshRingMats();
    updateHud();
    els.btnRadar.classList.remove("cooling");
    els.btnScan.classList.remove("cooling");
  }

  function startGame() {
    ensureAudio();
    resetRun();
    state.mode = "play";
    showPanel(null);
    els.title.classList.add("hidden");
    els.howto.classList.add("hidden");
    els.pause.classList.add("hidden");
    els.win.classList.add("hidden");
    els.gameover.classList.add("hidden");
    els.hud.classList.remove("hidden");
    els.touch.classList.remove("hidden");
    showToast("Lift off!");
  }

  function pauseGame() {
    if (state.mode !== "play") return;
    state.mode = "pause";
    showPanel("pause");
  }

  function resumeGame() {
    if (state.mode !== "pause") return;
    state.mode = "play";
    els.pause.classList.add("hidden");
  }

  function quitToMenu() {
    state.mode = "title";
    els.hud.classList.add("hidden");
    els.touch.classList.add("hidden");
    showPanel("title");
    refreshMeta();
  }

  function endWin() {
    state.mode = "win";
    els.hud.classList.add("hidden");
    els.touch.classList.add("hidden");
    const timeBonus = Math.max(0, Math.floor(400 - state.time * 2));
    state.score += timeBonus;
    if (state.score > save.best) save.best = state.score;
    save.runs += 1;
    writeSave();
    $("win-summary").textContent = `Every ring cleared with ${Math.ceil(state.battery)} battery left.`;
    $("win-score").textContent = String(state.score);
    $("win-gems").textContent = String(state.gems);
    const m = Math.floor(state.time / 60);
    const s = Math.floor(state.time % 60);
    $("win-time").textContent = `${m}:${String(s).padStart(2, "0")}`;
    showPanel("win");
    sfx.win();
    setExpression("love");
  }

  function endFail(reason) {
    state.mode = "over";
    els.hud.classList.add("hidden");
    els.touch.classList.add("hidden");
    if (state.score > save.best) save.best = state.score;
    save.runs += 1;
    writeSave();
    $("over-summary").textContent = reason;
    $("over-score").textContent = String(state.score);
    $("over-rings").textContent = `${state.ringsCleared}/${RING_COUNT}`;
    $("over-gems").textContent = String(state.gems);
    showPanel("gameover");
    sfx.fail();
    setExpression("sad");
  }

  // UI buttons
  $("btn-start").addEventListener("click", startGame);
  $("btn-how").addEventListener("click", () => showPanel("howto"));
  $("btn-how-back").addEventListener("click", () => showPanel("title"));
  $("btn-how-play").addEventListener("click", startGame);
  $("btn-resume").addEventListener("click", resumeGame);
  $("btn-quit").addEventListener("click", quitToMenu);
  $("btn-again").addEventListener("click", startGame);
  $("btn-menu").addEventListener("click", quitToMenu);
  $("btn-win-again").addEventListener("click", startGame);
  $("btn-win-menu").addEventListener("click", quitToMenu);
  els.btnPause.addEventListener("click", pauseGame);

  els.btnRadar.addEventListener("click", () => {
    if (state.mode !== "play" || state.radarCd > 0) return;
    state.radarT = 1.6;
    state.radarCd = 5;
    els.btnRadar.classList.add("cooling");
    sfx.radar();
    showToast("Radar pulse!");
    for (const gem of gems) {
      if (gem.userData.taken) continue;
      if (gem.position.distanceTo(drone.position) < 35) {
        gem.userData.highlighted = true;
        gem.material = gemHighlightMat;
        gem.scale.setScalar(1.35);
      }
    }
  });

  els.btnScan.addEventListener("click", () => {
    if (state.mode !== "play" || state.scanCd > 0) return;
    state.scanT = 2.2;
    state.scanCd = 6;
    els.btnScan.classList.add("cooling");
    sfx.scan();
    showToast("Scanning…");
    scanCone.visible = true;
    let found = 0;
    for (const crate of crates) {
      if (crate.userData.taken) continue;
      const dx = crate.position.x - drone.position.x;
      const dz = crate.position.z - drone.position.z;
      const dy = drone.position.y - crate.position.y;
      if (Math.hypot(dx, dz) < 10 && dy > 0 && dy < 14) {
        crate.visible = true;
        crate.userData.revealed = true;
        crate.userData.hidden = false;
        found += 1;
      }
    }
    if (found) showToast(`Found ${found} supply crate${found > 1 ? "s" : ""}!`);
  });

  // ---------- Physics / update ----------
  function islandCollision(pos) {
    for (const island of islands) {
      const dx = pos.x - island.position.x;
      const dz = pos.z - island.position.z;
      const dist = Math.hypot(dx, dz);
      const r = island.userData.radius;
      const top = island.position.y + 0.4;
      // Top surface landing clamp
      if (dist < r * 0.9 && pos.y < top + 0.55 && pos.y > top - 1.2) {
        return { type: "top", y: top + 0.55 };
      }
      // Side/rock bump
      if (dist < r * 0.55 && pos.y < top + 2 && pos.y > island.position.y - 4) {
        return { type: "side", nx: dx / (dist || 1), nz: dz / (dist || 1) };
      }
    }
    return null;
  }

  function formatHintFade() {
    if (state.time > 8) els.nextHint.classList.add("fade");
  }

  function update(dt) {
    if (state.mode !== "play") {
      // Idle title animation still spins rotors lightly via animate()
      return;
    }

    state.time += dt;
    if (state.invuln > 0) state.invuln -= dt;
    if (state.toastT > 0) {
      state.toastT -= dt;
      if (state.toastT <= 0) els.toast.classList.add("hidden");
    }
    if (state.radarCd > 0) {
      state.radarCd -= dt;
      if (state.radarCd <= 0) els.btnRadar.classList.remove("cooling");
    }
    if (state.scanCd > 0) {
      state.scanCd -= dt;
      if (state.scanCd <= 0) els.btnScan.classList.remove("cooling");
    }
    if (state.radarT > 0) {
      state.radarT -= dt;
      for (let i = 0; i < radarRings.length; i++) {
        radarRings[i].visible = true;
        const s = 1 + (1.6 - state.radarT) * (1.2 + i * 0.5);
        radarRings[i].scale.setScalar(s);
        radarRings[i].material.opacity = Math.max(0, state.radarT * 0.35);
      }
      if (state.radarT <= 0) {
        for (const r of radarRings) r.visible = false;
        for (const gem of gems) {
          if (!gem.userData.taken) {
            gem.userData.highlighted = false;
            gem.material = gemMat;
            gem.scale.setScalar(1);
          }
        }
      }
    }
    if (state.scanT > 0) {
      state.scanT -= dt;
      scanCone.material.opacity = 0.12 + state.scanT * 0.06;
      if (state.scanT <= 0) scanCone.visible = false;
    }

    // Keyboard merge
    let ix = input.stickX;
    let iy = input.stickY;
    if (input.keys.KeyA || input.keys.ArrowLeft) ix -= 1;
    if (input.keys.KeyD || input.keys.ArrowRight) ix += 1;
    if (input.keys.KeyW || input.keys.ArrowUp) iy -= 1;
    if (input.keys.KeyS || input.keys.ArrowDown) iy += 1;
    const lift = input.lift || input.keys.Space || input.keys.KeyE;
    const boost = input.boost || input.keys.ShiftLeft || input.keys.ShiftRight;

    const len = Math.hypot(ix, iy);
    if (len > 1) { ix /= len; iy /= len; }

    // Camera-relative movement on XZ
    const camYaw = Math.atan2(
      drone.position.x - camera.position.x,
      drone.position.z - camera.position.z
    );
    // Stick: up on stick = forward
    const forward = new THREE.Vector3(Math.sin(camYaw), 0, Math.cos(camYaw));
    const right = new THREE.Vector3(Math.cos(camYaw), 0, -Math.sin(camYaw));
    // Actually camera looks at drone from behind; use drone yaw for control feel
    const move = new THREE.Vector3();
    move.addScaledVector(right, ix);
    move.addScaledVector(forward, -iy);

    const speed = boost ? 22 : 12;
    state.vel.x += (move.x * speed - state.vel.x) * Math.min(1, dt * 4);
    state.vel.z += (move.z * speed - state.vel.z) * Math.min(1, dt * 4);

    if (lift) state.vel.y += (10 - state.vel.y) * Math.min(1, dt * 3);
    else state.vel.y += (-4.5 - state.vel.y) * Math.min(1, dt * 1.6);

    if (boost) {
      boostTrail.visible = true;
      state.battery -= 12 * dt;
      if (Math.random() < 0.08) sfx.boost();
    } else {
      boostTrail.visible = false;
    }

    // Idle drain
    state.battery -= (boost ? 0 : 1.6) * dt;
    if (lift) state.battery -= 1.1 * dt;

    drone.position.x += state.vel.x * dt;
    drone.position.y += state.vel.y * dt;
    drone.position.z += state.vel.z * dt;

    // Face movement direction
    const horiz = Math.hypot(state.vel.x, state.vel.z);
    if (horiz > 0.4) {
      state.yaw = Math.atan2(state.vel.x, state.vel.z);
    }
    drone.rotation.y = state.yaw;
    drone.rotation.x = THREE.MathUtils.clamp(-state.vel.y * 0.04, -0.35, 0.35);
    drone.rotation.z = THREE.MathUtils.clamp(-state.vel.x * 0.03, -0.4, 0.4);

    // World bounds
    drone.position.x = THREE.MathUtils.clamp(drone.position.x, -90, 90);
    drone.position.z = THREE.MathUtils.clamp(drone.position.z, -90, 90);
    drone.position.y = THREE.MathUtils.clamp(drone.position.y, -3.5, 42);

    // Water / fall damage
    if (drone.position.y < -3) {
      state.battery -= 25 * dt;
      if (state.invuln <= 0) {
        setExpression("surprised");
        state.invuln = 0.6;
        sfx.hurt();
      }
    }

    // Island collision
    const hit = islandCollision(drone.position);
    if (hit) {
      if (hit.type === "top") {
        if (drone.position.y < hit.y) {
          drone.position.y = hit.y;
          if (state.vel.y < 0) state.vel.y = 0;
        }
      } else if (hit.type === "side" && state.invuln <= 0) {
        drone.position.x += hit.nx * 0.6;
        drone.position.z += hit.nz * 0.6;
        state.vel.x *= -0.4;
        state.vel.z *= -0.4;
        state.battery -= 8;
        state.invuln = 0.8;
        setExpression("surprised");
        sfx.hurt();
        showToast("Ouch!");
      }
    }

    // Rings
    if (state.nextRing < RING_COUNT) {
      const ring = rings[state.nextRing];
      const d = drone.position.distanceTo(ring.mesh.position);
      if (d < 2.35) {
        ring.taken = true;
        state.ringsCleared += 1;
        state.nextRing += 1;
        state.score += 100 + state.nextRing * 10;
        state.battery = Math.min(100, state.battery + 8);
        sfx.ring();
        setExpression("happy");
        showToast(`Ring ${state.ringsCleared}!`);
        refreshRingMats();
        updateHud();
        if (state.ringsCleared >= RING_COUNT) {
          endWin();
          return;
        }
      }
    }

    // Gems
    for (const gem of gems) {
      if (gem.userData.taken) continue;
      gem.userData.pulse += dt * 3;
      gem.position.y += Math.sin(gem.userData.pulse) * 0.01;
      gem.rotation.y += dt * 2;
      if (drone.position.distanceTo(gem.position) < 1.2) {
        gem.userData.taken = true;
        gem.visible = false;
        state.gems += 1;
        state.score += 25;
        state.battery = Math.min(100, state.battery + 6);
        sfx.gem();
        updateHud();
      }
    }

    // Crates
    for (const crate of crates) {
      if (crate.userData.taken || !crate.visible) continue;
      crate.rotation.y += dt * 0.4;
      if (drone.position.distanceTo(crate.position) < 1.6) {
        crate.userData.taken = true;
        crate.visible = false;
        state.score += 75;
        state.battery = Math.min(100, state.battery + 22);
        sfx.crate();
        showToast("Supply crate +22⚡");
        updateHud();
      }
    }

    // Birds
    for (const bird of birds) {
      const u = bird.userData;
      u.angle += u.speed * dt;
      bird.position.x = u.center.x + Math.cos(u.angle) * u.radius;
      bird.position.z = u.center.z + Math.sin(u.angle) * u.radius;
      bird.position.y = u.baseY + Math.sin(u.angle * 2) * 1.2;
      bird.rotation.y = -u.angle + Math.PI / 2;
      u.wingL.rotation.z = Math.sin(state.time * 10 + u.angle) * 0.5;
      u.wingR.rotation.z = -Math.sin(state.time * 10 + u.angle) * 0.5;
      if (state.invuln <= 0 && drone.position.distanceTo(bird.position) < 1.3) {
        state.battery -= 12;
        state.invuln = 1;
        state.vel.addScaledVector(
          tmp.subVectors(drone.position, bird.position).normalize(),
          6
        );
        sfx.hurt();
        setExpression("surprised");
        showToast("Bird strike!");
        updateHud();
      }
    }

    // Expression from battery
    if (state.battery < 18) setExpression("sad");
    else if (state.battery < 35 && state.invuln <= 0) setExpression("curious");

    if (state.battery <= 0) {
      state.battery = 0;
      updateHud();
      endFail("Your little drone ran out of power among the islands.");
      return;
    }

    formatHintFade();
    updateHud();
  }

  function updateCamera(dt) {
    const behind = 9;
    const height = 4.2;
    const target = camTarget.copy(drone.position);
    const desired = camPos.set(
      drone.position.x - Math.sin(state.yaw) * behind,
      drone.position.y + height,
      drone.position.z - Math.cos(state.yaw) * behind
    );
    camera.position.lerp(desired, 1 - Math.pow(0.001, dt));
    camera.lookAt(target.x, target.y + 0.4, target.z);
  }

  function animateDecor(dt) {
    // Rotors
    const spin = (state.mode === "play" ? 28 : 14) * dt;
    for (const blade of drone.userData.rotors) blade.rotation.y += spin;

    for (const island of islands) {
      if (island.userData.turbine) island.userData.turbine.rotation.z += dt * 2.2;
    }
    for (const c of clouds) {
      c.position.x += c.userData.drift * dt;
      if (c.position.x > 110) c.position.x = -110;
    }
    // Soft bob on title
    if (state.mode === "title") {
      drone.position.set(0, 4 + Math.sin(performance.now() * 0.002) * 0.35, 8);
      drone.rotation.y += dt * 0.35;
      updateCamera(dt);
    }

    for (const t of flyTrails) {
      t.visible = state.mode === "play" && !boostTrail.visible;
      t.scale.y = 0.8 + Math.sin(performance.now() * 0.02 + t.position.x * 10) * 0.25;
    }

    // Active ring pulse
    if (state.mode === "play" && state.nextRing < RING_COUNT) {
      const mesh = rings[state.nextRing].mesh;
      const s = 1 + Math.sin(performance.now() * 0.006) * 0.06;
      mesh.scale.set(s, s, s);
    }

    water.material.opacity = 0.88 + Math.sin(performance.now() * 0.001) * 0.04;
  }

  // ---------- Resize / orientation ----------
  function onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    const portraitPhone = h > w && w < 820;
    els.rotateHint.classList.toggle("hidden", !portraitPhone || state.mode === "title" || state.mode === "howto");
  }
  window.addEventListener("resize", onResize);
  window.addEventListener("orientationchange", () => setTimeout(onResize, 200));
  onResize();

  // ---------- PWA ----------
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }

  // Boot world visuals for title screen
  placeGems();
  placeCrates();
  placeRings();
  placeBirds();
  refreshRingMats();
  setExpression("happy");

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    if (state.mode === "play" || state.mode === "pause") updateCamera(dt);
    animateDecor(dt);
    if (state.mode === "pause") {
      // freeze gameplay already; still render
    }
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
