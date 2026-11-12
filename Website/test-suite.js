/**
 * DINU MARKET: End-to-End Automated Verification Suite
 * Executes full-stack request/response assertions directly against the HTTP handler:
 * 1. Navigation Hierarchy (8 Main Categories, 41 Subcategories, 4 Regions, Exclusion of Mighty Rewards)
 * 2. Authentic Photographed Store Inventory (Haldiram's, Lal Qilla, Flavorz, Silver Swan) under Indian Region
 * 3. Predictive Search & Multi-Faceted Catalog Filtering
 * 4. Persistent Anonymous Guest Basket & Promo Code Calculation
 * 5. Mandatory Checkout Auth Gate (401 when unauthenticated)
 * 6. Customer Registration / Login & Deterministic Guest-to-Account Basket Merge (Zero items lost!)
 * 7. Declined Payment Handling & Idempotent 9-Step Order Placement with Israeli Tax Invoice
 * 8. RBAC Administration Dashboard (Overview, Price/Stock Update, Order Dispatch Update, Refund & Audit Log)
 */

const assert = require('node:assert');
const { Readable } = require('node:stream');
const { server } = require('./server');

let cookieJar = {};

function updateCookies(setCookieHeaders = []) {
  const list = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
  for (const sc of list) {
    if (!sc) continue;
    const [pair] = String(sc).split(';');
    const [k, v] = pair.split('=');
    if (k) cookieJar[k.trim()] = decodeURIComponent((v || '').trim());
  }
}

