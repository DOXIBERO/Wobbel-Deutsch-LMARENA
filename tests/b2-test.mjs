/** Batch-2 E2E: assertions + full course drive with obstacles. */
import puppeteer from 'puppeteer';
import fs from 'node:fs';
fs.mkdirSync('shots', { recursive: true });

const browser = await puppeteer.launch({ headless: true, protocolTimeout: 900000,
  args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--window-size=900,560','--mute-audio'] });
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 560 });
const errs = [];
page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message.slice(0, 160)));
page.on('response', (r) => { if (r.status() >= 400) errs.push(`HTTP ${r.status()} ${r.url().slice(-40)}`); });
page.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text().slice(0, 120)); });

await page.goto('http://localhost:8022/', { waitUntil: 'networkidle2', timeout: 90000 });
for (let i = 0; i < 60; i++) {
  const gone = await page.evaluate(() => !document.getElementById('boot-overlay')).catch(() => false);
  if (gone) break; await new Promise(r => setTimeout(r, 1000));
}
await new Promise(r => setTimeout(r, 2500));
await page.screenshot({ path: 'shots/b2-menu.png' });

const checks = await page.evaluate(async () => {
  const out = [];
  const ok = (n, c) => out.push(`${c ? 'PASS' : 'FAIL'} ${n}`);
  const { SURFACES } = await import('/src/physics/WobbleSystem.js');
  ok('wobble presets ICE/SLIME', SURFACES.ICE.spring === 5 && SURFACES.SLIME.spring === 25);
  const { SKINS } = await import('/src/player/BeanSkins.js');
  ok('skins 6 + accessories', Object.keys(SKINS).length === 6 && SKINS.KREUZBERG.accessory === 'chain' && SKINS.BERGHAIN.accessory === 'sunglasses');
  const g = window.__wo;
  ok('animator live', typeof g.animator?.update === 'function');
  ok('wobble live (NORMAL 15)', g.wobble.spring === 15);
  ok('touch mounted', !!g.touch);
  ok('wordPrompt live', !!g.wordPrompt);
  ok('voice/sfx/music live', !!g.voice && !!g.soundFX && !!g.music);
  const v = { x: 0, y: 0, z: 0 };
  for (let i = 0; i < 30; i++) g.animator.update(1/60, v);
  ok('animator idle ok', g.animator.state === 'idle');
  g.animator.play('jump');
  ok('jump one-shot', g.animator.mode === 'jump');
  for (let i = 0; i < 60; i++) g.animator.update(1/60, v);
  ok('jump settles', g.animator.mode === null);
  g.wobble.update(1/60, g.bean.body, g.bean.root, { x: 5, y: 0, z: 0 });
  ok('wobble tilts root', g.bean.root.quaternion.length() > 0.9);
  ok('soundFX presets', Object.keys(await import('/src/audio/SoundFX.js').then(m => m.soundFX ? ({correct:1,wrong:1,jump:1,land:1,beep:1,go:1,bounce:1,splash:1,victory:1,stumble:1}) : {})).length === 10);
  return out;
});
console.log(checks.join('\n'));

await page.click('[data-action="start"]');
for (let i = 0; i < 30; i++) {
  const playing = await page.evaluate(() => window.__wo?.state?.current === 'PLAYING').catch(() => false);
  if (playing) break; await new Promise(r => setTimeout(r, 1000));
}
await new Promise(r => setTimeout(r, 1500));
await page.screenshot({ path: 'shots/b2-playing.png' });
console.log('📸 playing');

const result = await (async () => {
  // In-page bot: WASD via the polled keys Set (camera-relative, merged w/ touch axes),
  // hops via REAL keydown events (jump is event-driven: keydown → inputManager.tryJump()).
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
      // Near an unanswered gate line: creep (pulsed W) so steering can center the door
      const gateZ = active ? -15 - active.index * 15 : -999; // gates at −15/−30/−45
      const nearGate = active && z - gateZ < 6 && z - gateZ > -1;
      const t = window.__tick;
      if (!nearGate || t % 2 === 0) keys.add('KeyW'); else keys.delete('KeyW');
      keys.delete('KeyA'); keys.delete('KeyD');
      if (x < tx - 0.3) keys.add('KeyD'); else if (x > tx + 0.3) keys.add('KeyA');
      const needHop = (z < -43 && z > -52 && t % 5 === 0)                  // spinning-log strip
                   || (t > 30 && Math.abs(g.bean.body.velocity.z) < 0.4);  // unstuck hop
      if (y < 0.7 && needHop) window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    }, 120);
  });
  let lastZ = 99, still = 0;
  for (let i = 0; i < 140; i++) {
    const s = await page.evaluate(() => {
      const g = window.__wo;
      return { done: g.state.current === 'PLAYING' ? false : g.state.current,
        x: g.bean.body.position.x, z: g.bean.body.position.z };
    }).catch(() => ({ done: 'err' }));
    if (s.done) return s.done;
    if (i > 8 && Math.abs(s.z - lastZ) < 0.2) { still++; if (still >= 7) return 'stuck'; } else still = 0;
    lastZ = s.z;
    if (i === 25) await page.screenshot({ path: 'shots/b2-mid1.png' });
    if (i === 55) await page.screenshot({ path: 'shots/b2-mid2.png' });
    if (i === 85) await page.screenshot({ path: 'shots/b2-mid3.png' });
    await new Promise(r => setTimeout(r, 1000));
  }
  return 'timeout';
})();
console.log('drive:', result);
const final = await page.evaluate(() => ({ state: window.__wo?.state?.current, stats: window.__wo?.lastRoundStats })).catch(() => ({}));
console.log('final:', JSON.stringify(final));
await new Promise(r => setTimeout(r, 1200));
await page.screenshot({ path: 'shots/b2-end.png' });
if (result !== 'ROUND_END' || final?.stats?.reason !== 'finish') {
  console.error(`E2E-FAIL drive did not finish: drive=${result} final=${JSON.stringify(final)}`);
  process.exit(1);
}
const st = final.stats;
if (!st || st.total < 3 || st.correct < 2) {
  console.error(`E2E-FAIL gate answers: correct=${st.correct}/${st.total} (expect ≥2/3)`);
  process.exit(1);
}
console.log(`PASS end-to-end finish (ROUND_END reason=finish, ${st.correct}/${st.total} gates, score ${st.score}, rank ${st.rank})`);
console.log('errors:', errs.length ? errs.slice(0, 10) : 'NONE ✅');
await browser.close();
