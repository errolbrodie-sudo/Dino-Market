/**
 * DINU MARKET: Full-Stack E-Commerce HTTP & REST API Server
 * Benchmark: Mighty Depot (Excluding Mighty Rewards)
 * Brand Identity: Dinu Market Official Design System
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const {
  db,
  NAVIGATION_SPEC,
  REGIONS_SPEC,
  mergeGuestCartIntoUserCart,
  getHydratedCart
} = require('./db');

const {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  parseCookies,
  serializeCookie,
  checkRateLimit,
  checkLoginLockout,
  recordFailedLogin,
  clearLoginLockout,
  applySecurityHeaders,
  sanitizeText
} = require('./security');

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function sendJson(res, statusCode, payload, extraHeaders = []) {
  applySecurityHeaders(res);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  for (const [k, v] of extraHeaders) {
    res.setHeader(k, v);
  }
  res.writeHead(statusCode);
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 2 * 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

function getSessionContext(req) {
  const cookies = parseCookies(req.headers.cookie);
  let user = null;
  if (cookies.dinu_auth_token) {
    const decoded = verifyToken(cookies.dinu_auth_token);
    if (decoded && decoded.userId) {
      const row = db.prepare(
        'SELECT id, email, full_name, phone, role, email_verified, marketing_opt_in, is_suspended, created_at FROM users WHERE id = ?'
      ).get(decoded.userId);
      if (row && !row.is_suspended) {
        user = row;
      }
    }
  }

  let sessionToken = cookies.dinu_cart_token;
  let needsCartCookie = false;
  if (!sessionToken || sessionToken.length < 10) {
    sessionToken = crypto.randomUUID();
    needsCartCookie = true;
  }

  return { user, sessionToken, needsCartCookie };
}

function formatProductRow(row) {
  if (!row) return null;
  const weightRatio = row.net_weight_grams > 0 ? 100 / row.net_weight_grams : 1;
  const pricePer100 = Number((row.price_ils * weightRatio).toFixed(2));
  const discountPercent =
    row.compare_at_price_ils && row.compare_at_price_ils > row.price_ils
      ? Math.round(((row.compare_at_price_ils - row.price_ils) / row.compare_at_price_ils) * 100)
      : 0;

  return {
    ...row,
    allergens: JSON.parse(row.allergens_json || '[]'),
    dietary_tags: JSON.parse(row.dietary_tags_json || '[]'),
    red_labels: JSON.parse(row.red_labels_json || '[]'),
    nutrition: JSON.parse(row.nutrition_json || '{}'),
    variants: JSON.parse(row.variants_json || '[]'),
    i18n: JSON.parse(row.i18n_json || '{}'),
    price_per_100_ils: pricePer100,
    discount_percent: discountPercent,
    in_stock: row.stock_quantity > 0,
    low_stock: row.stock_quantity > 0 && row.stock_quantity <= row.low_stock_threshold
  };
}

function logAdminAction(actorEmail, action, entityType, entityId, details = '') {
  db.prepare(`
    INSERT INTO admin_audit_logs (id, actor_email, action, entity_type, entity_id, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(crypto.randomUUID(), actorEmail, action, entityType, String(entityId), details, new Date().toISOString());
}

/**
 * Generates a high-contrast custom branded SVG illustration for catalog items
 */
