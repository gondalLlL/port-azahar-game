import { SCREEN_TITLE, SCREEN_PLAY } from './render.js';

export function stageShot(name, world) {
  world.reset();
  const state = world.state;

  if (name === 'title') {
    // Title screen
    return { screen: SCREEN_TITLE, best: 1000 };
  } else if (name === 'drive') {
    // Driving mid-city among traffic, mission HUD on
    state.player.x = 2000;
    state.player.y = 2000;
    state.player.inCar = true;
    state.player.carIndex = 0;
    state.cars[0].x = 2000;
    state.cars[0].y = 2000;
    state.cars[0].speed = 120;
    state.missionActive = true;
    state.missionIndex = 0;
    return { screen: SCREEN_PLAY, best: 500 };
  } else if (name === 'chase') {
    // Police pursuit, 3 stars, light bars
    state.player.x = 3000;
    state.player.y = 3000;
    state.player.wanted = 3;
    state.policeUnits.push(
      { x: 3050, y: 3000, speed: 150, angle: 0 },
      { x: 2950, y: 3050, speed: 150, angle: Math.PI / 2 }
    );
    return { screen: SCREEN_PLAY, best: 1200 };
  } else if (name === 'night') {
    // Neon Mile at night on foot, lit windows, neon, mission pillar
    state.dayTime = 0.1; // Night
    state.player.x = 3500;
    state.player.y = 1000;
    state.player.inCar = false;
    state.missionActive = true;
    state.missionIndex = 1;
    return { screen: SCREEN_PLAY, best: 2500 };
  }

  return { screen: SCREEN_TITLE, best: 0 };
}
