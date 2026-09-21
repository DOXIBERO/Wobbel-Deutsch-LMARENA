/**
 * E2E verification (real browser, SwiftShader):
 * 1. boot: console + 404 checks → menu screenshot
 * 2. in-browser data assertions (vocab/SRS/rules/FSM/events)
 * 3. full round: countdown → PLAYING → steer through 3 gates → ZIEL → ROUND_END → RESULTS
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
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });
page.on('response', (r) => { if (r.status() >= 400) errors.push(`HTTP ${r.status()}: ${r.url()}`); });

console.log('1) load…');
await page.goto('http://localhost:8022/', { waitUntil: 'networkidle2', timeout: 90000 });

// wait for the boot veil to disappear (auto BOOT→MENU after 1s of game time)
for (let i = 0; i < 60; i++) {
  const gone = await page.evaluate(() => !document.getElementById('boot-overlay')).catch(() => false);
  if (gone) break;
  await new Promise((r) => setTimeout(r, 1000));
}
await new Promise((r) => setTimeout(r, 2500));
const bootLog = await page.evaluate(() => window.__bootLog ?? null);
await page.screenshot({ path: `${OUT}/e1-menu.png` });
console.log('   📸 menu | boot marker:', bootLog);

console.log('2) data assertions…');
const checks = await page.evaluate(async () => {
  const out = [];
  const ok = (name, cond) => out.push(`${cond ? 'PASS' : 'FAIL'} ${name}`);

  const { VocabularyDB, VOCABULARY } = await import('/src/data/VocabularyDB.js');
  const db = new VocabularyDB();
  ok('vocab: 100 words', VOCABULARY.length === 100);
  ok('vocab: 100 unique ids', new Set(VOCABULARY.map((w) => w.id)).size === 100);
  ok('vocab: 15 categories', new Set(VOCABULARY.map((w) => w.category)).size === 15);
  ok('vocab: getByCategory(COLORS)=6', db.getByCategory('COLORS').length === 6);
  ok('vocab: getRandom(5) unique', new Set(db.getRandom(5).map((w) => w.id)).size === 5);

  const { SRSEngine } = await import('/src/data/SRSEngine.js');
  const srs = new SRSEngine();
  srs.recordAnswer('rot', 5, 1);
  ok('srs: q5 first → interval 2', srs.words.get('rot').interval === 2);
  srs.recordAnswer('rot', 5, 2);
  ok('srs: q5 second → interval 5', srs.words.get('rot').interval === 5);
  srs.recordAnswer('rot', 0, 3);
  ok('srs: q0 → interval 1, reps 0', srs.words.get('rot').interval === 1 && srs.words.get('rot').reps === 0);

  const { GameRules } = await import('/src/data/GameRules.js');
  ok('rules: correct streak3 = 200', GameRules.calcScore('correct', { streak: 3 }) === 200);
  ok('rules: correct streak5 = 300', GameRules.calcScore('correct', { streak: 5 }) === 300);
  ok('rules: wrong = -50', GameRules.calcScore('wrong') === -50);

  const { eventBus } = await import('/src/core/EventBus.js');
  let hit = 0;
  const off = eventBus.on('t:test', () => hit++);
  eventBus.emit('t:test'); off(); eventBus.emit('t:test');
  let onceHit = 0; eventBus.once('t:once', () => onceHit++);
  eventBus.emit('t:once'); eventBus.emit('t:once');
  ok('events: off() removes', hit === 1);
  ok('events: once fires 1×', onceHit === 1);

  const { ScoreManager } = await import('/src/core/ScoreManager.js');
  const sm = new ScoreManager();
  sm.addPoints('p', 'correct'); sm.addPoints('p', 'correct'); sm.addPoints('p', 'correct');
  ok('score: streak3 correct = 200', sm.getEntry('p').points === 100 + 100 + 200);
  ok('score: rank of solo = 1', sm.getPlayerRank('p') === 1);

  const { GameState } = await import('/src/core/GameState.js');
  const fsm = new GameState();
  fsm.register(Object.fromEntries(['BOOT', 'MENU', 'COUNTDOWN', 'PLAYING', 'ROUND_END', 'RESULTS']
    .map((k) => [k, { onEnter() {}, onUpdate() {}, onExit() {} }])));
  let threw = false;
  try { fsm.transition('PLAYING'); } catch { threw = true; }
  ok('fsm: BOOT→PLAYING throws', threw);
  fsm.transition('MENU');
  ok('fsm: BOOT→MENU ok', fsm.current === 'MENU');

  const { TimerSystem } = await import('/src/core/TimerSystem.js');
  const ts = new TimerSystem();
  let done = false, last = 99;
  ts.createTimer('t', 0.05, (r) => { last = r; }, () => { done = true; });
  for (let i = 0; i < 10; i++) ts.update(1 / 60);
  ok('timer: completes at 0', done && last === 0);

  return out;
});
console.log(checks.map((c) => '   ' + c).join('\n'));

console.log('3) play a round…');
await page.click('[data-action="start"]');
await new Promise((r) => setTimeout(r, 2000));
await page.screenshot({ path: `${OUT}/e2-countdown.png` });
console.log('   📸 countdown');

// wait for PLAYING (HUD visible)
for (let i = 0; i < 90; i++) {
  const playing = await page.evaluate(() => window.__wo?.state?.current === 'PLAYING').catch(() => false);
  if (playing) break;
  await new Promise((r) => setTimeout(r, 1000));
}
await new Promise((r) => setTimeout(r, 1200));
await page.screenshot({ path: `${OUT}/e3-playing.png` });
console.log('   📸 playing spawn');

// steer through the gates: hold W; correct lane X from __wo
const finished = await (async () => {
  // In-page bot (same recipe as b2-test): WASD via the polled keys Set,
  // hops via REAL keydown events (jump is event-driven → tryJump()).
  await page.evaluate(() => {
    const g = window.__wo;
    window.__tick = 0;
    window.__bot = setInterval(() => {
      window.__tick++;
      if (g.state.current !== 'PLAYING') { clearInterval(window.__bot); return; }
      const keys = g.inputManager.keys;
      const playing = g.state.impls.PLAYING;
      const active = playing.gates?.find((gt) => !gt.passed);
      const tx = [-3, 0, 3][active ? active.correctIndex : 1] ?? 0;
      const { x, y, z } = g.bean.body.position;
      const gateZ = active ? -15 - active.index * 15 : -999;
      const nearGate = active && z - gateZ < 6 && z - gateZ > -1;
      const t = window.__tick;
      if (!nearGate || t % 2 === 0) keys.add('KeyW'); else keys.delete('KeyW');
      keys.delete('KeyA'); keys.delete('KeyD');
      if (x < tx - 0.3) keys.add('KeyD'); else if (x > tx + 0.3) keys.add('KeyA');
      const needHop = (z < -43 && z > -52 && t % 5 === 0)
                   || (t > 30 && Math.abs(g.bean.body.velocity.z) < 0.4);
      if (y < 0.7 && needHop) window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    }, 120);
  });
  for (let i = 0; i < 120; i++) {
    const state = await page.evaluate(() => {
      const g = window.__wo;
      return { done: g.state.current === 'PLAYING' ? false : g.state.current };
    }).catch(() => ({ done: 'err' }));
    if (state.done) return state.done;
    if (i % 12 === 0) await page.screenshot({ path: `${OUT}/e4-run-${i}.png` });
    await new Promise((r) => setTimeout(r, 1000));
  }
  return 'timeout';
})();
console.log('   drive result:', finished);
await new Promise((r) => setTimeout(r, 1500));
await page.screenshot({ path: `${OUT}/e5-after.png` });

// where did we end up?
const final = await page.evaluate(() => ({
  state: window.__wo?.state?.current,
  stats: window.__wo?.lastRoundStats,
})).catch(() => ({}));
console.log('   final:', JSON.stringify(final));

console.log('4) errors during session:',
  errors.filter((e) => !e.includes('GermanVoice')).length
    ? errors.slice(0, 12) : 'NONE ✅ (GermanVoice headless noise only)');

// ── Verdict ──
const hardErrors = errors.filter((e) => !e.includes('GermanVoice'));
const fails = [];
if (finished !== 'ROUND_END') fails.push(`drive=${finished}`);
if (final?.stats?.reason !== 'finish') fails.push('no finish stat');
if ((final?.stats?.correct ?? 0) < 2) fails.push(`gates ${final?.stats?.correct}/${final?.stats?.total}`);
if (hardErrors.length) fails.push(`${hardErrors.length} page errors`);
if (fails.length) { console.error('E2E-FAIL:', fails.join(' | ')); process.exit(1); }
console.log(`E2E PASS: full round finished (${final.stats.correct}/${final.stats.total} gates, score ${final.stats.score}, rank ${final.stats.rank})`);
await browser.close();
