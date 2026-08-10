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
  let glowSprite;
  let ready = false;
  let groundTexture = null;
  let forestRoot = null;
  let emberPool = [];
  let particlePool = [];

  const enemyPool = [];
  const spawnerPool = [];
  const rocketPool = [];
  const rocketPickupPool = [];
  const gemPool = [];
  const bulletPool = [];
  const pickupPool = [];
  const grenadePool = [];
  const crateHintPool = [];
  const orbitSparkPool = [];
  const shockwavePool = [];

  const SPAWNER_TEX = [null, null, null, null, null];
  const SPAWNER_TEX_LOADING = [false, false, false, false, false];
  let rocketPickupTex = null;
  let rocketPickupLoading = false;
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
    grad.addColorStop(0, "rgba(200,250,255,0.95)");
    grad.addColorStop(0.35, "rgba(60,200,220,0.35)");
    grad.addColorStop(1, "rgba(20,140,160,0)");
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

  /** Rich top-down forest floor atlas — soil, stone, roots, moss, leaves, paving. */
  function makeForestFloorTexture() {
    const size = 1024;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const g = c.getContext("2d");

    // Dark loamy soil base
    g.fillStyle = "#1e241c";
    g.fillRect(0, 0, size, size);

    // Layered soil mottling
    for (let i = 0; i < 9000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 2 + Math.random() * 14;
      const shade = 28 + Math.floor(Math.random() * 38);
      const green = 34 + Math.floor(Math.random() * 42);
      g.fillStyle = `rgba(${shade + 10}, ${green}, ${shade}, ${0.18 + Math.random() * 0.38})`;
      g.beginPath();
      g.ellipse(x, y, r, r * (0.45 + Math.random() * 0.7), Math.random() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }

    // Embedded stones (flat, in-ground look)
    for (let i = 0; i < 160; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 4 + Math.random() * 18;
      const s = 42 + Math.floor(Math.random() * 50);
      const stone = g.createRadialGradient(x - r * 0.15, y - r * 0.15, 0.5, x, y, r);
      stone.addColorStop(0, `rgba(${s + 22}, ${s + 18}, ${s + 10}, 0.7)`);
      stone.addColorStop(0.45, `rgba(${s}, ${s - 2}, ${s - 8}, 0.5)`);
      stone.addColorStop(1, "rgba(30,32,28,0)");
      g.fillStyle = stone;
      g.beginPath();
      g.ellipse(x, y, r, r * (0.55 + Math.random() * 0.35), Math.random() * Math.PI, 0, Math.PI * 2);
      g.fill();
      // soft rim shadow under stone
      g.fillStyle = "rgba(10,12,8,0.18)";
      g.beginPath();
      g.ellipse(x + 1, y + 1.5, r * 0.9, r * 0.45, 0, 0, Math.PI * 2);
      g.fill();
    }

    // Exposed roots
    g.lineCap = "round";
    g.lineJoin = "round";
    for (let i = 0; i < 90; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const len = 40 + Math.random() * 120;
      const ang = Math.random() * Math.PI * 2;
      g.strokeStyle = `rgba(${38 + Math.random() * 28}, ${28 + Math.random() * 18}, ${16 + Math.random() * 14}, ${0.35 + Math.random() * 0.4})`;
      g.lineWidth = 2 + Math.random() * 4.5;
      g.beginPath();
      g.moveTo(x, y);
      const mx = x + Math.cos(ang + 0.35) * len * 0.5;
      const my = y + Math.sin(ang + 0.35) * len * 0.5;
      g.quadraticCurveTo(mx, my, x + Math.cos(ang) * len, y + Math.sin(ang) * len);
      g.stroke();
      // thin branchlets
      if (Math.random() > 0.45) {
        g.lineWidth = 1 + Math.random() * 2;
        g.beginPath();
        g.moveTo(mx, my);
        g.quadraticCurveTo(
          mx + Math.cos(ang + 1.1) * 28,
          my + Math.sin(ang + 1.1) * 28,
          mx + Math.cos(ang + 1.2) * 48,
          my + Math.sin(ang + 1.2) * 48,
        );
        g.stroke();
      }
    }

    // Moss patches
    for (let i = 0; i < 120; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 10 + Math.random() * 36;
      const moss = g.createRadialGradient(x, y, 1, x, y, r);
      moss.addColorStop(0, `rgba(${40 + Math.random() * 30}, ${70 + Math.random() * 50}, ${36 + Math.random() * 28}, 0.45)`);
      moss.addColorStop(0.55, `rgba(36, 58, 34, 0.22)`);
      moss.addColorStop(1, "rgba(30,40,28,0)");
      g.fillStyle = moss;
      g.beginPath();
      g.ellipse(x, y, r, r * (0.6 + Math.random() * 0.4), Math.random() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }

    // Leaf litter
    for (let i = 0; i < 2200; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const w = 1.5 + Math.random() * 4;
      const h = 0.8 + Math.random() * 2.2;
      g.save();
      g.translate(x, y);
      g.rotate(Math.random() * Math.PI);
      const warm = Math.random() > 0.55;
      g.fillStyle = warm
        ? `rgba(${70 + Math.random() * 50}, ${48 + Math.random() * 30}, ${22 + Math.random() * 18}, ${0.28 + Math.random() * 0.35})`
        : `rgba(${34 + Math.random() * 30}, ${55 + Math.random() * 40}, ${28 + Math.random() * 22}, ${0.22 + Math.random() * 0.3})`;
      g.beginPath();
      g.ellipse(0, 0, w, h, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }

    // Broken paving / path remnants (subtle stone rectangles)
    for (let i = 0; i < 28; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const w = 18 + Math.random() * 40;
      const h = 12 + Math.random() * 28;
      g.save();
      g.translate(x, y);
      g.rotate((Math.random() - 0.5) * 0.5);
      g.fillStyle = `rgba(${48 + Math.random() * 28}, ${46 + Math.random() * 24}, ${40 + Math.random() * 20}, ${0.22 + Math.random() * 0.28})`;
      g.fillRect(-w / 2, -h / 2, w, h);
      g.strokeStyle = "rgba(20,22,18,0.25)";
      g.lineWidth = 1;
      g.strokeRect(-w / 2, -h / 2, w, h);
      // crack
      if (Math.random() > 0.4) {
        g.strokeStyle = "rgba(12,14,10,0.35)";
        g.beginPath();
        g.moveTo(-w * 0.3, -h * 0.2);
        g.lineTo(w * 0.1, h * 0.25);
        g.stroke();
      }
      g.restore();
    }

    // Soft path ribbons
    for (let i = 0; i < 6; i++) {
      const y0 = Math.random() * size;
      g.strokeStyle = `rgba(55, 48, 36, ${0.12 + Math.random() * 0.12})`;
      g.lineWidth = 18 + Math.random() * 28;
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(0, y0);
      g.bezierCurveTo(
        size * 0.3,
        y0 + (Math.random() - 0.5) * 80,
        size * 0.65,
        y0 + (Math.random() - 0.5) * 100,
        size,
        y0 + (Math.random() - 0.5) * 60,
      );
      g.stroke();
    }

    // Debris flecks
    for (let i = 0; i < 1400; i++) {
      g.fillStyle = `rgba(${40 + Math.random() * 45}, ${36 + Math.random() * 40}, ${28 + Math.random() * 30}, 0.35)`;
      g.fillRect(Math.random() * size, Math.random() * size, 1 + Math.random() * 2.5, 1 + Math.random() * 2);
    }

    // Damp hollows
    for (let i = 0; i < 50; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 14 + Math.random() * 40;
      const damp = g.createRadialGradient(x, y, 2, x, y, r);
      damp.addColorStop(0, "rgba(16,24,20,0.5)");
      damp.addColorStop(0.55, "rgba(22,30,24,0.22)");
      damp.addColorStop(1, "rgba(28,34,28,0)");
      g.fillStyle = damp;
      g.beginPath();
      g.ellipse(x, y, r, r * 0.6, Math.random() * Math.PI, 0, Math.PI * 2);
      g.fill();
    }

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(5, 5);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  function makeDecalTexture(kind) {
    const size = 128;
    const c = document.createElement("canvas");
    c.width = size;
    c.height = size;
    const g = c.getContext("2d");
    g.clearRect(0, 0, size, size);
    const cx = 64;
    const cy = 64;

    if (kind === "moss") {
      const grad = g.createRadialGradient(cx, cy, 4, cx, cy, 58);
      grad.addColorStop(0, "rgba(52, 90, 48, 0.7)");
      grad.addColorStop(0.5, "rgba(36, 64, 40, 0.4)");
      grad.addColorStop(1, "rgba(20, 30, 22, 0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, size, size);
      for (let i = 0; i < 80; i++) {
        g.fillStyle = `rgba(${40 + Math.random() * 40}, ${70 + Math.random() * 50}, ${30 + Math.random() * 30}, 0.35)`;
        g.beginPath();
        g.arc(20 + Math.random() * 88, 20 + Math.random() * 88, 1 + Math.random() * 3, 0, Math.PI * 2);
        g.fill();
      }
    } else if (kind === "stone") {
      const grad = g.createRadialGradient(cx, cy, 2, cx, cy, 54);
      grad.addColorStop(0, "rgba(90, 88, 78, 0.75)");
      grad.addColorStop(0.45, "rgba(60, 58, 50, 0.45)");
      grad.addColorStop(1, "rgba(30, 30, 26, 0)");
      g.fillStyle = grad;
      g.beginPath();
      g.ellipse(cx, cy, 42, 30, 0.3, 0, Math.PI * 2);
      g.fill();
    } else if (kind === "leaves") {
      const grad = g.createRadialGradient(cx, cy, 2, cx, cy, 58);
      grad.addColorStop(0, "rgba(70, 52, 28, 0.15)");
      grad.addColorStop(1, "rgba(40, 30, 18, 0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, size, size);
      for (let i = 0; i < 40; i++) {
        g.save();
        g.translate(24 + Math.random() * 80, 24 + Math.random() * 80);
        g.rotate(Math.random() * Math.PI);
        g.fillStyle = `rgba(${80 + Math.random() * 50}, ${50 + Math.random() * 30}, ${20 + Math.random() * 20}, 0.55)`;
        g.beginPath();
        g.ellipse(0, 0, 5 + Math.random() * 5, 2 + Math.random() * 2, 0, 0, Math.PI * 2);
        g.fill();
        g.restore();
      }
    } else if (kind === "path") {
      const grad = g.createRadialGradient(cx, cy, 4, cx, cy, 60);
      grad.addColorStop(0, "rgba(68, 58, 42, 0.55)");
      grad.addColorStop(0.55, "rgba(48, 42, 32, 0.28)");
      grad.addColorStop(1, "rgba(30, 28, 22, 0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, size, size);
      g.fillStyle = "rgba(55, 50, 42, 0.35)";
      g.fillRect(28, 40, 72, 48);
      g.strokeStyle = "rgba(20, 18, 14, 0.3)";
      g.strokeRect(28, 40, 72, 48);
    } else {
      // debris / ash
      const grad = g.createRadialGradient(cx, cy, 2, cx, cy, 50);
      grad.addColorStop(0, "rgba(50, 44, 34, 0.4)");
      grad.addColorStop(1, "rgba(30, 28, 22, 0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, size, size);
      for (let i = 0; i < 30; i++) {
        g.fillStyle = `rgba(${40 + Math.random() * 40}, ${36 + Math.random() * 30}, ${28 + Math.random() * 20}, 0.5)`;
        g.fillRect(30 + Math.random() * 68, 30 + Math.random() * 68, 1 + Math.random() * 2, 1 + Math.random() * 2);
      }
    }

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }

  function makeMarshTexture() {
    return makeForestFloorTexture();
  }

  /** Resolve game asset path for game/ vs root lantern.html. */
  function gameAssetSrc(filename) {
    const path = (location.pathname || "").replace(/\\/g, "/");
    if (path.includes("/game") && !/lantern\.html$/i.test(path)) {
      return "assets/" + filename;
    }
    return "game/assets/" + filename;
  }

  function forestFloorSrc() {
    return gameAssetSrc("forest-floor.webp");
  }

  /**
   * Player visual forms — Level 0 base is the Ancient Relic PNG.
   * Later levels can add new form entries + assets without rewriting the player system.
   */
  const PLAYER_VISUAL_FORMS = {
    0: {
      id: 0,
      file: "relic-orb.png",
      // Round cyan-gold orb — sized for chase camera readability.
      height: 1.49,
      // Glow core sits at image center.
      coreY: 0.02,
      // Keeps the orb hovering above the forest floor.
      hoverY: 1.55,
      // Art is already level; facing rotation is applied at runtime.
      levelRollDeg: 0,
    },
  };

  function playerVisualFormForLevel(_level) {
    // Always base form for now. Future: map level bands → form ids.
    return PLAYER_VISUAL_FORMS[0];
  }

  const GROUND_TILE_REPEAT = 8;
  const GROUND_PLANE_SIZE = 90;

  function configureGroundTexture(tex) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(GROUND_TILE_REPEAT, GROUND_TILE_REPEAT);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    tex.needsUpdate = true;
    return tex;
  }

  /** Load primary forest-floor image; fall back to procedural atlas. */
  function loadForestFloorTexture(onReady) {
    const loader = new THREE.TextureLoader();
    const primary = forestFloorSrc();
    const fallbackPng = primary.replace(/\.webp$/i, ".png");

    function apply(tex) {
      configureGroundTexture(tex);
      onReady(tex);
    }

    loader.load(
      primary,
      apply,
      undefined,
      () => {
        loader.load(
          fallbackPng,
          apply,
          undefined,
          () => {
            console.warn("Forest floor asset missing; using procedural fallback");
            apply(makeForestFloorTexture());
          },
        );
      },
    );
  }

  function loadPlayerFormTexture(group, form) {
    const billboard = group.getObjectByName("playerSprite");
    if (!billboard || !billboard.material) return;
    const loader = new THREE.TextureLoader();
    loader.load(
      gameAssetSrc(form.file),
      (tex) => {
        if ("colorSpace" in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
        else if ("encoding" in tex && THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
        tex.needsUpdate = true;
        if (billboard.material.map && billboard.material.map.dispose) {
          try {
            billboard.material.map.dispose();
          } catch (_) {
            /* ignore */
          }
        }
        billboard.material.map = tex;
        // Orient the exact PNG so it reads level; does not alter size/position.
        tex.center.set(0.5, 0.5);
        tex.rotation = ((form.levelRollDeg || 0) * Math.PI) / 180;
        billboard.material.needsUpdate = true;
        const img = tex.image;
        if (img && img.width && img.height) {
          const h = form.height;
          billboard.scale.set(h * (img.width / img.height), h, 1);
        }
        group.userData.formId = form.id;
        group.userData.hoverY = form.hoverY;
        group.userData.coreY = form.coreY;
        group.userData.levelRollDeg = form.levelRollDeg || 0;
        const core = group.getObjectByName("flame");
        if (core) core.position.y = form.coreY;
      },
      undefined,
      (err) => {
        console.error("Failed to load player visual", form.file, err);
      },
    );
  }

  /** Keep the player orb facing the camera, then turn it toward travel direction. */
  function orientPlayerBillboard(facingRad = 0) {
    if (!lanternGroup || !camera) return;
    const billboard = lanternGroup.getObjectByName("playerSprite");
    if (!billboard) return;
    // Match camera, yaw 180° so the plane faces the lens, then face travel.
    billboard.quaternion.copy(camera.quaternion);
    billboard.rotateY(Math.PI);
    // Game facing: 0 = +X (right), π/2 = +Y (down on the playfield).
    billboard.rotateZ(-facingRad + Math.PI / 2);
  }

  /**
   * Floating relic-orb billboard — Level 0 base player visual.
   * Camera-facing plane so the PNG stays readable under the chase camera.
   */
  function createPlayerVisual() {
    const form = PLAYER_VISUAL_FORMS[0];
    const group = new THREE.Group();
    group.userData.baseScale = 1;
    group.userData.useSprite = true;
    group.userData.formId = form.id;
    group.userData.hoverY = form.hoverY;
    group.userData.coreY = form.coreY;

    const mat = new THREE.MeshBasicMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: true,
      opacity: 1,
      side: THREE.DoubleSide,
      fog: false,
      alphaTest: 0.04,
    });
    if ("toneMapped" in mat) mat.toneMapped = false;
    const billboard = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    billboard.name = "playerSprite";
    billboard.renderOrder = 3;
    const aspect = 1;
    billboard.scale.set(form.height * aspect, form.height, 1);
    group.add(billboard);

    // Light anchor at the glowing orange core (near image center)
    const core = new THREE.Object3D();
    core.name = "flame";
    core.position.y = form.coreY;
    group.add(core);

    loadPlayerFormTexture(group, form);
    return group;
  }

  // Back-compat alias used by init
  function createLanternModel() {
    return createPlayerVisual();
  }

  /** Apply visual form for level. Base Ancient Relic; tier art assets TBD. */
  function applyLanternEvolution(level, full = false, _timeSec = 0) {
    const evo =
      window.LanternForm && typeof window.LanternForm.of === "function"
        ? window.LanternForm.of(full ? 99 : level || 1)
        : { stage: 0, scale: 1, light: 1, name: "Ancient Relic" };
    if (!lanternGroup) return evo;

    if (lanternGroup.userData.useSprite) {
      const form = playerVisualFormForLevel(full ? 99 : level);
      if (lanternGroup.userData.formId !== form.id) {
        loadPlayerFormTexture(lanternGroup, form);
      }
      lanternGroup.scale.setScalar(1);
      // Strip any leftover procedural attachment meshes from older builds.
      const stale = lanternGroup.getObjectByName("evoAttachments");
      if (stale && stale.parent) stale.parent.remove(stale);
      return evo;
    }
    return evo;
  }

  // Shared enemy sprite billboards (art PNGs) — cheap + readable on phones.
  const ENEMY_SPRITE = {
    plane: null,
    tex: { wisp: null, armor: null },
    loading: { wisp: false, armor: false },
  };

  function enemySpriteKey(kind) {
    return kind === "brute" || kind === "boss" ? "armor" : "wisp";
  }

  function enemySpriteHeight(kind) {
    if (kind === "boss") return 3.35;
    if (kind === "brute") return 2.45;
    if (kind === "dart") return 1.55;
    return 1.85;
  }

  function enemySpriteFile(key) {
    return key === "armor" ? "enemy-armor.png" : "enemy-wisp.png";
  }

  function ensureEnemySpriteTex(key) {
    if (ENEMY_SPRITE.tex[key] || ENEMY_SPRITE.loading[key]) return;
    ENEMY_SPRITE.loading[key] = true;
    const loader = new THREE.TextureLoader();
    loader.load(
      gameAssetSrc(enemySpriteFile(key)),
      (tex) => {
        if ("colorSpace" in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
        else if ("encoding" in tex && THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
        tex.needsUpdate = true;
        tex.userData.shared = true;
        ENEMY_SPRITE.tex[key] = tex;
        ENEMY_SPRITE.loading[key] = false;
        // Apply to any billboards waiting on this texture.
        for (let i = 0; i < enemyPool.length; i++) {
          const m = enemyPool[i] && enemyPool[i].mesh;
          const bill = m && m.userData && m.userData.billboard;
          if (!bill || m.userData.spriteKey !== key) continue;
          bill.material.map = tex;
          bill.material.needsUpdate = true;
          const img = tex.image;
          if (img && img.width && img.height) {
            const h = m.userData.spriteH || 1.85;
            bill.userData.baseW = h * (img.width / img.height);
            bill.userData.baseH = h;
            bill.scale.set(bill.userData.baseW, bill.userData.baseH, 1);
          }
        }
      },
      undefined,
      (err) => {
        ENEMY_SPRITE.loading[key] = false;
        console.error("Failed to load enemy sprite", key, err);
      },
    );
  }

  function disposeEnemyMesh(mesh) {
    if (!mesh) return;
    if (mesh.parent) mesh.parent.remove(mesh);
    mesh.traverse((o) => {
      if (o.geometry && !o.geometry.userData.shared) {
        try { o.geometry.dispose(); } catch (_) {}
      }
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) {
          if (m && !m.userData.shared) {
            try {
              if (m.map && !m.map.userData.shared) m.map.dispose();
              m.dispose();
            } catch (_) {}
          }
        }
      }
    });
  }

  /** Camera-facing PNG billboard for wisps (jellyfish) / armored eyes. */
  function createEnemyMesh(kind) {
    if (!ENEMY_SPRITE.plane) {
      ENEMY_SPRITE.plane = new THREE.PlaneGeometry(1, 1);
      ENEMY_SPRITE.plane.userData.shared = true;
    }
    const key = enemySpriteKey(kind);
    const h = enemySpriteHeight(kind);
    ensureEnemySpriteTex(key);

    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({
      map: ENEMY_SPRITE.tex[key] || null,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      fog: false,
      toneMapped: false,
      side: THREE.DoubleSide,
    });
    const billboard = new THREE.Mesh(ENEMY_SPRITE.plane, mat);
    billboard.name = "enemySprite";
    billboard.renderOrder = 2;
    const tex = ENEMY_SPRITE.tex[key];
    const aspect = tex && tex.image && tex.image.width && tex.image.height
      ? tex.image.width / tex.image.height
      : key === "armor" ? 768 / 561 : 1;
    billboard.userData.baseW = h * aspect;
    billboard.userData.baseH = h;
    billboard.scale.set(billboard.userData.baseW, billboard.userData.baseH, 1);
    g.add(billboard);

    g.userData.billboard = billboard;
    g.userData.spriteKey = key;
    g.userData.spriteH = h;
    g.userData.armored = key === "armor";
    g.userData.phase = Math.random() * Math.PI * 2;
    g.userData.arms = null;
    g.visible = false;
    scene.add(g);
    return { kind, mesh: g };
  }

  /** Subtle menacing sway / pulse on the sprite (arms are in the art). */
  function animateEnemyArms(mesh, time, towardX, towardZ) {
    const bill = mesh && mesh.userData && mesh.userData.billboard;
    if (!bill) return;
    const phase = (mesh.userData.phase || 0) + time * (mesh.userData.armored ? 2.1 : 2.7);
    const twitch = Math.sin(phase * 3.4) > 0.92 ? Math.sin(phase * 18) * 0.08 : 0;
    mesh.userData.sway = Math.sin(phase) * 0.06 + twitch;
    mesh.userData.pulse = 1 + Math.sin(phase * 0.85) * 0.04 + Math.abs(twitch) * 0.35;
  }

  function ensureSpawnerTex(faceIdx) {
    const i = Math.max(0, Math.min(4, faceIdx | 0));
    if (SPAWNER_TEX[i] || SPAWNER_TEX_LOADING[i]) return;
    SPAWNER_TEX_LOADING[i] = true;
    const loader = new THREE.TextureLoader();
    loader.load(
      gameAssetSrc("spawner/face-" + (i + 1) + ".png"),
      (tex) => {
        if ("colorSpace" in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
        tex.userData.shared = true;
        SPAWNER_TEX[i] = tex;
        SPAWNER_TEX_LOADING[i] = false;
        for (let n = 0; n < spawnerPool.length; n++) {
          const m = spawnerPool[n];
          const bill = m && m.userData && m.userData.billboard;
          if (!bill || m.userData.face !== i) continue;
          bill.material.map = tex;
          bill.material.needsUpdate = true;
          const img = tex.image;
          if (img && img.width && img.height) {
            const h = m.userData.spriteH || 9.2;
            bill.scale.set(h * (img.width / img.height), h, 1);
          }
        }
      },
      undefined,
      () => {
        SPAWNER_TEX_LOADING[i] = false;
      },
    );
  }

  function createSpawnerMesh() {
    if (!ENEMY_SPRITE.plane) {
      ENEMY_SPRITE.plane = new THREE.PlaneGeometry(1, 1);
      ENEMY_SPRITE.plane.userData.shared = true;
    }
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({
      transparent: true,
      depthWrite: false,
      fog: false,
      toneMapped: false,
      side: THREE.DoubleSide,
    });
    const billboard = new THREE.Mesh(ENEMY_SPRITE.plane, mat);
    billboard.name = "spawnerSprite";
    billboard.renderOrder = 2;
    const h = 9.2;
    billboard.scale.set(h * 1.25, h, 1);
    g.add(billboard);
    g.userData.billboard = billboard;
    g.userData.spriteH = h;
    g.userData.face = 0;
    g.visible = false;
    scene.add(g);
    return g;
  }

  function createRocketMesh() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 1.05, 7),
      new THREE.MeshBasicMaterial({ color: 0xffe08a }),
    );
    body.rotation.x = Math.PI / 2;
    g.add(body);
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.2, 0.75, 6),
      new THREE.MeshBasicMaterial({ color: 0xff6b3a, transparent: true, opacity: 0.95 }),
    );
    flame.rotation.x = -Math.PI / 2;
    flame.position.z = -0.7;
    g.add(flame);
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        color: 0xffb040,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      }),
    );
    glow.scale.set(2.4, 2.4, 1);
    g.add(glow);
    g.userData.body = body;
    g.userData.flame = flame;
    g.userData.glow = glow;
    g.visible = false;
    scene.add(g);
    return g;
  }

  function createRocketPickupMesh() {
    if (!ENEMY_SPRITE.plane) {
      ENEMY_SPRITE.plane = new THREE.PlaneGeometry(1, 1);
      ENEMY_SPRITE.plane.userData.shared = true;
    }
    if (!rocketPickupTex && !rocketPickupLoading) {
      rocketPickupLoading = true;
      const loader = new THREE.TextureLoader();
      loader.load(
        gameAssetSrc("rocket-pickup.png"),
        (tex) => {
          if ("colorSpace" in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
          tex.userData.shared = true;
          rocketPickupTex = tex;
          rocketPickupLoading = false;
          for (let i = 0; i < rocketPickupPool.length; i++) {
            const bill = rocketPickupPool[i] && rocketPickupPool[i].userData.billboard;
            if (bill) {
              bill.material.map = tex;
              bill.material.needsUpdate = true;
            }
          }
        },
        undefined,
        () => {
          rocketPickupLoading = false;
        },
      );
    }
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({
      map: rocketPickupTex,
      transparent: true,
      depthWrite: false,
      fog: false,
      toneMapped: false,
      side: THREE.DoubleSide,
    });
    const billboard = new THREE.Mesh(ENEMY_SPRITE.plane, mat);
    billboard.scale.set(1.2, 1.2, 1);
    g.add(billboard);
    g.userData.billboard = billboard;
    g.visible = false;
    scene.add(g);
    return g;
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

  /** Weapon-crate tint colors — green grenades / red swarm / blue nuke. */
  const CRATE_TINT = {
    grenades: 0xb6f5c0,
    swarm: 0xff9aa8,
    nuke: 0xa8c4ff,
  };
  const CRATE_GLOW = {
    grenades: 0x22c55e,
    swarm: 0xe11d48,
    nuke: 0x3b82f6,
  };

  let crateTexture = null;
  let crateTextureLoading = false;

  function ensureCrateTexture(onReady) {
    if (crateTexture) {
      if (onReady) onReady(crateTexture);
      return crateTexture;
    }
    if (crateTextureLoading) return null;
    crateTextureLoading = true;
    const loader = new THREE.TextureLoader();
    loader.load(
      gameAssetSrc("weapon-crate.png"),
      (tex) => {
        if ("colorSpace" in tex && THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
        else if ("encoding" in tex && THREE.sRGBEncoding) tex.encoding = THREE.sRGBEncoding;
        tex.needsUpdate = true;
        crateTexture = tex;
        crateTextureLoading = false;
        if (onReady) onReady(tex);
        // Apply to any crates waiting for the map
        for (let i = 0; i < pickupPool.length; i++) {
          const bill = pickupPool[i] && pickupPool[i].userData && pickupPool[i].userData.billboard;
          if (bill && bill.material && !bill.material.map) {
            bill.material.map = tex;
            bill.material.needsUpdate = true;
          }
        }
      },
      undefined,
      (err) => {
        crateTextureLoading = false;
        console.error("Failed to load weapon-crate.png", err);
      },
    );
    return null;
  }

  function applyCrateKind(group, kind) {
    const tint = CRATE_TINT[kind] || CRATE_TINT.grenades;
    const glowCol = CRATE_GLOW[kind] || CRATE_GLOW.grenades;
    group.userData.kind = kind;
    const bill = group.userData.billboard;
    if (bill && bill.material) {
      bill.material.color.setHex(tint);
      bill.material.needsUpdate = true;
    }
    for (const key of ["glow", "glowOuter"]) {
      const g = group.userData[key];
      if (g && g.material) {
        g.material.color.setHex(glowCol);
        g.material.needsUpdate = true;
      }
    }
  }

  function createPickupMesh(kind) {
    const group = new THREE.Group();
    const glowCol = CRATE_GLOW[kind] || CRATE_GLOW.grenades;
    const mat = new THREE.MeshBasicMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: true,
      opacity: 1,
      side: THREE.DoubleSide,
      fog: false,
      alphaTest: 0.05,
      color: CRATE_TINT[kind] || CRATE_TINT.grenades,
    });
    if ("toneMapped" in mat) mat.toneMapped = false;
    const billboard = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    billboard.name = "crateSprite";
    billboard.renderOrder = 3;
    billboard.scale.set(1.35, 1.35, 1);
    group.add(billboard);

    // Soft outer power aura
    const glowOuter = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: makeGlowTexture(),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.42,
        color: glowCol,
      }),
    );
    glowOuter.scale.set(3.6, 3.6, 1);
    glowOuter.position.y = 0.08;
    glowOuter.renderOrder = 1;
    group.add(glowOuter);

    // Bright inner core glow
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: makeGlowTexture(),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.85,
        color: glowCol,
      }),
    );
    glow.scale.set(2.4, 2.4, 1);
    glow.position.y = 0.12;
    glow.renderOrder = 2;
    group.add(glow);

    group.visible = false;
    group.userData.kind = kind;
    group.userData.billboard = billboard;
    group.userData.glow = glow;
    group.userData.glowOuter = glowOuter;
    group.userData.isCrateSprite = true;

    ensureCrateTexture((tex) => {
      billboard.material.map = tex;
      billboard.material.needsUpdate = true;
    });

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
        color: 0x86efac,
        emissive: 0x22c55e,
        emissiveIntensity: 3.4,
        roughness: 0.3,
        metalness: 0.2,
      }),
    );
    group.add(body);
    const pin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 0.18, 6),
      new THREE.MeshStandardMaterial({
        color: 0x14532d,
        emissive: 0x16a34a,
        emissiveIntensity: 1.2,
        metalness: 0.55,
        roughness: 0.4,
      }),
    );
    pin.position.y = 0.22;
    group.add(pin);
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: makeGlowTexture(),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.85,
        color: 0x22c55e,
      }),
    );
    glow.scale.set(1.35, 1.35, 1);
    group.add(glow);
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
    group.userData = { body, shadow, glow };
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

  /**
   * Flat forest decals only — no tall/chunky geometry that can obscure the lantern.
   * Kept out of a generous clear radius so the playable light ring stays readable.
   */
  function buildForestProps() {
    forestRoot = new THREE.Group();
    scene.add(forestRoot);

    const kinds = ["moss", "stone", "leaves", "path", "debris"];
    const textures = {};
    for (let k = 0; k < kinds.length; k++) {
      textures[kinds[k]] = makeDecalTexture(kinds[k]);
    }

    const CLEAR = 280; // world units — generous lantern-readable zone
    const plane = new THREE.PlaneGeometry(1, 1);

    function placeClear(wx, wy, minDist) {
      return Math.hypot(wx, wy) >= minDist;
    }

    for (let i = 0; i < 220; i++) {
      const wx = (hash2(i, 1) - 0.5) * 4200;
      const wy = (hash2(i, 2) - 0.5) * 4200;
      if (!placeClear(wx, wy, CLEAR)) continue;

      const kind = kinds[Math.floor(hash2(i, 3) * kinds.length) % kinds.length];
      const mat = new THREE.MeshBasicMaterial({
        map: textures[kind],
        transparent: true,
        depthWrite: false,
        opacity: 0.72 + hash2(i, 4) * 0.22,
        side: THREE.DoubleSide,
      });
      const decal = new THREE.Mesh(plane, mat);
      const scale = 0.9 + hash2(i, 5) * 2.4;
      decal.rotation.x = -Math.PI / 2;
      decal.rotation.z = hash2(i, 6) * Math.PI * 2;
      // Extremely low profile — never tall enough to cover the lantern
      decal.position.set(wx * WORLD_SCALE, 0.02 + hash2(i, 7) * 0.03, wy * WORLD_SCALE);
      decal.scale.set(scale * (0.7 + hash2(i, 8) * 0.8), scale, 1);
      forestRoot.add(decal);
    }

    // A few flatter root ribbons as thin discs (still ground-level)
    for (let i = 0; i < 40; i++) {
      const wx = (hash2(i, 20) - 0.5) * 4000;
      const wy = (hash2(i, 21) - 0.5) * 4000;
      if (!placeClear(wx, wy, CLEAR + 40)) continue;
      const mat = new THREE.MeshBasicMaterial({
        color: 0x3a2818,
        transparent: true,
        opacity: 0.35 + hash2(i, 22) * 0.25,
        depthWrite: false,
      });
      const ribbon = new THREE.Mesh(new THREE.PlaneGeometry(1.8 + hash2(i, 23) * 2.2, 0.18 + hash2(i, 24) * 0.2), mat);
      ribbon.rotation.x = -Math.PI / 2;
      ribbon.rotation.z = hash2(i, 25) * Math.PI;
      ribbon.position.set(wx * WORLD_SCALE, 0.025, wy * WORLD_SCALE);
      forestRoot.add(ribbon);
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

    // Dim fill — floor detail comes from the lantern, not ambient wash
    hemi = new THREE.HemisphereLight(0x4a5c50, 0x0a0806, 0.18);
    scene.add(hemi);
    ambient = new THREE.AmbientLight(0x141c16, 0.08);
    scene.add(ambient);

    rimLight = new THREE.DirectionalLight(0x3a4a40, 0.1);
    rimLight.position.set(-12, 18, -8);
    rimLight.castShadow = false;
    scene.add(rimLight);

    // Flat scrolling forest floor — subtle ripples only, no hill geometry
    const groundGeo = new THREE.PlaneGeometry(GROUND_PLANE_SIZE, GROUND_PLANE_SIZE, 24, 24);
    const pos = groundGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const ripples =
        Math.sin(x * 0.4) * Math.cos(y * 0.35) * 0.04 +
        Math.sin(x * 1.2 + y * 0.6) * 0.015;
      pos.setZ(i, ripples);
    }
    groundGeo.computeVertexNormals();

    // Start with procedural placeholder; swap to photo texture when loaded
    groundTexture = configureGroundTexture(makeForestFloorTexture());
    const groundMat = new THREE.MeshLambertMaterial({
      map: groundTexture,
      color: 0xffffff,
    });
    ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    loadForestFloorTexture((tex) => {
      groundTexture = tex;
      if (ground && ground.material) {
        ground.material.map = tex;
        ground.material.needsUpdate = true;
      }
    });

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

    // Soft ground mist as flat sprites — never solid spheres that read as props
    const mistMap = makeGlowTexture();
    for (let i = 0; i < 12; i++) {
      const mist = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: mistMap,
          color: 0x9aab98,
          transparent: true,
          opacity: 0.08,
          depthWrite: false,
          blending: THREE.NormalBlending,
        }),
      );
      mist.userData.ox = (Math.random() - 0.5) * 22;
      mist.userData.oz = (Math.random() - 0.5) * 22;
      mist.userData.phase = Math.random() * Math.PI * 2;
      const s = 2.8 + Math.random() * 2.4;
      mist.scale.set(s, s * 0.45, 1);
      mist.position.set(mist.userData.ox, 0.35 + Math.random() * 0.25, mist.userData.oz);
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

    lanternGroup = createPlayerVisual();
    scene.add(lanternGroup);

    // Warm lantern as the dominant light — soft decay, wide enough to read the floor
    lanternLight = new THREE.PointLight(0x3ec6d8, 110, 36, 1.25);
    // Shadows are expensive/unreliable on software WebGL; keep them off for stability
    lanternLight.castShadow = false;
    scene.add(lanternLight);

    flameLight = new THREE.PointLight(0x9cf0ff, 22, 11, 1.9);
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
      // Keep UVs world-locked while the plane follows the lantern
      const k = GROUND_TILE_REPEAT / GROUND_PLANE_SIZE;
      groundTexture.offset.set(pp.x * k, pp.z * k);
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
      m.position.y = 0.28 + Math.sin(time * 0.4 + i) * 0.06;
      if (m.material) {
        m.material.opacity = titleMode ? 0.12 : 0.06 + Math.sin(time + i) * 0.02;
      }
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

    // Mid-run shop (after a round) keeps the battlefield; title shop uses idle scene.
    const shopIdle = mode === "shop" && !(state && state.shopReturnMode);
    if (!state || mode === "title" || mode === "tutorial" || shopIdle) {
      const t = now * 0.00022;
      // Heroic angle for the floating Ancient Relic behind the title UI
      camera.position.set(Math.sin(t) * 4.5, 7.2, 8.8 + Math.cos(t) * 1.8);
      camera.lookAt(0, 0.85, 0);
      applyLanternEvolution(1, false);
      const origin = { x: 0, y: 0, z: 0 };
      followGround(origin);
      const hover = lanternGroup.userData.hoverY || 1.72;
      const bob = Math.sin(now * 0.0025) * 0.05;
      const coreY = lanternGroup.userData.coreY || 0.02;
      lanternGroup.position.set(0, hover + bob, 0);
      lanternGroup.rotation.set(0, 0, 0);
      orientPlayerBillboard(0);
      lanternLight.position.set(0, hover + bob + coreY, 0);
      flameLight.position.set(0, hover + bob + coreY, 0);
      glowSprite.position.set(0, hover + bob + coreY, 0);
      glowSprite.scale.setScalar(3.4);
      lanternLight.color.setHex(0x3ec6d8);
      flameLight.color.setHex(0x9cf0ff);
      if (glowSprite.material) glowSprite.material.color.setHex(0x3ec6d8);
      lanternLight.intensity = 70 + Math.sin(now * 0.018) * 6;
      lanternLight.distance = 28;
      flameLight.intensity = 18;
      glowSprite.material.opacity = 0.45 + Math.sin(now * 0.015) * 0.08;
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
      renderer.render(scene, camera);
      return;
    }

    const p = state.player;
    const evo = applyLanternEvolution(p.level, false, state.time || 0);
    const pp = worldTo3D(p.x, p.y);
    followGround(pp);
    const bob = Math.sin(state.time * 6) * 0.04;
    const hover = (lanternGroup.userData.hoverY || 1.72) + bob;
    const coreY = lanternGroup.userData.coreY || 0.02;
    lanternGroup.position.set(pp.x, hover, pp.z);
    lanternGroup.rotation.set(0, 0, 0);
    const facing = p.facingSmooth != null ? p.facingSmooth : p.facing || 0;
    orientPlayerBillboard(facing);

    const flick = 0.88 + Math.sin(state.time * 18) * 0.08 + Math.sin(state.time * 41) * 0.03;
    const lightMul = evo.light != null ? evo.light : 1;
    // Weapon-armed tint: swarm red / grenades green / nuke blue / default cyan
    const armed =
      p.swarmTimer > 0
        ? "swarm"
        : p.equippedWeapon === "grenades" || p.equippedWeapon === "nuke" || p.equippedWeapon === "swarm"
          ? p.equippedWeapon
          : null;
    const glowHex =
      armed === "swarm"
        ? 0xe11d48
        : armed === "grenades"
          ? 0x22c55e
          : armed === "nuke"
            ? 0x3b82f6
            : 0x3ec6d8;
    const glowSoft =
      armed === "swarm"
        ? 0xff6b8a
        : armed === "grenades"
          ? 0x86efac
          : armed === "nuke"
            ? 0x93c5fd
            : 0x9cf0ff;
    const armedBoost = armed ? 1.45 : 1;
    const coreWorldY = hover + coreY;
    lanternLight.position.set(pp.x, coreWorldY, pp.z);
    lanternLight.color.setHex(glowHex);
    lanternLight.intensity = 88 * flick * lightMul * armedBoost;
    lanternLight.distance = (30 + (evo.stage || 0) * 1.8) * (armed ? 1.15 : 1);
    flameLight.position.set(pp.x, coreWorldY, pp.z);
    flameLight.color.setHex(glowSoft);
    flameLight.intensity = 20 * flick * lightMul * armedBoost;
    glowSprite.position.set(pp.x, coreWorldY, pp.z);
    if (glowSprite.material) {
      glowSprite.material.color.setHex(glowHex);
      glowSprite.material.opacity = (0.16 + flick * 0.1) * lightMul * (armed ? 1.8 : 1);
    }
    glowSprite.scale.setScalar((1.8 + flick * 0.35) * (armed ? 1.55 : 1));

    const hp = Math.max(0.05, p.hp / p.maxHp);

    const camTarget = new THREE.Vector3(pp.x, 0.45, pp.z);
    const camPos = new THREE.Vector3(pp.x + 0.4, 16.5, pp.z + 14.5);
    camera.position.lerp(camPos, 0.12);
    camera.lookAt(camTarget);

    syncAtmosphere(pp, state.time, false);

    const spawners = state.spawners || [];
    ensurePool(spawnerPool, spawners.length, createSpawnerMesh);
    while (spawnerPool.length > Math.max(spawners.length, 3)) {
      const extra = spawnerPool.pop();
      disposeEnemyMesh(extra);
    }
    for (let i = 0; i < spawnerPool.length; i++) {
      const m = spawnerPool[i];
      const s = spawners[i];
      if (!s) {
        m.visible = false;
        continue;
      }
      const face = Math.max(0, Math.min(4, s.face | 0));
      ensureSpawnerTex(face);
      if (m.userData.face !== face) {
        m.userData.face = face;
        const tex = SPAWNER_TEX[face];
        if (tex && m.userData.billboard) {
          m.userData.billboard.material.map = tex;
          m.userData.billboard.material.needsUpdate = true;
          const img = tex.image;
          if (img && img.width && img.height) {
            const h = m.userData.spriteH || 9.2;
            m.userData.billboard.scale.set(h * (img.width / img.height), h, 1);
          }
        }
      }
      const sp = worldTo3D(s.x, s.y);
      const bob = Math.sin(s.pulse || state.time * 2) * 0.12;
      m.visible = true;
      // Lift the billboard so tentacle tips clear the forest floor.
      m.position.set(sp.x, 2.55 + bob, sp.z);
      const bill = m.userData.billboard;
      if (bill && camera) {
        bill.quaternion.copy(camera.quaternion);
        bill.rotateY(Math.PI);
        const hit = s.hitFlash && s.hitFlash > 0;
        m.scale.setScalar(hit ? 1.06 : 1);
        if (bill.material) bill.material.opacity = hit ? 1 : 0.98;
      }
    }

    const rockets = state.rockets || [];
    ensurePool(rocketPool, rockets.length, createRocketMesh);
    while (rocketPool.length > Math.max(rockets.length, 4)) {
      const extra = rocketPool.pop();
      disposeEnemyMesh(extra);
    }
    for (let i = 0; i < rocketPool.length; i++) {
      const m = rocketPool[i];
      const r = rockets[i];
      if (!r) {
        m.visible = false;
        continue;
      }
      const rp = worldTo3D(r.x, r.y);
      m.visible = true;
      m.position.set(rp.x, 1.05, rp.z);
      const ang = Math.atan2(r.vy || 0, r.vx || 1);
      m.rotation.y = -ang;
      const gscale = 1.15 + Math.min(0.55, (r.glow || 1) * 0.2);
      m.scale.setScalar(gscale);
      if (m.userData.flame && m.userData.flame.material) {
        m.userData.flame.material.opacity = 0.75 + Math.sin(state.time * 30 + i) * 0.2;
      }
      if (m.userData.glow && m.userData.glow.material) {
        m.userData.glow.material.opacity = 0.4 + Math.sin(state.time * 22 + i) * 0.15;
        m.userData.glow.scale.setScalar(2.2 + Math.sin(state.time * 18 + i) * 0.35);
      }
    }

    const rocketPickups = state.rocketPickups || [];
    ensurePool(rocketPickupPool, rocketPickups.length, createRocketPickupMesh);
    while (rocketPickupPool.length > Math.max(rocketPickups.length, 2)) {
      const extra = rocketPickupPool.pop();
      disposeEnemyMesh(extra);
    }
    for (let i = 0; i < rocketPickupPool.length; i++) {
      const m = rocketPickupPool[i];
      const r = rocketPickups[i];
      if (!r) {
        m.visible = false;
        continue;
      }
      const wp = worldTo3D(r.x, r.y);
      const bob = Math.sin((r.pulse || state.time) * 5) * 0.12;
      m.visible = true;
      m.position.set(wp.x, 0.7 + bob, wp.z);
      const bill = m.userData.billboard;
      if (bill && camera) {
        bill.quaternion.copy(camera.quaternion);
        bill.rotateY(Math.PI);
      }
    }

    ensurePool(enemyPool, state.enemies.length, () => createEnemyMesh("wisp"));
    // Trim unused pool slots so dead enemies don't keep GPU objects forever.
    while (enemyPool.length > Math.max(state.enemies.length, 8)) {
      const extra = enemyPool.pop();
      disposeEnemyMesh(extra && extra.mesh);
    }
    const animBudget = state.enemies.length > 28 ? 2 : 1; // animate every Nth when crowded
    for (let i = 0; i < enemyPool.length; i++) {
      const slot = enemyPool[i];
      const e = state.enemies[i];
      if (!e) {
        if (slot && slot.mesh) slot.mesh.visible = false;
        continue;
      }
      if (slot.kind !== e.kind) {
        disposeEnemyMesh(slot.mesh);
        enemyPool[i] = createEnemyMesh(e.kind);
      }
      const m = enemyPool[i].mesh;
      const ep = worldTo3D(e.x, e.y);
      const bounce = Math.sin(e.pulse || state.time * 3) * 0.08;
      m.visible = true;
      m.position.set(ep.x, 0.7 + bounce + (e.kind === "boss" ? 0.35 : 0.1), ep.z);
      m.rotation.set(0, 0, 0);
      const bill = m.userData.billboard;
      if (bill && camera) {
        bill.quaternion.copy(camera.quaternion);
        bill.rotateY(Math.PI);
        bill.rotateZ(m.userData.sway || 0);
        const pulse = m.userData.pulse || 1;
        const bw = bill.userData.baseW || 1;
        const bh = bill.userData.baseH || 1;
        bill.scale.set(bw * pulse, bh * pulse, 1);
      }
      // Skip some pulse updates when the field is crowded.
      if (i % animBudget === (state.time * 10 | 0) % animBudget) {
        animateEnemyArms(m, state.time, pp.x, pp.z);
      }
      const hit = e.hitFlash && e.hitFlash > 0;
      m.scale.setScalar(hit ? 1.12 : 1);
      if (bill && bill.material) {
        bill.material.opacity = hit ? 1 : 0.98;
      }
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
        applyCrateKind(m, w.kind);
      }
      const wp = worldTo3D(w.x, w.y);
      const bob = Math.sin((w.pulse || state.time) * 4) * 0.1;
      const pulse = 0.72 + Math.sin(state.time * 5 + (w.pulse || 0)) * 0.28;
      m.visible = true;
      m.position.set(wp.x, 0.72 + bob, wp.z);
      m.rotation.set(0, 0, 0);
      // Face camera like other billboards; Y-flip so the isometric art reads upright.
      const bill = m.userData.billboard;
      if (bill && camera) {
        bill.quaternion.copy(camera.quaternion);
        bill.rotateY(Math.PI);
      }
      if (m.userData.glow && m.userData.glow.material) {
        m.userData.glow.material.opacity = 0.7 + pulse * 0.3;
        m.userData.glow.scale.setScalar(2.2 + pulse * 0.55);
      }
      if (m.userData.glowOuter && m.userData.glowOuter.material) {
        m.userData.glowOuter.material.opacity = 0.28 + pulse * 0.28;
        m.userData.glowOuter.scale.setScalar(3.2 + pulse * 0.9);
      }
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
      if (m.userData.glow) {
        m.userData.glow.position.y = height;
        const pulse = 0.75 + Math.sin(state.time * 14 + i) * 0.25;
        m.userData.glow.material.opacity = 0.7 + pulse * 0.3;
        m.userData.glow.scale.setScalar(1.15 + pulse * 0.45);
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
      const tint = sw.tint;
      const colors =
        tint === "grenade"
          ? { disc: 0x4ade80, ring: 0x22c55e, outer: 0x16a34a, inner: 0xbbf7d0 }
          : tint === "nuke"
            ? { disc: 0x60a5fa, ring: 0x3b82f6, outer: 0x2563eb, inner: 0xdbeafe }
            : { disc: 0xffc050, ring: 0xffe08a, outer: 0xe07a2f, inner: 0xfff6d0 };
      if (ud.disc) {
        ud.disc.material.color.set(colors.disc);
        ud.disc.material.opacity = 0.2 + 0.5 * alpha;
      }
      if (ud.mesh) {
        ud.mesh.material.color.set(colors.ring);
        ud.mesh.material.opacity = 0.45 + 0.55 * alpha;
      }
      if (ud.outer) {
        ud.outer.material.color.set(colors.outer);
        ud.outer.material.opacity = 0.35 + 0.55 * alpha;
      }
      if (ud.inner) {
        ud.inner.material.color.set(colors.inner);
        ud.inner.material.opacity = 0.4 + 0.55 * alpha;
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
    /** Debug helper — inspect the Level 0 player billboard. */
    debugPlayerVisual: function () {
      if (!lanternGroup) return { ok: false, reason: "no group" };
      const billboard = lanternGroup.getObjectByName("playerSprite");
      const map = billboard && billboard.material && billboard.material.map;
      const img = map && map.image;
      return {
        ok: true,
        useSprite: !!lanternGroup.userData.useSprite,
        formId: lanternGroup.userData.formId,
        hoverY: lanternGroup.userData.hoverY,
        coreY: lanternGroup.userData.coreY,
        groupPos: lanternGroup.position.toArray(),
        groupScale: lanternGroup.scale.toArray(),
        spriteScale: billboard ? billboard.scale.toArray() : null,
        isMesh: !!(billboard && billboard.isMesh),
        hasMap: !!map,
        mapSize: img ? [img.width || img.videoWidth || 0, img.height || img.videoHeight || 0] : null,
        opacity: billboard && billboard.material ? billboard.material.opacity : null,
        visible: billboard ? billboard.visible : null,
        fog: billboard && billboard.material ? billboard.material.fog : null,
        toneMapped: billboard && billboard.material ? billboard.material.toneMapped : null,
      };
    },
  };
})();
