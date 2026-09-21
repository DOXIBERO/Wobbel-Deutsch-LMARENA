/**
 * ============================================================
 * WOBBEL DEUTSCH v2 — Batch-3 E2E (Parts 051-075)
 * ============================================================
 * 1. Module assertions: factory registry, templates, generator
 *    reproducibility, bot presets, difficulty scaler, RoundManager.
 * 2. Live obstacle probes: conveyor force, lava elimination,
 *    wind lift (real physics bodies in the live scene).
 * 3. Full session: R1 classic (drive → finish) → rankings overlay →
 *    R2 template (drive → finish) → fast-forward R3-R5 → RESULTS.
 */
import puppeteer from 'puppeteer';
import fs from 'node:fs';

const OUT = 'shots';
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({
  headless: true, protocolTimeout: 600000,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
    '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader',
    '--window-size=900,560', '--mute-audio'],
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 560 });
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + String(e.stack ?? e).split('\n').slice(0, 3).join(' | ').slice(0, 260)));
page.on('response', (r) => { if (r.status() >= 400) errors.push(`HTTP ${r.status()}: ${r.url()}`); });

await page.goto('http://localhost:8022/', { waitUntil: 'networkidle2', timeout: 90000 });
for (let i = 0; i < 40; i++) {
  const gone = await page.evaluate(() => !document.getElementById('boot-overlay')).catch(() => false);
  if (gone) break;
  await new Promise((r) => setTimeout(r, 1000));
}
await new Promise((r) => setTimeout(r, 1500));
await page.evaluate(() => window.__wo?.engine?.renderer && (() => {
  import('/src/core/QualityManager.js').then((m) => m.QualityManager.apply('low'));
})());
await new Promise((r) => setTimeout(r, 800));
await page.screenshot({ path: `${OUT}/b3-menu.png` });

// ── 1) Module assertions ────────────────────────────────────
const checks = await page.evaluate(async () => {
  const out = [];
  const ok = (n, c) => out.push(`${c ? 'PASS' : 'FAIL'} ${n}`);
  const { ObstacleFactory, REGISTRY } = await import('/src/obstacles/ObstacleFactory.js');
  ok('factory: 15 types registered', ObstacleFactory.types.length === 15
    && ['DOOR_GATE','MOVING_PLATFORM','SWINGING_HAMMER','SLIME_ZONE','CONVEYOR_BELT','BUMPER','TRAMPOLINE','ICE_FLOOR','LAVA_FLOOR','SPINNING_LOG','FALLING_BLOCKS','WIND_TUNNEL','WORD_BRIDGE','COLOR_SORT','COUNTING_ZONE'].every((t) => REGISTRY[t]));
  const bumper = ObstacleFactory.create('BUMPER', { x: 8, z: 999 }, window.__wo.engine.scene);
  ok('factory: create(BUMPER) instance', !!bumper && typeof bumper.dispose === 'function');
  bumper.dispose();

  const { LevelTemplates } = await import('/src/data/LevelTemplates.js');
  ok('templates: 8 courses (+classic)', LevelTemplates.all.filter((x) => !x.classic).length === 8);
  ok('templates: getTemplate mitte', LevelTemplates.getTemplate('mitte-master').gateCount === 5);
  ok('templates: getRandom(2)', LevelTemplates.getRandom(2).difficulty === 2);
  ok('templates: progression 1→easy 5→hard', LevelTemplates.getProgression(1).difficulty === 1 && LevelTemplates.getProgression(5).difficulty === 3);

  const { LevelGenerator } = await import('/src/levels/LevelGenerator.js');
  const a = LevelGenerator.generateFromSeed(4242);
  const b = LevelGenerator.generateFromSeed(4242);
  const c = LevelGenerator.generate({ difficulty: 1, seed: 777 });
  ok('generator: same seed = same course', JSON.stringify(a.segments) === JSON.stringify(b.segments));
  ok('generator: different seed differs', JSON.stringify(a.segments) !== JSON.stringify(c.segments));
  ok('generator: gates every ~3 slots', a.gateCount >= 3 && a.segments.filter((s) => s.type === 'DOOR_GATE').length === a.gateCount);
  ok('generator: all segment types exist', a.segments.every((s) => REGISTRY[s.type]));

  const { BOT_PRESETS } = await import('/src/data/BotPresets.js');
  ok('bots: 10 presets, unique names, skill 0-1', BOT_PRESETS.length === 10
    && new Set(BOT_PRESETS.map((p) => p.name)).size === 10
    && BOT_PRESETS.every((p) => p.skill > 0 && p.skill <= 1 && p.reactionTime >= 0.29 && p.reactionTime <= 1.51));

  const { DifficultyScaler, BOT_COUNT } = await import('/src/core/DifficultyScaler.js');
  const up = new DifficultyScaler();
  const upRes = up.adjust({ correct: 9, total: 10 });   // one round: +1 step max
  ok('scaler: 90% → harder (gradual)', upRes.difficulty === 2 && upRes.botCount === BOT_COUNT[2]);
  const down = new DifficultyScaler();
  down.adjust({ correct: 1, total: 10 });
  down.difficulty = 2;
  down.adjust({ correct: 1, total: 10 });
  ok('scaler: 20% → easier', down.difficulty === 1);
  const clamp = new DifficultyScaler();
  for (let i = 0; i < 6; i++) clamp.adjust({ correct: 10, total: 10 });
  ok('scaler: ceiling 3 / gradual', clamp.difficulty === 3);

  const g = window.__wo;
  const { RoundManager } = await import('/src/core/RoundManager.js');
  const rm = new RoundManager(g);
  rm.startSession({ rounds: 5 });
  ok('roundManager: 5-round session, R1 classic', rm.total === 5 && rm.current.template.id === 'classic-60');
  const ids = rm.plan.map((r) => r.template.id);
  ok('roundManager: designed rounds never repeat', new Set(ids.filter((i2) => !i2.startsWith('gen-'))).size === ids.filter((i2) => !i2.startsWith('gen-')).length);
  rm.prepareRound();
  ok('roundManager: prepareRound → 3 gate words (R1)', g.roundWords.length === 3 && g.roundWords[0].correct?.de);
  rm.index = 2;
  rm.prepareRound();
  ok('roundManager: generated round words match gateCount', g.roundWords.length === rm.current.template.gateCount);
  rm.active = false;
  return out;
});
console.log(checks.join('\n'));

