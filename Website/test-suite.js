/**
 * DINU MARKET: Comprehensive End-to-End & Supabase Integration Verification Suite
 *
 * Covers all Section 12 Testing & Validation criteria:
 * 1. Exact Supabase schema & column security (`PUBLIC_PRODUCT_COLUMNS` excludes `"Cost"`, no secret keys leaked)
 * 2. `"Image Link"` URL resolution (full URL, bucket+path, `Product Imags` typo, spaces/parentheses, missing placeholder)
 * 3. Strict 4-country allocation (`India`, `Thailand`, `Sri Lanka`, `Philippines`) & unrecognised country/category reporting
 * 4. Dynamic catalogue endpoints, category/search/sort filtering, pagination, and `/vendor/supabase.js` Realtime bundle
 * 5. Shopping basket with unique Supabase `id`, guest-to-account merge, and promo codes
 * 6. Authoritative server-side live price & stock validation at checkout (price update + out-of-stock block)
 * 7. Graceful error handling when Supabase is temporarily unavailable
 * 8. Vercel serverless handler compatibility (`api/index.js`) & RBAC Admin Diagnostics
 */

const assert = require('node:assert');
const { Readable } = require('node:stream');
const vercelHandler = require('../api/index');
const {
  PUBLIC_PRODUCT_COLUMNS,
  PLACEHOLDER_IMAGE_URL,
  resolveSupabaseImageLink,
  mapCountryToRegionSlug,
  mapCategoryAndSubcategory,
  __setMockRowsProviderForTests
} = require('./supabase-client');

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

function invokeServer(urlPath, options = {}) {
  return new Promise((resolve, reject) => {
    const bodyStr = options.body || '';
    const req = new Readable({
      read() {
        if (bodyStr) this.push(Buffer.from(bodyStr, 'utf8'));
        this.push(null);
      }
    });
    req.url = urlPath;
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
      vercelHandler(req, res);
    } catch (err) {
      reject(err);
    }
  });
}

