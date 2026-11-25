/**
 * DINU MARKET: Full-Stack E-Commerce HTTP & REST API Server
 * Product Catalogue Single Source of Truth: Supabase PostgreSQL (`"Product lists"`) + Supabase Storage (`"Product Images"`)
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

const {
  PLACEHOLDER_IMAGE_URL,
  isSupabaseConfigured,
  getPublicRealtimeConfig,
  fetchSupabaseCatalogue,
  getSupabaseProductByIdOrSlug,
  deductSupabaseStockAfterOrder,
  invalidateSupabaseCatalogueCache,
  adminCreateSupabaseProduct,
  adminUpdateSupabaseProduct,
  adminDeleteSupabaseProduct
} = require('./supabase-client');

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, 'public');
const SUPABASE_UMD_PATH = path.join(__dirname, 'node_modules', '@supabase', 'supabase-js', 'dist', 'umd', 'supabase.js');
const SUPABASE_UMD_BUFFER = fs.existsSync(SUPABASE_UMD_PATH) ? fs.readFileSync(SUPABASE_UMD_PATH) : null;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
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

function logAdminAction(actorEmail, action, entityType, entityId, details = '') {
  db.prepare(`
    INSERT INTO admin_audit_logs (id, actor_email, action, entity_type, entity_id, details, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(crypto.randomUUID(), actorEmail, action, entityType, String(entityId), details, new Date().toISOString());
}

/**
 * Generates a high-contrast custom branded SVG illustration if requested for a product slug
 */
