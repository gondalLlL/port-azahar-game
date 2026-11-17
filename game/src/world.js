import { WORLD_SIZE, BLOCK_SIZE, ROAD_WIDTH, GRID_COUNT, DISTRICTS, SAVE_KEY } from './config.js';
import { playSessionSound } from './audio.js';

export const MISSIONS = [
  { id: 1, title: 'First Run', desc: 'Pick up the package at the Docks and deliver it across town before time runs out.', targetX: 1200, y: 1200, reward: 1000, timeLimit: 120 },
  { id: 2, title: 'Borrowed Wheels', desc: 'Steal the marked azure sports car in Neon Mile and deliver it to the garage.', targetX: 3800, y: 1200, reward: 2500, timeLimit: 150 },
  { id: 3, title: 'Heat', desc: 'Evade police or reach the safehouse in Old Town while at a 3-star wanted level.', targetX: 1200, y: 3800, reward: 4000, timeLimit: 180 },
  { id: 4, title: 'Three Drops', desc: 'Collect 3 cash drops across Marina while police pressure rises.', targetX: 3800, y: 3800, reward: 6000, timeLimit: 240 },
  { id: 5, title: 'Last Boat', desc: 'Escape to the marina boat at the south edge of the bay to complete the contract.', targetX: 3200, y: 4800, reward: 10000, timeLimit: 300 }
];

