import { STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld } from './world.js';
import { createInput, ACTION_CONFIRM, ACTION_PAUSE, ACTION_MUTE } from './input.js';
import { createRenderer, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED } from './render.js';
import { stageShot } from './shots.js';
import { initAudio, toggleMute, updateEngineSound, playSound } from './audio.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const random = createRandom(seed);
const world = createWorld(random);
const renderer = createRenderer(canvas);

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else {
      window.__shotReady = true;
      console.log('__shotReady set for shot:', name);
    }
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();

  function startGame() {
    initAudio();
    world.reset();
    screen = SCREEN_PLAY;
    playSound('sting');
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      toggleMute();
    }
    if (actions & ACTION_CONFIRM && screen === SCREEN_TITLE) {
      startGame();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, 0.25);
    last = now;

    handleActions();

    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP) {
        world.step(STEP, input);
        accumulator -= STEP;
      }
      updateEngineSound(world.state.player.inCar ? 100 : 0, world.state.player.inCar);
    } else {
      accumulator = 0;
    }

    renderer.draw(world.state, screen, 5000);
  }

  requestAnimationFrame(frame);
}

if (shot) {
  initAudio();
  runShot(shot);
} else {
  runGame();
}