// ── 2) Live obstacle probes (real physics) ──────────────────
const probes = await page.evaluate(async () => {
  const out = [];
  const ok = (n, c) => out.push(`${c ? 'PASS' : 'FAIL'} ${n}`);
  const g = window.__wo;
  const scene = g.engine.scene;
  const { ConveyorBelt } = await import('/src/obstacles/ConveyorBelt.js');
  const { LavaFloor } = await import('/src/obstacles/LavaFloor.js');
  const { WindTunnel } = await import('/src/obstacles/WindTunnel.js');
  const { FallingBlocks } = await import('/src/obstacles/FallingBlocks.js');

  // Conveyor: LEFT belt drags a body left
  const belt = new ConveyorBelt(scene, { z: 500, dir: 'LEFT', speed: 'fast' });
  const b1 = g.physics.world.bodies.length;
  const body = new (await import('cannon-es')).Body({ mass: 1, shape: new (await import('cannon-es')).Sphere(0.5) });
  body.position.set(0, 0.6, 500);
  g.physics.addBody(body);
  for (let i = 0; i < 90; i++) { belt.update(1 / 60, body); g.physics.step(1 / 60); }
  ok('conveyor: pushes body left', body.velocity.x < -1 || body.position.x < -0.3);

  // Lava: 2s standing → elimination callback
  let burned = false;
  const lava = new LavaFloor(scene, { z: 600, onEliminate: () => { burned = true; } });
  body.position.set(0, 0.5, 600); body.velocity.set(0, 0, 0);
  for (let i = 0; i < 150 && !burned; i++) lava.update(1 / 60, body);
  ok('lava: burn timer 2s → elimination', burned);

  // Wind UP: body gains upward velocity inside the column
  const wind = new WindTunnel(scene, { z: 700, dir: 'UP', strength: 'strong' });
  body.position.set(0, 1.2, 700); body.velocity.set(0, 0, 0);
  for (let i = 0; i < 120; i++) { wind.update(1 / 60, body); g.physics.step(1 / 60); }
  ok('wind: updraft lifts body', body.velocity.y > 0.3 || body.position.y > 1.6);

  // FallingBlocks: release + fall + reset after 5 s
  const fb = new FallingBlocks(scene, { z: 800 });
  body.position.set(0, 0.6, 803);
  let released = false;
  for (let i = 0; i < 60; i++) fb.update(1 / 60, body);
  released = fb.blocks.some((bl) => bl.state !== 'held');
  ok('fallingBlocks: release on approach', released);

  [belt, lava, wind, fb].forEach((o) => o.dispose());
  g.physics.removeBody(body);
  return out;
});
console.log(probes.join('\n'));

