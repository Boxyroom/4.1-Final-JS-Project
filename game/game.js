(() => {
  "use strict";

  const STORAGE_KEY = "lantern-hollow-v1";
  const TAU = Math.PI * 2;

  let audioCtx = null;
  let masterGain = null;
  const sampleBuffers = Object.create(null);
  const sampleRaw = Object.create(null);
  const SFX_FILES = [
    "shoot",
    "hit",
    "kill",
    "xp",
    "level",
    "hurt",
    "dash",
    "pickup",
    "nuke",
    "nuke2",
    "grenade",
    "boom",
    "boom2",
    "nova",
    "spark",
    "boss",
    "death",
  ];

  function sfxDir() {
    const path = (location.pathname || "").replace(/\\/g, "/");
    if (path.includes("/game") && !/lantern\.html$/i.test(path)) return "assets/sfx/";
    return "game/assets/sfx/";
  }

  function prefetchSfx() {
    const base = sfxDir();
    SFX_FILES.forEach((name) => {
      if (sampleRaw[name] || sampleBuffers[name]) return;
      fetch(base + name + ".ogg")
        .then((r) => {
          if (!r.ok) throw new Error("sfx " + name);
          return r.arrayBuffer();
        })
        .then((buf) => {
          sampleRaw[name] = buf;
          if (audioCtx) decodeSfx(name);
        })
        .catch(() => {});
    });
  }

  function decodeSfx(name) {
    if (!audioCtx || sampleBuffers[name] || !sampleRaw[name]) return;
    const copy = sampleRaw[name].slice(0);
    audioCtx
      .decodeAudioData(copy)
      .then((decoded) => {
        sampleBuffers[name] = decoded;
        delete sampleRaw[name];
      })
      .catch(() => {});
  }

  function ensureAudio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 0.9;
      masterGain.connect(audioCtx.destination);
      prefetchSfx();
      SFX_FILES.forEach(decodeSfx);
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  prefetchSfx();

  function playHtmlSample(name, { gain = 0.5, rate = 1, delay = 0 } = {}) {
    const run = () => {
      try {
        const a = new Audio(sfxDir() + name + ".ogg");
        a.volume = Math.max(0, Math.min(1, gain));
        a.playbackRate = rate;
        const p = a.play();
        if (p && p.catch) p.catch(() => {});
      } catch (_) {
        /* ignore */
      }
    };
    if (delay > 0) setTimeout(run, delay * 1000);
    else run();
    return true;
  }

  function playSample(name, { gain = 0.5, rate = 1, delay = 0 } = {}) {
    if (meta && meta.muted) return false;
    const ctxA = ensureAudio();
    const buf = sampleBuffers[name];
    if (!ctxA || !buf) {
      // Buffers may still be decoding — play from URL so the first shots aren't synth beeps.
      return playHtmlSample(name, { gain, rate, delay });
    }
    const t0 = ctxA.currentTime + delay;
    const src = ctxA.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;
    const g = ctxA.createGain();
    g.gain.value = Math.max(0.0001, gain);
    src.connect(g);
    g.connect(masterGain || ctxA.destination);
    src.start(t0);
    return true;
  }

  function playTone({
    freq = 440,
    endFreq = null,
    dur = 0.12,
    type = "sine",
    gain = 0.04,
    attack = 0.005,
    delay = 0,
  }) {
    if (meta && meta.muted) return;
    const ctxA = ensureAudio();
    if (!ctxA) return;
    const t0 = ctxA.currentTime + delay;
    const osc = ctxA.createOscillator();
    const g = ctxA.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (endFreq != null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(30, endFreq), t0 + dur);
    }
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(masterGain || ctxA.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  }

  function jitter(base, amount) {
    return base * (1 + (Math.random() * 2 - 1) * amount);
  }

  // Real Kenney CC0 samples (game/assets/sfx). Synth only if a buffer is missing.
  const sfx = {
    shoot: () => {
      if (!playSample("shoot", { gain: 0.38, rate: jitter(1, 0.05) })) {
        playTone({ freq: 880, endFreq: 320, dur: 0.07, type: "square", gain: 0.03 });
      }
    },
    hit: () => {
      if (!playSample("hit", { gain: 0.55, rate: jitter(1, 0.06) })) {
        playTone({ freq: 220, endFreq: 90, dur: 0.08, type: "triangle", gain: 0.03 });
      }
    },
    kill: () => {
      if (!playSample("kill", { gain: 0.5, rate: jitter(1, 0.04) })) {
        playTone({ freq: 280, endFreq: 520, dur: 0.1, type: "sawtooth", gain: 0.03 });
      }
    },
    xp: () => {
      if (!playSample("xp", { gain: 0.4, rate: jitter(1, 0.02) })) {
        playTone({ freq: 740, endFreq: 980, dur: 0.07, type: "sine", gain: 0.03 });
      }
    },
    level: () => {
      if (!playSample("level", { gain: 0.55 })) {
        playTone({ freq: 392, endFreq: 659, dur: 0.22, type: "sine", gain: 0.04 });
      }
    },
    hurt: () => {
      if (!playSample("hurt", { gain: 0.55 })) {
        playTone({ freq: 140, endFreq: 60, dur: 0.18, type: "sawtooth", gain: 0.04 });
      }
    },
    dash: () => {
      if (!playSample("dash", { gain: 0.48 })) {
        playTone({ freq: 220, endFreq: 640, dur: 0.12, type: "square", gain: 0.03 });
      }
    },
    pickup: () => {
      if (!playSample("pickup", { gain: 0.52 })) {
        playTone({ freq: 520, endFreq: 1040, dur: 0.16, type: "sine", gain: 0.035 });
      }
    },
    nuke: () => {
      const a = playSample("nuke", { gain: 0.7 });
      const b = playSample("nuke2", { gain: 0.55, delay: 0.01 });
      if (!a && !b) {
        playTone({ freq: 70, endFreq: 32, dur: 0.5, type: "sine", gain: 0.07 });
      }
    },
    grenade: () => {
      if (!playSample("grenade", { gain: 0.45, rate: jitter(1, 0.04) })) {
        playTone({ freq: 320, endFreq: 160, dur: 0.1, type: "triangle", gain: 0.035 });
      }
    },
    boom: () => {
      const a = playSample("boom", { gain: 0.65, rate: jitter(1, 0.04) });
      const b = playSample("boom2", { gain: 0.5, delay: 0.01 });
      if (!a && !b) {
        playTone({ freq: 120, endFreq: 45, dur: 0.26, type: "sine", gain: 0.05 });
      }
    },
    nova: () => {
      if (!playSample("nova", { gain: 0.5 })) {
        playTone({ freq: 200, endFreq: 620, dur: 0.16, type: "sawtooth", gain: 0.04 });
      }
    },
    spark: () => {
      if (!playSample("spark", { gain: 0.32, rate: jitter(1, 0.06) })) {
        playTone({ freq: 1200, endFreq: 1800, dur: 0.04, type: "sine", gain: 0.016 });
      }
    },
    boss: () => {
      if (!playSample("boss", { gain: 0.58 })) {
        playTone({ freq: 90, endFreq: 55, dur: 0.25, type: "sawtooth", gain: 0.05 });
      }
    },
    death: () => {
      if (!playSample("death", { gain: 0.6 })) {
        playTone({ freq: 180, endFreq: 40, dur: 0.45, type: "sawtooth", gain: 0.05 });
      }
    },
  };


  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  // Shared forest-floor albedo (also used by CGI). Not a fullscreen background.
  const GROUND_SRC = (() => {
    const path = (location.pathname || "").replace(/\\/g, "/");
    if (path.includes("/game")) return "assets/forest-floor.webp";
    if (/lantern\.html$/i.test(path)) return "game/assets/forest-floor.webp";
    return "game/assets/forest-floor.webp";
  })();
  const groundImg = new Image();
  let groundReady = false;
  groundImg.onload = () => {
    groundReady = true;
  };
  groundImg.onerror = () => {
    // Fallback to PNG, then legacy theater.jpg
    if (groundImg.src.includes(".webp")) {
      groundImg.src = GROUND_SRC.replace(/\.webp$/i, ".png");
    } else if (groundImg.src.includes("forest-floor")) {
      groundImg.src = location.pathname.includes("/game") ? "../theater.jpg" : "theater.jpg";
    }
  };
  groundImg.src = GROUND_SRC;

  // Level 0 Ancient Relic player sprite (exact PNG). Future forms can swap this source.
  const PLAYER_VISUAL_SRC = (() => {
    const path = (location.pathname || "").replace(/\\/g, "/");
    if (path.includes("/game") && !/lantern\.html$/i.test(path)) return "assets/ancient-relic.png";
    return "game/assets/ancient-relic.png";
  })();
  // Matches CGI form levelRollDeg — levels the art without editing the PNG.
  const PLAYER_VISUAL_LEVEL_ROLL = (-8.8 * Math.PI) / 180;
  const playerVisualImg = new Image();
  let playerVisualReady = false;
  playerVisualImg.onload = () => {
    playerVisualReady = true;
  };
  playerVisualImg.src = PLAYER_VISUAL_SRC;

  const WEAPON_CRATE_SRC = (() => {
    const path = (location.pathname || "").replace(/\\/g, "/");
    if (path.includes("/game") && !/lantern\.html$/i.test(path)) return "assets/weapon-crate.png";
    return "game/assets/weapon-crate.png";
  })();
  const weaponCrateImg = new Image();
  let weaponCrateReady = false;
  weaponCrateImg.onload = () => {
    weaponCrateReady = true;
  };
  weaponCrateImg.src = WEAPON_CRATE_SRC;

  const CRATE_TINT_CSS = {
    grenades: "rgba(34, 197, 94, 0.5)",
    swarm: "rgba(225, 29, 72, 0.5)",
    nuke: "rgba(59, 130, 246, 0.5)",
  };
  const CRATE_GLOW_CSS = {
    grenades: "rgba(74, 222, 128, 0.95)",
    swarm: "rgba(251, 113, 133, 0.95)",
    nuke: "rgba(96, 165, 250, 0.95)",
  };
  const CRATE_GLOW_CORE_CSS = {
    grenades: "rgba(187, 247, 208, 0.9)",
    swarm: "rgba(254, 205, 211, 0.9)",
    nuke: "rgba(219, 234, 254, 0.9)",
  };
  const crateTintCanvas = document.createElement("canvas");
  const crateTintCtx = crateTintCanvas.getContext("2d");

  function drawTintedWeaponCrate(dx, dy, dw, dh, tint) {
    if (!weaponCrateReady || !crateTintCtx) return false;
    const tw = Math.max(1, Math.round(dw));
    const th = Math.max(1, Math.round(dh));
    if (crateTintCanvas.width !== tw || crateTintCanvas.height !== th) {
      crateTintCanvas.width = tw;
      crateTintCanvas.height = th;
    }
    crateTintCtx.clearRect(0, 0, tw, th);
    crateTintCtx.globalCompositeOperation = "source-over";
    crateTintCtx.drawImage(weaponCrateImg, 0, 0, tw, th);
    crateTintCtx.globalCompositeOperation = "source-atop";
    crateTintCtx.fillStyle = tint;
    crateTintCtx.fillRect(0, 0, tw, th);
    crateTintCtx.globalCompositeOperation = "source-over";
    ctx.drawImage(crateTintCanvas, dx, dy, dw, dh);
    return true;
  }

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
    lifeFill: document.getElementById("life-fill"),
    lifeRow: document.querySelector(".life-row"),
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
          <li>The green <strong>LIFE</strong> bar at the top is your health.</li>
          <li>If life hits <strong>0</strong>, the run ends.</li>
          <li>You do <strong>not</strong> click to attack — your lantern shoots by itself.</li>
        </ul>
      `,
    },
    {
      title: "Move",
      body: "Steering is your main job.",
      card: `
        <p><strong>Keyboard:</strong> hold <span class="key">W</span><span class="key">A</span><span class="key">S</span><span class="key">D</span> or the arrow keys.</p>
        <p><strong>Phone / tablet:</strong> drag the center <strong>Move</strong> stick.</p>
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
          <li><strong>Star Grenades</strong> (orange) — every ~20s. Equip, then fire 5 arcing bombs.</li>
          <li><strong>Swarm Fire</strong> (red) — every ~30s. Drive through to rapid-fire a swirl for 8s.</li>
          <li><strong>Nuke</strong> (purple, rare) — every ~60s. Equip, then clear the field and suck in XP.</li>
          <li>Orange/purple crates equip first (left button). Red crates start instantly.</li>
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
          <li><strong>Close-range</strong> (Orbit Sparks / Burst Nova once each, Bramble): strong if you stay near enemies.</li>
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
      desc: "Tiny swirling sparks that explode and kill on contact.",
      strategy: "One-time unlock. Rewards staying close.",
      once: true,
      owned: (s) => s.player.orbit > 0,
      apply: (s) => {
        s.player.orbit = 1;
      },
    },
    {
      id: "nova",
      name: "Burst Nova",
      tag: "Close-range",
      desc: "Periodic shockwave that kills enemies it hits.",
      strategy: "One-time unlock. Anti-swarm when packs close in.",
      once: true,
      owned: (s) => s.player.nova > 0,
      apply: (s) => {
        s.player.nova = 1;
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
      grenadeRadius: 170,
      orbit: 0,
      nova: 0,
      novaTimer: 3.5,
      swarmTimer: 0,
      swarmFireTimer: 0,
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
      shockwaves: [],
      orbitSparks: [],
      particles: [],
      floats: [],
      time: 0,
      kills: 0,
      spawnTimer: 1.2,
      nextGrenadePickupAt: 20,
      nextSwarmPickupAt: 30,
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
    {
      const evo = lanternEvolution(1);
      state.player.r = evo.r;
    }
    setMode("play");
    refreshWeaponUi();
    showCoach(
      isTouchPrimary()
        ? "You start as a Tiny Light — level up to grow into a full lantern."
        : "You start as a Tiny Light. WASD move · level up to evolve · Space fires weapons",
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

  /** Visual evolution of the player lantern by level. */
  function lanternEvolution(level) {
    const lv = Math.max(1, level || 1);
    if (lv >= 10) {
      return { stage: 4, name: "Hollow Lantern", scale: 1, r: 14, light: 1, minLevel: 10 };
    }
    if (lv >= 7) {
      return { stage: 3, name: "Brass Cage", scale: 0.88, r: 13, light: 0.9, minLevel: 7 };
    }
    if (lv >= 5) {
      return { stage: 2, name: "Glass Ember", scale: 0.72, r: 12, light: 0.78, minLevel: 5 };
    }
    if (lv >= 3) {
      return { stage: 1, name: "Kindled Flame", scale: 0.52, r: 11, light: 0.62, minLevel: 3 };
    }
    return { stage: 0, name: "Tiny Light", scale: 0.32, r: 10, light: 0.5, minLevel: 1 };
  }

  window.LanternForm = { of: lanternEvolution };

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
    // red swarm crate: rapid swirling barrage
    if (p.swarmTimer > 0) {
      p.swarmTimer -= dt;
      p.swarmFireTimer -= dt;
      if (p.swarmFireTimer <= 0) {
        p.swarmFireTimer = 0.065;
        const spiral = state.time * 11;
        for (let k = 0; k < 2; k++) {
          const a = spiral + k * Math.PI;
          state.bullets.push({
            x: p.x,
            y: p.y,
            vx: Math.cos(a) * 480,
            vy: Math.sin(a) * 480,
            r: 5,
            damage: p.damage * 0.95,
            life: 1.05,
            swirl: true,
          });
        }
        if (Math.floor(state.time * 20) % 2 === 0) sfx.shoot();
      }
      if (p.swarmTimer <= 0) {
        p.swarmTimer = 0;
        showBanner("Swarm fire ended", 1.0);
      }
    }

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
      const sparks = p.orbit + 3;
      state.orbitSparks = [];
      for (let i = 0; i < sparks; i++) {
        // tight swirling path — radius breathes and angle wobbles
        const baseR = 44 + p.orbit * 8;
        const swirlR =
          baseR +
          Math.sin(state.time * 7 + i * 2.3) * (12 + p.orbit * 2) +
          Math.cos(state.time * 3.1 + i) * 6;
        const a =
          state.time * (3.8 + p.orbit * 0.35) +
          (TAU * i) / sparks +
          Math.sin(state.time * 2.4 + i * 1.1) * 0.4;
        const ox = p.x + Math.cos(a) * swirlR;
        const oy = p.y + Math.sin(a) * swirlR;
        const spark = { x: ox, y: oy, a, i, r: swirlR, pop: 0 };
        state.orbitSparks.push(spark);
        for (const e of state.enemies) {
          if (e.hp <= 0) continue;
          if (dist({ x: ox, y: oy }, e) < e.r + 11) {
            // contact kill with a little spark explosion
            if (!e._sparkHit || state.time - e._sparkHit > 0.12) {
              hurtEnemy(e, 9999, { sfx: false });
              e._sparkHit = state.time;
              spark.pop = 1;
              addParticles(ox, oy, "#ffe08a", 16, 220);
              addParticles(e.x, e.y, "#ff8a2a", 12, 180);
              floatText(e.x, e.y - 12, "POP", "#ffe08a", 0.75);
              sfx.spark();
              state.shake = Math.max(state.shake, 4);
            }
          }
        }
      }
    } else {
      state.orbitSparks = [];
    }

    if (p.nova > 0) {
      p.novaTimer -= dt;
      if (p.novaTimer <= 0) {
        p.novaTimer = Math.max(1.8, 4.2 - p.nova * 0.35);
        const radius = 100 + p.nova * 24;
        state.shockwaves.push({
          x: p.x,
          y: p.y,
          r: 12,
          maxR: radius,
          life: 0.7,
          maxLife: 0.7,
          lethal: true,
        });
        addParticles(p.x, p.y, "#fff2c0", 36, 280);
        addParticles(p.x, p.y, "#f0b429", 28, 220);
        addParticles(p.x, p.y, "#e07a2f", 18, 160);
        floatText(p.x, p.y - 36, "NOVA!", "#ffe08a", 1.15, true);
        showBanner("Burst Nova!", 0.85);
        sfx.nova();
        state.shake = 12;
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
    const stageBefore = lanternEvolution(p.level).stage;
    while (p.xp >= p.nextXp) {
      p.xp -= p.nextXp;
      p.level += 1;
      p.nextXp = xpForLevel(p.level);
      p.hp = Math.min(p.maxHp, p.hp + 8);
      leveled += 1;
    }
    if (leveled > 0) {
      const evo = lanternEvolution(p.level);
      p.r = evo.r;
      if (evo.stage > stageBefore) {
        showBanner(`Lantern evolves — ${evo.name}!`, 2.2);
        floatText(p.x, p.y - 40, evo.name, "#ffe08a", 1.4, true);
        addParticles(p.x, p.y, "#f0b429", 28, 240);
        addParticles(p.x, p.y, "#fff2c0", 18, 180);
      }
      state.levelUpsQueued = (state.levelUpsQueued || 0) + leveled;
      sfx.level();
      if (!state.pausedChoice) offerLevelUp();
    } else {
      sfx.xp();
    }
  }

  function availableRunUpgrades() {
    return RUN_UPGRADES.filter((u) => !(u.once && u.owned && u.owned(state)));
  }

  function offerLevelUp() {
    if (!state.levelUpsQueued) return;
    const pool = availableRunUpgrades();
    const choices = shuffle([...pool]).slice(0, Math.min(3, pool.length));
    if (!choices.length) {
      state.levelUpsQueued = 0;
      state.pausedChoice = false;
      hide(ui.levelup);
      setMode("play");
      return;
    }
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
    if (kind === "swarm") return "SWARM";
    return "Empty";
  }

  function crateHintColor(kind) {
    if (kind === "nuke") return "#3b82f6";
    if (kind === "swarm") return "#e11d48";
    return "#22c55e"; // grenades
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
    else if (kind === "swarm") showBanner("Red swarm crate nearby!", 1.3);
    else showBanner("Grenade crate nearby", 1.2);
  }

  function startSwarmFire() {
    const p = state.player;
    p.swarmTimer = 8;
    p.swarmFireTimer = 0;
    sfx.pickup();
    showBanner("SWARM FIRE — 8 seconds!", 1.7);
    floatText(p.x, p.y - 30, "SWARM", "#ff6b6b", 1.25, true);
    addParticles(p.x, p.y, "#e11d48", 22, 220);
    addParticles(p.x, p.y, "#ffb040", 14, 160);
  }

  function equipWeapon(kind) {
    if (kind === "swarm") {
      startSwarmFire();
      return;
    }
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
      addParticles(p.x, p.y, "#60a5fa", 52, 360);
      addParticles(p.x, p.y, "#3b82f6", 40, 300);
      addParticles(p.x, p.y, "#dbeafe", 28, 220);
      // Visual-only blue blast ring (enemies already cleared above)
      state.shockwaves.push({
        x: p.x,
        y: p.y,
        r: 24,
        maxR: Math.max(state.w || 900, state.h || 900) * 0.55,
        life: 0.7,
        maxLife: 0.7,
        tint: "nuke",
        lethal: false,
      });
      sfx.nuke();
      showBanner("NUKE — field cleared!", 1.8);
      floatText(p.x, p.y - 36, "NUKE", "#bfdbfe", 1.4, true);
    } else if (kind === "grenades") {
      // Land in a star just inside the visible screen edge
      const halfMin = Math.min(state.w || window.innerWidth, state.h || window.innerHeight) * 0.5;
      const landDist = Math.max(140, halfMin * 0.72);
      const blastR = Math.max(150, p.grenadeRadius);
      for (let i = 0; i < 5; i++) {
        const a = (TAU * i) / 5 - Math.PI / 2;
        const flight = 0.72 + i * 0.03;
        state.grenades.push({
          x: p.x,
          y: p.y,
          z: 0,
          startX: p.x,
          startY: p.y,
          targetX: p.x + Math.cos(a) * landDist,
          targetY: p.y + Math.sin(a) * landDist,
          t: 0,
          flight,
          peak: 140 + (i % 2) * 20,
          r: 10,
          damage: 9999 * p.weaponDamage,
          radius: blastR,
          spin: rand(0, TAU),
        });
      }
      sfx.grenade();
      showBanner("Star grenades — arch and boom!", 1.3);
      addParticles(p.x, p.y, "#22c55e", 18, 200);
    }
    p.equippedWeapon = null;
    refreshWeaponUi();
    return true;
  }

  function explodeGrenade(g) {
    addParticles(g.x, g.y, "#4ade80", 42, 360);
    addParticles(g.x, g.y, "#22c55e", 32, 280);
    addParticles(g.x, g.y, "#bbf7d0", 24, 200);
    state.shockwaves.push({
      x: g.x,
      y: g.y,
      r: 16,
      maxR: g.radius,
      life: 0.55,
      maxLife: 0.55,
      tint: "grenade",
      lethal: true,
    });
    state.shake = Math.max(state.shake, 16);
    sfx.boom();
    floatText(g.x, g.y - 18, "BOOM", "#bbf7d0", 1.2, true);
    for (const e of state.enemies) {
      if (e.hp > 0 && dist(g, e) < g.radius + e.r) {
        // Instant kill inside the blast radius
        hurtEnemy(e, Math.max(9999, g.damage), { sfx: false });
      }
    }
  }

  function refreshWeaponUi() {
    const p = state && state.player;
    const kind = p ? p.equippedWeapon : null;
    const swarming = !!(p && p.swarmTimer > 0);
    const loaded = !!kind;
    const label = weaponLabel(kind);
    if (ui.hudDash) {
      if (swarming) {
        ui.hudDash.textContent = `SWARM ${p.swarmTimer.toFixed(1)}s`;
        ui.hudDash.classList.add("ready");
        ui.hudDash.title = "Red crate swarm fire is active";
      } else {
        ui.hudDash.textContent = loaded ? label : "No weapon";
        ui.hudDash.classList.toggle("ready", loaded);
        ui.hudDash.title = loaded
          ? `${label} loaded — press Space / Fire to use`
          : "Drive through a weapon crate to equip one";
      }
    }
    if (ui.dashFill) {
      const fillPct = swarming ? (p.swarmTimer / 8) * 100 : loaded ? 100 : 0;
      ui.dashFill.style.width = `${fillPct}%`;
      ui.dashFill.classList.toggle("nuke", kind === "nuke" && !swarming);
      ui.dashFill.classList.toggle("grenades", kind === "grenades" && !swarming);
      ui.dashFill.classList.toggle("swarm", swarming);
    }
    if (ui.dashBtn) {
      ui.dashBtn.disabled = !loaded;
      ui.dashBtn.classList.toggle("cooling", !loaded);
      ui.dashBtn.classList.toggle("loaded-nuke", kind === "nuke" && !swarming);
      ui.dashBtn.classList.toggle("loaded-grenades", kind === "grenades" && !swarming);
      ui.dashBtn.classList.toggle("loaded-swarm", swarming);
      // Mobile WebKit often ignores button background gradients — set inline too.
      if (kind === "grenades" && !swarming) {
        ui.dashBtn.style.backgroundColor = "#22c55e";
        ui.dashBtn.style.backgroundImage =
          "radial-gradient(circle at 40% 35%, #bbf7d0 0%, #22c55e 55%, #15803d 100%)";
        ui.dashBtn.style.borderColor = "#bbf7d0";
        ui.dashBtn.style.color = "#052e16";
        ui.dashBtn.style.boxShadow =
          "0 0 16px rgba(74,222,128,0.95), 0 0 32px rgba(34,197,94,0.65), inset 0 0 12px rgba(220,252,231,0.4)";
      } else if (swarming) {
        ui.dashBtn.style.backgroundColor = "#e11d48";
        ui.dashBtn.style.backgroundImage = "none";
        ui.dashBtn.style.borderColor = "#fb7185";
        ui.dashBtn.style.color = "#fff5f5";
        ui.dashBtn.style.boxShadow = "0 0 16px rgba(225,29,72,0.75)";
      } else if (kind === "nuke") {
        ui.dashBtn.style.backgroundColor = "#7c3aed";
        ui.dashBtn.style.backgroundImage = "none";
        ui.dashBtn.style.borderColor = "#d8b4fe";
        ui.dashBtn.style.color = "#f5f3ff";
        ui.dashBtn.style.boxShadow = "0 0 16px rgba(168,85,247,0.7)";
      } else {
        ui.dashBtn.style.backgroundColor = "";
        ui.dashBtn.style.backgroundImage = "";
        ui.dashBtn.style.borderColor = "";
        ui.dashBtn.style.color = "";
        ui.dashBtn.style.boxShadow = "";
      }
      const sub = swarming
        ? `${p.swarmTimer.toFixed(1)}s left`
        : kind === "nuke"
          ? "clear field"
          : kind === "grenades"
            ? "star blast"
            : "pick up crate";
      const main = swarming ? "SWARM" : label;
      ui.dashBtn.innerHTML = `${main}<span class="dash-sub">${sub}</span>`;
      ui.dashBtn.title = swarming
        ? "Swarm fire active"
        : loaded
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
    if (state.time >= state.nextSwarmPickupAt) {
      state.nextSwarmPickupAt += 30;
      spawnWeaponPickup("swarm");
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

    // star grenades — arc up, then detonate on ground impact
    for (const g of state.grenades) {
      g.t += dt;
      const u = Math.min(1, g.t / g.flight);
      // ease slightly toward the landing point
      const ease = u * u * (3 - 2 * u);
      g.x = g.startX + (g.targetX - g.startX) * ease;
      g.y = g.startY + (g.targetY - g.startY) * ease;
      // parabolic height
      g.z = 4 * (g.peak || 140) * u * (1 - u);
      g.spin = (g.spin || 0) + dt * 10;
      if (u >= 1) {
        g.z = 0;
        g._boom = true;
        explodeGrenade(g);
      }
    }
    state.grenades = state.grenades.filter((g) => !g._boom);

    // nova / blast shockwave rings — lethal waves kill as they expand
    for (const sw of state.shockwaves) {
      sw.life -= dt;
      const t = 1 - Math.max(0, sw.life) / sw.maxLife;
      const ease = 1 - (1 - t) * (1 - t);
      sw.r = 12 + (sw.maxR - 12) * ease;
      if (sw.lethal) {
        for (const e of state.enemies) {
          if (e.hp > 0 && dist(sw, e) < sw.r + e.r) {
            hurtEnemy(e, 9999, { sfx: false });
          }
        }
      }
    }
    state.shockwaves = state.shockwaves.filter((sw) => sw.life > 0);

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
    const hpPct = clamp(p.hp / p.maxHp, 0, 1);
    ui.hudHp.textContent = `${Math.ceil(p.hp)} / ${Math.ceil(p.maxHp)}`;
    if (ui.lifeFill) ui.lifeFill.style.width = `${hpPct * 100}%`;
    if (ui.lifeRow) ui.lifeRow.classList.toggle("danger", hpPct < 0.3);
    ui.hudHp.classList.toggle("danger", hpPct < 0.3);
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
      showCoach("Green → grenades · Red → swarm fire · Blue → nuke. Drive through crates.");
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
    // dark forest floor (scrolls with camera)
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
          ctx.globalAlpha = 0.42;
          ctx.drawImage(groundImg, s.x, s.y, tile + 2, tile + 2);
          ctx.restore();
        }
      }
      ctx.fillStyle = "rgba(6, 12, 9, 0.72)";
      ctx.fillRect(0, 0, w, h);
    } else {
      const base = ctx.createLinearGradient(0, 0, w, h);
      base.addColorStop(0, "#080c0a");
      base.addColorStop(0.45, "#101812");
      base.addColorStop(1, "#060908");
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
        if (s.x < -120 || s.y < -140 || s.x > w + 120 || s.y > h + 120) continue;

        // Flat top-down detail only — no tall silhouettes that fake obstacles
        if (n > 0.52) {
          ctx.fillStyle = n > 0.82 ? "rgba(48, 48, 42, 0.4)" : "rgba(52, 40, 24, 0.32)";
          safeEllipse(s.x, s.y, 16 + n * 24, 9 + n * 10, n * 2);
          ctx.fill();
        }

        // moss / leaf patches
        if (n < 0.28) {
          ctx.fillStyle = `rgba(40, ${70 + ((n * 80) | 0)}, 38, 0.28)`;
          safeEllipse(s.x + 4, s.y - 2, 10 + n * 18, 7 + n * 10, n);
          ctx.fill();
        }

        // short ground litter strokes (not tall reeds)
        if (n > 0.88) {
          ctx.strokeStyle = `rgba(60, 44, 24, 0.45)`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(s.x - 8, s.y);
          ctx.quadraticCurveTo(s.x, s.y + Math.sin(state.time + tx) * 2, s.x + 10, s.y + 2);
          ctx.stroke();
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
    const evo = lanternEvolution(p.level);
    const flicker = 0.88 + Math.sin(state.time * 18) * 0.07 + Math.sin(state.time * 29) * 0.04;
    const lightMul = evo.light;
    const poolR = (90 + evo.stage * 30) * flicker;

    // Soft warm fill under the floating relic (not a fixture)
    const pool = ctx.createRadialGradient(ps.x, ps.y + 10, 4, ps.x, ps.y + 10, poolR);
    pool.addColorStop(0, `rgba(255, 210, 110, ${0.35 * flicker * lightMul})`);
    pool.addColorStop(0.35, `rgba(255, 170, 60, ${0.14 * flicker * lightMul})`);
    pool.addColorStop(1, "rgba(255,140,40,0)");
    ctx.fillStyle = pool;
    ctx.beginPath();
    ctx.arc(ps.x, ps.y + 10, poolR, 0, TAU);
    ctx.fill();

    const bob = Math.sin(state.time * 6) * 3;
    if (playerVisualReady) {
      const drawH = 104;
      const drawW = drawH * (playerVisualImg.naturalWidth / playerVisualImg.naturalHeight || 1024 / 1536);
      // Center on hitbox; slight upward bias so the relic reads as hovering.
      // Canvas rotate is CW-positive; negate so the roll matches CGI (CCW level).
      const cy = ps.y + bob - 10;
      ctx.save();
      ctx.translate(ps.x, cy);
      ctx.rotate(PLAYER_VISUAL_LEVEL_ROLL);
      ctx.drawImage(playerVisualImg, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
    } else {
      // Tiny fallback while the exact asset loads
      const flame = ctx.createRadialGradient(ps.x, ps.y + bob, 1, ps.x, ps.y + bob, 16);
      flame.addColorStop(0, "#fff6d0");
      flame.addColorStop(0.45, "#ffb040");
      flame.addColorStop(1, "rgba(255,120,30,0)");
      ctx.fillStyle = flame;
      ctx.beginPath();
      ctx.arc(ps.x, ps.y + bob, 16, 0, TAU);
      ctx.fill();
    }

    // hp ring
    const ringR = 34;
    ctx.strokeStyle = "rgba(215,228,213,0.25)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(ps.x, ps.y, ringR, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = "#f0b429";
    ctx.beginPath();
    ctx.arc(ps.x, ps.y, ringR, -Math.PI / 2, -Math.PI / 2 + TAU * (p.hp / p.maxHp));
    ctx.stroke();

    drawCrateDirectionHints(ps, p);
  }

  function drawCrateDirectionHints(ps, p) {
    if (!state.weaponPickups || !state.weaponPickups.length) return;
    const ringR = 26 + lanternEvolution(p.level).stage * 3;
    for (let i = 0; i < state.weaponPickups.length; i++) {
      const w = state.weaponPickups[i];
      const ang = Math.atan2(w.y - p.y, w.x - p.x);
      const color = crateHintColor(w.kind);
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
    drawShadow(s.x, s.y + 2, g.r + 3, 3, 0.28);
    const glow = ctx.createRadialGradient(s.x, s.y, 1, s.x, s.y, g.r * 4.2);
    glow.addColorStop(0, "rgba(255,230,140,0.9)");
    glow.addColorStop(0.4, "rgba(255,180,60,0.35)");
    glow.addColorStop(1, "rgba(255,140,40,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(s.x, s.y, g.r * 4.2, 0, TAU);
    ctx.fill();
    // warm ember orb (matches CGI)
    const orb = ctx.createRadialGradient(s.x - 1, s.y - 1, 0.5, s.x, s.y, g.r * 1.35);
    orb.addColorStop(0, "#fff6d0");
    orb.addColorStop(0.45, "#ffd056");
    orb.addColorStop(1, "#e07a2f");
    ctx.fillStyle = orb;
    ctx.beginPath();
    ctx.arc(s.x, s.y, g.r * 1.25, 0, TAU);
    ctx.fill();
  }

  function drawBullet(b, s) {
    const ang = Math.atan2(b.vy, b.vx);
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(ang);
    const streak = ctx.createLinearGradient(-10, 0, 8, 0);
    if (b.swirl) {
      streak.addColorStop(0, "rgba(225,29,72,0)");
      streak.addColorStop(0.55, "rgba(255,80,100,0.9)");
      streak.addColorStop(1, "#ffe0e6");
    } else {
      streak.addColorStop(0, "rgba(255,200,80,0)");
      streak.addColorStop(0.6, "rgba(255,220,120,0.85)");
      streak.addColorStop(1, "#fff6d0");
    }
    ctx.fillStyle = streak;
    safeEllipse(0, 0, b.swirl ? 12 : 10, b.swirl ? 3.6 : 3.2, 0);
    ctx.fill();
    ctx.restore();
  }

  function drawWeaponPickup(wpn, s) {
    const bob = Math.sin(wpn.pulse) * 4;
    const kind = wpn.kind === "nuke" || wpn.kind === "swarm" ? wpn.kind : "grenades";
    const glowCol = CRATE_GLOW_CSS[kind];
    const coreCol = CRATE_GLOW_CORE_CSS[kind];
    const tint = CRATE_TINT_CSS[kind];
    const pulse = 0.75 + Math.sin(state.time * 5 + wpn.pulse) * 0.25;
    drawShadow(s.x, s.y + 6, wpn.r + 4, 5, 0.3);
    // Outer power aura
    const outerR = wpn.r * (4.6 + pulse * 0.6);
    const mid =
      kind === "nuke"
        ? "rgba(59, 130, 246, 0.35)"
        : kind === "swarm"
          ? "rgba(225, 29, 72, 0.35)"
          : "rgba(34, 197, 94, 0.35)";
    const outer = ctx.createRadialGradient(s.x, s.y + bob, 4, s.x, s.y + bob, outerR);
    outer.addColorStop(0, glowCol);
    outer.addColorStop(0.45, mid);
    outer.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = outer;
    ctx.beginPath();
    ctx.arc(s.x, s.y + bob, outerR, 0, TAU);
    ctx.fill();
    // Hot core bloom
    const coreR = wpn.r * (2.2 + pulse * 0.35);
    const core = ctx.createRadialGradient(s.x, s.y + bob, 1, s.x, s.y + bob, coreR);
    core.addColorStop(0, coreCol);
    core.addColorStop(0.55, glowCol);
    core.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(s.x, s.y + bob, coreR, 0, TAU);
    ctx.fill();

    const drawH = wpn.r * 2.6;
    const drawW =
      drawH *
      (weaponCrateReady
        ? weaponCrateImg.naturalWidth / weaponCrateImg.naturalHeight || 1
        : 1);
    const dx = s.x - drawW / 2;
    const dy = s.y + bob - drawH / 2 - 4;

    if (!drawTintedWeaponCrate(dx, dy, drawW, drawH, tint)) {
      ctx.fillStyle = kind === "nuke" ? "#3b82f6" : kind === "swarm" ? "#e11d48" : "#22c55e";
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(s.x - wpn.r, s.y + bob - wpn.r, wpn.r * 2, wpn.r * 2, 4);
      } else {
        ctx.rect(s.x - wpn.r, s.y + bob - wpn.r, wpn.r * 2, wpn.r * 2);
      }
      ctx.fill();
    }
  }

  function drawGrenade(g, s) {
    // ground shadow under the arc
    const ground = worldToScreen(g.x, g.y);
    const lift = g.z || 0;
    const shadowScale = Math.max(0.35, 1 - lift / 220);
    drawShadow(ground.x, ground.y + 4, (g.r + 6) * shadowScale, 5 * shadowScale, 0.35 * shadowScale);

    // landing marker while in flight
    if (lift > 2) {
      const land = worldToScreen(g.targetX, g.targetY);
      ctx.strokeStyle = "rgba(34,197,94,0.65)";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(land.x, land.y, 14, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const drawX = s.x;
    const drawY = s.y - lift * 0.55;
    const glow = ctx.createRadialGradient(drawX, drawY, 1, drawX, drawY, 22);
    glow.addColorStop(0, "rgba(187,247,208,0.95)");
    glow.addColorStop(0.45, "rgba(74,222,128,0.85)");
    glow.addColorStop(1, "rgba(34,197,94,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(drawX, drawY, 22, 0, TAU);
    ctx.fill();
    ctx.save();
    ctx.translate(drawX, drawY);
    ctx.rotate(g.spin || 0);
    ctx.fillStyle = "#4ade80";
    ctx.beginPath();
    ctx.arc(0, 0, g.r + 2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#14532d";
    ctx.fillRect(-2, -g.r - 4, 4, 6);
    ctx.restore();
  }

  function drawDarkness(w, h, ps, p) {
    // Soft night veil — lantern reveals a warm pocket of forest
    const flicker = 0.92 + Math.sin(state.time * 19) * 0.04;
    const r = (230 + p.orbit * 12) * flicker;
    const veil = ctx.createRadialGradient(ps.x, ps.y, r * 0.12, ps.x, ps.y, r * 1.15);
    veil.addColorStop(0, "rgba(3, 6, 4, 0)");
    veil.addColorStop(0.35, "rgba(3, 6, 4, 0.12)");
    veil.addColorStop(0.65, "rgba(3, 6, 4, 0.48)");
    veil.addColorStop(1, "rgba(2, 4, 3, 0.78)");
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

    // nova / weapon shockwaves
    const p = state.player;
    for (const sw of state.shockwaves) {
      const s = worldToScreen(sw.x, sw.y);
      const alpha = clamp(sw.life / sw.maxLife, 0, 1);
      const palette =
        sw.tint === "grenade"
          ? {
              a: `rgba(187, 247, 208, ${0.28 * alpha})`,
              b: `rgba(74, 222, 128, ${0.28 * alpha})`,
              c: `rgba(34, 197, 94, ${0.4 * alpha})`,
              ring: `rgba(187, 247, 208, ${0.9 * alpha})`,
              edge: `rgba(220, 252, 231, ${0.55 * alpha})`,
            }
          : sw.tint === "nuke"
            ? {
                a: `rgba(219, 234, 254, ${0.3 * alpha})`,
                b: `rgba(96, 165, 250, ${0.3 * alpha})`,
                c: `rgba(59, 130, 246, ${0.42 * alpha})`,
                ring: `rgba(147, 197, 253, ${0.92 * alpha})`,
                edge: `rgba(239, 246, 255, ${0.55 * alpha})`,
              }
            : {
                a: `rgba(255, 242, 180, ${0.2 * alpha})`,
                b: `rgba(240, 180, 41, ${0.18 * alpha})`,
                c: `rgba(224, 122, 47, ${0.35 * alpha})`,
                ring: `rgba(255, 230, 140, ${0.85 * alpha})`,
                edge: `rgba(255, 255, 255, ${0.45 * alpha})`,
              };
      const glow = ctx.createRadialGradient(s.x, s.y, sw.r * 0.35, s.x, s.y, sw.r);
      glow.addColorStop(0, palette.a);
      glow.addColorStop(0.55, palette.b);
      glow.addColorStop(0.85, palette.c);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(s.x, s.y, sw.r, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = palette.ring;
      ctx.lineWidth = sw.tint === "nuke" ? 7 : 5;
      ctx.beginPath();
      ctx.arc(s.x, s.y, sw.r, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = palette.edge;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(s.x, s.y, Math.max(4, sw.r - 8), 0, TAU);
      ctx.stroke();
    }

    // orbit sparks — small swirling embers with contact pops
    if (p.orbit > 0 && state.orbitSparks.length) {
      const center = worldToScreen(p.x, p.y);
      ctx.strokeStyle = "rgba(255, 200, 80, 0.14)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 8]);
      ctx.beginPath();
      ctx.arc(center.x, center.y, 44 + p.orbit * 8, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      for (const sp of state.orbitSparks) {
        const s = worldToScreen(sp.x, sp.y);
        const trailA = sp.a - 0.55;
        const trailR = sp.r || 44 + p.orbit * 8;
        const tx = worldToScreen(
          p.x + Math.cos(trailA) * trailR,
          p.y + Math.sin(trailA) * trailR,
        );
        const streak = ctx.createLinearGradient(tx.x, tx.y, s.x, s.y);
        streak.addColorStop(0, "rgba(255,160,40,0)");
        streak.addColorStop(1, "rgba(255,220,120,0.75)");
        ctx.strokeStyle = streak;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(tx.x, tx.y);
        ctx.lineTo(s.x, s.y);
        ctx.stroke();
        const pop = sp.pop ? 1.8 : 1;
        const glowR = 7 * pop;
        const og = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, glowR);
        og.addColorStop(0, "#fffce8");
        og.addColorStop(0.4, "#ffd056");
        og.addColorStop(1, "rgba(255,140,40,0)");
        ctx.fillStyle = og;
        ctx.beginPath();
        ctx.arc(s.x, s.y, glowR, 0, TAU);
        ctx.fill();
        ctx.fillStyle = "#fff6d0";
        ctx.beginPath();
        ctx.arc(s.x, s.y, 2.2 * pop, 0, TAU);
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
      const k =
        kind === "nuke" ? "nuke" : kind === "swarm" ? "swarm" : "grenades";
      spawnWeaponPickup(k);
      return true;
    },
    equipWeapon: (kind) => {
      if (!state) return false;
      const k =
        kind === "nuke" ? "nuke" : kind === "swarm" ? "swarm" : "grenades";
      equipWeapon(k);
      return true;
    },
    fire: () => fireEquippedWeapon(),
  };
})();
