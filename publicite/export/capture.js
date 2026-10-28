const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/Users/gildas1er/.cache/puppeteer/chrome/mac-153.0.8010.36/chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing',
    headless: true,
    args: ['--no-sandbox','--disable-setuid-sandbox','--autoplay-policy=no-user-gesture-required','--force-device-scale-factor=1']
  });
  const page = await browser.newPage();
  await page.setViewport({width:1080,height:1920,deviceScaleFactor:1});
  await page.goto('file:///Users/gildas1er/Documents/GILDAS/AppMariage/mon-mariage/publicite/export/video-29s.html', {waitUntil:'load'});
  await page.evaluate(() => { const v = document.getElementById('vo'); v.currentTime = 0; return v.play().catch(()=>null); });
  const fs = require('fs');
  const dir = '/Users/gildas1er/Documents/GILDAS/AppMariage/mon-mariage/publicite/video/frames29';
  fs.mkdirSync(dir,{recursive:true});
  const total = 870; // 29*30
  for (let i=0;i<total;i++) {
    const t = i/30;
    await page.evaluate((tt)=>{ const v=document.getElementById('vo'); v.currentTime = tt; }, t);
    await page.waitForTimeout(16);
    await page.screenshot({path: dir+`/f${String(i).padStart(6,'0')}.png`, type:'png'});
    if (i%30===0) console.log(i);
  }
  await browser.close();
})();
