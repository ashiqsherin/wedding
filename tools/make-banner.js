/*  Renders tools/og-banner.html → assets/images/og-banner.jpg (1200 × 630).
 *
 *  This is the picture WhatsApp / Facebook / Telegram show when someone shares
 *  the link. Run it after editing og-banner.html:
 *
 *      node tools/make-banner.js
 *
 *  Needs Chrome and playwright-core:
 *      npm i -D playwright-core
 */
const { chromium } = require('playwright-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'assets', 'images', 'og-banner.jpg');
const PORT = 8123;

const TYPES = { '.html':'text/html', '.jpeg':'image/jpeg', '.jpg':'image/jpeg',
                '.png':'image/png', '.svg':'image/svg+xml', '.css':'text/css', '.js':'text/javascript' };

// Chrome must load the photo over http:// — file:// would be blocked by CORS.
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(buf);
  });
});

(async () => {
  await new Promise(r => server.listen(PORT, r));

  const browser = await chromium.launch({
    executablePath: process.env.CHROME || '/usr/bin/google-chrome-stable',
    args: ['--no-sandbox']
  });
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });

  await page.goto(`http://localhost:${PORT}/tools/og-banner.html`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);   // don't shoot before webfonts land
  await page.waitForTimeout(600);

  await page.screenshot({ path: OUT, type: 'jpeg', quality: 88 });

  await browser.close();
  server.close();

  const kb = (fs.statSync(OUT).size / 1024).toFixed(0);
  console.log(`wrote ${path.relative(ROOT, OUT)} — ${kb} KB`);
  if (kb > 300) console.warn('⚠  over 300 KB; WhatsApp may skip the preview. Lower `quality` above.');
})();
