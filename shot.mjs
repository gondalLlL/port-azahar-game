import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  mkdirSync('screenshots', { recursive: true });
  const shotsData = JSON.parse(readFileSync('shots.json', 'utf8'));

  // Start server
  const server = spawn('node', ['serve.ts', '--port', '8124'], { stdio: 'inherit' });
  await sleep(1500);

  const browser = await chromium.launch({
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
  });

  const summary = { shots: [], errors: [] };

  for (const shot of shotsData) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => {
      consoleErrors.push(err.message);
    });

    const url = `http://127.0.0.1:8124/${shot.query}`;
    console.log(`Capturing ${shot.name} at ${url}...`);

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
      await page.waitForFunction(() => window.__shotReady === true, { timeout: 10000 });
    } catch (e) {
      console.warn(`Timeout or error waiting for ${shot.name}:`, e.message);
    }

    // Additional short wait for paint settle
    await sleep(500);

    let quality = 80;
    let buffer = await page.screenshot({ type: 'jpeg', quality });
    if (buffer.length > 262144) {
      quality = 60;
      buffer = await page.screenshot({ type: 'jpeg', quality });
    }

    const outPath = join('screenshots', shot.name);
    writeFileSync(outPath, buffer);
    const size = statSync(outPath).size;

    summary.shots.push({ name: shot.name, size, quality, errors: consoleErrors });
    await context.close();
  }

  // Load plain game once
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:8124/', { waitUntil: 'networkidle', timeout: 5000 });
    await context.close();
    summary.plainGameLoaded = true;
  } catch (e) {
    summary.plainGameLoaded = false;
    summary.errors.push(e.message);
  }

  await browser.close();
  server.kill();

  console.log(JSON.stringify(summary, null, 2));
}

main().catch(err => {
  console.error('Shot script error:', err);
  process.exit(1);
});
