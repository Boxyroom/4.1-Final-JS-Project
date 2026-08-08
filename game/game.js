(() => {
  "use strict";

  const STORAGE_KEY = "lantern-hollow-v1";
  const TAU = Math.PI * 2;

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

  function beep(freq, dur = 0.08, type = "square", gain = 0.04, slide = 0) {
    if (meta && meta.muted) return;
    const ctxA = ensureAudio();
    if (!ctxA) return;
    const osc = ctxA.createOscillator();
    const g = ctxA.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctxA.currentTime);
    if (slide) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(40, freq + slide),
        ctxA.currentTime + dur,
      );
    }
    g.gain.setValueAtTime(gain, ctxA.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctxA.currentTime + dur);
    osc.connect(g);
    g.connect(ctxA.destination);
    osc.start();
    osc.stop(ctxA.currentTime + dur + 0.02);
  }

  const sfx = {
    shoot: () => beep(520, 0.05, "square", 0.025, -180),
    hit: () => beep(180, 0.05, "triangle", 0.03, -60),
    kill: () => beep(340, 0.07, "sawtooth", 0.03, 220),
    xp: () => beep(760, 0.06, "sine", 0.025, 200),
    level: () => { beep(440, 0.08, "sine", 0.04, 200); setTimeout(() => beep(660, 0.1, "sine", 0.04), 80); },
    hurt: () => beep(120, 0.14, "sawtooth", 0.05, -40),
    dash: () => beep(280, 0.1, "square", 0.035, 260),
    pickup: () => beep(620, 0.08, "sine", 0.035, 180),
    nuke: () => {
      beep(60, 0.28, "sawtooth", 0.07, -20);
      setTimeout(() => beep(40, 0.35, "sawtooth", 0.06), 90);
    },
    grenade: () => beep(240, 0.07, "square", 0.04, -120),
    boom: () => beep(90, 0.16, "sawtooth", 0.055, -50),
    boss: () => { beep(90, 0.2, "sawtooth", 0.05); setTimeout(() => beep(70, 0.25, "sawtooth", 0.05), 120); },
    death: () => beep(70, 0.35, "sawtooth", 0.06, -30),
  };


  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const GROUND_SRC = location.pathname.includes("/game")
    ? "../theater.jpg"
    : "theater.jpg";
  const groundImg = new Image();
  let groundReady = false;
  groundImg.onload = () => {
    groundReady = true;
  };
  groundImg.src = GROUND_SRC;


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
    banner: document.getElementById("banner"),
    hudDash: document.getElementById("hud-dash"),
    hudFocus: document.getElementById("hud-focus"),
    dashFill: document.getElementById("dash-fill"),
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
    tactic: document.getElementById("tactic"),
    tacticTitle: document.getElementById("tactic-title"),
    tacticBody: document.getElementById("tactic-body"),
    tacticChoices: document.getElementById("tactic-choices"),
    pauseBuild: document.getElementById("pause-build"),
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
        <p><strong>Phone / tablet:</strong> drag the right <strong>Move</strong> stick.</p>
        <ul>
          <li>Keep moving so green enemies don’t pile on you.</li>
          <li>There is no jump and no special move stick combo — just direction.</li>
        </ul>
      `,
    },
    {
      title: "Special weapons",
      body: "Drive through pickups, then fire with the weapon button.",
      card: `
        <p>Colored crates on the marsh are <strong>special weapons</strong>.</p>
        <ul>
          <li><strong>Star Grenades</strong> (orange) — spawn about every 20s. Fire 5 bombs in a star.</li>
          <li><strong>Nuke</strong> (purple, rare) — spawn about every 60s. Clears the field and sucks in all XP.</li>
          <li>Drive through a crate to equip it. The left button shows what is loaded.</li>
          <li><strong>Keyboard:</strong> <span class="key">Space</span> or <span class="key">Shift</span> to fire</li>
        </ul>
      `,
    },
    {
      title: "Think in builds",
      body: "Upgrades are choices, not just power-ups.",
      card: `
        <ul>
          <li><strong>Offense</strong> (Lash Beam, Quick Flash, Split Wick): clear packs faster, but you must stay aggressive for XP.</li>
          <li><strong>Close-range</strong> (Orbit Sparks, Burst Nova, Bramble): strong if you dare to stay near enemies.</li>
          <li><strong>Survival</strong> (Warm Core, Glass Shade, Reed Boots): live longer, usually slower clears.</li>
          <li><strong>Pickup</strong> (Moth Charm): safer XP collection so you can kite farther away.</li>
        </ul>
        <p>Pick a lane and stack it. Mixing randomly feels weaker.</p>
      `,
    },
    {
      title: "Focus fire & tactics",
      body: "You get real decisions mid-run.",
      card: `
        <ul>
          <li>Hold <span class="key">F</span> to <strong>focus</strong> brutes and bosses instead of the nearest weak wisp.</li>
          <li>Every so often you’ll get a <strong>Tactical choice</strong>: risk vs reward (heal, damage amp, magnet, etc.).</li>
          <li>Pause anytime to review <strong>your build this run</strong>.</li>
        </ul>
      `,
    },
    {
      title: "You’re ready",
      body: "Survive with a plan.",
      card: `
        <ul>
          <li>Move with WASD / stick</li>
          <li>Pick up weapons and fire with Space / the weapon button</li>
          <li>Hold F to focus big threats</li>
          <li>Stack upgrades toward one strategy</li>
          <li>Take tactical choices when they appear</li>
        </ul>
        <p>Next: <strong>Start run</strong>.</p>
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
      name: "Warhead Stock",
      desc: "+18% special weapon damage per rank.",
      max: 4,
      cost: (r) => 18 + r * 16,
      apply: (p, r) => {
        p.weaponDamage *= 1 + 0.18 * r;
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
      tag: "Offense",
      desc: "Stronger lantern bolts.",
      strategy: "Take when packs feel spongy. Best with Quick Flash.",
      apply: (s) => {
        s.player.damage *= 1.22;
      },
    },
    {
      id: "rate",
      name: "Quick Flash",
      tag: "Offense",
      desc: "Fire more often.",
      strategy: "Great early. Helps delete wisps before they touch you.",
      apply: (s) => {
        s.player.fireCooldown *= 0.84;
      },
    },
    {
      id: "multi",
      name: "Split Wick",
      tag: "Offense",
      desc: "Extra projectile.",
      strategy: "Pick when surrounded from many angles.",
      apply: (s) => {
        s.player.projectiles += 1;
      },
    },
    {
      id: "orbit",
      name: "Orbit Sparks",
      tag: "Close-range",
      desc: "Spinning sparks that hit nearby foes.",
      strategy: "Rewards staying close. Pair with armor/regen.",
      apply: (s) => {
        s.player.orbit += 1;
      },
    },
    {
      id: "nova",
      name: "Burst Nova",
      tag: "Close-range",
      desc: "Periodic shockwave around you.",
      strategy: "Anti-swarm. Strong if you kite in circles through packs.",
      apply: (s) => {
        s.player.nova += 1;
      },
    },
    {
      id: "regen",
      name: "Warm Core",
      tag: "Survival",
      desc: "Slowly restore light.",
      strategy: "Take after a rough fight or if you get hit often.",
      apply: (s) => {
        s.player.regen += 0.45;
      },
    },
    {
      id: "armor",
      name: "Glass Shade",
      tag: "Survival",
      desc: "Take less damage.",
      strategy: "Helps you survive while hunting weapon pickups.",
      apply: (s) => {
        s.player.armor += 0.12;
      },
    },
    {
      id: "boots",
      name: "Reed Boots",
      tag: "Survival",
      desc: "Move faster.",
      strategy: "Kiting build. Pair with magnet and keep distance.",
      apply: (s) => {
        s.player.speed *= 1.12;
      },
    },
    {
      id: "magnet",
      name: "Moth Charm",
      tag: "Pickup",
      desc: "Pull XP from farther away.",
      strategy: "Lets you farm XP safely without walking into danger.",
      apply: (s) => {
        s.player.magnet *= 1.35;
      },
    },
    {
      id: "thorn",
      name: "Bramble Retort",
      tag: "Close-range",
      desc: "Attackers take damage on hit.",
      strategy: "Only good if you expect contact. Skip for pure kiting.",
      apply: (s) => {
        s.player.thorns += 5;
      },
    },
    {
      id: "dashpower",
      name: "Cluster Star",
      tag: "Weapon",
      desc: "Special weapons hit harder. Grenades explode wider.",
      strategy: "Great if you grab grenade crates often.",
      apply: (s) => {
        s.player.weaponDamage *= 1.4;
        s.player.grenadeRadius *= 1.25;
      },
    },
  ];

  const TACTICS = [
    {
      id: "mend",
      name: "Drink the spring",
      tag: "Safe",
      desc: "Restore 35 light now.",
      strategy: "Pick if you're below half light.",
      apply: (s) => {
        s.player.hp = Math.min(s.player.maxHp, s.player.hp + 35);
      },
    },
    {
      id: "overburn",
      name: "Overburn",
      tag: "Risky",
      desc: "+30% damage for 25s, but -10 max light.",
      strategy: "Take to burst a boss. Avoid if already fragile.",
      apply: (s) => {
        if (s.buffLabel === "Overburn" && s._overburnMult) {
          s.player.damage /= s._overburnMult;
        }
        s._overburnMult = 1.3;
        s.player.damage *= s._overburnMult;
        s.player.maxHp = Math.max(40, s.player.maxHp - 10);
        s.player.hp = Math.min(s.player.hp, s.player.maxHp);
        s.buffTimer = 25;
        s.buffLabel = "Overburn";
      },
    },
    {
      id: "harvest",
      name: "Wide harvest",
      tag: "Farm",
      desc: "Huge XP magnet for 20s.",
      strategy: "Best right after a big fight with lots of orbs on the ground.",
      apply: (s) => {
        if (s.magnetBuffTimer > 0 && s._magnetBeforeHarvest) {
          s.player.magnet = s._magnetBeforeHarvest;
        }
        s._magnetBeforeHarvest = s.player.magnet;
        s.player.magnet *= 2.2;
        s.magnetBuffTimer = 20;
      },
    },
    {
      id: "fortify",
      name: "Fortify wick",
      tag: "Safe",
      desc: "+18 max light and a little armor.",
      strategy: "Steady value when you want fewer deaths later.",
      apply: (s) => {
        s.player.maxHp += 18;
        s.player.hp += 18;
        s.player.armor += 0.06;
      },
    },
    {
      id: "bloodrush",
      name: "Bloodrush",
      tag: "Risky",
      desc: "Next 40 kills grant bonus XP. Take 12 damage now.",
      strategy: "High reward if you can stay alive and keep clearing.",
      apply: (s) => {
        s.player.hp = Math.max(1, s.player.hp - 12);
        s.bloodrushKills = 40;
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
    focus: false,
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
      muted: false,
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
    if (el) el.classList.remove("hidden");
  }

  function hide(el) {
    if (el) el.classList.add("hidden");
  }

  function on(id, event, handler) {
    const el = typeof id === "string" ? document.getElementById(id) : id;
    if (!el) return null;
    el.addEventListener(event, handler);
    return el;
  }

  function setMode(next) {
    mode = next;
    hide(ui.title);
    hide(ui.tutorial);
    hide(ui.shop);
    hide(ui.levelup);
    hide(ui.tactic);
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
    } else if (next === "tactic") {
      show(ui.tactic);
    } else if (next === "pause") {
      show(ui.pause);
      renderPauseBuild();
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
    const last = tutorialIndex === TUTORIAL_STEPS.length - 1;
    if (last && state && state._returnToPause) {
      ui.tutNext.textContent = "Back to pause";
    } else {
      ui.tutNext.textContent = last ? "Start run" : "Next";
    }
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
    return (
      matchMedia("(pointer: coarse)").matches ||
      matchMedia("(hover: none)").matches ||
      navigator.maxTouchPoints > 0
    );
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
      equippedWeapon: null,
      weaponDamage: 1,
      grenadeRadius: 120,
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
    ensureAudio();
    resize();
    state = {
      w: window.innerWidth,
      h: window.innerHeight,
      player: createPlayer(),
      enemies: [],
      bullets: [],
      gems: [],
      weaponPickups: [],
      grenades: [],
      particles: [],
      floats: [],
      time: 0,
      kills: 0,
      spawnTimer: 1.2,
      nextGrenadePickupAt: 20,
      nextNukeAt: 60,
      bossesDown: 0,
      nextBossAt: 100,
      bannerTimer: 0,
      killFlash: 0,
      shake: 0,
      hurtFlash: 0,
      pausedChoice: false,
      levelUpsQueued: 0,
      ended: false,
      camera: { x: 0, y: 0 },
      coachStep: 0,
      coachTimer: 0,
      buildLog: [],
      nextTacticAt: 45,
      spawnedFocusBrute: false,
      buffTimer: 0,
      buffLabel: "",
      magnetBuffTimer: 0,
      bloodrushKills: 0,
      baseMagnet: 0,
    };
    state.baseMagnet = state.player.magnet;
    state.player.x = 0;
    state.player.y = 0;
    setMode("play");
    refreshWeaponUi();
    showCoach(
      isTouchPrimary()
        ? "You are the glowing lantern. Drive through weapon crates, then tap Fire."
        : "You are the glowing lantern. WASD move · pick up weapons · Space to fire",
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

  function showBanner(text, seconds = 2.4) {
    if (!ui.banner) return;
    ui.banner.textContent = text;
    ui.banner.classList.remove("hidden");
    state.bannerTimer = seconds;
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
    let roll = kind;
    if (!roll) {
      if (t < 25) roll = "wisp";
      else if (Math.random() < Math.min(0.16, (t - 20) / 900)) roll = "brute";
      else if (Math.random() < 0.14) roll = "dart";
      else roll = "wisp";
    }

    if (roll === "boss") {
      state.enemies.push({
        kind: "boss",
        x,
        y,
        r: 34,
        hp: 180 + t * 1.35,
        maxHp: 180 + t * 1.35,
        speed: 66,
        damage: 16,
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
        hp: 28 + t * 0.1,
        maxHp: 28 + t * 0.1,
        speed: 72 + t * 0.018,
        damage: 10,
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
      hp: 12 + t * 0.06,
      maxHp: 12 + t * 0.06,
      speed: 95 + Math.max(0, t - 20) * 0.03,
      damage: 7,
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

  function floatText(x, y, text, color = "#f0b429", life = 0.8, big = false) {
    state.floats.push({ x, y, text, color, life, maxLife: life, big });
  }

  function fireWeapons(dt) {
    const p = state.player;
    p.fireTimer -= dt;
    if (p.fireTimer <= 0 && state.enemies.length) {
      p.fireTimer = p.fireCooldown;
      sfx.shoot();
      const rank = (e) => {
        if (!input.focus) return 0;
        if (e.kind === "boss") return 3000;
        if (e.kind === "brute") return 1500;
        if (e.kind === "dart") return 200;
        return 0;
      };
      const sorted = [...state.enemies].sort(
        (a, b) => dist(p, a) - rank(a) - (dist(p, b) - rank(b)),
      );
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
            hurtEnemy(e, p.damage * 0.35 * dt * 8, { sfx: false });
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

  function hurtEnemy(e, amount, opts = {}) {
    if (e.hp <= 0) return;
    e.hp -= amount;
    e.hitFlash = 0.08;
    if (opts.sfx !== false) {
      const now = state.time;
      if (!e._lastHitSfx || now - e._lastHitSfx > 0.08) {
        sfx.hit();
        e._lastHitSfx = now;
      }
    }
    if (e.hp <= 0) {
      killEnemy(e);
    }
  }

  function killEnemy(e) {
    e.hp = 0;
    state.kills += 1;
    state.killFlash = 0.08;
    sfx.kill();
    if (e.kind === "boss") {
      state.bossesDown += 1;
      showBanner("Bog crown fallen");
      state._pendingBossTactic = true;
    }
    let xpVal = e.xp;
    if (state.bloodrushKills > 0) {
      state.bloodrushKills -= 1;
      xpVal += 2;
    }
    state.gems.push({
      x: e.x,
      y: e.y,
      r: e.kind === "boss" ? 8 : 4,
      value: xpVal,
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
      sfx.level();
      if (!state.pausedChoice) offerLevelUp();
    } else {
      sfx.xp();
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
      btn.innerHTML = `
        <div class="tag">${choice.tag || "Upgrade"}</div>
        <h3>${choice.name}</h3>
        <p>${choice.desc}</p>
        <div class="strategy">Strategy: ${choice.strategy || "Solid general pick."}</div>
      `;
      btn.addEventListener("click", () => {
        choice.apply(state);
        state.buildLog.push(choice.name);
        showBanner(`${choice.name} — ${choice.tag}`);
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

  function offerTactic(reason) {
    if (state.ended || state.pausedChoice) return;
    const choices = shuffle([...TACTICS]).slice(0, 3);
    ui.tacticTitle.textContent = "Tactical choice";
    ui.tacticBody.textContent = reason;
    ui.tacticChoices.innerHTML = "";
    for (const choice of choices) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "card";
      btn.innerHTML = `
        <div class="tag">${choice.tag}</div>
        <h3>${choice.name}</h3>
        <p>${choice.desc}</p>
        <div class="strategy">Strategy: ${choice.strategy}</div>
      `;
      btn.addEventListener("click", () => {
        // revert temporary magnet buff bookkeeping before apply if needed
        choice.apply(state);
        state.buildLog.push(`Tactic: ${choice.name}`);
        showBanner(choice.name);
        state.pausedChoice = false;
        hide(ui.tactic);
        setMode("play");
        sfx.level();
      });
      ui.tacticChoices.appendChild(btn);
    }
    state.pausedChoice = true;
    setMode("tactic");
  }

  function renderPauseBuild() {
    if (!ui.pauseBuild || !state) return;
    if (!state.buildLog.length) {
      ui.pauseBuild.textContent = "No upgrades yet — level up by collecting gold XP orbs.";
      return;
    }
    ui.pauseBuild.innerHTML = state.buildLog
      .map((n) => `<span class="build-chip">${n}</span>`)
      .join(" ");
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function weaponLabel(kind) {
    if (kind === "nuke") return "NUKE";
    if (kind === "grenades") return "GRENADES";
    return "Empty";
  }

  function spawnWeaponPickup(kind) {
    const angle = rand(0, TAU);
    const distAway = rand(160, 320);
    state.weaponPickups.push({
      kind,
      x: state.player.x + Math.cos(angle) * distAway,
      y: state.player.y + Math.sin(angle) * distAway,
      r: kind === "nuke" ? 16 : 13,
      pulse: rand(0, TAU),
    });
    if (kind === "nuke") showBanner("Rare nuke crate appeared!", 1.6);
    else showBanner("Grenade crate nearby", 1.2);
  }

  function equipWeapon(kind) {
    state.player.equippedWeapon = kind;
    sfx.pickup();
    showBanner(`${weaponLabel(kind)} equipped!`, 1.4);
    floatText(state.player.x, state.player.y - 28, weaponLabel(kind), "#ffd39a", 1.2, true);
    refreshWeaponUi();
  }

  function fireEquippedWeapon() {
    const p = state.player;
    const kind = p.equippedWeapon;
    if (!kind) {
      if (!state._emptyWeaponBanner || state.time - state._emptyWeaponBanner > 1.2) {
        showBanner("No weapon loaded — drive through a crate", 1.2);
        state._emptyWeaponBanner = state.time;
      }
      return false;
    }
    if (kind === "nuke") {
      const foes = state.enemies.filter((e) => e.hp > 0);
      for (const e of foes) {
        hurtEnemy(e, 9999, { sfx: false });
      }
      // hard-suck every XP gem into the lantern
      state.nukeSuckTimer = 2.8;
      for (const g of state.gems) {
        const ang = Math.atan2(p.y - g.y, p.x - g.x);
        g.vx = Math.cos(ang) * 520;
        g.vy = Math.sin(ang) * 520;
      }
      state.shake = 22;
      addParticles(p.x, p.y, "#c084fc", 48, 340);
      addParticles(p.x, p.y, "#f0b429", 28, 260);
      sfx.nuke();
      showBanner("NUKE — field cleared!", 1.8);
      floatText(p.x, p.y - 36, "NUKE", "#e9d5ff", 1.4, true);
    } else if (kind === "grenades") {
      const damage = 95 * p.weaponDamage;
      const speed = 340;
      for (let i = 0; i < 5; i++) {
        const a = (TAU * i) / 5 - Math.PI / 2;
        state.grenades.push({
          x: p.x,
          y: p.y,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          r: 8,
          life: 0.55,
          damage,
          radius: p.grenadeRadius,
        });
      }
      sfx.grenade();
      showBanner("Star grenades away!", 1.2);
      addParticles(p.x, p.y, "#e07a2f", 18, 200);
    }
    p.equippedWeapon = null;
    refreshWeaponUi();
    return true;
  }

  function explodeGrenade(g) {
    addParticles(g.x, g.y, "#ff8a2a", 26, 260);
    addParticles(g.x, g.y, "#f0b429", 14, 180);
    state.shake = Math.max(state.shake, 10);
    sfx.boom();
    floatText(g.x, g.y - 12, "BOOM", "#ffd39a", 1.05, true);
    for (const e of state.enemies) {
      if (e.hp > 0 && dist(g, e) < g.radius + e.r) {
        hurtEnemy(e, g.damage);
      }
    }
  }

  function refreshWeaponUi() {
    const kind = state && state.player ? state.player.equippedWeapon : null;
    const loaded = !!kind;
    const label = weaponLabel(kind);
    if (ui.hudDash) {
      ui.hudDash.textContent = loaded ? label : "No weapon";
      ui.hudDash.classList.toggle("ready", loaded);
      ui.hudDash.title = loaded
        ? `${label} loaded — press Space / Fire to use`
        : "Drive through a weapon crate to equip one";
    }
    if (ui.dashFill) {
      ui.dashFill.style.width = loaded ? "100%" : "0%";
      ui.dashFill.classList.toggle("nuke", kind === "nuke");
      ui.dashFill.classList.toggle("grenades", kind === "grenades");
    }
    if (ui.dashBtn) {
      ui.dashBtn.disabled = !loaded;
      ui.dashBtn.classList.toggle("cooling", !loaded);
      ui.dashBtn.classList.toggle("loaded-nuke", kind === "nuke");
      ui.dashBtn.classList.toggle("loaded-grenades", kind === "grenades");
      const sub =
        kind === "nuke"
          ? "clear field"
          : kind === "grenades"
            ? "star blast"
            : "pick up crate";
      ui.dashBtn.innerHTML = `${label}<span class="dash-sub">${sub}</span>`;
      ui.dashBtn.title = loaded
        ? `Fire ${label}`
        : "No weapon loaded — drive through a crate first";
    }
  }

  function hurtPlayer(amount, source) {
    const p = state.player;
    if (p.invuln > 0) return;
    const dmg = amount * (1 - Math.min(0.55, p.armor));
    p.hp -= dmg;
    p.invuln = 0.65;
    state.shake = 8;
    state.hurtFlash = 0.22;
    sfx.hurt();
    floatText(p.x, p.y - 18, `-${Math.ceil(dmg)}`, "#e07a2f");
    addParticles(p.x, p.y, "#e07a2f", 8, 90);
    if (p.thorns > 0 && source) {
      hurtEnemy(source, p.thorns);
    }
    if (p.hp <= 0) {
      p.hp = 0;
      sfx.death();
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

    if (mag > 0.1) p.facing = Math.atan2(my, mx);

    p.x += mx * p.speed * dt;
    p.y += my * p.speed * dt;

    // pick up crates before firing so drive-through + Fire can land same frame
    for (const w of state.weaponPickups) {
      w.pulse += dt * 4;
      if (dist(p, w) < p.r + w.r + 8) {
        w._taken = true;
        equipWeapon(w.kind);
      }
    }
    state.weaponPickups = state.weaponPickups.filter((w) => !w._taken);

    if (input.dash) {
      fireEquippedWeapon();
      input.dash = false;
    }

    p.invuln = Math.max(0, p.invuln - dt);
    if (state.nukeSuckTimer > 0) state.nukeSuckTimer = Math.max(0, state.nukeSuckTimer - dt);
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
      const early = state.time < 35;
      const count = early ? 1 : 1 + ((state.time / 95) | 0);
      for (let i = 0; i < count; i++) spawnEnemy();
      state.spawnTimer = early
        ? 1.05
        : Math.max(0.22, 0.95 / density);
    }
    if (state.time >= state.nextBossAt) {
      spawnEnemy("boss");
      state.nextBossAt += 90;
      showBanner("Bog crown approaches!");
      sfx.boss();
      floatText(p.x, p.y - 40, "A bog crown stirs", "#e07a2f");
    }

    // special weapon crates
    if (state.time >= state.nextGrenadePickupAt) {
      state.nextGrenadePickupAt += 20;
      spawnWeaponPickup("grenades");
    }
    if (state.time >= state.nextNukeAt) {
      state.nextNukeAt += 60;
      spawnWeaponPickup("nuke");
    }
    if (state.bannerTimer > 0) {
      state.bannerTimer -= dt;
      if (state.bannerTimer <= 0 && ui.banner) ui.banner.classList.add("hidden");
    }
    state.killFlash = Math.max(0, state.killFlash - dt);

    if (state.buffTimer > 0) {
      state.buffTimer -= dt;
      if (state.buffTimer <= 0) {
        if (state.buffLabel === "Overburn" && state._overburnMult) {
          state.player.damage /= state._overburnMult;
          state._overburnMult = 0;
        }
        state.buffLabel = "";
      }
    }
    if (state.magnetBuffTimer > 0) {
      state.magnetBuffTimer -= dt;
      if (state.magnetBuffTimer <= 0) {
        if (state._magnetBeforeHarvest) {
          state.player.magnet = state._magnetBeforeHarvest;
          state._magnetBeforeHarvest = 0;
        }
      }
    }

    if (!state.spawnedFocusBrute && state.time >= 18) {
      state.spawnedFocusBrute = true;
      spawnEnemy("brute");
      showCoach("Triangle brute! Hold F to FOCUS it, or save a grenade crate for it.");
      showBanner("Hold F — focus the brute");
    }

    if (state.time >= state.nextTacticAt && !state.pausedChoice) {
      state.nextTacticAt += 50;
      offerTactic("A fork in the marsh — choose a short-term plan.");
    } else if (state._pendingBossTactic && !state.pausedChoice) {
      state._pendingBossTactic = false;
      offerTactic("Boss down. Claim a tactical reward.");
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

    // star grenades
    for (const g of state.grenades) {
      g.x += g.vx * dt;
      g.y += g.vy * dt;
      g.life -= dt;
      g.vx *= 0.985;
      g.vy *= 0.985;
      let hit = false;
      for (const e of state.enemies) {
        if (e.hp > 0 && dist(g, e) < g.r + e.r) {
          hit = true;
          break;
        }
      }
      if (hit || g.life <= 0) {
        g._boom = true;
        explodeGrenade(g);
      }
    }
    state.grenades = state.grenades.filter((g) => !g._boom);

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
      g.vx *= state.nukeSuckTimer > 0 ? 0.98 : 0.9;
      g.vy *= state.nukeSuckTimer > 0 ? 0.98 : 0.9;
      g.x += g.vx * dt;
      g.y += g.vy * dt;
      const d = dist(p, g);
      const magnetRange = state.nukeSuckTimer > 0 ? 4000 : p.magnet;
      if (d < magnetRange) {
        const pull = state.nukeSuckTimer > 0 ? 1 : (p.magnet - d) / p.magnet;
        const ang = Math.atan2(p.y - g.y, p.x - g.x);
        const force = state.nukeSuckTimer > 0 ? 980 : 380 * pull;
        g.x += Math.cos(ang) * force * dt;
        g.y += Math.sin(ang) * force * dt;
      }
      if (d < p.r + g.r + 6) {
        g._collected = true;
        gainXp(g.value);
        if (state.nukeSuckTimer > 0) sfx.xp();
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
    ui.hudHp.textContent = `${Math.ceil(p.hp)} / ${Math.ceil(p.maxHp)} light`;
    ui.hudHp.classList.toggle("danger", p.hp / p.maxHp < 0.3);
    ui.hudKills.textContent = `${state.kills} kills`;
    ui.hudLevel.textContent = `Lv ${p.level}`;
    ui.xpFill.style.width = `${(p.xp / p.nextXp) * 100}%`;
    if (ui.hudFocus) {
      ui.hudFocus.classList.toggle("hidden", !input.focus);
    }
    refreshWeaponUi();

    // Short onboarding tips for the first half-minute
    if (state.coachStep === 0 && state.time > 4) {
      state.coachStep = 1;
      showCoach("Green hurts on touch. Keep moving and watch for weapon crates.");
    } else if (state.coachStep === 1 && state.kills >= 1) {
      state.coachStep = 2;
      showCoach("Gold orbs = XP. Hold F to focus brutes/bosses.");
    } else if (state.coachStep === 2 && state.time >= 18) {
      state.coachStep = 3;
      showCoach("Green ring mark → grenades. Blue mark → nuke. Drive through the crate, then Fire.");
    } else if (state.coachStep === 3 && state.player.level >= 2) {
      state.coachStep = 4;
      showCoach("Level up! Read the Strategy tip — stack one build path.");
    } else if (state.coachStep === 4 && state.time > 34) {
      state.coachStep = 5;
      hideCoach();
    } else if (state.coachStep < 4 && state.time > 40) {
      state.coachStep = 5;
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

  function hash2(ix, iy) {
    let n = ix * 374761393 + iy * 668265263;
    n = (n ^ (n >> 13)) * 1274126177;
    return ((n ^ (n >> 16)) >>> 0) / 4294967295;
  }

  function drawGround(w, h) {
    // photographic marsh floor
    if (groundReady) {
      const tile = 420;
      const camX = state.camera.x;
      const camY = state.camera.y;
      const minTX = Math.floor((camX - w) / tile) - 1;
      const maxTX = Math.floor((camX + w) / tile) + 1;
      const minTY = Math.floor((camY - h) / tile) - 1;
      const maxTY = Math.floor((camY + h) / tile) + 1;
      for (let ty = minTY; ty <= maxTY; ty++) {
        for (let tx = minTX; tx <= maxTX; tx++) {
          const s = worldToScreen(tx * tile, ty * tile);
          ctx.save();
          ctx.globalAlpha = 0.55;
          ctx.drawImage(groundImg, s.x, s.y, tile + 2, tile + 2);
          ctx.restore();
        }
      }
      // cool green grade over photo
      ctx.fillStyle = "rgba(10, 28, 18, 0.55)";
      ctx.fillRect(0, 0, w, h);
    } else {
      const base = ctx.createLinearGradient(0, 0, w, h);
      base.addColorStop(0, "#0e1a14");
      base.addColorStop(0.45, "#15261c");
      base.addColorStop(1, "#0a120e");
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, w, h);
    }

    const camX = state.camera.x;
    const camY = state.camera.y;
    const tile = 88;
    const minTX = Math.floor((camX - w) / tile) - 1;
    const maxTX = Math.floor((camX + w) / tile) + 1;
    const minTY = Math.floor((camY - h) / tile) - 1;
    const maxTY = Math.floor((camY + h) / tile) + 1;

    for (let ty = minTY; ty <= maxTY; ty++) {
      for (let tx = minTX; tx <= maxTX; tx++) {
        const n = hash2(tx, ty);
        const wx = tx * tile + n * 36;
        const wy = ty * tile + hash2(ty, tx) * 36;
        const s = worldToScreen(wx, wy);
        if (s.x < -90 || s.y < -90 || s.x > w + 90 || s.y > h + 90) continue;

        if (n > 0.5) {
          ctx.fillStyle = n > 0.8 ? "rgba(40, 70, 78, 0.55)" : "rgba(70, 52, 28, 0.4)";
          safeEllipse(s.x, s.y, 22 + n * 30, 12 + n * 14, n * 2);
          ctx.fill();
        }

        if (n < 0.4 || n > 0.86) {
          const blades = 5 + ((n * 10) | 0) % 4;
          for (let b = 0; b < blades; b++) {
            const sway = Math.sin(state.time * 1.4 + tx + b) * 5;
            const bx = s.x - 12 + b * 6;
            const by = s.y + 10;
            ctx.strokeStyle = `rgba(${40 + b * 12}, ${110 + b * 14}, ${55 + b * 8}, 0.88)`;
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(bx, by);
            ctx.quadraticCurveTo(bx + sway, by - 20, bx + sway * 1.6, by - 40 - (b % 3) * 6);
            ctx.stroke();
            ctx.fillStyle = "rgba(150, 110, 45, 0.85)";
            safeEllipse(bx + sway * 1.6, by - 40 - (b % 3) * 6, 2, 4, 0);
            ctx.fill();
          }
        }
      }
    }
  }

  function safeEllipse(x, y, rx, ry, rot = 0) {
    ctx.beginPath();
    if (typeof ctx.ellipse === "function") {
      ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
    } else {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.scale(rx, ry);
      ctx.arc(0, 0, 1, 0, TAU);
      ctx.restore();
    }
  }

  function drawShadow(x, y, rx, ry, alpha = 0.35) {
    ctx.fillStyle = `rgba(0,0,0,${alpha})`;
    safeEllipse(x, y + ry * 0.9, rx, ry * 0.35, 0);
    ctx.fill();
  }

  function drawLantern(ps, p) {
    const flicker = 0.88 + Math.sin(state.time * 18) * 0.07 + Math.sin(state.time * 29) * 0.04;

    // big warm ground pool so you always spot yourself
    const pool = ctx.createRadialGradient(ps.x, ps.y + 18, 6, ps.x, ps.y + 18, 210 * flicker);
    pool.addColorStop(0, `rgba(255, 210, 110, ${0.55 * flicker})`);
    pool.addColorStop(0.25, `rgba(255, 170, 60, ${0.22 * flicker})`);
    pool.addColorStop(0.65, `rgba(255, 140, 40, 0.08)`);
    pool.addColorStop(1, "rgba(255,140,40,0)");
    ctx.fillStyle = pool;
    ctx.beginPath();
    ctx.arc(ps.x, ps.y + 18, 210 * flicker, 0, TAU);
    ctx.fill();

    drawShadow(ps.x, ps.y + 22, 28, 14, 0.45);

    ctx.save();
    ctx.translate(ps.x, ps.y);
    ctx.scale(2.1, 2.1);

    // ring plate under lantern
    ctx.fillStyle = "rgba(255, 200, 90, 0.2)";
    safeEllipse(0, 16, 14, 5, 0);
    ctx.fill();

    // handle
    ctx.strokeStyle = "#5a3a16";
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.arc(0, -13, 8, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();

    // top cap
    const cap = ctx.createLinearGradient(-9, -10, 9, 0);
    cap.addColorStop(0, "#6e4518");
    cap.addColorStop(0.5, "#e0a84a");
    cap.addColorStop(1, "#7a4a1a");
    ctx.fillStyle = cap;
    ctx.beginPath();
    ctx.moveTo(-9, -9);
    ctx.lineTo(9, -9);
    ctx.lineTo(7, -2);
    ctx.lineTo(-7, -2);
    ctx.closePath();
    ctx.fill();

    // glass
    const glass = ctx.createLinearGradient(-8, -1, 9, 14);
    glass.addColorStop(0, "rgba(255,245,200,0.75)");
    glass.addColorStop(0.45, "rgba(255,190,80,0.45)");
    glass.addColorStop(1, "rgba(160,90,30,0.55)");
    ctx.fillStyle = glass;
    ctx.beginPath();
    ctx.moveTo(-8, -1);
    ctx.lineTo(8, -1);
    ctx.lineTo(7, 13);
    ctx.lineTo(-7, 13);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,230,0.55)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // bright flame core
    const flameH = 9 + flicker * 5;
    const flame = ctx.createRadialGradient(0, 3, 0.4, 0, 3, flameH);
    flame.addColorStop(0, "#fffce8");
    flame.addColorStop(0.35, "#ffd056");
    flame.addColorStop(0.75, "#ff8a2a");
    flame.addColorStop(1, "rgba(255,80,0,0)");
    ctx.fillStyle = flame;
    ctx.beginPath();
    ctx.moveTo(0, 3 - flameH);
    ctx.quadraticCurveTo(5, 3, 0, 8);
    ctx.quadraticCurveTo(-5, 3, 0, 3 - flameH);
    ctx.fill();

    // brass cage lines
    ctx.strokeStyle = "rgba(90, 55, 20, 0.65)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -1);
    ctx.lineTo(0, 13);
    ctx.moveTo(-4, -1);
    ctx.lineTo(-3.5, 13);
    ctx.moveTo(4, -1);
    ctx.lineTo(3.5, 13);
    ctx.stroke();

    // base
    const base = ctx.createLinearGradient(-8, 13, 8, 20);
    base.addColorStop(0, "#5a3612");
    base.addColorStop(0.5, "#c48932");
    base.addColorStop(1, "#4a2c10");
    ctx.fillStyle = base;
    ctx.fillRect(-8, 13, 16, 5);
    ctx.fillStyle = "#3a220c";
    ctx.fillRect(-6, 18, 12, 3);

    ctx.restore();

    // hp ring
    ctx.strokeStyle = "rgba(215,228,213,0.25)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(ps.x, ps.y, 34, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = "#f0b429";
    ctx.beginPath();
    ctx.arc(ps.x, ps.y, 34, -Math.PI / 2, -Math.PI / 2 + TAU * (p.hp / p.maxHp));
    ctx.stroke();

    drawCrateDirectionHints(ps, p);
  }

  function drawCrateDirectionHints(ps, p) {
    if (!state.weaponPickups || !state.weaponPickups.length) return;
    const ringR = 38;
    for (let i = 0; i < state.weaponPickups.length; i++) {
      const w = state.weaponPickups[i];
      const ang = Math.atan2(w.y - p.y, w.x - p.x);
      const color = w.kind === "nuke" ? "#3b82f6" : "#22c55e";
      const pulse = 0.7 + Math.sin(state.time * 6 + i) * 0.25;

      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(ps.x, ps.y, ringR, ang - 0.28, ang + 0.28);
      ctx.stroke();

      // arrow tip outside the ring, pointing at the crate
      const tip = ringR + 12;
      const tx = ps.x + Math.cos(ang) * tip;
      const ty = ps.y + Math.sin(ang) * tip;
      const left = ang + 2.5;
      const right = ang - 2.5;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(ps.x + Math.cos(left) * (ringR + 2), ps.y + Math.sin(left) * (ringR + 2));
      ctx.lineTo(ps.x + Math.cos(right) * (ringR + 2), ps.y + Math.sin(right) * (ringR + 2));
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  function drawEnemy(e, s) {
    const flash = e.hitFlash && e.hitFlash > 0;
    if (e.hitFlash) e.hitFlash = Math.max(0, e.hitFlash - 0.016);
    const bob = Math.sin(e.pulse) * 2;
    drawShadow(s.x, s.y + 4, e.r * 0.95, e.r * 0.55, 0.32);

    ctx.save();
    ctx.translate(s.x, s.y + bob);
    ctx.scale(1.15, 1.15);

    if (e.kind === "wisp") {
      const body = ctx.createRadialGradient(0, 0, 2, 0, 0, e.r + 6);
      body.addColorStop(0, flash ? "#f4efe4" : "rgba(190,230,190,0.9)");
      body.addColorStop(0.5, flash ? "#dfe8d0" : "rgba(90,140,95,0.75)");
      body.addColorStop(1, "rgba(40,80,50,0)");
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(0, 0, e.r + 6, 0, TAU);
      ctx.fill();
      // trailing smoke
      for (let i = 0; i < 3; i++) {
        const a = e.pulse + i * 0.8;
        ctx.globalAlpha = 0.25;
        ctx.beginPath();
        ctx.fillStyle = "#6f9a72";
        ctx.arc(Math.cos(a) * 6, 8 + i * 3, 3 - i * 0.5, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      // eyes
      ctx.fillStyle = "#0c160f";
      ctx.beginPath();
      ctx.arc(-3, -1, 1.4, 0, TAU);
      ctx.arc(3, -1, 1.4, 0, TAU);
      ctx.fill();
    } else if (e.kind === "dart") {
      const ang = Math.atan2(state.player.y - e.y, state.player.x - e.x);
      ctx.rotate(ang);
      ctx.fillStyle = "rgba(180,220,190,0.4)";
      safeEllipse(-2, -5, 7, 3, -0.4);
      ctx.fill();
      safeEllipse(-2, 5, 7, 3, 0.4);
      ctx.fill();
      const body = ctx.createLinearGradient(-8, 0, 10, 0);
      body.addColorStop(0, flash ? "#f4efe4" : "#3d6b52");
      body.addColorStop(1, flash ? "#ddd" : "#8fd0a8");
      ctx.fillStyle = body;
      safeEllipse(0, 0, e.r + 2, e.r * 0.55, 0);
      ctx.fill();
      ctx.fillStyle = "#163226";
      ctx.beginPath();
      ctx.arc(6, 0, 1.5, 0, TAU);
      ctx.fill();
    } else if (e.kind === "brute") {
      // mossy hulking shape
      ctx.fillStyle = flash ? "#e8e0d0" : "#2f4f38";
      ctx.beginPath();
      ctx.moveTo(0, -e.r - 2);
      ctx.quadraticCurveTo(e.r + 4, -4, e.r, e.r * 0.75);
      ctx.quadraticCurveTo(0, e.r + 4, -e.r, e.r * 0.75);
      ctx.quadraticCurveTo(-e.r - 4, -4, 0, -e.r - 2);
      ctx.fill();
      // moss clumps
      ctx.fillStyle = "#4f7a52";
      ctx.beginPath();
      ctx.arc(-6, -4, 4, 0, TAU);
      ctx.arc(5, -6, 3.5, 0, TAU);
      ctx.arc(0, 2, 5, 0, TAU);
      ctx.fill();
      // eyes
      ctx.fillStyle = "#f0b429";
      ctx.beginPath();
      ctx.arc(-4, -2, 2.2, 0, TAU);
      ctx.arc(5, -2, 2.2, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#1a1008";
      ctx.beginPath();
      ctx.arc(-4, -2, 1, 0, TAU);
      ctx.arc(5, -2, 1, 0, TAU);
      ctx.fill();
    } else if (e.kind === "boss") {
      const body = ctx.createRadialGradient(-6, -8, 4, 0, 0, e.r + 4);
      body.addColorStop(0, flash ? "#f2d2b0" : "#8a4020");
      body.addColorStop(0.6, flash ? "#d9a070" : "#5a2814");
      body.addColorStop(1, "#2a140c");
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(0, 0, e.r, 0, TAU);
      ctx.fill();
      // crown of roots
      ctx.strokeStyle = "#c45c26";
      ctx.lineWidth = 3;
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 7, -e.r + 4);
        ctx.lineTo(i * 8, -e.r - 10 - Math.abs(i));
        ctx.stroke();
      }
      // eye
      ctx.fillStyle = "#f0b429";
      ctx.beginPath();
      ctx.arc(0, -4, 6, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#1a0c08";
      ctx.beginPath();
      ctx.arc(0, -4, 2.5, 0, TAU);
      ctx.fill();
      // aura
      ctx.strokeStyle = `rgba(224,122,47,${0.45 + Math.sin(e.pulse) * 0.2})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, e.r + 6 + Math.sin(e.pulse) * 3, 0, TAU);
      ctx.stroke();
    }

    ctx.restore();

    if (e.kind === "boss" || e.hp < e.maxHp) {
      const pct = clamp(e.hp / e.maxHp, 0, 1);
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(s.x - e.r, s.y - e.r - 16, e.r * 2, 5);
      const bar = ctx.createLinearGradient(s.x - e.r, 0, s.x + e.r, 0);
      bar.addColorStop(0, "#c45c26");
      bar.addColorStop(1, "#f0b429");
      ctx.fillStyle = bar;
      ctx.fillRect(s.x - e.r, s.y - e.r - 16, e.r * 2 * pct, 5);
    }
  }

  function drawGem(g, s) {
    drawShadow(s.x, s.y + 2, g.r + 2, 3, 0.25);
    const glow = ctx.createRadialGradient(s.x, s.y, 1, s.x, s.y, g.r * 3);
    glow.addColorStop(0, "rgba(255,220,120,0.8)");
    glow.addColorStop(1, "rgba(255,180,40,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(s.x, s.y, g.r * 3, 0, TAU);
    ctx.fill();
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = "#ffd76a";
    ctx.fillRect(-g.r, -g.r, g.r * 2, g.r * 2);
    ctx.fillStyle = "rgba(255,255,240,0.55)";
    ctx.fillRect(-g.r * 0.4, -g.r, g.r * 0.45, g.r * 2);
    ctx.restore();
  }

  function drawBullet(b, s) {
    const ang = Math.atan2(b.vy, b.vx);
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(ang);
    const streak = ctx.createLinearGradient(-10, 0, 8, 0);
    streak.addColorStop(0, "rgba(255,200,80,0)");
    streak.addColorStop(0.6, "rgba(255,220,120,0.85)");
    streak.addColorStop(1, "#fff6d0");
    ctx.fillStyle = streak;
    safeEllipse(0, 0, 10, 3.2, 0);
    ctx.fill();
    ctx.restore();
  }

  function drawWeaponPickup(wpn, s) {
    const bob = Math.sin(wpn.pulse) * 4;
    const nuke = wpn.kind === "nuke";
    const col = nuke ? "#c084fc" : "#e07a2f";
    drawShadow(s.x, s.y + 6, wpn.r + 4, 5, 0.3);
    const glow = ctx.createRadialGradient(s.x, s.y + bob, 2, s.x, s.y + bob, wpn.r * 3.2);
    glow.addColorStop(0, nuke ? "rgba(220,180,255,0.85)" : "rgba(255,180,90,0.85)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(s.x, s.y + bob, wpn.r * 3.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = col;
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(s.x - wpn.r, s.y + bob - wpn.r, wpn.r * 2, wpn.r * 2, 4);
    } else {
      ctx.rect(s.x - wpn.r, s.y + bob - wpn.r, wpn.r * 2, wpn.r * 2);
    }
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,240,0.7)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#142019";
    ctx.font = `800 ${nuke ? 10 : 9}px Outfit, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(nuke ? "NUKE" : "★5", s.x, s.y + bob);
  }

  function drawGrenade(g, s) {
    const glow = ctx.createRadialGradient(s.x, s.y, 1, s.x, s.y, 14);
    glow.addColorStop(0, "rgba(255,220,120,0.95)");
    glow.addColorStop(0.5, "rgba(224,122,47,0.7)");
    glow.addColorStop(1, "rgba(224,122,47,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 14, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#ffb040";
    ctx.beginPath();
    ctx.arc(s.x, s.y, g.r, 0, TAU);
    ctx.fill();
  }

  function drawDarkness(w, h, ps, p) {
    // Soft night veil without destination-out (more reliable on iOS)
    const flicker = 0.92 + Math.sin(state.time * 19) * 0.04;
    const r = (240 + p.orbit * 12) * flicker;
    const veil = ctx.createRadialGradient(ps.x, ps.y, r * 0.15, ps.x, ps.y, r);
    veil.addColorStop(0, "rgba(4, 8, 6, 0)");
    veil.addColorStop(0.45, "rgba(4, 8, 6, 0.08)");
    veil.addColorStop(0.75, "rgba(4, 8, 6, 0.34)");
    veil.addColorStop(1, "rgba(4, 8, 6, 0.58)");
    ctx.fillStyle = veil;
    ctx.fillRect(0, 0, w, h);
  }

  function draw() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    ctx.clearRect(0, 0, w, h);

    if (!state) {
      // richer idle background
      const grad = ctx.createRadialGradient(w * 0.5, h * 0.4, 20, w * 0.5, h * 0.5, Math.max(w, h) * 0.75);
      grad.addColorStop(0, "#243829");
      grad.addColorStop(0.5, "#121c16");
      grad.addColorStop(1, "#070b09");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      drawIdleDecor(w, h);
      return;
    }

    drawGround(w, h);

    // distant fireflies in world space-ish
    for (let i = 0; i < 26; i++) {
      const fx = state.camera.x + Math.sin(state.time * 0.35 + i * 2.1) * w * 0.55;
      const fy = state.camera.y + Math.cos(state.time * 0.28 + i * 1.7) * h * 0.45;
      const s = worldToScreen(fx, fy);
      const a = 0.15 + (Math.sin(state.time * 3 + i) * 0.5 + 0.5) * 0.35;
      ctx.beginPath();
      ctx.fillStyle = `rgba(255,210,100,${a})`;
      ctx.arc(s.x, s.y, 1.5 + (i % 3) * 0.6, 0, TAU);
      ctx.fill();
    }

    // gems
    for (const g of state.gems) {
      drawGem(g, worldToScreen(g.x, g.y));
    }

    // weapon crates
    for (const wpn of state.weaponPickups) {
      drawWeaponPickup(wpn, worldToScreen(wpn.x, wpn.y));
    }

    // star grenades
    for (const g of state.grenades) {
      drawGrenade(g, worldToScreen(g.x, g.y));
    }

    // bullets
    for (const b of state.bullets) {
      drawBullet(b, worldToScreen(b.x, b.y));
    }

    // enemies
    for (const e of state.enemies) {
      drawEnemy(e, worldToScreen(e.x, e.y));
    }

    // orbit sparks
    const p = state.player;
    if (p.orbit > 0) {
      const sparks = p.orbit + 2;
      const orbitR = 42 + p.orbit * 8;
      for (let i = 0; i < sparks; i++) {
        const a = state.time * (1.8 + p.orbit * 0.15) + (TAU * i) / sparks;
        const s = worldToScreen(p.x + Math.cos(a) * orbitR, p.y + Math.sin(a) * orbitR);
        const og = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 7);
        og.addColorStop(0, "#fff2c0");
        og.addColorStop(1, "rgba(255,180,60,0)");
        ctx.fillStyle = og;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 7, 0, TAU);
        ctx.fill();
      }
    }

    const ps = worldToScreen(p.x, p.y);

    // particles under the lantern
    for (const part of state.particles) {
      const s = worldToScreen(part.x, part.y);
      ctx.globalAlpha = clamp(part.life / part.max, 0, 1);
      ctx.fillStyle = part.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, part.r, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // night wash first...
    try {
      drawDarkness(w, h, ps, p);
    } catch (err) {
      console.error("darkness", err);
    }
    // ...then lantern on TOP so you can always see yourself
    try {
      drawLantern(ps, p);
    } catch (err) {
      console.error("lantern", err);
      // failsafe beacon
      ctx.fillStyle = "#f0b429";
      ctx.beginPath();
      ctx.arc(ps.x, ps.y, 26, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "800 16px Outfit, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("YOU", ps.x, ps.y - 36);
    }

    // ultra-visible center marker (first 12s)
    if (state.time < 12) {
      ctx.save();
      ctx.strokeStyle = "rgba(255, 220, 120, 0.85)";
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.arc(ps.x, ps.y, 48 + Math.sin(state.time * 6) * 4, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // floats above everything
    ctx.textAlign = "center";
    for (const f of state.floats) {
      const s = worldToScreen(f.x, f.y);
      const maxL = f.maxLife || 0.8;
      ctx.globalAlpha = clamp(f.life / maxL, 0, 1);
      ctx.font = f.big ? "800 20px Outfit, sans-serif" : "600 14px Outfit, sans-serif";
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, s.x, s.y);
      ctx.globalAlpha = 1;
    }

    if (input.focus) {
      ctx.strokeStyle = "rgba(224,122,47,0.95)";
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.arc(ps.x, ps.y, p.r + 22, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = "800 16px Outfit, sans-serif";
      ctx.fillStyle = "#ffd39a";
      ctx.textAlign = "center";
      ctx.fillText("FOCUS", ps.x, ps.y - p.r - 30);
      const focusTarget = [...state.enemies]
        .filter((e) => e.hp > 0)
        .sort((a, b) => {
          const rank = (e) => (e.kind === "boss" ? 3000 : e.kind === "brute" ? 1500 : 0);
          return dist(p, a) - rank(a) - (dist(p, b) - rank(b));
        })[0];
      if (focusTarget) {
        const ts = worldToScreen(focusTarget.x, focusTarget.y);
        ctx.strokeStyle = "#f0b429";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(ts.x, ts.y, focusTarget.r + 12, 0, TAU);
        ctx.stroke();
        ctx.font = "700 13px Outfit, sans-serif";
        ctx.fillStyle = "#f0b429";
        ctx.fillText("TARGET", ts.x, ts.y - focusTarget.r - 16);
      }
    }

    if (state.hurtFlash > 0) {
      ctx.fillStyle = `rgba(224, 122, 47, ${state.hurtFlash * 0.45})`;
      ctx.fillRect(0, 0, w, h);
    }
    if (state.player.hp / state.player.maxHp < 0.3) {
      ctx.fillStyle = "rgba(120, 30, 10, 0.16)";
      ctx.fillRect(0, 0, w, h);
    }
  }

  function drawIdleDecor(w, h) {
    for (let i = 0; i < 40; i++) {
      const x = (Math.sin(i * 12.1 + performance.now() * 0.0003) * 0.5 + 0.5) * w;
      const y = (Math.cos(i * 8.4 + performance.now() * 0.0004) * 0.5 + 0.5) * h;
      ctx.beginPath();
      ctx.fillStyle = `rgba(240,180,41,${0.06 + (i % 4) * 0.03})`;
      ctx.arc(x, y, 1.5 + (i % 3), 0, TAU);
      ctx.fill();
    }
    // idle lantern silhouette in center
    const lx = w * 0.5;
    const ly = h * 0.42;
    const glow = ctx.createRadialGradient(lx, ly, 4, lx, ly, 120);
    glow.addColorStop(0, "rgba(240,180,41,0.28)");
    glow.addColorStop(1, "rgba(240,180,41,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(lx, ly, 120, 0, TAU);
    ctx.fill();
  }


  function frame(ts) {
    const dt = Math.min(0.033, (ts - lastTs) / 1000 || 0.016);
    lastTs = ts;
    if (mode === "play") update(dt);
    window.__lanternFocus = !!(input && input.focus);
    if (window.LanternCGI && window.LanternCGI.ready()) {
      window.LanternCGI.sync(state, mode);
    } else {
      draw();
    }
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
    if ((k === " " || k === "shift") && !e.repeat) input.dash = true;
    if (k === "f") input.focus = true;
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
    if (k === "f") input.focus = false;
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

  if (ui.stick) {
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
        if (ui.stickKnob) ui.stickKnob.style.transform = "translate(0,0)";
      }
    }
    ui.stick.addEventListener("pointerup", endStick);
    ui.stick.addEventListener("pointercancel", endStick);
  }

  on(ui.dashBtn, "click", () => {
    input.dash = true;
  });

  // Play always starts the game. Tutorial is optional via How to play.
  on("btn-start", "click", () => {
    markTutorialSeen();
    startRun();
  });
  on("btn-tutorial", "click", () => openTutorial(true));
  on("btn-pause-help", "click", () => {
    if (state) state._returnToPause = true;
    openTutorial(true);
  });
  on("btn-tut-next", "click", () => {
    if (tutorialIndex < TUTORIAL_STEPS.length - 1) {
      tutorialIndex += 1;
      renderTutorial();
      return;
    }
    markTutorialSeen();
    if (state && state._returnToPause && !state.ended) {
      state._returnToPause = false;
      setMode("pause");
      return;
    }
    startRun();
  });
  on("btn-tut-back", "click", () => {
    if (tutorialIndex > 0) {
      tutorialIndex -= 1;
      renderTutorial();
    }
  });
  on("btn-tut-skip", "click", () => {
    markTutorialSeen();
    if (state && state._returnToPause && !state.ended) {
      state._returnToPause = false;
      setMode("pause");
    } else {
      setMode("title");
    }
  });
  function refreshMuteUi() {
    const label = meta.muted ? "Sound off" : "Sound on";
    const hud = document.getElementById("btn-mute");
    const title = document.getElementById("btn-mute-title");
    if (hud) hud.textContent = meta.muted ? "Muted" : "Sound";
    if (title) title.textContent = label;
  }

  function toggleMute() {
    meta.muted = !meta.muted;
    saveMeta();
    refreshMuteUi();
    if (!meta.muted) {
      ensureAudio();
      sfx.xp();
    }
  }

  on("btn-mute", "click", toggleMute);
  on("btn-mute-title", "click", toggleMute);

  on("btn-hud-pause", "click", () => {
    if (mode === "play" && state && !state.ended && !state.pausedChoice) {
      setMode("pause");
    }
  });

  window.addEventListener(
    "pointerdown",
    () => {
      ensureAudio();
    },
    { once: true },
  );
  on("btn-again", "click", startRun);
  on("btn-menu", "click", () => setMode("title"));
  on("btn-upgrades", "click", () => setMode("shop"));
  on("btn-shop-back", "click", () => setMode("title"));
  on("btn-resume", "click", () => setMode("play"));
  on("btn-quit", "click", () => endRun(true));

  window.addEventListener("resize", resize);

  try {
    if (window.LanternCGI) {
      window.LanternCGI.init(document.getElementById("app"));
    }
    resize();
    refreshMetaUi();
    refreshMuteUi();
    setMode("title");
    lastTs = performance.now();
    animId = requestAnimationFrame(frame);
  } catch (err) {
    console.error(err);
    const crash = document.createElement("div");
    crash.style.cssText =
      "position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:24px;background:#0b1210;color:#f4efe4;font:600 18px Outfit,sans-serif;text-align:center";
    crash.textContent = "Game failed to start. Hard refresh (Ctrl+Shift+R) and try again.";
    document.body.appendChild(crash);
  }

  window.__lanternDebug = {
    getState: () => state,
    spawnWeapon: (kind) => {
      if (!state) return false;
      spawnWeaponPickup(kind === "nuke" ? "nuke" : "grenades");
      return true;
    },
    fire: () => fireEquippedWeapon(),
  };
})();