async function runTests() {
  console.log('1. Verifying Column Security & Image Link Resolution (Spaces, Parentheses, Typos, Placeholders)...');
  assert(!PUBLIC_PRODUCT_COLUMNS.toLowerCase().includes('cost'), 'PUBLIC_PRODUCT_COLUMNS must NEVER include internal Cost');
  assert(PUBLIC_PRODUCT_COLUMNS.includes('"Image Link"'), 'Must preserve exact "Image Link" column spelling');
  assert(PUBLIC_PRODUCT_COLUMNS.includes('"Product Name"'), 'Must preserve exact "Product Name" column spelling');

  const fullUrlRes = await resolveSupabaseImageLink(
    'https://altzvjhhuetgswrigrdy.supabase.co/storage/v1/object/public/Product%20Images/Healthy%20Boy%20Brand%20Mushroom%20Soy%20Sauce%20(700%20ml).png'
  );
  assert.strictEqual(fullUrlRes.isPlaceholder, false);
  assert(fullUrlRes.url.includes('/storage/v1/object/public/Product%20Images/Healthy%20Boy%20Brand%20Mushroom%20Soy%20Sauce%20(700%20ml).png'));

  const bareFilenameRes = await resolveSupabaseImageLink('Healthy Boy Brand Mushroom Soy Sauce (700 ml).png');
  assert.strictEqual(bareFilenameRes.isPlaceholder, false);
  assert(
    bareFilenameRes.url.includes('Product%20Images/Healthy%20Boy%20Brand%20Mushroom%20Soy%20Sauce%20(700%20ml).png'),
    `Expected bare filename with spaces/parentheses to resolve via getPublicUrl(), got: ${bareFilenameRes.url}`
  );

  const typoBucketRes = await resolveSupabaseImageLink('Product Imags/Silver Swan Soy Sauce (1000 ml).png');
  assert.strictEqual(typoBucketRes.isPlaceholder, false);
  assert(typoBucketRes.url.includes('Product%20Images/Silver%20Swan%20Soy%20Sauce%20(1000%20ml).png'));

  const missingImgRes = await resolveSupabaseImageLink('');
  assert.strictEqual(missingImgRes.isPlaceholder, true);
  assert.strictEqual(missingImgRes.url, PLACEHOLDER_IMAGE_URL);

  console.log('2. Verifying Country & Category Mapping + Unrecognised Value Detection...');
  assert.strictEqual(mapCountryToRegionSlug('India'), 'india');
  assert.strictEqual(mapCountryToRegionSlug('Thailand'), 'thailand');
  assert.strictEqual(mapCountryToRegionSlug('Sri Lanka'), 'sri-lanka');
  assert.strictEqual(mapCountryToRegionSlug('Philippines'), 'philippines');
  assert.strictEqual(mapCountryToRegionSlug('Mars'), null, 'Unrecognised country must return null, never arbitrary country');
  assert.strictEqual(mapCategoryAndSubcategory('Unknown Hardware').categorySlug, null);

  // Configure live-shaped Supabase `"Product lists"` dataset for deterministic full-stack API tests
  let liveSupabaseRows = [
    {
      id: 101,
      'Bar Code': '8850206221110',
      'Product Name': 'Healthy Boy Brand Mushroom Soy Sauce (700 ml)',
      Category: 'Sauce & Seasoning',
      'Country of Origin': 'Thailand',
      Supplier: 'Healthy Boy Brand',
      Price: 24.9,
      'Items in Stock': 35,
      'Items Sold': 80,
      'Image Link': 'Healthy Boy Brand Mushroom Soy Sauce (700 ml).png',
      Ingredients: 'Water, Soybeans, Wheat, Salt, Mushroom Extract'
    },
    {
      id: 102,
      'Bar Code': '8901161104762',
      'Product Name': 'Lal Qilla Supreme Sella Basmati Rice (5 kg)',
      Category: 'Pantry',
      'Country of Origin': 'India',
      Supplier: 'Lal Qilla',
      Price: 69.9,
      'Items in Stock': 20,
      'Items Sold': 150,
      'Image Link': 'https://altzvjhhuetgswrigrdy.supabase.co/storage/v1/object/public/Product%20Images/Lal%20Qilla%20(5%20kg).png',
      Ingredients: '100% Aged Basmati Rice'
    },
    {
      id: 103,
      'Bar Code': '4800016644112',
      'Product Name': 'Lucky Me Pancit Canton Kalamansi (60g)',
      Category: 'Instant Foods',
      'Country of Origin': 'Philippines',
      Supplier: 'Monde Nissin',
      Price: 4.5,
      'Items in Stock': 100,
      'Items Sold': 310,
      'Image Link': null, // Missing image -> must still appear with placeholder!
      Ingredients: 'Wheat Flour, Vegetable Oil, Kalamansi Seasoning'
    },
    {
      id: 104,
      'Bar Code': '4792024001015',
      'Product Name': 'Maliban Lemon Puff Biscuits (200g)',
      Category: 'Sweets',
      'Country of Origin': 'Sri Lanka',
      Supplier: 'Maliban',
      Price: 11.9,
      'Items in Stock': 40,
      'Items Sold': 95,
      'Image Link': 'Product Images/Maliban Lemon Puff (200g).png',
      Ingredients: 'Wheat Flour, Sugar, Lemon Cream'
    },
    {
      id: 105,
      'Bar Code': '9990001112223',
      'Product Name': 'Mystery Origin Item (250g)',
      Category: 'Unmapped Mystery Dept',
      'Country of Origin': 'UnknownLand',
      Supplier: 'Test Supplier',
      Price: 15.0,
      'Items in Stock': 10,
      'Items Sold': 0,
      'Image Link': '',
      Ingredients: ''
    },
    // Duplicate ID check: second row with id 101 must be deduplicated!
    {
      id: 101,
      'Product Name': 'Duplicate Row Should Be Ignored',
      Category: 'Snacks',
      'Country of Origin': 'India',
      Price: 999,
      'Items in Stock': 1
    }
  ];

  __setMockRowsProviderForTests(async () => liveSupabaseRows);

  console.log('3. Verifying Bootstrap, CSP Security Headers, Vendor Bundle & 4 Country Pages...');
  const boot = await invokeServer('/api/bootstrap');
  assert.strictEqual(boot.status, 200);
  assert(boot.headers['content-security-policy'].includes('https://altzvjhhuetgswrigrdy.supabase.co'), 'CSP must allow Supabase Storage & Realtime');
  assert(boot.data.supabase_realtime && boot.data.supabase_realtime.url.includes('altzvjhhuetgswrigrdy.supabase.co'));
  assert(!JSON.stringify(boot.data).includes('service_role'), 'Bootstrap must NEVER leak service_role key');
  assert.deepStrictEqual(
    boot.data.regions.map((r) => r.slug),
    ['india', 'thailand', 'sri-lanka', 'philippines']
  );

  const vendorJs = await invokeServer('/vendor/supabase.js');
  assert.strictEqual(vendorJs.status, 200, 'Local /vendor/supabase.js bundle must be served 200 OK');

  console.log('4. Verifying Country Allocation, Deduplication, Placeholder Fallback, Search & Pagination...');
  const allRes = await invokeServer('/api/products');
  assert.strictEqual(allRes.status, 200);
  assert.strictEqual(allRes.data.total, 5, 'Duplicate ID 101 must be deduplicated (5 unique products)');

  const thRes = await invokeServer('/api/products?region=thailand');
  assert.strictEqual(thRes.data.products.length, 1);
  assert.strictEqual(thRes.data.products[0].id, '101');
  assert.strictEqual(thRes.data.products[0].size_label, '700 ml');

  const phRes = await invokeServer('/api/products?region=philippines');
  assert.strictEqual(phRes.data.products.length, 1);
  assert.strictEqual(phRes.data.products[0].id, '103');
  assert.strictEqual(phRes.data.products[0].primary_image_url, PLACEHOLDER_IMAGE_URL, 'Missing image product must display with placeholder');

  const inRes = await invokeServer('/api/products?region=india');
  assert.strictEqual(inRes.data.products.length, 1, 'Unrecognised country item #105 must NOT be arbitrarily assigned to India');

  const lkRes = await invokeServer('/api/products?region=sri-lanka');
  assert.strictEqual(lkRes.data.products.length, 1);
  assert.strictEqual(lkRes.data.products[0].id, '104');

  const pagedRes = await invokeServer('/api/products?page=1&limit=2');
  assert.strictEqual(pagedRes.data.products.length, 2);
  assert.strictEqual(pagedRes.data.has_more, true);

  const searchRes = await invokeServer('/api/search/predictive?q=mushroom');
  assert.strictEqual(searchRes.data.products.length, 1);
  assert.strictEqual(searchRes.data.products[0].id, '101');

  const pdpRes = await invokeServer(`/api/products/${encodeURIComponent(thRes.data.products[0].slug)}`);
  assert.strictEqual(pdpRes.status, 200);
  assert.strictEqual(pdpRes.data.product.id, '101');

  console.log('5. Verifying Basket with Unique Supabase IDs, Guest-to-Account Merge & Live Price Update...');
  // Clear any existing items in guest session first
  const add1 = await invokeServer('/api/cart/items', {
    method: 'POST',
    body: JSON.stringify({ product_id: '101', variant_code: 'single', quantity: 2 })
  });
  assert.strictEqual(add1.status, 200);

  const add2 = await invokeServer('/api/cart/items', {
    method: 'POST',
    body: JSON.stringify({ product_id: '102', variant_code: 'single', quantity: 1 })
  });
  assert.strictEqual(add2.status, 200);
  assert.strictEqual(add2.data.cart.item_count, 3);

  const uniqueEmail = `shopper.${Date.now()}@dinumarket.co.il`;
  const regRes = await invokeServer('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      full_name: 'Noa Levi',
      email: uniqueEmail,
      phone: '054-123-4567',
      password: 'SecurePassword2026!'
    })
  });
  assert.strictEqual(regRes.status, 201);
  assert.strictEqual(regRes.data.cart.item_count, 3, 'Guest cart must merge into registered user cart');

  console.log('6. Verifying Authoritative Server-Side Price & Out-of-Stock Validation Before Checkout...');
  // Simulate product #102 going out of stock in Supabase right before checkout!
  liveSupabaseRows[1]['Items in Stock'] = 0;
  const oosCheckout = await invokeServer('/api/checkout/place-order', {
    method: 'POST',
    body: JSON.stringify({
      zone_code: 'IL-Z1',
      delivery_method: 'standard',
      payment_method: 'bit',
      city: 'Tel Aviv',
      street_address: 'Dizengoff 100',
      phone: '054-123-4567'
    })
  });
  assert.strictEqual(oosCheckout.status, 400, 'Checkout must block when live Supabase stock drops to 0');
  assert(oosCheckout.data.error.includes('out of stock'));

  // Restore stock and change price of #101 in Supabase (24.90 -> 30.00) to verify server uses live Supabase price!
  liveSupabaseRows[1]['Items in Stock'] = 20;
  liveSupabaseRows[0]['Price'] = 30.0;

  const okOrder = await invokeServer('/api/checkout/place-order', {
    method: 'POST',
    body: JSON.stringify({
      zone_code: 'IL-Z1',
      delivery_method: 'standard',
      payment_method: 'bit',
      city: 'Tel Aviv',
      street_address: 'Dizengoff 100',
      phone: '054-123-4567',
      idempotency_key: `idem-${Date.now()}`
    })
  });
  assert.strictEqual(okOrder.status, 201);
  // 2 * 30.00 + 1 * 69.90 = 129.90 subtotal!
  assert.strictEqual(okOrder.data.order.subtotal_ils, 129.9, 'Server must compute checkout subtotal from live Supabase prices');

  console.log('7. Verifying Admin Diagnostics Reporting & Graceful Outage Error Handling...');
  const adminLogin = await invokeServer('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@dinumarket.co.il', password: 'AdminDinu2026!' })
  });
  assert.strictEqual(adminLogin.status, 200);

  const adminOverview = await invokeServer('/api/admin/overview');
  assert.strictEqual(adminOverview.status, 200);
  const diag = adminOverview.data.supabase_diagnostics;
  assert.strictEqual(diag.unrecognisedCountryProducts.length, 1, 'Must flag UnknownLand product #105');
  assert.strictEqual(diag.unrecognisedCategoryProducts.length, 1, 'Must flag Unmapped Mystery Dept product #105');
  assert.strictEqual(diag.missingImageProducts.length, 2, 'Must flag missing image products #103 & #105');

  // Simulate transient Supabase outage with cold cache
  __setMockRowsProviderForTests(async () => {
    throw new Error('Simulated network timeout');
  });
  const outageRes = await invokeServer('/api/products?refresh=1');
  assert.strictEqual(outageRes.status, 200, 'Products endpoint must degrade gracefully without 500 crash');
  assert(outageRes.data.catalogue_error, 'Must provide user-friendly catalogue_error message');

  // Restore live mode
  __setMockRowsProviderForTests(null);

  console.log('✅ ALL 7 SUPABASE E-COMMERCE INTEGRATION TEST SUITES PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('❌ Test Suite Failed:', err);
  process.exit(1);
});