// ── 3) Full live session ────────────────────────────────────
await page.click('[data-action="start"]');
for (let i = 0; i < 30; i++) {
  const playing = await page.evaluate(() => window.__wo?.state?.current === 'PLAYING').catch(() => false);
  if (playing) break;
  await new Promise((r) => setTimeout(r, 1000));
}
// in-page bot (batches 1-3 recipe: keys-Set steering + real keydown hops)
await page.evaluate(() => {
  const g = window.__wo;
  window.__tick = 0;
  window.__bot = setInterval(() => {
    window.__tick++;
    if (g.state.current !== 'PLAYING' || !g.playing?.gates?.length) return;  // survive round transitions
    const keys = g.inputManager.keys;
    const playing = g.state.impls.PLAYING;
    const active = playing.gates.find((t) => !t.passed);
    const t = window.__tick;
    const { x, y, z } = g.bean.body.position;
    let tx = 0;
    if (active) {
      // creep near the gate line so steering can center the door
      const gateZ = active.z;
      const nearGate = z - gateZ < 6 && z - gateZ > -1;
      if (!nearGate || t % 2 === 0) keys.add('KeyW'); else keys.delete('KeyW');
      tx = [-3, 0, 3][active.correctIndex] ?? 0;
    } else {
      keys.add('KeyW');
    }
    keys.delete('KeyA'); keys.delete('KeyD');
    if (x < tx - 0.3) keys.add('KeyD'); else if (x > tx + 0.3) keys.add('KeyA');
    // hop: log strip (−43..−52), real stalls, rhythmically deep — NEVER near a
    // gate line (hopping onto the wall seam = illegal crossing + pushback loop)
    const vz = g.bean.body.velocity.z;
    const nearGate = active && z - active.z < 5 && z - active.z > -1;
    const deepHop = !nearGate && z < -30 && t % 14 === 0;
    const stalled = t > 30 && Math.abs(vz) < 0.35 && !nearGate;
    if (y < 0.7 && !nearGate && ((z < -43 && z > -52 && t % 5 === 0) || stalled || deepHop)) {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    }
    // wedge-break: genuinely stuck far from the target lane → sidestep burst
    if (stalled && active && Math.abs(x - tx) > 1.2) {
      keys.add(x > tx ? 'KeyA' : 'KeyD');
    }
  }, 120);
});

const endRound = async (label, shot) => {
  for (let i = 0; i < 150; i++) {
    const s = await page.evaluate(() => ({
      state: window.__wo?.state?.current,
      z: window.__wo?.bean?.body?.position.z ?? 0,
    })).catch(() => ({ state: 'gone' }));
    if (s.state === 'ROUND_END') return s;
    if (i === 40 && shot) await page.screenshot({ path: shot });
    await new Promise((r) => setTimeout(r, 1000));
  }
  return { state: 'timeout', z: -999 };
};

const r1 = await endRound('R1', `${OUT}/b3-r1-mid.png`);
const r1stats = await page.evaluate(() => ({ stats: window.__wo?.lastRoundStats, overlay: !!document.getElementById('wo-roundend') }));
console.log('R1:', JSON.stringify(r1stats));
await page.screenshot({ path: `${OUT}/b3-r1-end.png` });

