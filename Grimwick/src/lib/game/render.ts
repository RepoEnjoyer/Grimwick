// Canvas rendering: dark fantasy pixel-art-ish style with glow effects
import { GameEngine, GAME_W, GAME_H } from './engine';
import type {
  BlackHole,
  BoneWall,
  Enemy,
  LightningArc,
  Meteor,
  Minion,
  Particle,
  Player,
  Projectile,
  Soul,
} from './types';

// Draw a glowing circle with shadow blur
function glowCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  glow: number = 12
) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = glow;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function pixel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string
) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.ceil(w), Math.ceil(h));
}

export function drawGame(engine: GameEngine) {
  const ctx = engine.ctx;
  const t = engine.gameTime;
  ctx.clearRect(0, 0, GAME_W, GAME_H);

  // ===== background: dungeon floor =====
  drawFloor(ctx, t);

  // ===== cursed grounds (under entities) =====
  for (const cg of engine.cursedGrounds) {
    drawCursedGround(ctx, cg, t);
  }

  // ===== NEW: black holes (under entities) =====
  for (const bh of engine.blackHoles) {
    drawBlackHole(ctx, bh, t);
  }

  // ===== NEW: bone walls (under entities) =====
  for (const bw of engine.boneWalls) {
    drawBoneWall(ctx, bw, t);
  }

  // ===== souls =====
  for (const s of engine.souls) {
    drawSoul(ctx, s, t);
  }

  // ===== pending spawns (warning circles) =====
  for (const ps of engine.pendingSpawns) {
    ctx.save();
    ctx.strokeStyle = ps.isBoss ? '#ff4040' : '#ff8040';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.6 + Math.sin(t * 12) * 0.3;
    ctx.beginPath();
    ctx.arc(ps.x, ps.y, 18 + (0.5 - ps.t) * 24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // ===== minions =====
  for (const m of engine.minions) {
    drawMinion(ctx, m, t);
  }

  // ===== enemies =====
  for (const e of engine.enemies) {
    drawEnemy(ctx, e, t);
    // NEW: slow effect overlay
    if (e.slowTimer > 0) {
      ctx.save();
      ctx.globalAlpha = 0.4;
      glowCircle(ctx, e.x, e.y, e.radius + 2, '#80c0ff', 8);
      ctx.restore();
    }
    // NEW: marked for death overlay
    if (e.markedTimer > 0) {
      ctx.save();
      ctx.strokeStyle = '#ff4060';
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.6 + Math.sin(t * 10) * 0.3;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius + 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  // ===== Aura of Decay (under player) =====
  if (engine.player.auraOfDecayLevel > 0) {
    drawAuraOfDecay(ctx, engine.player, t);
  }

  // ===== Bone Storm (under player visuals) =====
  if (engine.player.boneStormLevel > 0) {
    drawBoneStorm(ctx, engine.player, t);
  }

  // ===== player =====
  drawPlayer(ctx, engine.player, t, engine);

  // ===== projectiles =====
  for (const pr of engine.projectiles) {
    drawProjectile(ctx, pr, t);
  }
  for (const pr of engine.enemyProjectiles) {
    drawEnemyProjectile(ctx, pr, t);
  }

  // ===== NEW: meteors (above projectiles) =====
  for (const m of engine.meteors) {
    drawMeteor(ctx, m, t);
  }

  // ===== NEW: lightning arcs (above everything) =====
  for (const la of engine.lightningArcs) {
    drawLightningArc(ctx, la);
  }

  // ===== particles =====
  for (const p of engine.particles) {
    drawParticle(ctx, p);
  }

  // ===== bone shield orbs around player =====
  if (engine.boneShieldOrbs > 0) {
    drawBoneShield(ctx, engine.player, engine.boneShieldOrbs, t);
  }

  // ===== floating texts =====
  for (const ft of engine.floatingTexts) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, ft.life);
    ctx.fillStyle = ft.color;
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  }

  // ===== phase overlays =====
  if (engine.phase === 'playing' && engine.currentBoss) {
    drawVignette(ctx, '#400000', 0.4);
  }
  if (engine.player.lichFormTimer > 0) {
    drawVignette(ctx, '#400040', 0.3);
  }
  if (engine.player.deathRayTimer > 0) {
    drawVignette(ctx, '#400020', 0.5);
  }
}

// ---------- background ----------
function drawFloor(ctx: CanvasRenderingContext2D, t: number) {
  // base dark stone gradient
  const grad = ctx.createRadialGradient(
    GAME_W / 2,
    GAME_H / 2,
    100,
    GAME_W / 2,
    GAME_H / 2,
    GAME_W * 0.7
  );
  grad.addColorStop(0, '#1c1a26');
  grad.addColorStop(0.6, '#14121c');
  grad.addColorStop(1, '#0a0810');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, GAME_W, GAME_H);

  // stone tile pattern (subtle)
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.strokeStyle = '#7a6c8a';
  ctx.lineWidth = 1;
  const tile = 64;
  for (let x = 0; x < GAME_W; x += tile) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, GAME_H);
    ctx.stroke();
  }
  for (let y = 0; y < GAME_H; y += tile) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(GAME_W, y);
    ctx.stroke();
  }
  ctx.restore();

  // floor runes (faint)
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.strokeStyle = '#7a4acc';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(GAME_W / 2, GAME_H / 2, 220, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(GAME_W / 2, GAME_H / 2, 180, 0, Math.PI * 2);
  ctx.stroke();
  // pentagram-ish lines
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    const a2 = ((i + 2) / 5) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(
      GAME_W / 2 + Math.cos(a) * 200,
      GAME_H / 2 + Math.sin(a) * 200
    );
    ctx.lineTo(
      GAME_W / 2 + Math.cos(a2) * 200,
      GAME_H / 2 + Math.sin(a2) * 200
    );
    ctx.stroke();
  }
  ctx.restore();

  // arena border (dungeon walls)
  ctx.save();
  ctx.strokeStyle = '#3a3350';
  ctx.lineWidth = 4;
  ctx.shadowColor = '#000';
  ctx.shadowBlur = 12;
  ctx.strokeRect(8, 8, GAME_W - 16, GAME_H - 16);
  ctx.restore();

  // corner torches (glow)
  const torchPos = [
    [20, 20],
    [GAME_W - 20, 20],
    [20, GAME_H - 20],
    [GAME_W - 20, GAME_H - 20],
  ];
  for (const [tx, ty] of torchPos) {
    const flicker = 0.7 + Math.sin(t * 8 + tx) * 0.15 + Math.random() * 0.1;
    ctx.save();
    ctx.globalAlpha = flicker * 0.7;
    const g = ctx.createRadialGradient(tx, ty, 0, tx, ty, 90);
    g.addColorStop(0, '#ffa040');
    g.addColorStop(0.4, '#c04020');
    g.addColorStop(1, 'rgba(60,20,10,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(tx, ty, 90, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ---------- cursed ground ----------
function drawCursedGround(
  ctx: CanvasRenderingContext2D,
  cg: { x: number; y: number; radius: number; life: number },
  t: number
) {
  ctx.save();
  const pulse = 0.6 + Math.sin(t * 4) * 0.2;
  ctx.globalAlpha = Math.min(0.7, cg.life / 2) * pulse;
  const g = ctx.createRadialGradient(cg.x, cg.y, 0, cg.x, cg.y, cg.radius);
  g.addColorStop(0, 'rgba(120, 40, 200, 0.6)');
  g.addColorStop(0.7, 'rgba(60, 20, 120, 0.4)');
  g.addColorStop(1, 'rgba(20, 0, 40, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cg.x, cg.y, cg.radius, 0, Math.PI * 2);
  ctx.fill();
  // rune ring
  ctx.strokeStyle = '#b58cff';
  ctx.lineWidth = 2;
  ctx.globalAlpha = Math.min(0.8, cg.life / 2);
  ctx.beginPath();
  ctx.arc(cg.x, cg.y, cg.radius * 0.9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// ---------- souls ----------
function drawSoul(ctx: CanvasRenderingContext2D, s: Soul, t: number) {
  const pulse = 0.8 + Math.sin(t * 8 + s.x) * 0.2;
  if (s.kind === 'heal') {
    glowCircle(ctx, s.x, s.y, 6 * pulse, '#7affa0', 16);
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('+', s.x, s.y + 4);
    ctx.restore();
  } else if (s.kind === 'chest') {
    // Golden chest — shiny animated treasure
    const float = Math.sin(t * 4 + s.x) * 3;
    ctx.save();
    ctx.translate(s.x, s.y + float);
    // golden glow aura
    glowCircle(ctx, 0, 0, 16 * pulse, '#ffd040', 24);
    glowCircle(ctx, 0, 0, 10 * pulse, '#ffe080', 16);
    // chest body
    ctx.fillStyle = '#a06020';
    ctx.fillRect(-8, -2, 16, 10);
    // chest lid
    ctx.fillStyle = '#c08030';
    ctx.beginPath();
    ctx.arc(0, -2, 8, Math.PI, 0);
    ctx.fill();
    // gold trim
    ctx.fillStyle = '#ffd040';
    ctx.fillRect(-8, -3, 16, 2);
    ctx.fillRect(-8, 3, 16, 2);
    // lock
    ctx.fillStyle = '#ffe060';
    ctx.fillRect(-2, -1, 4, 5);
    // sparkle stars
    for (let i = 0; i < 3; i++) {
      const a = t * 3 + (i * Math.PI * 2) / 3;
      const r = 14 + Math.sin(t * 6 + i) * 3;
      const sx = Math.cos(a) * r;
      const sy = Math.sin(a) * r;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffd040';
      ctx.shadowBlur = 8;
      ctx.fillRect(sx - 1, sy - 1, 2, 2);
      ctx.fillRect(sx - 2, sy, 4, 1);
      ctx.fillRect(sx, sy - 2, 1, 4);
    }
    ctx.restore();
  } else {
    glowCircle(ctx, s.x, s.y, 4 * pulse, '#b58cff', 12);
    glowCircle(ctx, s.x, s.y, 2 * pulse, '#ffffff', 6);
  }
}

// ---------- minions ----------
function drawMinion(ctx: CanvasRenderingContext2D, m: Minion, t: number) {
  const bob = Math.sin(t * 6 + m.id) * 1.5;
  ctx.save();
  ctx.translate(m.x, m.y + bob);

  if (m.isFamiliar) {
    // floating skull familiar
    glowCircle(ctx, 0, 0, 8, '#9affd0', 14);
    // skull
    ctx.fillStyle = '#e8e0d0';
    ctx.fillRect(-5, -5, 10, 9);
    ctx.fillRect(-3, 4, 6, 2);
    ctx.fillStyle = '#000';
    ctx.fillRect(-3, -2, 2, 2);
    ctx.fillRect(1, -2, 2, 2);
    // eye glow
    glowCircle(ctx, -2, -1, 1.5, '#9affd0', 6);
    glowCircle(ctx, 2, -1, 1.5, '#9affd0', 6);
  } else if (m.kind === 'crawler') {
    // small crawling bones
    ctx.fillStyle = '#c8c0a8';
    ctx.fillRect(-4, -2, 8, 3);
    ctx.fillRect(-3, 0, 2, 2);
    ctx.fillRect(1, 0, 2, 2);
    glowCircle(ctx, -2, -1, 1.5, '#b58cff', 6);
    glowCircle(ctx, 2, -1, 1.5, '#b58cff', 6);
  } else if (m.kind === 'servant') {
    // bigger skeleton with sword
    drawSkeletonBody(ctx, 0, 0, 14, '#e8e0d0', '#b58cff', true);
    // sword
    ctx.save();
    ctx.rotate(-Math.PI / 5);
    ctx.fillStyle = '#c8c8d0';
    ctx.fillRect(8, -10, 3, 18);
    ctx.fillStyle = '#5a4a3a';
    ctx.fillRect(7, 7, 5, 3);
    ctx.restore();
  } else if (m.kind === 'army') {
    drawSkeletonBody(ctx, 0, 0, 11, '#d8d0c0', '#ff80ff', false);
    // aura
    glowCircle(ctx, 0, 0, 16, '#ff80ff', 8);
  } else if (m.kind === 'beast') {
    // Bone Beast: large quadruped made of bones
    glowCircle(ctx, 0, 0, 22, '#a04030', 14);
    // body
    ctx.fillStyle = '#d0c0a0';
    ctx.fillRect(-14, -8, 28, 14);
    // head
    ctx.fillRect(-18, -10, 10, 12);
    // legs
    ctx.fillRect(-12, 6, 4, 6);
    ctx.fillRect(-4, 6, 4, 6);
    ctx.fillRect(4, 6, 4, 6);
    ctx.fillRect(10, 6, 4, 6);
    // horns
    ctx.fillStyle = '#a89878';
    ctx.beginPath();
    ctx.moveTo(-18, -10);
    ctx.lineTo(-22, -16);
    ctx.lineTo(-15, -10);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-10, -10);
    ctx.lineTo(-6, -16);
    ctx.lineTo(-13, -10);
    ctx.fill();
    // glowing eyes
    glowCircle(ctx, -14, -5, 2, '#ff4040', 8);
    glowCircle(ctx, -10, -5, 2, '#ff4040', 8);
    // spine spikes
    ctx.fillStyle = '#a89878';
    ctx.fillRect(-8, -10, 2, 4);
    ctx.fillRect(-2, -10, 2, 4);
    ctx.fillRect(4, -10, 2, 4);
  } else if (m.kind === 'wraith') {
    // Wraith: floating ghostly figure with scythe
    const float = Math.sin(t * 5 + m.id) * 3;
    ctx.translate(0, float);
    glowCircle(ctx, 0, 0, 16, '#6080ff', 16);
    // body (tattered cloak)
    ctx.fillStyle = '#5060a0';
    ctx.beginPath();
    ctx.moveTo(-10, 12);
    ctx.lineTo(10, 12);
    ctx.lineTo(8, -10);
    ctx.lineTo(-8, -10);
    ctx.closePath();
    ctx.fill();
    // hood
    ctx.fillStyle = '#405080';
    ctx.beginPath();
    ctx.moveTo(-7, -6);
    ctx.lineTo(7, -6);
    ctx.lineTo(5, -14);
    ctx.lineTo(-5, -14);
    ctx.closePath();
    ctx.fill();
    // glowing eyes
    glowCircle(ctx, -3, -9, 1.8, '#a0c0ff', 8);
    glowCircle(ctx, 3, -9, 1.8, '#a0c0ff', 8);
    // tattered bottom
    ctx.fillStyle = '#405080';
    ctx.fillRect(-9, 10, 3, 4);
    ctx.fillRect(-3, 11, 3, 5);
    ctx.fillRect(3, 10, 3, 4);
    ctx.fillRect(7, 11, 3, 4);
  } else if (m.kind === 'golem') {
    // Bone Golem — huge hulking bone construct
    glowCircle(ctx, 0, 0, 26, '#a08060', 14);
    // body (big torso)
    ctx.fillStyle = '#d0c0a0';
    ctx.fillRect(-18, -10, 36, 22);
    // head (small skull on top)
    ctx.fillRect(-8, -22, 16, 12);
    // arms (huge)
    ctx.fillRect(-24, -6, 8, 18);
    ctx.fillRect(16, -6, 8, 18);
    // legs
    ctx.fillRect(-14, 12, 8, 12);
    ctx.fillRect(6, 12, 8, 12);
    // bone plates
    ctx.fillStyle = '#a89878';
    ctx.fillRect(-18, -10, 36, 3);
    ctx.fillRect(-18, 0, 36, 3);
    ctx.fillRect(-18, 8, 36, 3);
    // glowing eyes
    glowCircle(ctx, -3, -16, 2.5, '#ff4040', 10);
    glowCircle(ctx, 3, -16, 2.5, '#ff4040', 10);
    // shoulder spikes
    ctx.fillStyle = '#8a7858';
    ctx.beginPath();
    ctx.moveTo(-24, -6);
    ctx.lineTo(-30, -14);
    ctx.lineTo(-18, -6);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(24, -6);
    ctx.lineTo(30, -14);
    ctx.lineTo(18, -6);
    ctx.fill();
  } else if (m.kind === 'bat') {
    // Plague Bat — small flying creature
    const flap = Math.sin(t * 20 + m.id) * 4;
    glowCircle(ctx, 0, 0, 8, '#604080', 10);
    // body
    ctx.fillStyle = '#3a2050';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    // wings (flapping)
    ctx.fillStyle = '#604080';
    ctx.beginPath();
    ctx.moveTo(-3, 0);
    ctx.lineTo(-14, -3 + flap);
    ctx.lineTo(-10, 3);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(3, 0);
    ctx.lineTo(14, -3 + flap);
    ctx.lineTo(10, 3);
    ctx.closePath();
    ctx.fill();
    // eyes
    glowCircle(ctx, -1.5, -1, 1, '#ff4060', 5);
    glowCircle(ctx, 1.5, -1, 1, '#ff4060', 5);
  } else {
    // regular skeleton minion
    drawSkeletonBody(ctx, 0, 0, 10, '#e0d8c8', '#b58cff', false);
  }
  ctx.restore();
}

function drawSkeletonBody(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  boneColor: string,
  eyeColor: string,
  hasArmor: boolean
) {
  // body
  ctx.fillStyle = boneColor;
  // skull
  ctx.fillRect(x - size * 0.4, y - size * 0.6, size * 0.8, size * 0.6);
  // ribcage
  ctx.fillRect(x - size * 0.3, y, size * 0.6, size * 0.4);
  // legs
  ctx.fillRect(x - size * 0.3, y + size * 0.4, size * 0.2, size * 0.4);
  ctx.fillRect(x + size * 0.1, y + size * 0.4, size * 0.2, size * 0.4);
  // arms
  ctx.fillRect(x - size * 0.5, y, size * 0.2, size * 0.3);
  ctx.fillRect(x + size * 0.3, y, size * 0.2, size * 0.3);
  // eye sockets (glow)
  ctx.fillStyle = '#000';
  ctx.fillRect(x - size * 0.25, y - size * 0.35, size * 0.18, size * 0.18);
  ctx.fillRect(x + size * 0.07, y - size * 0.35, size * 0.18, size * 0.18);
  ctx.save();
  ctx.shadowColor = eyeColor;
  ctx.shadowBlur = 6;
  ctx.fillStyle = eyeColor;
  ctx.fillRect(x - size * 0.2, y - size * 0.3, size * 0.08, size * 0.08);
  ctx.fillRect(x + size * 0.12, y - size * 0.3, size * 0.08, size * 0.08);
  ctx.restore();
  // teeth
  ctx.fillStyle = '#000';
  ctx.fillRect(x - size * 0.15, y - size * 0.15, size * 0.3, size * 0.06);

  if (hasArmor) {
    ctx.fillStyle = '#6a5a4a';
    ctx.fillRect(x - size * 0.35, y - size * 0.05, size * 0.7, size * 0.12);
    ctx.fillStyle = '#8a7a5a';
    ctx.fillRect(x - size * 0.05, y - size * 0.05, size * 0.1, size * 0.12);
  }
}

// ---------- enemies ----------
function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy, t: number) {
  ctx.save();
  ctx.translate(e.x, e.y);

  // hit flash
  const flash = e.hitFlash > 0;

  // shadow under
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(0, e.radius * 0.7, e.radius * 0.8, e.radius * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  switch (e.kind) {
    case 'knight': {
      // holy knight: armored, with cross
      ctx.fillStyle = flash ? '#fff' : e.color;
      ctx.fillRect(-8, -10, 16, 14); // body
      ctx.fillRect(-6, 4, 12, 8); // legs
      ctx.fillStyle = flash ? '#fff' : '#a89878';
      ctx.fillRect(-7, -14, 14, 6); // helmet
      ctx.fillStyle = '#fff0a0';
      ctx.fillRect(-1, -10, 2, 10); // cross
      ctx.fillRect(-3, -7, 6, 2);
      break;
    }
    case 'priest': {
      // priest: robe with hood
      ctx.fillStyle = flash ? '#fff' : e.color;
      ctx.beginPath();
      ctx.moveTo(-8, 12);
      ctx.lineTo(8, 12);
      ctx.lineTo(6, -8);
      ctx.lineTo(-6, -8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = flash ? '#fff' : '#a89858';
      ctx.fillRect(-5, -12, 10, 6); // hood
      ctx.fillStyle = '#000';
      ctx.fillRect(-3, -10, 6, 3); // shadow face
      // glow staff
      glowCircle(ctx, 8, -4, 3, '#fff0a0', 8);
      break;
    }
    case 'robber': {
      // grave robber: dark cloak
      ctx.fillStyle = flash ? '#fff' : e.color;
      ctx.fillRect(-7, -8, 14, 14);
      ctx.fillRect(-5, 6, 4, 6);
      ctx.fillRect(1, 6, 4, 6);
      ctx.fillStyle = '#000';
      ctx.fillRect(-5, -10, 10, 6); // hood
      ctx.fillRect(-3, -7, 6, 2); // eye band
      // knife
      ctx.fillStyle = '#c8c0a0';
      ctx.fillRect(7, 0, 2, 6);
      break;
    }
    case 'slime': {
      // cursed mud slime - blob
      const sq = 1 + Math.sin(t * 6) * 0.1;
      ctx.fillStyle = flash ? '#fff' : e.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, e.radius * sq, e.radius * (2 - sq), 0, 0, Math.PI * 2);
      ctx.fill();
      // eyes
      ctx.fillStyle = '#000';
      ctx.fillRect(-5, -2, 3, 3);
      ctx.fillRect(2, -2, 3, 3);
      glowCircle(ctx, -4, -1, 1.5, '#a0ff60', 6);
      glowCircle(ctx, 4, -1, 1.5, '#a0ff60', 6);
      break;
    }
    case 'ghost': {
      const alpha = e.phaseActive ? 0.85 : 0.25;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = flash ? '#fff' : e.color;
      ctx.beginPath();
      ctx.arc(0, -2, 10, Math.PI, 0);
      ctx.lineTo(10, 8);
      ctx.lineTo(5, 5);
      ctx.lineTo(0, 8);
      ctx.lineTo(-5, 5);
      ctx.lineTo(-10, 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.fillRect(-5, -4, 3, 3);
      ctx.fillRect(2, -4, 3, 3);
      if (e.phaseActive) {
        glowCircle(ctx, -3, -3, 1.5, '#a0c8ff', 6);
        glowCircle(ctx, 3, -3, 1.5, '#a0c8ff', 6);
      }
      break;
    }
    case 'gargoyle': {
      ctx.fillStyle = flash ? '#fff' : e.color;
      // wings
      ctx.beginPath();
      ctx.moveTo(-14, -2);
      ctx.lineTo(-20, -10);
      ctx.lineTo(-8, -6);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(14, -2);
      ctx.lineTo(20, -10);
      ctx.lineTo(8, -6);
      ctx.closePath();
      ctx.fill();
      // body
      ctx.fillRect(-8, -8, 16, 14);
      ctx.fillStyle = '#404050';
      ctx.fillRect(-6, -12, 12, 6); // head
      // horns
      ctx.fillStyle = flash ? '#fff' : e.color;
      ctx.beginPath();
      ctx.moveTo(-6, -12);
      ctx.lineTo(-9, -18);
      ctx.lineTo(-3, -12);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(6, -12);
      ctx.lineTo(9, -18);
      ctx.lineTo(3, -12);
      ctx.fill();
      // glowing eyes
      glowCircle(ctx, -3, -10, 1.5, '#ff4040', 6);
      glowCircle(ctx, 3, -10, 1.5, '#ff4040', 6);
      break;
    }
    case 'mage': {
      // rival skeleton mage
      ctx.fillStyle = flash ? '#fff' : '#5a4070';
      ctx.fillRect(-7, -2, 14, 12); // robe
      ctx.fillStyle = flash ? '#fff' : e.color;
      ctx.fillRect(-5, -10, 10, 8); // skull head
      ctx.fillStyle = '#000';
      ctx.fillRect(-3, -7, 2, 2);
      ctx.fillRect(1, -7, 2, 2);
      glowCircle(ctx, -2, -6, 1.5, '#c898ff', 6);
      glowCircle(ctx, 2, -6, 1.5, '#c898ff', 6);
      // wand
      ctx.fillStyle = '#5a4030';
      ctx.fillRect(6, -8, 2, 12);
      glowCircle(ctx, 7, -8, 3, '#c898ff', 10);
      break;
    }
    case 'paladin': {
      // bigger, with shield
      ctx.fillStyle = flash ? '#fff' : e.color;
      ctx.fillRect(-10, -10, 20, 16); // body
      ctx.fillRect(-8, 6, 6, 8); // legs
      ctx.fillRect(2, 6, 6, 8);
      ctx.fillStyle = flash ? '#fff' : '#988858';
      ctx.fillRect(-9, -14, 18, 6); // helmet
      ctx.fillStyle = '#fff0a0';
      ctx.fillRect(-1, -10, 2, 12);
      ctx.fillRect(-4, -6, 8, 2);
      // shield (front)
      if (e.shielded) {
        ctx.fillStyle = '#c8b078';
        ctx.fillRect(8, -8, 6, 14);
        ctx.fillStyle = '#fff0a0';
        ctx.fillRect(10, -4, 2, 6);
        glowCircle(ctx, 11, -1, 2, '#fff0a0', 8);
      }
      break;
    }
    case 'cultist': {
      // hooded cultist with dagger
      ctx.fillStyle = flash ? '#fff' : e.color;
      // robe
      ctx.beginPath();
      ctx.moveTo(-8, 12);
      ctx.lineTo(8, 12);
      ctx.lineTo(6, -4);
      ctx.lineTo(-6, -4);
      ctx.closePath();
      ctx.fill();
      // hood
      ctx.fillStyle = flash ? '#fff' : '#602030';
      ctx.fillRect(-7, -12, 14, 8);
      ctx.fillStyle = '#000';
      ctx.fillRect(-4, -8, 8, 4); // shadow face
      // glowing eyes
      glowCircle(ctx, -2, -6, 1.2, '#ff4060', 6);
      glowCircle(ctx, 2, -6, 1.2, '#ff4060', 6);
      // dagger
      ctx.fillStyle = '#c8c0a0';
      ctx.fillRect(7, 0, 2, 8);
      ctx.fillStyle = '#5a4030';
      ctx.fillRect(6, 6, 4, 2);
      break;
    }
    case 'banshee': {
      // floating ghostly woman with sonic aura
      const float = Math.sin(t * 4 + e.id) * 2;
      ctx.translate(0, float);
      glowCircle(ctx, 0, 0, 12, '#80a0d0', 14);
      // body (tattered dress)
      ctx.fillStyle = flash ? '#fff' : e.color;
      ctx.beginPath();
      ctx.moveTo(-9, 12);
      ctx.lineTo(9, 12);
      ctx.lineTo(7, -8);
      ctx.lineTo(-7, -8);
      ctx.closePath();
      ctx.fill();
      // head
      ctx.fillRect(-5, -14, 10, 8);
      // long hair
      ctx.fillStyle = flash ? '#fff' : '#5070a0';
      ctx.fillRect(-7, -12, 2, 10);
      ctx.fillRect(5, -12, 2, 10);
      // glowing eyes (screaming)
      glowCircle(ctx, -2, -10, 1.5, '#a0c8ff', 8);
      glowCircle(ctx, 2, -10, 1.5, '#a0c8ff', 8);
      // open mouth
      ctx.fillStyle = '#000';
      ctx.fillRect(-2, -7, 4, 3);
      // sonic ring
      ctx.strokeStyle = 'rgba(160,200,255,0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, 16 + Math.sin(t * 6) * 4, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'bonebeast': {
      // Heavy bone monster — quadruped
      ctx.fillStyle = flash ? '#fff' : e.color;
      // body
      ctx.fillRect(-16, -10, 32, 16);
      // head
      ctx.fillRect(-22, -12, 12, 14);
      // legs
      ctx.fillRect(-14, 6, 5, 8);
      ctx.fillRect(-5, 6, 5, 8);
      ctx.fillRect(5, 6, 5, 8);
      ctx.fillRect(13, 6, 5, 8);
      // horns
      ctx.fillStyle = flash ? '#fff' : '#8a7858';
      ctx.beginPath();
      ctx.moveTo(-22, -12);
      ctx.lineTo(-26, -20);
      ctx.lineTo(-19, -12);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-12, -12);
      ctx.lineTo(-8, -20);
      ctx.lineTo(-15, -12);
      ctx.fill();
      // glowing eyes
      glowCircle(ctx, -18, -6, 2.5, '#ff4040', 10);
      glowCircle(ctx, -13, -6, 2.5, '#ff4040', 10);
      // spine spikes
      ctx.fillStyle = flash ? '#fff' : '#8a7858';
      ctx.fillRect(-10, -13, 3, 5);
      ctx.fillRect(-2, -13, 3, 5);
      ctx.fillRect(6, -13, 3, 5);
      // bone plating
      ctx.strokeStyle = '#8a7858';
      ctx.lineWidth = 1;
      ctx.strokeRect(-16, -10, 32, 16);
      break;
    }
  }

  // boss extras
  if (e.isBoss) {
    drawBossExtras(ctx, e, t);
  }

  ctx.restore();

  // hp bar (non-boss)
  if (!e.isBoss && e.hp < e.maxHp) {
    const w = e.radius * 2;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(e.x - w / 2, e.y - e.radius - 8, w, 3);
    ctx.fillStyle = '#ff6060';
    ctx.fillRect(e.x - w / 2, e.y - e.radius - 8, w * (e.hp / e.maxHp), 3);
  }
}

function drawBossExtras(
  ctx: CanvasRenderingContext2D,
  e: Enemy,
  t: number
) {
  // aura
  ctx.save();
  ctx.globalAlpha = 0.4;
  glowCircle(ctx, 0, 0, e.radius + 12, '#ff4040', 30);
  ctx.restore();
  // crown / halo per kind
  if (e.bossKind === 'bell_knight') {
    // bell hammer
    ctx.fillStyle = '#7a6c4a';
    ctx.fillRect(-30, -4, 24, 8);
    ctx.fillStyle = '#b8a878';
    ctx.fillRect(-40, -10, 14, 20);
  } else if (e.bossKind === 'sun_priest') {
    // sun halo
    ctx.save();
    ctx.translate(0, -e.radius - 8);
    ctx.rotate(t * 0.5);
    for (let i = 0; i < 8; i++) {
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#ffd860';
      ctx.fillRect(-2, -14, 4, 8);
    }
    ctx.restore();
    glowCircle(ctx, 0, -e.radius - 8, 8, '#ffd860', 16);
  } else if (e.bossKind === 'bone_dragon') {
    // wings
    ctx.fillStyle = '#e8e0d0';
    ctx.beginPath();
    ctx.moveTo(-e.radius, 0);
    ctx.lineTo(-e.radius - 30, -20);
    ctx.lineTo(-e.radius - 10, 10);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(e.radius, 0);
    ctx.lineTo(e.radius + 30, -20);
    ctx.lineTo(e.radius + 10, 10);
    ctx.closePath();
    ctx.fill();
    // glowing eyes
    glowCircle(ctx, -6, -e.radius + 8, 3, '#ff4040', 12);
    glowCircle(ctx, 6, -e.radius + 8, 3, '#ff4040', 12);
  } else if (e.bossKind === 'twins') {
    // lantern
    glowCircle(ctx, 12, 6, 5, '#a8ff80', 14);
  }
}

// ---------- player ----------
function drawPlayer(
  ctx: CanvasRenderingContext2D,
  p: Player,
  t: number,
  engine: GameEngine
) {
  const bob = Math.sin(t * 8) * 1.5;
  ctx.save();
  ctx.translate(p.x, p.y + bob);

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(0, 18, 14, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // lich form aura
  if (p.lichFormTimer > 0) {
    glowCircle(ctx, 0, 0, 26, '#ff60c0', 30);
  }

  // iframes flicker
  if (p.iframes > 0 && Math.floor(t * 20) % 2 === 0) {
    ctx.globalAlpha = 0.5;
  }

  // body (skeleton mage, slightly bigger than minions)
  const isLich = p.lichFormTimer > 0;
  const boneColor = isLich ? '#d0c8e8' : '#e8e0d0';
  const eyeColor = isLich ? '#ff60c0' : '#b58cff';

  drawSkeletonBody(ctx, 0, 0, 16, boneColor, eyeColor, false);

  // robe (purple)
  ctx.fillStyle = isLich ? '#5a2070' : '#3a1858';
  ctx.fillRect(-9, -2, 18, 12);
  ctx.fillStyle = isLich ? '#7a3090' : '#5a2880';
  ctx.fillRect(-9, -2, 18, 2); // trim

  // hood
  ctx.fillStyle = isLich ? '#5a2070' : '#3a1858';
  ctx.beginPath();
  ctx.moveTo(-9, -8);
  ctx.lineTo(9, -8);
  ctx.lineTo(7, -16);
  ctx.lineTo(-7, -16);
  ctx.closePath();
  ctx.fill();

  // skull over hood
  ctx.fillStyle = boneColor;
  ctx.fillRect(-6, -14, 12, 9);
  ctx.fillStyle = '#000';
  ctx.fillRect(-4, -11, 3, 3);
  ctx.fillRect(1, -11, 3, 3);
  // glowing eyes
  glowCircle(ctx, -2, -10, 2, eyeColor, 8);
  glowCircle(ctx, 2, -10, 2, eyeColor, 8);
  ctx.fillStyle = '#000';
  ctx.fillRect(-3, -6, 6, 1);

  // crooked wand (held to side)
  ctx.save();
  ctx.translate(10, 0);
  ctx.rotate(p.facing + Math.PI / 2 + Math.sin(t * 4) * 0.05);
  // wand shaft
  ctx.strokeStyle = '#5a4030';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(2, -6);
  ctx.lineTo(-1, -14);
  ctx.lineTo(3, -22);
  ctx.stroke();
  // glowing tip
  const tipColor = engine.wandColor();
  glowCircle(ctx, 3, -22, 5, tipColor, 18);
  glowCircle(ctx, 3, -22, 2.5, '#ffffff', 8);
  ctx.restore();

  ctx.restore();
}

// ---------- projectiles ----------
function drawProjectile(
  ctx: CanvasRenderingContext2D,
  pr: Projectile,
  t: number
) {
  const ang = Math.atan2(pr.vy, pr.vx);
  ctx.save();
  ctx.translate(pr.x, pr.y);
  ctx.rotate(ang);

  if (pr.kind === 'skull') {
    glowCircle(ctx, 0, 0, pr.radius + 4, pr.color, 20);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-6, -6, 12, 10);
    ctx.fillStyle = '#000';
    ctx.fillRect(-4, -3, 3, 3);
    ctx.fillRect(1, -3, 3, 3);
    ctx.fillRect(-3, 1, 6, 2);
  } else if (pr.kind === 'beam') {
    // long beam segment
    ctx.fillStyle = pr.color;
    ctx.shadowColor = pr.color;
    ctx.shadowBlur = 14;
    ctx.fillRect(-20, -pr.radius / 2, 30, pr.radius);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-20, -pr.radius / 4, 30, pr.radius / 2);
  } else if (pr.kind === 'deathray') {
    // huge beam
    ctx.fillStyle = pr.color;
    ctx.shadowColor = pr.color;
    ctx.shadowBlur = 30;
    ctx.fillRect(-40, -pr.radius / 2, 60, pr.radius);
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 14;
    ctx.fillRect(-40, -pr.radius / 4, 60, pr.radius / 2);
  } else if (pr.kind === 'familiar') {
    glowCircle(ctx, 0, 0, pr.radius, pr.color, 12);
    glowCircle(ctx, 0, 0, pr.radius * 0.5, '#ffffff', 6);
  } else if (pr.kind === 'homing') {
    // homing soul — teardrop with trail
    glowCircle(ctx, 0, 0, pr.radius + 2, pr.color, 16);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(pr.radius * 1.5, 0);
    ctx.lineTo(-pr.radius, -pr.radius * 0.7);
    ctx.lineTo(-pr.radius, pr.radius * 0.7);
    ctx.closePath();
    ctx.fill();
    // trail
    ctx.fillStyle = pr.color;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(-pr.radius * 2, -1, pr.radius * 1.5, 2);
  } else if (pr.kind === 'splitter') {
    // small bolt with sparkle
    glowCircle(ctx, 0, 0, pr.radius, pr.color, 10);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-pr.radius, -1, pr.radius * 2, 2);
  } else {
    // bolt
    glowCircle(ctx, 0, 0, pr.radius, pr.color, 12);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-pr.radius * 1.4, -1, pr.radius * 2.8, 2);
  }
  ctx.restore();
}

function drawEnemyProjectile(
  ctx: CanvasRenderingContext2D,
  pr: Projectile,
  t: number
) {
  if (pr.kind === 'sunbeam') {
    glowCircle(ctx, pr.x, pr.y, pr.radius, pr.color, 18);
    ctx.save();
    ctx.translate(pr.x, pr.y);
    ctx.rotate(Math.atan2(pr.vy, pr.vx));
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-12, -2, 24, 4);
    ctx.restore();
  } else if (pr.kind === 'holy') {
    glowCircle(ctx, pr.x, pr.y, pr.radius, pr.color, 14);
    // cross sparkle
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(pr.x - 1, pr.y - 4, 2, 8);
    ctx.fillRect(pr.x - 4, pr.y - 1, 8, 2);
  } else if (pr.kind === 'knife') {
    ctx.save();
    ctx.translate(pr.x, pr.y);
    ctx.rotate(Math.atan2(pr.vy, pr.vx));
    ctx.fillStyle = pr.color;
    ctx.fillRect(-6, -1, 10, 2);
    ctx.fillStyle = '#5a4030';
    ctx.fillRect(-8, -1, 2, 2);
    ctx.restore();
  } else {
    glowCircle(ctx, pr.x, pr.y, pr.radius, pr.color, 12);
  }
}

