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
  let labelSprite;
  let ringMesh;
  let ready = false;
  let groundTexture = null;

  const enemyPool = [];
  const gemPool = [];
  const bulletPool = [];
  const fireflies = [];

  const brassMat = () =>
    new THREE.MeshPhysicalMaterial({
      color: 0xb8842f,
      metalness: 0.92,
      roughness: 0.28,
      clearcoat: 0.4,
      clearcoatRoughness: 0.3,
    });

  const glassMat = () =>
    new THREE.MeshStandardMaterial({
      color: 0xffd27a,
      metalness: 0.05,
      roughness: 0.15,
      transparent: true,
      opacity: 0.72,
      emissive: 0xffaa33,
      emissiveIntensity: 0.7,
    });

  function makeLabelTexture(text) {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 64;
    const g = c.getContext("2d");
    g.fillStyle = "rgba(0,0,0,0.6)";
    g.fillRect(12, 10, 232, 44);
    g.font = "700 26px Outfit, sans-serif";
    g.fillStyle = "#ffe08a";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, 128, 34);
    const tex = new THREE.CanvasTexture(c);
    tex.needsUpdate = true;
    return tex;
  }

  function createLanternModel() {
    const group = new THREE.Group();

    const handle = new THREE.Mesh(
      new THREE.TorusGeometry(0.18, 0.03, 10, 24, Math.PI),
      brassMat(),
    );
    handle.position.y = 0.72;
    handle.rotation.x = Math.PI;
    group.add(handle);

    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.12, 20), brassMat());
    cap.position.y = 0.55;
    group.add(cap);

    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.42, 20), glassMat());
    glass.position.y = 0.28;
    group.add(glass);

    const flame = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 12, 12),
      new THREE.MeshStandardMaterial({
        color: 0xfff0c8,
        emissive: 0xffb040,
        emissiveIntensity: 3.5,
        roughness: 0.4,
      }),
    );
    flame.position.y = 0.3;
    flame.name = "flame";
    group.add(flame);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.14, 20), brassMat());
    base.position.y = 0.02;
    group.add(base);

    const foot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.2, 0.08, 16),
      new THREE.MeshPhysicalMaterial({
        color: 0x5a3612,
        metalness: 0.7,
        roughness: 0.45,
      }),
    );
    foot.position.y = -0.08;
    group.add(foot);

    // bars
    for (let i = 0; i < 4; i++) {
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.42, 0.03),
        brassMat(),
      );
      const a = (i / 4) * Math.PI * 2;
      bar.position.set(Math.cos(a) * 0.2, 0.28, Math.sin(a) * 0.2);
      group.add(bar);
    }

    group.scale.setScalar(1.8);
    return group;
  }

  function createEnemyMesh(kind) {
    const g = new THREE.Group();
    if (kind === "brute") {
      const body = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.55, 0),
        new THREE.MeshStandardMaterial({
          color: 0x2f4f38,
          roughness: 0.9,
          metalness: 0.05,
        }),
      );
      g.add(body);
      const moss = new THREE.Mesh(
        new THREE.SphereGeometry(0.28, 10, 10),
        new THREE.MeshStandardMaterial({ color: 0x4f7a52, roughness: 1 }),
      );
      moss.position.set(0.15, 0.2, 0.1);
      g.add(moss);
    } else if (kind === "dart") {
      const body = new THREE.Mesh(
        new THREE.ConeGeometry(0.18, 0.7, 8),
        new THREE.MeshStandardMaterial({
          color: 0x7ec8a3,
          roughness: 0.45,
          metalness: 0.15,
          emissive: 0x143226,
          emissiveIntensity: 0.2,
        }),
      );
      body.rotation.x = Math.PI / 2;
      g.add(body);
    } else if (kind === "boss") {
      const body = new THREE.Mesh(
        new THREE.SphereGeometry(0.95, 24, 24),
        new THREE.MeshStandardMaterial({
          color: 0x5a2814,
          roughness: 0.55,
          metalness: 0.2,
          emissive: 0x3a1408,
          emissiveIntensity: 0.35,
        }),
      );
      g.add(body);
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 12, 12),
        new THREE.MeshStandardMaterial({
          color: 0xf0b429,
          emissive: 0xf0b429,
          emissiveIntensity: 2,
        }),
      );
      eye.position.set(0, 0.25, 0.75);
      g.add(eye);
    } else {
      // wisp
      const body = new THREE.Mesh(
        new THREE.SphereGeometry(0.38, 18, 18),
        new THREE.MeshPhysicalMaterial({
          color: 0x86a37a,
          roughness: 0.2,
          transmission: 0.35,
          transparent: true,
          opacity: 0.85,
          emissive: 0x3f6b4f,
          emissiveIntensity: 0.8,
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
        emissiveIntensity: 2.2,
        metalness: 0.4,
        roughness: 0.2,
      }),
    );
    mesh.visible = false;
    scene.add(mesh);
    return mesh;
  }

  function createBulletMesh() {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 10, 10),
      new THREE.MeshStandardMaterial({
        color: 0xfff2c0,
        emissive: 0xffc050,
        emissiveIntensity: 3,
      }),
    );
    mesh.visible = false;
    scene.add(mesh);
    return mesh;
  }

  function ensurePool(pool, need, factory) {
    while (pool.length < need) pool.push(factory());
  }

  function init(container) {
    if (ready || !container) return;

    renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    renderer.domElement.id = "game";
    renderer.domElement.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;";

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070b09);
    scene.fog = new THREE.FogExp2(0x0b1210, 0.045);

    camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      200,
    );
    camera.position.set(0, 18, 16);
    camera.lookAt(0, 0, 0);

    hemi = new THREE.HemisphereLight(0xb7d0c0, 0x1a1208, 0.45);
    scene.add(hemi);
    ambient = new THREE.AmbientLight(0x2a3328, 0.25);
    scene.add(ambient);

    // ground
    const groundGeo = new THREE.PlaneGeometry(120, 120, 64, 64);
    // slight height noise
    const pos = groundGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      pos.setZ(i, Math.sin(x * 0.35) * Math.cos(y * 0.3) * 0.25);
    }
    groundGeo.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x243829,
      roughness: 0.95,
      metalness: 0.02,
    });
    ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // load photo texture if available
    const src =
      document.body.dataset.ground ||
      (location.pathname.includes("/game") ? "../theater.jpg" : "theater.jpg");
    new THREE.TextureLoader().load(
      src,
      (tex) => {
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(8, 8);
        tex.colorSpace = THREE.SRGBColorSpace;
        ground.material.map = tex;
        ground.material.color.set(0xffffff);
        ground.material.needsUpdate = true;
        groundTexture = tex;
      },
      undefined,
      () => {},
    );

    // decorative reeds as thin boxes in a grid near origin
    const reedMat = new THREE.MeshStandardMaterial({
      color: 0x3f6b45,
      roughness: 0.9,
    });
    for (let i = 0; i < 80; i++) {
      const h = 0.8 + Math.random() * 1.4;
      const reed = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, h, 5), reedMat);
      reed.position.set((Math.random() - 0.5) * 40, h / 2, (Math.random() - 0.5) * 40);
      reed.rotation.z = (Math.random() - 0.5) * 0.2;
      reed.castShadow = true;
      scene.add(reed);
    }

    lanternGroup = createLanternModel();
    lanternGroup.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    scene.add(lanternGroup);

    lanternLight = new THREE.PointLight(0xffb347, 40, 28, 2);
    lanternLight.castShadow = true;
    lanternLight.shadow.mapSize.set(1024, 1024);
    scene.add(lanternLight);

    flameLight = new THREE.PointLight(0xffe08a, 8, 8, 2);
    scene.add(flameLight);

    const labelMat = new THREE.SpriteMaterial({
      map: makeLabelTexture("YOUR LANTERN"),
      transparent: true,
      depthTest: false,
    });
    labelSprite = new THREE.Sprite(labelMat);
    labelSprite.scale.set(3.2, 0.8, 1);
    scene.add(labelSprite);

    ringMesh = new THREE.Mesh(
      new THREE.RingGeometry(1.1, 1.25, 48),
      new THREE.MeshBasicMaterial({
        color: 0xf0b429,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
      }),
    );
    ringMesh.rotation.x = -Math.PI / 2;
    scene.add(ringMesh);

    for (let i = 0; i < 40; i++) {
      const ff = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 6, 6),
        new THREE.MeshStandardMaterial({
          color: 0xffd56a,
          emissive: 0xffc040,
          emissiveIntensity: 2,
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
    // game uses x/y in screen-plane pixels; scale down for 3D
    return { x: x * 0.04, y: z, z: y * 0.04 };
  }

  function sync(state, mode) {
    if (!ready) return;

    // idle title camera drift
    if (!state || mode === "title" || mode === "tutorial" || mode === "shop") {
      const t = performance.now() * 0.00025;
      camera.position.set(Math.sin(t) * 10, 14, 12 + Math.cos(t) * 4);
      camera.lookAt(0, 0.5, 0);
      lanternGroup.position.set(0, 0.15, 0);
      lanternLight.position.set(0, 1.2, 0);
      flameLight.position.set(0, 1.0, 0);
      labelSprite.position.set(0, 2.2, 0);
      ringMesh.position.set(0, 0.05, 0);
      const flame = lanternGroup.getObjectByName("flame");
      if (flame) {
        const f = 0.9 + Math.sin(performance.now() * 0.02) * 0.1;
        flame.scale.setScalar(f);
        flame.material.emissiveIntensity = 2.8 + f;
      }
      lanternLight.intensity = 35 + Math.sin(performance.now() * 0.02) * 4;
      // hide pools
      enemyPool.forEach((e) => (e.mesh.visible = false));
      gemPool.forEach((m) => (m.visible = false));
      bulletPool.forEach((m) => (m.visible = false));
      renderer.render(scene, camera);
      return;
    }

    const p = state.player;
    const pp = worldTo3D(p.x, p.y);
    const bob = Math.sin(state.time * 6) * 0.05;
    lanternGroup.position.set(pp.x, 0.15 + bob, pp.z);
    if (p.dashTimer > 0) {
      lanternGroup.rotation.y = p.facing || 0;
      lanternGroup.rotation.z = Math.sin(state.time * 40) * 0.1;
    } else {
      lanternGroup.rotation.z = 0;
      lanternGroup.rotation.y += 0.01;
    }

    const flame = lanternGroup.getObjectByName("flame");
    const flick = 0.88 + Math.sin(state.time * 18) * 0.08;
    if (flame) {
      flame.scale.setScalar(0.9 + flick * 0.25);
      flame.material.emissiveIntensity = 2.5 + flick * 2;
    }
    lanternLight.position.set(pp.x, 1.3 + bob, pp.z);
    lanternLight.intensity = 45 * flick;
    flameLight.position.set(pp.x, 1.05 + bob, pp.z);
    flameLight.intensity = 10 * flick;

    labelSprite.position.set(pp.x, 2.3 + bob, pp.z);
    labelSprite.visible = state.time < 20 || state.time % 8 < 3;
    ringMesh.position.set(pp.x, 0.06, pp.z);
    const hp = Math.max(0.05, p.hp / p.maxHp);
    ringMesh.scale.setScalar(0.8 + hp * 0.5);
    ringMesh.material.opacity = 0.35 + hp * 0.5;

    // camera follow
    const camTarget = new THREE.Vector3(pp.x, 0.4, pp.z);
    const camPos = new THREE.Vector3(pp.x + 0.5, 17, pp.z + 15);
    camera.position.lerp(camPos, 0.12);
    camera.lookAt(camTarget);

    // enemies
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
        const neu = createEnemyMesh(e.kind);
        enemyPool[i] = neu;
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
          o.material.emissiveIntensity = hit ? 2.5 : o.material.userData.baseEmissive || o.material.emissiveIntensity;
        }
      });
    }

    // gems
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

    // bullets
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

    // fireflies around player
    for (let i = 0; i < fireflies.length; i++) {
      const ff = fireflies[i];
      const a = state.time * 0.4 + ff.userData.phase;
      const r = 3 + (i % 5);
      ff.position.set(
        pp.x + Math.cos(a) * r,
        0.6 + Math.sin(a * 1.7) * 0.8,
        pp.z + Math.sin(a * 0.9) * r,
      );
      ff.material.emissiveIntensity = 1.2 + Math.sin(state.time * 4 + i) * 0.8;
    }

    // focus ring color
    if (window.__lanternFocus) {
      ringMesh.material.color.set(0xe07a2f);
    } else {
      ringMesh.material.color.set(0xf0b429);
    }

    renderer.render(scene, camera);
  }

  function hideCanvas2D() {
    const old = document.querySelector("canvas#game:not([data-cgi])");
    // three canvas gets id game; mark it
    if (renderer && renderer.domElement) {
      renderer.domElement.dataset.cgi = "1";
    }
  }

  window.LanternCGI = {
    init: function (el) {
      init(el || document.getElementById("app"));
      hideCanvas2D();
      // hide original 2d canvas if present
      const c2 = document.querySelector("canvas#game:not([data-cgi])");
      if (c2) c2.style.display = "none";
    },
    sync,
    ready: function () {
      return ready;
    },
  };
})();
