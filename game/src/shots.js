import { SCREEN_TITLE, SCREEN_PLAY } from './render.js';

export function stageShot(name, world) {
  world.reset();
  const state = world.state;

  if (name === 'title') {
    return { screen: SCREEN_TITLE, best: 1000 };
  } else if (name === 'drive') {
    state.dayTime = 0.5; // Daytime noon
    state.player.x = 2400;
    state.player.y = 2400;
    state.player.inCar = true;
    state.player.carIndex = 0;
    state.camera.x = 2400;
    state.camera.y = 2400;

    if (state.cars.length > 0) {
      state.cars[0].x = 2400;
      state.cars[0].y = 2400;
      state.cars[0].angle = 0;
      state.cars[0].speed = 45;
    }
    for (let i = 1; i < 10; i++) {
      if (state.cars[i]) {
        state.cars[i].x = 2400 + (i % 3 === 1 ? 120 : -120) * (i % 3);
        state.cars[i].y = 2400 + (i % 2 === 0 ? 140 : -140);
        state.cars[i].speed = 35;
      }
    }
    for (let i = 0; i < 8; i++) {
      if (state.pedestrians[i]) {
        state.pedestrians[i].x = 2370 + (i * 20) % 90;
        state.pedestrians[i].y = 2370 + Math.floor(i / 2) * 25;
      }
    }

    state.missionActive = true;
    state.missionIndex = 0;
    return { screen: SCREEN_PLAY, best: 500 };
  } else if (name === 'chase') {
    state.dayTime = 0.5; // Daytime
    state.player.x = 3200;
    state.player.y = 3200;
    state.player.inCar = true;
    state.player.carIndex = 0;
    state.player.wanted = 3;
    state.camera.x = 3200;
    state.camera.y = 3200;

    if (state.cars.length > 0) {
      state.cars[0].x = 3200;
      state.cars[0].y = 3200;
      state.cars[0].angle = 0;
      state.cars[0].speed = 65;
    }

    state.policeUnits = [
      { x: 3120, y: 3200, speed: 75, angle: 0 },
      { x: 3200, y: 3110, speed: 75, angle: Math.PI / 2 },
      { x: 3280, y: 3250, speed: 75, angle: Math.PI }
    ];

    for (let i = 1; i < 8; i++) {
      if (state.cars[i]) {
        state.cars[i].x = 3200 + (i * 45) % 220 - 110;
        state.cars[i].y = 3200 + (i * 55) % 220 - 110;
        state.cars[i].speed = 40;
      }
    }

    state.missionActive = true;
    state.missionIndex = 2;
    return { screen: SCREEN_PLAY, best: 1200 };
  } else if (name === 'night') {
    state.dayTime = 0.05; // Night in Neon Mile
    state.player.x = 3600;
    state.player.y = 1200;
    state.player.inCar = false;
    state.camera.x = 3600;
    state.camera.y = 1200;

    for (let i = 0; i < 6; i++) {
      if (state.pedestrians[i]) {
        state.pedestrians[i].x = 3580 + (i * 22);
        state.pedestrians[i].y = 1180 + (i * 18);
      }
    }
    for (let i = 0; i < 4; i++) {
      if (state.cars[i]) {
        state.cars[i].x = 3540 + i * 55;
        state.cars[i].y = 1240;
        state.cars[i].speed = 0; // parked
      }
    }

    state.missionActive = true;
    state.missionIndex = 1;
    return { screen: SCREEN_PLAY, best: 2500 };
  }

  return { screen: SCREEN_TITLE, best: 0 };
}
