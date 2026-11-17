export const FIELD = { width: 1280, height: 720 };
export const STEP = 1 / 60;

export const WORLD_SIZE = 6400; // 6400 x 6400 world units
export const BLOCK_SIZE = 160;
export const ROAD_WIDTH = 48;
export const GRID_COUNT = 40; // 40x40 blocks

export const DISTRICTS = {
  DOCKS: { name: 'Docks', xMin: 0, yMin: 0, xMax: 2560, yMax: 2560, color: '#2a323d', accent: '#ff9800' },
  NEON_MILE: { name: 'Neon Mile', xMin: 2560, yMin: 0, xMax: 5120, yMax: 2560, color: '#1a1829', accent: '#e91e63' },
  OLD_TOWN: { name: 'Old Town', xMin: 0, yMin: 2560, xMax: 2560, yMax: 5120, color: '#3d2b23', accent: '#8d6e63' },
  MARINA: { name: 'Marina', xMin: 2560, yMin: 2560, xMax: 5120, yMax: 5120, color: '#1b3b36', accent: '#00bcd4' },
  HILLS: { name: 'The Hills', xMin: 5120, yMin: 0, xMax: 6400, yMax: 6400, color: '#253825', accent: '#4caf50' },
};

export const SAVE_KEY = 'port-azahar.save.v3';
export const SETTINGS_KEY = 'port-azahar.settings.v3';