// ---------- particles ----------
function drawParticle(ctx: CanvasRenderingContext2D, p: Particle) {
  const a = Math.max(0, p.life / p.maxLife);
  ctx.save();
  ctx.globalAlpha = a;
  if (p.kind === 'spark' || p.kind === 'magic' || p.kind === 'soul') {
    glowCircle(ctx, p.x, p.y, p.radius, p.color, 8);
  } else if (p.kind === 'bone') {
    ctx.fillStyle = p.color;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.x * 0.1);
    ctx.fillRect(-p.radius, -1, p.radius * 2, 2);
  } else if (p.kind === 'smoke') {
    ctx.globalAlpha = a * 0.5;
    glowCircle(ctx, p.x, p.y, p.radius * 2, p.color, 4);
  } else if (p.kind === 'frost') {
    // frost: small crystal sparkle
    glowCircle(ctx, p.x, p.y, p.radius, p.color, 6);
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p.x - p.radius, p.y);
    ctx.lineTo(p.x + p.radius, p.y);
    ctx.moveTo(p.x, p.y - p.radius);
    ctx.lineTo(p.x, p.y + p.radius);
    ctx.stroke();
  } else if (p.kind === 'meteor_trail') {
    // fiery trail
    glowCircle(ctx, p.x, p.y, p.radius, p.color, 10);
    glowCircle(ctx, p.x, p.y, p.radius * 0.5, '#ffd040', 6);
  }
  ctx.restore();
}

