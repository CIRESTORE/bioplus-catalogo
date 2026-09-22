const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const artifacts = path.join(root, 'artifacts');
fs.mkdirSync(artifacts, { recursive: true });
const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:4173';
const executablePath = process.env.CHROME_PATH || '/root/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
const assert = (condition, message) => { if (!condition) throw new Error(message); };

(async () => {
  const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
  const report = {};
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.waitForSelector('.product-card');

    report.title = await page.title();
    report.initialCards = await page.locator('.product-card').count();
    report.catalogCount = (await page.locator('#heroProductCount').innerText()).trim();
    report.categories = await page.locator('.category-chip').count();
    assert(report.title.includes('BIO PLUS'), 'El título no corresponde a BIO PLUS');
    assert(report.initialCards === 12, `Se esperaban 12 tarjetas iniciales, hay ${report.initialCards}`);
    assert(report.catalogCount === '26', `El conteo del catálogo debe ser 26, recibido ${report.catalogCount}`);
    assert(report.categories === 13, `Se esperaban 12 categorías y Todos, hay ${report.categories}`);

    const white = await page.locator('.product-image-button').first().evaluate(el => getComputedStyle(el).backgroundColor);
    report.productCanvas = white;
    assert(white === 'rgb(255, 255, 255)', `El fondo de producto no es blanco: ${white}`);

    await page.locator('#searchInput').fill('Clorofila');
    await page.waitForTimeout(300);
    assert(await page.locator('.product-card').count() === 1, 'La búsqueda de Clorofila debe devolver un producto');
    await page.locator('.quick-add').click();
    await page.locator('#cartTrigger').click();
    await page.waitForSelector('#cartDrawer.open');
    assert(await page.locator('.cart-item').count() === 1, 'El carrito no muestra el producto agregado');
    assert(!(await page.locator('#checkoutButton').isDisabled()), 'El pedido debe habilitarse con el WhatsApp oficial configurado');
    await page.screenshot({ path: path.join(artifacts, 'desktop-cart.png'), fullPage: false });
    await page.locator('#checkoutButton').click();
    await page.waitForSelector('#orderModal:not([hidden])');
    await page.locator('#customerName').fill('Cliente de prueba');
    await page.locator('#customerPhone').fill('3001234567');
    await page.locator('#customerDepartment').fill('Valle del Cauca');
    await page.locator('#customerCity').fill('Cali');
    await page.locator('#customerAddress').fill('Calle 1 # 2-3');
    await page.evaluate(() => { window.__openedUrl = ''; window.open = url => { window.__openedUrl = String(url); }; });
    await page.locator('#orderSubmit').click();
    const orderUrl = await page.evaluate(() => window.__openedUrl);
    assert(orderUrl.startsWith('https://wa.me/573013163588?text='), `El pedido no apunta al WhatsApp oficial: ${orderUrl}`);
    await page.locator('#orderClose').click();

    await page.locator('#searchInput').fill('');
    await page.waitForTimeout(250);
    await page.locator('.product-title-button').first().click();
    await page.waitForSelector('#productModal:not([hidden])');
    await page.screenshot({ path: path.join(artifacts, 'desktop-product.png'), fullPage: false });
    await page.locator('#modalClose').click();
    await page.screenshot({ path: path.join(artifacts, 'desktop-home.png'), fullPage: false });

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const mobileErrors = [];
    mobile.on('console', message => { if (message.type() === 'error') mobileErrors.push(message.text()); });
    mobile.on('pageerror', error => mobileErrors.push(error.message));
    await mobile.goto(baseUrl, { waitUntil: 'networkidle' });
    await mobile.waitForSelector('.product-card');
    report.mobileOverflow = await mobile.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    assert(!report.mobileOverflow, 'La vista móvil presenta desbordamiento horizontal');
    await mobile.screenshot({ path: path.join(artifacts, 'mobile-home.png'), fullPage: false });
    await mobile.locator('#productos').scrollIntoViewIfNeeded();
    await mobile.waitForTimeout(200);
    await mobile.screenshot({ path: path.join(artifacts, 'mobile-catalog.png'), fullPage: false });

    report.consoleErrors = [...errors, ...mobileErrors];
    assert(report.consoleErrors.length === 0, `Errores de consola: ${report.consoleErrors.join(' | ')}`);
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error.stack || error.message); process.exit(1); });
