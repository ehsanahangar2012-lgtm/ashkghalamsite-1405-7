const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('https://en.wikipedia.org/wiki/Box'); // Just to test
  console.log("Puppeteer works");
  await browser.close();
})();