function renderProductIllustrationSvg(slug) {
  const product = db.prepare('SELECT * FROM products WHERE slug = ?').get(slug);
  const region = product
    ? db.prepare('SELECT * FROM regions WHERE slug = ?').get(product.region_slug)
    : null;

  const paletteMap = {
    sweets: { bg1: '#8D191C', bg2: '#5B0F12', accent: '#CCA732' },
    snacks: { bg1: '#FC9538', bg2: '#C86412', accent: '#14542E' },
    pantry: { bg1: '#14542E', bg2: '#0B331B', accent: '#CCA732' },
    drinks: { bg1: '#1F7C45', bg2: '#114A28', accent: '#FC9538' },
    'canned-jarred-goods': { bg1: '#2B9E59', bg2: '#14542E', accent: '#CCA732' },
    'sauce-seasoning': { bg1: '#7A1C1E', bg2: '#3D0B0C', accent: '#FC9538' },
    'instant-foods': { bg1: '#B8332A', bg2: '#681510', accent: '#CCA732' }
  };

  const colors = (product && paletteMap[product.category_slug]) || {
    bg1: '#14542E',
    bg2: '#0D381E',
    accent: '#CCA732'
  };

  const brand = sanitizeText(product ? product.vendor_brand : 'DINU MARKET', 28);
  const title = sanitizeText(product ? product.title : 'Specialty Grocery', 60);
  const line1 = title.slice(0, 26);
  const line2 = title.slice(26, 54);
  const weight = product ? `${product.net_weight_grams}${product.unit_measure_type === '100ml' ? 'ml' : 'g'}` : '250g';
  const flag = region ? `${region.flag_emoji} ${region.name.toUpperCase()}` : '🌏 IMPORTED';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#F7F5EC"/>
      <stop offset="100%" stop-color="#EAE4CE"/>
    </linearGradient>
    <linearGradient id="pack" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${colors.bg1}"/>
      <stop offset="100%" stop-color="${colors.bg2}"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="14" stdDeviation="16" flood-color="#000000" flood-opacity="0.18"/>
    </filter>
  </defs>
  <rect width="600" height="600" fill="url(#bg)"/>
  <circle cx="300" cy="300" r="230" fill="${colors.accent}" fill-opacity="0.12" stroke="${colors.accent}" stroke-width="2" stroke-dasharray="8 6"/>
  <g filter="url(#shadow)">
    <rect x="135" y="75" width="330" height="450" rx="26" fill="url(#pack)" stroke="${colors.accent}" stroke-width="5"/>
    <rect x="155" y="95" width="290" height="410" rx="18" fill="none" stroke="#FFFFFF" stroke-opacity="0.22" stroke-width="2"/>
    <rect x="180" y="120" width="240" height="38" rx="19" fill="${colors.accent}"/>
    <text x="300" y="145" text-anchor="middle" font-family="Montserrat, Arial, sans-serif" font-size="16" font-weight="800" fill="#14542E">${brand.toUpperCase()}</text>
    <rect x="165" y="185" width="270" height="175" rx="16" fill="#FFFFFF" fill-opacity="0.96"/>
    <text x="300" y="235" text-anchor="middle" font-family="Montserrat, Arial, sans-serif" font-size="21" font-weight="800" fill="#14542E">${line1}</text>
    <text x="300" y="268" text-anchor="middle" font-family="Montserrat, Arial, sans-serif" font-size="18" font-weight="700" fill="#202020">${line2}</text>
    <text x="300" y="312" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#8D191C">${product ? sanitizeText(product.title_he, 34) : ''}</text>
    <rect x="215" y="330" width="170" height="22" rx="11" fill="#F7F5EC"/>
    <text x="300" y="346" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="12" font-weight="700" fill="#14542E">${flag}</text>
    <circle cx="300" cy="425" r="36" fill="${colors.accent}"/>
    <text x="300" y="421" text-anchor="middle" font-family="Montserrat, Arial, sans-serif" font-size="11" font-weight="700" fill="#14542E">NET WT</text>
    <text x="300" y="439" text-anchor="middle" font-family="Montserrat, Arial, sans-serif" font-size="16" font-weight="800" fill="#14542E">${weight}</text>
    <text x="300" y="490" text-anchor="middle" font-family="Montserrat, Arial, sans-serif" font-size="12" font-weight="700" fill="#FFFFFF" letter-spacing="2">DINU MARKET AUTHENTIC</text>
  </g>
</svg>`;
}

const server = http.createServer(async (req, res) => {
  try {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = decodeURIComponent(parsedUrl.pathname);
    const method = req.method.toUpperCase();
    const clientIp = req.socket.remoteAddress || '127.0.0.1';

    // Rate limiting check for API mutations
    if (pathname.startsWith('/api/') && method !== 'GET') {
      const rl = checkRateLimit(`${clientIp}:${pathname}`, 45, 60000);
      if (!rl.allowed) {
        return sendJson(res, 429, { error: 'Too many requests. Please wait a moment and try again.' });
      }
    }

    // Dynamic SVG Product Illustration Route
    if (method === 'GET' && pathname.startsWith('/api/product-illustration/') && pathname.endsWith('.svg')) {
      const slug = pathname.replace('/api/product-illustration/', '').replace('.svg', '');
      const svg = renderProductIllustrationSvg(slug);
      applySecurityHeaders(res);
      res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.writeHead(200);
      return res.end(svg);
    }

    const { user, sessionToken, needsCartCookie } = getSessionContext(req);
    const cookieHeaders = [];
    if (needsCartCookie) {
      cookieHeaders.push([
        'Set-Cookie',
        serializeCookie('dinu_cart_token', sessionToken, { maxAge: 86400 * 30, httpOnly: true, sameSite: 'Lax' })
      ]);
    }

    // =========================================================================
    // 1. BOOTSTRAP ENDPOINT (Navigation, Regions, Banners, User, Persistent Cart)
    // =========================================================================
    if (method === 'GET' && pathname === '/api/bootstrap') {
      const regions = db.prepare('SELECT * FROM regions WHERE is_active = 1 ORDER BY display_order ASC').all();
      const allCategories = db.prepare('SELECT * FROM categories WHERE is_active = 1 ORDER BY display_order ASC').all();

      const navTree = allCategories
        .filter((c) => !c.parent_slug)
        .map((parent) => {
          if (parent.slug === 'shop-by-region') {
            return {
              ...parent,
              menu_type: 'mega_region',
              subcategories: regions.map((r) => ({
                name: r.name,
                name_he: r.name_he,
                slug: r.slug,
                flag_emoji: r.flag_emoji,
                iso_code: r.iso_code,
                is_region: true
              }))
            };
          }
          return {
            ...parent,
            menu_type: 'dropdown',
            subcategories: allCategories.filter((sub) => sub.parent_slug === parent.slug)
          };
        });

      const banners = db.prepare('SELECT * FROM promotional_banners WHERE is_active = 1 ORDER BY display_order ASC').all();
      const shippingZones = db.prepare('SELECT * FROM shipping_zones WHERE is_active = 1 ORDER BY zone_code ASC').all();
      const paymentSettingRow = db.prepare("SELECT value_json FROM store_settings WHERE key = 'payment_config'").get();
      const paymentConfig = paymentSettingRow ? JSON.parse(paymentSettingRow.value_json) : {};

      const zoneCode = parsedUrl.searchParams.get('zone') || 'IL-Z1';
      const deliveryMethod = parsedUrl.searchParams.get('deliveryMethod') || 'standard';
      const cart = getHydratedCart({ userId: user ? user.id : null, sessionToken, zoneCode, deliveryMethod });

      return sendJson(
        res,
        200,
        {
          brand: 'Dinu Market',
          excluded_features: ['Mighty Rewards'],
          navigation: navTree,
          regions,
          banners,
          shipping_zones: shippingZones,
          payment_config: paymentConfig,
          user,
          cart
        },
        cookieHeaders
      );
    }

    // =========================================================================
    // 2. PREDICTIVE SEARCH ENDPOINT
    // =========================================================================
    if (method === 'GET' && pathname === '/api/search/predictive') {
      const q = sanitizeText(parsedUrl.searchParams.get('q') || '', 80).toLowerCase();
      if (q.length < 2) {
        return sendJson(res, 200, { products: [], categories: [], regions: [] }, cookieHeaders);
      }
      const likeParam = `%${q}%`;
      const matchingProducts = db.prepare(`
        SELECT * FROM products
        WHERE is_active = 1 AND (
          LOWER(title) LIKE ? OR LOWER(title_he) LIKE ? OR LOWER(vendor_brand) LIKE ?
          OR LOWER(category_slug) LIKE ? OR LOWER(subcategory_slug) LIKE ? OR LOWER(region_slug) LIKE ?
          OR LOWER(short_description) LIKE ?
        )
        ORDER BY is_authentic_photo DESC, is_featured DESC, sales_count DESC
        LIMIT 6
      `).all(likeParam, likeParam, likeParam, likeParam, likeParam, likeParam, likeParam).map(formatProductRow);

      const matchingCategories = db.prepare(`
        SELECT * FROM categories
        WHERE is_active = 1 AND (LOWER(name) LIKE ? OR LOWER(name_he) LIKE ? OR LOWER(slug) LIKE ?)
        LIMIT 4
      `).all(likeParam, likeParam, likeParam);

      const matchingRegions = db.prepare(`
        SELECT * FROM regions
        WHERE is_active = 1 AND (LOWER(name) LIKE ? OR LOWER(name_he) LIKE ? OR LOWER(slug) LIKE ?)
        LIMIT 4
      `).all(likeParam, likeParam, likeParam);

      return sendJson(res, 200, {
        query: q,
        products: matchingProducts,
        categories: matchingCategories,
        regions: matchingRegions
      }, cookieHeaders);
    }

    // =========================================================================
    // 3. PRODUCT CATALOG & FILTERING ENDPOINT
    // =========================================================================
    if (method === 'GET' && pathname === '/api/products') {
      const category = parsedUrl.searchParams.get('category') || '';
      const subcategory = parsedUrl.searchParams.get('subcategory') || '';
      const region = parsedUrl.searchParams.get('region') || '';
      const q = (parsedUrl.searchParams.get('q') || '').trim().toLowerCase();
      const vendor = parsedUrl.searchParams.get('vendor') || '';
      const dietary = parsedUrl.searchParams.get('dietary') || '';
      const inStockOnly = parsedUrl.searchParams.get('inStock') === 'true';
      const onSaleOnly = parsedUrl.searchParams.get('onSale') === 'true';
      const authenticOnly = parsedUrl.searchParams.get('authenticOnly') === 'true';
      const minPrice = Number(parsedUrl.searchParams.get('minPrice') || 0);
      const maxPrice = Number(parsedUrl.searchParams.get('maxPrice') || 99999);
      const sort = parsedUrl.searchParams.get('sort') || 'featured';

      let rows = db.prepare('SELECT * FROM products WHERE is_active = 1').all().map(formatProductRow);

      if (category && category !== 'all' && category !== 'shop-by-region') {
        rows = rows.filter((p) => p.category_slug === category);
      }
      if (subcategory) {
        rows = rows.filter((p) => p.subcategory_slug === subcategory);
      }
      if (region) {
        rows = rows.filter((p) => p.region_slug === region);
      }
      if (vendor) {
        rows = rows.filter((p) => p.vendor_brand.toLowerCase() === vendor.toLowerCase());
      }
      if (dietary) {
        rows = rows.filter((p) => p.dietary_tags.some((t) => t.toLowerCase().includes(dietary.toLowerCase())));
      }
      if (inStockOnly) {
        rows = rows.filter((p) => p.stock_quantity > 0);
      }
      if (onSaleOnly) {
        rows = rows.filter((p) => p.compare_at_price_ils && p.compare_at_price_ils > p.price_ils);
      }
      if (authenticOnly) {
        rows = rows.filter((p) => p.is_authentic_photo === 1);
      }
      if (q) {
        rows = rows.filter(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            (p.title_he && p.title_he.includes(q)) ||
            p.vendor_brand.toLowerCase().includes(q) ||
            p.short_description.toLowerCase().includes(q) ||
            p.category_slug.toLowerCase().includes(q) ||
            p.subcategory_slug.toLowerCase().includes(q) ||
            p.region_slug.toLowerCase().includes(q) ||
            (p.barcode_ean && p.barcode_ean.includes(q))
        );
      }
      rows = rows.filter((p) => p.price_ils >= minPrice && p.price_ils <= maxPrice);

      // Sorting
      rows.sort((a, b) => {
        if (sort === 'price-asc') return a.price_ils - b.price_ils;
        if (sort === 'price-desc') return b.price_ils - a.price_ils;
        if (sort === 'best-selling') return b.sales_count - a.sales_count;
        if (sort === 'rating-desc') return b.rating_average - a.rating_average;
        if (sort === 'title-asc') return a.title.localeCompare(b.title);
        // Default: featured & authentic store photos first
        if (b.is_authentic_photo !== a.is_authentic_photo) return b.is_authentic_photo - a.is_authentic_photo;
        if (b.is_featured !== a.is_featured) return b.is_featured - a.is_featured;
        return b.sales_count - a.sales_count;
      });

      const allVendors = [...new Set(db.prepare('SELECT vendor_brand FROM products WHERE is_active = 1').all().map((r) => r.vendor_brand))].sort();

      return sendJson(res, 200, {
        total: rows.length,
        products: rows,
        facets: {
          vendors: allVendors
        }
      }, cookieHeaders);
    }

    // =========================================================================
    // 4. PRODUCT DETAIL PAGE (PDP) & REVIEWS ENDPOINTS
    // =========================================================================
    if (pathname.startsWith('/api/products/')) {
      const rest = pathname.replace('/api/products/', '');
      const parts = rest.split('/');
      const slug = parts[0];

      if (method === 'GET' && parts.length === 1) {
        const row = db.prepare('SELECT * FROM products WHERE slug = ? AND is_active = 1').get(slug);
        if (!row) return sendJson(res, 404, { error: 'Product not found' });

        const product = formatProductRow(row);
        const reviews = db.prepare('SELECT * FROM product_reviews WHERE product_id = ? ORDER BY created_at DESC').all(product.id);
        const related = db.prepare(`
          SELECT * FROM products
          WHERE is_active = 1 AND id != ? AND (category_slug = ? OR region_slug = ?)
          ORDER BY is_authentic_photo DESC, sales_count DESC
          LIMIT 4
        `).all(product.id, product.category_slug, product.region_slug).map(formatProductRow);

        const regionObj = db.prepare('SELECT * FROM regions WHERE slug = ?').get(product.region_slug);
        const categoryObj = db.prepare('SELECT * FROM categories WHERE slug = ?').get(product.category_slug);
        const subcategoryObj = db.prepare('SELECT * FROM categories WHERE slug = ?').get(product.subcategory_slug);

        return sendJson(res, 200, {
          product,
          region: regionObj,
          category: categoryObj,
          subcategory: subcategoryObj,
          reviews,
          related_products: related
        }, cookieHeaders);
      }

      if (method === 'POST' && parts[1] === 'reviews') {
        if (!user) {
          return sendJson(res, 401, { error: 'Please sign in to submit a verified product review.' });
        }
        const row = db.prepare('SELECT * FROM products WHERE slug = ?').get(slug);
        if (!row) return sendJson(res, 404, { error: 'Product not found' });

        const body = await readJsonBody(req);
        const rating = Math.min(5, Math.max(1, Number(body.rating || 5)));
        const title = sanitizeText(body.title || 'Great product!', 120);
        const reviewBody = sanitizeText(body.body || '', 1000);
        if (!reviewBody) {
          return sendJson(res, 400, { error: 'Please enter a review comment.' });
        }

        const hasPurchased = db.prepare('SELECT COUNT(*) AS cnt FROM orders WHERE user_id = ?').get(user.id).cnt > 0;

        db.prepare(`
          INSERT INTO product_reviews (id, product_id, user_id, author_name, rating, title, body, is_verified_purchase, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          crypto.randomUUID(),
          row.id,
          user.id,
          user.full_name,
          rating,
          title,
          reviewBody,
          hasPurchased ? 1 : 0,
          new Date().toISOString()
        );

        const stats = db.prepare('SELECT AVG(rating) AS avg_r, COUNT(*) AS cnt FROM product_reviews WHERE product_id = ?').get(row.id);
        db.prepare('UPDATE products SET rating_average = ?, rating_count = ? WHERE id = ?').run(
          Number((stats.avg_r || 5).toFixed(2)),
          stats.cnt,
          row.id
        );

        const updatedReviews = db.prepare('SELECT * FROM product_reviews WHERE product_id = ? ORDER BY created_at DESC').all(row.id);
        return sendJson(res, 201, { reviews: updatedReviews, rating_average: Number((stats.avg_r || 5).toFixed(2)), rating_count: stats.cnt });
      }
    }

    // =========================================================================
    // 5. PERSISTENT SHOPPING BASKET (CART) ENDPOINTS
    // =========================================================================
    if (pathname === '/api/cart' && method === 'GET') {
      const zoneCode = parsedUrl.searchParams.get('zone') || 'IL-Z1';
      const deliveryMethod = parsedUrl.searchParams.get('deliveryMethod') || 'standard';
      const cart = getHydratedCart({ userId: user ? user.id : null, sessionToken, zoneCode, deliveryMethod });
      return sendJson(res, 200, { cart }, cookieHeaders);
    }

    if (pathname === '/api/cart/items' && method === 'POST') {
      const body = await readJsonBody(req);
      const productId = sanitizeText(body.product_id, 64);
      const variantCode = sanitizeText(body.variant_code || 'single', 32);
      const quantity = Math.min(99, Math.max(1, parseInt(body.quantity || 1, 10)));

      const product = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1').get(productId);
      if (!product) return sendJson(res, 404, { error: 'Product not found' });
      if (product.stock_quantity <= 0) {
        return sendJson(res, 400, { error: 'This item is currently out of stock.' });
      }

      const variants = JSON.parse(product.variants_json || '[]');
      const selectedVariant = variants.find((v) => v.code === variantCode) || {
        code: 'single',
        label: 'Single Pack (1x)',
        multiplier: 1.0
      };

      const baseCart = getHydratedCart({ userId: user ? user.id : null, sessionToken });
      const now = new Date().toISOString();

      const existing = db.prepare(
        'SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ? AND variant_code = ?'
      ).get(baseCart.cart_id, productId, selectedVariant.code);

      if (existing) {
        const nextQty = Math.min(existing.quantity + quantity, product.stock_quantity, 99);
        db.prepare('UPDATE cart_items SET quantity = ?, updated_at = ? WHERE id = ?').run(nextQty, now, existing.id);
      } else {
        const nextQty = Math.min(quantity, product.stock_quantity, 99);
        db.prepare(`
          INSERT INTO cart_items (id, cart_id, product_id, variant_code, variant_label, price_multiplier, quantity, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          crypto.randomUUID(),
          baseCart.cart_id,
          productId,
          selectedVariant.code,
          selectedVariant.label,
          selectedVariant.multiplier,
          nextQty,
          now
        );
      }

      const updatedCart = getHydratedCart({ userId: user ? user.id : null, sessionToken });
      return sendJson(res, 200, { message: `Added ${product.title} to your basket`, cart: updatedCart }, cookieHeaders);
    }

    if (pathname.startsWith('/api/cart/items/') && (method === 'PATCH' || method === 'DELETE')) {
      const itemId = pathname.replace('/api/cart/items/', '');
      const baseCart = getHydratedCart({ userId: user ? user.id : null, sessionToken });

      if (method === 'DELETE') {
        db.prepare('DELETE FROM cart_items WHERE id = ? AND cart_id = ?').run(itemId, baseCart.cart_id);
      } else {
        const body = await readJsonBody(req);
        const nextQty = parseInt(body.quantity, 10);
        if (isNaN(nextQty) || nextQty <= 0) {
          db.prepare('DELETE FROM cart_items WHERE id = ? AND cart_id = ?').run(itemId, baseCart.cart_id);
        } else {
          const itemRow = db.prepare('SELECT * FROM cart_items WHERE id = ? AND cart_id = ?').get(itemId, baseCart.cart_id);
          if (itemRow) {
            const prod = db.prepare('SELECT stock_quantity FROM products WHERE id = ?').get(itemRow.product_id);
            const capped = Math.min(nextQty, prod ? prod.stock_quantity : 99, 99);
            db.prepare('UPDATE cart_items SET quantity = ?, updated_at = ? WHERE id = ?').run(capped, new Date().toISOString(), itemId);
          }
        }
      }

      const updatedCart = getHydratedCart({ userId: user ? user.id : null, sessionToken });
      return sendJson(res, 200, { cart: updatedCart }, cookieHeaders);
    }

    if (pathname === '/api/cart/discount' && method === 'POST') {
      const body = await readJsonBody(req);
      const code = sanitizeText(body.code || '', 32).toUpperCase();
      const baseCart = getHydratedCart({ userId: user ? user.id : null, sessionToken });

      if (!code) {
        db.prepare('UPDATE carts SET discount_code = NULL WHERE id = ?').run(baseCart.cart_id);
        const updatedCart = getHydratedCart({ userId: user ? user.id : null, sessionToken });
        return sendJson(res, 200, { message: 'Discount code removed.', cart: updatedCart });
      }

      const disc = db.prepare('SELECT * FROM discounts WHERE UPPER(code) = ? AND is_active = 1').get(code);
      if (!disc) {
        return sendJson(res, 400, { error: `Promo code "${code}" is invalid or expired. Try WELCOME10, DINU25, or FREESHIP.` });
      }
      if (baseCart.subtotal_ils < disc.min_order_ils) {
        return sendJson(res, 400, {
          error: `Promo code "${disc.code}" requires a minimum basket subtotal of ₪${disc.min_order_ils.toFixed(2)}.`
        });
      }

      db.prepare('UPDATE carts SET discount_code = ? WHERE id = ?').run(disc.code, baseCart.cart_id);
      const updatedCart = getHydratedCart({ userId: user ? user.id : null, sessionToken });
      return sendJson(res, 200, { message: `Applied promo code ${disc.code}: ${disc.description}`, cart: updatedCart });
    }

    // =========================================================================
    // 6. CUSTOMER REGISTRATION, AUTHENTICATION & AUTOMATIC BASKET MERGE
    // =========================================================================
    if (pathname === '/api/auth/register' && method === 'POST') {
      const body = await readJsonBody(req);
      const email = sanitizeText(body.email || '', 120).toLowerCase();
      const fullName = sanitizeText(body.full_name || '', 100);
      const phone = sanitizeText(body.phone || '', 30);
      const password = String(body.password || '');
      const marketingOptIn = body.marketing_opt_in === true ? 1 : 0;

      if (!email || !email.includes('@') || !fullName) {
        return sendJson(res, 400, { error: 'Please provide your full name and a valid email address.' });
      }
      if (password.length < 8) {
        return sendJson(res, 400, { error: 'Password must be at least 8 characters long.' });
      }

      const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(email);
      if (existing) {
        return sendJson(res, 409, { error: 'An account with this email already exists. Please sign in.' });
      }

      const userId = crypto.randomUUID();
      const verificationCode = String(Math.floor(100000 + Math.random() * 900000));
      const now = new Date().toISOString();

      db.prepare(`
        INSERT INTO users (id, email, password_hash, full_name, phone, role, email_verified, verification_code, marketing_opt_in, created_at)
        VALUES (?, ?, ?, ?, ?, 'customer', 1, ?, ?, ?)
      `).run(userId, email, hashPassword(password), fullName, phone, verificationCode, marketingOptIn, now);

      // CRITICAL REQUIREMENT: Merge anonymous guest basket into the newly registered customer's persistent account!
      mergeGuestCartIntoUserCart(sessionToken, userId);

      const authToken = signToken({ userId, role: 'customer' });
      const newUser = db.prepare('SELECT id, email, full_name, phone, role, email_verified, marketing_opt_in, created_at FROM users WHERE id = ?').get(userId);
      const mergedCart = getHydratedCart({ userId, sessionToken });

      return sendJson(
        res,
        201,
        {
          message: 'Account created and your shopping basket has been synchronized!',
          verification_code_demo: verificationCode,
          user: newUser,
          cart: mergedCart
        },
        [
          ...cookieHeaders,
          ['Set-Cookie', serializeCookie('dinu_auth_token', authToken, { maxAge: 86400 * 14, httpOnly: true, sameSite: 'Lax' })]
        ]
      );
    }

    if (pathname === '/api/auth/login' && method === 'POST') {
      const body = await readJsonBody(req);
      const email = sanitizeText(body.email || '', 120).toLowerCase();
      const password = String(body.password || '');

      const lockout = checkLoginLockout(email || clientIp);
      if (lockout.locked) {
        return sendJson(res, 429, {
          error: `Account temporarily locked due to multiple failed login attempts. Try again in ${lockout.remainingSeconds} seconds.`
        });
      }

      const userRow = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(email);
      if (!userRow || !verifyPassword(password, userRow.password_hash)) {
        recordFailedLogin(email || clientIp);
        return sendJson(res, 401, { error: 'Invalid email or password.' });
      }
      if (userRow.is_suspended) {
        return sendJson(res, 403, { error: 'This account has been suspended. Please contact Support@DinuMarket.co.il.' });
      }

      clearLoginLockout(email || clientIp);

      // CRITICAL REQUIREMENT: Atomically merge guest basket into customer's persistent account basket!
      mergeGuestCartIntoUserCart(sessionToken, userRow.id);

      const authToken = signToken({ userId: userRow.id, role: userRow.role });
      const mergedCart = getHydratedCart({ userId: userRow.id, sessionToken });

      return sendJson(
        res,
        200,
        {
          message: `Welcome back, ${userRow.full_name}! Your shopping basket is synchronized.`,
          user: {
            id: userRow.id,
            email: userRow.email,
            full_name: userRow.full_name,
            phone: userRow.phone,
            role: userRow.role,
            email_verified: userRow.email_verified,
            marketing_opt_in: userRow.marketing_opt_in
          },
          cart: mergedCart
        },
        [
          ...cookieHeaders,
          ['Set-Cookie', serializeCookie('dinu_auth_token', authToken, { maxAge: 86400 * 14, httpOnly: true, sameSite: 'Lax' })]
        ]
      );
    }

    if (pathname === '/api/auth/logout' && method === 'POST') {
      const freshGuestToken = crypto.randomUUID();
      const emptyGuestCart = getHydratedCart({ userId: null, sessionToken: freshGuestToken });
      return sendJson(
        res,
        200,
        {
          message: 'You have been signed out. Your account basket remains safely saved for your next visit.',
          user: null,
          cart: emptyGuestCart
        },
        [
          ['Set-Cookie', serializeCookie('dinu_auth_token', '', { maxAge: 0, httpOnly: true, sameSite: 'Lax' })],
          ['Set-Cookie', serializeCookie('dinu_cart_token', freshGuestToken, { maxAge: 86400 * 30, httpOnly: true, sameSite: 'Lax' })]
        ]
      );
    }

    if (pathname === '/api/auth/forgot-password' && method === 'POST') {
      const body = await readJsonBody(req);
      const email = sanitizeText(body.email || '', 120).toLowerCase();
      const userRow = db.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(email);
      let demoResetCode = null;
      if (userRow) {
        demoResetCode = String(Math.floor(100000 + Math.random() * 900000));
        db.prepare('UPDATE users SET reset_token = ?, reset_expires_at = ? WHERE id = ?').run(
          demoResetCode,
          Date.now() + 15 * 60 * 1000,
          userRow.id
        );
      }
      return sendJson(res, 200, {
        message: 'If an account matches that email, a 6-digit password reset code has been dispatched (valid for 15 minutes).',
        reset_code_demo: demoResetCode
      });
    }

    if (pathname === '/api/auth/reset-password' && method === 'POST') {
      const body = await readJsonBody(req);
      const email = sanitizeText(body.email || '', 120).toLowerCase();
      const resetCode = sanitizeText(body.reset_code || '', 20);
      const newPassword = String(body.new_password || '');
      if (newPassword.length < 8) {
        return sendJson(res, 400, { error: 'New password must be at least 8 characters long.' });
      }
      const userRow = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(email);
      if (!userRow || !userRow.reset_token || userRow.reset_token !== resetCode || Date.now() > (userRow.reset_expires_at || 0)) {
        return sendJson(res, 400, { error: 'Invalid or expired password reset code.' });
      }
      db.prepare('UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires_at = NULL WHERE id = ?').run(
        hashPassword(newPassword),
        userRow.id
      );
      return sendJson(res, 200, { message: 'Your password has been updated. You can now sign in.' });
    }

    // =========================================================================
    // 7. CUSTOMER ACCOUNT PORTAL (Profile, Addresses, Order History & Tracking)
    // =========================================================================
    if (pathname === '/api/account' && method === 'GET') {
      if (!user) return sendJson(res, 401, { error: 'Authentication required' });
      const addresses = db.prepare('SELECT * FROM customer_addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC').all(user.id);
      const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(user.id).map((o) => ({
        ...o,
        shipping_address: JSON.parse(o.shipping_address_json || '{}'),
        items: JSON.parse(o.items_json || '[]'),
        tracking_history: JSON.parse(o.tracking_history_json || '[]')
      }));
      return sendJson(res, 200, { user, addresses, orders }, cookieHeaders);
    }

    if (pathname === '/api/account/profile' && method === 'PATCH') {
      if (!user) return sendJson(res, 401, { error: 'Authentication required' });
      const body = await readJsonBody(req);
      const fullName = sanitizeText(body.full_name || user.full_name, 100);
      const phone = sanitizeText(body.phone || user.phone, 30);
      const marketingOptIn = body.marketing_opt_in ? 1 : 0;

      db.prepare('UPDATE users SET full_name = ?, phone = ?, marketing_opt_in = ? WHERE id = ?').run(
        fullName,
        phone,
        marketingOptIn,
        user.id
      );

      if (body.new_password) {
        if (String(body.new_password).length < 8) {
          return sendJson(res, 400, { error: 'New password must be at least 8 characters.' });
        }
        db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(body.new_password), user.id);
      }

      const updatedUser = db.prepare('SELECT id, email, full_name, phone, role, email_verified, marketing_opt_in, created_at FROM users WHERE id = ?').get(user.id);
      return sendJson(res, 200, { message: 'Profile updated successfully.', user: updatedUser });
    }

    if (pathname === '/api/account/addresses' && method === 'POST') {
      if (!user) return sendJson(res, 401, { error: 'Authentication required' });
      const body = await readJsonBody(req);
      const label = sanitizeText(body.label || 'Home', 40);
      const recipientName = sanitizeText(body.recipient_name || user.full_name, 100);
      const phone = sanitizeText(body.phone || user.phone, 30);
      const city = sanitizeText(body.city || '', 80);
      const zoneCode = sanitizeText(body.zone_code || 'IL-Z1', 16);
      const streetAddress = sanitizeText(body.street_address || '', 150);
      const apartmentFloor = sanitizeText(body.apartment_floor || '', 80);
      const entranceCode = sanitizeText(body.entrance_code || '', 30);
      const postalCode = sanitizeText(body.postal_code || '', 20);
      const deliveryNotes = sanitizeText(body.delivery_notes || '', 250);

      if (!city || !streetAddress || !phone) {
        return sendJson(res, 400, { error: 'City, street address, and mobile phone are required.' });
      }

      if (body.is_default) {
        db.prepare('UPDATE customer_addresses SET is_default = 0 WHERE user_id = ?').run(user.id);
      }

      const id = crypto.randomUUID();
      db.prepare(`
        INSERT INTO customer_addresses (id, user_id, label, recipient_name, phone, city, zone_code, street_address, apartment_floor, entrance_code, postal_code, delivery_notes, is_default, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        user.id,
        label,
        recipientName,
        phone,
        city,
        zoneCode,
        streetAddress,
        apartmentFloor,
        entranceCode,
        postalCode,
        deliveryNotes,
        body.is_default ? 1 : 0,
        new Date().toISOString()
      );

      const addresses = db.prepare('SELECT * FROM customer_addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC').all(user.id);
      return sendJson(res, 201, { message: 'Address saved to your account.', addresses });
    }

    if (pathname.startsWith('/api/account/addresses/') && method === 'DELETE') {
      if (!user) return sendJson(res, 401, { error: 'Authentication required' });
      const addrId = pathname.replace('/api/account/addresses/', '');
      db.prepare('DELETE FROM customer_addresses WHERE id = ? AND user_id = ?').run(addrId, user.id);
      const addresses = db.prepare('SELECT * FROM customer_addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC').all(user.id);
      return sendJson(res, 200, { addresses });
    }

    if (pathname.startsWith('/api/account/orders/') && pathname.endsWith('/reorder') && method === 'POST') {
      if (!user) return sendJson(res, 401, { error: 'Authentication required' });
      const orderNum = pathname.replace('/api/account/orders/', '').replace('/reorder', '');
      const ord = db.prepare('SELECT * FROM orders WHERE order_number = ? AND user_id = ?').get(orderNum, user.id);
      if (!ord) return sendJson(res, 404, { error: 'Order not found' });

      const items = JSON.parse(ord.items_json || '[]');
      const baseCart = getHydratedCart({ userId: user.id, sessionToken });
      const now = new Date().toISOString();

      for (const it of items) {
        const prod = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1').get(it.product_id);
        if (!prod || prod.stock_quantity <= 0) continue;
        const existing = db.prepare(
          'SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ? AND variant_code = ?'
        ).get(baseCart.cart_id, it.product_id, it.variant_code || 'single');

        if (existing) {
          const nextQty = Math.min(existing.quantity + it.quantity, prod.stock_quantity, 99);
          db.prepare('UPDATE cart_items SET quantity = ?, updated_at = ? WHERE id = ?').run(nextQty, now, existing.id);
        } else {
          db.prepare(`
            INSERT INTO cart_items (id, cart_id, product_id, variant_code, variant_label, price_multiplier, quantity, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            crypto.randomUUID(),
            baseCart.cart_id,
            it.product_id,
            it.variant_code || 'single',
            it.variant_label || 'Single Pack (1x)',
            it.price_multiplier || 1.0,
            Math.min(it.quantity, prod.stock_quantity, 99),
            now
          );
        }
      }

      const updatedCart = getHydratedCart({ userId: user.id, sessionToken });
      return sendJson(res, 200, { message: `Added items from Order ${orderNum} to your basket!`, cart: updatedCart });
    }

    // =========================================================================
    // 8. 9-STEP MULTI-STEP CHECKOUT & PAYMENT PROCESSING
    // =========================================================================
    if (pathname === '/api/checkout/place-order' && method === 'POST') {
      // Step 1 Gate: Customer MUST be authenticated before completing a purchase
      if (!user) {
        return sendJson(res, 401, {
          error: 'Please sign in or register at Step 1 to complete your purchase. Your basket is preserved!'
        });
      }

      const body = await readJsonBody(req);
      const zoneCode = sanitizeText(body.zone_code || 'IL-Z1', 16);
      const deliveryMethod = sanitizeText(body.delivery_method || 'standard', 32);
      const paymentMethod = sanitizeText(body.payment_method || 'credit_card', 32);
      const installments = Math.min(6, Math.max(1, parseInt(body.installments || 1, 10)));
      const cardLast4 = sanitizeText(body.card_last4 || '4242', 4);
      const idempotencyKey = sanitizeText(body.idempotency_key || crypto.randomUUID(), 80);

      // Duplicate charge prevention check
      const existingOrder = db.prepare('SELECT * FROM orders WHERE idempotency_key = ?').get(idempotencyKey);
      if (existingOrder) {
        return sendJson(res, 200, {
          message: 'Order already processed (Idempotent response).',
          order: {
            ...existingOrder,
            shipping_address: JSON.parse(existingOrder.shipping_address_json || '{}'),
            items: JSON.parse(existingOrder.items_json || '[]'),
            tracking_history: JSON.parse(existingOrder.tracking_history_json || '[]')
          }
        });
      }

      // Simulated declined payment handling (if tester enters last 4 digits '0000')
      if (cardLast4 === '0000' || body.simulate_decline === true) {
        return sendJson(res, 402, {
          error: 'Transaction Declined by Issuer (Code: E-3DS-DECLINED). Your basket remains intact, please try another card, Bit, or PayPal.'
        });
      }

      const cart = getHydratedCart({ userId: user.id, sessionToken, zoneCode, deliveryMethod });
      if (!cart.items || cart.items.length === 0) {
        return sendJson(res, 400, { error: 'Your shopping basket is empty.' });
      }

      const shippingAddress = {
        recipient_name: sanitizeText(body.recipient_name || user.full_name, 100),
        phone: sanitizeText(body.phone || user.phone, 30),
        city: sanitizeText(body.city || 'Tel Aviv-Yafo', 80),
        zone_code: zoneCode,
        street_address: sanitizeText(body.street_address || '', 150),
        apartment_floor: sanitizeText(body.apartment_floor || '', 80),
        entrance_code: sanitizeText(body.entrance_code || '', 30),
        postal_code: sanitizeText(body.postal_code || '', 20),
        delivery_notes: sanitizeText(body.delivery_notes || '', 250)
      };

      if (!shippingAddress.city || !shippingAddress.street_address || !shippingAddress.phone) {
        return sendJson(res, 400, { error: 'Please complete the delivery address fields (City, Street Address, Mobile Phone).' });
      }

      const now = new Date().toISOString();
      const orderNumber = `DM-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
      const taxInvoiceNumber = `INV-IL-${Math.floor(1000000 + Math.random() * 9000000)}`;
      const transactionRef = `TXN-${paymentMethod.toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      const trackingNumber = `HFD-IL-${Math.floor(10000000 + Math.random() * 90000000)}`;

      const trackingHistory = [
        {
          status: 'Order Confirmed & Tax Invoice Issued',
          location: 'Dinu Market Digital Checkout (Israel)',
          timestamp: now
        },
        {
          status: 'Assigned to Warehouse Picking Queue',
          location: 'Dinu Market Central Fulfillment Hub, Israel',
          timestamp: now
        }
      ];

      db.exec('BEGIN IMMEDIATE TRANSACTION;');
      try {
        // Verify and deduct stock
        for (const item of cart.items) {
          const prod = db.prepare('SELECT stock_quantity, title FROM products WHERE id = ?').get(item.product_id);
          if (!prod || prod.stock_quantity < item.quantity) {
            throw new Error(`Insufficient stock for ${item.title}`);
          }
          db.prepare('UPDATE products SET stock_quantity = stock_quantity - ?, sales_count = sales_count + ? WHERE id = ?').run(
            item.quantity,
            item.quantity,
            item.product_id
          );
        }

        const orderId = crypto.randomUUID();
        db.prepare(`
          INSERT INTO orders (
            id, order_number, user_id, customer_email, customer_name, customer_phone,
            status, payment_status, payment_method, installments, transaction_ref, idempotency_key,
            card_last4, tax_invoice_number, zone_code, delivery_method,
            shipping_address_json, items_json, subtotal_ils, discount_code, discount_amount_ils,
            shipping_cost_ils, vat_included_ils, total_ils, tracking_number, carrier_name,
            tracking_history_json, confirmation_email_sent, created_at, updated_at
          ) VALUES (
            ?, ?, ?, ?, ?, ?,
            'confirmed', 'captured', ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, 1, ?, ?
          )
        `).run(
          orderId,
          orderNumber,
          user.id,
          user.email,
          shippingAddress.recipient_name,
          shippingAddress.phone,
          paymentMethod,
          installments,
          transactionRef,
          idempotencyKey,
          cardLast4,
          taxInvoiceNumber,
          zoneCode,
          deliveryMethod,
          JSON.stringify(shippingAddress),
          JSON.stringify(cart.items),
          cart.subtotal_ils,
          cart.discount_code,
          cart.discount_amount_ils,
          cart.shipping_cost_ils,
          cart.vat_included_ils,
          cart.total_ils,
          trackingNumber,
          deliveryMethod === 'express' ? 'Dinu Express Courier (Same/Next Day)' : deliveryMethod === 'locker' ? 'Boxit / Cheetah Locker Network' : 'HFD Home Courier Israel',
          JSON.stringify(trackingHistory),
          now,
          now
        );

        // Save address if requested
        if (body.save_address) {
          db.prepare(`
            INSERT INTO customer_addresses (id, user_id, label, recipient_name, phone, city, zone_code, street_address, apartment_floor, entrance_code, postal_code, delivery_notes, is_default, created_at)
            VALUES (?, ?, 'Saved at Checkout', ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
          `).run(
            crypto.randomUUID(),
            user.id,
            shippingAddress.recipient_name,
            shippingAddress.phone,
            shippingAddress.city,
            zoneCode,
            shippingAddress.street_address,
            shippingAddress.apartment_floor,
            shippingAddress.entrance_code,
            shippingAddress.postal_code,
            shippingAddress.delivery_notes,
            now
          );
        }

        // Clear cart items after successful order placement
        db.prepare('DELETE FROM cart_items WHERE cart_id = ?').run(cart.cart_id);
        db.prepare('UPDATE carts SET discount_code = NULL, updated_at = ? WHERE id = ?').run(now, cart.cart_id);

        db.exec('COMMIT;');

        const createdOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
        const freshCart = getHydratedCart({ userId: user.id, sessionToken });

        return sendJson(res, 201, {
          message: `Order ${orderNumber} confirmed! Confirmation email and Israeli Tax Invoice (${taxInvoiceNumber}) sent to ${user.email}.`,
          order: {
            ...createdOrder,
            shipping_address: JSON.parse(createdOrder.shipping_address_json || '{}'),
            items: JSON.parse(createdOrder.items_json || '[]'),
            tracking_history: JSON.parse(createdOrder.tracking_history_json || '[]')
          },
          cart: freshCart
        });
      } catch (err) {
        db.exec('ROLLBACK;');
        return sendJson(res, 400, { error: err.message || 'Could not complete order.' });
      }
    }

    // =========================================================================
    // 9. ADMINISTRATION DASHBOARD API (15 Core Capabilities, RBAC Protected)
    // =========================================================================
    if (pathname.startsWith('/api/admin/')) {
      if (!user || !['super_admin', 'catalog_manager', 'fulfillment_staff', 'support_agent'].includes(user.role)) {
        return sendJson(res, 403, { error: 'Administrator access required (RBAC Policy Enforcement).' });
      }

      if (pathname === '/api/admin/overview' && method === 'GET') {
        const products = db.prepare('SELECT * FROM products ORDER BY is_authentic_photo DESC, created_at DESC').all().map(formatProductRow);
        const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all().map((o) => ({
          ...o,
          shipping_address: JSON.parse(o.shipping_address_json || '{}'),
          items: JSON.parse(o.items_json || '[]'),
          tracking_history: JSON.parse(o.tracking_history_json || '[]')
        }));
        const customers = db.prepare('SELECT id, email, full_name, phone, role, email_verified, marketing_opt_in, is_suspended, created_at FROM users ORDER BY created_at DESC').all();
        const discounts = db.prepare('SELECT * FROM discounts ORDER BY code ASC').all();
        const shippingZones = db.prepare('SELECT * FROM shipping_zones ORDER BY zone_code ASC').all();
        const banners = db.prepare('SELECT * FROM promotional_banners ORDER BY display_order ASC').all();
        const auditLogs = db.prepare('SELECT * FROM admin_audit_logs ORDER BY created_at DESC LIMIT 40').all();
        const paymentRow = db.prepare("SELECT value_json FROM store_settings WHERE key = 'payment_config'").get();

        const totalRevenue = orders
          .filter((o) => o.payment_status === 'captured')
          .reduce((acc, o) => acc + o.total_ils, 0);

        const lowStockProducts = products.filter((p) => p.stock_quantity <= p.low_stock_threshold);

        return sendJson(res, 200, {
          kpis: {
            total_revenue_ils: Number(totalRevenue.toFixed(2)),
            total_orders: orders.length,
            total_products: products.length,
            authentic_photo_products: products.filter((p) => p.is_authentic_photo === 1).length,
            low_stock_count: lowStockProducts.length,
            total_customers: customers.length
          },
          products,
          orders,
          customers,
          discounts,
          shipping_zones: shippingZones,
          banners,
          payment_config: paymentRow ? JSON.parse(paymentRow.value_json) : {},
          audit_logs: auditLogs
        });
      }

      // Admin Create Product
      if (pathname === '/api/admin/products' && method === 'POST') {
        const body = await readJsonBody(req);
        const title = sanitizeText(body.title || '', 140);
        const titleHe = sanitizeText(body.title_he || '', 140);
        const vendorBrand = sanitizeText(body.vendor_brand || 'Dinu Market', 80);
        const categorySlug = sanitizeText(body.category_slug || 'snacks', 50);
        const subcategorySlug = sanitizeText(body.subcategory_slug || 'chips-crisps-puffs', 50);
        const regionSlug = sanitizeText(body.region_slug || 'india', 50);
        const priceIls = Math.max(0, Number(body.price_ils || 19.9));
        const compareAt = body.compare_at_price_ils ? Number(body.compare_at_price_ils) : null;
        const stockQuantity = Math.max(0, parseInt(body.stock_quantity ?? 40, 10));
        const netWeight = Math.max(1, parseInt(body.net_weight_grams || 250, 10));
        const sku = sanitizeText(body.sku || `DM-${Date.now().toString().slice(-5)}`, 40);
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString().slice(-4);
        const imageUrl = sanitizeText(body.primary_image_url || `/api/product-illustration/${slug}.svg`, 250);

        if (!title) return sendJson(res, 400, { error: 'Product title is required.' });

        const id = crypto.randomUUID();
        db.prepare(`
          INSERT INTO products (
            id, sku, barcode_ean, title, title_he, slug, vendor_brand,
            category_slug, subcategory_slug, region_slug, short_description, description,
            price_ils, compare_at_price_ils, net_weight_grams, stock_quantity,
            primary_image_url, variants_json, is_featured, is_active, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?)
        `).run(
          id,
          sku,
          sanitizeText(body.barcode_ean || '', 30),
          title,
          titleHe,
          slug,
          vendorBrand,
          categorySlug,
          subcategorySlug,
          regionSlug,
          sanitizeText(body.short_description || title, 300),
          sanitizeText(body.description || title, 1200),
          priceIls,
          compareAt,
          netWeight,
          stockQuantity,
          imageUrl,
          JSON.stringify([
            { code: 'single', label: 'Single Pack (1x)', multiplier: 1.0 },
            { code: 'bundle3', label: 'Value 3-Pack (Save 6%)', multiplier: 2.82 }
          ]),
          new Date().toISOString()
        );

        logAdminAction(user.email, 'CREATE_PRODUCT', 'products', id, `Created product ${title} (₪${priceIls})`);
        return sendJson(res, 201, { message: `Product "${title}" created.` });
      }

      // Admin Update Product (Price, Stock, Title, Active status)
      if (pathname.startsWith('/api/admin/products/') && method === 'PATCH') {
        const prodId = pathname.replace('/api/admin/products/', '');
        const body = await readJsonBody(req);
        const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(prodId);
        if (!existing) return sendJson(res, 404, { error: 'Product not found' });

        const nextPrice = body.price_ils !== undefined ? Math.max(0, Number(body.price_ils)) : existing.price_ils;
        const nextCompare = body.compare_at_price_ils !== undefined ? (body.compare_at_price_ils ? Number(body.compare_at_price_ils) : null) : existing.compare_at_price_ils;
        const nextStock = body.stock_quantity !== undefined ? Math.max(0, parseInt(body.stock_quantity, 10)) : existing.stock_quantity;
        const nextTitle = body.title !== undefined ? sanitizeText(body.title, 140) : existing.title;

        db.prepare(`
          UPDATE products
          SET title = ?, price_ils = ?, compare_at_price_ils = ?, stock_quantity = ?
          WHERE id = ?
        `).run(nextTitle, nextPrice, nextCompare, nextStock, prodId);

        logAdminAction(
          user.email,
          'UPDATE_PRODUCT',
          'products',
          prodId,
          `Updated ${nextTitle}: Price ₪${nextPrice}, Stock ${nextStock}`
        );
        return sendJson(res, 200, { message: `Updated ${nextTitle}` });
      }

      // Admin Delete Product
      if (pathname.startsWith('/api/admin/products/') && method === 'DELETE') {
        const prodId = pathname.replace('/api/admin/products/', '');
        db.prepare('DELETE FROM products WHERE id = ?').run(prodId);
        logAdminAction(user.email, 'DELETE_PRODUCT', 'products', prodId, 'Deleted product');
        return sendJson(res, 200, { message: 'Product removed.' });
      }

      // Admin Update Order Delivery Status & Tracking
      if (pathname.startsWith('/api/admin/orders/') && pathname.endsWith('/status') && method === 'PATCH') {
        const orderId = pathname.replace('/api/admin/orders/', '').replace('/status', '');
        const body = await readJsonBody(req);
        const nextStatus = sanitizeText(body.status || 'dispatched', 40);
        const trackingNumber = sanitizeText(body.tracking_number || '', 60);

        const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
        if (!order) return sendJson(res, 404, { error: 'Order not found' });

        const history = JSON.parse(order.tracking_history_json || '[]');
        history.push({
          status: `Order Status Updated: ${nextStatus.toUpperCase()}`,
          location: 'Dinu Market Fulfillment / Courier Hub, Israel',
          timestamp: new Date().toISOString()
        });

        db.prepare(`
          UPDATE orders
          SET status = ?, tracking_number = COALESCE(NULLIF(?, ''), tracking_number), tracking_history_json = ?, updated_at = ?
          WHERE id = ?
        `).run(nextStatus, trackingNumber, JSON.stringify(history), new Date().toISOString(), orderId);

        logAdminAction(user.email, 'UPDATE_ORDER_STATUS', 'orders', order.order_number, `Status -> ${nextStatus}`);
        return sendJson(res, 200, { message: `Order ${order.order_number} updated to ${nextStatus}.` });
      }

      // Admin Process Refund & Credit Invoice
      if (pathname.startsWith('/api/admin/orders/') && pathname.endsWith('/refund') && method === 'POST') {
        const orderId = pathname.replace('/api/admin/orders/', '').replace('/refund', '');
        const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
        if (!order) return sendJson(res, 404, { error: 'Order not found' });

        const history = JSON.parse(order.tracking_history_json || '[]');
        const creditInvoice = `CR-IL-${Math.floor(100000 + Math.random() * 900000)}`;
        history.push({
          status: `Full Refund Processed & Credit Tax Invoice (${creditInvoice}) Issued`,
          location: 'Dinu Market Finance & Billing',
          timestamp: new Date().toISOString()
        });

        db.prepare(`
          UPDATE orders
          SET status = 'refunded', payment_status = 'refunded', tracking_history_json = ?, updated_at = ?
          WHERE id = ?
        `).run(JSON.stringify(history), new Date().toISOString(), orderId);

        logAdminAction(user.email, 'PROCESS_REFUND', 'orders', order.order_number, `Refunded ₪${order.total_ils} (${creditInvoice})`);
        return sendJson(res, 200, { message: `Refunded ₪${order.total_ils.toFixed(2)} for Order ${order.order_number}. Credit Invoice ${creditInvoice} issued.` });
      }

      // Admin Update Shipping Zone Rates & Free-Shipping Threshold
      if (pathname.startsWith('/api/admin/shipping-zones/') && method === 'PATCH') {
        const zoneCode = pathname.replace('/api/admin/shipping-zones/', '');
        const body = await readJsonBody(req);
        const stdRate = Math.max(0, Number(body.standard_rate_ils ?? 29));
        const freeThreshold = Math.max(0, Number(body.free_threshold_ils ?? 250));
        const lockerRate = Math.max(0, Number(body.locker_rate_ils ?? 19));

        db.prepare(`
          UPDATE shipping_zones
          SET standard_rate_ils = ?, locker_rate_ils = ?, free_threshold_ils = ?
          WHERE zone_code = ?
        `).run(stdRate, lockerRate, freeThreshold, zoneCode);

        logAdminAction(
          user.email,
          'UPDATE_SHIPPING_ZONE',
          'shipping_zones',
          zoneCode,
          `Standard ₪${stdRate}, Locker ₪${lockerRate}, Free Threshold ₪${freeThreshold}`
        );
        return sendJson(res, 200, { message: `Updated shipping zone ${zoneCode}.` });
      }

      // Admin Create Promotional Discount Code
      if (pathname === '/api/admin/discounts' && method === 'POST') {
        const body = await readJsonBody(req);
        const code = sanitizeText(body.code || '', 24).toUpperCase();
        const description = sanitizeText(body.description || '', 140);
        const discountType = ['percentage', 'fixed', 'free_shipping'].includes(body.discount_type) ? body.discount_type : 'percentage';
        const discountValue = Math.max(0, Number(body.discount_value || 10));
        const minOrder = Math.max(0, Number(body.min_order_ils || 0));

        if (!code) return sendJson(res, 400, { error: 'Promo code is required.' });

        db.prepare(`
          INSERT OR REPLACE INTO discounts (id, code, description, discount_type, discount_value, min_order_ils, is_active)
          VALUES (?, ?, ?, ?, ?, ?, 1)
        `).run(crypto.randomUUID(), code, description || `${code} Discount`, discountType, discountValue, minOrder);

        logAdminAction(user.email, 'CREATE_DISCOUNT', 'discounts', code, `${discountType}: ${discountValue}`);
        return sendJson(res, 201, { message: `Saved promotional code ${code}.` });
      }
    }

    // =========================================================================
    // 10. STATIC FILE SERVER (HTML, CSS, JS, Brand Logo & Product JPEGs)
    // =========================================================================
    let safeRelPath = pathname === '/' ? '/index.html' : pathname;
    const filePath = path.normalize(path.join(PUBLIC_DIR, safeRelPath));

    if (!filePath.startsWith(PUBLIC_DIR)) {
      return sendJson(res, 403, { error: 'Forbidden path' });
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      applySecurityHeaders(res);
      res.setHeader('Content-Type', MIME_TYPES[ext] || 'application/octet-stream');
      if (cookieHeaders.length > 0) {
        for (const [k, v] of cookieHeaders) res.setHeader(k, v);
      }
      res.writeHead(200);
      return fs.createReadStream(filePath).pipe(res);
    }

    // SPA Fallback to index.html for client routes
    const indexHtmlPath = path.join(PUBLIC_DIR, 'index.html');
    if (fs.existsSync(indexHtmlPath)) {
      applySecurityHeaders(res);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.writeHead(200);
      return fs.createReadStream(indexHtmlPath).pipe(res);
    }

    return sendJson(res, 404, { error: 'Not found' });
  } catch (err) {
    console.error('Server error:', err);
    return sendJson(res, 500, { error: err.message || 'Internal Server Error' });
  }
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`===================================================================`);
    console.log(`  DINU MARKET E-Commerce Server listening on http://localhost:${PORT}`);
    console.log(`  Admin Demo Login:    admin@dinumarket.co.il / AdminDinu2026!`);
    console.log(`  Customer Demo Login: customer@dinumarket.co.il / Customer2026!`);
    console.log(`===================================================================`);
  });
}

module.exports = server;

