const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  // Search for an explanation of 1-2-3 bottom flaps
  await page.goto('https://www.google.com/search?q=FEFCO+0215+bottom+flaps+shape+svg+dieline');
  // Just print the text of the first few results
  const titles = await page.evaluate(() => Array.from(document.querySelectorAll('h3')).map(h => h.innerText));
  console.log(titles);
  await browser.close();
})();
