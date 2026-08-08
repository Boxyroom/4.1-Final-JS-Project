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
        color: 0xc4892e,
        metalness: 0.96,
        roughness: 0.22,
        clearcoat: 0.55,
        clearcoatRoughness: 0.25,
        reflectivity: 0.9,
      });
    }
    return new THREE.MeshStandardMaterial({
      color: 0xc4892e,
      metalness: 0.92,
      roughness: 0.28,
    });
  };

  const glassMat = () => {
    if (usePhysical) {
      return new THREE.MeshPhysicalMaterial({
        color: 0xffe2a0,
        metalness: 0.05,
        roughness: 0.08,
        transmission: 0.35,
        thickness: 0.4,
        transparent: true,
        opacity: 0.78,
        emissive: 0xff9a28,
        emissiveIntensity: 0.85,
      });
    }
    return new THREE.MeshStandardMaterial({
      color: 0xffd27a,
      metalness: 0.05,
      roughness: 0.12,
      transparent: true,
      opacity: 0.72,
      emissive: 0xffaa33,
      emissiveIntensity: 0.75,
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

  function makeMarshTexture() {
    const size = 512;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const g = c.getContext("2d");
    g.fillStyle = "#1a2a1f";
    g.fillRect(0, 0, size, size);
    for (let i = 0; i < 4200; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 4 + Math.random() * 18;
      const shade = 18 + Math.floor(Math.random() * 40);
      const green = 30 + Math.floor(Math.random() * 55);
      g.fillStyle = `rgba(${shade}, ${green}, ${shade + 4}, ${0.18 + Math.random() * 0.35})`;
      g.beginPath();
      g.ellipse(x, y, r, r * (0.55 + Math.random() * 0.6), Math.random() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }
    for (let i = 0; i < 90; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 10 + Math.random() * 40;
      const puddle = g.createRadialGradient(x, y, 2, x, y, r);
      puddle.addColorStop(0, "rgba(8,18,14,0.75)");
      puddle.addColorStop(0.55, "rgba(14,28,20,0.35)");
      puddle.addColorStop(1, "rgba(20,36,26,0)");
      g.fillStyle = puddle;
      g.beginPath();
      g.ellipse(x, y, r, r * 0.65, Math.random() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }
    for (let i = 0; i < 700; i++) {
      g.fillStyle = `rgba(${40 + Math.random() * 50}, ${70 + Math.random() * 60}, ${35 + Math.random() * 40}, 0.28)`;
      g.fillRect(Math.random() * size, Math.random() * size, 1 + Math.random() * 2, 2 + Math.random() * 5);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(10, 10);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  function createLanternModel() {
    const group = new THREE.Group();

    const handle = new THREE.Mesh(
      new THREE.TorusGeometry(0.18, 0.028, 12, 28, Math.PI),
      brassMat(),
    );
    handle.position.y = 0.72;
    handle.rotation.x = Math.PI;
    group.add(handle);

    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.14, 24), brassMat());
    cap.position.y = 0.55;
    group.add(cap);

    const vent = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.12, 0.08, 12),
      brassMat(),
    );
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
    wick.position.y = 0.2;
    group.add(wick);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.14, 24), brassMat());
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
    foot.position.y = -0.08;
    group.add(foot);

    for (let i = 0; i < 6; i++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.42, 0.025), brassMat());
      const a = (i / 6) * Math.PI * 2;
      bar.position.set(Math.cos(a) * 0.205, 0.28, Math.sin(a) * 0.205);
      group.add(bar);
    }

    group.scale.setScalar(1.85);
    return group;
  }

  function createEnemyMesh(kind) {
    const g = new THREE.Group();
    if (kind === "brute") {
      const body = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.55, 0),
        new THREE.MeshStandardMaterial({
          color: 0x2f4f38,
          roughness: 0.92,
          metalness: 0.04,
        }),
      );
      g.add(body);
      const moss = new THREE.Mesh(
        new THREE.SphereGeometry(0.28, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0x4f7a52, roughness: 1 }),
      );
      moss.position.set(0.15, 0.2, 0.1);
      g.add(moss);
    } else if (kind === "dart") {
      const body = new THREE.Mesh(
        new THREE.ConeGeometry(0.18, 0.7, 10),
        new THREE.MeshStandardMaterial({
          color: 0x7ec8a3,
          roughness: 0.4,
          metalness: 0.18,
          emissive: 0x143226,
          emissiveIntensity: 0.25,
        }),
      );
      body.rotation.x = Math.PI / 2;
      g.add(body);
    } else if (kind === "boss") {
      const body = new THREE.Mesh(
        new THREE.SphereGeometry(0.95, 28, 28),
        new THREE.MeshStandardMaterial({
          color: 0x5a2814,
          roughness: 0.5,
          metalness: 0.22,
          emissive: 0x3a1408,
          emissiveIntensity: 0.4,
        }),
      );
      g.add(body);
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 14, 14),
        new THREE.MeshStandardMaterial({
          color: 0xf0b429,
          emissive: 0xf0b429,
          emissiveIntensity: 2.4,
        }),
      );
      eye.position.set(0, 0.25, 0.75);
      g.add(eye);
    } else {
      const body = new THREE.Mesh(
        new THREE.SphereGeometry(0.38, 20, 20),
        new THREE.MeshStandardMaterial({
          color: 0x86a37a,
          roughness: 0.22,
          transparent: true,
          opacity: 0.9,
          emissive: 0x3f6b4f,
          emissiveIntensity: 1.0,
        }),
      );
      g.add(body);
    }
    g.visible = false;
    scene.add(g);
    return { kind, mesh: g };
  }

  function createGemMesh() {
    const mesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.22, 0),
      new THREE.MeshStandardMaterial({
        color: 0xffd76a,
        emissive: 0xffb000,
        emissiveIntensity: 2.4,
        metalness: 0.45,
        roughness: 0.18,
      }),
    );
    mesh.visible = false;
    scene.add(mesh);
    return mesh;
  }

  function createBulletMesh() {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 12, 12),
      new THREE.MeshStandardMaterial({
        color: 0xfff2c0,
        emissive: 0xffc050,
        emissiveIntensity: 3.2,
      }),
    );
    mesh.visible = false;
    scene.add(mesh);
    return mesh;
  }

  function createPickupMesh(kind) {
    const nuke = kind === "nuke";
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.45, 0.45),
      new THREE.MeshStandardMaterial({
        color: nuke ? 0xc084fc : 0xe07a2f,
        emissive: nuke ? 0x7c3aed : 0xff8a2a,
        emissiveIntensity: 1.4,
        metalness: 0.35,
        roughness: 0.35,
      }),
    );
    mesh.visible = false;
    mesh.userData.kind = kind;
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
    renderer.toneMappingExposure = 1.22;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if ("physicallyCorrectLights" in renderer) {
      renderer.physicallyCorrectLights = true;
    }
    container.appendChild(renderer.domElement);
    renderer.domElement.id = "game";
    renderer.domElement.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;display:block;";

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050806);
    scene.fog = new THREE.FogExp2(0x0a1210, 0.038);

    camera = new THREE.PerspectiveCamera(
      48,
      window.innerWidth / window.innerHeight,
      0.1,
      220,
    );
    camera.position.set(0, 17, 15.5);
    camera.lookAt(0, 0, 0);

    hemi = new THREE.HemisphereLight(0xa8c4b4, 0x1a1208, 0.38);
    scene.add(hemi);
    ambient = new THREE.AmbientLight(0x1e2820, 0.18);
    scene.add(ambient);

    rimLight = new THREE.DirectionalLight(0x6a8f78, 0.35);
    rimLight.position.set(-12, 18, -8);
    rimLight.castShadow = true;
    rimLight.shadow.mapSize.set(1024, 1024);
    rimLight.shadow.camera.near = 1;
    rimLight.shadow.camera.far = 60;
    rimLight.shadow.camera.left = -25;
    rimLight.shadow.camera.right = 25;
    rimLight.shadow.camera.top = 25;
    rimLight.shadow.camera.bottom = -25;
    rimLight.shadow.bias = -0.0003;
    scene.add(rimLight);

    const groundGeo = new THREE.PlaneGeometry(140, 140, 96, 96);
    const pos = groundGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const ripples =
        Math.sin(x * 0.28) * Math.cos(y * 0.24) * 0.22 +
        Math.sin(x * 0.9 + y * 0.5) * 0.06;
      pos.setZ(i, ripples);
    }
    groundGeo.computeVertexNormals();

    groundTexture = makeMarshTexture();
    groundTexture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const groundMat = new THREE.MeshStandardMaterial({
      map: groundTexture,
      color: 0xd5e0d4,
      roughness: 0.9,
      metalness: 0.06,
    });
    ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // wet marsh puddles
    const puddleMat = new THREE.MeshStandardMaterial({
      color: 0x0d1a14,
      metalness: 0.65,
      roughness: 0.18,
      transparent: true,
      opacity: 0.72,
    });
    for (let i = 0; i < 18; i++) {
      const puddle = new THREE.Mesh(
        new THREE.CircleGeometry(0.8 + Math.random() * 1.8, 24),
        puddleMat.clone(),
      );
      puddle.rotation.x = -Math.PI / 2;
      puddle.position.set((Math.random() - 0.5) * 50, 0.04, (Math.random() - 0.5) * 50);
      puddle.receiveShadow = true;
      scene.add(puddle);
      puddles.push(puddle);
    }

    const reedMat = new THREE.MeshStandardMaterial({
      color: 0x3a5f40,
      roughness: 0.95,
    });
    for (let i = 0; i < 110; i++) {
      const h = 0.9 + Math.random() * 1.6;
      const reed = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.03, h, 5), reedMat);
      const rx = (Math.random() - 0.5) * 48;
      const rz = (Math.random() - 0.5) * 48;
      if (Math.hypot(rx, rz) < 3.2) continue;
      reed.position.set(rx, h / 2, rz);
      reed.rotation.z = (Math.random() - 0.5) * 0.25;
      reed.rotation.x = (Math.random() - 0.5) * 0.12;
      reed.castShadow = true;
      scene.add(reed);
    }

    // soft mist volumes
    const mistMat = new THREE.MeshStandardMaterial({
      color: 0xb7c9b8,
      transparent: true,
      opacity: 0.045,
      depthWrite: false,
      roughness: 1,
    });
    for (let i = 0; i < 14; i++) {
      const mist = new THREE.Mesh(new THREE.SphereGeometry(2.2 + Math.random() * 2, 12, 12), mistMat);
      mist.position.set((Math.random() - 0.5) * 40, 0.9 + Math.random(), (Math.random() - 0.5) * 40);
      mist.scale.y = 0.35;
      scene.add(mist);
      mistPuffs.push(mist);
    }

    lanternGroup = createLanternModel();
    lanternGroup.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    scene.add(lanternGroup);

    lanternLight = new THREE.PointLight(0xffb347, 55, 32, 1.8);
    lanternLight.castShadow = true;
    lanternLight.shadow.mapSize.set(1024, 1024);
    lanternLight.shadow.bias = -0.0008;
    scene.add(lanternLight);

    flameLight = new THREE.PointLight(0xffe08a, 12, 9, 2);
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
    glowSprite.scale.set(4.5, 4.5, 1);
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
    return { x: x * 0.04, y: z, z: y * 0.04 };
  }

  function sync(state, mode) {
    if (!ready) return;

    const now = performance.now();

    if (!state || mode === "title" || mode === "tutorial" || mode === "shop") {
      const t = now * 0.00022;
      // lower heroic angle so the brass lantern reads behind the title UI
      camera.position.set(Math.sin(t) * 4.5, 7.2, 8.8 + Math.cos(t) * 1.8);
      camera.lookAt(0, 0.85, 0);
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
      lanternLight.intensity = 42 + Math.sin(now * 0.018) * 5;
      glowSprite.material.opacity = 0.7 + Math.sin(now * 0.015) * 0.12;
      for (let i = 0; i < mistPuffs.length; i++) {
        const m = mistPuffs[i];
        m.position.x += Math.sin(now * 0.0003 + i) * 0.004;
        m.position.z += Math.cos(now * 0.00025 + i) * 0.003;
      }
      enemyPool.forEach((e) => (e.mesh.visible = false));
      gemPool.forEach((m) => (m.visible = false));
      bulletPool.forEach((m) => (m.visible = false));
      pickupPool.forEach((m) => (m.visible = false));
      grenadePool.forEach((m) => (m.visible = false));
      crateHintPool.forEach((h) => (h.group.visible = false));
      orbitSparkPool.forEach((m) => (m.visible = false));
      shockwavePool.forEach((m) => (m.visible = false));
      if (orbitRing) orbitRing.visible = false;
      renderer.render(scene, camera);
      return;
    }

    const p = state.player;
    const pp = worldTo3D(p.x, p.y);
    const bob = Math.sin(state.time * 6) * 0.05;
    lanternGroup.position.set(pp.x, 0.15 + bob, pp.z);
    lanternGroup.rotation.z = 0;
    lanternGroup.rotation.y += 0.012;

    const flame = lanternGroup.getObjectByName("flame");
    const flick = 0.88 + Math.sin(state.time * 18) * 0.08 + Math.sin(state.time * 41) * 0.03;
    if (flame) {
      flame.scale.setScalar(0.9 + flick * 0.28);
      flame.material.emissiveIntensity = 3.0 + flick * 2.2;
    }
    const glass = lanternGroup.getObjectByName("glass");
    if (glass && glass.material && glass.material.emissiveIntensity != null) {
      glass.material.emissiveIntensity = 0.65 + flick * 0.35;
    }

    lanternLight.position.set(pp.x, 1.35 + bob, pp.z);
    lanternLight.intensity = 52 * flick;
    flameLight.position.set(pp.x, 1.08 + bob, pp.z);
    flameLight.intensity = 12 * flick;
    glowSprite.position.set(pp.x, 1.05 + bob, pp.z);
    glowSprite.material.opacity = 0.55 + flick * 0.35;
    glowSprite.scale.setScalar(4.2 + flick * 0.8);

    ringMesh.position.set(pp.x, 0.06, pp.z);
    const hp = Math.max(0.05, p.hp / p.maxHp);
    ringMesh.scale.setScalar(0.8 + hp * 0.5);
    ringMesh.material.opacity = 0.35 + hp * 0.5;

    const camTarget = new THREE.Vector3(pp.x, 0.45, pp.z);
    const camPos = new THREE.Vector3(pp.x + 0.4, 16.5, pp.z + 14.5);
    camera.position.lerp(camPos, 0.12);
    camera.lookAt(camTarget);

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
      m.position.set(gp.x, 0.35 + Math.sin(state.time * 5 + i) * 0.1, gp.z);
      m.rotation.y += 0.08;
      m.rotation.x = 0.4;
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
      const r = 3 + (i % 5);
      ff.position.set(
        pp.x + Math.cos(a) * r,
        0.55 + Math.sin(a * 1.7) * 0.85,
        pp.z + Math.sin(a * 0.9) * r,
      );
      ff.material.emissiveIntensity = 1.3 + Math.sin(state.time * 4 + i) * 0.9;
    }

    for (let i = 0; i < mistPuffs.length; i++) {
      const m = mistPuffs[i];
      m.position.x += Math.sin(state.time * 0.2 + i) * 0.01;
      m.position.z += Math.cos(state.time * 0.17 + i) * 0.008;
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
      const color = w.kind === "nuke" ? 0x3b82f6 : 0x22c55e;
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
