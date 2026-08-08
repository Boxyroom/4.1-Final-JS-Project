(() => {
  "use strict";

  const STORAGE_KEY = "lantern-hollow-v1";
  const TAU = Math.PI * 2;

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const ui = {
    title: document.getElementById("title"),
    tutorial: document.getElementById("tutorial"),
    shop: document.getElementById("shop"),
    levelup: document.getElementById("levelup"),
    pause: document.getElementById("pause"),
    gameover: document.getElementById("gameover"),
    hud: document.getElementById("hud"),
    touch: document.getElementById("touch-zone"),
    xpFill: document.getElementById("xp-fill"),
    hudTime: document.getElementById("hud-time"),
    hudHp: document.getElementById("hud-hp"),
    hudKills: document.getElementById("hud-kills"),
    hudLevel: document.getElementById("hud-level"),
    coach: document.getElementById("coach"),
    metaEmbers: document.getElementById("meta-embers"),
    metaBest: document.getElementById("meta-best"),
    metaRuns: document.getElementById("meta-runs"),
    shopEmbers: document.getElementById("shop-embers"),
    shopList: document.getElementById("shop-list"),
    upgradeChoices: document.getElementById("upgrade-choices"),
    overTitle: document.getElementById("over-title"),
    overSummary: document.getElementById("over-summary"),
    overKills: document.getElementById("over-kills"),
    overLevel: document.getElementById("over-level"),
    overEmbers: document.getElementById("over-embers"),
    overUnlocks: document.getElementById("over-unlocks"),
    stick: document.getElementById("stick"),
    stickKnob: document.getElementById("stick-knob"),
    dashBtn: document.getElementById("dash-btn"),
    tutStepLabel: document.getElementById("tut-step-label"),
    tutTitle: document.getElementById("tut-title"),
    tutBody: document.getElementById("tut-body"),
    tutCard: document.getElementById("tut-card"),
    tutBack: document.getElementById("btn-tut-back"),
    tutNext: document.getElementById("btn-tut-next"),
  };

  const TUTORIAL_STEPS = [
    {
      title: "You are the lantern",
      body: "Your job is simple: stay alive as long as possible.",
      card: `
        <p>The glowing circle in the middle is <strong>you</strong>.</p>
        <ul>
          <li><strong>Light</strong> (top bar number) is your health.</li>
          <li>If light hits <strong>0</strong>, the run ends.</li>
          <li>You do <strong>not</strong> click to attack — your lantern shoots by itself.</li>
        </ul>
      `,
    },
    {
      title: "Move",
      body: "Steering is your main job.",
      card: `
        <p><strong>Keyboard:</strong> hold <span class="key">W</span><span class="key">A</span><span class="key">S</span><span class="key">D</span> or the arrow keys.</p>
        <p><strong>Phone / tablet:</strong> drag the left <strong>Move</strong> stick.</p>
        <ul>
          <li>Keep moving so green enemies don’t pile on you.</li>
          <li>There is no jump and no special move stick combo — just direction.</li>
        </ul>
      `,
    },
    {
      title: "What Dash does",
      body: "Dash is a short emergency escape — not an attack.",
      card: `
        <p><strong>Dash</strong> makes you surge forward quickly for a moment.</p>
        <ul>
          <li><strong>Keyboard:</strong> press <span class="key">Space</span> or <span class="key">Shift</span></li>
          <li><strong>Phone:</strong> tap the orange <strong>Dash</strong> button (it says “speed burst”)</li>
          <li>While dashing you are briefly safe from damage</li>
          <li>It needs a short cooldown before you can dash again</li>
        </ul>
        <p>Use it when enemies surround you or a boss charges in.</p>
      `,
    },
    {
      title: "Enemies, XP, and upgrades",
      body: "Green hurts. Gold helps.",
      card: `
        <ul>
          <li><strong>Green blobs</strong> = enemies. Touching them drains your light.</li>
          <li>When they die they drop <strong>gold orbs</strong> (XP).</li>
          <li>Walk over gold orbs to fill the yellow bar at the top.</li>
          <li>When the bar fills, you <strong>level up</strong> and pick 1 upgrade for this run.</li>
        </ul>
      `,
    },
    {
      title: "Pause and Ember shop",
      body: "Two more buttons you’ll use.",
      card: `
        <ul>
          <li><strong>Pause</strong> (top-right button, or <span class="key">P</span> / <span class="key">Esc</span>) freezes the game and shows a control reminder.</li>
          <li><strong>Ember shop</strong> (main menu) spends embers you earn after runs.</li>
          <li>Shop upgrades are <strong>permanent</strong> on this device.</li>
          <li>Level-up upgrades only last for the current run.</li>
        </ul>
      `,
    },
    {
      title: "You’re ready",
      body: "Start a run when you feel good about the controls.",
      card: `
        <ul>
          <li>Move with WASD / stick</li>
          <li>Dash with Space / orange button to escape</li>
          <li>Let the lantern auto-attack</li>
          <li>Collect gold XP and pick upgrades</li>
          <li>Don’t let light hit 0</li>
        </ul>
        <p>Next screen: press <strong>Start run</strong>.</p>
      `,
    },
  ];

  let tutorialIndex = 0;

  const SHOP = [
    {
      id: "vitality",
      name: "Deep Roots",
      desc: "+12 max light (HP) per rank.",
      max: 8,
      cost: (r) => 12 + r * 10,
      apply: (p, r) => {
        p.maxHp += 12 * r;
      },
    },
    {
      id: "swift",
      name: "Marsh Stride",
      desc: "+6% move speed per rank.",
      max: 6,
      cost: (r) => 14 + r * 12,
      apply: (p, r) => {
        p.speed *= 1 + 0.06 * r;
      },
    },
    {
      id: "spark",
      name: "Kindling Spark",
      desc: "+8% attack damage per rank.",
      max: 8,
      cost: (r) => 15 + r * 13,
      apply: (p, r) => {
        p.damage *= 1 + 0.08 * r;
      },
    },
    {
      id: "pickup",
      name: "Wide Wick",
      desc: "+18% XP magnet range per rank.",
      max: 5,
      cost: (r) => 10 + r * 9,
      apply: (p, r) => {
        p.magnet *= 1 + 0.18 * r;
      },
    },
    {
      id: "dash",
      name: "Blink Ember",
      desc: "Shorter dash cooldown per rank.",
      max: 4,
      cost: (r) => 18 + r * 16,
      apply: (p, r) => {
        p.dashCooldown *= 1 - 0.12 * r;
      },
    },
    {
      id: "fortune",
      name: "Lucky Moth",
      desc: "+10% embers earned per rank.",
      max: 5,
      cost: (r) => 20 + r * 18,
      apply: (p, r) => {
        p.emberMult *= 1 + 0.1 * r;
      },
    },
  ];

  const RUN_UPGRADES = [
    {
      id: "beam",
      name: "Lash Beam",
      desc: "Stronger lantern bolts.",
      apply: (s) => {
        s.player.damage *= 1.22;
      },
    },
    {
      id: "rate",
      name: "Quick Flash",
      desc: "Fire more often.",
      apply: (s) => {
        s.player.fireCooldown *= 0.84;
      },
    },
    {
      id: "multi",
      name: "Split Wick",
      desc: "Extra projectile.",
      apply: (s) => {
        s.player.projectiles += 1;
      },
    },
    {
      id: "orbit",
      name: "Orbit Sparks",
      desc: "Spinning sparks that hit nearby foes.",
      apply: (s) => {
        s.player.orbit += 1;
      },
    },
    {
      id: "nova",
      name: "Burst Nova",
      desc: "Periodic shockwave around you.",
      apply: (s) => {
        s.player.nova += 1;
      },
    },
    {
      id: "regen",
      name: "Warm Core",
      desc: "Slowly restore light.",
      apply: (s) => {
        s.player.regen += 0.35;
      },
    },
    {
      id: "armor",
      name: "Glass Shade",
      desc: "Take less damage.",
      apply: (s) => {
        s.player.armor += 0.1;
      },
    },
    {
      id: "boots",
      name: "Reed Boots",
      desc: "Move faster.",
      apply: (s) => {
        s.player.speed *= 1.12;
      },
    },
    {
      id: "magnet",
      name: "Moth Charm",
      desc: "Pull XP from farther away.",
      apply: (s) => {
        s.player.magnet *= 1.35;
      },
    },
    {
      id: "thorn",
      name: "Bramble Retort",
      desc: "Attackers take damage on hit.",
      apply: (s) => {
        s.player.thorns += 4;
      },
    },
  ];

  const ACHIEVEMENTS = [
    {
      id: "minute3",
      name: "First Fog",
      test: (s) => s.time >= 180,
      reward: 15,
    },
    {
      id: "minute8",
      name: "Deep Night",
      test: (s) => s.time >= 480,
      reward: 40,
    },
    {
      id: "kills100",
      name: "Wisp Sweep",
      test: (s) => s.kills >= 100,
      reward: 20,
    },
    {
      id: "kills500",
      name: "Hollow Cleared",
      test: (s) => s.kills >= 500,
      reward: 60,
    },
    {
      id: "level10",
      name: "Bright Enough",
      test: (s) => s.player.level >= 10,
      reward: 25,
    },
    {
      id: "boss",
      name: "Bog Crown",
      test: (s) => s.bossesDown >= 1,
      reward: 35,
    },
  ];

  let meta = loadMeta();
  let state = null;
  let mode = "title";
  let lastTs = 0;
  let animId = 0;

  const input = {
    up: false,
    down: false,
    left: false,
    right: false,
    dash: false,
    pause: false,
    ax: 0,
    ay: 0,
  };

  function loadMeta() {
    const defaults = {
      embers: 0,
      bestTime: 0,
      runs: 0,
      shop: {},
      achievements: {},
      seenTutorial: false,
    };
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...defaults };
      return { ...defaults, ...JSON.parse(raw) };
    } catch {
      return { ...defaults };
    }
  }

  function saveMeta() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(meta));
  }

  function formatTime(sec) {
    const s = Math.floor(sec);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, "0")}`;
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function pick(arr) {
    return arr[(Math.random() * arr.length) | 0];
  }

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function dist(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.hypot(dx, dy);
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (state) {
      state.w = window.innerWidth;
      state.h = window.innerHeight;
    }
  }

  function show(el) {
    el.classList.remove("hidden");
  }

  function hide(el) {
    el.classList.add("hidden");
  }

  function setMode(next) {
    mode = next;
    hide(ui.title);
    hide(ui.tutorial);
    hide(ui.shop);
    hide(ui.levelup);
    hide(ui.pause);
    hide(ui.gameover);
    if (next === "title") {
      show(ui.title);
      hide(ui.hud);
      hide(ui.touch);
      refreshMetaUi();
    } else if (next === "tutorial") {
      show(ui.tutorial);
      hide(ui.hud);
      hide(ui.touch);
      renderTutorial();
    } else if (next === "shop") {
      show(ui.shop);
      renderShop();
    } else if (next === "play") {
      show(ui.hud);
      if (isTouchPrimary()) show(ui.touch);
    } else if (next === "levelup") {
      show(ui.levelup);
    } else if (next === "pause") {
      show(ui.pause);
    } else if (next === "gameover") {
      show(ui.gameover);
      hide(ui.hud);
      hide(ui.touch);
    }
  }

  function renderTutorial() {
    const step = TUTORIAL_STEPS[tutorialIndex];
    ui.tutStepLabel.textContent = `Step ${tutorialIndex + 1} of ${TUTORIAL_STEPS.length}`;
    ui.tutTitle.textContent = step.title;
    ui.tutBody.textContent = step.body;
    ui.tutCard.innerHTML = step.card;
    ui.tutBack.disabled = tutorialIndex === 0;
    ui.tutNext.textContent =
      tutorialIndex === TUTORIAL_STEPS.length - 1 ? "Start run" : "Next";
  }

  function openTutorial(fromStart = true) {
    tutorialIndex = fromStart ? 0 : tutorialIndex;
    setMode("tutorial");
  }

  function markTutorialSeen() {
    meta.seenTutorial = true;
    saveMeta();
  }

  function isTouchPrimary() {
    return matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
  }

  function refreshMetaUi() {
    ui.metaEmbers.textContent = String(meta.embers);
    ui.metaBest.textContent = formatTime(meta.bestTime);
    ui.metaRuns.textContent = String(meta.runs);
  }

  function createPlayer() {
    const p = {
      x: 0,
      y: 0,
      r: 14,
      hp: 100,
      maxHp: 100,
      speed: 210,
      damage: 12,
      fireCooldown: 0.42,
      fireTimer: 0,
      projectiles: 1,
      magnet: 90,
      xp: 0,
      level: 1,
      nextXp: 12,
      invuln: 0,
      dashTimer: 0,
      dashCooldown: 1.5,
      dashCd: 0,
      orbit: 0,
      nova: 0,
      novaTimer: 3.5,
      regen: 0,
      armor: 0,
      thorns: 0,
      emberMult: 1,
      facing: 0,
    };

    for (const item of SHOP) {
      const rank = meta.shop[item.id] || 0;
      if (rank > 0) item.apply(p, rank);
    }
    p.hp = p.maxHp;
    return p;
  }

  function startRun() {
    resize();
    state = {
      w: window.innerWidth,
      h: window.innerHeight,
      player: createPlayer(),
      enemies: [],
      bullets: [],
      gems: [],
      particles: [],
      floats: [],
      time: 0,
      kills: 0,
      spawnTimer: 0.4,
      bossesDown: 0,
      nextBossAt: 90,
      shake: 0,
      hurtFlash: 0,
      pausedChoice: false,
      levelUpsQueued: 0,
      ended: false,
      camera: { x: 0, y: 0 },
      coachStep: 0,
      coachTimer: 0,
    };
    state.player.x = 0;
    state.player.y = 0;
    setMode("play");
    showCoach(
      isTouchPrimary()
        ? "Drag the left stick to move. Orange Dash = speed burst escape!"
        : "WASD to move · Space = Dash (speed burst escape) · attacks are automatic",
    );
    lastTs = performance.now();
    cancelAnimationFrame(animId);
    animId = requestAnimationFrame(frame);
  }

  function showCoach(text) {
    if (!ui.coach) return;
    ui.coach.textContent = text;
    ui.coach.classList.remove("hidden");
  }

  function hideCoach() {
    if (!ui.coach) return;
    ui.coach.classList.add("hidden");
  }

  function xpForLevel(level) {
    return Math.floor(10 + level * 7 + level * level * 1.4);
  }

  function spawnEnemy(kind = null) {
    const angle = rand(0, TAU);
    const distAway = Math.max(state.w, state.h) * 0.55 + rand(20, 120);
    const x = state.player.x + Math.cos(angle) * distAway;
    const y = state.player.y + Math.sin(angle) * distAway;
    const t = state.time;
    const roll = kind || (Math.random() < Math.min(0.18, t / 900) ? "brute" : Math.random() < 0.12 ? "dart" : "wisp");

    if (roll === "boss") {
      state.enemies.push({
        kind: "boss",
        x,
        y,
        r: 34,
        hp: 220 + t * 1.6,
        maxHp: 220 + t * 1.6,
        speed: 70,
        damage: 18,
        xp: 40,
        color: "#c45c26",
        pulse: 0,
      });
      return;
    }

    if (roll === "brute") {
      state.enemies.push({
        kind: "brute",
        x,
        y,
        r: 18,
        hp: 34 + t * 0.12,
        maxHp: 34 + t * 0.12,
        speed: 78 + t * 0.02,
        damage: 12,
        xp: 5,
        color: "#3f6b4f",
        pulse: rand(0, TAU),
      });
      return;
    }

    if (roll === "dart") {
      state.enemies.push({
        kind: "dart",
        x,
        y,
        r: 9,
        hp: 10 + t * 0.05,
        maxHp: 10 + t * 0.05,
        speed: 170 + t * 0.05,
        damage: 7,
        xp: 3,
        color: "#7ec8a3",
        pulse: rand(0, TAU),
      });
      return;
    }

    state.enemies.push({
      kind: "wisp",
      x,
      y,
      r: 11,
      hp: 16 + t * 0.08,
      maxHp: 16 + t * 0.08,
      speed: 105 + t * 0.035,
      damage: 8,
      xp: 2,
      color: "#86a37a",
      pulse: rand(0, TAU),
    });
  }

  function addParticles(x, y, color, count = 8, speed = 120) {
    for (let i = 0; i < count; i++) {
      const a = rand(0, TAU);
      const sp = rand(speed * 0.3, speed);
      state.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: rand(0.25, 0.7),
        max: 0.7,
        color,
        r: rand(1.5, 3.5),
      });
    }
  }

  function floatText(x, y, text, color = "#f0b429") {
    state.floats.push({ x, y, text, color, life: 0.8 });
  }

  function fireWeapons(dt) {
    const p = state.player;
    p.fireTimer -= dt;
    if (p.fireTimer <= 0 && state.enemies.length) {
      p.fireTimer = p.fireCooldown;
      const sorted = [...state.enemies].sort((a, b) => dist(p, a) - dist(p, b));
      const targets = sorted.slice(0, p.projectiles);
      for (const target of targets) {
        const ang = Math.atan2(target.y - p.y, target.x - p.x);
        state.bullets.push({
          x: p.x,
          y: p.y,
          vx: Math.cos(ang) * 420,
          vy: Math.sin(ang) * 420,
          r: 5,
          damage: p.damage,
          life: 1.2,
        });
      }
      p.facing = targets[0]
        ? Math.atan2(targets[0].y - p.y, targets[0].x - p.x)
        : p.facing;
    }

    if (p.orbit > 0) {
      const orbitR = 42 + p.orbit * 8;
      const sparks = p.orbit + 2;
      for (let i = 0; i < sparks; i++) {
        const a = state.time * (1.8 + p.orbit * 0.15) + (TAU * i) / sparks;
        const ox = p.x + Math.cos(a) * orbitR;
        const oy = p.y + Math.sin(a) * orbitR;
        for (const e of state.enemies) {
          if (dist({ x: ox, y: oy }, e) < e.r + 8) {
            hurtEnemy(e, p.damage * 0.35 * dt * 8);
          }
        }
      }
    }

    if (p.nova > 0) {
      p.novaTimer -= dt;
      if (p.novaTimer <= 0) {
        p.novaTimer = Math.max(1.8, 4.2 - p.nova * 0.35);
        const radius = 70 + p.nova * 18;
        for (const e of state.enemies) {
          if (dist(p, e) < radius + e.r) hurtEnemy(e, p.damage * (1.1 + p.nova * 0.25));
        }
        addParticles(p.x, p.y, "#f0b429", 20, 200);
        state.shake = 6;
      }
    }
  }

  function hurtEnemy(e, amount) {
    if (e.hp <= 0) return;
    e.hp -= amount;
    if (e.hp <= 0) {
      killEnemy(e);
    }
  }

  function killEnemy(e) {
    e.hp = 0;
    state.kills += 1;
    if (e.kind === "boss") state.bossesDown += 1;
    state.gems.push({
      x: e.x,
      y: e.y,
      r: e.kind === "boss" ? 8 : 4,
      value: e.xp,
      vx: rand(-30, 30),
      vy: rand(-30, 30),
    });
    addParticles(e.x, e.y, e.color, e.kind === "boss" ? 24 : 10, 160);
    floatText(e.x, e.y - 10, `+${e.xp}`, "#d7e4d5");
  }

  function gainXp(amount) {
    const p = state.player;
    p.xp += amount;
    let leveled = 0;
    while (p.xp >= p.nextXp) {
      p.xp -= p.nextXp;
      p.level += 1;
      p.nextXp = xpForLevel(p.level);
      p.hp = Math.min(p.maxHp, p.hp + 8);
      leveled += 1;
    }
    if (leveled > 0) {
      state.levelUpsQueued = (state.levelUpsQueued || 0) + leveled;
      if (!state.pausedChoice) offerLevelUp();
    }
  }

  function offerLevelUp() {
    if (!state.levelUpsQueued) return;
    const choices = shuffle([...RUN_UPGRADES]).slice(0, 3);
    ui.upgradeChoices.innerHTML = "";
    for (const choice of choices) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "card";
      btn.innerHTML = `<h3>${choice.name}</h3><p>${choice.desc}</p>`;
      btn.addEventListener("click", () => {
        choice.apply(state);
        state.levelUpsQueued -= 1;
        if (state.levelUpsQueued > 0) {
          offerLevelUp();
        } else {
          state.pausedChoice = false;
          hide(ui.levelup);
          setMode("play");
        }
      });
      ui.upgradeChoices.appendChild(btn);
    }
    state.pausedChoice = true;
    setMode("levelup");
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function hurtPlayer(amount, source) {
    const p = state.player;
    if (p.invuln > 0 || p.dashTimer > 0) return;
    const dmg = amount * (1 - Math.min(0.55, p.armor));
    p.hp -= dmg;
    p.invuln = 0.55;
    state.shake = 8;
    state.hurtFlash = 0.22;
    floatText(p.x, p.y - 18, `-${Math.ceil(dmg)}`, "#e07a2f");
    addParticles(p.x, p.y, "#e07a2f", 8, 90);
    if (p.thorns > 0 && source) {
      hurtEnemy(source, p.thorns);
    }
    if (p.hp <= 0) {
      p.hp = 0;
      endRun(false);
    }
  }

  function endRun(manual) {
    if (!state || state.ended) return;
    state.ended = true;
    meta.runs += 1;
    meta.bestTime = Math.max(meta.bestTime, state.time);

    let embers = Math.floor(
      (state.time * 0.35 + state.kills * 0.12 + state.player.level * 1.5) *
        state.player.emberMult,
    );
    if (manual) embers = Math.floor(embers * 0.65);

    const unlocks = [];
    for (const ach of ACHIEVEMENTS) {
      if (!meta.achievements[ach.id] && ach.test(state)) {
        meta.achievements[ach.id] = true;
        embers += ach.reward;
        unlocks.push(`${ach.name} (+${ach.reward} embers)`);
      }
    }

    meta.embers += embers;
    saveMeta();

    ui.overTitle.textContent = manual ? "Lantern banked" : "Light snuffed";
    ui.overSummary.textContent = `You lasted ${formatTime(state.time)} in the hollow.`;
    ui.overKills.textContent = String(state.kills);
    ui.overLevel.textContent = String(state.player.level);
    ui.overEmbers.textContent = String(embers);
    ui.overUnlocks.innerHTML = unlocks.map((u) => `<li>${u}</li>`).join("");
    setMode("gameover");
  }

  function update(dt) {
    if (!state || state.ended || state.pausedChoice || mode === "pause") return;
    const p = state.player;
    state.time += dt;
    state.shake = Math.max(0, state.shake - dt * 20);
    state.hurtFlash = Math.max(0, state.hurtFlash - dt);

    let mx = 0;
    let my = 0;
    if (input.left) mx -= 1;
    if (input.right) mx += 1;
    if (input.up) my -= 1;
    if (input.down) my += 1;
    mx += input.ax;
    my += input.ay;
    const mag = Math.hypot(mx, my);
    if (mag > 1) {
      mx /= mag;
      my /= mag;
    }

    if (input.dash && p.dashCd <= 0 && mag > 0.1) {
      p.dashTimer = 0.18;
      p.dashCd = p.dashCooldown;
      addParticles(p.x, p.y, "#f0b429", 12, 140);
      input.dash = false;
    }

    const speedMul = p.dashTimer > 0 ? 2.6 : 1;
    p.x += mx * p.speed * speedMul * dt;
    p.y += my * p.speed * speedMul * dt;
    if (mag > 0.1) p.facing = Math.atan2(my, mx);

    p.dashTimer = Math.max(0, p.dashTimer - dt);
    p.dashCd = Math.max(0, p.dashCd - dt);
    p.invuln = Math.max(0, p.invuln - dt);
    if (p.regen > 0) p.hp = Math.min(p.maxHp, p.hp + p.regen * dt);

    // world soft bounds so camera feels open but player isn't lost forever
    const bound = 2200;
    p.x = clamp(p.x, -bound, bound);
    p.y = clamp(p.y, -bound, bound);

    state.camera.x = p.x;
    state.camera.y = p.y;

    // spawning
    const density = 1 + state.time / 70;
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      const count = 1 + ((state.time / 80) | 0);
      for (let i = 0; i < count; i++) spawnEnemy();
      state.spawnTimer = Math.max(0.18, 0.85 / density);
    }
    if (state.time >= state.nextBossAt) {
      spawnEnemy("boss");
      state.nextBossAt += 85;
      floatText(p.x, p.y - 40, "A bog crown stirs", "#e07a2f");
    }

    fireWeapons(dt);

    // bullets
    for (const b of state.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      for (const e of state.enemies) {
        if (e.hp > 0 && dist(b, e) < b.r + e.r) {
          hurtEnemy(e, b.damage);
          b.life = 0;
          addParticles(b.x, b.y, "#f0b429", 4, 80);
          break;
        }
      }
    }
    state.bullets = state.bullets.filter((b) => b.life > 0);

    // enemies
    for (const e of state.enemies) {
      if (e.hp <= 0) continue;
      e.pulse += dt * 3;
      const ang = Math.atan2(p.y - e.y, p.x - e.x);
      let spd = e.speed;
      if (e.kind === "dart") spd *= 1 + Math.sin(e.pulse * 2) * 0.15;
      e.x += Math.cos(ang) * spd * dt;
      e.y += Math.sin(ang) * spd * dt;
      if (dist(p, e) < p.r + e.r - 2) {
        hurtPlayer(e.damage, e);
      }
    }
    state.enemies = state.enemies.filter((e) => e.hp > 0);

    // gems
    for (const g of state.gems) {
      g.vx *= 0.9;
      g.vy *= 0.9;
      g.x += g.vx * dt;
      g.y += g.vy * dt;
      const d = dist(p, g);
      if (d < p.magnet) {
        const pull = (p.magnet - d) / p.magnet;
        const ang = Math.atan2(p.y - g.y, p.x - g.x);
        g.x += Math.cos(ang) * 380 * pull * dt;
        g.y += Math.sin(ang) * 380 * pull * dt;
      }
      if (d < p.r + g.r + 6) {
        g._collected = true;
        gainXp(g.value);
      }
    }
    state.gems = state.gems.filter((g) => !g._collected);

    for (const part of state.particles) {
      part.x += part.vx * dt;
      part.y += part.vy * dt;
      part.vx *= 0.96;
      part.vy *= 0.96;
      part.life -= dt;
    }
    state.particles = state.particles.filter((p2) => p2.life > 0);

    for (const f of state.floats) {
      f.y -= 28 * dt;
      f.life -= dt;
    }
    state.floats = state.floats.filter((f) => f.life > 0);

    ui.hudTime.textContent = formatTime(state.time);
    ui.hudHp.textContent = `${Math.ceil(p.hp)} light`;
    ui.hudKills.textContent = `${state.kills} kills`;
    ui.hudLevel.textContent = `Lv ${p.level}`;
    ui.xpFill.style.width = `${(p.xp / p.nextXp) * 100}%`;

    if (ui.dashBtn) {
      ui.dashBtn.classList.toggle("cooling", p.dashCd > 0);
      ui.dashBtn.disabled = p.dashCd > 0;
    }

    // Short onboarding tips for the first half-minute
    if (state.coachStep === 0 && state.time > 4) {
      state.coachStep = 1;
      showCoach("Green enemies hurt on touch. Dash away if they close in!");
    } else if (state.coachStep === 1 && state.kills >= 1) {
      state.coachStep = 2;
      showCoach("Gold orbs = XP. Walk into them to fill the yellow bar.");
    } else if (state.coachStep === 2 && state.player.level >= 2) {
      state.coachStep = 3;
      showCoach("Level up! Pick one upgrade — it lasts for this run.");
    } else if (state.coachStep === 3 && state.time > 22) {
      state.coachStep = 4;
      hideCoach();
    } else if (state.coachStep < 3 && state.time > 30) {
      state.coachStep = 4;
      hideCoach();
    }
  }

  function worldToScreen(x, y) {
    const shakeX = state.shake ? rand(-state.shake, state.shake) : 0;
    const shakeY = state.shake ? rand(-state.shake, state.shake) : 0;
    return {
      x: x - state.camera.x + state.w / 2 + shakeX,
      y: y - state.camera.y + state.h / 2 + shakeY,
    };
  }

  function draw() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);

    // marsh backdrop
    const grad = ctx.createRadialGradient(w * 0.5, h * 0.45, 40, w * 0.5, h * 0.5, Math.max(w, h) * 0.7);
    grad.addColorStop(0, "#243f31");
    grad.addColorStop(0.45, "#15241c");
    grad.addColorStop(1, "#0b1210");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    if (!state) {
      drawIdleDecor(w, h);
      return;
    }

    // ground marks relative to camera
    ctx.save();
    const origin = worldToScreen(0, 0);
    ctx.translate(origin.x % 80, origin.y % 80);
    ctx.strokeStyle = "rgba(47, 106, 69, 0.12)";
    ctx.lineWidth = 1;
    for (let x = -80; x < w + 80; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, -80);
      ctx.lineTo(x, h + 80);
      ctx.stroke();
    }
    for (let y = -80; y < h + 80; y += 80) {
      ctx.beginPath();
      ctx.moveTo(-80, y);
      ctx.lineTo(w + 80, y);
      ctx.stroke();
    }
    ctx.restore();

    // ambient fireflies
    for (let i = 0; i < 18; i++) {
      const fx = (Math.sin(state.time * 0.4 + i * 1.7) * 0.5 + 0.5) * w;
      const fy = (Math.cos(state.time * 0.33 + i * 2.1) * 0.5 + 0.5) * h;
      ctx.beginPath();
      ctx.fillStyle = `rgba(240,180,41,${0.15 + (i % 3) * 0.05})`;
      ctx.arc(fx, fy, 2, 0, TAU);
      ctx.fill();
    }

    // gems
    for (const g of state.gems) {
      const s = worldToScreen(g.x, g.y);
      ctx.beginPath();
      ctx.fillStyle = "#f0b429";
      ctx.globalAlpha = 0.9;
      ctx.arc(s.x, s.y, g.r, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // bullets
    for (const b of state.bullets) {
      const s = worldToScreen(b.x, b.y);
      ctx.beginPath();
      ctx.fillStyle = "#ffe08a";
      ctx.shadowColor = "#f0b429";
      ctx.shadowBlur = 10;
      ctx.arc(s.x, s.y, b.r, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // enemies
    for (const e of state.enemies) {
      const s = worldToScreen(e.x, e.y);
      ctx.beginPath();
      ctx.fillStyle = e.color;
      ctx.arc(s.x, s.y, e.r, 0, TAU);
      ctx.fill();
      if (e.kind === "boss" || e.hp < e.maxHp) {
        const pct = clamp(e.hp / e.maxHp, 0, 1);
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillRect(s.x - e.r, s.y - e.r - 10, e.r * 2, 4);
        ctx.fillStyle = "#f0b429";
        ctx.fillRect(s.x - e.r, s.y - e.r - 10, e.r * 2 * pct, 4);
      }
      if (e.kind === "boss") {
        ctx.strokeStyle = "rgba(224,122,47,0.8)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(s.x, s.y, e.r + 4 + Math.sin(e.pulse) * 2, 0, TAU);
        ctx.stroke();
      }
    }

    // orbit visuals
    const p = state.player;
    if (p.orbit > 0) {
      const sparks = p.orbit + 2;
      const orbitR = 42 + p.orbit * 8;
      for (let i = 0; i < sparks; i++) {
        const a = state.time * (1.8 + p.orbit * 0.15) + (TAU * i) / sparks;
        const s = worldToScreen(p.x + Math.cos(a) * orbitR, p.y + Math.sin(a) * orbitR);
        ctx.beginPath();
        ctx.fillStyle = "#ffd36a";
        ctx.arc(s.x, s.y, 4, 0, TAU);
        ctx.fill();
      }
    }

    // player
    const ps = worldToScreen(p.x, p.y);
    const glow = ctx.createRadialGradient(ps.x, ps.y, 4, ps.x, ps.y, 70);
    glow.addColorStop(0, "rgba(240,180,41,0.45)");
    glow.addColorStop(1, "rgba(240,180,41,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(ps.x, ps.y, 70, 0, TAU);
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = p.invuln > 0 ? "rgba(244,239,228,0.55)" : "#f4efe4";
    ctx.arc(ps.x, ps.y, p.r, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = "#f0b429";
    ctx.arc(ps.x, ps.y - 2, 7, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#c9842a";
    ctx.fillRect(ps.x - 3, ps.y + 4, 6, 10);

    // hp arc
    ctx.strokeStyle = "rgba(215,228,213,0.25)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(ps.x, ps.y, p.r + 8, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = "#f0b429";
    ctx.beginPath();
    ctx.arc(ps.x, ps.y, p.r + 8, -Math.PI / 2, -Math.PI / 2 + TAU * (p.hp / p.maxHp));
    ctx.stroke();

    // particles / floats
    for (const part of state.particles) {
      const s = worldToScreen(part.x, part.y);
      ctx.globalAlpha = clamp(part.life / part.max, 0, 1);
      ctx.fillStyle = part.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, part.r, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.font = "600 14px Outfit, sans-serif";
    ctx.textAlign = "center";
    for (const f of state.floats) {
      const s = worldToScreen(f.x, f.y);
      ctx.globalAlpha = clamp(f.life / 0.8, 0, 1);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, s.x, s.y);
      ctx.globalAlpha = 1;
    }

    // vignette
    const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.7);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);

    if (state.hurtFlash > 0) {
      ctx.fillStyle = `rgba(224, 122, 47, ${state.hurtFlash * 0.45})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  function drawIdleDecor(w, h) {
    for (let i = 0; i < 30; i++) {
      const x = (Math.sin(i * 12.1 + performance.now() * 0.0003) * 0.5 + 0.5) * w;
      const y = (Math.cos(i * 8.4 + performance.now() * 0.0004) * 0.5 + 0.5) * h;
      ctx.beginPath();
      ctx.fillStyle = `rgba(240,180,41,${0.08 + (i % 4) * 0.03})`;
      ctx.arc(x, y, 2 + (i % 3), 0, TAU);
      ctx.fill();
    }
  }

  function frame(ts) {
    const dt = Math.min(0.033, (ts - lastTs) / 1000 || 0.016);
    lastTs = ts;
    if (mode === "play") update(dt);
    draw();
    animId = requestAnimationFrame(frame);
  }

  function renderShop() {
    ui.shopEmbers.textContent = String(meta.embers);
    ui.shopList.innerHTML = "";
    for (const item of SHOP) {
      const rank = meta.shop[item.id] || 0;
      const maxed = rank >= item.max;
      const cost = item.cost(rank);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "card";
      btn.disabled = maxed || meta.embers < cost;
      btn.innerHTML = `
        <h3>${item.name} <span style="color:#d7e4d5;font-size:0.9rem">(${rank}/${item.max})</span></h3>
        <p>${item.desc}</p>
        <div class="price">${maxed ? "Maxed" : `${cost} embers`}</div>
      `;
      btn.addEventListener("click", () => {
        if (maxed || meta.embers < cost) return;
        meta.embers -= cost;
        meta.shop[item.id] = rank + 1;
        saveMeta();
        renderShop();
        refreshMetaUi();
      });
      ui.shopList.appendChild(btn);
    }
  }

  // input
  window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "w", "a", "s", "d"].includes(k)) {
      e.preventDefault();
    }
    if (k === "w" || k === "arrowup") input.up = true;
    if (k === "s" || k === "arrowdown") input.down = true;
    if (k === "a" || k === "arrowleft") input.left = true;
    if (k === "d" || k === "arrowright") input.right = true;
    if (k === " " || k === "shift") input.dash = true;
    if ((k === "p" || k === "escape") && state && !state.ended && !state.pausedChoice) {
      if (mode === "play") setMode("pause");
      else if (mode === "pause") setMode("play");
    }
  });

  window.addEventListener("keyup", (e) => {
    const k = e.key.toLowerCase();
    if (k === "w" || k === "arrowup") input.up = false;
    if (k === "s" || k === "arrowdown") input.down = false;
    if (k === "a" || k === "arrowleft") input.left = false;
    if (k === "d" || k === "arrowright") input.right = false;
  });

  // touch stick
  let stickActive = null;
  function stickHandler(clientX, clientY) {
    const rect = ui.stick.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const max = rect.width * 0.35;
    const m = Math.hypot(dx, dy) || 1;
    if (m > max) {
      dx = (dx / m) * max;
      dy = (dy / m) * max;
    }
    input.ax = dx / max;
    input.ay = dy / max;
    ui.stickKnob.style.transform = `translate(${dx}px, ${dy}px)`;
  }

  ui.stick.addEventListener("pointerdown", (e) => {
    stickActive = e.pointerId;
    ui.stick.setPointerCapture(e.pointerId);
    stickHandler(e.clientX, e.clientY);
  });
  ui.stick.addEventListener("pointermove", (e) => {
    if (stickActive === e.pointerId) stickHandler(e.clientX, e.clientY);
  });
  function endStick(e) {
    if (stickActive === e.pointerId) {
      stickActive = null;
      input.ax = 0;
      input.ay = 0;
      ui.stickKnob.style.transform = "translate(0,0)";
    }
  }
  ui.stick.addEventListener("pointerup", endStick);
  ui.stick.addEventListener("pointercancel", endStick);

  ui.dashBtn.addEventListener("click", () => {
    input.dash = true;
  });

  document.getElementById("btn-start").addEventListener("click", () => {
    if (!meta.seenTutorial) {
      openTutorial(true);
      return;
    }
    startRun();
  });
  document.getElementById("btn-tutorial").addEventListener("click", () => openTutorial(true));
  document.getElementById("btn-tut-next").addEventListener("click", () => {
    if (tutorialIndex < TUTORIAL_STEPS.length - 1) {
      tutorialIndex += 1;
      renderTutorial();
      return;
    }
    markTutorialSeen();
    startRun();
  });
  document.getElementById("btn-tut-back").addEventListener("click", () => {
    if (tutorialIndex > 0) {
      tutorialIndex -= 1;
      renderTutorial();
    }
  });
  document.getElementById("btn-tut-skip").addEventListener("click", () => {
    markTutorialSeen();
    setMode("title");
  });
  document.getElementById("btn-hud-pause").addEventListener("click", () => {
    if (mode === "play" && state && !state.ended && !state.pausedChoice) {
      setMode("pause");
    }
  });
  document.getElementById("btn-again").addEventListener("click", startRun);
  document.getElementById("btn-menu").addEventListener("click", () => setMode("title"));
  document.getElementById("btn-upgrades").addEventListener("click", () => setMode("shop"));
  document.getElementById("btn-shop-back").addEventListener("click", () => setMode("title"));
  document.getElementById("btn-resume").addEventListener("click", () => setMode("play"));
  document.getElementById("btn-quit").addEventListener("click", () => endRun(true));

  window.addEventListener("resize", resize);
  resize();
  refreshMetaUi();
  // First visit opens the tutorial automatically
  if (!meta.seenTutorial) {
    openTutorial(true);
  } else {
    setMode("title");
  }
  lastTs = performance.now();
  animId = requestAnimationFrame(frame);
})();
