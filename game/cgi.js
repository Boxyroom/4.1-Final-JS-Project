/* Photoreal-leaning WebGL renderer for Lantern Hollow (Three.js) */
(function () {
  "use strict";

  if (!window.THREE) {
    console.warn("THREE not loaded; CGI renderer disabled");
    return;
  }

  const THREE = window.THREE;

  let renderer;
  let scene;
  let camera;
  let ground;
  let lanternGroup;
  let lanternLight;
  let flameLight;
  let rimLight;
  let hemi;
  let ambient;
  let ringMesh;
  let glowSprite;
  let ready = false;
  let groundTexture = null;
  let forestRoot = null;
  let emberPool = [];
  let particlePool = [];

  const enemyPool = [];
  const gemPool = [];
  const bulletPool = [];
  const pickupPool = [];
  const grenadePool = [];
  const crateHintPool = [];
  const orbitSparkPool = [];
  const shockwavePool = [];
  let orbitRing = null;
  const fireflies = [];
  const mistPuffs = [];
  const puddles = [];
  const WORLD_SCALE = 0.04;

  function supportPhysical() {
    try {
      return typeof THREE.MeshPhysicalMaterial === "function";
    } catch (_) {
      return false;
    }
  }

  const usePhysical = supportPhysical();

  const brassMat = () => {
    if (usePhysical) {
      return new THREE.MeshPhysicalMaterial({
        color: 0xd49a3a,
        metalness: 0.97,
        roughness: 0.2,
        clearcoat: 0.6,
        clearcoatRoughness: 0.22,
        reflectivity: 0.92,
      });
    }
    return new THREE.MeshStandardMaterial({
      color: 0xd49a3a,
      metalness: 0.94,
      roughness: 0.26,
    });
  };

  const glassMat = () => {
    if (usePhysical) {
      return new THREE.MeshPhysicalMaterial({
        color: 0xffe8b0,
        metalness: 0.04,
        roughness: 0.07,
        transmission: 0.4,
        thickness: 0.45,
        transparent: true,
        opacity: 0.8,
        emissive: 0xff9a28,
        emissiveIntensity: 1.05,
      });
    }
    return new THREE.MeshStandardMaterial({
      color: 0xffd98a,
      metalness: 0.04,
      roughness: 0.12,
      transparent: true,
      opacity: 0.76,
      emissive: 0xffaa33,
      emissiveIntensity: 0.95,
    });
  };

  function makeGlowTexture() {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 128;
    const g = c.getContext("2d");
    const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    grad.addColorStop(0, "rgba(255,220,140,0.95)");
    grad.addColorStop(0.35, "rgba(255,160,60,0.35)");
    grad.addColorStop(1, "rgba(255,120,20,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }

  function hash2(i, salt) {
    const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  /** Dark forest floor: soil, stone, roots, moss — seamless tile. */
  function makeForestFloorTexture() {
    const size = 512;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const g = c.getContext("2d");

    // Mid-tone soil so lantern light has something to reveal (avoid near-black base)
    g.fillStyle = "#2a3228";
    g.fillRect(0, 0, size, size);

    // base soil mottling
    for (let i = 0; i < 5200; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 3 + Math.random() * 16;
      const shade = 36 + Math.floor(Math.random() * 40);
      const green = 42 + Math.floor(Math.random() * 48);
      g.fillStyle = `rgba(${shade + 8}, ${green}, ${shade}, ${0.22 + Math.random() * 0.4})`;
      g.beginPath();
      g.ellipse(x, y, r, r * (0.5 + Math.random() * 0.7), Math.random() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }

    // stone patches
    for (let i = 0; i < 70; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 8 + Math.random() * 28;
      const stone = g.createRadialGradient(x, y, 1, x, y, r);
      const s = 28 + Math.floor(Math.random() * 40);
      stone.addColorStop(0, `rgba(${s + 10}, ${s + 8}, ${s}, 0.55)`);
      stone.addColorStop(0.55, `rgba(${s}, ${s - 2}, ${s - 6}, 0.28)`);
      stone.addColorStop(1, "rgba(20,22,18,0)");
      g.fillStyle = stone;
      g.beginPath();
      g.ellipse(x, y, r, r * (0.55 + Math.random() * 0.45), Math.random() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }

    // root / branch strokes
    g.lineCap = "round";
    for (let i = 0; i < 55; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const len = 30 + Math.random() * 90;
      const ang = Math.random() * Math.PI * 2;
      g.strokeStyle = `rgba(${22 + Math.random() * 18}, ${16 + Math.random() * 14}, ${10 + Math.random() * 10}, ${0.22 + Math.random() * 0.35})`;
      g.lineWidth = 1.5 + Math.random() * 3.5;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(
        x + Math.cos(ang + 0.4) * len * 0.45,
        y + Math.sin(ang + 0.4) * len * 0.45,
        x + Math.cos(ang) * len,
        y + Math.sin(ang) * len,
      );
      g.stroke();
    }

    // damp hollows (kept mid-dark so they don't punch black holes in the floor)
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 12 + Math.random() * 36;
      const puddle = g.createRadialGradient(x, y, 2, x, y, r);
      puddle.addColorStop(0, "rgba(18,28,22,0.55)");
      puddle.addColorStop(0.5, "rgba(24,34,28,0.28)");
      puddle.addColorStop(1, "rgba(30,38,32,0)");
      g.fillStyle = puddle;
      g.beginPath();
      g.ellipse(x, y, r, r * 0.62, Math.random() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }

    // sparse leaf litter / moss flecks
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(${30 + Math.random() * 40}, ${50 + Math.random() * 55}, ${28 + Math.random() * 30}, 0.22)`;
      g.fillRect(Math.random() * size, Math.random() * size, 1 + Math.random() * 2.5, 1 + Math.random() * 3);
    }

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(8, 8);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  function makeMarshTexture() {
    return makeForestFloorTexture();
  }

  function createLanternModel() {
    const group = new THREE.Group();
    group.userData.baseScale = 1.85;

    const handle = new THREE.Mesh(
      new THREE.TorusGeometry(0.18, 0.028, 12, 28, Math.PI),
      brassMat(),
    );
    handle.name = "handle";
    handle.position.y = 0.72;
    handle.rotation.x = Math.PI;
    group.add(handle);

    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.14, 24), brassMat());
    cap.name = "cap";
    cap.position.y = 0.55;
    group.add(cap);

    const vent = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.12, 0.08, 12),
      brassMat(),
    );
    vent.name = "vent";
    vent.position.y = 0.64;
    group.add(vent);

    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.22, 0.42, 24), glassMat());
    glass.position.y = 0.28;
    glass.name = "glass";
    group.add(glass);

    const flame = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 16, 16),
      new THREE.MeshStandardMaterial({
        color: 0xfff4d0,
        emissive: 0xffb040,
        emissiveIntensity: 4.2,
        roughness: 0.35,
      }),
    );
    flame.position.y = 0.3;
    flame.name = "flame";
    group.add(flame);

    const wick = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.02, 0.08, 8),
      new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 1 }),
    );
    wick.name = "wick";
    wick.position.y = 0.2;
    group.add(wick);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.14, 24), brassMat());
    base.name = "base";
    base.position.y = 0.02;
    group.add(base);

    const foot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.22, 0.08, 18),
      new THREE.MeshStandardMaterial({
        color: 0x4a2c10,
        metalness: 0.75,
        roughness: 0.42,
      }),
    );
    foot.name = "foot";
    foot.position.y = -0.08;
    group.add(foot);

    for (let i = 0; i < 6; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.42, 0.025), brassMat());
      bar.name = "bar";
      const a = (i / 6) * Math.PI * 2;
      bar.position.set(Math.cos(a) * 0.205, 0.28, Math.sin(a) * 0.205);
      group.add(bar);
    }

    group.scale.setScalar(group.userData.baseScale);
    return group;
  }

  /** Show/hide lantern parts and scale by evolution stage (title always full). */
  function applyLanternEvolution(level, full = false) {
    if (!lanternGroup) return { stage: 4, scale: 1, light: 1 };
    const evo =
      window.LanternForm && typeof window.LanternForm.of === "function"
        ? window.LanternForm.of(full ? 99 : level || 1)
        : { stage: 4, scale: 1, light: 1, name: "Hollow Lantern" };
    const stage = full ? 4 : evo.stage;
    const scale = full ? 1 : evo.scale;
    const baseScale = lanternGroup.userData.baseScale || 1.85;
    lanternGroup.scale.setScalar(baseScale * scale);

    // Kindled Flame also gets a brass foot so it reads from the top-down camera.
    const vis = {
      flame: true,
      wick: stage >= 1,
      foot: stage >= 1,
      glass: stage >= 2,
      base: stage >= 2,
      bar: stage >= 3,
      cap: stage >= 3,
      vent: stage >= 4,
      handle: stage >= 4,
    };
    lanternGroup.traverse((o) => {
      if (o.name && Object.prototype.hasOwnProperty.call(vis, o.name)) {
        o.visible = vis[o.name];
      }
    });

    const flame = lanternGroup.getObjectByName("flame");
    if (flame) {
      // Early forms: flame sits lower as a free spark; later it rides inside the glass.
      flame.position.y = stage <= 1 ? 0.12 + stage * 0.08 : 0.3;
      flame.scale.setScalar(stage === 0 ? 1.35 : 1);
    }
    return evo;
  }

  function createEnemyMesh(kind) {
    const g = new THREE.Group();
    if (kind === "brute") {
      const body = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.58, 0),
        new THREE.MeshStandardMaterial({
          color: 0x24382c,
          roughness: 0.94,
          metalness: 0.04,
          emissive: 0x0a1810,
          emissiveIntensity: 0.35,
        }),
      );
      g.add(body);
      const moss = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 10, 10),
        new THREE.MeshStandardMaterial({ color: 0x3d6344, roughness: 1 }),
      );
      moss.position.set(0.18, 0.22, 0.12);
      g.add(moss);
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 8, 8),
        new THREE.MeshStandardMaterial({
          color: 0xf0b429,
          emissive: 0xf0b429,
          emissiveIntensity: 2.2,
        }),
      );
      eye.position.set(0.1, 0.2, 0.48);
      g.add(eye);
    } else if (kind === "dart") {
      const body = new THREE.Mesh(
        new THREE.ConeGeometry(0.16, 0.72, 8),
        new THREE.MeshStandardMaterial({
          color: 0x5f9a78,
          roughness: 0.45,
          metalness: 0.22,
          emissive: 0x1a3a28,
          emissiveIntensity: 0.55,
        }),
      );
      body.rotation.x = Math.PI / 2;
      g.add(body);
      const wing = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.04, 0.18),
        new THREE.MeshStandardMaterial({
          color: 0x7eb892,
          emissive: 0x245038,
          emissiveIntensity: 0.4,
          transparent: true,
          opacity: 0.85,
        }),
      );
      g.add(wing);
    } else if (kind === "boss") {
      const body = new THREE.Mesh(
        new THREE.SphereGeometry(0.95, 28, 28),
        new THREE.MeshStandardMaterial({
          color: 0x4a2010,
          roughness: 0.55,
          metalness: 0.28,
          emissive: 0x2a1008,
          emissiveIntensity: 0.55,
        }),
      );
      g.add(body);
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 14, 14),
        new THREE.MeshStandardMaterial({
          color: 0xf0b429,
          emissive: 0xf0b429,
          emissiveIntensity: 2.8,
        }),
      );
      eye.position.set(0, 0.25, 0.75);
      g.add(eye);
      const horns = new THREE.Mesh(
        new THREE.ConeGeometry(0.12, 0.45, 6),
        new THREE.MeshStandardMaterial({ color: 0x2a1810, roughness: 0.8 }),
      );
      horns.position.set(0.35, 0.85, 0.1);
      horns.rotation.z = -0.4;
      g.add(horns);
    } else {
      // marsh wisp — soft green phantom moth
      const body = new THREE.Mesh(
        new THREE.SphereGeometry(0.34, 16, 16),
        new THREE.MeshStandardMaterial({
          color: 0x6f8f72,
          roughness: 0.28,
          transparent: true,
          opacity: 0.82,
          emissive: 0x3a6a4a,
          emissiveIntensity: 1.35,
        }),
      );
      g.add(body);
      const wing = new THREE.Mesh(
        new THREE.SphereGeometry(0.28, 10, 10),
        new THREE.MeshStandardMaterial({
          color: 0x9bb89a,
          transparent: true,
          opacity: 0.35,
          emissive: 0x4a7a58,
          emissiveIntensity: 0.8,
          depthWrite: false,
        }),
      );
      wing.scale.set(1.6, 0.35, 1);
      wing.position.y = 0.05;
      g.add(wing);
    }
    g.visible = false;
    scene.add(g);
    return { kind, mesh: g };
  }

  function createGemMesh() {
    const group = new THREE.Group();
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 14, 14),
      new THREE.MeshStandardMaterial({
        color: 0xffe08a,
        emissive: 0xffb020,
        emissiveIntensity: 3.2,
        metalness: 0.35,
        roughness: 0.22,
      }),
    );
    group.add(core);
    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: makeGlowTexture(),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.55,
        color: 0xffc050,
      }),
    );
    halo.scale.set(1.1, 1.1, 1);
    group.add(halo);
    const pool = new THREE.Mesh(
      new THREE.CircleGeometry(0.35, 16),
      new THREE.MeshBasicMaterial({
        color: 0xffb040,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = 0.02;
    group.add(pool);
    group.visible = false;
    group.userData = { core, halo, pool };
    scene.add(group);
    return group;
  }

  function createBulletMesh() {
    const group = new THREE.Group();
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 10, 10),
      new THREE.MeshStandardMaterial({
        color: 0xfff2c0,
        emissive: 0xffc050,
        emissiveIntensity: 3.6,
      }),
    );
    group.add(core);
    const streak = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.01, 0.32, 6),
      new THREE.MeshBasicMaterial({
        color: 0xffe08a,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    streak.rotation.z = Math.PI / 2;
    streak.position.x = -0.12;
    group.add(streak);
    group.visible = false;
    group.userData = { core, streak };
    scene.add(group);
    return group;
  }

  function createPickupMesh(kind) {
    const nuke = kind === "nuke";
    const swarm = kind === "swarm";
    const group = new THREE.Group();
    const crate = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.42, 0.55),
      new THREE.MeshStandardMaterial({
        color: nuke ? 0x3a2a55 : swarm ? 0x4a1820 : 0x4a2e14,
        emissive: nuke ? 0x5b21b6 : swarm ? 0x9f1239 : 0x9a4a12,
        emissiveIntensity: swarm ? 1.1 : 0.85,
        metalness: 0.25,
        roughness: 0.55,
      }),
    );
    crate.castShadow = true;
    group.add(crate);
    const band = new THREE.Mesh(
      new THREE.BoxGeometry(0.58, 0.08, 0.58),
      new THREE.MeshStandardMaterial({
        color: nuke ? 0xc084fc : swarm ? 0xe11d48 : 0xe07a2f,
        emissive: nuke ? 0x7c3aed : swarm ? 0xff2244 : 0xff8a2a,
        emissiveIntensity: 1.6,
        metalness: 0.4,
        roughness: 0.35,
      }),
    );
    band.position.y = 0.05;
    group.add(band);
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: makeGlowTexture(),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.4,
        color: nuke ? 0xa78bfa : swarm ? 0xfb7185 : 0xffb040,
      }),
    );
    glow.scale.set(1.6, 1.6, 1);
    glow.position.y = 0.35;
    group.add(glow);
    group.visible = false;
    group.userData.kind = kind;
    scene.add(group);
    return group;
  }

  function createParticleMesh() {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 6, 6),
      new THREE.MeshBasicMaterial({
        color: 0xffc050,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    mesh.visible = false;
    scene.add(mesh);
    return mesh;
  }

  function createGrenadeMesh() {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 14, 14),
      new THREE.MeshStandardMaterial({
        color: 0xffb040,
        emissive: 0xff6a20,
        emissiveIntensity: 2.8,
        roughness: 0.35,
        metalness: 0.25,
      }),
    );
    group.add(body);
    const pin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.18, 6),
      new THREE.MeshStandardMaterial({ color: 0x5a3612, metalness: 0.6, roughness: 0.4 }),
    );
    pin.position.y = 0.22;
    group.add(pin);
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.22, 16),
      new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    group.add(shadow);
    group.visible = false;
    group.userData = { body, shadow };
    scene.add(group);
    return group;
  }

  function createCrateHint() {
    const group = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      transparent: true,
      opacity: 0.95,
      depthTest: true,
    });
    // tick on the lantern ring
    const tick = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.07, 0.16), mat);
    tick.position.set(1.22, 0.1, 0);
    group.add(tick);
    // arrow pointing outward toward the crate
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.34, 8), mat);
    cone.rotation.z = -Math.PI / 2;
    cone.position.set(1.58, 0.1, 0);
    group.add(cone);
    group.visible = false;
    scene.add(group);
    return { group, mat };
  }

  function createOrbitSparkMesh() {
    const group = new THREE.Group();
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 10, 10),
      new THREE.MeshStandardMaterial({
        color: 0xfff6d0,
        emissive: 0xffc050,
        emissiveIntensity: 4.5,
        roughness: 0.2,
      }),
    );
    group.add(core);
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 10, 10),
      new THREE.MeshBasicMaterial({
        color: 0xffb040,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    group.add(halo);
    const streak = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.02, 0.38, 6),
      new THREE.MeshBasicMaterial({
        color: 0xffe08a,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    streak.rotation.z = Math.PI / 2;
    streak.position.x = -0.22;
    group.add(streak);
    group.visible = false;
    scene.add(group);
    return group;
  }

  function createShockwaveMesh() {
    const group = new THREE.Group();
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(1, 64),
      new THREE.MeshBasicMaterial({
        color: 0xffc050,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    disc.rotation.x = -Math.PI / 2;
    group.add(disc);

    const mat = new THREE.MeshBasicMaterial({
      color: 0xffe08a,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const mesh = new THREE.Mesh(new THREE.RingGeometry(0.78, 1.05, 72), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = 0.04;
    group.add(mesh);

    const outer = new THREE.Mesh(
      new THREE.RingGeometry(0.95, 1.2, 72),
      new THREE.MeshBasicMaterial({
        color: 0xe07a2f,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    outer.rotation.x = -Math.PI / 2;
    outer.position.y = 0.06;
    group.add(outer);

    const inner = new THREE.Mesh(
      new THREE.RingGeometry(0.55, 0.72, 64),
      new THREE.MeshBasicMaterial({
        color: 0xfff6d0,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    inner.rotation.x = -Math.PI / 2;
    inner.position.y = 0.08;
    group.add(inner);

    group.visible = false;
    scene.add(group);
    group.userData = { disc, mesh, outer, inner };
    return group;
  }

  function ensurePool(pool, need, factory) {
    while (pool.length < need) pool.push(factory());
  }

  /** Build a static forest of trees/roots/ruins/rocks in world space (scrolls with camera). */
  function buildForestProps() {
    forestRoot = new THREE.Group();
    scene.add(forestRoot);

    // Lambert materials: readable under the lantern on software WebGL
    const barkMat = new THREE.MeshLambertMaterial({ color: 0x3a2c1c });
    const canopyMat = new THREE.MeshLambertMaterial({ color: 0x1f3a28 });
    const canopyDarkMat = new THREE.MeshLambertMaterial({ color: 0x162a1e });
    const rockMat = new THREE.MeshLambertMaterial({ color: 0x4e4e46 });
    const ruinMat = new THREE.MeshLambertMaterial({ color: 0x5c5648 });
    const rootMat = new THREE.MeshLambertMaterial({ color: 0x3a2a1a });
    const mossMat = new THREE.MeshLambertMaterial({ color: 0x3a5a42 });

    const trunkGeo = new THREE.CylinderGeometry(0.18, 0.28, 1, 7);
    const canopyGeo = new THREE.ConeGeometry(1.1, 2.2, 7);
    const rockGeo = new THREE.DodecahedronGeometry(0.55, 0);
    const stumpGeo = new THREE.CylinderGeometry(0.35, 0.42, 0.35, 8);

    function placeClear(wx, wy, minDist = 160) {
      return Math.hypot(wx, wy) >= minDist;
    }

    // Trees — keep a playable clearing, but allow trunks into the lantern's light ring
    for (let i = 0; i < 160; i++) {
      const wx = (hash2(i, 1) - 0.5) * 4200;
      const wy = (hash2(i, 2) - 0.5) * 4200;
      if (!placeClear(wx, wy, 110)) continue;
      const x = wx * WORLD_SCALE;
      const z = wy * WORLD_SCALE;
      const hScale = 0.75 + hash2(i, 3) * 1.1;
      const lean = (hash2(i, 4) - 0.5) * 0.18;

      const trunk = new THREE.Mesh(trunkGeo, barkMat);
      trunk.position.set(x, 0.55 * hScale, z);
      trunk.scale.set(0.7 + hash2(i, 5) * 0.6, hScale, 0.7 + hash2(i, 6) * 0.6);
      trunk.rotation.z = lean;
      trunk.castShadow = false;
      forestRoot.add(trunk);

      const canopy = new THREE.Mesh(canopyGeo, hash2(i, 7) > 0.5 ? canopyMat : canopyDarkMat);
      canopy.position.set(x + lean * 0.8, 1.35 * hScale + 0.4, z);
      canopy.scale.setScalar(0.55 + hash2(i, 8) * 0.7);
      canopy.rotation.y = hash2(i, 9) * Math.PI * 2;
      canopy.castShadow = false;
      forestRoot.add(canopy);

      if (hash2(i, 10) > 0.72) {
        const canopy2 = new THREE.Mesh(canopyGeo, canopyDarkMat);
        canopy2.position.set(x - 0.15, 1.05 * hScale + 0.2, z + 0.1);
        canopy2.scale.setScalar(0.4 + hash2(i, 11) * 0.35);
        forestRoot.add(canopy2);
      }
    }

    // Rocks & debris
    for (let i = 0; i < 90; i++) {
      const wx = (hash2(i, 20) - 0.5) * 4000;
      const wy = (hash2(i, 21) - 0.5) * 4000;
      if (!placeClear(wx, wy, 120)) continue;
      const rock = new THREE.Mesh(rockGeo, rockMat);
      const s = 0.35 + hash2(i, 22) * 0.9;
      rock.position.set(wx * WORLD_SCALE, 0.12 * s, wy * WORLD_SCALE);
      rock.scale.set(s, s * (0.45 + hash2(i, 23) * 0.5), s * (0.7 + hash2(i, 24) * 0.5));
      rock.rotation.set(hash2(i, 25), hash2(i, 26) * Math.PI, hash2(i, 27));
      rock.castShadow = true;
      rock.receiveShadow = true;
      forestRoot.add(rock);
    }

    // Fallen roots / logs
    for (let i = 0; i < 45; i++) {
      const wx = (hash2(i, 30) - 0.5) * 4000;
      const wy = (hash2(i, 31) - 0.5) * 4000;
      if (!placeClear(wx, wy, 140)) continue;
      const log = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08 + hash2(i, 32) * 0.1, 0.1 + hash2(i, 33) * 0.12, 1.4 + hash2(i, 34), 6),
        rootMat,
      );
      log.position.set(wx * WORLD_SCALE, 0.1, wy * WORLD_SCALE);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = hash2(i, 35) * Math.PI;
      log.castShadow = true;
      log.receiveShadow = true;
      forestRoot.add(log);
    }

    // Ruin blocks / broken pillars
    for (let i = 0; i < 28; i++) {
      const wx = (hash2(i, 40) - 0.5) * 3800;
      const wy = (hash2(i, 41) - 0.5) * 3800;
      if (!placeClear(wx, wy, 220)) continue;
      const block = new THREE.Mesh(
        new THREE.BoxGeometry(0.5 + hash2(i, 42) * 0.8, 0.35 + hash2(i, 43) * 1.2, 0.45 + hash2(i, 44) * 0.6),
        ruinMat,
      );
      block.position.set(wx * WORLD_SCALE, 0.2 + hash2(i, 45) * 0.3, wy * WORLD_SCALE);
      block.rotation.y = hash2(i, 46) * Math.PI;
      block.rotation.z = (hash2(i, 47) - 0.5) * 0.25;
      block.castShadow = true;
      block.receiveShadow = true;
      forestRoot.add(block);

      if (hash2(i, 48) > 0.55) {
        const moss = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), mossMat);
        moss.position.set(wx * WORLD_SCALE + 0.1, 0.45, wy * WORLD_SCALE);
        moss.scale.set(1.2, 0.45, 1);
        forestRoot.add(moss);
      }
    }

    // Stumps near paths
    for (let i = 0; i < 35; i++) {
      const wx = (hash2(i, 50) - 0.5) * 3600;
      const wy = (hash2(i, 51) - 0.5) * 3600;
      if (!placeClear(wx, wy, 150)) continue;
      const stump = new THREE.Mesh(stumpGeo, barkMat);
      stump.position.set(wx * WORLD_SCALE, 0.15, wy * WORLD_SCALE);
      stump.scale.setScalar(0.7 + hash2(i, 52) * 0.6);
      stump.castShadow = true;
      stump.receiveShadow = true;
      forestRoot.add(stump);
    }

    // Low undergrowth clumps (near-ground vegetation)
    const bushGeo = new THREE.SphereGeometry(0.35, 7, 6);
    for (let i = 0; i < 100; i++) {
      const wx = (hash2(i, 60) - 0.5) * 4000;
      const wy = (hash2(i, 61) - 0.5) * 4000;
      if (!placeClear(wx, wy, 100)) continue;
      const bush = new THREE.Mesh(bushGeo, hash2(i, 62) > 0.5 ? canopyMat : mossMat);
      bush.position.set(wx * WORLD_SCALE, 0.15, wy * WORLD_SCALE);
      bush.scale.set(0.8 + hash2(i, 63), 0.35 + hash2(i, 64) * 0.35, 0.8 + hash2(i, 65));
      bush.castShadow = true;
      forestRoot.add(bush);
    }
  }

  function init(container) {
    if (ready || !container) return;

    renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      alpha: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = false;
    if ("physicallyCorrectLights" in renderer) {
      renderer.physicallyCorrectLights = true;
    }
    container.appendChild(renderer.domElement);
    renderer.domElement.id = "game";
    renderer.domElement.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;display:block;";

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x040706);
    // Keep fog gentle — camera sits ~20 units away; dense fog erased the forest
    scene.fog = new THREE.FogExp2(0x08100c, 0.022);

    camera = new THREE.PerspectiveCamera(
      48,
      window.innerWidth / window.innerHeight,
      0.1,
      220,
    );
    camera.position.set(0, 17, 15.5);
    camera.lookAt(0, 0, 0);

    // Dim fill: enough to silhouette trees, not enough to flatten the night
    hemi = new THREE.HemisphereLight(0x4a5c50, 0x0a0806, 0.22);
    scene.add(hemi);
    ambient = new THREE.AmbientLight(0x141c16, 0.1);
    scene.add(ambient);

    rimLight = new THREE.DirectionalLight(0x3a4a40, 0.12);
    rimLight.position.set(-12, 18, -8);
    rimLight.castShadow = false;
    scene.add(rimLight);

    // Large ground that follows the lantern; UVs scroll for infinite forest floor.
    // Lambert + fewer segments: more reliable on software WebGL (SwiftShader).
    const groundGeo = new THREE.PlaneGeometry(90, 90, 36, 36);
    const pos = groundGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const ripples =
        Math.sin(x * 0.35) * Math.cos(y * 0.3) * 0.12 +
        Math.sin(x * 1.1 + y * 0.55) * 0.04;
      pos.setZ(i, ripples);
    }
    groundGeo.computeVertexNormals();

    groundTexture = makeForestFloorTexture();
    groundTexture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    const groundMat = new THREE.MeshLambertMaterial({
      map: groundTexture,
      color: 0xffffff,
    });
    ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    buildForestProps();

    // Damp patches that orbit near the lantern (read as wet hollows in the light)
    const puddleMat = new THREE.MeshStandardMaterial({
      color: 0x0a1410,
      metalness: 0.55,
      roughness: 0.22,
      transparent: true,
      opacity: 0.65,
    });
    for (let i = 0; i < 10; i++) {
      const puddle = new THREE.Mesh(
        new THREE.CircleGeometry(0.6 + Math.random() * 1.4, 20),
        puddleMat.clone(),
      );
      puddle.rotation.x = -Math.PI / 2;
      puddle.userData.ox = (Math.random() - 0.5) * 18;
      puddle.userData.oz = (Math.random() - 0.5) * 18;
      puddle.position.set(puddle.userData.ox, 0.035, puddle.userData.oz);
      puddle.receiveShadow = true;
      scene.add(puddle);
      puddles.push(puddle);
    }

    // Soft ground mist — re-anchored around the lantern in sync
    const mistMat = new THREE.MeshStandardMaterial({
      color: 0x8a9a88,
      transparent: true,
      opacity: 0.04,
      depthWrite: false,
      roughness: 1,
    });
    for (let i = 0; i < 16; i++) {
      const mist = new THREE.Mesh(new THREE.SphereGeometry(2.4 + Math.random() * 2.2, 10, 10), mistMat);
      mist.userData.ox = (Math.random() - 0.5) * 28;
      mist.userData.oz = (Math.random() - 0.5) * 28;
      mist.userData.phase = Math.random() * Math.PI * 2;
      mist.position.set(mist.userData.ox, 0.7 + Math.random() * 0.5, mist.userData.oz);
      mist.scale.y = 0.28;
      scene.add(mist);
      mistPuffs.push(mist);
    }

    // Floating dust / ember motes
    for (let i = 0; i < 36; i++) {
      const ember = new THREE.Mesh(
        new THREE.SphereGeometry(0.03, 6, 6),
        new THREE.MeshStandardMaterial({
          color: 0xffc070,
          emissive: 0xff8a30,
          emissiveIntensity: 1.4,
          transparent: true,
          opacity: 0.75,
          depthWrite: false,
        }),
      );
      ember.userData.phase = Math.random() * Math.PI * 2;
      ember.userData.rad = 1.5 + Math.random() * 7;
      ember.visible = false;
      scene.add(ember);
      emberPool.push(ember);
    }

    lanternGroup = createLanternModel();
    lanternGroup.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    scene.add(lanternGroup);

    // Warm lantern as the dominant light — soft decay, wide enough to read the floor
    lanternLight = new THREE.PointLight(0xffb040, 110, 36, 1.25);
    // Shadows are expensive/unreliable on software WebGL; keep them off for stability
    lanternLight.castShadow = false;
    scene.add(lanternLight);

    flameLight = new THREE.PointLight(0xffe08a, 22, 11, 1.9);
    scene.add(flameLight);

    glowSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: makeGlowTexture(),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.85,
      }),
    );
    glowSprite.scale.set(5.2, 5.2, 1);
    scene.add(glowSprite);

    ringMesh = new THREE.Mesh(
      new THREE.RingGeometry(1.1, 1.25, 56),
      new THREE.MeshBasicMaterial({
        color: 0xf0b429,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
      }),
    );
    ringMesh.rotation.x = -Math.PI / 2;
    scene.add(ringMesh);

    orbitRing = new THREE.Mesh(
      new THREE.RingGeometry(1.9, 2.15, 72),
      new THREE.MeshBasicMaterial({
        color: 0xffc050,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    orbitRing.rotation.x = -Math.PI / 2;
    orbitRing.visible = false;
    scene.add(orbitRing);

    for (let i = 0; i < 48; i++) {
      const ff = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 8, 8),
        new THREE.MeshStandardMaterial({
          color: 0xffd56a,
          emissive: 0xffc040,
          emissiveIntensity: 2.2,
        }),
      );
      ff.userData.phase = Math.random() * Math.PI * 2;
      scene.add(ff);
      fireflies.push(ff);
    }

    window.addEventListener("resize", onResize);
    ready = true;
  }

  function onResize() {
    if (!ready) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  function worldTo3D(x, y, z = 0) {
    return { x: x * WORLD_SCALE, y: z, z: y * WORLD_SCALE };
  }

  function followGround(pp) {
    if (!ground) return;
    ground.position.set(pp.x, 0, pp.z);
    if (groundTexture) {
      // UV scroll so the floor pattern moves with the lantern
      groundTexture.offset.set(pp.x * 0.045, pp.z * 0.045);
    }
    for (let i = 0; i < puddles.length; i++) {
      const puddle = puddles[i];
      puddle.position.x = pp.x + puddle.userData.ox;
      puddle.position.z = pp.z + puddle.userData.oz;
    }
  }

  function syncAtmosphere(pp, time, titleMode) {
    for (let i = 0; i < mistPuffs.length; i++) {
      const m = mistPuffs[i];
      const drift = Math.sin(time * 0.25 + m.userData.phase) * 0.6;
      m.position.x = pp.x + m.userData.ox + drift;
      m.position.z = pp.z + m.userData.oz + Math.cos(time * 0.2 + i) * 0.5;
      m.position.y = 0.65 + Math.sin(time * 0.4 + i) * 0.12;
      m.material.opacity = titleMode ? 0.055 : 0.035 + Math.sin(time + i) * 0.008;
    }
    for (let i = 0; i < emberPool.length; i++) {
      const e = emberPool[i];
      if (titleMode) {
        e.visible = i < 18;
      } else {
        e.visible = true;
      }
      if (!e.visible) continue;
      const a = time * 0.35 + e.userData.phase;
      const r = e.userData.rad;
      e.position.set(
        pp.x + Math.cos(a) * r,
        0.35 + Math.sin(a * 1.4 + i) * 0.9,
        pp.z + Math.sin(a * 0.85) * r,
      );
      e.material.emissiveIntensity = 0.8 + Math.sin(time * 3 + i) * 0.7;
      e.material.opacity = 0.35 + Math.sin(time * 2.2 + i) * 0.25;
    }
  }

  function sync(state, mode) {
    if (!ready) return;

    const now = performance.now();

    if (!state || mode === "title" || mode === "tutorial" || mode === "shop") {
      const t = now * 0.00022;
      // lower heroic angle so the brass lantern reads behind the title UI
      camera.position.set(Math.sin(t) * 4.5, 7.2, 8.8 + Math.cos(t) * 1.8);
      camera.lookAt(0, 0.85, 0);
      applyLanternEvolution(99, true);
      const origin = { x: 0, y: 0, z: 0 };
      followGround(origin);
      lanternGroup.position.set(0, 0.2, 0);
      lanternGroup.rotation.y = t * 0.6;
      lanternLight.position.set(0, 1.35, 0);
      flameLight.position.set(0, 1.1, 0);
      glowSprite.position.set(0, 1.1, 0);
      glowSprite.scale.setScalar(6.2);
      ringMesh.position.set(0, 0.05, 0);
      const flame = lanternGroup.getObjectByName("flame");
      if (flame) {
        const f = 0.92 + Math.sin(now * 0.018) * 0.1;
        flame.scale.setScalar(f);
        flame.material.emissiveIntensity = 3.2 + f;
      }
      lanternLight.intensity = 62 + Math.sin(now * 0.018) * 6;
      lanternLight.distance = 28;
      flameLight.intensity = 16;
      glowSprite.material.opacity = 0.7 + Math.sin(now * 0.015) * 0.12;
      syncAtmosphere(origin, now * 0.001, true);
      enemyPool.forEach((e) => (e.mesh.visible = false));
      gemPool.forEach((m) => (m.visible = false));
      bulletPool.forEach((m) => (m.visible = false));
      pickupPool.forEach((m) => (m.visible = false));
      grenadePool.forEach((m) => (m.visible = false));
      crateHintPool.forEach((h) => (h.group.visible = false));
      orbitSparkPool.forEach((m) => (m.visible = false));
      shockwavePool.forEach((m) => (m.visible = false));
      particlePool.forEach((m) => (m.visible = false));
      if (orbitRing) orbitRing.visible = false;
      renderer.render(scene, camera);
      return;
    }

    const p = state.player;
    const evo = applyLanternEvolution(p.level, false);
    const pp = worldTo3D(p.x, p.y);
    followGround(pp);
    const bob = Math.sin(state.time * 6) * 0.05;
    const formLift = evo.stage <= 1 ? 0.05 : 0.15;
    lanternGroup.position.set(pp.x, formLift + bob, pp.z);
    lanternGroup.rotation.z = 0;
    lanternGroup.rotation.y += 0.012;

    const flame = lanternGroup.getObjectByName("flame");
    const flick = 0.88 + Math.sin(state.time * 18) * 0.08 + Math.sin(state.time * 41) * 0.03;
    const lightMul = evo.light != null ? evo.light : 1;
    if (flame) {
      const baseFlame = evo.stage === 0 ? 1.25 : 0.9;
      flame.scale.setScalar(baseFlame + flick * 0.28);
      flame.material.emissiveIntensity = (3.0 + evo.stage * 0.35 + flick * 2.4) * lightMul;
    }
    const glass = lanternGroup.getObjectByName("glass");
    if (glass && glass.material && glass.material.emissiveIntensity != null) {
      glass.material.emissiveIntensity = (0.85 + flick * 0.4) * lightMul;
    }

    const lightH = evo.stage <= 1 ? 0.55 : 1.25;
    const flameH = evo.stage <= 1 ? 0.45 : 1.0;
    const glowH = evo.stage <= 1 ? 0.4 : 0.95;
    lanternLight.position.set(pp.x, lightH + bob, pp.z);
    lanternLight.intensity = 88 * flick * lightMul;
    lanternLight.distance = 30 + evo.stage * 1.8;
    flameLight.position.set(pp.x, flameH + bob, pp.z);
    flameLight.intensity = 20 * flick * lightMul;
    glowSprite.position.set(pp.x, glowH + bob, pp.z);
    glowSprite.material.opacity = (0.45 + flick * 0.38) * lightMul;
    glowSprite.scale.setScalar((2.6 + evo.stage * 0.55 + flick * 0.9) * (0.75 + lightMul * 0.3));

    ringMesh.position.set(pp.x, 0.06, pp.z);
    const hp = Math.max(0.05, p.hp / p.maxHp);
    ringMesh.scale.setScalar(0.8 + hp * 0.5);
    ringMesh.material.opacity = 0.35 + hp * 0.5;

    const camTarget = new THREE.Vector3(pp.x, 0.45, pp.z);
    const camPos = new THREE.Vector3(pp.x + 0.4, 16.5, pp.z + 14.5);
    camera.position.lerp(camPos, 0.12);
    camera.lookAt(camTarget);

    syncAtmosphere(pp, state.time, false);

    ensurePool(enemyPool, state.enemies.length, () => createEnemyMesh("wisp"));
    for (let i = 0; i < enemyPool.length; i++) {
      const slot = enemyPool[i];
      const e = state.enemies[i];
      if (!e) {
        slot.mesh.visible = false;
        continue;
      }
      if (slot.kind !== e.kind) {
        scene.remove(slot.mesh);
        enemyPool[i] = createEnemyMesh(e.kind);
      }
      const m = enemyPool[i].mesh;
      const ep = worldTo3D(e.x, e.y);
      const bounce = Math.sin(e.pulse || state.time * 3) * 0.08;
      m.visible = true;
      m.position.set(ep.x, 0.45 + bounce, ep.z);
      m.lookAt(pp.x, 0.45, pp.z);
      const hit = e.hitFlash && e.hitFlash > 0;
      m.traverse((o) => {
        if (o.isMesh && o.material && o.material.emissive) {
          if (hit) o.material.emissiveIntensity = 2.6;
        }
      });
    }

    ensurePool(gemPool, state.gems.length, createGemMesh);
    for (let i = 0; i < gemPool.length; i++) {
      const m = gemPool[i];
      const g = state.gems[i];
      if (!g) {
        m.visible = false;
        continue;
      }
      const gp = worldTo3D(g.x, g.y);
      m.visible = true;
      const bobY = 0.32 + Math.sin(state.time * 5 + i) * 0.1;
      m.position.set(gp.x, bobY, gp.z);
      m.rotation.y += 0.06;
      if (m.userData.core) {
        m.userData.core.material.emissiveIntensity = 2.6 + Math.sin(state.time * 6 + i) * 0.8;
      }
      if (m.userData.halo) {
        m.userData.halo.material.opacity = 0.4 + Math.sin(state.time * 4 + i) * 0.15;
      }
      if (m.userData.pool) {
        m.userData.pool.material.opacity = 0.16 + Math.sin(state.time * 3 + i) * 0.06;
      }
    }

    ensurePool(bulletPool, state.bullets.length, createBulletMesh);
    for (let i = 0; i < bulletPool.length; i++) {
      const m = bulletPool[i];
      const b = state.bullets[i];
      if (!b) {
        m.visible = false;
        continue;
      }
      const bp = worldTo3D(b.x, b.y);
      m.visible = true;
      m.position.set(bp.x, 0.7, bp.z);
      const ang = Math.atan2(b.vy || 0, b.vx || 1);
      m.rotation.y = -ang;
      const core = m.userData.core;
      if (core && core.material) {
        if (b.swirl) {
          core.material.color.set(0xff6b81);
          core.material.emissive.set(0xe11d48);
          core.material.emissiveIntensity = 4.2;
          m.scale.setScalar(1.25);
          if (m.userData.streak) m.userData.streak.material.color.set(0xff6b81);
        } else {
          core.material.color.set(0xfff2c0);
          core.material.emissive.set(0xffc050);
          core.material.emissiveIntensity = 3.6;
          m.scale.setScalar(1);
          if (m.userData.streak) m.userData.streak.material.color.set(0xffe08a);
        }
      }
    }

    const pickups = state.weaponPickups || [];
    ensurePool(pickupPool, pickups.length, () => createPickupMesh("grenades"));
    for (let i = 0; i < pickupPool.length; i++) {
      let m = pickupPool[i];
      const w = pickups[i];
      if (!w) {
        m.visible = false;
        continue;
      }
      if (m.userData.kind !== w.kind) {
        scene.remove(m);
        m = createPickupMesh(w.kind);
        pickupPool[i] = m;
      }
      const wp = worldTo3D(w.x, w.y);
      m.visible = true;
      m.position.set(wp.x, 0.45 + Math.sin((w.pulse || state.time) * 4) * 0.12, wp.z);
      m.rotation.y += 0.04;
      m.rotation.x = Math.sin(state.time * 2 + i) * 0.15;
    }

    const grenades = state.grenades || [];
    ensurePool(grenadePool, grenades.length, createGrenadeMesh);
    for (let i = 0; i < grenadePool.length; i++) {
      const m = grenadePool[i];
      const g = grenades[i];
      if (!g) {
        m.visible = false;
        continue;
      }
      const gp = worldTo3D(g.x, g.y);
      const height = Math.max(0.15, 0.15 + (g.z || 0) * 0.045);
      m.visible = true;
      m.position.set(gp.x, 0, gp.z);
      if (m.userData.body) {
        m.userData.body.position.y = height;
        m.userData.body.rotation.x = (g.spin || 0) * 0.8;
        m.userData.body.rotation.z = (g.spin || 0) * 1.2;
      }
      if (m.userData.shadow) {
        const shrink = Math.max(0.35, 1 - (g.z || 0) / 220);
        m.userData.shadow.scale.setScalar(shrink);
        m.userData.shadow.material.opacity = 0.4 * shrink;
      }
    }

    for (let i = 0; i < fireflies.length; i++) {
      const ff = fireflies[i];
      const a = state.time * 0.4 + ff.userData.phase;
      const r = 2.2 + (i % 6) * 0.85;
      ff.position.set(
        pp.x + Math.cos(a) * r,
        0.45 + Math.sin(a * 1.7) * 0.7,
        pp.z + Math.sin(a * 0.9) * r,
      );
      ff.material.emissiveIntensity = 1.6 + Math.sin(state.time * 4 + i) * 1.1;
      ff.scale.setScalar(0.7 + Math.sin(state.time * 5 + i) * 0.25);
    }

    // Sync gameplay particles into CGI (visual only)
    const parts = state.particles || [];
    ensurePool(particlePool, Math.min(parts.length, 80), createParticleMesh);
    for (let i = 0; i < particlePool.length; i++) {
      const m = particlePool[i];
      const pt = parts[i];
      if (!pt) {
        m.visible = false;
        continue;
      }
      const p3 = worldTo3D(pt.x, pt.y);
      const life = pt.life != null ? Math.max(0.1, pt.life / (pt.max || 0.7)) : 0.6;
      m.visible = true;
      m.position.set(p3.x, 0.35 + life * 0.2, p3.z);
      m.scale.setScalar(0.45 + life * 0.9);
      if (m.material) {
        try {
          if (pt.color) m.material.color.set(pt.color);
        } catch (_) {
          /* ignore bad colors */
        }
        m.material.opacity = Math.min(0.9, life);
      }
    }

    if (window.__lanternFocus) {
      ringMesh.material.color.set(0xe07a2f);
    } else {
      ringMesh.material.color.set(0xf0b429);
    }

    // colored ring hints pointing at weapon crates
    ensurePool(crateHintPool, pickups.length, createCrateHint);
    const ringScale = 0.8 + hp * 0.5;
    for (let i = 0; i < crateHintPool.length; i++) {
      const hint = crateHintPool[i];
      const w = pickups[i];
      if (!w) {
        hint.group.visible = false;
        continue;
      }
      const ang = Math.atan2(w.y - p.y, w.x - p.x);
      const color =
        w.kind === "nuke" ? 0x3b82f6 : w.kind === "swarm" ? 0xe11d48 : 0x22c55e;
      hint.mat.color.set(color);
      hint.mat.opacity = 0.75 + Math.sin(state.time * 6 + i) * 0.2;
      hint.group.visible = true;
      hint.group.position.set(pp.x, 0.02, pp.z);
      hint.group.rotation.y = -ang;
      hint.group.scale.setScalar(ringScale);
    }

    // orbit sparks — small swirling embers
    const sparks = state.orbitSparks || [];
    ensurePool(orbitSparkPool, sparks.length, createOrbitSparkMesh);
    if (orbitRing) {
      if (sparks.length) {
        const orbitR = (44 + (p.orbit || 1) * 8) * 0.04;
        orbitRing.visible = true;
        orbitRing.position.set(pp.x, 0.14, pp.z);
        orbitRing.scale.setScalar(orbitR / 2.05);
        orbitRing.material.opacity = 0.18 + Math.sin(state.time * 7) * 0.06;
      } else {
        orbitRing.visible = false;
      }
    }
    for (let i = 0; i < orbitSparkPool.length; i++) {
      const m = orbitSparkPool[i];
      const sp = sparks[i];
      if (!sp) {
        m.visible = false;
        continue;
      }
      const sp3 = worldTo3D(sp.x, sp.y);
      m.visible = true;
      m.position.set(sp3.x, 0.7 + Math.sin(state.time * 14 + i) * 0.12, sp3.z);
      m.rotation.y = -(sp.a || 0) + Math.PI / 2;
      const pulse = (sp.pop ? 2.4 : 0.85) + Math.sin(state.time * 18 + i) * 0.12;
      m.scale.setScalar(pulse);
      if (m.children[0] && m.children[0].material) {
        m.children[0].material.emissiveIntensity = 3.8 + pulse + (sp.pop ? 3 : 0);
      }
    }

    // nova shockwaves
    const waves = state.shockwaves || [];
    ensurePool(shockwavePool, waves.length, createShockwaveMesh);
    for (let i = 0; i < shockwavePool.length; i++) {
      const m = shockwavePool[i];
      const sw = waves[i];
      if (!sw) {
        m.visible = false;
        continue;
      }
      const sw3 = worldTo3D(sw.x, sw.y);
      const alpha = Math.max(0, sw.life / sw.maxLife);
      const scale = Math.max(0.2, sw.r * 0.04);
      m.visible = true;
      m.position.set(sw3.x, 0.12, sw3.z);
      m.scale.set(scale, 1, scale);
      const ud = m.userData || {};
      const grenadeBoom = sw.tint === "grenade";
      if (ud.disc) {
        ud.disc.material.color.set(grenadeBoom ? 0xff8a2a : 0xffc050);
        ud.disc.material.opacity = 0.18 + 0.45 * alpha;
      }
      if (ud.mesh) {
        ud.mesh.material.color.set(grenadeBoom ? 0xffb040 : 0xffe08a);
        ud.mesh.material.opacity = 0.4 + 0.55 * alpha;
      }
      if (ud.outer) {
        ud.outer.material.color.set(grenadeBoom ? 0xe07a2f : 0xe07a2f);
        ud.outer.material.opacity = 0.3 + 0.55 * alpha;
      }
      if (ud.inner) {
        ud.inner.material.color.set(grenadeBoom ? 0xfff2c0 : 0xfff6d0);
        ud.inner.material.opacity = 0.35 + 0.55 * alpha;
      }
    }

    renderer.render(scene, camera);
  }

  function hideCanvas2D() {
    if (renderer && renderer.domElement) {
      renderer.domElement.dataset.cgi = "1";
    }
  }

  window.LanternCGI = {
    init: function (el) {
      try {
        init(el || document.getElementById("app"));
        hideCanvas2D();
        const c2 = document.querySelector("canvas#game:not([data-cgi])");
        if (c2) c2.style.display = "none";
      } catch (err) {
        console.error("LanternCGI init failed", err);
        ready = false;
      }
    },
    sync,
    ready: function () {
      return ready;
    },
  };
})();
