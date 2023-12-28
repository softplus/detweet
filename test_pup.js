const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.goto('https://example.com');
  await page.screenshot({ path: 'data/example.png' });

  await browser.close();
})();
