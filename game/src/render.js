import { FIELD, WORLD_SIZE, BLOCK_SIZE, ROAD_WIDTH, GRID_COUNT } from './config.js';
import { MISSIONS } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

function adjustColor(hex, amount) {
  let useHex = hex.replace('#', '');
  if (useHex.length === 3) {
    useHex = useHex.split('').map(c => c + c).join('');
  }
  const num = parseInt(useHex, 16);
  let r = (num >> 16) + amount;
  let g = ((num >> 8) & 0x00ff) + amount;
  let b = (num & 0x0000ff) + amount;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

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
      // Title screen with live city backing
      ctx.save();
      const cam = { x: 3200, y: 3200 };
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.translate(-cam.x, -cam.y);
      drawWorld(state, 0.45); // Noon/daytime aesthetic for title view
      ctx.restore();

      // Dark gradient veil
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, 'rgba(10, 14, 24, 0.85)');
      gradient.addColorStop(1, 'rgba(15, 20, 32, 0.65)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      drawTitleScreen(bestScore);
      return;
    }

    ctx.save();
    const cam = state.camera;
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.translate(-cam.x, -cam.y);

    drawWorld(state, state.dayTime);

    ctx.restore();

    // Day/Night smooth tint overlay
    drawDayNightTint(state.dayTime);

    // Draw HUD
    drawHUD(state, screen);
  }

  function drawWorld(state, dayTime) {
    const isNight = dayTime < 0.3 || dayTime > 0.75;

    // 1. World ground background
    ctx.fillStyle = '#282e3d';
    ctx.fillRect(0, 0, WORLD_SIZE, WORLD_SIZE);

    // Roads
    ctx.fillStyle = '#222834';
    for (let i = 0; i <= WORLD_SIZE; i += BLOCK_SIZE) {
      ctx.fillRect(i - ROAD_WIDTH/2, 0, ROAD_WIDTH, WORLD_SIZE);
      ctx.fillRect(0, i - ROAD_WIDTH/2, WORLD_SIZE, ROAD_WIDTH);
    }

    // Sidewalks along roads (flanking blocks)
    ctx.fillStyle = '#3a4252';
    for (let b of state.buildings) {
      if (b.special === 'park') continue;
      ctx.fillRect(b.x - 10, b.y - 10, b.w + 20, b.h + 20);
    }

    // Inner block ground (parks, parking lots, normal blocks)
    for (let b of state.buildings) {
      if (b.special === 'park') {
        ctx.fillStyle = '#2b4a30';
        ctx.fillRect(b.x, b.y, b.w, b.h);
        // Crossing paths
        ctx.fillStyle = '#4a5568';
        ctx.fillRect(b.x + b.w/2 - 10, b.y, 20, b.h);
        ctx.fillRect(b.x, b.y + b.h/2 - 10, b.w, 20);
        // Park benches
        ctx.fillStyle = '#6d4c41';
        ctx.fillRect(b.x + 25, b.y + 25, 20, 8);
        ctx.fillRect(b.x + b.w - 45, b.y + b.h - 33, 20, 8);
        // Park trees
        drawTree(b.x + 35, b.y + 35);
        drawTree(b.x + b.w - 35, b.y + 35);
        drawTree(b.x + b.w - 35, b.y + b.h - 35);
        drawTree(b.x + 35, b.y + b.h - 35);
      } else if (b.special === 'parking') {
        ctx.fillStyle = '#323a48';
        ctx.fillRect(b.x, b.y, b.w, b.h);
        // Painted stall lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2;
        for (let py = b.y + 15; py < b.y + b.h - 15; py += 45) {
          ctx.beginPath();
          ctx.moveTo(b.x + 15, py);
          ctx.lineTo(b.x + b.w - 15, py);
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = '#313946';
        ctx.fillRect(b.x, b.y, b.w, b.h);
      }
    }

    // Road markings
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 2;
    for (let i = 0; i <= WORLD_SIZE; i += BLOCK_SIZE) {
      ctx.beginPath();
      ctx.moveTo(i - ROAD_WIDTH/2 + 4, 0); ctx.lineTo(i - ROAD_WIDTH/2 + 4, WORLD_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i - ROAD_WIDTH/2 + 4); ctx.lineTo(WORLD_SIZE, i - ROAD_WIDTH/2 + 4);
      ctx.stroke();
    }

    // Dashed center lines
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 3;
    ctx.setLineDash([16, 16]);
    for (let i = BLOCK_SIZE / 2; i <= WORLD_SIZE; i += BLOCK_SIZE) {
      ctx.beginPath();
      ctx.moveTo(i, 0); ctx.lineTo(i, WORLD_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i); ctx.lineTo(WORLD_SIZE, i);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Crosswalk zebra stripes at intersections
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    for (let ix = 0; ix <= WORLD_SIZE; ix += BLOCK_SIZE) {
      for (let iy = 0; iy <= WORLD_SIZE; iy += BLOCK_SIZE) {
        ctx.fillRect(ix - ROAD_WIDTH/2, iy - ROAD_WIDTH/2 - 10, ROAD_WIDTH, 6);
      }
    }

    // Street trees along sidewalks at seeded intervals
    for (let bx = 0; bx <= GRID_COUNT; bx += 2) {
      for (let by = 0; by <= GRID_COUNT; by += 2) {
        const tx = bx * BLOCK_SIZE;
        const ty = by * BLOCK_SIZE;
        if (tx > 0 && tx < WORLD_SIZE && ty > 0 && ty < WORLD_SIZE) {
          drawTree(tx - 16, ty - 16);
          drawTree(tx + 16, ty + 16);
        }
      }
    }

    // 3. BUILDINGS (Pseudo-3D Extrusion, Shadows, Roofs, Props, Windows)
    for (let b of state.buildings) {
      if (b.special === 'park') continue;

      const h = b.height || 20;
      const ext = h * 0.45;

      // (a) Ground shadow offset down-right
      ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.fillRect(b.x + ext * 0.75, b.y + ext * 0.75, b.w, b.h);

      // (b) South and East side faces
      const sideDark = adjustColor(b.color, -45);
      const eastDark = adjustColor(b.color, -30);

      ctx.fillStyle = sideDark;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y + b.h);
      ctx.lineTo(b.x + b.w, b.y + b.h);
      ctx.lineTo(b.x + b.w + ext, b.y + b.h + ext);
      ctx.lineTo(b.x + ext, b.y + b.h + ext);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = eastDark;
      ctx.beginPath();
      ctx.moveTo(b.x + b.w, b.y);
      ctx.lineTo(b.x + b.w, b.y + b.h);
      ctx.lineTo(b.x + b.w + ext, b.y + b.h + ext);
      ctx.lineTo(b.x + b.w + ext, b.y + ext);
      ctx.closePath();
      ctx.fill();

      // (c) Roof face
      const roofColor = adjustColor(b.color, 25);
      ctx.fillStyle = roofColor;
      ctx.fillRect(b.x, b.y, b.w, b.h);

      ctx.strokeStyle = adjustColor(b.color, 50);
      ctx.lineWidth = 3;
      ctx.strokeRect(b.x, b.y, b.w, b.h);

      // Roof texture
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(b.x + 12, b.y + 12, b.w - 24, 4);
      ctx.fillRect(b.x + 12, b.y + 24, 16, 4);

      // (d) Rooftop props
      ctx.fillStyle = '#455a64';
      ctx.fillRect(b.x + b.w - 30, b.y + 15, 14, 14);
      ctx.fillRect(b.x + 20, b.y + b.h - 30, 18, 12);
      if (h > 70) {
        ctx.fillStyle = '#78909c';
        ctx.beginPath();
        ctx.arc(b.x + b.w / 2, b.y + b.h / 2, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#37474f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(b.x + b.w / 2, b.y + b.h / 2);
        ctx.lineTo(b.x + b.w / 2, b.y + b.h / 2 - 25);
        ctx.stroke();
      }

      // (e) Windows on south face
      const windowColor = isNight ? '#ffee58' : '#78909c';
      ctx.fillStyle = windowColor;
      for (let wx = b.x + 12; wx < b.x + b.w - 12; wx += 22) {
        ctx.fillRect(wx, b.y + b.h + ext * 0.4, 8, 12);
      }

      // Neon signs on Neon Mile
      if (b.hasNeon) {
        ctx.save();
        ctx.shadowColor = '#e91e63';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#ff4081';
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText('HOT', b.x + 10, b.y + 28);
        ctx.restore();

        const grad = ctx.createRadialGradient(b.x + b.w/2, b.y + b.h/2, 10, b.x + b.w/2, b.y + b.h/2, 90);
        grad.addColorStop(0, 'rgba(233, 30, 99, 0.25)');
        grad.addColorStop(1, 'rgba(233, 30, 99, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(b.x - 40, b.y - 40, b.w + 80, b.h + 80);
      }
    }

    // Lamp posts at intersections + night light pools
    for (let ix = BLOCK_SIZE; ix < WORLD_SIZE; ix += BLOCK_SIZE) {
      for (let iy = BLOCK_SIZE; iy < WORLD_SIZE; iy += BLOCK_SIZE) {
        ctx.fillStyle = '#111';
        ctx.beginPath();
        ctx.arc(ix - ROAD_WIDTH/2 - 6, iy - ROAD_WIDTH/2 - 6, 4, 0, Math.PI * 2);
        ctx.fill();

        if (isNight) {
          const lgrad = ctx.createRadialGradient(ix - ROAD_WIDTH/2 - 6, iy - ROAD_WIDTH/2 - 6, 5, ix - ROAD_WIDTH/2 - 6, iy - ROAD_WIDTH/2 - 6, 120);
          lgrad.addColorStop(0, 'rgba(255, 235, 59, 0.35)');
          lgrad.addColorStop(1, 'rgba(255, 235, 59, 0)');
          ctx.fillStyle = lgrad;
          ctx.fillRect(ix - 120, iy - 120, 240, 240);
        }
      }
    }

    // 4. Mission Target Pillar with glow
    if (state.missionActive && !state.freeRoam) {
      const m = MISSIONS[state.missionIndex];
      const pgrad = ctx.createRadialGradient(m.targetX, m.y, 5, m.targetX, m.y, 60);
      pgrad.addColorStop(0, 'rgba(255, 215, 0, 0.6)');
      pgrad.addColorStop(1, 'rgba(255, 215, 0, 0)');
      ctx.fillStyle = pgrad;
      ctx.fillRect(m.targetX - 70, m.y - 70, 140, 140);

      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(m.targetX, m.y, 45 + Math.sin(Date.now() / 200) * 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 5. CARS WITH DEPTH
    for (let i = 0; i < state.cars.length; i++) {
      const c = state.cars[i];
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.angle);

      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.ellipse(0, 4, 32, 18, 0, 0, Math.PI * 2);
      ctx.fill();

      if (c.isPolice) {
        ctx.fillStyle = '#111';
        ctx.fillRect(-28, -14, 56, 28);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-10, -14, 20, 28);
      } else {
        ctx.fillStyle = c.color;
        ctx.fillRect(-28, -14, 56, 28);
        ctx.fillStyle = adjustColor(c.color, -30);
        ctx.fillRect(-28, 4, 56, 10);
        ctx.fillStyle = adjustColor(c.color, 35);
        ctx.fillRect(-10, -10, 22, 20);
      }

      ctx.fillStyle = '#1a202c';
      ctx.fillRect(-8, -10, 10, 20);
      ctx.fillRect(6, -10, 8, 20);
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-6, -8); ctx.lineTo(-2, 8);
      ctx.stroke();

      ctx.fillStyle = '#0f1115';
      ctx.fillRect(-20, -18, 12, 6);
      ctx.fillRect(8, -18, 12, 6);
      ctx.fillRect(-20, 12, 12, 6);
      ctx.fillRect(8, 12, 12, 6);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-15, -16, 2, 2);
      ctx.fillRect(13, -16, 2, 2);
      ctx.fillRect(-15, 14, 2, 2);
      ctx.fillRect(13, 14, 2, 2);

      if (isNight) {
        ctx.fillStyle = '#ffff8d';
        ctx.fillRect(28, -10, 4, 6);
        ctx.fillRect(28, 4, 4, 6);

        const hcon = ctx.createLinearGradient(28, 0, 160, 0);
        hcon.addColorStop(0, 'rgba(255, 255, 140, 0.35)');
        hcon.addColorStop(1, 'rgba(255, 255, 140, 0)');
        ctx.fillStyle = hcon;
        ctx.beginPath();
        ctx.moveTo(28, -8);
        ctx.lineTo(160, -50);
        ctx.lineTo(160, 50);
        ctx.lineTo(28, 8);
        ctx.closePath();
        ctx.fill();
      }

      if (c.isPolice) {
        ctx.save();
        ctx.shadowColor = Math.floor(Date.now() / 150) % 2 === 0 ? '#ff1744' : '#2979ff';
        ctx.shadowBlur = 15;
        ctx.fillStyle = ctx.shadowColor;
        ctx.fillRect(-4, -5, 8, 10);
        ctx.restore();
      }

      ctx.restore();
    }

    // 6. PEOPLE
    for (let ped of state.pedestrians) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(ped.x, ped.y + 4, 7, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = ped.color;
      ctx.beginPath();
      ctx.arc(ped.x, ped.y - 4, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = adjustColor(ped.color, -30);
      ctx.fillRect(ped.x - 5, ped.y + 1, 10, 8);
    }

    for (let cop of state.policeUnits) {
      ctx.save();
      ctx.translate(cop.x, cop.y);
      ctx.rotate(cop.angle);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.ellipse(0, 4, 30, 16, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#111';
      ctx.fillRect(-26, -13, 52, 26);
      ctx.fillStyle = '#fff';
      ctx.fillRect(-8, -13, 16, 26);

      ctx.save();
      ctx.shadowColor = Math.floor(Date.now() / 150) % 2 === 0 ? '#ff1744' : '#2979ff';
      ctx.shadowBlur = 15;
      ctx.fillStyle = ctx.shadowColor;
      ctx.fillRect(-4, -4, 8, 8);
      ctx.restore();
      ctx.restore();
    }

    for (let pt of state.particles) {
      if (pt.type === 'flash') {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 14, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Player
    const p = state.player;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    if (!p.inCar) {
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.ellipse(0, 4, 9, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#111';
      ctx.lineWidth = 2;
      ctx.fillStyle = '#ff5722';
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#37474f';
      ctx.fillRect(6, 4, 12, 4);
    }
    ctx.restore();
  }

  function drawTree(x, y) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(x, y + 6, 12, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#5d4037';
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#2e7d32';
    ctx.beginPath();
    ctx.arc(x, y - 6, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#4caf50';
    ctx.beginPath();
    ctx.arc(x - 4, y - 10, 10, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawDayNightTint(t) {
    if (t >= 0.2 && t < 0.3) {
      const factor = (t - 0.2) / 0.1;
      ctx.fillStyle = `rgba(255, 140, 0, ${0.25 - factor * 0.15})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (t >= 0.3 && t < 0.6) {
      // Noon
    } else if (t >= 0.6 && t < 0.75) {
      const factor = (t - 0.6) / 0.15;
      ctx.fillStyle = `rgba(180, 40, 150, ${0.1 + factor * 0.15})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = 'rgba(10, 15, 45, 0.55)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  function drawTitleScreen(bestScore) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 64px sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 20;
    ctx.fillText('PORT AZAHAR', canvas.width / 2, canvas.height / 2 - 130);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#ff9800';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('Open World Crime Game • Dario Venn & Marisol Kane', canvas.width / 2, canvas.height / 2 - 60);

    ctx.fillStyle = '#cfd8dc';
    ctx.font = '18px sans-serif';
    ctx.fillText('Controls: WASD / Arrows to Move • E/F to Enter/Exit Cars • Mouse Click to Shoot • P to Pause • M to Mute', canvas.width / 2, canvas.height / 2);

    ctx.fillStyle = '#81c784';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('Press ENTER or Click to Start Game', canvas.width / 2, canvas.height / 2 + 80);
  }

  function drawHUD(state, screen) {
    const p = state.player;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(20, 20, 240, 80);
    ctx.fillStyle = '#4caf50';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`$${p.cash.toLocaleString()}`, 35, 50);

    ctx.fillStyle = '#ffd700';
    let stars = '';
    for (let i = 0; i < 5; i++) {
      stars += i < p.wanted ? '★ ' : '☆ ';
    }
    ctx.font = '20px sans-serif';
    ctx.fillText(stars, 35, 82);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(canvas.width - 260, 20, 240, 70);
    ctx.fillStyle = '#f44336';
    ctx.fillRect(canvas.width - 240, 32, (p.health / 100) * 200, 12);
    ctx.fillStyle = '#2196f3';
    ctx.fillRect(canvas.width - 240, 56, (p.armor / 100) * 200, 12);

    if (state.missionActive && !state.freeRoam) {
      const m = MISSIONS[state.missionIndex];
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(canvas.width / 2 - 250, 20, 500, 64);
      ctx.fillStyle = '#ff9800';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`MISSION: ${m.title}`, canvas.width / 2, 45);
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px sans-serif';
      ctx.fillText(`Time Left: ${Math.ceil(state.missionTimer)}s`, canvas.width / 2, 68);
    }

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

    // Minimap richness
    const mapSize = 160;
    const mapX = canvas.width - mapSize - 20;
    const mapY = canvas.height - mapSize - 20;
    ctx.fillStyle = 'rgba(15, 20, 30, 0.9)';
    ctx.fillRect(mapX, mapY, mapSize, mapSize);
    ctx.strokeStyle = '#37474f';
    ctx.lineWidth = 2;
    ctx.strokeRect(mapX, mapY, mapSize, mapSize);

    const scaleMap = mapSize / WORLD_SIZE;
    ctx.fillStyle = 'rgba(233, 30, 99, 0.15)';
    ctx.fillRect(mapX + 2560*scaleMap, mapY, 2560*scaleMap, 2560*scaleMap);

    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= WORLD_SIZE; i += BLOCK_SIZE * 2) {
      ctx.beginPath();
      ctx.moveTo(mapX + i * scaleMap, mapY);
      ctx.lineTo(mapX + i * scaleMap, mapY + mapSize);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(mapX, mapY + i * scaleMap);
      ctx.lineTo(mapX + mapSize, mapY + i * scaleMap);
      ctx.stroke();
    }

    for (let cop of state.policeUnits) {
      ctx.fillStyle = '#ff1744';
      ctx.beginPath();
      ctx.arc(mapX + cop.x * scaleMap, mapY + cop.y * scaleMap, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    if (state.missionActive && !state.freeRoam) {
      const m = MISSIONS[state.missionIndex];
      ctx.fillStyle = '#ffea00';
      ctx.beginPath();
      ctx.arc(mapX + m.targetX * scaleMap, mapY + m.y * scaleMap, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#00e676';
    ctx.beginPath();
    ctx.arc(mapX + p.x * scaleMap, mapY + p.y * scaleMap, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  return { draw };
}
