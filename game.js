/* Baiacu John Wick V2 — HTML5 Canvas + JavaScript puro */
(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  const ui = {
    phase: document.getElementById("phase"),
    killed: document.getElementById("killed"),
    escaped: document.getElementById("escaped"),
    highscore: document.getElementById("highscore"),
    lives: document.getElementById("lives"),
    progress: document.getElementById("progress-bar"),
    overlay: document.getElementById("overlay"),
    overlayTitle: document.getElementById("overlay-title"),
    overlayText: document.getElementById("overlay-text"),
    start: document.getElementById("start-btn"),
    announcement: document.getElementById("announcement"),
  };

  const state = {
    mode: "ready", // ready, playing, finale, won, lost
    killed: 0,
    escaped: 0,
    lives: 3,
    phase: 1,
    frame: 0,
    lastTime: 0,
    spawnTimer: 0,
    highscore: Number(localStorage.getItem("baiacuJohnWickRecorde") || 0),
    announcementTimer: 0,
    shake: 0,
    finaleTime: 0,
  };

  const player = { x: 82, y: H / 2 - 25, w: 76, h: 54, speed: 350, cooldown: 0, invulnerable: 0 };
  const shots = [];
  const jellies = [];
  const particles = [];
  const bubbles = [];
  const input = { up: false, down: false };

  for (let i = 0; i < 34; i++) {
    bubbles.push({ x: Math.random() * W, y: Math.random() * H, r: 2 + Math.random() * 5, speed: 12 + Math.random() * 22, drift: Math.random() * 3 });
  }

  function crabSvg() {
    return `<svg class="crab" viewBox="0 0 64 48" aria-hidden="true"><g fill="none" stroke="#ff8067" stroke-width="5" stroke-linecap="round"><path d="M17 31 7 39M47 31l10 8M16 25 5 20M48 25l11-5"/><path d="M14 19 8 10M50 19l6-9"/></g><path fill="#ff6b57" d="M13 26c0-12 9-20 19-20s19 8 19 20c0 10-8 17-19 17s-19-7-19-17Z"/><circle cx="24" cy="20" r="3" fill="#031820"/><circle cx="40" cy="20" r="3" fill="#031820"/><path d="M25 31c4 3 10 3 14 0" fill="none" stroke="#031820" stroke-width="3" stroke-linecap="round"/></svg>`;
  }

  function updateHud() {
    ui.phase.textContent = `${state.phase} / 10`;
    ui.killed.textContent = `${state.killed} / 100`;
    ui.escaped.textContent = state.escaped;
    ui.highscore.textContent = state.highscore;
    ui.progress.style.width = `${state.killed}%`;
    ui.lives.innerHTML = Array.from({ length: state.lives }, crabSvg).join("");
    ui.lives.setAttribute("aria-label", `${state.lives} ${state.lives === 1 ? "vida" : "vidas"}`);
  }

  function announce(text) {
    ui.announcement.textContent = text;
    ui.announcement.classList.remove("hidden");
    state.announcementTimer = 1.8;
  }

  function reset() {
    Object.assign(state, { mode: "playing", killed: 0, escaped: 0, lives: 3, phase: 1, frame: 0, lastTime: performance.now(), spawnTimer: 0.9, announcementTimer: 0, shake: 0, finaleTime: 0 });
    Object.assign(player, { x: 82, y: H / 2 - 25, cooldown: 0, invulnerable: 0 });
    shots.length = 0;
    jellies.length = 0;
    particles.length = 0;
    ui.overlay.classList.add("hidden");
    ui.announcement.classList.add("hidden");
    updateHud();
    announce("FASE 1");
  }

  function shoot() {
    if (state.mode !== "playing" || player.cooldown > 0) return;
    shots.push({ x: player.x + player.w - 5, y: player.y + player.h * 0.53, r: 7, speed: 570 });
    player.cooldown = 0.22;
    createParticles(player.x + player.w, player.y + player.h * 0.53, "#7df04d", 4, 50);
  }

  function spawnJelly() {
    const size = 40 + Math.random() * 32;
    const speed = 105 + state.phase * 18 + Math.random() * 50;
    jellies.push({
      x: W + size,
      y: 50 + Math.random() * (H - 150),
      w: size,
      h: size * 1.2,
      speed,
      hp: 2,
      wobble: Math.random() * Math.PI * 2,
      flash: 0,
      dead: false,
    });
  }

  function createParticles(x, y, color, amount, force = 120) {
    for (let i = 0; i < amount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * force;
      particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: .45 + Math.random() * .45, color, size: 2 + Math.random() * 5 });
    }
  }

  function intersects(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function earnKill(jelly) {
    jelly.dead = true;
    state.killed += 1;
    createParticles(jelly.x + jelly.w / 2, jelly.y + jelly.h / 2, "#dd7cff", 18, 190);

    if (state.killed > state.highscore) {
      state.highscore = state.killed;
      localStorage.setItem("baiacuJohnWickRecorde", String(state.highscore));
    }

    if (state.killed % 5 === 0) {
      state.lives += 1;
      announce("VIDA EXTRA! +1 CARANGUEJO");
    }

    if (state.killed >= 100) {
      startFinale();
      return;
    }

    const newPhase = Math.min(10, Math.floor(state.killed / 10) + 1);
    if (newPhase !== state.phase) {
      state.phase = newPhase;
      announce(`FASE ${state.phase} — AS ÁGUAS-VIVAS ACELERARAM!`);
    }
    updateHud();
  }

  function loseLife(message) {
    if (state.mode !== "playing") return;
    state.lives -= 1;
    state.shake = 0.35;
    player.invulnerable = 1.2;
    updateHud();
    if (state.lives <= 0) endGame(false);
    else announce(message);
  }

  function startFinale() {
    state.mode = "finale";
    state.phase = 10;
    state.finaleTime = 0;
    shots.length = 0;
    jellies.length = 0;
    updateHud();
    announce("100 ÁGUAS-VIVAS! O TESOURO FOI ENCONTRADO!");
  }

  function endGame(won) {
    state.mode = won ? "won" : "lost";
    ui.overlayTitle.textContent = won ? "Tesouro encontrado!" : "Missão encerrada";
    ui.overlayText.innerHTML = won
      ? `Você derrotou <strong>100 águas-vivas</strong>, atravessou as dez fases e encontrou o baú do navio pirata naufragado!`
      : `Você derrotou <strong>${state.killed} águas-vivas</strong> e <strong>${state.escaped}</strong> escaparam.<br />O tesouro continua esperando por você.`;
    ui.start.textContent = won ? "Jogar novamente" : "Tentar novamente";
    ui.overlay.querySelector(".overlay-emblem").textContent = won ? "🏴‍☠️" : "🐡";
    ui.overlay.classList.remove("hidden");
  }

  function update(dt) {
    state.frame += 1;
    if (state.announcementTimer > 0) {
      state.announcementTimer -= dt;
      if (state.announcementTimer <= 0) ui.announcement.classList.add("hidden");
    }
    state.shake = Math.max(0, state.shake - dt);
    player.cooldown = Math.max(0, player.cooldown - dt);
    player.invulnerable = Math.max(0, player.invulnerable - dt);

    for (const bubble of bubbles) {
      bubble.y -= bubble.speed * dt;
      bubble.x += Math.sin(state.frame * .01 + bubble.drift) * 5 * dt;
      if (bubble.y < -12) { bubble.y = H + 12; bubble.x = Math.random() * W; }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 45 * dt; p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }

    if (state.mode === "finale") {
      state.finaleTime += dt;
      player.x += (620 - player.x) * Math.min(1, dt * 1.3);
      player.y += (310 - player.y) * Math.min(1, dt * 1.3);
      if (state.finaleTime > 5) endGame(true);
      return;
    }
    if (state.mode !== "playing") return;

    if (input.up) player.y -= player.speed * dt;
    if (input.down) player.y += player.speed * dt;
    player.y = Math.max(8, Math.min(H - player.h - 45, player.y));

    for (let i = shots.length - 1; i >= 0; i--) {
      shots[i].x += shots[i].speed * dt;
      if (shots[i].x - shots[i].r > W) shots.splice(i, 1);
    }

    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawnJelly();
      state.spawnTimer = Math.max(.48, 1.25 - state.phase * .065) * (.82 + Math.random() * .36);
    }

    for (let i = jellies.length - 1; i >= 0; i--) {
      const jelly = jellies[i];
      jelly.wobble += dt * 4;
      jelly.x -= jelly.speed * dt;
      jelly.y += Math.sin(jelly.wobble) * 18 * dt;
      jelly.flash = Math.max(0, jelly.flash - dt);

      let wasHit = false;
      for (let s = shots.length - 1; s >= 0; s--) {
        const shotBox = { x: shots[s].x - shots[s].r, y: shots[s].y - shots[s].r, w: shots[s].r * 2, h: shots[s].r * 2 };
        if (!intersects(shotBox, jelly)) continue;
        shots.splice(s, 1);
        jelly.hp -= 1;
        jelly.flash = .16;
        wasHit = true;
        createParticles(shotBox.x, shotBox.y, "#7df04d", 8, 100);
        if (jelly.hp <= 0) earnKill(jelly);
        break;
      }
      if (state.mode !== "playing") break;
      if (jelly.dead) { jellies.splice(i, 1); continue; }
      if (wasHit) continue;

      if (player.invulnerable <= 0 && intersects(player, jelly)) {
        jellies.splice(i, 1);
        loseLife("CUIDADO! A ÁGUA-VIVA ATINGIU O BAIACU");
        continue;
      }

      if (jelly.x + jelly.w < 0) {
        jellies.splice(i, 1);
        state.escaped += 1;
        updateHud();
        announce("UMA ÁGUA-VIVA ESCAPOU!");
      }
    }
  }

  function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, "#0d8aa1"); gradient.addColorStop(.58, "#075064"); gradient.addColorStop(1, "#032633");
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "rgba(210,255,245,.08)";
    ctx.beginPath(); ctx.moveTo(90, 0); ctx.lineTo(280, 0); ctx.lineTo(440, H); ctx.lineTo(300, H); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(580, 0); ctx.lineTo(680, 0); ctx.lineTo(850, H); ctx.lineTo(730, H); ctx.closePath(); ctx.fill();

    ctx.fillStyle = "#052a31"; ctx.beginPath(); ctx.moveTo(0, H - 44);
    for (let x = 0; x <= W; x += 60) ctx.quadraticCurveTo(x + 30, H - 66 - Math.sin(x) * 8, x + 60, H - 43);
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();

    for (const bubble of bubbles) {
      ctx.strokeStyle = "rgba(225,255,252,.35)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(bubble.x, bubble.y, bubble.r, 0, Math.PI * 2); ctx.stroke();
    }
    drawPlants();
  }

  function drawPlants() {
    ctx.lineCap = "round";
    for (let x = 24; x < W; x += 95) {
      const h = 25 + (x % 50);
      ctx.strokeStyle = x % 2 ? "#0d6961" : "#0a7b68"; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(x, H - 25); ctx.quadraticCurveTo(x - 12, H - h, x + Math.sin(state.frame * .02 + x) * 8, H - h - 18); ctx.stroke();
    }
  }

  function drawPlayer() {
    const { x, y, w, h } = player;
    if (player.invulnerable > 0 && Math.floor(player.invulnerable * 12) % 2 === 0) return;
    ctx.save();
    ctx.fillStyle = "#e3a62d"; ctx.beginPath(); ctx.moveTo(x + 5, y + h / 2); ctx.lineTo(x - 18, y + 8); ctx.lineTo(x - 16, y + h - 5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#ffd34e"; ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#c98a22"; ctx.lineWidth = 3;
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2; const cx = x + w / 2; const cy = y + h / 2;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * (w / 2 - 4), cy + Math.sin(a) * (h / 2 - 3)); ctx.lineTo(cx + Math.cos(a) * (w / 2 + 8), cy + Math.sin(a) * (h / 2 + 7)); ctx.stroke();
    }
    ctx.fillStyle = "#f7ffff"; ctx.beginPath(); ctx.arc(x + w * .73, y + h * .35, 8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#061c20"; ctx.beginPath(); ctx.arc(x + w * .77, y + h * .35, 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#061c20"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + w * .72, y + h * .69); ctx.lineTo(x + w * .9, y + h * .66); ctx.stroke();
    ctx.fillStyle = "#292b2e"; ctx.fillRect(x + w * .36, y - 10, w * .39, 11); ctx.fillRect(x + w * .44, y - 24, w * .23, 17);
    ctx.restore();
  }

  function drawJelly(jelly) {
    const cx = jelly.x + jelly.w / 2; const cy = jelly.y + jelly.h * .4;
    ctx.save();
    ctx.globalAlpha = jelly.hp === 1 ? .68 : .94;
    ctx.fillStyle = jelly.flash > 0 ? "#eaff75" : "#d477ed";
    ctx.beginPath(); ctx.arc(cx, cy, jelly.w / 2, Math.PI, 0); ctx.quadraticCurveTo(cx + jelly.w / 2, cy + jelly.h * .25, cx, cy + jelly.h * .2); ctx.quadraticCurveTo(cx - jelly.w / 2, cy + jelly.h * .25, cx - jelly.w / 2, cy); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.34)"; ctx.beginPath(); ctx.ellipse(cx - jelly.w * .18, cy - jelly.h * .12, jelly.w * .11, jelly.h * .08, -.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = jelly.flash > 0 ? "#eaff75" : "#d477ed"; ctx.lineWidth = 4; ctx.lineCap = "round";
    for (let i = -1; i <= 1; i++) {
      const tx = cx + i * jelly.w * .23; const sway = Math.sin(jelly.wobble + i) * 8;
      ctx.beginPath(); ctx.moveTo(tx, cy + jelly.h * .18); ctx.bezierCurveTo(tx + sway, cy + jelly.h * .42, tx - sway, cy + jelly.h * .62, tx + sway, cy + jelly.h * .76); ctx.stroke();
    }
    ctx.fillStyle = "#09232a"; ctx.beginPath(); ctx.arc(cx - 9, cy - 2, 3, 0, Math.PI * 2); ctx.arc(cx + 9, cy - 2, 3, 0, Math.PI * 2); ctx.fill();
    if (jelly.hp === 1) { ctx.strokeStyle = "#09232a"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 15, cy - 10); ctx.lineTo(cx - 5, cy - 5); ctx.stroke(); }
    ctx.restore();
  }

  function drawShot(shot) {
    const glow = ctx.createRadialGradient(shot.x, shot.y, 1, shot.x, shot.y, 16);
    glow.addColorStop(0, "#efffd8"); glow.addColorStop(.35, "#7df04d"); glow.addColorStop(1, "rgba(125,240,77,0)");
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(shot.x, shot.y, 16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#7df04d"; ctx.beginPath(); ctx.arc(shot.x, shot.y, shot.r, 0, Math.PI * 2); ctx.fill();
  }

  function drawFinale() {
    const t = Math.min(1, state.finaleTime / 2.8); const shipX = W + 260 - t * 520;
    ctx.save(); ctx.translate(shipX, 300); ctx.rotate(-.13);
    ctx.fillStyle = "#402c27"; ctx.beginPath(); ctx.moveTo(-170, 35); ctx.lineTo(155, 35); ctx.lineTo(100, 112); ctx.lineTo(-115, 112); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "#745142"; ctx.lineWidth = 7; for (let y = 52; y < 105; y += 18) { ctx.beginPath(); ctx.moveTo(-150, y); ctx.lineTo(125, y); ctx.stroke(); }
    ctx.strokeStyle = "#503830"; ctx.lineWidth = 13; ctx.beginPath(); ctx.moveTo(-35, 38); ctx.lineTo(-35, -135); ctx.stroke();
    ctx.fillStyle = "#20272a"; ctx.beginPath(); ctx.moveTo(-28, -125); ctx.lineTo(90, -72); ctx.lineTo(-28, -25); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#ecf4e9"; ctx.beginPath(); ctx.arc(14, -75, 18, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#20272a"; ctx.beginPath(); ctx.arc(9, -78, 3, 0, Math.PI * 2); ctx.arc(19, -78, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    const chestX = shipX - 145; const chestY = 422;
    ctx.fillStyle = "#754520"; ctx.fillRect(chestX, chestY, 90, 55); ctx.beginPath(); ctx.arc(chestX + 45, chestY, 45, Math.PI, 0); ctx.fill();
    ctx.fillStyle = "#ffd34e"; ctx.fillRect(chestX + 39, chestY, 14, 55); ctx.fillRect(chestX, chestY + 10, 90, 9);
    for (let i = 0; i < 15; i++) { ctx.fillStyle = i % 2 ? "#ffec7b" : "#eeb42d"; ctx.beginPath(); ctx.arc(chestX + 10 + (i * 23) % 74, chestY - 4 - (i % 4) * 7, 7, 0, Math.PI * 2); ctx.fill(); }
  }

  function draw() {
    ctx.save();
    if (state.shake > 0) ctx.translate((Math.random() - .5) * 12, (Math.random() - .5) * 12);
    drawBackground();
    if (state.mode === "finale" || state.mode === "won") drawFinale();
    for (const shot of shots) drawShot(shot);
    for (const jelly of jellies) drawJelly(jelly);
    for (const p of particles) { ctx.globalAlpha = Math.min(1, p.life * 2); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }
    ctx.globalAlpha = 1;
    drawPlayer();
    ctx.restore();
  }

  function loop(time) {
    const dt = Math.min(.033, Math.max(0, (time - state.lastTime) / 1000 || 0));
    state.lastTime = time;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  const keyMap = { ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down" };
  document.addEventListener("keydown", (event) => {
    if (keyMap[event.code]) { input[keyMap[event.code]] = true; event.preventDefault(); }
    if (event.code === "Space") { shoot(); event.preventDefault(); }
  });
  document.addEventListener("keyup", (event) => { if (keyMap[event.code]) input[keyMap[event.code]] = false; });
  window.addEventListener("blur", () => { input.up = false; input.down = false; });

  function bindHold(id, direction) {
    const button = document.getElementById(id);
    const stop = (event) => { event.preventDefault(); input[direction] = false; };
    button.addEventListener("pointerdown", (event) => { event.preventDefault(); input[direction] = true; button.setPointerCapture(event.pointerId); });
    button.addEventListener("pointerup", stop); button.addEventListener("pointercancel", stop); button.addEventListener("lostpointercapture", stop);
  }
  bindHold("btn-up", "up"); bindHold("btn-down", "down");
  document.getElementById("btn-shoot").addEventListener("pointerdown", (event) => { event.preventDefault(); shoot(); });
  ui.start.addEventListener("click", reset);

  ui.highscore.textContent = state.highscore;
  updateHud();
  draw();
  requestAnimationFrame(loop);
})();
