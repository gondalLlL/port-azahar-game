import { FIELD, WORLD_SIZE, BLOCK_SIZE, ROAD_WIDTH } from './config.js';
import { MISSIONS } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function draw(state, screen, bestScore) {
    ctx.fillStyle = '#0c0e12';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (screen === SCREEN_TITLE) {
      drawTitleScreen(bestScore);
      return;
    }

    ctx.save();
    // Camera transform centered on player
    const cam = state.camera;
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.translate(-cam.x, -cam.y);

    // Draw world ground / asphalt
    ctx.fillStyle = '#1e222b';
    ctx.fillRect(0, 0, WORLD_SIZE, WORLD_SIZE);

    // Draw grid roads
    ctx.strokeStyle = '#2d3340';
    ctx.lineWidth = ROAD_WIDTH;
    ctx.lineCap = 'butt';
    for (let i = 0; i <= WORLD_SIZE; i += BLOCK_SIZE) {
      ctx.beginPath();
      ctx.moveTo(i, 0); ctx.lineTo(i, WORLD_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i); ctx.lineTo(WORLD_SIZE, i);
      ctx.stroke();
    }

    // Draw dashed center lines
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 3;
    ctx.setLineDash([15, 15]);
    for (let i = BLOCK_SIZE / 2; i <= WORLD_SIZE; i += BLOCK_SIZE) {
      ctx.beginPath();
      ctx.moveTo(i, 0); ctx.lineTo(i, WORLD_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i); ctx.lineTo(WORLD_SIZE, i);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Draw buildings
    for (let b of state.buildings) {
      // Drop shadow
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(b.x + 10, b.y + 10, b.w, b.h);

      // Building wall
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);

      // Accent trim
      ctx.strokeStyle = b.accent;
      ctx.lineWidth = 4;
      ctx.strokeRect(b.x, b.y, b.w, b.h);

      // Windows (lit at night)
      if (state.dayTime < 0.3 || state.dayTime > 0.7) {
        ctx.fillStyle = '#ffee58';
        for (let wx = b.x + 15; wx < b.x + b.w - 15; wx += 25) {
          for (let wy = b.y + 15; wy < b.y + b.h - 15; wy += 25) {
            ctx.fillRect(wx, wy, 10, 14);
          }
        }
      }

      // Neon sign on Neon Mile
      if (b.hasNeon) {
        ctx.fillStyle = '#e91e63';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText('HOT', b.x + 10, b.y + 25);
      }
    }

    // Draw cars
    for (let i = 0; i < state.cars.length; i++) {
      const c = state.cars[i];
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.angle);

      // Car body
      ctx.fillStyle = c.color;
      ctx.fillRect(-28, -14, 56, 28);

      // Windshield & Roof
      ctx.fillStyle = '#263238';
      ctx.fillRect(-10, -10, 24, 20);

      // Wheels
      ctx.fillStyle = '#111';
      ctx.fillRect(-20, -18, 12, 6);
      ctx.fillRect(8, -18, 12, 6);
      ctx.fillRect(-20, 12, 12, 6);
      ctx.fillRect(8, 12, 12, 6);

      // Headlights at night
      if (state.dayTime < 0.3 || state.dayTime > 0.7) {
        ctx.fillStyle = '#ffff8d';
        ctx.fillRect(28, -10, 4, 6);
        ctx.fillRect(28, 4, 4, 6);
      }

      ctx.restore();
    }

    // Draw pedestrians
    for (let ped of state.pedestrians) {
      ctx.fillStyle = ped.color;
      ctx.beginPath();
      ctx.arc(ped.x, ped.y, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw police units
    for (let cop of state.policeUnits) {
      ctx.save();
      ctx.translate(cop.x, cop.y);
      ctx.rotate(cop.angle);
      ctx.fillStyle = '#111';
      ctx.fillRect(-26, -13, 52, 26);
      // Flashing light bar
      ctx.fillStyle = Math.floor(Date.now() / 150) % 2 === 0 ? '#ff1744' : '#2979ff';
      ctx.fillRect(-4, -4, 8, 8);
      ctx.restore();
    }

    // Draw Mission Target Pillar
    if (state.missionActive && !state.freeRoam) {
      const m = MISSIONS[state.missionIndex];
      ctx.fillStyle = 'rgba(255, 215, 0, 0.4)';
      ctx.beginPath();
      ctx.arc(m.targetX, m.y, 45, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(m.targetX, m.y, 45 + Math.sin(Date.now() / 200) * 10, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw player
    const p = state.player;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    if (!p.inCar) {
      // Body
      ctx.fillStyle = '#ff5722';
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      // Gun pointing out
      ctx.fillStyle = '#455a64';
      ctx.fillRect(6, 4, 12, 4);
    }
    ctx.restore();

    // Draw particles / flashes
    for (let pt of state.particles) {
      if (pt.type === 'flash') {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 12, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();

    // Day/Night tint overlay
    if (state.dayTime < 0.3 || state.dayTime > 0.7) {
      ctx.fillStyle = 'rgba(10, 15, 30, 0.45)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (state.dayTime < 0.35 || state.dayTime > 0.65) {
      ctx.fillStyle = 'rgba(255, 152, 0, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw HUD
    drawHUD(state, screen);
  }

  function drawTitleScreen(bestScore) {
    ctx.fillStyle = '#0f141c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 56px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PORT AZAHAR', canvas.width / 2, canvas.height / 2 - 120);

    ctx.fillStyle = '#ff9800';
    ctx.font = '22px sans-serif';
    ctx.fillText('Open World Crime Game • Dario Venn & Marisol Kane', canvas.width / 2, canvas.height / 2 - 60);

    ctx.fillStyle = '#b0bec5';
    ctx.font = '18px sans-serif';
    ctx.fillText('Controls: WASD / Arrows to Move • E/F to Enter/Exit Cars • Mouse Click to Shoot • P to Pause • M to Mute', canvas.width / 2, canvas.height / 2);

    ctx.fillStyle = '#81c784';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('Press ENTER or Click to Start Game', canvas.width / 2, canvas.height / 2 + 80);
  }

  function drawHUD(state, screen) {
    const p = state.player;

    // Top-left: Cash & Wanted
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(20, 20, 240, 80);
    ctx.fillStyle = '#4caf50';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`$${p.cash.toLocaleString()}`, 35, 50);

    // Wanted stars
    ctx.fillStyle = '#ffd700';
    let stars = '';
    for (let i = 0; i < 5; i++) {
      stars += i < p.wanted ? '★ ' : '☆ ';
    }
    ctx.font = '20px sans-serif';
    ctx.fillText(stars, 35, 82);

    // Health / Armor bars
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(canvas.width - 260, 20, 240, 70);
    ctx.fillStyle = '#f44336';
    ctx.fillRect(canvas.width - 240, 32, (p.health / 100) * 200, 12);
    ctx.fillStyle = '#2196f3';
    ctx.fillRect(canvas.width - 240, 56, (p.armor / 100) * 200, 12);

    // Mission / Objective Banner
    if (state.missionActive && !state.freeRoam) {
      const m = MISSIONS[state.missionIndex];
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(canvas.width / 2 - 250, 20, 500, 64);
      ctx.fillStyle = '#ff9800';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`MISSION: ${m.title}`, canvas.width / 2, 45);
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px sans-serif';
      ctx.fillText(`Time Left: ${Math.ceil(state.missionTimer)}s`, canvas.width / 2, 68);
    }

    // Dialogue banner at bottom
    if (state.dialogueTimer > 0) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.fillRect(canvas.width / 2 - 350, canvas.height - 100, 700, 70);
      ctx.fillStyle = '#ffeb3b';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(state.dialogue.speaker, canvas.width / 2, canvas.height - 72);
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.fillText(state.dialogue.text, canvas.width / 2, canvas.height - 48);
    }

    // Minimap in bottom right
    const mapSize = 160;
    const mapX = canvas.width - mapSize - 20;
    const mapY = canvas.height - mapSize - 20;
    ctx.fillStyle = 'rgba(15, 20, 30, 0.85)';
    ctx.fillRect(mapX, mapY, mapSize, mapSize);
    ctx.strokeStyle = '#37474f';
    ctx.lineWidth = 2;
    ctx.strokeRect(mapX, mapY, mapSize, mapSize);

    // Minimap blip for player
    const scaleMap = mapSize / WORLD_SIZE;
    ctx.fillStyle = '#00e676';
    ctx.beginPath();
    ctx.arc(mapX + p.x * scaleMap, mapY + p.y * scaleMap, 4, 0, Math.PI * 2);
    ctx.fill();

    // Minimap blip for mission target
    if (state.missionActive && !state.freeRoam) {
      const m = MISSIONS[state.missionIndex];
      ctx.fillStyle = '#ffea00';
      ctx.beginPath();
      ctx.arc(mapX + m.targetX * scaleMap, mapY + m.y * scaleMap, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  return { draw };
}
