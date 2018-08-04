const puppeteer = require('puppeteer');
if(!process.env.YOUDAO_ACCOUNT){
  console.log('请设置有道账户的环境变量：YOUDAO_ACCOUNT，用户名密码用英文分号隔开，如：username;password');
  return;
}
const youdaoAccount = process.env.YOUDAO_ACCOUNT.split(';');
const username = youdaoAccount[0];
const password = youdaoAccount[1];
function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
(async () => {
    const browser = await puppeteer.launch({
        headless: false,
        // executablePath: `C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe`,
        args: [
            `--window-size=1200,700`
        ],
    });
    // 登录
    const pages = await browser.pages();
    const page = pages[0];
    await page.setViewport({ width: 1200, height: 700 });
    await page.goto('http://dict.youdao.com/wordbook/wordlist');
    await page.bringToFront();
    await page.evaluate((a, b) => {
        document.querySelector('#username').value = a;
        document.querySelector('#password').value = b;
        document.querySelector('.login_btn').click();
    }, username, password);
    // 收集所有单词
    let totalWords = [];
    let nextPageNum = 2;
    await page.waitFor('.word');
    const words = await page.$$eval('.word', els => Array.from(els).map(el => el.textContent));
    totalWords = [...totalWords, ...words];
    do {
        await Promise.all([
            page.waitForNavigation(),
            page.$eval('.next-page', el => el.click()),
        ]);
        await page.waitFor('.word');
        const words = await page.$$eval('.word', els => Array.from(els).map(el => el.textContent));
        totalWords = [...totalWords, ...words];
        nextPageNum = await page.$$eval('.next-page', els => els.length);
    } while (nextPageNum === 2);
    totalWords = shuffle(totalWords);
    
    // 遍历每个单词
    for (let wordIndex = 0; wordIndex < totalWords.length; wordIndex++) {
        // 听读音
        const page2 = await browser.newPage();
        await page2.setViewport({ width: 1200, height: 700 });
        await page2.goto(`http://dict.youdao.com/search?q=${totalWords[wordIndex]}`);
        await page2.$$eval('.dictvoice', els => {
            els[0].click();
        });
        await page2.waitFor(3000);

        // 看图片
        const page3 = await browser.newPage();
        await page3.setViewport({ width: 1200, height: 700 });
        await page3.goto(`https://cn.bing.com/images/search?q=${totalWords[wordIndex]}&ensearch=1`);
        for (let i = 0; i < 10; i++) {
            await page3.keyboard.press('ArrowDown');
            await page3.waitFor(500);
        }

        await page2.close();
        await page3.close();
    }

    await browser.close();
})();