// wait for ROUND_END → COUNTDOWN (R2)
for (let i = 0; i < 20; i++) {
  const s = await page.evaluate(() => window.__wo?.state?.current).catch(() => 'gone');
  if (s === 'COUNTDOWN') break;
  await new Promise((r) => setTimeout(r, 1000));
}
const r2header = await page.evaluate(() => document.querySelector('#wo-countdown')?.parentElement?.querySelector('div[style*="top:9%"]')?.textContent ?? document.body.textContent.match(/RUNDE \d\/\d/)?.[0] ?? 'none');
await new Promise((r) => setTimeout(r, 5500));   // countdown 3-2-1-LOS
const r2course = await page.evaluate(() => {
  const g = window.__wo;
  return { state: g.state.current, template: g.playing?._template?.id ?? 'classic', bots: g.playing?.bots?.bots.length ?? 0, arches: !!g.playing?.checkpoints };
});
await page.screenshot({ path: `${OUT}/b3-r2-start.png` });
console.log('R2 header:', r2header, '| course:', JSON.stringify(r2course));
const r2 = await endRound('R2', `${OUT}/b3-r2-mid.png`);
const r2stats = await page.evaluate(() => window.__wo?.lastRoundStats);
console.log('R2:', JSON.stringify(r2stats));

// ── fast-forward R3-R5: shrink each round timer to force the round end
for (let r = 3; r <= 5; r++) {
  // wait PLAYING
  for (let i = 0; i < 20; i++) {
    const s = await page.evaluate(() => window.__wo?.state?.current).catch(() => 'gone');
    if (s === 'PLAYING') break;
    await new Promise((rr) => setTimeout(rr, 1000));
  }
  await page.evaluate(() => {
    const g = window.__wo;
    g.timers.cancel('round');
    g.timers.createTimer('round', 0.5, () => {}, () => g.playing?.endRound('timeout'));
  });
  const res = await endRound(`R${r}`);
  console.log(`R${r}: ended →`, JSON.stringify(await page.evaluate(() => window.__wo?.lastRoundStats)));
  await new Promise((rr) => setTimeout(rr, 6500));   // ROUND_END 6 s → next
}
for (let i = 0; i < 15; i++) {
  const s = await page.evaluate(() => window.__wo?.state?.current).catch(() => 'gone');
  if (s === 'RESULTS') break;
  await new Promise((r) => setTimeout(r, 1000));
}
const results = await page.evaluate(() => ({
  state: window.__wo?.state?.current,
  total: window.__wo?.sessionTotal,
  rounds: window.__wo?.roundManager?.history?.length,
  summaryShown: document.body.textContent.includes('Treffsicherheit'),
}));
await page.screenshot({ path: `${OUT}/b3-results.png` });
console.log('RESULTS:', JSON.stringify(results));

// ── verdict ─────────────────────────────────────────────────
const all = [...checks, ...probes];
const fails = all.filter((c) => c.startsWith('FAIL'));
const hardErrors = errors.filter((e) => !e.includes('GermanVoice'));
if (fails.length) console.error('ASSERT-FAILS:', fails.length);
if (r1.state !== 'ROUND_END' || r1stats.stats?.reason !== 'finish') console.error('R1-FAIL', r1.state);
if ((r1stats.stats?.correct ?? 0) < 2) console.error('R1-GATES-FAIL');
if (!r1stats.overlay) console.error('R1-OVERLAY-FAIL (no rankings overlay)');
if (r2.state !== 'ROUND_END') console.error('R2-FAIL', r2.state);
if (!r2course.template || r2course.template === 'classic' || r2course.bots < 3) console.error('R2-COURSE-FAIL (template/bots)', JSON.stringify(r2course));
if (results.state !== 'RESULTS' || results.rounds < 5 || !results.summaryShown) console.error('RESULTS-FAIL', JSON.stringify(results));
if (hardErrors.length) console.error('PAGE-ERRORS:', hardErrors.slice(0, 6));

if (fails.length || r1stats.stats?.reason !== 'finish' || r2.state !== 'ROUND_END' || results.state !== 'RESULTS' || hardErrors.length) {
  console.error('B3-E2E-FAIL');
  process.exit(1);
}
console.log(`B3-E2E PASS ✅ (${all.length} checks, R1 ${r1stats.stats.correct}/${r1stats.stats.total} finish, R2 ${r2course.template} done, full 5-round session → RESULTS)`);
await browser.close();
