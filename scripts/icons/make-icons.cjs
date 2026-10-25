// Genera icone e schermate di avvio Android da public/icon.svg (npm run icons).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const RES = path.join(ROOT, 'android/app/src/main/res');
const svg = fs.readFileSync(path.join(ROOT, 'public/icon.svg'), 'utf8');
const inner = svg.replace(/<rect[^>]*\/>/, ''); // senza fondo, per l'icona adattiva
const sizeOf = (f) => { const b = fs.readFileSync(f); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const render = async (html, w, h, out) => {
    await p.setViewportSize({ width: w, height: h });
    await p.setContent(`<html><body style="margin:0;width:${w}px;height:${h}px;overflow:hidden">${html}</body></html>`);
    await p.screenshot({ path: out, omitBackground: true });
  };
  for (const dir of fs.readdirSync(RES)) {
    for (const f of fs.readdirSync(path.join(RES, dir))) {
      const file = path.join(RES, dir, f);
      if (!f.endsWith('.png')) continue;
      const [w, h] = sizeOf(file);
      const img = (s, src) => `<img src="data:image/svg+xml;base64,${Buffer.from(src).toString('base64')}" style="width:${s}px;height:${s}px;display:block">`;
      if (f === 'ic_launcher.png') await render(img(w, svg), w, h, file);
      else if (f === 'ic_launcher_round.png') await render(`<div style="width:${w}px;height:${h}px;border-radius:50%;overflow:hidden">${img(w, svg)}</div>`, w, h, file);
      else if (f === 'ic_launcher_foreground.png') await render(`<div style="width:${w}px;height:${h}px;display:grid;place-items:center">${img(Math.round(w * 0.62), inner)}</div>`, w, h, file);
      else if (f === 'splash.png') { const s = Math.round(Math.min(w, h) * 0.4); await render(`<div style="width:${w}px;height:${h}px;background:#1f2a33;display:grid;place-items:center">${img(s, svg)}</div>`, w, h, file); }
    }
  }
  fs.writeFileSync(path.join(RES, 'values/ic_launcher_background.xml'), '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#1F2A33</color>\n</resources>\n');
  await b.close();
  console.log('icone generate');
})();