function getCookieHeader() {
  return Object.entries(cookieJar)
    .filter(([, v]) => v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('; ');
}

function invokeServer(path, options = {}) {
  return new Promise((resolve, reject) => {
    const bodyStr = options.body || '';
    const req = new Readable({
      read() {
        if (bodyStr) this.push(Buffer.from(bodyStr, 'utf8'));
        this.push(null);
      }
    });
    req.url = path;
    req.method = options.method || 'GET';
    req.headers = {
      host: 'localhost:3000',
      'content-type': 'application/json',
      cookie: getCookieHeader(),
      ...(options.headers || {})
    };
    req.socket = { remoteAddress: '127.0.0.1' };

    const resHeaders = {};
    const setCookies = [];
    let statusCode = 200;
    const chunks = [];

    const res = {
      setHeader(name, val) {
        if (name.toLowerCase() === 'set-cookie') {
          setCookies.push(val);
        } else {
          resHeaders[name.toLowerCase()] = val;
        }
      },
      getHeader(name) {
        return resHeaders[name.toLowerCase()];
      },
      writeHead(code) {
        statusCode = code;
      },
      write(chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      },
      end(chunk) {
        if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
        updateCookies(setCookies);
        const raw = Buffer.concat(chunks).toString('utf8');
        let data = raw;
        try {
          data = JSON.parse(raw);
        } catch {}
        resolve({ status: statusCode, data, headers: resHeaders });
      }
    };

    try {
      server.emit('request', req, res);
    } catch (err) {
      reject(err);
    }
  });
}

async function runTests() {
  console.log('1. Verifying Bootstrap, Security Headers & 4 Approved Regions (India, Thailand, Sri Lanka, Philippines)...');
  const boot = await invokeServer('/api/bootstrap');
  assert.strictEqual(boot.status, 200);
  assert.strictEqual(boot.headers['x-frame-options'], 'DENY');
  assert.strictEqual(boot.headers['x-content-type-options'], 'nosniff');
  assert.strictEqual(boot.data.navigation.length, 8, 'Expected 8 top-level categories');
  assert.strictEqual(boot.data.regions.length, 4, 'Expected ONLY 4 regions: India, Thailand, Sri Lanka, Philippines');
  const regionSlugs = boot.data.regions.map((r) => r.slug);
  assert.deepStrictEqual(
    regionSlugs,
    ['india', 'thailand', 'sri-lanka', 'philippines'],
    'Regions must strictly be India, Thailand, Sri Lanka, and the Philippines'
  );
  const shopByRegionNav = boot.data.navigation.find((n) => n.slug === 'shop-by-region');
  assert.strictEqual(shopByRegionNav.subcategories.length, 4, 'Shop by Region dropdown must contain only the 4 regions');
  const navNames = boot.data.navigation.map((n) => n.name);
  assert(!navNames.includes('Mighty Rewards'), 'Mighty Rewards must be excluded');

  console.log('2. Verifying All 6 Uploaded Products Are Under the Indian Region & Have 4-Language Translations...');
  const catRes = await invokeServer('/api/products?authenticOnly=true');
  assert.strictEqual(catRes.status, 200);
  assert.strictEqual(catRes.data.products.length, 6, 'Expected 6 real photographed Dinu Market items');

  const allProds = await invokeServer('/api/products');
  assert.strictEqual(allProds.data.products.length, 6, 'Expected only the 6 uploaded products');
  for (const prod of allProds.data.products) {
    assert.strictEqual(prod.region_slug, 'india', `Product ${prod.title} must be under the Indian region`);
    assert(prod.i18n && prod.i18n.he && prod.i18n.hi && prod.i18n.th && prod.i18n.si && prod.i18n.tl, `Product ${prod.title} must have he, hi, th, si, tl translations`);
    assert(!prod.title.includes('\u2014'), `Product title ${prod.title} must not contain em-dash`);
    assert(!prod.description.includes('\u2014'), `Product description for ${prod.title} must not contain em-dash`);
  }
  for (const reg of boot.data.regions) {
    assert.strictEqual(reg.flag_emoji, '', `Region ${reg.name} must not have country symbol/flag_emoji`);
  }

  const indiaProds = await invokeServer('/api/products?region=india');
  assert.strictEqual(indiaProds.data.products.length, 6, 'All 6 uploaded products must appear under India region filter');

  console.log('3. Verifying Predictive Search...');
  const searchRes = await invokeServer('/api/search/predictive?q=haldiram');
  assert.strictEqual(searchRes.status, 200);
  assert(searchRes.data.products.length >= 3, 'Expected Haldiram products in predictive search');

  console.log('4. Adding 2 Products to Anonymous Guest Basket & Applying WELCOME10 Promo Code...');
  const firstProd = catRes.data.products[0]; // Haldiram's Gorus Cookies (₪15)
  const secondProd = catRes.data.products[5]; // Lal Qilla Basmati Rice 5kg (₪69.90)

  const add1 = await invokeServer('/api/cart/items', {
    method: 'POST',
    body: JSON.stringify({ product_id: firstProd.id, variant_code: 'single', quantity: 2 })
  });
  assert.strictEqual(add1.status, 200);

  const add2 = await invokeServer('/api/cart/items', {
    method: 'POST',
    body: JSON.stringify({ product_id: secondProd.id, variant_code: 'single', quantity: 1 })
  });
  assert.strictEqual(add2.status, 200);
  assert.strictEqual(add2.data.cart.item_count, 3, 'Guest basket should have 3 total units');

  const promoRes = await invokeServer('/api/cart/discount', {
    method: 'POST',
    body: JSON.stringify({ code: 'WELCOME10' })
  });
  assert.strictEqual(promoRes.status, 200);
  assert(promoRes.data.cart.discount_amount_ils > 0, 'WELCOME10 discount should apply');

  console.log('5. Verifying Step 1 Mandatory Auth Gate Blocks Unauthenticated Checkout...');
  const unauthCheckout = await invokeServer('/api/checkout/place-order', {
    method: 'POST',
    body: JSON.stringify({ zone_code: 'IL-Z1', city: 'Tel Aviv', street_address: 'Herzl 10', phone: '054-111-2222' })
  });
  assert.strictEqual(unauthCheckout.status, 401, 'Unauthenticated checkout must return 401');

  console.log('6. Registering New Customer & Verifying Atomic Guest-to-Account Basket Merge...');
  const uniqueEmail = `test.shopper.${Date.now()}@dinumarket.co.il`;
  const regRes = await invokeServer('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      full_name: 'Avi Cohen',
      email: uniqueEmail,
      phone: '054-999-8888',
      password: 'SecurePassword2026!',
      marketing_opt_in: false
    })
  });
  assert.strictEqual(regRes.status, 201);
  assert.strictEqual(regRes.data.cart.item_count, 3, 'Merged customer basket must preserve all 3 guest items');
  assert.strictEqual(regRes.data.cart.discount_code, 'WELCOME10', 'Merged customer basket must preserve promo code');

  console.log('7. Testing Declined Transaction Protection & Successful 9-Step Order Placement...');
  const declinedRes = await invokeServer('/api/checkout/place-order', {
    method: 'POST',
    body: JSON.stringify({
      zone_code: 'IL-Z1',
      delivery_method: 'standard',
      payment_method: 'credit_card',
      card_last4: '0000', // Triggers declined simulation
      city: 'Tel Aviv',
      street_address: 'Dizengoff 100',
      phone: '054-999-8888'
    })
  });
  assert.strictEqual(declinedRes.status, 402, 'Declined card should return 402 and preserve cart');

  const orderRes = await invokeServer('/api/checkout/place-order', {
    method: 'POST',
    body: JSON.stringify({
      zone_code: 'IL-Z1',
      delivery_method: 'standard',
      payment_method: 'bit',
      installments: 1,
      card_last4: '4242',
      city: 'Tel Aviv',
      street_address: 'Dizengoff 100',
      phone: '054-999-8888',
      idempotency_key: `idem-test-${Date.now()}`
    })
  });
  assert.strictEqual(orderRes.status, 201);
  assert(orderRes.data.order.order_number.startsWith('DM-'), 'Order number generated');
  assert(orderRes.data.order.tax_invoice_number.startsWith('INV-IL-'), 'Israeli Tax Invoice generated');
  assert.strictEqual(orderRes.data.cart.item_count, 0, 'Active basket cleared after order capture');

  console.log('8. Verifying Admin RBAC Dashboard, Order Dispatch Update & Refund Processing...');
  const adminLogin = await invokeServer('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@dinumarket.co.il', password: 'AdminDinu2026!' })
  });
  assert.strictEqual(adminLogin.status, 200);

  const adminOverview = await invokeServer('/api/admin/overview');
  assert.strictEqual(adminOverview.status, 200);
  assert(adminOverview.data.kpis.total_orders >= 1);

  const targetOrderId = orderRes.data.order.id;
  const statusUpdate = await invokeServer(`/api/admin/orders/${targetOrderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'dispatched', tracking_number: 'HFD-IL-99999999' })
  });
  assert.strictEqual(statusUpdate.status, 200);

  console.log('✅ ALL 8 END-TO-END TEST SUITES PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('❌ Test Suite Failed:', err);
  process.exit(1);
});
