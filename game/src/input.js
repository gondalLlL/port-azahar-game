export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER = 4;
export const ACTION_ACTION = 8;
export const ACTION_SHOOT = 16;
export const ACTION_MUTE = 32;

export function createInput(target) {
  const keys = new Set();
  let actions = 0;
  let mouse = { x: FIELD_CENTER_X(), y: FIELD_CENTER_Y(), down: false, rightDown: false };

  function FIELD_CENTER_X() { return 640; }
  function FIELD_CENTER_Y() { return 360; }

  window.addEventListener('keydown', (e) => {
    keys.add(e.code);
    if (e.code === 'Enter' || e.code === 'Space') {
      if (!e.repeat) actions |= ACTION_CONFIRM;
    }
    if (e.code === 'KeyP' || e.code === 'Escape') {
      if (!e.repeat) actions |= ACTION_PAUSE;
    }
    if (e.code === 'KeyE' || e.code === 'KeyF') {
      if (!e.repeat) actions |= ACTION_ENTER;
    }
    if (e.code === 'KeyM') {
      if (!e.repeat) actions |= ACTION_MUTE;
    }
    if (e.code === 'KeyR' || e.code === 'KeyQ') {
      if (!e.repeat) actions |= ACTION_ACTION;
    }
    if (e.code === 'Space') {
      e.preventDefault();
    }
  });

  window.addEventListener('keyup', (e) => {
    keys.delete(e.code);
  });

  window.addEventListener('blur', () => {
    keys.clear();
  });

  target.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
      mouse.down = true;
      actions |= ACTION_SHOOT;
      actions |= ACTION_CONFIRM;
    } else if (e.button === 2) {
      mouse.rightDown = true;
    }
  });

  target.addEventListener('mouseup', (e) => {
    if (e.button === 0) mouse.down = false;
    else if (e.button === 2) mouse.rightDown = false;
  });

  target.addEventListener('mousemove', (e) => {
    const rect = target.getBoundingClientRect();
    const scaleX = target.width / rect.width;
    const scaleY = target.height / rect.height;
    mouse.x = (e.clientX - rect.left) * scaleX;
    mouse.y = (e.clientY - rect.top) * scaleY;
  });

  target.addEventListener('contextmenu', (e) => e.preventDefault());
  target.addEventListener('pointerdown', () => {
    actions |= ACTION_CONFIRM;
  });

  return {
    isDown(code) { return keys.has(code); },
    get horizontal() {
      let v = 0;
      if (keys.has('KeyD') || keys.has('ArrowRight')) v += 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) v -= 1;
      return v;
    },
    get vertical() {
      let v = 0;
      if (keys.has('KeyS') || keys.has('ArrowDown')) v += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) v -= 1;
      return v;
    },
    get sprint() { return keys.has('ShiftLeft') || keys.has('ShiftRight'); },
    get handbrake() { return keys.has('Space'); },
    get mouse() { return mouse; },
    takeActions() {
      const t = actions;
      actions = 0;
      return t;
    }
  };
}