export function createWorld(random) {
  // Generate buildings
  const buildings = [];
  const roadGrid = [];
  
  for (let bx = 0; bx < GRID_COUNT; bx++) {
    for (let by = 0; by < GRID_COUNT; by++) {
      const x = bx * BLOCK_SIZE + ROAD_WIDTH;
      const y = by * BLOCK_SIZE + ROAD_WIDTH;
      const w = BLOCK_SIZE - ROAD_WIDTH;
      const h = BLOCK_SIZE - ROAD_WIDTH;
      
      // Determine district
      let district = DISTRICTS.DOCKS;
      const cx = x + w/2;
      const cy = y + h/2;
      if (cx >= 2560 && cx < 5120 && cy < 2560) district = DISTRICTS.NEON_MILE;
      else if (cx < 2560 && cy >= 2560 && cy < 5120) district = DISTRICTS.OLD_TOWN;
      else if (cx >= 2560 && cx < 5120 && cy >= 2560 && cy < 5120) district = DISTRICTS.MARINA;
      else if (cx >= 5120) district = DISTRICTS.HILLS;

      const height = Math.floor(20 + random() * 80);
      const palette = district === DISTRICTS.NEON_MILE ? ['#4a148c', '#6a1b9a', '#8e24aa', '#311b92', '#4527a0'] :
                      district === DISTRICTS.OLD_TOWN ? ['#b71c1c', '#d32f2f', '#8d6e63', '#6d4c41', '#a1887f'] :
                      district === DISTRICTS.MARINA ? ['#00838f', '#00acc1', '#0097a7', '#006064', '#00838f'] :
                      district === DISTRICTS.HILLS ? ['#2e7d32', '#388e3c', '#43a047', '#1b5e20', '#558b2f'] :
                      ['#37474f', '#455a64', '#546e7a', '#78909c', '#37474f'];
      const buildingColor = palette[Math.floor(random() * palette.length)];

      buildings.push({
        x, y, w, h, height,
        district: district.name,
        color: buildingColor,
        accent: district.accent,
        hasNeon: district === DISTRICTS.NEON_MILE && random() > 0.5,
        hasLights: random() > 0.3
      });
    }
  }

  // Cars (traffic and parked)
  const cars = [];
  for (let i = 0; i < 40; i++) {
    cars.push({
      x: 100 + random() * (WORLD_SIZE - 200),
      y: 100 + random() * (WORLD_SIZE - 200),
      vx: 0, vy: 0,
      angle: random() * Math.PI * 2,
      speed: 0,
      maxSpeed: 150 + random() * 100,
      color: ['#e53935', '#1e88e5', '#43a047', '#fb8c00', '#8e24aa', '#fdd835'][Math.floor(random() * 6)],
      type: random() > 0.8 ? 'sports' : 'sedan',
      isPolice: false,
      aiTimer: 0
    });
  }

  // Pedestrians
  const pedestrians = [];
  for (let i = 0; i < 60; i++) {
    pedestrians.push({
      x: 200 + random() * (WORLD_SIZE - 400),
      y: 200 + random() * (WORLD_SIZE - 400),
      vx: 0, vy: 0,
      speed: 20 + random() * 20,
      state: 'walk', // walk, flee
      timer: random() * 5,
      color: ['#f44336', '#2196f3', '#ffeb3b', '#9c27b0', '#009688'][Math.floor(random() * 5)]
    });
  }

  // Police units
  const policeUnits = [];

  const state = {
    player: {
      x: 1500,
      y: 1500,
      vx: 0,
      vy: 0,
      angle: 0,
      health: 100,
      armor: 100,
      cash: 500,
      wanted: 0,
      wantedTimer: 0,
      bustedMeter: 0,
      inCar: false,
      carIndex: -1,
      weapon: 'pistol',
      ammo: 50
    },
    buildings,
    cars,
    pedestrians,
    policeUnits,
    missionIndex: 0,
    missionActive: false,
    missionTimer: 0,
    missionProgress: 0,
    dialogue: { speaker: 'Marisol', text: 'Welcome to Port Azahar, Dario. Let\'s get to work.' },
    dialogueTimer: 5,
    camera: { x: 1500, y: 1500 },
    dayTime: 0.25, // 0 = midnight, 0.25 = sunrise, 0.5 = noon, 0.75 = sunset
    particles: [],
    savedDrops: [],
    gameEnded: false,
    freeRoam: false
  };

  function saveGame() {
    try {
      const data = {
        player: state.player,
        missionIndex: state.missionIndex,
        freeRoam: state.freeRoam
      };
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) {}
  }

  function loadGame() {
    try {
      const saved = window.localStorage.getItem(SAVE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        Object.assign(state.player, data.player);
        state.missionIndex = data.missionIndex ?? 0;
        state.freeRoam = data.freeRoam ?? false;
        return true;
      }
    } catch (e) {}
    return false;
  }

  function reset() {
    state.player.x = 1500;
    state.player.y = 1500;
    state.player.health = 100;
    state.player.armor = 100;
    state.player.cash = 500;
    state.player.wanted = 0;
    state.player.inCar = false;
    state.missionIndex = 0;
    state.missionActive = true;
    state.missionTimer = MISSIONS[0].timeLimit;
    state.dialogue = { speaker: 'Marisol Kane', text: 'First Run: Pick up the package at the Docks and deliver it across town.' };
    state.dialogueTimer = 8;
  }

  function setDialogue(speaker, text) {
    state.dialogue.speaker = speaker;
    state.dialogue.text = text;
    state.dialogueTimer = 6;
  }

  function startMission(index) {
    if (index >= MISSIONS.length) {
      state.freeRoam = true;
      state.missionActive = false;
      setDialogue('Marisol', 'You did it, Dario. Port Azahar is ours. Enjoy free roam!');
      return;
    }
    state.missionIndex = index;
    state.missionActive = true;
    state.missionTimer = MISSIONS[index].timeLimit;
    setDialogue('Marisol Kane', `${MISSIONS[index].title}: ${MISSIONS[index].desc}`);
  }

  function step(dt, input) {
    // Day cycle
    state.dayTime = (state.dayTime + dt * 0.005) % 1;

    // Dialogue timer
    if (state.dialogueTimer > 0) state.dialogueTimer -= dt;

    const p = state.player;

    // Handle entering/exiting car
    if (input.takeActions() & 4) { // ACTION_ENTER
      if (p.inCar) {
        // Exit car
        const car = state.cars[p.carIndex];
        p.x = car.x + 40;
        p.y = car.y;
        p.inCar = false;
        p.carIndex = -1;
      } else {
        // Find nearest car
        let nearestIdx = -1;
        let minDist = 60;
        for (let i = 0; i < state.cars.length; i++) {
          const c = state.cars[i];
          const dist = Math.hypot(c.x - p.x, c.y - p.y);
          if (dist < minDist) {
            minDist = dist;
            nearestIdx = i;
          }
        }
        if (nearestIdx !== -1) {
          p.inCar = true;
          p.carIndex = nearestIdx;
        }
      }
    }

    if (p.inCar) {
      // Driving physics
      const car = state.cars[p.carIndex];
      const accel = input.vertical < 0 ? 300 : input.vertical > 0 ? -150 : 0;
      car.speed += accel * dt;
      car.speed *= 0.98; // friction
      car.speed = Math.max(-100, Math.min(car.maxSpeed, car.speed));

      if (Math.abs(car.speed) > 5) {
        const turnRate = 2.5 * (car.speed / car.maxSpeed);
        if (input.horizontal !== 0) {
          car.angle += input.horizontal * turnRate * dt;
        }
      }

      car.vx = Math.cos(car.angle) * car.speed;
      car.vy = Math.sin(car.angle) * car.speed;
      car.x += car.vx * dt;
      car.y += car.vy * dt;

      // Keep within world bounds
      car.x = Math.max(100, Math.min(WORLD_SIZE - 100, car.x));
      car.y = Math.max(100, Math.min(WORLD_SIZE - 100, car.y));

      p.x = car.x;
      p.y = car.y;
      p.angle = car.angle;
    } else {
      // On foot movement
      const speed = input.sprint ? 220 : 130;
      let dx = input.horizontal;
      let dy = input.vertical;
      if (dx !== 0 && dy !== 0) {
        dx *= 0.7071;
        dy *= 0.7071;
      }
      p.x += dx * speed * dt;
      p.y += dy * speed * dt;

      if (dx !== 0 || dy !== 0) {
        p.angle = Math.atan2(dy, dx);
      }

      p.x = Math.max(50, Math.min(WORLD_SIZE - 50, p.x));
      p.y = Math.max(50, Math.min(WORLD_SIZE - 50, p.y));

      // Shooting / Combat
      if (input.mouse.down) {
        // Shoot pistol
        state.particles.push({ x: p.x + Math.cos(p.angle)*20, y: p.y + Math.sin(p.angle)*20, life: 0.1, type: 'flash' });
        if (p.wanted === 0 && random() > 0.4) {
          p.wanted = 1;
          p.wantedTimer = 20;
          setDispatcher('Police spotted a crime!');
        }
      }
    }

    // Camera follow player smoothly
    state.camera.x += (p.x - state.camera.x) * 0.1;
    state.camera.y += (p.y - state.camera.y) * 0.1;

    // Traffic AI update
    for (let i = 0; i < state.cars.length; i++) {
      if (p.inCar && p.carIndex === i) continue;
      const c = state.cars[i];
      c.aiTimer -= dt;
      if (c.aiTimer <= 0) {
        c.aiTimer = 3 + random() * 4;
        c.angle += (random() - 0.5) * 1.5;
        c.speed = 60 + random() * 60;
      }
      c.x += Math.cos(c.angle) * c.speed * dt;
      c.y += Math.sin(c.angle) * c.speed * dt;
      if (c.x < 100 || c.x > WORLD_SIZE - 100) c.angle += Math.PI;
      if (c.y < 100 || c.y > WORLD_SIZE - 100) c.angle += Math.PI;
    }

    // Pedestrians AI update
    for (let i = 0; i < state.pedestrians.length; i++) {
      const ped = state.pedestrians[i];
      ped.timer -= dt;
      if (ped.timer <= 0) {
        ped.timer = 4 + random() * 4;
        ped.angle = random() * Math.PI * 2;
      }
      const spd = ped.state === 'flee' ? 80 : 25;
      ped.x += Math.cos(ped.angle || 0) * spd * dt;
      ped.y += Math.sin(ped.angle || 0) * spd * dt;

      // Flee from player if close
      if (Math.hypot(ped.x - p.x, ped.y - p.y) < 120) {
        ped.state = 'flee';
        ped.angle = Math.atan2(ped.y - p.y, ped.x - p.x);
      }
    }

    // Police Wanted & Pursuit
    if (p.wanted > 0) {
      p.wantedTimer -= dt;
      if (p.wantedTimer <= 0 && state.policeUnits.length === 0) {
        p.wanted = Math.max(0, p.wanted - 1);
        p.wantedTimer = 25;
      }

      // Spawn police if needed
      if (state.policeUnits.length < p.wanted * 2) {
        state.policeUnits.push({
          x: p.x + (random() - 0.5) * 1000,
          y: p.y + (random() - 0.5) * 1000,
          speed: 180,
          angle: 0
        });
      }

      // Update police chase
      for (let cop of state.policeUnits) {
        const angleToPlayer = Math.atan2(p.y - cop.y, p.x - cop.x);
        cop.angle = angleToPlayer;
        cop.x += Math.cos(cop.angle) * cop.speed * dt;
        cop.y += Math.sin(cop.angle) * cop.speed * dt;

        if (Math.hypot(cop.x - p.x, cop.y - p.y) < 40) {
          p.health -= 10 * dt;
          p.bustedMeter += dt * 20;
          if (p.bustedMeter >= 100) {
            // Busted
            p.cash = Math.max(0, p.cash - 500);
            p.wanted = 0;
            p.bustedMeter = 0;
            p.x = 2000; p.y = 2000; // Police station spawn
            setDialogue('Police', 'Busted! You lost $500 bail.');
          }
        }
      }
    } else {
      state.bustedMeter = Math.max(0, state.bustedMeter - dt * 30);
      state.policeUnits.length = 0;
    }

    // Missions check
    if (state.missionActive && !state.freeRoam) {
      state.missionTimer -= dt;
      const m = MISSIONS[state.missionIndex];
      const dist = Math.hypot(m.targetX - p.x, m.targetY - p.y);
      if (dist < 100) {
        p.cash += m.reward;
        setDialogue('Marisol Kane', `Mission Complete! Earned $${m.reward}.`);
        saveGame();
        startMission(state.missionIndex + 1);
      } else if (state.missionTimer <= 0) {
        setDialogue('Marisol Kane', 'Mission Failed! Time ran out. Retrying...');
        state.missionTimer = m.timeLimit;
      }
    }

    // Particles update
    for (let i = state.particles.length - 1; i >= 0; i--) {
      state.particles[i].life -= dt;
      if (state.particles[i].life <= 0) state.particles.splice(i, 1);
    }
  }

  function setDispatcher(text) {
    setDialogue('Police Dispatch', text);
  }

  reset();
  return { state, reset, step, saveGame, loadGame, startMission };
}