// ---------- bone shield orbs ----------
function drawBoneShield(
  ctx: CanvasRenderingContext2D,
  p: Player,
  count: number,
  t: number
) {
  for (let i = 0; i < count; i++) {
    const ang = (i / count) * Math.PI * 2 + t * 2;
    const x = p.x + Math.cos(ang) * 28;
    const y = p.y + Math.sin(ang) * 28;
    glowCircle(ctx, x, y, 4, '#a0d8ff', 12);
    ctx.fillStyle = '#e8e0d0';
    ctx.fillRect(x - 3, y - 1, 6, 2);
    ctx.fillRect(x - 1, y - 3, 2, 6);
  }
}

// ---------- vignette ----------
function drawVignette(
  ctx: CanvasRenderingContext2D,
  color: string,
  strength: number
) {
  ctx.save();
  const g = ctx.createRadialGradient(
    GAME_W / 2,
    GAME_H / 2,
    GAME_W * 0.3,
    GAME_W / 2,
    GAME_H / 2,
    GAME_W * 0.7
  );
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, color);
  ctx.globalAlpha = strength;
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, GAME_W, GAME_H);
  ctx.restore();
}

// ---------- Aura of Decay (new) ----------
function drawAuraOfDecay(
  ctx: CanvasRenderingContext2D,
  p: Player,
  t: number
) {
  const level = p.auraOfDecayLevel;
  const radius = 80 + level * 30;
  const pulse = 0.7 + Math.sin(t * 4) * 0.15;
  ctx.save();
  ctx.globalAlpha = 0.18 * pulse;
  const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
  g.addColorStop(0, 'rgba(120, 60, 30, 0.7)');
  g.addColorStop(0.5, 'rgba(80, 30, 20, 0.4)');
  g.addColorStop(1, 'rgba(40, 10, 10, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
  ctx.fill();
  // rune ring
  ctx.globalAlpha = 0.4 * pulse;
  ctx.strokeStyle = '#a04030';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(p.x, p.y, radius * 0.95, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// ---------- Bone Storm (new) ----------
function drawBoneStorm(
  ctx: CanvasRenderingContext2D,
  p: Player,
  t: number
) {
  const level = p.boneStormLevel;
  const boneCount = 2 + level * 2;
  const orbitRadius = 60 + level * 10;
  for (let i = 0; i < boneCount; i++) {
    const ang = t * 3 + (i / boneCount) * Math.PI * 2;
    const x = p.x + Math.cos(ang) * orbitRadius;
    const y = p.y + Math.sin(ang) * orbitRadius;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang + Math.PI / 2);
    // bone shard
    glowCircle(ctx, 0, 0, 4, '#e8e0d0', 8);
    ctx.fillStyle = '#e8e0d0';
    ctx.fillRect(-5, -1, 10, 2);
    ctx.fillStyle = '#a89878';
    ctx.fillRect(-4, -2, 2, 4);
    ctx.fillRect(2, -2, 2, 4);
    ctx.restore();
  }
}

// ---------- NEW: Black Hole ----------
function drawBlackHole(
  ctx: CanvasRenderingContext2D,
  bh: BlackHole,
  t: number
) {
  ctx.save();
  // pull radius ring (faint)
  ctx.globalAlpha = 0.15;
  ctx.strokeStyle = '#a040ff';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.lineDashOffset = -t * 30;
  ctx.beginPath();
  ctx.arc(bh.x, bh.y, bh.pullRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // outer swirl
  ctx.globalAlpha = 0.6;
  const swirl = ctx.createRadialGradient(
    bh.x,
    bh.y,
    0,
    bh.x,
    bh.y,
    bh.pullRadius
  );
  swirl.addColorStop(0, 'rgba(40, 0, 80, 0.8)');
  swirl.addColorStop(0.5, 'rgba(80, 20, 120, 0.4)');
  swirl.addColorStop(1, 'rgba(20, 0, 40, 0)');
  ctx.fillStyle = swirl;
  ctx.beginPath();
  ctx.arc(bh.x, bh.y, bh.pullRadius, 0, Math.PI * 2);
  ctx.fill();

  // event horizon (dark core)
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(bh.x, bh.y, bh.radius, 0, Math.PI * 2);
  ctx.fill();

  // accretion disk (purple ring)
  ctx.strokeStyle = '#c060ff';
  ctx.lineWidth = 3;
  ctx.shadowColor = '#c060ff';
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.arc(bh.x, bh.y, bh.radius + 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

// ---------- NEW: Bone Wall ----------
function drawBoneWall(
  ctx: CanvasRenderingContext2D,
  bw: BoneWall,
  t: number
) {
  ctx.save();
  ctx.translate(bw.x, bw.y);
  ctx.rotate(bw.angle);
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(0, bw.radius * 0.7, bw.radius * 0.9, bw.radius * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  // base mound
  ctx.fillStyle = '#5a5040';
  ctx.beginPath();
  ctx.arc(0, 0, bw.radius, 0, Math.PI * 2);
  ctx.fill();
  // bone spikes radiating
  ctx.fillStyle = '#e8e0d0';
  ctx.shadowColor = '#a89878';
  ctx.shadowBlur = 4;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + t * 0.3;
    const r1 = bw.radius * 0.6;
    const r2 = bw.radius * 1.2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
    ctx.lineTo(Math.cos(a + 0.1) * r2, Math.sin(a + 0.1) * r2);
    ctx.lineTo(Math.cos(a - 0.1) * r2, Math.sin(a - 0.1) * r2);
    ctx.closePath();
    ctx.fill();
  }
  // HP bar
  if (bw.hp < bw.maxHp) {
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(-bw.radius, -bw.radius - 8, bw.radius * 2, 3);
    ctx.fillStyle = '#e0e0d0';
    ctx.fillRect(-bw.radius, -bw.radius - 8, bw.radius * 2 * (bw.hp / bw.maxHp), 3);
  }
  ctx.restore();
}

// ---------- NEW: Meteor ----------
function drawMeteor(
  ctx: CanvasRenderingContext2D,
  m: Meteor,
  t: number
) {
  if (m.exploded) return;
  ctx.save();
  ctx.translate(m.x, m.y);
  // trailing flame
  ctx.fillStyle = 'rgba(255, 120, 30, 0.4)';
  ctx.beginPath();
  ctx.ellipse(0, -20, m.radius * 0.6, m.radius * 1.8, 0, 0, Math.PI * 2);
  ctx.fill();
  // meteor core
  glowCircle(ctx, 0, 0, m.radius, '#ff6020', 20);
  glowCircle(ctx, 0, 0, m.radius * 0.7, '#ffa040', 14);
  ctx.fillStyle = '#ffd060';
  ctx.beginPath();
  ctx.arc(0, 0, m.radius * 0.4, 0, Math.PI * 2);
  ctx.fill();
  // rocky details
  ctx.fillStyle = '#804020';
  ctx.fillRect(-m.radius * 0.3, -m.radius * 0.2, m.radius * 0.4, m.radius * 0.3);
  ctx.fillRect(m.radius * 0.1, m.radius * 0.1, m.radius * 0.3, m.radius * 0.2);
  ctx.restore();
}

// ---------- NEW: Lightning Arc ----------
function drawLightningArc(
  ctx: CanvasRenderingContext2D,
  la: LightningArc
) {
  const alpha = la.life / la.maxLife;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = la.color;
  ctx.lineWidth = 2.5;
  ctx.shadowColor = la.color;
  ctx.shadowBlur = 12;
  // jagged line
  const segments = 6;
  ctx.beginPath();
  ctx.moveTo(la.x1, la.y1);
  for (let i = 1; i < segments; i++) {
    const tt = i / segments;
    const x = la.x1 + (la.x2 - la.x1) * tt + (Math.random() - 0.5) * 14;
    const y = la.y1 + (la.y2 - la.y1) * tt + (Math.random() - 0.5) * 14;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(la.x2, la.y2);
  ctx.stroke();
  // bright core
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.moveTo(la.x1, la.y1);
  ctx.lineTo(la.x2, la.y2);
  ctx.stroke();
  ctx.restore();
}