async function renderProductIllustrationSvg(slug) {
  const product = await getSupabaseProductByIdOrSlug(slug);
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
  const weight = product ? product.size_label || `${product.net_weight_grams}g` : '250g';
  const flag = region ? `${region.name.toUpperCase()}` : 'IMPORTED';

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
  </defs>
  <rect width="600" height="600" fill="url(#bg)"/>
  <rect x="135" y="75" width="330" height="450" rx="26" fill="url(#pack)" stroke="${colors.accent}" stroke-width="5"/>
  <rect x="180" y="120" width="240" height="38" rx="19" fill="${colors.accent}"/>
  <text x="300" y="145" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" font-weight="800" fill="#14542E">${brand.toUpperCase()}</text>
  <rect x="165" y="185" width="270" height="175" rx="16" fill="#FFFFFF" fill-opacity="0.96"/>
  <text x="300" y="235" text-anchor="middle" font-family="Arial, sans-serif" font-size="21" font-weight="800" fill="#14542E">${line1}</text>
  <text x="300" y="268" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#202020">${line2}</text>
  <text x="300" y="346" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#14542E">${flag}</text>
  <circle cx="300" cy="425" r="36" fill="${colors.accent}"/>
  <text x="300" y="421" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" font-weight="700" fill="#14542E">SIZE</text>
  <text x="300" y="439" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" font-weight="800" fill="#14542E">${sanitizeText(weight, 14)}</text>
</svg>`;
}

const server = http.createServer(async (req, res) => {
  try {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = decodeURIComponent(parsedUrl.pathname);
    const method = req.method.toUpperCase();
    const clientIp = req.socket.remoteAddress || '127.0.0.1';

    // Serve official @supabase/supabase-js browser bundle from local node_modules (strictly same-origin CSP)
    if (method === 'GET' && pathname === '/vendor/supabase.js') {
      if (SUPABASE_UMD_BUFFER) {
        applySecurityHeaders(res);
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.writeHead(200);
        return res.end(SUPABASE_UMD_BUFFER);
      }
      return sendJson(res, 404, { error: 'Supabase browser bundle not found' });
    }

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
      const svg = await renderProductIllustrationSvg(slug);
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
    // 1. BOOTSTRAP ENDPOINT (Navigation, Regions, Banners, User, Cart, Realtime)
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

      const cat = await fetchSupabaseCatalogue();
      const zoneCode = parsedUrl.searchParams.get('zone') || 'IL-Z1';
      const deliveryMethod = parsedUrl.searchParams.get('deliveryMethod') || 'standard';
      const cart = getHydratedCart({
        userId: user ? user.id : null,
        sessionToken,
        zoneCode,
        deliveryMethod,
        productMap: cat.byId
      });

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
          supabase_realtime: getPublicRealtimeConfig(),
          catalogue_meta: {
            source: 'supabase',
            configured: isSupabaseConfigured(),
            total_products: cat.products.length,
            rls_blocking_anon_read: Boolean(cat.diagnostics?.rlsLikelyBlockingAnonRead),
            error: cat.error || null
          },
          user,
          cart
        },
        cookieHeaders
      );
    }

    // =========================================================================
    // 1B. CATALOGUE CACHE REVALIDATION ENDPOINT (Triggered by Realtime / Webhook)
    // =========================================================================
    if (method === 'POST' && pathname === '/api/catalogue/revalidate') {
      invalidateSupabaseCatalogueCache();
      const cat = await fetchSupabaseCatalogue({ forceRefresh: true });
      return sendJson(res, 200, {
        ok: true,
        total_products: cat.products.length,
        last_fetched_at: cat.diagnostics?.lastFetchedAt || new Date().toISOString()
      });
    }

    // =========================================================================
    // 2. PREDICTIVE SEARCH ENDPOINT (Backed by Supabase `"Product lists"`)
    // =========================================================================
    if (method === 'GET' && pathname === '/api/search/predictive') {
      const q = sanitizeText(parsedUrl.searchParams.get('q') || '', 80).toLowerCase();
      if (q.length < 2) {
        return sendJson(res, 200, { products: [], categories: [], regions: [] }, cookieHeaders);
      }

      const cat = await fetchSupabaseCatalogue();
      const matchingProducts = cat.products
        .filter(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            (p.title_he && p.title_he.includes(q)) ||
            p.vendor_brand.toLowerCase().includes(q) ||
            (p.raw_category && p.raw_category.toLowerCase().includes(q)) ||
            p.category_slug.toLowerCase().includes(q) ||
            p.subcategory_slug.toLowerCase().includes(q) ||
            p.region_slug.toLowerCase().includes(q) ||
            (p.raw_country && p.raw_country.toLowerCase().includes(q)) ||
            (p.barcode_ean && p.barcode_ean.toLowerCase().includes(q)) ||
            (p.sku && p.sku.toLowerCase().includes(q))
        )
        .slice(0, 6);

      const likeParam = `%${q}%`;
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

      return sendJson(
        res,
        200,
        {
          query: q,
          products: matchingProducts,
          categories: matchingCategories,
          regions: matchingRegions
        },
        cookieHeaders
      );
    }

    // =========================================================================
    // 3. PRODUCT CATALOGUE, ALLOCATION, FILTERING & PAGINATION ENDPOINT
    // =========================================================================
    if (method === 'GET' && pathname === '/api/products') {
      const forceRefresh = parsedUrl.searchParams.get('refresh') === '1' || parsedUrl.searchParams.get('refresh') === 'true';
      const category = parsedUrl.searchParams.get('category') || '';
      const subcategory = parsedUrl.searchParams.get('subcategory') || '';
      const region = parsedUrl.searchParams.get('region') || '';
      const q = (parsedUrl.searchParams.get('q') || '').trim().toLowerCase();
      const vendor = parsedUrl.searchParams.get('vendor') || '';
      const size = parsedUrl.searchParams.get('size') || '';
      const dietary = parsedUrl.searchParams.get('dietary') || '';
      const inStockOnly = parsedUrl.searchParams.get('inStock') === 'true';
      const onSaleOnly = parsedUrl.searchParams.get('onSale') === 'true';
      const authenticOnly = parsedUrl.searchParams.get('authenticOnly') === 'true';
      const minPrice = Number(parsedUrl.searchParams.get('minPrice') || 0);
      const maxPriceParam = parsedUrl.searchParams.get('maxPrice');
      const maxPrice = maxPriceParam !== null && maxPriceParam !== '' ? Number(maxPriceParam) : 999999;
      const sort = parsedUrl.searchParams.get('sort') || 'featured';
      const page = Math.max(1, parseInt(parsedUrl.searchParams.get('page') || '1', 10));
      const rawLimit = parseInt(parsedUrl.searchParams.get('limit') || '48', 10);
      const limit = rawLimit === 0 ? 0 : Math.min(250, Math.max(1, rawLimit));

      const cat = await fetchSupabaseCatalogue({ forceRefresh });
      let rows = [...cat.products];

      // Strict country allocation: products with missing/unrecognised country (`'unassigned'`)
      // are NEVER arbitrarily assigned to India, Thailand, Sri Lanka, or Philippines.
      if (region) {
        rows = rows.filter((p) => p.region_slug === region);
      }
      // Strict category allocation: `'uncategorised'` items are NEVER arbitrarily placed into a category
      if (category && category !== 'all' && category !== 'shop-by-region') {
        rows = rows.filter((p) => p.category_slug === category);
      }
      if (subcategory) {
        rows = rows.filter((p) => p.subcategory_slug === subcategory);
      }
      if (vendor) {
        rows = rows.filter((p) => p.vendor_brand.toLowerCase() === vendor.toLowerCase());
      }
      if (size) {
        rows = rows.filter((p) => p.size_label === size);
      }
      if (dietary) {
        rows = rows.filter((p) => (p.dietary_tags || []).some((t) => t.toLowerCase().includes(dietary.toLowerCase())));
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
            (p.raw_category && p.raw_category.toLowerCase().includes(q)) ||
            p.category_slug.toLowerCase().includes(q) ||
            p.subcategory_slug.toLowerCase().includes(q) ||
            p.region_slug.toLowerCase().includes(q) ||
            (p.raw_country && p.raw_country.toLowerCase().includes(q)) ||
            (p.ingredients && p.ingredients.toLowerCase().includes(q)) ||
            (p.barcode_ean && p.barcode_ean.toLowerCase().includes(q)) ||
            (p.sku && p.sku.toLowerCase().includes(q))
        );
      }

      if (Number.isFinite(minPrice) && Number.isFinite(maxPrice)) {
        rows = rows.filter((p) => p.price_ils >= minPrice && p.price_ils <= maxPrice);
      }

      // Sorting
      rows.sort((a, b) => {
        if (sort === 'price-asc') return a.price_ils - b.price_ils;
        if (sort === 'price-desc') return b.price_ils - a.price_ils;
        if (sort === 'best-selling') return b.sales_count - a.sales_count;
        if (sort === 'newest') return Number(b.id || 0) - Number(a.id || 0);
        if (sort === 'rating-desc') return b.rating_average - a.rating_average;
        if (sort === 'title-asc') return a.title.localeCompare(b.title);
        if (b.in_stock !== a.in_stock) return (b.in_stock ? 1 : 0) - (a.in_stock ? 1 : 0);
        if (b.is_authentic_photo !== a.is_authentic_photo) return b.is_authentic_photo - a.is_authentic_photo;
        return b.sales_count - a.sales_count;
      });

      const total = rows.length;
      const pagedProducts = limit > 0 ? rows.slice((page - 1) * limit, page * limit) : rows;
      const hasMore = limit > 0 && page * limit < total;
      const allVendors = [...new Set(cat.products.map((r) => r.vendor_brand).filter(Boolean))].sort();

      return sendJson(
        res,
        200,
        {
          catalogue_source: 'supabase',
          total,
          page,
          limit: limit || total,
          has_more: hasMore,
          products: pagedProducts,
          facets: {
            vendors: allVendors
          },
          catalogue_error: cat.error || null,
          rls_blocking_anon_read: Boolean(cat.diagnostics?.rlsLikelyBlockingAnonRead)
        },
        cookieHeaders
      );
    }

    // =========================================================================
    // 4. PRODUCT DETAIL PAGE (PDP) & REVIEWS ENDPOINTS
    // =========================================================================
    if (pathname.startsWith('/api/products/')) {
      const rest = pathname.replace('/api/products/', '');
      const parts = rest.split('/');
      const slugOrId = parts[0];

      if (method === 'GET' && parts.length === 1) {
        const product = await getSupabaseProductByIdOrSlug(slugOrId);
        if (!product) return sendJson(res, 404, { error: 'Product not found' });

        const cat = await fetchSupabaseCatalogue();
        const reviews = db
          .prepare('SELECT * FROM product_reviews WHERE product_id = ? ORDER BY created_at DESC')
          .all(String(product.id));

        const related = cat.products
          .filter(
            (p) =>
              String(p.id) !== String(product.id) &&
              (p.region_slug === product.region_slug || p.category_slug === product.category_slug)
          )
          .slice(0, 4);

        const regionObj = db.prepare('SELECT * FROM regions WHERE slug = ?').get(product.region_slug);
        const categoryObj = db.prepare('SELECT * FROM categories WHERE slug = ?').get(product.category_slug);
        const subcategoryObj = db.prepare('SELECT * FROM categories WHERE slug = ?').get(product.subcategory_slug);

        return sendJson(
          res,
          200,
          {
            product,
            region: regionObj || null,
            category: categoryObj || null,
            subcategory: subcategoryObj || null,
            reviews,
            related_products: related
          },
          cookieHeaders
        );
      }

      if (method === 'POST' && parts[1] === 'reviews') {
        if (!user) {
          return sendJson(res, 401, { error: 'Please sign in to submit a verified product review.' });
        }
        const product = await getSupabaseProductByIdOrSlug(slugOrId);
        if (!product) return sendJson(res, 404, { error: 'Product not found' });

        const body = await readJsonBody(req);
        const rating = Math.min(5, Math.max(1, Number(body.rating || 5)));
        const title = sanitizeText(body.title || 'Great product!', 120);
        const reviewBody = sanitizeText(body.body || '', 1000);
        if (!reviewBody) {
          return sendJson(res, 400, { error: 'Please enter a review comment.' });
        }

        const hasPurchased = db.prepare('SELECT COUNT(*) AS cnt FROM orders WHERE user_id = ?').get(user.id).cnt > 0;
        const pid = String(product.id);

        db.prepare(`
          INSERT INTO product_reviews (id, product_id, user_id, author_name, rating, title, body, is_verified_purchase, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          crypto.randomUUID(),
          pid,
          user.id,
          user.full_name,
          rating,
          title,
          reviewBody,
          hasPurchased ? 1 : 0,
          new Date().toISOString()
        );

        const stats = db.prepare('SELECT AVG(rating) AS avg_r, COUNT(*) AS cnt FROM product_reviews WHERE product_id = ?').get(pid);
        const updatedReviews = db.prepare('SELECT * FROM product_reviews WHERE product_id = ? ORDER BY created_at DESC').all(pid);
        return sendJson(res, 201, {
          reviews: updatedReviews,
          rating_average: Number((stats.avg_r || 5).toFixed(2)),
          rating_count: stats.cnt
        });
      }
    }

    // =========================================================================
    // 5. PERSISTENT SHOPPING BASKET (CART) ENDPOINTS (Unique Supabase Product ID)
    // =========================================================================
    if (pathname === '/api/cart' && method === 'GET') {
      const cat = await fetchSupabaseCatalogue();
      const zoneCode = parsedUrl.searchParams.get('zone') || 'IL-Z1';
      const deliveryMethod = parsedUrl.searchParams.get('deliveryMethod') || 'standard';
      const cart = getHydratedCart({
        userId: user ? user.id : null,
        sessionToken,
        zoneCode,
        deliveryMethod,
        productMap: cat.byId
      });
      return sendJson(res, 200, { cart }, cookieHeaders);
    }

    if (pathname === '/api/cart/items' && method === 'POST') {
      const body = await readJsonBody(req);
      const requestedId = sanitizeText(body.product_id, 80);
      const variantCode = sanitizeText(body.variant_code || 'single', 32);
      const quantity = Math.min(99, Math.max(1, parseInt(body.quantity || 1, 10)));

      // Validate live product & stock directly from Supabase
      const product = await getSupabaseProductByIdOrSlug(requestedId, { live: true });
      if (!product) return sendJson(res, 404, { error: 'Product not found in catalogue.' });
      if (product.stock_quantity <= 0) {
        return sendJson(res, 400, { error: 'This item is currently out of stock.' });
      }

      const canonicalProductId = String(product.id);
      const variants = product.variants || [];
      const selectedVariant = variants.find((v) => v.code === variantCode) || {
        code: 'single',
        label: 'Single Pack (1x)',
        multiplier: 1.0
      };

      const cat = await fetchSupabaseCatalogue();
      cat.byId.set(canonicalProductId, product);

      const baseCart = getHydratedCart({ userId: user ? user.id : null, sessionToken, productMap: cat.byId });
      const now = new Date().toISOString();

      const existing = db.prepare(
        'SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ? AND variant_code = ?'
      ).get(baseCart.cart_id, canonicalProductId, selectedVariant.code);

      if (existing) {
        const nextQty = Math.min(existing.quantity + quantity, product.stock_quantity, 99);
        db.prepare(`
          UPDATE cart_items
          SET quantity = ?, unit_price_ils = ?, primary_image_url = ?, title = ?, updated_at = ?
          WHERE id = ?
        `).run(nextQty, product.price_ils, product.primary_image_url || PLACEHOLDER_IMAGE_URL, product.title, now, existing.id);
      } else {
        const nextQty = Math.min(quantity, product.stock_quantity, 99);
        db.prepare(`
          INSERT INTO cart_items (
            id, cart_id, product_id, variant_code, variant_label, price_multiplier, quantity,
            sku, title, slug, vendor_brand, unit_price_ils, net_weight_grams, primary_image_url, region_slug, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          crypto.randomUUID(),
          baseCart.cart_id,
          canonicalProductId,
          selectedVariant.code,
          selectedVariant.label,
          selectedVariant.multiplier,
          nextQty,
          product.sku || '',
          product.title || '',
          product.slug || '',
          product.vendor_brand || '',
          product.price_ils,
          product.net_weight_grams || 250,
          product.primary_image_url || PLACEHOLDER_IMAGE_URL,
          product.region_slug || 'india',
          now
        );
      }

      const updatedCart = getHydratedCart({ userId: user ? user.id : null, sessionToken, productMap: cat.byId });
      return sendJson(res, 200, { message: `Added ${product.title} to your basket`, cart: updatedCart }, cookieHeaders);
    }

    if (pathname.startsWith('/api/cart/items/') && (method === 'PATCH' || method === 'DELETE')) {
      const itemId = pathname.replace('/api/cart/items/', '');
      const cat = await fetchSupabaseCatalogue();
      const baseCart = getHydratedCart({ userId: user ? user.id : null, sessionToken, productMap: cat.byId });

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
            const liveProd = await getSupabaseProductByIdOrSlug(itemRow.product_id, { live: true });
            if (liveProd) cat.byId.set(String(liveProd.id), liveProd);
            const maxStock = liveProd ? liveProd.stock_quantity : 99;
            if (maxStock <= 0) {
              db.prepare('DELETE FROM cart_items WHERE id = ? AND cart_id = ?').run(itemId, baseCart.cart_id);
            } else {
              const capped = Math.min(nextQty, maxStock, 99);
              db.prepare('UPDATE cart_items SET quantity = ?, updated_at = ? WHERE id = ?').run(capped, new Date().toISOString(), itemId);
            }
          }
        }
      }

      const updatedCart = getHydratedCart({ userId: user ? user.id : null, sessionToken, productMap: cat.byId });
      return sendJson(res, 200, { cart: updatedCart }, cookieHeaders);
    }

    if (pathname === '/api/cart/discount' && method === 'POST') {
      const body = await readJsonBody(req);
      const code = sanitizeText(body.code || '', 32).toUpperCase();
      const cat = await fetchSupabaseCatalogue();
      const baseCart = getHydratedCart({ userId: user ? user.id : null, sessionToken, productMap: cat.byId });

      if (!code) {
        db.prepare('UPDATE carts SET discount_code = NULL WHERE id = ?').run(baseCart.cart_id);
        const updatedCart = getHydratedCart({ userId: user ? user.id : null, sessionToken, productMap: cat.byId });
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
      const updatedCart = getHydratedCart({ userId: user ? user.id : null, sessionToken, productMap: cat.byId });
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

      const cat = await fetchSupabaseCatalogue();
      mergeGuestCartIntoUserCart(sessionToken, userId, cat.byId);

      const authToken = signToken({ userId, role: 'customer' });
      const newUser = db.prepare('SELECT id, email, full_name, phone, role, email_verified, marketing_opt_in, created_at FROM users WHERE id = ?').get(userId);
      const mergedCart = getHydratedCart({ userId, sessionToken, productMap: cat.byId });

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

      const cat = await fetchSupabaseCatalogue();
      mergeGuestCartIntoUserCart(sessionToken, userRow.id, cat.byId);

      const authToken = signToken({ userId: userRow.id, role: userRow.role });
      const mergedCart = getHydratedCart({ userId: userRow.id, sessionToken, productMap: cat.byId });

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
      const cat = await fetchSupabaseCatalogue({ forceRefresh: true });
      const baseCart = getHydratedCart({ userId: user.id, sessionToken, productMap: cat.byId });
      const now = new Date().toISOString();

      for (const it of items) {
        const prod = await getSupabaseProductByIdOrSlug(it.product_id, { live: true });
        if (!prod || prod.stock_quantity <= 0) continue;
        cat.byId.set(String(prod.id), prod);

        const existing = db.prepare(
          'SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ? AND variant_code = ?'
        ).get(baseCart.cart_id, String(prod.id), it.variant_code || 'single');

        if (existing) {
          const nextQty = Math.min(existing.quantity + it.quantity, prod.stock_quantity, 99);
          db.prepare('UPDATE cart_items SET quantity = ?, updated_at = ? WHERE id = ?').run(nextQty, now, existing.id);
        } else {
          db.prepare(`
            INSERT INTO cart_items (
              id, cart_id, product_id, variant_code, variant_label, price_multiplier, quantity,
              sku, title, slug, vendor_brand, unit_price_ils, net_weight_grams, primary_image_url, region_slug, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            crypto.randomUUID(),
            baseCart.cart_id,
            String(prod.id),
            it.variant_code || 'single',
            it.variant_label || 'Single Pack (1x)',
            it.price_multiplier || 1.0,
            Math.min(it.quantity, prod.stock_quantity, 99),
            prod.sku || '',
            prod.title || '',
            prod.slug || '',
            prod.vendor_brand || '',
            prod.price_ils,
            prod.net_weight_grams || 250,
            prod.primary_image_url || PLACEHOLDER_IMAGE_URL,
            prod.region_slug || 'india',
            now
          );
        }
      }

      const updatedCart = getHydratedCart({ userId: user.id, sessionToken, productMap: cat.byId });
      return sendJson(res, 200, { message: `Added items from Order ${orderNum} to your basket!`, cart: updatedCart });
    }

    // =========================================================================
    // 8. MULTI-STEP CHECKOUT & AUTHORITATIVE SERVER-SIDE SUPABASE VALIDATION
    // =========================================================================
    if (pathname === '/api/checkout/place-order' && method === 'POST') {
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

      if (cardLast4 === '0000' || body.simulate_decline === true) {
        return sendJson(res, 402, {
          error: 'Transaction Declined by Issuer (Code: E-3DS-DECLINED). Your basket remains intact, please try another card, Bit, or PayPal.'
        });
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

      // CRITICAL SECTION 9 REQUIREMENT:
      // Force live product fetch from Supabase to validate current prices & stock on the server
      // before completing checkout (never rely on browser-cached prices or stock!).
      const liveCat = await fetchSupabaseCatalogue({ forceRefresh: true });
      if (liveCat.error && liveCat.products.length === 0) {
        return sendJson(res, 503, {
          error: 'Unable to verify live product prices and stock availability right now. Please try again in a moment.'
        });
      }

      const liveProductMap = new Map(liveCat.byId);
      const rawCartRow = db.prepare('SELECT * FROM carts WHERE user_id = ?').get(user.id);
      const rawCartItems = rawCartRow
        ? db.prepare('SELECT * FROM cart_items WHERE cart_id = ?').all(rawCartRow.id)
        : [];

      if (rawCartItems.length === 0) {
        return sendJson(res, 400, { error: 'Your shopping basket is empty.' });
      }

      for (const ci of rawCartItems) {
        const liveProd = await getSupabaseProductByIdOrSlug(ci.product_id, { live: true });
        if (!liveProd) {
          return sendJson(res, 400, {
            error: `"${ci.title || ci.product_id}" is no longer available in the catalogue. Please remove it from your basket.`
          });
        }
        if (liveProd.stock_quantity < ci.quantity) {
          return sendJson(res, 400, {
            error:
              liveProd.stock_quantity <= 0
                ? `"${liveProd.title}" is currently out of stock.`
                : `Insufficient stock for "${liveProd.title}" (only ${liveProd.stock_quantity} left in stock).`
          });
        }
        liveProductMap.set(String(liveProd.id), liveProd);
      }

      // Rehydrate cart strictly using verified live Supabase prices & weights
      const verifiedCart = getHydratedCart({
        userId: user.id,
        sessionToken,
        zoneCode,
        deliveryMethod,
        productMap: liveProductMap
      });

      if (!verifiedCart.items || verifiedCart.items.length === 0) {
        return sendJson(res, 400, { error: 'Your shopping basket is empty.' });
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

      let orderId;
      db.exec('BEGIN IMMEDIATE TRANSACTION;');
      try {
        orderId = crypto.randomUUID();
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
          JSON.stringify(verifiedCart.items),
          verifiedCart.subtotal_ils,
          verifiedCart.discount_code,
          verifiedCart.discount_amount_ils,
          verifiedCart.shipping_cost_ils,
          verifiedCart.vat_included_ils,
          verifiedCart.total_ils,
          trackingNumber,
          deliveryMethod === 'express'
            ? 'Dinu Express Courier (Same/Next Day)'
            : deliveryMethod === 'locker'
            ? 'Boxit / Cheetah Locker Network'
            : 'HFD Home Courier Israel',
          JSON.stringify(trackingHistory),
          now,
          now
        );

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

        db.prepare('DELETE FROM cart_items WHERE cart_id = ?').run(verifiedCart.cart_id);
        db.prepare('UPDATE carts SET discount_code = NULL, updated_at = ? WHERE id = ?').run(now, verifiedCart.cart_id);

        db.exec('COMMIT;');
      } catch (err) {
        db.exec('ROLLBACK;');
        return sendJson(res, 400, { error: err.message || 'Could not complete order.' });
      }

      // Deduct stock in Supabase if server-side service role key is configured
      await deductSupabaseStockAfterOrder(verifiedCart.items).catch((e) => {
        console.warn('[Checkout Stock Sync Notice]:', e.message);
      });

      const createdOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
      const freshCart = getHydratedCart({ userId: user.id, sessionToken, productMap: liveProductMap });

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
    }

    // =========================================================================
    // 9. ADMINISTRATION DASHBOARD API (RBAC Protected, Backed by Supabase)
    // =========================================================================
    if (pathname.startsWith('/api/admin/')) {
      if (!user || !['super_admin', 'catalog_manager', 'fulfillment_staff', 'support_agent'].includes(user.role)) {
        return sendJson(res, 403, { error: 'Administrator access required (RBAC Policy Enforcement).' });
      }

      if (pathname === '/api/admin/overview' && method === 'GET') {
        const cat = await fetchSupabaseCatalogue({ forceRefresh: true });
        const products = cat.products;
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
          supabase_diagnostics: cat.diagnostics,
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

      // Admin Create Product in Supabase
      if (pathname === '/api/admin/products' && method === 'POST') {
        const body = await readJsonBody(req);
        const title = sanitizeText(body.title || '', 140);
        if (!title) return sendJson(res, 400, { error: 'Product title is required.' });

        try {
          const created = await adminCreateSupabaseProduct(body);
          logAdminAction(user.email, 'CREATE_SUPABASE_PRODUCT', 'Product lists', created.id, `Created ${created.title}`);
          return sendJson(res, 201, { message: `Product "${created.title}" added to Supabase.`, product: created });
        } catch (err) {
          return sendJson(res, 400, { error: err.message });
        }
      }

      // Admin Update Product in Supabase
      if (pathname.startsWith('/api/admin/products/') && method === 'PATCH') {
        const prodId = pathname.replace('/api/admin/products/', '');
        const body = await readJsonBody(req);
        try {
          const updated = await adminUpdateSupabaseProduct(prodId, body);
          logAdminAction(user.email, 'UPDATE_SUPABASE_PRODUCT', 'Product lists', prodId, JSON.stringify(body));
          return sendJson(res, 200, { message: `Updated product #${prodId} in Supabase.`, product: updated });
        } catch (err) {
          return sendJson(res, 400, { error: err.message });
        }
      }

      // Admin Delete Product in Supabase
      if (pathname.startsWith('/api/admin/products/') && method === 'DELETE') {
        const prodId = pathname.replace('/api/admin/products/', '');
        try {
          await adminDeleteSupabaseProduct(prodId);
          logAdminAction(user.email, 'DELETE_SUPABASE_PRODUCT', 'Product lists', prodId, 'Deleted product');
          return sendJson(res, 200, { message: 'Product removed from Supabase.' });
        } catch (err) {
          return sendJson(res, 400, { error: err.message });
        }
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
    // 10. STATIC FILE SERVER (HTML, CSS, JS, Brand Assets & Region Banners)
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
      if (typeof res.on === 'function') {
        return fs.createReadStream(filePath).pipe(res);
      }
      return res.end(fs.readFileSync(filePath));
    }

    // SPA Fallback to index.html for client routes (/ph, /th, /in, /lk, /shop)
    const indexHtmlPath = path.join(PUBLIC_DIR, 'index.html');
    if (fs.existsSync(indexHtmlPath)) {
      applySecurityHeaders(res);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.writeHead(200);
      return res.end(fs.readFileSync(indexHtmlPath));
    }

    return sendJson(res, 404, { error: 'Not found' });
  } catch (err) {
    console.error('Server error:', err);
    return sendJson(res, 500, { error: 'An unexpected server error occurred. Please try again shortly.' });
  }
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`===================================================================`);
    console.log(`  DINU MARKET E-Commerce Server listening on http://localhost:${PORT}`);
    console.log(`  Catalogue Source:    Supabase ("Product lists" + "Product Images")`);
    console.log(`  Admin Demo Login:    admin@dinumarket.co.il / AdminDinu2026!`);
    console.log(`  Customer Demo Login: customer@dinumarket.co.il / Customer2026!`);
    console.log(`===================================================================`);
  });
}

server.server = server;
module.exports = server;
