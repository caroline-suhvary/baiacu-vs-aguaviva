/* ===== Baiacu vs Água-Viva — JavaScript puro (Canvas 2D) ===== */

(() => {
  "use strict";

  // ---- Setup do canvas ----
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;

  // ---- Elementos da UI ----
  const scoreEl = document.getElementById("score");
  const livesEl = document.getElementById("lives");
  const highscoreEl = document.getElementById("highscore");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayText = document.getElementById("overlay-text");
  const startBtn = document.getElementById("start-btn");

  // ---- Estado do jogo ----
  const state = {
    running: false,
    score: 0,
    lives: 3,
    highscore: Number(localStorage.getItem("baiacuHighscore") || 0),
    frame: 0,
  };
  highscoreEl.textContent = state.highscore;

  // ---- Entidades ----
  const player = {
    x: 70,
    y: H / 2,
    w: 56,
    h: 40,
    speed: 5,
    cooldown: 0,
  };

  const shots = []; // veneno
  const jellies = []; // águas-vivas
  const bubbles = []; // decoração

  const input = { up: false, down: false };

  // ---- Fundo: bolhas decorativas ----
  for (let i = 0; i < 18; i++) {
    bubbles.push({
      x: Math.random() * W,
      y: Math.random() * H,
      r: 2 + Math.random() * 5,
      vy: 0.3 + Math.random() * 0.7,
    });
  }

  // ---- Controles: teclado ----
  const keyMap = {
    ArrowUp: "up",
    KeyW: "up",
    ArrowDown: "down",
    KeyS: "down",
  };

  document.addEventListener("keydown", (e) => {
    if (keyMap[e.code]) {
      input[keyMap[e.code]] = true;
      e.preventDefault();
    }
    if (e.code === "Space") {
      shoot();
      e.preventDefault();
    }
  });

  document.addEventListener("keyup", (e) => {
    if (keyMap[e.code]) input[keyMap[e.code]] = false;
  });

  // ---- Controles: toque (mobile) ----
  function bindHold(id, prop) {
    const btn = document.getElementById(id);
    const set = (v) => (e) => {
      e.preventDefault();
      input[prop] = v;
    };
    btn.addEventListener("touchstart", set(true), { passive: false });
    btn.addEventListener("touchend", set(false));
    btn.addEventListener("mousedown", set(true));
    btn.addEventListener("mouseup", set(false));
    btn.addEventListener("mouseleave", set(false));
  }
  bindHold("btn-up", "up");
  bindHold("btn-down", "down");
  document.getElementById("btn-shoot").addEventListener("touchstart", (e) => {
    e.preventDefault();
    shoot();
  }, { passive: false });
  document.getElementById("btn-shoot").addEventListener("mousedown", shoot);

  // ---- Ações ----
  function shoot() {
    if (!state.running || player.cooldown > 0) return;
    shots.push({ x: player.x + player.w - 6, y: player.y + player.h / 2, r: 6, speed: 8 });
    player.cooldown = 16; // frames entre tiros
  }

  function spawnJelly() {
    const size = 30 + Math.random() * 26;
    jellies.push({
      x: W + 60,
      y: 40 + Math.random() * (H - 100),
      w: size,
      h: size * 1.15,
      speed: 1.4 + Math.random() * 1.6 + Math.min(state.score * 0.03, 2),
      wobble: Math.random() * Math.PI * 2,
    });
  }

  function reset() {
    state.score = 0;
    state.lives = 3;
    state.frame = 0;
    player.y = H / 2;
    shots.length = 0;
    jellies.length = 0;
    updateHud();
  }

  function start() {
    reset();
    state.running = true;
    overlay.classList.add("hidden");
  }

  function gameOver() {
    state.running = false;
    if (state.score > state.highscore) {
      state.highscore = state.score;
      localStorage.setItem("baiacuHighscore", String(state.highscore));
      highscoreEl.textContent = state.highscore;
    }
    overlayTitle.textContent = "☠️ Game Over!";
    overlayText.innerHTML = `Você fez <strong>${state.score} pontos</strong>.<br>As águas-vivas venceram dessa vez… bora tentar de novo?`;
    startBtn.textContent = "↻ Jogar novamente";
    overlay.classList.remove("hidden");
  }

  function updateHud() {
    scoreEl.textContent = state.score;
    livesEl.textContent = "❤️".repeat(Math.max(state.lives, 0)) || "💀";
  }

  // ---- Colisão (círculos aproximados) ----
  function hit(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  // ---- Atualização ----
  function update() {
    state.frame++;
    if (player.cooldown > 0) player.cooldown--;

    // movimento do baiacu
    if (input.up) player.y -= player.speed;
    if (input.down) player.y += player.speed;
    player.y = Math.max(0, Math.min(H - player.h, player.y));

    // tiros
    for (let i = shots.length - 1; i >= 0; i--) {
      shots[i].x += shots[i].speed;
      if (shots[i].x > W) shots.splice(i, 1);
    }

    // spawn de águas-vivas (fica mais frequente com o tempo)
    const interval = Math.max(40, 90 - Math.floor(state.score / 3));
    if (state.frame % interval === 0) spawnJelly();

    // águas-vivas
    for (let i = jellies.length - 1; i >= 0; i--) {
      const j = jellies[i];
      j.wobble += 0.06;
      j.x -= j.speed;
      j.y += Math.sin(j.wobble) * 0.8;

      // veneno acertou?
      for (let s = shots.length - 1; s >= 0; s--) {
        const shot = { x: shots[s].x - 6, y: shots[s].y - 6, w: 12, h: 12 };
        if (hit(shot, j)) {
          shots.splice(s, 1);
          jellies.splice(i, 1);
          state.score += 10;
          updateHud();
          break;
        }
      }
      if (!jellies[i]) continue;

      // água-viva encostou no baiacu?
      if (hit(player, j)) {
        jellies.splice(i, 1);
        state.lives--;
        updateHud();
        if (state.lives <= 0) {
          gameOver();
          return;
        }
        continue;
      }

      // saiu da tela
      if (j.x + j.w < 0) jellies.splice(i, 1);
    }

    // bolhas
    for (const b of bubbles) {
      b.y -= b.vy;
      if (b.y < -10) {
        b.y = H + 10;
        b.x = Math.random() * W;
      }
    }
  }

  // ---- Desenho ----
  function drawPlayer() {
    const { x, y, w, h } = player;
    ctx.save();

    // corpo
    ctx.fillStyle = "#ffcc4d";
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // espinhos
    ctx.strokeStyle = "#e0a52e";
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(x + w / 2 + Math.cos(ang) * (w / 2 - 4), y + h / 2 + Math.sin(ang) * (h / 2 - 4));
      ctx.lineTo(x + w / 2 + Math.cos(ang) * (w / 2 + 4), y + h / 2 + Math.sin(ang) * (h / 2 + 4));
      ctx.stroke();
    }

    // cauda
    ctx.fillStyle = "#e0a52e";
    ctx.beginPath();
    ctx.moveTo(x, y + h / 2);
    ctx.lineTo(x - 12, y + h / 2 - 10);
    ctx.lineTo(x - 12, y + h / 2 + 10);
    ctx.closePath();
    ctx.fill();

    // olho
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(x + w * 0.72, y + h * 0.38, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#222";
    ctx.beginPath();
    ctx.arc(x + w * 0.75, y + h * 0.38, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawJelly(j) {
    ctx.save();
    const cx = j.x + j.w / 2;
    const cy = j.y + j.h / 2;

    // corpo (sino)
    ctx.fillStyle = "rgba(214, 120, 255, 0.85)";
    ctx.beginPath();
    ctx.arc(cx, cy, j.w / 2, Math.PI, 0);
    ctx.quadraticCurveTo(cx + j.w / 2, cy + j.h * 0.28, cx, cy + j.h * 0.28);
    ctx.quadraticCurveTo(cx - j.w / 2, cy + j.h * 0.28, cx - j.w / 2, cy);
    ctx.fill();

    // brilho
    ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
    ctx.beginPath();
    ctx.arc(cx - j.w * 0.15, cy - j.h * 0.12, j.w * 0.12, 0, Math.PI * 2);
    ctx.fill();

    // tentáculos
    ctx.strokeStyle = "rgba(214, 120, 255, 0.7)";
    ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i++) {
      const sway = Math.sin(j.wobble + i) * 4;
      ctx.beginPath();
      ctx.moveTo(cx + i * j.w * 0.22, cy + j.h * 0.28);
      ctx.quadraticCurveTo(
        cx + i * j.w * 0.22 + sway,
        cy + j.h * 0.5,
        cx + i * j.w * 0.22,
        cy + j.h * 0.62
      );
      ctx.stroke();
    }

    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // bolhas decorativas
    ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
    for (const b of bubbles) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // tiros (bolhas de veneno esverdeadas)
    for (const s of shots) {
      ctx.fillStyle = "#7cfc00";
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.stroke();
    }

    for (const j of jellies) drawJelly(j);
    drawPlayer();
  }

  // ---- Loop principal ----
  function loop() {
    if (state.running) {
      update();
      draw();
    }
    requestAnimationFrame(loop);
  }

  startBtn.addEventListener("click", start);
  loop();
})();
