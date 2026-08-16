(() => {
  "use strict";

  const { Engine, World, Bodies, Body, Events, Query, Composite } = Matter;

  const W = 390;
  const H = 780;
  const ASSET_DATA = {
    echo: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMjggMTYwIiBmaWxsPSJub25lIj4KICA8IS0tIEVjaG8gIGNvbnRhaW5lZCBpbnRlbGxpZ2VudCBlbnRpdHkgLS0+CiAgPGRlZnM+CiAgICA8cmFkaWFsR3JhZGllbnQgaWQ9ImVjaG9Db3JlIiBjeD0iNTAlIiBjeT0iNDIlIiByPSI0OCUiPgogICAgICA8c3RvcCBvZmZzZXQ9IjAlIiBzdG9wLWNvbG9yPSIjN2RkM2ZjIi8+CiAgICAgIDxzdG9wIG9mZnNldD0iMzUlIiBzdG9wLWNvbG9yPSIjMWQ0ZWQ4Ii8+CiAgICAgIDxzdG9wIG9mZnNldD0iNzUlIiBzdG9wLWNvbG9yPSIjMGExNjI4Ii8+CiAgICAgIDxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iIzAyMDYxNyIvPgogICAgPC9yYWRpYWxHcmFkaWVudD4KICAgIDxmaWx0ZXIgaWQ9ImVjaG9HbG93IiB4PSItMzAlIiB5PSItMzAlIiB3aWR0aD0iMTYwJSIgaGVpZ2h0PSIxNjAlIj4KICAgICAgPGZlR2F1c3NpYW5CbHVyIHN0ZERldmlhdGlvbj0iMi4yIiByZXN1bHQ9ImIiLz4KICAgICAgPGZlTWVyZ2U+CiAgICAgICAgPGZlTWVyZ2VOb2RlIGluPSJiIi8+CiAgICAgICAgPGZlTWVyZ2VOb2RlIGluPSJTb3VyY2VHcmFwaGljIi8+CiAgICAgIDwvZmVNZXJnZT4KICAgIDwvZmlsdGVyPgogIDwvZGVmcz4KICA8IS0tIHN0dWJieSBsaW1icyAtLT4KICA8cGF0aCBkPSJNMjggMTE4Yy0xMCA0LTE4IDE0LTE2IDIyIDYtMiAxNC02IDIyLTE0IiBzdHJva2U9IiMyMmQzZWUiIHN0cm9rZS13aWR0aD0iNyIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBmaWxsPSJub25lIiBmaWx0ZXI9InVybCgjZWNob0dsb3cpIi8+CiAgPHBhdGggZD0iTTEwMCAxMThjMTAgNCAxOCAxNCAxNiAyMi02LTItMTQtNi0yMi0xNCIgc3Ryb2tlPSIjMjJkM2VlIiBzdHJva2Utd2lkdGg9IjciIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgZmlsbD0ibm9uZSIgZmlsdGVyPSJ1cmwoI2VjaG9HbG93KSIvPgogIDwhLS0gYm9keSAtLT4KICA8ZWxsaXBzZSBjeD0iNjQiIGN5PSI3OCIgcng9IjQyIiByeT0iNTQiIGZpbGw9InVybCgjZWNob0NvcmUpIiBzdHJva2U9IiMyMmQzZWUiIHN0cm9rZS13aWR0aD0iNSIgZmlsdGVyPSJ1cmwoI2VjaG9HbG93KSIvPgogIDwhLS0gZ2xhc3MgaGlnaGxpZ2h0IC0tPgogIDxwYXRoIGQ9Ik0zNiA0OGM4LTE4IDQ4LTIyIDU2LTQiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjM1KSIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWNhcD0icm91bmQiIGZpbGw9Im5vbmUiLz4KICA8IS0tIGZhY2UgLS0+CiAgPGNpcmNsZSBjeD0iNTIiIGN5PSI3MiIgcj0iNi41IiBmaWxsPSIjMDIwNjE3Ii8+CiAgPGNpcmNsZSBjeD0iNzYiIGN5PSI3MiIgcj0iNi41IiBmaWxsPSIjMDIwNjE3Ii8+CiAgPGNpcmNsZSBjeD0iNTQiIGN5PSI3MCIgcj0iMS44IiBmaWxsPSIjZjhmYWZjIi8+CiAgPGNpcmNsZSBjeD0iNzgiIGN5PSI3MCIgcj0iMS44IiBmaWxsPSIjZjhmYWZjIi8+CiAgPHBhdGggZD0iTTU2IDg4YzQgNiAxMiA2IDE2IDAiIHN0cm9rZT0iIzAyMDYxNyIgc3Ryb2tlLXdpZHRoPSIzIiBzdHJva2UtbGluZWNhcD0icm91bmQiIGZpbGw9Im5vbmUiLz4KPC9zdmc+Cg==",
    cell: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA3MiAxMjAiIGZpbGw9Im5vbmUiPgogIDwhLS0gRW5lcmd5IGNlbGwgIGNhcnJ5YWJsZSBwb3dlciBiYXR0ZXJ5IC0tPgogIDxyZWN0IHg9IjI4IiB5PSI0IiB3aWR0aD0iMTYiIGhlaWdodD0iMTAiIHJ4PSIyIiBmaWxsPSIjNGI1NTYzIi8+CiAgPHJlY3QgeD0iOCIgeT0iMTQiIHdpZHRoPSI1NiIgaGVpZ2h0PSI5OCIgcng9IjEwIiBmaWxsPSIjMWYyOTM3IiBzdHJva2U9IiM2YjcyODAiIHN0cm9rZS13aWR0aD0iNSIvPgogIDxyZWN0IHg9IjE2IiB5PSIyNCIgd2lkdGg9IjQwIiBoZWlnaHQ9Ijc4IiByeD0iNiIgZmlsbD0iI2ZhY2MxNSIvPgogIDxwYXRoIGQ9Ik00MCAzOCBMMzAgNjIgSDQwIEwzMiA5MCBMNDggNTQgSDM2IFoiIGZpbGw9IiNmZmZmZmYiLz4KPC9zdmc+Cg==",
    reactor: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMjggMTI4IiBmaWxsPSJub25lIj4KICA8IS0tIFJlYWN0b3Igbm9kZSAgcHVycGxlIHNwaXJhbCBjb3JlIC0tPgogIDxkZWZzPgogICAgPHJhZGlhbEdyYWRpZW50IGlkPSJyeENvcmUiIGN4PSI1MCUiIGN5PSI1MCUiIHI9IjQ1JSI+CiAgICAgIDxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNmNWUxZmYiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIyNSUiIHN0b3AtY29sb3I9IiNjMDg0ZmMiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSI3MCUiIHN0b3AtY29sb3I9IiM2YjIxYTgiLz4KICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdG9wLWNvbG9yPSIjMWUxMDMwIi8+CiAgICA8L3JhZGlhbEdyYWRpZW50PgogIDwvZGVmcz4KICA8Y2lyY2xlIGN4PSI2NCIgY3k9IjY0IiByPSI1OCIgZmlsbD0iIzFmMjkzNyIgc3Ryb2tlPSIjNGI1NTYzIiBzdHJva2Utd2lkdGg9IjgiLz4KICA8Y2lyY2xlIGN4PSI2NCIgY3k9IjY0IiByPSI0MiIgZmlsbD0iIzBiMDYxMiIvPgogIDxjaXJjbGUgY3g9IjY0IiBjeT0iNjQiIHI9IjM0IiBmaWxsPSJ1cmwoI3J4Q29yZSkiLz4KICA8cGF0aCBkPSJNNjQgNjQKICAgICAgICAgICBDNzIgNTggODQgNTYgOTAgNjQKICAgICAgICAgICBDOTYgNzQgOTAgOTAgNzYgOTQKICAgICAgICAgICBDNjAgOTggNDYgODggNDQgNzQKICAgICAgICAgICBDNDIgNjIgNTIgNTIgNjQgNTIKICAgICAgICAgICBDNzQgNTIgODIgNjAgODIgNjgiCiAgICAgICAgc3Ryb2tlPSIjZTlkNWZmIiBzdHJva2Utd2lkdGg9IjIuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBmaWxsPSJub25lIi8+CiAgPGNpcmNsZSBjeD0iNjQiIGN5PSI2NCIgcj0iMy41IiBmaWxsPSIjZmFmNWZmIi8+Cjwvc3ZnPgo=",
    conduit: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMjggMTI4IiBmaWxsPSJub25lIj4KICA8IS0tIEVzY2FwZSBjb25kdWl0ICBjeWFuIHBvcnRhbCAtLT4KICA8Y2lyY2xlIGN4PSI2NCIgY3k9IjY0IiByPSI1NCIgZmlsbD0iIzExMTgyNyIgc3Ryb2tlPSIjMzc0MTUxIiBzdHJva2Utd2lkdGg9IjEwIi8+CiAgPCEtLSBjbGFtcCB0YWJzIC0tPgogIDxyZWN0IHg9IjU2IiB5PSI2IiB3aWR0aD0iMTYiIGhlaWdodD0iMjIiIHJ4PSI0IiBmaWxsPSIjOWNhM2FmIi8+CiAgPHJlY3QgeD0iNTYiIHk9IjEwMCIgd2lkdGg9IjE2IiBoZWlnaHQ9IjIyIiByeD0iNCIgZmlsbD0iIzljYTNhZiIvPgogIDxyZWN0IHg9IjYiIHk9IjU2IiB3aWR0aD0iMjIiIGhlaWdodD0iMTYiIHJ4PSI0IiBmaWxsPSIjOWNhM2FmIi8+CiAgPHJlY3QgeD0iMTAwIiB5PSI1NiIgd2lkdGg9IjIyIiBoZWlnaHQ9IjE2IiByeD0iNCIgZmlsbD0iIzljYTNhZiIvPgogIDxjaXJjbGUgY3g9IjY0IiBjeT0iNjQiIHI9IjM2IiBmaWxsPSIjMDIwNjE3Ii8+CiAgPGNpcmNsZSBjeD0iNjQiIGN5PSI2NCIgcj0iMzAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzIyZDNlZSIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtZGFzaGFycmF5PSI3IDYiLz4KICA8Y2lyY2xlIGN4PSI2NCIgY3k9IjY0IiByPSIxOCIgZmlsbD0iIzIyZDNlZSIvPgogIDxjaXJjbGUgY3g9IjY0IiBjeT0iNjQiIHI9IjUiIGZpbGw9IiNmZmZmZmYiLz4KPC9zdmc+Cg==",
    pad: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyMjAgOTAiIGZpbGw9Im5vbmUiPgogIDwhLS0gQ29udGFpbm1lbnQgcGFkICBzdGFydGluZyAvIHJldHVybiB6b25lIC0tPgogIDxyZWN0IHg9IjYiIHk9IjEwIiB3aWR0aD0iMjA4IiBoZWlnaHQ9IjcwIiByeD0iMTYiIGZpbGw9IiMxZTI5M2IiIHN0cm9rZT0iIzQ3NTU2OSIgc3Ryb2tlLXdpZHRoPSI4Ii8+CiAgPHJlY3QgeD0iMjIiIHk9IjI0IiB3aWR0aD0iMTc2IiBoZWlnaHQ9IjQyIiByeD0iOCIgZmlsbD0iIzAyMDYxNyIvPgogIDxyZWN0IHg9IjI4IiB5PSIzMCIgd2lkdGg9IjE2NCIgaGVpZ2h0PSIzMCIgcng9IjYiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzIyZDNlZSIgc3Ryb2tlLXdpZHRoPSIyLjUiIHN0cm9rZS1kYXNoYXJyYXk9IjggNiIvPgogIDxjaXJjbGUgY3g9IjExMCIgY3k9IjQ1IiByPSIxMiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMjJkM2VlIiBzdHJva2Utd2lkdGg9IjIuNSIvPgogIDxjaXJjbGUgY3g9IjExMCIgY3k9IjQ1IiByPSI0IiBmaWxsPSIjMjJkM2VlIi8+Cjwvc3ZnPgo=",
    gate: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA3MiAxNjAiIGZpbGw9Im5vbmUiPgogIDwhLS0gTW92YWJsZSBzZWN1cml0eSBnYXRlIC0tPgogIDxyZWN0IHg9IjQiIHk9IjQiIHdpZHRoPSI2NCIgaGVpZ2h0PSIxNTIiIHJ4PSIxMiIgZmlsbD0iIzFhMjAyYyIgc3Ryb2tlPSIjYTBhZWMwIiBzdHJva2Utd2lkdGg9IjYiLz4KICA8bGluZSB4MT0iMTgiIHkxPSIxNiIgeDI9IjE4IiB5Mj0iMTQ0IiBzdHJva2U9IiNhMGFlYzAiIHN0cm9rZS13aWR0aD0iNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CiAgPGxpbmUgeDE9IjMwIiB5MT0iMTYiIHgyPSIzMCIgeTI9IjE0NCIgc3Ryb2tlPSIjYTBhZWMwIiBzdHJva2Utd2lkdGg9IjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIvPgogIDxsaW5lIHgxPSI0MiIgeTE9IjE2IiB4Mj0iNDIiIHkyPSIxNDQiIHN0cm9rZT0iI2EwYWVjMCIgc3Ryb2tlLXdpZHRoPSI1IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz4KICA8bGluZSB4MT0iNTQiIHkxPSIxNiIgeDI9IjU0IiB5Mj0iMTQ0IiBzdHJva2U9IiNhMGFlYzAiIHN0cm9rZS13aWR0aD0iNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIi8+CiAgPHJlY3QgeD0iMTIiIHk9IjY0IiB3aWR0aD0iNDgiIGhlaWdodD0iMzIiIHJ4PSI2IiBmaWxsPSIjMmQzNzQ4IiBzdHJva2U9IiNhMGFlYzAiIHN0cm9rZS13aWR0aD0iNCIvPgo8L3N2Zz4K",
  };

  const ASSETS = {
    echo: ASSET_DATA.echo,
    cell: ASSET_DATA.cell,
    reactor: ASSET_DATA.reactor,
    conduit: ASSET_DATA.conduit,
    pad: ASSET_DATA.pad,
    gate: ASSET_DATA.gate,
  };

  const canvas = document.getElementById("chamber");
  const ctx = canvas.getContext("2d");
  const captionEl = document.getElementById("caption");
  const replayBtn = document.getElementById("replay");
  const vignette = document.getElementById("vignette");
  const phone = document.getElementById("phone");

  const imgs = {};
  let assetsReady = 0;
  const assetKeys = Object.keys(ASSETS);
  for (const key of assetKeys) {
    const img = new Image();
    img.onload = () => {
      assetsReady += 1;
      if (assetsReady === assetKeys.length) boot();
    };
    img.onerror = () => {
      assetsReady += 1;
      if (assetsReady === assetKeys.length) boot();
    };
    img.src = ASSETS[key];
    imgs[key] = img;
  }

  // ——— Audio (local oscillators) ———
  let audioCtx = null;
  function ensureAudio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    return audioCtx;
  }

  function tone(freq, dur = 0.12, type = "sine", gain = 0.04, slide = 0) {
    const ac = ensureAudio();
    if (!ac) return;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.value = freq;
    if (slide) o.frequency.linearRampToValueAtTime(freq + slide, ac.currentTime + dur);
    g.gain.value = gain;
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
    o.connect(g);
    g.connect(ac.destination);
    o.start();
    o.stop(ac.currentTime + dur + 0.02);
  }

  let humNode = null;
  function startHum(level = 0.012) {
    const ac = ensureAudio();
    if (!ac || humNode) return;
    const o = ac.createOscillator();
    const g = ac.createGain();
    const f = ac.createBiquadFilter();
    o.type = "sawtooth";
    o.frequency.value = 55;
    f.type = "lowpass";
    f.frequency.value = 180;
    g.gain.value = level;
    o.connect(f);
    f.connect(g);
    g.connect(ac.destination);
    o.start();
    humNode = { o, g };
  }

  function setHum(level) {
    if (humNode) humNode.g.gain.setTargetAtTime(level, audioCtx.currentTime, 0.25);
  }

  function stopHum() {
    if (!humNode) return;
    try {
      humNode.o.stop();
    } catch (_) {}
    humNode = null;
  }

  function haptic(ms = 12) {
    try {
      if (navigator.vibrate) navigator.vibrate(ms);
    } catch (_) {}
  }

  // ——— Caption helper ———
  let captionTimer = 0;
  function showCaption(text, { ms = 2200, subtle = false, danger = false } = {}) {
    captionEl.textContent = text;
    captionEl.classList.toggle("subtle", !!subtle);
    captionEl.classList.toggle("danger", !!danger);
    captionEl.classList.add("show");
    clearTimeout(captionTimer);
    if (ms > 0) {
      captionTimer = setTimeout(() => captionEl.classList.remove("show"), ms);
    }
  }

  function hideCaption() {
    captionEl.classList.remove("show");
    clearTimeout(captionTimer);
  }

  // ——— Game state ———
  let engine, world;
  let echo, cell, gate, balls;
  let staticParts = [];
  let padZone, reactorZone, conduitZone;
  let fieldBody = null;
  let phase = "boot";
  let powered = false;
  let conduitLive = false;
  let ended = false;
  let lightLevel = 0;
  let powerPulse = 0;
  let shake = 0;
  let ripples = [];
  let particles = [];
  let ambient = [];
  let gears = [];
  let containHold = 0;
  let echoIntent = "curious";
  let echoLook = 0;
  let echoCarry = false;
  let echoPause = 0;
  let echoGlance = 0;
  let shockCd = 0;
  let holdArmed = false;
  let holdOrigin = null;
  let holdStart = 0;
  let draggingGate = false;
  let gateGrabY = 0;
  let gateTargetY = 0;
  let gravity = { x: 0, y: 1 };
  let deskTilt = { x: 0, y: 0 };
  let orientGranted = false;
  let lastTs = 0;
  let storyT = 0;
  let winLock = false;
  let machineSpin = 0;

  const WALL = 0x0001;
  const ACTOR = 0x0002;
  const FIELD = 0x0004;
  const GATE = 0x0008;
  const SENSOR = 0x0010;

  function rect(x, y, w, h, opts = {}) {
    return Bodies.rectangle(x, y, w, h, {
      isStatic: true,
      friction: 0.85,
      frictionStatic: 0.95,
      restitution: 0.08,
      collisionFilter: { category: WALL, mask: ACTOR | GATE },
      ...opts,
    });
  }

  function buildChamber() {
    engine = Engine.create({
      gravity: { x: 0, y: 1, scale: 0.00115 },
      enableSleeping: false,
    });
    world = engine.world;

    const thickness = 28;
    const walls = [
      rect(W / 2, -thickness / 2, W + 80, thickness, { label: "ceiling" }),
      rect(W / 2, H + thickness / 2, W + 80, thickness, { label: "floor" }),
      rect(-thickness / 2, H / 2, thickness, H + 80, { label: "left" }),
      rect(W + thickness / 2, H / 2, thickness, H + 80, { label: "right" }),
      // lower shelves / channels
      rect(70, 620, 120, 16, { label: "ledgeL", angle: -0.18 }),
      rect(310, 560, 130, 16, { label: "ledgeR", angle: 0.22 }),
      rect(120, 430, 150, 14, { label: "midRamp", angle: 0.28 }),
      rect(290, 360, 140, 14, { label: "upperRamp", angle: -0.2 }),
      // Energy cell shelf — reachable via left climb + tilt assist
      rect(70, 340, 100, 14, { label: "cellShelf" }),
      rect(W / 2, 190, 180, 12, { label: "conduitShelf" }),
      // blockers / pillars
      rect(200, 500, 18, 90, { label: "pillar" }),
      rect(155, 380, 14, 50, { label: "column" }),
    ];

    padZone = Bodies.rectangle(W / 2, 705, 160, 40, {
      isStatic: true,
      isSensor: true,
      label: "pad",
    });
    reactorZone = Bodies.circle(78, 500, 36, {
      isStatic: true,
      isSensor: true,
      label: "reactor",
    });
    conduitZone = Bodies.circle(W / 2, 118, 34, {
      isStatic: true,
      isSensor: true,
      label: "conduit",
    });

    gate = Bodies.rectangle(248, 255, 42, 110, {
      isStatic: true,
      label: "gate",
      friction: 0.9,
      chamfer: { radius: 6 },
      collisionFilter: { category: GATE, mask: ACTOR | WALL },
    });
    gateTargetY = 255;

    echo = Bodies.circle(W / 2, 680, 22, {
      label: "echo",
      density: 0.0022,
      friction: 0.35,
      frictionAir: 0.02,
      restitution: 0.25,
      collisionFilter: { category: ACTOR, mask: WALL | GATE | FIELD | ACTOR },
    });

    cell = Bodies.rectangle(70, 310, 28, 48, {
      label: "cell",
      density: 0.0018,
      friction: 0.55,
      frictionAir: 0.018,
      restitution: 0.12,
      chamfer: { radius: 4 },
      collisionFilter: { category: ACTOR, mask: WALL | GATE | FIELD | ACTOR },
    });

    balls = [
      Bodies.circle(300, 640, 11, {
        label: "ball",
        density: 0.003,
        friction: 0.05,
        restitution: 0.55,
        frictionAir: 0.01,
        collisionFilter: { category: ACTOR, mask: WALL | GATE | FIELD | ACTOR },
      }),
      Bodies.circle(160, 580, 9, {
        label: "ball",
        density: 0.0026,
        friction: 0.05,
        restitution: 0.6,
        frictionAir: 0.01,
        collisionFilter: { category: ACTOR, mask: WALL | GATE | FIELD | ACTOR },
      }),
    ];

    staticParts = walls;
    World.add(world, [...walls, padZone, reactorZone, conduitZone, gate, echo, cell, ...balls]);

    gears = [
      { x: 330, y: 220, r: 28, speed: 0.6 },
      { x: 40, y: 360, r: 18, speed: -0.9 },
      { x: 350, y: 480, r: 22, speed: 0.45 },
    ];

    for (let i = 0; i < 28; i++) {
      ambient.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.6 + Math.random() * 1.4,
        s: 8 + Math.random() * 20,
        a: Math.random(),
      });
    }
  }

  function resetRun() {
    if (engine) {
      World.clear(world, false);
      Engine.clear(engine);
    }
    ripples = [];
    particles = [];
    ambient = [];
    fieldBody = null;
    powered = false;
    conduitLive = false;
    ended = false;
    lightLevel = 0;
    powerPulse = 0;
    containHold = 0;
    echoIntent = "curious";
    echoLook = 0;
    echoCarry = false;
    echoPause = 0;
    echoGlance = 0;
    shockCd = 0;
    holdArmed = false;
    holdOrigin = null;
    draggingGate = false;
    winLock = false;
    storyT = 0;
    phase = "boot";
    vignette.classList.remove("powered", "lost");
    phone.classList.remove("glitch", "shake");
    replayBtn.classList.add("hidden");
    hideCaption();
    buildChamber();
    startStory();
  }

  // ——— Story beats ———
  const waits = [];
  function wait(ms) {
    return new Promise((r) => waits.push(setTimeout(r, ms)));
  }
  function clearWaits() {
    while (waits.length) clearTimeout(waits.pop());
  }

  async function startStory() {
    clearWaits();
    phase = "boot";
    startHum(0.008);
    tone(90, 0.4, "sine", 0.03);
    await wait(700);
    showCaption("CONTAINMENT SYSTEM ONLINE", { ms: 1800 });
    await wait(1900);
    showCaption("SUBJECT: UNKNOWN", { ms: 1600 });
    await wait(900);
    phase = "illuminate";
    // light ramp handled in update
    await wait(1600);
    hideCaption();
    phase = "contact";
    echoIntent = "look_player";
    echoLook = 1;
    await wait(900);
    // tap glass
    spawnRipple(echo.position.x, echo.position.y - 40, 1.2);
    tone(420, 0.08, "triangle", 0.035);
    haptic(8);
    shake = 0.35;
    await wait(700);
    phase = "play";
    echoIntent = "seek_cell";
    showCaption("RESTORE REACTOR POWER", { ms: 2800, subtle: true });
  }

  async function onReactorOnline() {
    if (powered) return;
    powered = true;
    conduitLive = true;
    phase = "reactor";
    echoCarry = false;
    echoIntent = "notice";
    echoPause = 1.4;
    powerPulse = 1;
    vignette.classList.add("powered");
    setHum(0.028);
    tone(180, 0.35, "sawtooth", 0.05, 120);
    tone(360, 0.5, "sine", 0.04, 80);
    haptic([20, 40, 20]);
    showCaption("REACTOR ONLINE", { ms: 2000 });
    await wait(1600);
    // look conduit, look player, then run
    echoIntent = "look_conduit";
    await wait(700);
    echoIntent = "look_player";
    echoGlance = 0.8;
    await wait(700);
    phase = "escape";
    echoIntent = "flee";
    hideCaption();
    tone(90, 0.25, "square", 0.03, -40);
  }

  async function onWin() {
    if (ended) return;
    ended = true;
    phase = "win";
    echoIntent = "contained";
    Body.setStatic(echo, true);
    haptic([30, 50, 30, 50, 60]);
    shake = 0.8;
    tone(220, 0.2, "sine", 0.05);
    tone(330, 0.35, "sine", 0.04);
    showCaption("CONTAINMENT RESTORED", { ms: 0 });
    await wait(1600);
    showCaption("SUBJECT BEHAVIOR UPDATED", { ms: 0 });
    await wait(1600);
    echoLook = 1;
    echoIntent = "look_player";
    await wait(900);
    spawnRipple(echo.position.x, echo.position.y - 36, 0.9);
    tone(480, 0.06, "triangle", 0.03);
    await wait(280);
    spawnRipple(echo.position.x, echo.position.y - 36, 0.9);
    tone(480, 0.06, "triangle", 0.03);
    await wait(600);
    phase = "blackout";
    lightLevel = 0;
    hideCaption();
    await wait(700);
    showCaption("ECHOGLASS", { ms: 0 });
    replayBtn.classList.remove("hidden");
    setHum(0.006);
  }

  async function onLose() {
    if (ended) return;
    ended = true;
    phase = "lose";
    conduitLive = false;
    Body.setPosition(echo, { x: -200, y: -200 });
    Body.setStatic(echo, true);
    phone.classList.add("glitch");
    vignette.classList.add("lost");
    lightLevel = 0.15;
    setHum(0.004);
    tone(60, 0.5, "sawtooth", 0.06, -30);
    haptic([40, 30, 80]);
    showCaption("CONTAINMENT LOST", { ms: 0, danger: true });
    await wait(1500);
    showCaption("WHERE IS IT?", { ms: 0, danger: true });
    await wait(900);
    phone.classList.remove("glitch");
    replayBtn.classList.remove("hidden");
  }

  // ——— Input ———
  const pointers = new Map();

  function canvasPos(e) {
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * sx,
      y: (e.clientY - rect.top) * sy,
    };
  }

  function nearGate(p) {
    const g = gate.position;
    return Math.hypot(p.x - g.x, p.y - g.y) < 55;
  }

  function onPointerDown(e) {
    e.preventDefault();
    ensureAudio();
    const p = canvasPos(e);
    pointers.set(e.pointerId, { ...p, t: performance.now(), moved: false });

    if (!ended && nearGate(p) && (phase === "play" || phase === "escape" || phase === "reactor")) {
      draggingGate = true;
      gateGrabY = p.y - gate.position.y;
      holdArmed = false;
      return;
    }

    holdOrigin = p;
    holdStart = performance.now();
    holdArmed = true;
  }

  function onPointerMove(e) {
    const rec = pointers.get(e.pointerId);
    if (!rec) return;
    const p = canvasPos(e);
    if (Math.hypot(p.x - rec.x, p.y - rec.y) > 10) rec.moved = true;
    rec.x = p.x;
    rec.y = p.y;

    if (draggingGate) {
      // track: y from 170 (open/up) to 310 (closed/down)
      const y = Math.max(170, Math.min(310, p.y - gateGrabY));
      gateTargetY = y;
      holdArmed = false;
    } else if (holdOrigin && holdArmed) {
      if (Math.hypot(p.x - holdOrigin.x, p.y - holdOrigin.y) > 18) {
        holdArmed = false;
        removeField();
      } else {
        holdOrigin = p;
      }
    }
  }

  function onPointerUp(e) {
    const rec = pointers.get(e.pointerId);
    pointers.delete(e.pointerId);
    const p = canvasPos(e);
    const held = rec ? performance.now() - rec.t : 0;

    if (draggingGate) {
      draggingGate = false;
      tone(140, 0.08, "triangle", 0.025);
      return;
    }

    if (holdArmed && held >= 380) {
      // field released with finger up — remove
      removeField();
      holdArmed = false;
      holdOrigin = null;
      return;
    }

    // tap shockwave
    if (holdArmed && held < 380 && !ended && phase !== "boot" && phase !== "blackout") {
      if (shockCd <= 0) {
        fireShockwave(p.x, p.y);
      }
    }
    removeField();
    holdArmed = false;
    holdOrigin = null;
  }

  function fireShockwave(x, y) {
    shockCd = 0.55;
    spawnRipple(x, y, 1.4);
    tone(260, 0.1, "sine", 0.04, -80);
    haptic(10);
    shake = Math.max(shake, 0.45);
    const targets = [echo, cell, ...balls];
    for (const b of targets) {
      const dx = b.position.x - x;
      const dy = b.position.y - y;
      const d = Math.hypot(dx, dy) || 1;
      if (d < 140) {
        const force = ((140 - d) / 140) * 0.045;
        Body.applyForce(b, b.position, {
          x: (dx / d) * force,
          y: (dy / d) * force,
        });
      }
    }
    if (echoIntent === "flee" || echoIntent === "seek_cell") {
      echoGlance = 0.5;
      echoIntent = echoIntent === "flee" ? "flee" : echoIntent;
      if (Math.random() < 0.45) {
        echoPause = 0.35;
        echoLook = 1;
      }
    }
  }

  function ensureField(x, y) {
    if (fieldBody) {
      Body.setPosition(fieldBody, { x, y });
      return;
    }
    fieldBody = Bodies.circle(x, y, 46, {
      isStatic: true,
      label: "field",
      restitution: 0.1,
      friction: 0.2,
      collisionFilter: { category: FIELD, mask: ACTOR },
      render: { visible: false },
    });
    World.add(world, fieldBody);
    tone(190, 0.15, "sine", 0.03);
    setHum(powered ? 0.032 : 0.018);
  }

  function removeField() {
    if (fieldBody) {
      World.remove(world, fieldBody);
      fieldBody = null;
      setHum(powered ? 0.028 : 0.012);
    }
  }

  canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
  canvas.addEventListener("pointermove", onPointerMove, { passive: false });
  canvas.addEventListener("pointerup", onPointerUp, { passive: false });
  canvas.addEventListener("pointercancel", onPointerUp, { passive: false });

  window.addEventListener("keydown", (e) => {
    const k = e.key.toLowerCase();
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " ", "w", "a", "s", "d"].includes(k)) {
      e.preventDefault();
    }
    if (k === "arrowleft" || k === "a") deskTilt.x = -1;
    if (k === "arrowright" || k === "d") deskTilt.x = 1;
    if (k === "arrowup" || k === "w") deskTilt.y = -1;
    if (k === "arrowdown" || k === "s") deskTilt.y = 1;
  });
  window.addEventListener("keyup", (e) => {
    const k = e.key.toLowerCase();
    if (k === "arrowleft" || k === "a") if (deskTilt.x < 0) deskTilt.x = 0;
    if (k === "arrowright" || k === "d") if (deskTilt.x > 0) deskTilt.x = 0;
    if (k === "arrowup" || k === "w") if (deskTilt.y < 0) deskTilt.y = 0;
    if (k === "arrowdown" || k === "s") if (deskTilt.y > 0) deskTilt.y = 0;
  });

  // Device orientation
  async function enableOrientation() {
    try {
      if (
        typeof DeviceOrientationEvent !== "undefined" &&
        typeof DeviceOrientationEvent.requestPermission === "function"
      ) {
        const res = await DeviceOrientationEvent.requestPermission();
        orientGranted = res === "granted";
      } else {
        orientGranted = true;
      }
    } catch (_) {
      orientGranted = false;
    }
  }

  window.addEventListener("deviceorientation", (e) => {
    if (!orientGranted && typeof DeviceOrientationEvent.requestPermission === "function") return;
    // beta: front-back (-180..180), gamma: left-right (-90..90)
    const g = (e.gamma || 0) / 45;
    const b = ((e.beta || 90) - 90) / 45;
    gravity.x = Math.max(-1.4, Math.min(1.4, g));
    gravity.y = Math.max(-0.3, Math.min(1.6, 1 + b * 0.85));
  });

  document.body.addEventListener(
    "touchstart",
    () => {
      enableOrientation();
      ensureAudio();
    },
    { once: true, passive: true },
  );

  replayBtn.addEventListener("click", () => {
    clearWaits();
    stopHum();
    humNode = null;
    resetRun();
  });

  // ——— Echo AI ———
  function echoSteer(tx, ty, strength = 0.00055) {
    const dx = tx - echo.position.x;
    const dy = ty - echo.position.y;
    const d = Math.hypot(dx, dy) || 1;
    Body.applyForce(echo, echo.position, {
      x: (dx / d) * strength,
      y: (dy / d) * strength * 0.85,
    });
    // face / look bias stored as echoLook direction
    echoLook = dx > 8 ? 1 : dx < -8 ? -1 : echoLook * 0.9;
  }

  function updateEcho(dt) {
    if (ended && phase !== "win") return;
    if (echoPause > 0) {
      echoPause -= dt;
      return;
    }
    if (echoGlance > 0) echoGlance -= dt;

    const ep = echo.position;
    const cp = cell.position;

    // field avoidance
    if (fieldBody) {
      const dx = ep.x - fieldBody.position.x;
      const dy = ep.y - fieldBody.position.y;
      const d = Math.hypot(dx, dy);
      if (d < 90) {
        Body.applyForce(echo, ep, {
          x: (dx / (d || 1)) * 0.0012,
          y: (dy / (d || 1)) * 0.0012,
        });
        if (echoIntent === "flee" && Math.random() < 0.02) {
          echoLook = 0;
          echoGlance = 0.6;
        }
      }
    }

    if (phase === "contact" || echoIntent === "look_player") {
      echoLook = 0;
      return;
    }
    if (echoIntent === "look_conduit") {
      echoSteer(conduitZone.position.x, conduitZone.position.y, 0.0001);
      return;
    }
    if (echoIntent === "curious") return;

    if (echoIntent === "seek_cell" && !echoCarry) {
      // path: climb toward cell shelf — bias upward when near ramps
      echoSteer(cp.x, cp.y, 0.00062);
      if (Math.hypot(ep.x - cp.x, ep.y - cp.y) < 48) {
        echoCarry = true;
        echoIntent = "carry";
        tone(520, 0.12, "sine", 0.03);
        spawnBurst(cp.x, cp.y, "#facc15", 10);
      }
      return;
    }

    if ((echoIntent === "carry" || echoCarry) && !powered) {
      // attach cell loosely
      const ox = ep.x + (echoLook >= 0 ? 26 : -26);
      const oy = ep.y + 6;
      Body.setVelocity(cell, {
        x: (ox - cp.x) * 0.12 + echo.velocity.x * 0.5,
        y: (oy - cp.y) * 0.12 + echo.velocity.y * 0.5,
      });
      echoSteer(reactorZone.position.x + 20, reactorZone.position.y, 0.0007);
      if (Math.hypot(cp.x - reactorZone.position.x, cp.y - reactorZone.position.y) < 50) {
        onReactorOnline();
      }
      return;
    }

    if (echoIntent === "flee" || phase === "escape") {
      // choose route: left or right around gate based on gate position & field
      let tx = conduitZone.position.x;
      let ty = conduitZone.position.y;
      const gateClosed = gate.position.y > 240;
      if (gateClosed) {
        // go around via left channel
        if (ep.y > 300) tx = 70;
        else tx = conduitZone.position.x;
      } else {
        // open path on right/center
        if (ep.y > 280) tx = 300;
      }
      if (fieldBody) {
        // alternate side of field
        tx = fieldBody.position.x < W / 2 ? W - 60 : 60;
      }
      echoSteer(tx, ty, 0.00095);
      // if blocked repeatedly, glance at player
      if (Math.hypot(echo.velocity.x, echo.velocity.y) < 0.35 && Math.random() < 0.01) {
        echoGlance = 0.7;
        echoLook = 0;
      }
      if (Math.hypot(ep.x - conduitZone.position.x, ep.y - conduitZone.position.y) < 38) {
        onLose();
      }
      return;
    }

    if (echoIntent === "contained") return;
  }

  function updateContainment(dt) {
    if (ended || !powered || phase === "lose") return;
    const onPad =
      Math.abs(echo.position.x - padZone.position.x) < 70 &&
      Math.abs(echo.position.y - padZone.position.y) < 36;
    const fieldOnPad =
      fieldBody &&
      Math.abs(fieldBody.position.x - padZone.position.x) < 55 &&
      Math.abs(fieldBody.position.y - padZone.position.y) < 40;

    if (onPad && fieldOnPad) {
      containHold += dt;
      powerPulse = Math.max(powerPulse, 0.4);
      if (containHold > 0.15 && !winLock) {
        showCaption("HOLD", { ms: 400, subtle: true });
      }
      if (containHold >= 2 && !winLock) {
        winLock = true;
        onWin();
      }
    } else {
      containHold = Math.max(0, containHold - dt * 1.5);
    }
  }

  function spawnRipple(x, y, power = 1) {
    ripples.push({ x, y, r: 8, max: 90 * power, a: 0.85, power });
  }

  function spawnBurst(x, y, color, n = 12) {
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const sp = 20 + Math.random() * 80;
      particles.push({
        x,
        y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp,
        life: 0.4 + Math.random() * 0.5,
        color,
        r: 1 + Math.random() * 2.5,
      });
    }
  }

  // ——— Update / render ———
  function resize() {
    // keep internal resolution; CSS stretches
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    // logical size fixed; scale via CSS
    canvas.width = W;
    canvas.height = H;
  }

  function update(dt) {
    storyT += dt;
    shockCd = Math.max(0, shockCd - dt);
    machineSpin += dt;
    if (shake > 0) shake = Math.max(0, shake - dt * 2.2);

    // lighting
    if (phase === "illuminate" || phase === "contact" || phase === "play" || phase === "reactor" || phase === "escape" || phase === "win") {
      lightLevel += (1 - lightLevel) * Math.min(1, dt * 1.2);
    }
    if (phase === "boot") lightLevel += (0.08 - lightLevel) * dt;
    if (phase === "blackout" || phase === "lose") lightLevel += (0 - lightLevel) * dt * 3;
    if (powered) powerPulse = Math.max(0, powerPulse - dt * 0.35) + Math.sin(storyT * 3) * 0.03;

    // gravity from device or desktop
    let gx = gravity.x;
    let gy = gravity.y;
    if (Math.abs(deskTilt.x) + Math.abs(deskTilt.y) > 0) {
      gx = deskTilt.x * 1.15;
      gy = 1 + deskTilt.y * 0.9;
    }
    engine.gravity.x = gx * 0.9;
    engine.gravity.y = Math.max(0.15, gy) * 0.95;

    // gate easing with weight
    const gy2 = gate.position.y;
    const nextY = gy2 + (gateTargetY - gy2) * Math.min(1, dt * 5.5);
    Body.setPosition(gate, { x: gate.position.x, y: nextY });

    // hold field
    if (holdArmed && holdOrigin && performance.now() - holdStart >= 380 && !draggingGate && !ended) {
      ensureField(holdOrigin.x, holdOrigin.y);
    }

    Engine.update(engine, Math.min(1000 / 30, dt * 1000));

    updateEcho(dt);
    updateContainment(dt);

    // ripples / particles
    for (const r of ripples) {
      r.r += dt * 160 * r.power;
      r.a -= dt * 1.4;
    }
    ripples = ripples.filter((r) => r.a > 0 && r.r < r.max);
    for (const p of particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 40 * dt;
      p.life -= dt;
    }
    particles = particles.filter((p) => p.life > 0);
    for (const a of ambient) {
      a.a += dt / a.s;
      a.y -= dt * 6;
      if (a.y < 0) a.y = H;
    }
  }

  function drawImg(img, x, y, w, h, rot = 0) {
    if (!img || !img.complete || !img.naturalWidth) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  function drawChamberBackdrop() {
    // deep metal
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, `rgba(8,12,22,${0.95 * lightLevel + 0.05})`);
    g.addColorStop(0.5, `rgba(15,23,42,${0.9 * lightLevel + 0.05})`);
    g.addColorStop(1, `rgba(2,6,23,${0.98})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // panel lines
    ctx.save();
    ctx.globalAlpha = 0.12 + lightLevel * 0.2;
    ctx.strokeStyle = "#64748b";
    ctx.lineWidth = 1;
    for (let y = 40; y < H; y += 52) {
      ctx.beginPath();
      ctx.moveTo(18, y);
      ctx.lineTo(W - 18, y);
      ctx.stroke();
    }
    // rivets
    ctx.fillStyle = "#94a3b8";
    for (let y = 60; y < H; y += 104) {
      ctx.beginPath();
      ctx.arc(24, y, 2.2, 0, Math.PI * 2);
      ctx.arc(W - 24, y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // animated machinery
    ctx.save();
    ctx.globalAlpha = 0.25 + lightLevel * 0.45 + (powered ? 0.15 : 0);
    for (const gear of gears) {
      ctx.save();
      ctx.translate(gear.x, gear.y);
      ctx.rotate(machineSpin * gear.speed);
      ctx.strokeStyle = powered ? "#22d3ee" : "#64748b";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, gear.r, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * (gear.r - 4), Math.sin(a) * (gear.r - 4));
        ctx.lineTo(Math.cos(a) * (gear.r + 6), Math.sin(a) * (gear.r + 6));
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.restore();

    // ambient motes
    ctx.save();
    for (const a of ambient) {
      ctx.globalAlpha = (0.15 + Math.sin(a.a * 6) * 0.1) * lightLevel;
      ctx.fillStyle = powered ? "#67e8f9" : "#94a3b8";
      ctx.beginPath();
      ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawStaticGeometry() {
    ctx.save();
    ctx.globalAlpha = 0.55 + lightLevel * 0.4;
    for (const b of staticParts) {
      const { x, y } = b.position;
      const verts = b.vertices;
      ctx.beginPath();
      ctx.moveTo(verts[0].x, verts[0].y);
      for (let i = 1; i < verts.length; i++) ctx.lineTo(verts[i].x, verts[i].y);
      ctx.closePath();
      const metal = ctx.createLinearGradient(x - 40, y - 20, x + 40, y + 20);
      metal.addColorStop(0, "#1e293b");
      metal.addColorStop(0.5, powered ? "#334155" : "#0f172a");
      metal.addColorStop(1, "#020617");
      ctx.fillStyle = metal;
      ctx.fill();
      ctx.strokeStyle = powered ? "rgba(34,211,238,0.35)" : "rgba(100,116,139,0.55)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // edge light strip
      if (powered) {
        ctx.strokeStyle = "rgba(34,211,238,0.2)";
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawZones() {
    // pad
    drawImg(imgs.pad, padZone.position.x, padZone.position.y + 4, 170, 70);
    if (containHold > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(0.7, containHold / 2);
      ctx.strokeStyle = "#22d3ee";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(padZone.position.x, padZone.position.y, 48 + containHold * 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // reactor
    const rx = reactorZone.position.x;
    const ry = reactorZone.position.y;
    drawImg(imgs.reactor, rx, ry, 78, 78);
    if (powered) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const glow = ctx.createRadialGradient(rx, ry, 4, rx, ry, 70);
      glow.addColorStop(0, "rgba(192,132,252,0.55)");
      glow.addColorStop(1, "rgba(192,132,252,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(rx, ry, 70, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // conduit
    const cx = conduitZone.position.x;
    const cy = conduitZone.position.y;
    drawImg(imgs.conduit, cx, cy, 82, 82);
    if (conduitLive) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const pulse = 0.45 + Math.sin(storyT * 6) * 0.2;
      const glow = ctx.createRadialGradient(cx, cy, 4, cx, cy, 80);
      glow.addColorStop(0, `rgba(34,211,238,${pulse})`);
      glow.addColorStop(1, "rgba(34,211,238,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, 80, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawActors() {
    // balls
    for (const b of balls) {
      ctx.save();
      ctx.translate(b.position.x, b.position.y);
      const grd = ctx.createRadialGradient(-3, -3, 1, 0, 0, b.circleRadius);
      grd.addColorStop(0, "#cbd5e1");
      grd.addColorStop(1, "#334155");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(0, 0, b.circleRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // cell
    drawImg(imgs.cell, cell.position.x, cell.position.y, 34, 58, cell.angle);

    // gate
    drawImg(imgs.gate, gate.position.x, gate.position.y, 48, 120);
    // track
    ctx.save();
    ctx.strokeStyle = "rgba(148,163,184,0.35)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(gate.position.x + 28, 160);
    ctx.lineTo(gate.position.x + 28, 330);
    ctx.stroke();
    ctx.restore();

    // echo
    if (phase !== "lose" && phase !== "blackout") {
      const ex = echo.position.x;
      const ey = echo.position.y;
      ctx.save();
      // soft glow
      ctx.globalCompositeOperation = "lighter";
      const eg = ctx.createRadialGradient(ex, ey, 2, ex, ey, 40);
      eg.addColorStop(0, "rgba(34,211,238,0.35)");
      eg.addColorStop(1, "rgba(34,211,238,0)");
      ctx.fillStyle = eg;
      ctx.beginPath();
      ctx.arc(ex, ey, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
      // slight squash from velocity
      const squash = Math.min(0.12, Math.hypot(echo.velocity.x, echo.velocity.y) * 0.02);
      ctx.translate(ex, ey);
      ctx.scale(1 + squash, 1 - squash);
      // glance: bias sprite toward player (camera) by slight scale
      const lookScale = echoGlance > 0 ? 1.06 : 1;
      drawImg(imgs.echo, 0, 0, 52 * lookScale, 64 * lookScale, echo.angle * 0.15);
      ctx.restore();
    }

    // field
    if (fieldBody) {
      const fx = fieldBody.position.x;
      const fy = fieldBody.position.y;
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const fg = ctx.createRadialGradient(fx, fy, 8, fx, fy, 52);
      fg.addColorStop(0, "rgba(34,211,238,0.35)");
      fg.addColorStop(0.7, "rgba(56,189,248,0.18)");
      fg.addColorStop(1, "rgba(34,211,238,0)");
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.arc(fx, fy, 52, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(165,243,252,${0.55 + Math.sin(storyT * 10) * 0.2})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(fx, fy, 44, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(fx, fy, 36, storyT * 2, storyT * 2 + Math.PI * 1.5);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

  function drawFx() {
    for (const r of ripples) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, r.a);
      ctx.strokeStyle = "#a5f3fc";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = Math.max(0, r.a * 0.4);
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r * 0.65, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life * 2);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // darkness veil
    const dark = 1 - lightLevel;
    if (dark > 0.02) {
      ctx.fillStyle = `rgba(0,0,0,${dark * 0.92})`;
      ctx.fillRect(0, 0, W, H);
    }

    // power surge flash
    if (powerPulse > 0.5) {
      ctx.fillStyle = `rgba(34,211,238,${(powerPulse - 0.5) * 0.25})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  function render() {
    ctx.save();
    if (shake > 0) {
      ctx.translate((Math.random() - 0.5) * shake * 10, (Math.random() - 0.5) * shake * 8);
    }
    ctx.clearRect(-20, -20, W + 40, H + 40);
    drawChamberBackdrop();
    drawStaticGeometry();
    drawZones();
    drawActors();
    drawFx();
    ctx.restore();
  }

  function frame(ts) {
    const dt = Math.min(0.033, (ts - lastTs) / 1000 || 0.016);
    lastTs = ts;
    try {
      update(dt);
      render();
    } catch (err) {
      console.error(err);
    }
    requestAnimationFrame(frame);
  }

  function boot() {
    resize();
    window.addEventListener("resize", resize);
    resetRun();
    requestAnimationFrame(frame);
  }

  // Expose debug helpers for automated testing
  window.__echoDebug = {
    getPhase: () => phase,
    getIntent: () => echoIntent,
    powered: () => powered,
    setPhase: (p) => {
      phase = p;
    },
    forceReactor: () => onReactorOnline(),
    forceWin: () => onWin(),
    forceLose: () => onLose(),
    teleportEcho: (x, y) => Body.setPosition(echo, { x, y }),
    teleportCell: (x, y) => Body.setPosition(cell, { x, y }),
  };
})();
