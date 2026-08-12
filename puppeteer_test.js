import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  const requests = [];
  page.on('request', request => {
    if (request.url().includes('studio.genlayer.com')) {
      requests.push({ url: request.url(), method: request.method(), postData: request.postData() });
      console.log('[REQ]', request.method(), request.url(), request.postData());
    }
  });

  page.on('response', async response => {
    if (response.url().includes('studio.genlayer.com')) {
      console.log('[RES]', response.status(), response.url());
    }
  });
  
  page.on('console', msg => {
    console.log('[CONSOLE]', msg.text());
  });

  page.on('pageerror', err => {
    console.log('[PAGE ERROR]', err.toString());
  });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  
  console.log('Total requests to genlayer:', requests.length);
  await browser.close();
})();
