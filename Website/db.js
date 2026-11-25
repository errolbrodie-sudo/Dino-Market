/**
 * DINU MARKET: Operational Relational Store (Users, Sessions, Carts, Orders, Shipping Zones)
 *
 * Product Catalogue Single Source of Truth:
 * - All product catalogue records and product images are served dynamically from Supabase
 *   (`public."Product lists"` and Supabase Storage bucket `"Product Images"`) via `supabase-client.js`.
 * - No hardcoded static product catalogue is seeded here.
 * - Compatible with both local Node.js development (`Website/data/`) and Vercel Serverless (`/tmp/`).
 */

const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const { hashPassword } = require('./security');

const DATA_DIR = process.env.VERCEL
  ? path.join('/tmp', 'dinu-market-data')
  : path.join(__dirname, 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'dinu_market.sqlite');
const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      role TEXT NOT NULL DEFAULT 'customer',
      email_verified INTEGER NOT NULL DEFAULT 0,
      verification_code TEXT,
      reset_token TEXT,
      reset_expires_at INTEGER,
      marketing_opt_in INTEGER NOT NULL DEFAULT 0,
      is_suspended INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customer_addresses (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      label TEXT NOT NULL DEFAULT 'Home',
      recipient_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      city TEXT NOT NULL,
      zone_code TEXT NOT NULL DEFAULT 'IL-Z1',
      street_address TEXT NOT NULL,
      apartment_floor TEXT DEFAULT '',
      entrance_code TEXT DEFAULT '',
      postal_code TEXT DEFAULT '',
      delivery_notes TEXT DEFAULT '',
      is_default INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      parent_slug TEXT,
      name TEXT NOT NULL,
      name_he TEXT DEFAULT '',
      slug TEXT UNIQUE NOT NULL,
      description TEXT DEFAULT '',
      display_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS regions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      name_he TEXT DEFAULT '',
      slug TEXT UNIQUE NOT NULL,
      iso_code TEXT NOT NULL,
      flag_emoji TEXT NOT NULL,
      description TEXT DEFAULT '',
      display_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS product_reviews (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      author_name TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      is_verified_purchase INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS discounts (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      description TEXT NOT NULL,
      discount_type TEXT NOT NULL,
      discount_value REAL NOT NULL,
      min_order_ils REAL NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS carts (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      session_token TEXT UNIQUE,
      discount_code TEXT,
      notes TEXT DEFAULT '',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cart_items (
      id TEXT PRIMARY KEY,
      cart_id TEXT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL,
      variant_code TEXT NOT NULL DEFAULT 'single',
      variant_label TEXT NOT NULL DEFAULT 'Single Pack',
      price_multiplier REAL NOT NULL DEFAULT 1.0,
      quantity INTEGER NOT NULL CHECK (quantity > 0 AND quantity <= 99),
      sku TEXT DEFAULT '',
      title TEXT DEFAULT '',
      slug TEXT DEFAULT '',
      vendor_brand TEXT DEFAULT '',
      unit_price_ils REAL DEFAULT 0,
      net_weight_grams INTEGER DEFAULT 250,
      primary_image_url TEXT DEFAULT '',
      region_slug TEXT DEFAULT 'india',
      updated_at TEXT NOT NULL,
      UNIQUE(cart_id, product_id, variant_code)
    );

    CREATE TABLE IF NOT EXISTS shipping_zones (
      zone_code TEXT PRIMARY KEY,
      name_en TEXT NOT NULL,
      name_he TEXT NOT NULL,
      cities_text TEXT NOT NULL,
      standard_rate_ils REAL NOT NULL,
      express_rate_ils REAL,
      locker_rate_ils REAL NOT NULL,
      free_threshold_ils REAL NOT NULL DEFAULT 250.0,
      estimated_days TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_number TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id),
      customer_email TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'confirmed',
      payment_status TEXT NOT NULL DEFAULT 'captured',
      payment_method TEXT NOT NULL,
      installments INTEGER NOT NULL DEFAULT 1,
      transaction_ref TEXT NOT NULL,
      idempotency_key TEXT UNIQUE NOT NULL,
      card_last4 TEXT DEFAULT '',
      tax_invoice_number TEXT NOT NULL,
      zone_code TEXT NOT NULL,
      delivery_method TEXT NOT NULL,
      shipping_address_json TEXT NOT NULL,
      items_json TEXT NOT NULL,
      subtotal_ils REAL NOT NULL,
      discount_code TEXT,
      discount_amount_ils REAL NOT NULL DEFAULT 0,
      shipping_cost_ils REAL NOT NULL DEFAULT 0,
      vat_included_ils REAL NOT NULL,
      total_ils REAL NOT NULL,
      tracking_number TEXT NOT NULL,
      carrier_name TEXT NOT NULL DEFAULT 'HFD Courier Israel',
      tracking_history_json TEXT NOT NULL DEFAULT '[]',
      confirmation_email_sent INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS promotional_banners (
      id TEXT PRIMARY KEY,
      placement TEXT NOT NULL,
      title TEXT NOT NULL,
      subtitle TEXT NOT NULL,
      cta_label TEXT NOT NULL,
      cta_link TEXT NOT NULL,
      badge_text TEXT DEFAULT '',
      bg_color TEXT NOT NULL DEFAULT '#14542E',
      is_active INTEGER NOT NULL DEFAULT 1,
      display_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS store_settings (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id TEXT PRIMARY KEY,
      actor_email TEXT NOT NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      details TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );
  `);

  // Migrate legacy `cart_items` or `product_reviews` if they previously had a foreign key to local `products`
  const ciFks = db.prepare('PRAGMA foreign_key_list(cart_items);').all();
  if (ciFks.some((fk) => fk.table === 'products')) {
    db.exec('PRAGMA foreign_keys = OFF;');
    db.exec(`
      CREATE TABLE cart_items_new (
        id TEXT PRIMARY KEY,
        cart_id TEXT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
        product_id TEXT NOT NULL,
        variant_code TEXT NOT NULL DEFAULT 'single',
        variant_label TEXT NOT NULL DEFAULT 'Single Pack',
        price_multiplier REAL NOT NULL DEFAULT 1.0,
        quantity INTEGER NOT NULL CHECK (quantity > 0 AND quantity <= 99),
        sku TEXT DEFAULT '',
        title TEXT DEFAULT '',
        slug TEXT DEFAULT '',
        vendor_brand TEXT DEFAULT '',
        unit_price_ils REAL DEFAULT 0,
        net_weight_grams INTEGER DEFAULT 250,
        primary_image_url TEXT DEFAULT '',
        region_slug TEXT DEFAULT 'india',
        updated_at TEXT NOT NULL,
        UNIQUE(cart_id, product_id, variant_code)
      );
      DROP TABLE cart_items;
      ALTER TABLE cart_items_new RENAME TO cart_items;
    `);
    db.exec('PRAGMA foreign_keys = ON;');
  } else {
    // Ensure snapshot columns exist on already-migrated cart_items
    const cols = new Set(db.prepare('PRAGMA table_info(cart_items);').all().map((c) => c.name));
    const additions = [
      ['sku', "TEXT DEFAULT ''"],
      ['title', "TEXT DEFAULT ''"],
      ['slug', "TEXT DEFAULT ''"],
      ['vendor_brand', "TEXT DEFAULT ''"],
      ['unit_price_ils', 'REAL DEFAULT 0'],
      ['net_weight_grams', 'INTEGER DEFAULT 250'],
      ['primary_image_url', "TEXT DEFAULT ''"],
      ['region_slug', "TEXT DEFAULT 'india'"]
    ];
    for (const [col, def] of additions) {
      if (!cols.has(col)) {
        db.exec(`ALTER TABLE cart_items ADD COLUMN ${col} ${def};`);
      }
    }
  }

  const revFks = db.prepare('PRAGMA foreign_key_list(product_reviews);').all();
  if (revFks.some((fk) => fk.table === 'products')) {
    db.exec('PRAGMA foreign_keys = OFF;');
    db.exec(`
      CREATE TABLE product_reviews_new (
        id TEXT PRIMARY KEY,
        product_id TEXT NOT NULL,
        user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        author_name TEXT NOT NULL,
        rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        is_verified_purchase INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
      );
      DROP TABLE product_reviews;
      ALTER TABLE product_reviews_new RENAME TO product_reviews;
    `);
    db.exec('PRAGMA foreign_keys = ON;');
  }

  // Drop legacy hardcoded local `products` table if present so Supabase is the sole source of truth
  const legacyProdTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='products'").get();
  if (legacyProdTable) {
    db.exec('DROP TABLE IF EXISTS products;');
  }
}

const NAVIGATION_SPEC = [
  {
    name: 'Shop by Region',
    name_he: 'קנייה לפי מדינה',
    slug: 'shop-by-region',
    description: 'Explore authentic imported groceries from India, Thailand, Sri Lanka, and the Philippines.',
    subcategories: []
  },
  {
    name: 'Sweets',
    name_he: 'ממתקים וקינוחים',
    slug: 'sweets',
    description: 'Imported biscuits, traditional Indian mithai, chocolates, mochi, jellies, and artisan cookies.',
    subcategories: [
      { name: 'Chocolates', name_he: 'שוקולדים', slug: 'chocolates' },
      { name: 'Candy', name_he: 'סוכריות', slug: 'candy' },
      { name: 'Cookies', name_he: 'עוגיות וביסקוויטים', slug: 'cookies' },
      { name: 'Jelly', name_he: 'ג׳לי וקינוחי פרי', slug: 'jelly' },
      { name: 'Cakes', name_he: 'עוגות ומתוקים מסורתיים', slug: 'cakes' },
      { name: 'Mochi', name_he: 'מוצ׳י', slug: 'mochi' }
    ]
  },
  {
    name: 'Snacks',
    name_he: 'חטיפים מלוחים',
    slug: 'snacks',
    description: 'Crispy rusks, savory snacks, chips, crackers, seafood snacks, and roasted nuts.',
    subcategories: [
      { name: 'Chips, Crisps & Puffs', name_he: 'צ׳יפס וחטיפים תפוחים', slug: 'chips-crisps-puffs' },
      { name: 'Crackers & Buns', name_he: 'קרקרים, טוסטים ומאפים', slug: 'crackers-buns' },
      { name: 'Seafood Snacks', name_he: 'חטיפי ים ואצות', slug: 'seafood-snacks' },
      { name: 'Nuts & Seeds', name_he: 'אגוזים, קטניות וגרעינים', slug: 'nuts-seeds' }
    ]
  },
  {
    name: 'Pantry',
    name_he: 'מזווה ובישול',
    slug: 'pantry',
    description: 'Extra-long basmati rice, traditional noodles, specialty flours, spreads & cheese, and natural unrefined cane jaggery.',
    subcategories: [
      { name: 'Rice', name_he: 'אורז בסמטי ואורז אסייתי', slug: 'rice' },
      { name: 'Noodles', name_he: 'אטריות יבשות', slug: 'noodles' },
      { name: 'Flour', name_he: 'קמחים מיוחדים', slug: 'flour' },
      { name: 'Sugar', name_he: 'סוכר קנים וג׳אגרי טבעי', slug: 'sugar' },
      { name: 'Spreads & Dairy', name_he: 'ממרחים וגבינות', slug: 'spreads-dairy' }
    ]
  },
  {
    name: 'Drinks',
    name_he: 'משקאות ותה',
    slug: 'drinks',
    description: 'Imported coffees, tropical fruit nectars, soy & coconut milks, teas, and sodas.',
    subcategories: [
      { name: 'Coffee', name_he: 'קפה קר ופחיות קפה', slug: 'coffee' },
      { name: 'Juice', name_he: 'מיצים ונקטר פירות טרופיים', slug: 'juice' },
      { name: 'Soy & Milk', name_he: 'משקאות סויה, קוקוס וחלב', slug: 'soy-milk' },
      { name: 'Tea', name_he: 'תה ירוק, צ׳אי וחליטות', slug: 'tea' },
      { name: 'Soda', name_he: 'משקאות מוגזים אסייתיים', slug: 'soda' }
    ]
  },
  {
    name: 'Canned & Jarred Goods',
    name_he: 'שימורים וצנצנות',
    slug: 'canned-jarred-goods',
    description: 'Traditional canned Indian sweets, pickled vegetables, canned meats, and tropical fruits.',
    subcategories: [
      { name: 'Canned & Jarred Meats', name_he: 'שימורי בשר ודגים', slug: 'canned-jarred-meats' },
      { name: 'Canned & Jarred Vegetables', name_he: 'ירקות כבושים ומוחמצים', slug: 'canned-jarred-vegetables' },
      { name: 'Canned & Jarred Fruits', name_he: 'שימורי פירות ומתוקים בסירופ', slug: 'canned-jarred-fruits' }
    ]
  },
  {
    name: 'Sauce & Seasoning',
    name_he: 'רטבים ותבלינים',
    slug: 'sauce-seasoning',
    description: 'Authentic soy sauces, vinegars, ketchups, hot sauces, dressings, dipping sauces, and spices.',
    subcategories: [
      { name: 'Soy Sauces', name_he: 'רוטב סויה', slug: 'soy-sauces' },
      { name: 'Vinegars', name_he: 'חומץ אורז וחומץ קנים', slug: 'vinegars' },
      { name: 'Ketchups', name_he: 'קטשופ ורטבי עגבניות', slug: 'ketchups' },
      { name: 'Hot Sauces', name_he: 'רטבים חריפים ושמן צ׳ילי', slug: 'hot-sauces' },
      { name: 'Dressings', name_he: 'רטבים לסלט ושומשום', slug: 'dressings' },
      { name: 'Dipping Sauces', name_he: 'רטבי טבילה וצ׳ילי מתוק', slug: 'dipping-sauces' },
      { name: 'Spices & Seasonings', name_he: 'משחות קארי, מסאלה ותבלינים', slug: 'spices-seasonings' }
    ]
  },
  {
    name: 'Instant Foods',
    name_he: 'אוכל מהיר וראמן',
    slug: 'instant-foods',
    description: 'Instant noodles & ramen, ready-to-eat meals, and instant soups.',
    subcategories: [
      { name: 'Instant Noodles & Ramen', name_he: 'ראמן ואטריות להכנה מהירה', slug: 'instant-noodles-ramen' },
      { name: 'Hot Pot & Meals', name_he: 'ארוחות מוכנות והוט-פוט', slug: 'hot-pot-meals' },
      { name: 'Soups', name_he: 'מרקים מהירים', slug: 'soups' }
    ]
  }
];

/**
 * STRICTLY THE 4 APPROVED SOURCING REGIONS:
 * India, Thailand, Sri Lanka, and the Philippines
 */
const REGIONS_SPEC = [
  {
    name: 'India',
    name_he: 'הודו',
    slug: 'india',
    iso_code: 'IN',
    flag_emoji: '',
    description: 'Authentic Indian groceries, cookies & sweets, aged Basmati rice, natural jaggery, and pantry essentials.'
  },
  {
    name: 'Thailand',
    name_he: 'תאילנד',
    slug: 'thailand',
    iso_code: 'TH',
    flag_emoji: '',
    description: 'Authentic Thai kitchen ingredients, curry pastes, coconut milk, sauces, and snacks.'
  },
  {
    name: 'Sri Lanka',
    name_he: 'סרי לנקה',
    slug: 'sri-lanka',
    iso_code: 'LK',
    flag_emoji: '',
    description: 'Authentic Sri Lankan spices, Ceylon teas, coconut staples, and traditional treats.'
  },
  {
    name: 'Philippines',
    name_he: 'הפיליפינים',
    slug: 'philippines',
    iso_code: 'PH',
    flag_emoji: '',
    description: 'Authentic Philippine pantry favorites, sauces, vinegars, and beloved Pinoy snacks.'
  }
];

function seedAndSyncDatabase() {
  const now = new Date().toISOString();

  // 1. Seed & Sync Categories & Subcategories (Excluding Mighty Rewards)
  const upsertCat = db.prepare(`
    INSERT INTO categories (id, parent_slug, name, name_he, slug, description, display_order, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    ON CONFLICT(slug) DO UPDATE SET
      parent_slug = excluded.parent_slug,
      name = excluded.name,
      name_he = excluded.name_he,
      description = excluded.description,
      display_order = excluded.display_order,
      is_active = 1
  `);
  NAVIGATION_SPEC.forEach((cat, idx) => {
    upsertCat.run(crypto.randomUUID(), null, cat.name, cat.name_he, cat.slug, cat.description, idx + 1);
    cat.subcategories.forEach((sub, sIdx) => {
      upsertCat.run(crypto.randomUUID(), cat.slug, sub.name, sub.name_he, sub.slug, `${cat.name}: ${sub.name}`, sIdx + 1);
    });
  });
  db.exec(`UPDATE categories SET description = REPLACE(description, '\u2014', ':');`);

  // 2. Enforce strictly the 4 sourcing regions: India, Thailand, Sri Lanka, Philippines
  db.exec(`DELETE FROM regions WHERE slug NOT IN ('india', 'thailand', 'sri-lanka', 'philippines');`);
  const upsertReg = db.prepare(`
    INSERT INTO regions (id, name, name_he, slug, iso_code, flag_emoji, description, display_order, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    ON CONFLICT(slug) DO UPDATE SET
      name = excluded.name,
      name_he = excluded.name_he,
      iso_code = excluded.iso_code,
      flag_emoji = excluded.flag_emoji,
      description = excluded.description,
      display_order = excluded.display_order,
      is_active = 1
  `);
  REGIONS_SPEC.forEach((reg, idx) => {
    upsertReg.run(crypto.randomUUID(), reg.name, reg.name_he, reg.slug, reg.iso_code, reg.flag_emoji, reg.description, idx + 1);
  });

  // 3. Seed Configurable Israeli Shipping Zones if empty
  const zoneCount = db.prepare('SELECT COUNT(*) AS cnt FROM shipping_zones').get().cnt;
  if (zoneCount === 0) {
    const insertZone = db.prepare(`
      INSERT INTO shipping_zones (zone_code, name_en, name_he, cities_text, standard_rate_ils, express_rate_ils, locker_rate_ils, free_threshold_ils, estimated_days, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);
    insertZone.run('IL-Z1', 'Gush Dan & Center', 'גוש דן והמרכז', 'Tel Aviv, Ramat Gan, Givatayim, Holon, Bat Yam, Petah Tikva, Rishon LeZion, Bnei Brak, Or Yehuda', 29.0, 49.0, 19.0, 250.0, '1–2 Business Days');
    insertZone.run('IL-Z2', 'Sharon & Shfela', 'השרון והשפלה', 'Herzliya, Ra’anana, Kfar Saba, Netanya, Hod HaSharon, Rehovot, Ness Ziona, Modi’in, Ramla, Lod, Ashdod', 32.0, 55.0, 19.0, 250.0, '1–3 Business Days');
    insertZone.run('IL-Z3', 'Jerusalem, Haifa & North', 'ירושלים, חיפה והצפון', 'Jerusalem, Beit Shemesh, Haifa, Krayot, Acre, Nahariya, Karmiel, Tiberias, Afula, Hadera', 35.0, 69.0, 22.0, 280.0, '2–4 Business Days');
    insertZone.run('IL-Z4', 'South & Negev', 'הדרום והנגב', 'Ashkelon, Be’er Sheva, Kiryat Gat, Sderot, Netivot, Ofakim, Yavne', 35.0, null, 22.0, 280.0, '2–4 Business Days');
    insertZone.run('IL-Z5', 'Eilat, Arava & Remote Areas', 'אילת, הערבה ויישובים מרוחקים', 'Eilat, Mitzpe Ramon, Arava, Dead Sea, Golan Heights', 49.0, null, 29.0, 350.0, '3–6 Business Days');
  }

  // 4. Seed Promotional Discounts if empty
  const discCount = db.prepare('SELECT COUNT(*) AS cnt FROM discounts').get().cnt;
  if (discCount === 0) {
    const insertDisc = db.prepare(`
      INSERT INTO discounts (id, code, description, discount_type, discount_value, min_order_ils, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `);
    insertDisc.run(crypto.randomUUID(), 'WELCOME10', '10% Off Your First Dinu Market Order', 'percentage', 10, 80);
    insertDisc.run(crypto.randomUUID(), 'DINU25', '₪25 Off Orders Over ₪200', 'fixed', 25, 200);
    insertDisc.run(crypto.randomUUID(), 'FREESHIP', 'Free Standard Delivery Across Israel (Orders ₪120+)', 'free_shipping', 0, 120);
  }

  // 5. Seed Default Store Settings if empty & ensure live delivery/contact settings exist
  const existingPayRow = db.prepare("SELECT value_json FROM store_settings WHERE key = 'payment_config'").get();
  const basePayConfig = {
    gateway_primary: 'PayPlus Israel (PCI-DSS Level 1)',
    gateway_secondary: 'PayPal Commerce',
    supported_methods: ['credit_card', 'bit', 'apple_pay', 'google_pay', 'paypal'],
    supported_cards: ['Visa', 'Mastercard', 'American Express', 'Isracard', 'Diners'],
    max_installments: 3,
    min_order_for_installments_ils: 200,
    vat_rate_percent: 18,
    auto_tax_invoice: true,
    order_cutoff_time: '14:00',
    support_email: 'support@dinumarket.co.il',
    support_phone: '054-812-4900',
    whatsapp_e164: '972548124900'
  };
  const mergedPayConfig = existingPayRow
    ? { ...basePayConfig, ...JSON.parse(existingPayRow.value_json || '{}') }
    : basePayConfig;
  db.prepare(`INSERT OR REPLACE INTO store_settings (key, value_json) VALUES (?, ?)`).run(
    'payment_config',
    JSON.stringify(mergedPayConfig)
  );

  // 6. Seed Demo Admin & Customer Accounts if empty
  const userCount = db.prepare('SELECT COUNT(*) AS cnt FROM users').get().cnt;
  if (userCount === 0) {
    const insertUser = db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, phone, role, email_verified, marketing_opt_in, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, 1, ?)
    `);
    const adminId = crypto.randomUUID();
    const custId = crypto.randomUUID();

    insertUser.run(adminId, 'admin@dinumarket.co.il', hashPassword('AdminDinu2026!'), 'Dinu Market Administrator', '054-800-1000', 'super_admin', now);
    insertUser.run(custId, 'customer@dinumarket.co.il', hashPassword('Customer2026!'), 'Maya Shapira', '052-555-7890', 'customer', now);

    db.prepare(`
      INSERT INTO customer_addresses (id, user_id, label, recipient_name, phone, city, zone_code, street_address, apartment_floor, entrance_code, postal_code, delivery_notes, is_default, created_at)
      VALUES (?, ?, 'Home', 'Maya Shapira', '052-555-7890', 'Tel Aviv-Yafo', 'IL-Z1', 'Dizengoff St 124', 'Floor 3, Apt 9', '1234#', '6433221', 'Please leave package by the door and send SMS', 1, ?)
    `).run(crypto.randomUUID(), custId, now);
  }
}

/**
 * Deterministic Atomic Guest-to-Account Basket Synchronization
 */
function mergeGuestCartIntoUserCart(sessionToken, userId, productMap = null) {
  if (!userId) return null;
  const now = new Date().toISOString();

  db.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    const guestCart = sessionToken
      ? db.prepare('SELECT * FROM carts WHERE session_token = ? AND user_id IS NULL').get(sessionToken)
      : null;

    let userCart = db.prepare('SELECT * FROM carts WHERE user_id = ?').get(userId);

    if (!userCart) {
      if (guestCart) {
        db.prepare('UPDATE carts SET user_id = ?, session_token = NULL, updated_at = ? WHERE id = ?').run(userId, now, guestCart.id);
        db.exec('COMMIT;');
        return guestCart.id;
      } else {
        const newId = crypto.randomUUID();
        db.prepare('INSERT INTO carts (id, user_id, session_token, updated_at) VALUES (?, ?, NULL, ?)').run(newId, userId, now);
        db.exec('COMMIT;');
        return newId;
      }
    }

    if (guestCart && guestCart.id !== userCart.id) {
      const guestItems = db.prepare('SELECT * FROM cart_items WHERE cart_id = ?').all(guestCart.id);
      for (const item of guestItems) {
        const liveProd = productMap ? productMap.get(String(item.product_id)) : null;
        const maxStock = liveProd ? Math.max(1, liveProd.stock_quantity) : 99;

        const existing = db.prepare(
          'SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ? AND variant_code = ?'
        ).get(userCart.id, item.product_id, item.variant_code);

        if (existing) {
          const mergedQty = Math.min(existing.quantity + item.quantity, maxStock, 99);
          db.prepare('UPDATE cart_items SET quantity = ?, updated_at = ? WHERE id = ?').run(mergedQty, now, existing.id);
        } else {
          const cappedQty = Math.min(item.quantity, maxStock, 99);
          db.prepare(`
            INSERT INTO cart_items (
              id, cart_id, product_id, variant_code, variant_label, price_multiplier, quantity,
              sku, title, slug, vendor_brand, unit_price_ils, net_weight_grams, primary_image_url, region_slug, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            crypto.randomUUID(),
            userCart.id,
            item.product_id,
            item.variant_code,
            item.variant_label,
            item.price_multiplier,
            cappedQty,
            item.sku || '',
            item.title || '',
            item.slug || '',
            item.vendor_brand || '',
            item.unit_price_ils || 0,
            item.net_weight_grams || 250,
            item.primary_image_url || '',
            item.region_slug || 'india',
            now
          );
        }
      }

      if (guestCart.discount_code && !userCart.discount_code) {
        db.prepare('UPDATE carts SET discount_code = ?, updated_at = ? WHERE id = ?').run(guestCart.discount_code, now, userCart.id);
      }

      db.prepare('DELETE FROM carts WHERE id = ?').run(guestCart.id);
    }

    db.exec('COMMIT;');
    return userCart.id;
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

/**
 * Hydrate persistent shopping basket using live Supabase product records (`productMap`)
 * so price or stock updates in Supabase reflect immediately in the customer's basket.
 */
function getHydratedCart({
  userId,
  sessionToken,
  zoneCode = 'IL-Z1',
  deliveryMethod = 'standard',
  productMap = null
}) {
  const now = new Date().toISOString();
  let cart = null;

  if (userId) {
    cart = db.prepare('SELECT * FROM carts WHERE user_id = ?').get(userId);
    if (!cart) {
      const id = crypto.randomUUID();
      db.prepare('INSERT INTO carts (id, user_id, session_token, updated_at) VALUES (?, ?, NULL, ?)').run(id, userId, now);
      cart = db.prepare('SELECT * FROM carts WHERE id = ?').get(id);
    }
  } else if (sessionToken) {
    cart = db.prepare('SELECT * FROM carts WHERE session_token = ? AND user_id IS NULL').get(sessionToken);
    if (!cart) {
      const id = crypto.randomUUID();
      db.prepare('INSERT INTO carts (id, user_id, session_token, updated_at) VALUES (?, NULL, ?, ?)').run(id, sessionToken, now);
      cart = db.prepare('SELECT * FROM carts WHERE id = ?').get(id);
    }
  }

  if (!cart) {
    return { items: [], item_count: 0, subtotal_ils: 0, discount_amount_ils: 0, shipping_cost_ils: 0, total_ils: 0 };
  }

  const rawItems = db.prepare(`
    SELECT * FROM cart_items
    WHERE cart_id = ?
    ORDER BY updated_at DESC
  `).all(cart.id);

  let subtotal = 0;
  let totalQuantity = 0;
  let totalWeightGrams = 0;

  const items = [];
  for (const row of rawItems) {
    const liveProd = productMap ? productMap.get(String(row.product_id)) : null;
    // If productMap is loaded & active (non-empty) and the product was deleted from Supabase, skip it
    if (productMap && productMap.size > 0 && !liveProd) {
      continue;
    }

    const basePrice = liveProd ? Number(liveProd.price_ils) : Number(row.unit_price_ils || 0);
    const multiplier = Number(row.price_multiplier || 1.0);
    const unitPrice = Number((basePrice * multiplier).toFixed(2));
    const lineTotal = Number((unitPrice * row.quantity).toFixed(2));
    const netWeight = liveProd ? Number(liveProd.net_weight_grams || 250) : Number(row.net_weight_grams || 250);

    subtotal += lineTotal;
    totalQuantity += row.quantity;
    totalWeightGrams += netWeight * row.quantity;

    items.push({
      cart_item_id: row.id,
      product_id: String(row.product_id),
      variant_code: row.variant_code,
      variant_label: row.variant_label,
      price_multiplier: multiplier,
      quantity: row.quantity,
      sku: liveProd ? liveProd.sku : row.sku,
      title: liveProd ? liveProd.title : row.title,
      title_he: liveProd ? liveProd.title_he || '' : '',
      i18n: liveProd ? liveProd.i18n || {} : {},
      slug: liveProd ? liveProd.slug : row.slug,
      vendor_brand: liveProd ? liveProd.vendor_brand : row.vendor_brand,
      base_price_ils: basePrice,
      compare_at_price_ils: liveProd ? liveProd.compare_at_price_ils : null,
      net_weight_grams: netWeight,
      stock_quantity: liveProd ? liveProd.stock_quantity : 99,
      primary_image_url: liveProd ? liveProd.primary_image_url : row.primary_image_url || '/images/brand/product-placeholder.svg',
      region_slug: liveProd ? liveProd.region_slug : row.region_slug || 'india',
      unit_price_ils: unitPrice,
      line_total_ils: lineTotal
    });
  }

  subtotal = Number(subtotal.toFixed(2));

  let discountAmount = 0;
  let appliedDiscount = null;
  let freeShippingFromCoupon = false;

  if (cart.discount_code) {
    const disc = db.prepare('SELECT * FROM discounts WHERE UPPER(code) = UPPER(?) AND is_active = 1').get(cart.discount_code);
    if (disc && subtotal >= disc.min_order_ils) {
      appliedDiscount = disc;
      if (disc.discount_type === 'percentage') {
        discountAmount = Number(((subtotal * disc.discount_value) / 100).toFixed(2));
      } else if (disc.discount_type === 'fixed') {
        discountAmount = Math.min(subtotal, disc.discount_value);
      } else if (disc.discount_type === 'free_shipping') {
        freeShippingFromCoupon = true;
      }
    }
  }

  const discountedSubtotal = Number(Math.max(0, subtotal - discountAmount).toFixed(2));

  const zone = db.prepare('SELECT * FROM shipping_zones WHERE zone_code = ?').get(zoneCode) ||
    db.prepare('SELECT * FROM shipping_zones WHERE zone_code = ?').get('IL-Z1');

  const freeShippingThreshold = zone ? zone.free_threshold_ils : 250;
  const amountRemainingForFreeShipping = Number(Math.max(0, freeShippingThreshold - discountedSubtotal).toFixed(2));
  const qualifiesForFreeStandard = discountedSubtotal >= freeShippingThreshold || freeShippingFromCoupon;

  let shippingCost = 0;
  if (items.length > 0 && zone) {
    if (deliveryMethod === 'express' && zone.express_rate_ils !== null) {
      shippingCost = zone.express_rate_ils;
    } else if (deliveryMethod === 'locker') {
      shippingCost = qualifiesForFreeStandard ? 0 : zone.locker_rate_ils;
    } else {
      shippingCost = qualifiesForFreeStandard ? 0 : zone.standard_rate_ils;
    }
    if (totalWeightGrams > 20000) {
      shippingCost += 15;
    }
  }

  const finalTotal = Number((discountedSubtotal + shippingCost).toFixed(2));
  const vatIncluded = Number((finalTotal - finalTotal / 1.18).toFixed(2));

  return {
    cart_id: cart.id,
    user_id: cart.user_id,
    items,
    item_count: totalQuantity,
    total_weight_grams: totalWeightGrams,
    subtotal_ils: subtotal,
    discount_code: appliedDiscount ? appliedDiscount.code : null,
    discount_description: appliedDiscount ? appliedDiscount.description : null,
    discount_amount_ils: discountAmount,
    discounted_subtotal_ils: discountedSubtotal,
    zone_code: zone ? zone.zone_code : 'IL-Z1',
    zone_name: zone ? zone.name_en : 'Gush Dan & Center',
    delivery_method: deliveryMethod,
    free_shipping_threshold_ils: freeShippingThreshold,
    amount_to_free_shipping_ils: amountRemainingForFreeShipping,
    qualifies_for_free_shipping: qualifiesForFreeStandard,
    shipping_cost_ils: Number(shippingCost.toFixed(2)),
    vat_included_ils: vatIncluded,
    total_ils: finalTotal
  };
}

initSchema();
seedAndSyncDatabase();

module.exports = {
  db,
  NAVIGATION_SPEC,
  REGIONS_SPEC,
  mergeGuestCartIntoUserCart,
  getHydratedCart
};
