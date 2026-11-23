/**
 * DINU MARKET: Persistent SQLite / Supabase-Compatible Relational Database Layer
 * Uses Node.js 24 native `node:sqlite` (`DatabaseSync`) with ACID transactions.
 *
 * Regions configured strictly per business specification:
 * 1. India
 * 2. Thailand
 * 3. Sri Lanka
 * 4. Philippines
 *
 * All 6 currently uploaded products (from Source Information/Products) are placed under
 * the Indian region (`region_slug = 'india'`) and include translations for
 * English, Hebrew, Indian (Hindi), Thai, Sri Lankan (Sinhala), and Philippine (Filipino).
 */

const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const { hashPassword } = require('./security');

const DATA_DIR = path.join(__dirname, 'data');
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

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      sku TEXT UNIQUE NOT NULL,
      barcode_ean TEXT DEFAULT '',
      title TEXT NOT NULL,
      title_he TEXT DEFAULT '',
      slug TEXT UNIQUE NOT NULL,
      vendor_brand TEXT NOT NULL,
      category_slug TEXT NOT NULL,
      subcategory_slug TEXT NOT NULL,
      region_slug TEXT NOT NULL,
      short_description TEXT NOT NULL,
      description TEXT NOT NULL,
      ingredients TEXT DEFAULT '',
      allergens_json TEXT NOT NULL DEFAULT '[]',
      dietary_tags_json TEXT NOT NULL DEFAULT '[]',
      red_labels_json TEXT NOT NULL DEFAULT '[]',
      nutrition_json TEXT NOT NULL DEFAULT '{}',
      i18n_json TEXT NOT NULL DEFAULT '{}',
      storage_instructions TEXT DEFAULT 'Store in a cool, dry place away from direct sunlight.',
      importer_israel TEXT DEFAULT 'Dinu Market Imports Ltd., Israel',
      price_ils REAL NOT NULL,
      compare_at_price_ils REAL,
      net_weight_grams INTEGER NOT NULL DEFAULT 250,
      unit_measure_type TEXT NOT NULL DEFAULT '100g',
      stock_quantity INTEGER NOT NULL DEFAULT 40,
      low_stock_threshold INTEGER NOT NULL DEFAULT 8,
      expiry_date TEXT DEFAULT '2027-06-06',
      primary_image_url TEXT NOT NULL,
      secondary_image_url TEXT DEFAULT '',
      variants_json TEXT NOT NULL DEFAULT '[]',
      rating_average REAL NOT NULL DEFAULT 4.8,
      rating_count INTEGER NOT NULL DEFAULT 14,
      sales_count INTEGER NOT NULL DEFAULT 25,
      is_authentic_photo INTEGER NOT NULL DEFAULT 1,
      is_featured INTEGER NOT NULL DEFAULT 1,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS product_reviews (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
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
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      variant_code TEXT NOT NULL DEFAULT 'single',
      variant_label TEXT NOT NULL DEFAULT 'Single Pack',
      price_multiplier REAL NOT NULL DEFAULT 1.0,
      quantity INTEGER NOT NULL CHECK (quantity > 0 AND quantity <= 99),
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

  // Add i18n_json column to products if upgrading existing DB
  try {
    db.exec(`ALTER TABLE products ADD COLUMN i18n_json TEXT NOT NULL DEFAULT '{}';`);
  } catch {
    // Column already exists
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
    description: 'Authentic Indian groceries, Haldiram’s cookies & sweets, Lal Qilla Basmati rice, natural jaggery, and pantry essentials.'
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

const DEFAULT_VARIANTS = JSON.stringify([
  { code: 'single', label: 'Single Pack (1x)', multiplier: 1.0 },
  { code: 'bundle3', label: 'Value 3-Pack (Save 6%)', multiplier: 2.82 },
  { code: 'case6', label: 'Pantry Case of 6 (Save 12%)', multiplier: 5.28 }
]);

/**
 * All currently uploaded products are placed under the Indian region (`region_slug = 'india'`)
 * with multi-language translations for English (en), Hebrew (he), Indian/Hindi (hi), Thai (th),
 * Sri Lankan/Sinhala (si), and Philippine/Filipino (tl).
 */
const SEED_PRODUCTS = [
  {
    sku: 'DM-IN-001',
    barcode_ean: '8904004416091',
    title: "Haldiram's Gorus Premium Handmade Cookies (250g)",
    title_he: "עוגיות גורוס פרימיום האלדירם 250 גרם",
    slug: 'haldirams-gorus-premium-cookies-250g',
    vendor_brand: "Haldiram's",
    category_slug: 'sweets',
    subcategory_slug: 'cookies',
    region_slug: 'india',
    short_description: 'Crunchy golden Indian bakery biscuits crafted with wheat, cashews, and aromatic cardamom. Authentic Dinu Market shelf item.',
    description: 'Live life at its crunchiest with Haldiram’s Gorus Cookies, the perfect bite of crunchy delight to pair with hot masala chai or coffee. Baked in Nagpur, India and officially imported to Israel with full nutritional labeling.',
    ingredients: 'Refined Wheat Flour (Maida), Sugar, Edible Vegetable Oil, Cashews, Milk Solids, Liquid Glucose, Raising Agent [INS 500(ii)].',
    allergens_json: JSON.stringify(['Wheat (Gluten)', 'Cashews (Tree Nuts)', 'Milk', 'May contain Almond, Peanut, Mustard, Sesame & Soy']),
    dietary_tags_json: JSON.stringify(['Vegetarian']),
    red_labels_json: JSON.stringify(['High Sugar (סוכר בכמות גבוהה)', 'High Saturated Fat (שומן רווי בכמות גבוהה)']),
    nutrition_json: JSON.stringify({
      calories_per_100g: 519,
      protein_g: 7.4,
      carbs_g: 58.8,
      sugars_g: 26.0,
      total_fat_g: 27.6,
      saturated_fat_g: 12.2,
      trans_fat_g: '<0.5',
      sodium_mg: 46
    }),
    i18n_json: JSON.stringify({
      en: {
        title: "Haldiram's Gorus Premium Handmade Cookies (250g)",
        description: 'Live life at its crunchiest with Haldiram’s Gorus Cookies, the perfect bite of crunchy delight to pair with hot masala chai or coffee. Baked in Nagpur, India and officially imported to Israel with full nutritional labeling.'
      },
      he: {
        title: "עוגיות גורוס פרימיום האלדירם (250 גרם)",
        description: 'עוגיות מאפייה הודיות פריכות וזהובות עם קשיו והל ארומטי, מושלמות לצד צ׳אי מסאלה חם או קפה.'
      },
      hi: {
        title: "हल्दीराम गोरस प्रीमियम हैंडमेड कुकीज़ (250g)",
        description: 'गेहूं, काजू और सुगंधित इलायची से बने कुरकुरे सुनहरे भारतीय बेकरी बिस्कुट।'
      },
      th: {
        title: "ฮัลดีรามส์ โกรัส คุกกี้ทำมือพรีเมียม (250 กรัม)",
        description: 'คุกกี้อบกรอบสีทองสไตล์อินเดีย ผสมเม็ดมะม่วงหิมพานต์และกระวานหอมกรุ่น'
      },
      si: {
        title: "හල්දිරාම්ස් ගෝරස් ප්‍රීමියම් අතින් සාදන ලද කුකීස් (250g)",
        description: 'තිරිඟු, කජු සහ සුවඳැති එනසාල් වලින් නිමවූ රන්වන් හැපෙනසුළු බිස්කට්.'
      },
      tl: {
        title: "Haldiram's Gorus Premium Handmade Cookies (250g)",
        description: 'Malutong na gintong biskwit na gawa sa trigo, kasoy, at mabangong cardamom.'
      }
    }),
    importer_israel: 'Maharaja Ltd., HaAvoda 32, Ashdod, Israel',
    price_ils: 15.00,
    compare_at_price_ils: null,
    net_weight_grams: 250,
    unit_measure_type: '100g',
    stock_quantity: 45,
    expiry_date: '2027-06-06',
    primary_image_url: 'images/products/gorus-cookies-front.png?v=20261123prod1',
    secondary_image_url: 'images/products/gorus-cookies-back.jpg',
    is_authentic_photo: 1,
    is_featured: 1,
    rating_average: 4.9,
    rating_count: 1,
    sales_count: 140
  },
  {
    sku: 'DM-IN-002',
    barcode_ean: '8904004417319',
    title: "Haldiram's Rusky Whole Wheat Atta Toast (250g)",
    title_he: "טוסט חיטה מלאה ראסקי האלדירם 250 גרם",
    slug: 'haldirams-rusky-whole-wheat-atta-toast-250g',
    vendor_brand: "Haldiram's",
    category_slug: 'snacks',
    subcategory_slug: 'crackers-buns',
    region_slug: 'india',
    short_description: 'Twice-baked crispy whole wheat atta bread toast (rusk), trans-fat free and rich in dietary fibre for dipping into hot tea.',
    description: 'Haldiram’s Rusky Atta Toast is a classic Indian tea-time staple baked with whole wheat flour for a wholesome, golden crunch. Trans-fat free and a natural source of dietary fibre.',
    ingredients: 'Whole Wheat Flour (Atta), Sugar, Edible Vegetable Oil, Yeast, Milk Solids, Salt, Cardamom.',
    allergens_json: JSON.stringify(['Wheat (Gluten)', 'Milk', 'May contain Soy & Sesame']),
    dietary_tags_json: JSON.stringify(['Vegetarian', 'Trans-Fat Free', 'High Fibre']),
    red_labels_json: JSON.stringify(['High Sugar (סוכר בכמות גבוהה)']),
    nutrition_json: JSON.stringify({
      calories_per_100g: 435,
      protein_g: 9.8,
      carbs_g: 72.4,
      sugars_g: 21.0,
      total_fat_g: 11.2,
      saturated_fat_g: 3.8,
      trans_fat_g: '0',
      sodium_mg: 240
    }),
    i18n_json: JSON.stringify({
      en: {
        title: "Haldiram's Rusky Whole Wheat Atta Toast (250g)",
        description: 'Twice-baked crispy whole wheat atta bread toast (rusk), trans-fat free and rich in dietary fibre.'
      },
      he: {
        title: "טוסט חיטה מלאה ראסקי האלדירם (250 גרם)",
        description: 'טוסט חיטה מלאה הודי פריך באפייה כפולה, ללא שומן טראנס ועשיר בסיבים תזונתיים.'
      },
      hi: {
        title: "हल्दीराम रस्की होल व्हीट आटा टोस्ट (250g)",
        description: 'गर्म चाय के साथ खाने के लिए दो बार बेक किया हुआ कुरकुरा साबुत गेहूं आटा टोस्ट (रस्क)।'
      },
      th: {
        title: "ฮัลดีรามส์ รัสกี้ ขนมปังปิ้งโฮลวีตอัตตา (250 กรัม)",
        description: 'ขนมปังโฮลวีตอบกรอบสองครั้ง ปราศจากไขมันทรานส์และมีใยอาหารสูง เหมาะทานคู่กับชาร้อน'
      },
      si: {
        title: "හල්දිරාම්ස් රස්කි සම්පූර්ණ තිරිඟු ආටා ටෝස්ට් (250g)",
        description: 'උණුසුම් තේ සමඟ රසවිඳීමට දෙවරක් පුළුස්සන ලද හැපෙනසුළු තිරිඟු පාන් ටෝස්ට්.'
      },
      tl: {
        title: "Haldiram's Rusky Whole Wheat Atta Toast (250g)",
        description: 'Malutong na whole wheat bread toast na walang trans-fat at mayaman sa fiber para sa mainit na tsaa.'
      }
    }),
    importer_israel: 'Maharaja Ltd., HaAvoda 32, Ashdod, Israel',
    price_ils: 13.00,
    compare_at_price_ils: null,
    net_weight_grams: 250,
    unit_measure_type: '100g',
    stock_quantity: 52,
    expiry_date: '2027-05-30',
    primary_image_url: 'images/products/rusky-atta-toast-front.jpg',
    secondary_image_url: 'images/products/rusky-atta-toast-back.jpg',
    is_authentic_photo: 1,
    is_featured: 1,
    rating_average: 4.8,
    rating_count: 1,
    sales_count: 118
  },
  {
    sku: 'DM-IN-003',
    barcode_ean: '8906042233463',
    title: 'Flavorz 100% Natural Unrefined Jaggery Cubes (500g Jar)',
    title_he: "ג'אגרי קוביות סוכר קנים טבעי לא מזוקק 500 גרם",
    slug: 'flavorz-natural-jaggery-cubes-500g',
    vendor_brand: 'Flavorz (Spice of India)',
    category_slug: 'pantry',
    subcategory_slug: 'sugar',
    region_slug: 'india',
    short_description: '100% natural unrefined sugar cane jaggery cubes (~50 cubes per jar) crafted on organic farms without chemical preservatives.',
    description: 'Traditional Indian unrefined cane sweetener (Gur / Jaggery) in convenient bite-sized 10g cubes. Retains natural trace minerals including iron, calcium, potassium, and magnesium. Ideal for sweetening masala chai, desserts, and savory curries.',
    ingredients: '100% Natural Unrefined Sugar Cane Juice.',
    allergens_json: JSON.stringify(['Packaged in a facility that handles Wheat, Peanuts, Tree Nuts, Soy, Sesame, Mustard & Dairy']),
    dietary_tags_json: JSON.stringify(['Vegan', 'Vegetarian', '100% Natural', 'Chemical-Free']),
    red_labels_json: JSON.stringify(['High Sugar (סוכר בכמות גבוהה)']),
    nutrition_json: JSON.stringify({
      calories_per_100g: 367,
      protein_g: 5.19,
      carbs_g: 64.0,
      sugars_g: 60.0,
      total_fat_g: 0.17,
      saturated_fat_g: 0.0,
      sodium_mg: 4.6,
      potassium_mg: 407,
      calcium_mg: 103,
      iron_mg: 8.35
    }),
    i18n_json: JSON.stringify({
      en: {
        title: 'Flavorz 100% Natural Unrefined Jaggery Cubes (500g Jar)',
        description: '100% natural unrefined sugar cane jaggery cubes (~50 cubes per jar) crafted on organic farms.'
      },
      he: {
        title: "קוביות ג׳אגרי סוכר קנים טבעי לא מזוקק פלייבורז (500 גרם)",
        description: 'קוביות סוכר קנים טבעי ולא מזוקק (ג׳אגרי) מחוות אורגניות ללא חומרים משמרים, עשיר במינרלים טבעיים.'
      },
      hi: {
        title: 'फ्लेवर्ज़ 100% प्राकृतिक अपरिष्कृत गुड़ क्यूब्स (500g जार)',
        description: 'जैविक खेतों में बिना किसी रसायन के तैयार किए गए 100% प्राकृतिक गन्ने के गुड़ के टुकड़े।'
      },
      th: {
        title: 'เฟลเวอร์ซ น้ำตาลอ้อยธรรมชาติไม่ขัดสีชนิดก้อน (กระปุก 500 กรัม)',
        description: 'น้ำตาลอ้อยธรรมชาติ 100% ไม่ผ่านการขัดสี ผลิตจากฟาร์มออร์แกนิก ปราศจากสารเคมี'
      },
      si: {
        title: 'ෆ්ලේවර්ස් 100% ස්වභාවික පිරිපහදු නොකළ උක් හකුරු කැට (500g)',
        description: 'කාබනික ගොවිපලවල රසායනික ද්‍රව්‍ය නොමැතිව නිපදවූ 100% ස්වභාවික උක් හකුරු කැට.'
      },
      tl: {
        title: 'Flavorz 100% Natural Unrefined Jaggery Cubes (500g Jar)',
        description: '100% natural na hindi-repinadong tubo (jaggery cubes) mula sa organikong sakahan.'
      }
    }),
    importer_israel: 'Shasha Yehoram Ltd., HaYetzira 23, Ramla, Israel (08-9209939)',
    price_ils: 22.00,
    compare_at_price_ils: null,
    net_weight_grams: 500,
    unit_measure_type: '100g',
    stock_quantity: 38,
    expiry_date: '2027-08-15',
    primary_image_url: 'images/products/flavorz-jaggery-front.jpg',
    secondary_image_url: 'images/products/flavorz-jaggery-back.jpg',
    is_authentic_photo: 1,
    is_featured: 1,
    rating_average: 4.9,
    rating_count: 1,
    sales_count: 96
  },
  {
    sku: 'DM-IN-006',
    barcode_ean: '079809001624',
    title: 'Silver Swan Special Soy Sauce 1 Liter Family Jug (1000 ml)',
    title_he: 'רוטב סויה מיוחד סילבר סוואן 1 ליטר',
    slug: 'silver-swan-special-soy-sauce-1000ml',
    vendor_brand: 'Silver Swan',
    category_slug: 'sauce-seasoning',
    subcategory_slug: 'soy-sauces',
    region_slug: 'philippines',
    short_description: 'Rich, savory soy sauce in a 1-liter handled jug, essential for stir-fries, marinades, rice dishes, and dipping sauces.',
    description: 'Silver Swan Special Soy Sauce delivers deep umami and balanced salinity in a generous 1000 ml handled bottle for everyday cooking, marinades, and table dipping.',
    ingredients: 'Water, Soybean Extract, Wheat, Iodized Salt, Caramel Color, Less than 0.1% Potassium Sorbate as preservative.',
    allergens_json: JSON.stringify(['Soybeans', 'Wheat (Gluten)']),
    dietary_tags_json: JSON.stringify(['Vegan', 'Vegetarian']),
    red_labels_json: JSON.stringify(['High Sodium (נתרן בכמות גבוהה)']),
    nutrition_json: JSON.stringify({
      calories_per_100g: 53,
      protein_g: 4.0,
      carbs_g: 6.7,
      sugars_g: 0.0,
      total_fat_g: 0.0,
      saturated_fat_g: 0.0,
      sodium_mg: 5800
    }),
    i18n_json: JSON.stringify({
      en: {
        title: 'Silver Swan Special Soy Sauce 1 Liter Jug (1000 ml)',
        description: 'Rich, savory soy sauce in a 1-liter handled jug, essential for stir-fries and marinades.'
      },
      he: {
        title: 'רוטב סויה מיוחד סילבר סוואן בקבוק 1 ליטר (1000 מ״ל)',
        description: 'רוטב סויה עשיר ומאוזן בבקבוק נוח של 1 ליטר עם ידית אחיזה למוקפצים, מרינדות ובישול יומיומי.'
      },
      hi: {
        title: 'सिल्वर स्वान स्पेशल सोया सॉस 1 लीटर जग (1000 मिली)',
        description: 'चाउमीन, फ्राइड राइस, मैरिनेड और स्टर-फ्राई के लिए 1 लीटर जग में स्वादिष्ट सोया सॉस।'
      },
      th: {
        title: 'ซิลเวอร์สวอน ซีอิ๊วสูตรพิเศษ แกลลอน 1 ลิตร (1000 มล.)',
        description: 'ซีอิ๊วรสกลมกล่อมในขวดหูหิ้วขนาด 1 ลิตร สำหรับผัด หมัก และจิ้มอาหาร'
      },
      si: {
        title: 'සිල්වර් ස්වාන් විශේෂ සෝයා සෝස් ලීටර් 1 බෝතලය (1000 ml)',
        description: 'බැදපු ආහාර, නූඩ්ල්ස් සහ මැරිනේඩ් සඳහා ලීටර් 1 බෝතලයක එන රසවත් සෝයා සෝස්.'
      },
      tl: {
        title: 'Silver Swan Special Soy Sauce Buy Pinoy Jug (1000 ml)',
        description: 'Ang paboritong toyo sa 1-litrong galon, perpekto para sa Adobo, Pancit, at sawsawan.'
      }
    }),
    importer_israel: 'Dinu Market Imports, Israel',
    price_ils: 19.00,
    compare_at_price_ils: null,
    net_weight_grams: 1000,
    unit_measure_type: '100ml',
    stock_quantity: 64,
    expiry_date: '2028-01-20',
    primary_image_url: 'images/products/silver-swan-soy-sauce-front.jpg?v=20261119',
    secondary_image_url: 'images/products/silver-swan-soy-sauce-back.jpg',
    is_authentic_photo: 1,
    is_featured: 1,
    rating_average: 4.9,
    rating_count: 1,
    sales_count: 215
  },
  {
    sku: 'DM-IN-004',
    barcode_ean: '8904004405910',
    title: "Haldiram's Gulab Jamun in Cardamom Rose Syrup (1 kg Tin)",
    title_he: "גולאב ג'אמון בסירופ הל האלדירם מארז 1 ק״ג (16 יח׳)",
    slug: 'haldirams-gulab-jamun-tin-1kg',
    vendor_brand: "Haldiram's",
    category_slug: 'canned-jarred-goods',
    subcategory_slug: 'canned-jarred-fruits',
    region_slug: 'india',
    short_description: '16 soft, melt-in-the-mouth milk-solid (khoa) dumplings steeped in fragrant cardamom syrup. Ready to warm and serve.',
    description: 'Haldiram’s Recipes Shaping Rituals Since 1937: authentic Indian Gulab Jamun crafted from rich khoa (milk solids) and delicately spiced with green cardamom. Contains 16 pieces (1 kg net weight / 430g drained weight). Simply warm before serving.',
    ingredients: 'Sugar, Water, Milk Solids (Khoa & Skimmed Milk Powder), Refined Wheat Flour (Maida), Palmolein Oil, Cardamom, Rose Water.',
    allergens_json: JSON.stringify(['Milk (Dairy)', 'Wheat (Gluten)']),
    dietary_tags_json: JSON.stringify(['Vegetarian']),
    red_labels_json: JSON.stringify(['High Sugar (סוכר בכמות גבוהה)', 'High Saturated Fat (שומן רווי בכמות גבוהה)']),
    nutrition_json: JSON.stringify({
      calories_per_100g: 312,
      protein_g: 4.2,
      carbs_g: 56.5,
      sugars_g: 46.0,
      total_fat_g: 8.1,
      saturated_fat_g: 3.9,
      sodium_mg: 35
    }),
    i18n_json: JSON.stringify({
      en: {
        title: "Haldiram's Gulab Jamun in Cardamom Rose Syrup (1 kg Tin)",
        description: '16 soft, melt-in-the-mouth khoa dumplings steeped in fragrant cardamom syrup.'
      },
      he: {
        title: "גולאב ג'אמון בסירופ הל וורדים האלדירם (פחית 1 ק״ג - 16 יחידות)",
        description: '16 כדורי חלב הודיים מסורתיים רכים ונימוחים בסירופ הל ומי ורדים ריחני. מוכן לחימום והגשה.'
      },
      hi: {
        title: "हल्दीराम गुलाब जामुन इलायची सिरप में (1 किग्रा टिन - 16 पीस)",
        description: 'सुगंधित इलायची और गुलाब की चाशनी में डूबे 16 नरम, मुंह में घुल जाने वाले खोया गुलाब जामुन।'
      },
      th: {
        title: "ฮัลดีรามส์ กุหลาบจามุนในน้ำเชื่อมกระวาน (กระป๋อง 1 กก. - 16 ชิ้น)",
        description: 'ขนมหวานอินเดียยอดนิยม 16 ชิ้น นุ่มละมุนลิ้นในน้ำเชื่อมหอมกลิ่นกระวานและน้ำดอกกุหลาบ'
      },
      si: {
        title: "හල්දිරාම්ස් ගුලාබ් ජමුන් එනසාල් සිරප් වල (1 kg ටින් - කෑලි 16)",
        description: 'සුවඳැති එනසාල් සහ රෝස සිරප් වල ගිල්වූ මෘදු කිරි රසකැවිලි කෑලි 16ක්.'
      },
      tl: {
        title: "Haldiram's Gulab Jamun sa Cardamom Syrup (1 kg Lata - 16 Piraso)",
        description: '16 na malambot na milk dumplings na ibinabad sa mabangong cardamom at rose syrup.'
      }
    }),
    importer_israel: 'Maharaja Ltd., HaAvoda 32, Ashdod, Israel',
    price_ils: 29.90,
    compare_at_price_ils: null,
    net_weight_grams: 1000,
    unit_measure_type: '100g',
    stock_quantity: 33,
    expiry_date: '2027-09-10',
    primary_image_url: 'images/products/haldirams-gulab-jamun-front.jpg',
    secondary_image_url: 'images/products/haldirams-gulab-jamun-back.jpg',
    is_authentic_photo: 1,
    is_featured: 1,
    rating_average: 5.0,
    rating_count: 1,
    sales_count: 164
  },
  {
    sku: 'DM-IN-005',
    barcode_ean: '8901161104762',
    title: 'Lal Qilla Supreme Sella Parboiled Extra-Long Basmati Rice (5 kg Bag)',
    title_he: 'אורז לבן בסמטי סופרים סלה לאל קילה שק 5 ק״ג (כשר בד״ץ)',
    slug: 'lal-qilla-supreme-sella-basmati-rice-5kg',
    vendor_brand: 'Lal Qilla (No. 4268)',
    category_slug: 'pantry',
    subcategory_slug: 'rice',
    region_slug: 'india',
    short_description: 'Royal aged extra-long grain parboiled sella basmati rice in a 5 kg family carry sack. Non-GMO and certified Kosher (Badatz Edah HaChareidis & Beit Yosef).',
    description: 'Lal Qilla Supreme Sella (Meza) Parboiled Basmati Rice features slender, aromatic grains that elongate to more than double their length when cooked while staying fluffy and separate. Ideal for Hyderabadi Biryani, Pulao, and festive family tables.',
    ingredients: '100% Aged Extra-Long Grain Parboiled Basmati Rice (Non-GMO).',
    allergens_json: JSON.stringify([]),
    dietary_tags_json: JSON.stringify(['Kosher (Badatz & Chief Rabbinate)', 'Vegan', 'Gluten-Free', 'Non-GMO']),
    red_labels_json: JSON.stringify([]),
    nutrition_json: JSON.stringify({
      calories_per_100g_dry: 333,
      calories_per_100g_cooked: 167,
      protein_g: 6.7,
      carbs_g: 77.8,
      sugars_g: 0.0,
      total_fat_g: 0.0,
      saturated_fat_g: 0.0,
      sodium_mg: 2
    }),
    i18n_json: JSON.stringify({
      en: {
        title: 'Lal Qilla Supreme Sella Parboiled Extra-Long Basmati Rice (5 kg Bag)',
        description: 'Royal aged extra-long grain parboiled sella basmati rice in a 5 kg family sack. Certified Kosher.'
      },
      he: {
        title: 'אורז לבן בסמטי סופרים סלה לאל קילה (שק 5 ק״ג - כשר בד״ץ)',
        description: 'אורז בסמטי הודי מיושן ארוך במיוחד בשק משפחתי 5 ק״ג. גרגירים ארומטיים ואווריריים בכשרות בד״ץ.'
      },
      hi: {
        title: 'लाल किला सुप्रीम सेला पारबॉइल्ड एक्स्ट्रा-लॉन्ग बासमती चावल (5 किग्रा बैग)',
        description: 'बिरयानी और पुलाव के लिए शाही पुराना अतिरिक्त-लंबा दाना सेला बासमती चावल (5 किग्रा परिवार पैक)।'
      },
      th: {
        title: 'ลาล กิลลา ข้าวบาสมาติเมล็ดยาวพิเศษ ซูพรีม เซลลา พาร์บอยล์ (ถุง 5 กก.)',
        description: 'ข้าวบาสมาติอินเดียเกรดพรีเมียม เมล็ดเรียวยาวและร่วนสวยเมื่อหุงสุก ขนาดครอบครัว 5 กก.'
      },
      si: {
        title: 'ලාල් කිල්ලා සුප්‍රීම් සෙලා තැම්බූ දිගු බාස්මතී සහල් (5 kg මල්ල)',
        description: 'බිරියානි සහ උත්සව ආහාර සඳහා ඉතා දිගු ප්‍රීමියම් ඉන්දියානු බාස්මතී සහල් 5 kg ඇසුරුම.'
      },
      tl: {
        title: 'Lal Qilla Supreme Sella Parboiled Extra-Long Basmati Rice (5 kg Sako)',
        description: 'Premium na mahabang butil na parboiled Basmati rice sa 5 kg pampamilyang sako.'
      }
    }),
    importer_israel: 'Gershon Spices Ltd., Israel (Approved by Chief Rabbinate of Israel & Badatz Jerusalem)',
    price_ils: 69.90,
    compare_at_price_ils: null,
    net_weight_grams: 5000,
    unit_measure_type: '100g',
    stock_quantity: 42,
    expiry_date: '2028-04-01',
    primary_image_url: 'images/products/lal-qilla-basmati-rice-front.jpg',
    secondary_image_url: 'images/products/lal-qilla-basmati-rice-back.jpg',
    is_authentic_photo: 1,
    is_featured: 1,
    rating_average: 5.0,
    rating_count: 1,
    sales_count: 230
  },
  {
    sku: 'DM-PH-002',
    barcode_ean: '4800361390804',
    title: 'Maggi Magic Sarap All-in-One Seasoning Granules (150g)',
    title_he: 'מאגי מג׳יק סאראפ גרגירי תיבול לכל תבשיל 150 גרם',
    slug: 'maggi-magic-sarap-all-in-one-seasoning-150g',
    vendor_brand: 'Maggi',
    category_slug: 'sauce-seasoning',
    subcategory_slug: 'spices-seasonings',
    region_slug: 'philippines',
    short_description: 'Iconic Filipino all-in-one seasoning granules made with fresh garlic, onion, real chicken taste, and iron fortification.',
    description: 'Maggi Magic Sarap All-in-One Seasoning Granules bring instant savory umami ("Mas Pinasarap, May Dagdag Linamnam") to stir-fries, sinigang, fried rice, marinades, eggs, and everyday Filipino home cooking. Fortified with iron and Halal certified (IDCP).',
    ingredients: 'Iodized Salt, Sugar, Flavour Enhancers (Monosodium Glutamate, Disodium Inosinate, Disodium Guanylate), Garlic, Onion, Chicken Fat & Meat Powder, Spices, Iron Pyrophosphate, Egg Yolk Powder.',
    allergens_json: JSON.stringify(['Egg', 'May contain Wheat (Gluten), Soy, Milk, Celery & Crustaceans']),
    dietary_tags_json: JSON.stringify(['Halal (IDCP)', 'Fortified with Iron']),
    red_labels_json: JSON.stringify(['High Sodium (נתרן בכמות גבוהה)']),
    nutrition_json: JSON.stringify({
      calories_per_100g: 150,
      protein_g: 8.5,
      carbs_g: 24.0,
      sugars_g: 12.0,
      total_fat_g: 2.2,
      saturated_fat_g: 0.9,
      sodium_mg: 21500
    }),
    i18n_json: JSON.stringify({
      en: {
        title: 'Maggi Magic Sarap All-in-One Seasoning Granules (150g)',
        description: 'Iconic Filipino all-in-one savory seasoning granules with garlic, onion, and iron fortification.'
      },
      he: {
        title: 'מאגי מג׳יק סאראפ גרגירי תיבול אול-אין-וואן (150 גרם)',
        description: 'גרגירי התיבול הפיליפיניים האהובים עם שום, בצל וברזל למוקפצים, אורז מטוגן, מרקים ומרינדות.'
      },
      hi: {
        title: 'मैगी मैजिक सराप ऑल-इन-वन सीज़निंग ग्रैन्यूल्स (150g)',
        description: 'लहसुन, प्याज और आयरन से भरपूर प्रामाणिक फिलिपिनो ऑल-इन-वन मसाला ग्रैन्यूल्स।'
      },
      th: {
        title: 'แม็กกี้ เมจิก ซารัป ผงปรุงรสอเนกประสงค์ชนิดเกล็ด (150 กรัม)',
        description: 'ผงปรุงรสยอดนิยมจากฟิลิปปินส์ หอมกระเทียมและหัวหอม เสริมธาตุเหล็ก สำหรับผัดและหมัก'
      },
      si: {
        title: 'මැගී මැජික් සරප් සියලුම ආහාර සඳහා රසකාරක කැට (150g)',
        description: 'සුදුළූණු, ළූණු සහ යකඩ අඩංගු ප්‍රසිද්ධ පිලිපීන රසකාරක කැට.'
      },
      tl: {
        title: 'Maggi Magic Sarap All-in-One Seasoning Granules (150g)',
        description: 'Mas pinasarap at may dagdag linamnam na all-in-one seasoning granules na may iron para sa lutong bahay.'
      }
    }),
    importer_israel: 'Dinu Market Imports, Israel',
    price_ils: 22.00,
    compare_at_price_ils: null,
    net_weight_grams: 150,
    unit_measure_type: '100g',
    stock_quantity: 55,
    expiry_date: '2027-08-30',
    primary_image_url: 'images/products/maggi-magic-sarap-150g.jpg',
    secondary_image_url: '',
    is_authentic_photo: 1,
    is_featured: 1,
    rating_average: 4.9,
    rating_count: 1,
    sales_count: 190
  },
  {
    sku: 'DM-PH-003',
    barcode_ean: '014285000306',
    title: 'UFC Tamis Anghang Sweet & Spicy Banana Sauce (320g Bottle)',
    title_he: 'רוטב בננה מתוק-חריף UFC טאמיס אנגהאנג 320 גרם',
    slug: 'ufc-tamis-anghang-banana-sauce-320g',
    vendor_brand: 'UFC (NutriAsia)',
    category_slug: 'sauce-seasoning',
    subcategory_slug: 'ketchups',
    region_slug: 'philippines',
    short_description: 'The Philippines’ #1 sweet and mildly spicy ("Tamis Anghang") banana ketchup for fried chicken, lumpia, tortang talong, and Filipino spaghetti.',
    description: 'Crafted by NutriAsia from select Philippine saba bananas, savory spices, and chili, UFC Tamis Anghang Banana Sauce balances fruity sweetness with a gentle kick. Essential for dipping lumpia shanghai, fried chicken, silog breakfasts, and sweet-style Filipino spaghetti.',
    ingredients: 'Water, Sugar, Banana (10%), Modified Corn Starch, Vinegar, Iodized Salt, Onion, Chili, Garlic, Sodium Benzoate (E211) as preservative, Food Colors (FD&C Red #40, FD&C Yellow #6).',
    allergens_json: JSON.stringify([]),
    dietary_tags_json: JSON.stringify(['Vegan', 'Vegetarian']),
    red_labels_json: JSON.stringify(['High Sodium (נתרן בכמות גבוהה)', 'High Sugar (סוכר בכמות גבוהה)']),
    nutrition_json: JSON.stringify({
      calories_per_100g: 120,
      protein_g: 0.4,
      carbs_g: 29.0,
      sugars_g: 22.0,
      total_fat_g: 0.0,
      saturated_fat_g: 0.0,
      sodium_mg: 980
    }),
    i18n_json: JSON.stringify({
      en: {
        title: 'UFC Tamis Anghang Sweet & Spicy Banana Sauce (320g Bottle)',
        description: 'Classic Filipino sweet & spicy banana ketchup for fried chicken, lumpia, and Filipino spaghetti.'
      },
      he: {
        title: 'רוטב בננה מתוק-חריף UFC טאמיס אנגהאנג (320 גרם)',
        description: 'קטשופ הבננות הפיליפיני הקלאסי בשילוב מתוק ופיקנטי עדין, מושלם לאגרולים, עוף מטוגן וספגטי פיליפיני.'
      },
      hi: {
        title: 'यूएफसी तमिस अंगहांग स्वीट एंड स्पाइसी बनाना सॉस (320g बोतल)',
        description: 'फ्राइड चिकन, स्प्रिंग रोल्स और पास्ता के लिए प्रसिद्ध फिलिपिनो मीठा और मसालेदार बनाना केचप।'
      },
      th: {
        title: 'ยูเอฟซี ซอสกล้วยรสหวานเผ็ด ทามิส อังฮัง (ขวด 320 กรัม)',
        description: 'ซอสกล้วยสไตล์ฟิลิปปินส์แท้ รสหวานอมเผ็ดกลมกล่อม ทานคู่ไก่ทอด ปอเปี๊ยะ และสปาเก็ตตี้'
      },
      si: {
        title: 'UFC ටමිස් අංහං පැණි සහ සැර කෙසෙල් සෝස් (320g බෝතලය)',
        description: 'බැදපු කුකුළු මස්, ස්ප්‍රින්ග් රෝල්ස් සහ ස්පැගටි සඳහා ප්‍රසිද්ධ පිලිපීන කෙසෙල් සෝස්.'
      },
      tl: {
        title: 'UFC Tamis Anghang Banana Sauce (320g Bote)',
        description: 'Ang pambansang tamis-anghang banana ketchup na swak sa pritong manok, lumpia, at Pinoy spaghetti.'
      }
    }),
    importer_israel: 'Dinu Market Imports, Israel',
    price_ils: 12.00,
    compare_at_price_ils: null,
    net_weight_grams: 320,
    unit_measure_type: '100g',
    stock_quantity: 48,
    expiry_date: '2027-07-15',
    primary_image_url: 'images/products/ufc-banana-sauce-320g.jpg',
    secondary_image_url: '',
    is_authentic_photo: 1,
    is_featured: 1,
    rating_average: 4.9,
    rating_count: 1,
    sales_count: 175
  },
  {
    sku: 'DM-PH-004',
    barcode_ean: '4800086020109',
    title: 'Super Q Golden Bihon Cornstarch Sticks Noodles (500g)',
    title_he: 'אטריות ביהון מוזהבות מקורנפלור סופר קיו 500 גרם',
    slug: 'super-q-golden-bihon-cornstarch-sticks-500g',
    vendor_brand: 'Super Q',
    category_slug: 'pantry',
    subcategory_slug: 'noodles',
    region_slug: 'philippines',
    short_description: 'Fine, springy Filipino golden bihon noodles crafted from cornstarch and water — the authentic base for Pancit Bihon Guisado and Pancit Palabok.',
    description: 'Super Q Original Golden Bihon Cornstarch Sticks cook quickly while holding a firm, non-soggy bite that absorbs savory soy, citrus calamansi, and broth flavors. Naturally gluten-free and ideal for festive Pancit Bihon Guisado, Pancit Malabon, and noodle soups.',
    ingredients: 'Cornstarch, Water.',
    allergens_json: JSON.stringify([]),
    dietary_tags_json: JSON.stringify(['Vegan', 'Vegetarian', 'Gluten-Free']),
    red_labels_json: JSON.stringify([]),
    nutrition_json: JSON.stringify({
      calories_per_100g: 352,
      protein_g: 0.5,
      carbs_g: 87.0,
      sugars_g: 0.0,
      total_fat_g: 0.2,
      saturated_fat_g: 0.0,
      sodium_mg: 18
    }),
    i18n_json: JSON.stringify({
      en: {
        title: 'Super Q Golden Bihon Cornstarch Sticks Noodles (500g)',
        description: 'Authentic Filipino golden bihon noodles for Pancit Bihon Guisado and Pancit Palabok.'
      },
      he: {
        title: 'אטריות ביהון מוזהבות סופר קיו (500 גרם)',
        description: 'אטריות דקות וגמישות מעמילן תירס להכנת פאנסיט ביהון פיליפיני מוקפץ ומרקים מסורתיים. ללא גלוטן.'
      },
      hi: {
        title: 'सुपर क्यू गोल्डन बिहोन कॉर्नस्टार्च नूडल्स (500g)',
        description: 'पैनसिट बिहोन स्टर-फ्राई और सूप के लिए प्रामाणिक फिलिपिनो ग्लूटेन-मुक्त नूडल्स।'
      },
      th: {
        title: 'ซูเปอร์ คิว เส้นหมี่บีฮอนสีทองจากแป้งข้าวโพด (500 กรัม)',
        description: 'เส้นหมี่ผัดสไตล์ฟิลิปปินส์เหนียวนุ่ม ไม่เละง่าย ปราศจากกลูเตน สำหรับทำปันซิตบีฮอน'
      },
      si: {
        title: 'සුපර් Q ගෝල්ඩන් බිහොන් ඉරිඟු පිටි නූඩ්ල්ස් (500g)',
        description: 'පැන්සිට් බිහොන් සහ සුප් සඳහා ග්ලූටන් රහිත සම්ප්‍රදායික පිලිපීන නූඩ්ල්ස්.'
      },
      tl: {
        title: 'Super Q Golden Bihon Cornstarch Sticks (500g)',
        description: 'Ang orihinal na Golden Bihon na hindi madaling malata, perpekto para sa Pancit Bihon Guisado at Palabok.'
      }
    }),
    importer_israel: 'Dinu Market Imports, Israel',
    price_ils: 13.00,
    compare_at_price_ils: null,
    net_weight_grams: 500,
    unit_measure_type: '100g',
    stock_quantity: 60,
    expiry_date: '2028-05-25',
    primary_image_url: 'images/products/super-q-golden-bihon-500g.jpg',
    secondary_image_url: '',
    is_authentic_photo: 1,
    is_featured: 1,
    rating_average: 4.9,
    rating_count: 1,
    sales_count: 162
  },
  {
    sku: 'DM-PH-005',
    barcode_ean: '7622210615091',
    title: 'Eden Original Processed Filled Cheese Spread (430g Block)',
    title_he: 'גבינת עדן מקורית למריחה ולבישול פיליפיני 430 גרם',
    slug: 'eden-original-processed-filled-cheese-430g',
    vendor_brand: 'Eden (Mondelēz)',
    category_slug: 'pantry',
    subcategory_slug: 'spreads-dairy',
    region_slug: 'philippines',
    short_description: 'Creamy, sliceable and grateable Filipino cheese block loved on warm pandesal, Pinoy-style sweet spaghetti, baked macaroni, and bibingka.',
    description: 'Eden Original Processed Filled Cheese Spread (430g family block) is a beloved Filipino household staple with a rich, creamy cheddar-style taste that melts smoothly over sweet Filipino spaghetti, caldereta, pandesal sandwiches, puto, and ensaymada.',
    ingredients: 'Water, Cheddar Cheese (Milk, Salt, Starter Culture, Rennet), Vegetable Oil (Palm Oil), Milk Solids, Modified Starch, Emulsifying Salts (INS 339, INS 452), Salt, Acidity Regulator (Lactic Acid), Preservative (Potassium Sorbate, Nisin), Vitamin A, Vitamin B2, Calcium, Natural Color (Annatto).',
    allergens_json: JSON.stringify(['Milk (Dairy)']),
    dietary_tags_json: JSON.stringify(['Vegetarian', 'Source of Calcium & Vitamins A & B2']),
    red_labels_json: JSON.stringify(['High Saturated Fat (שומן רווי בכמות גבוהה)']),
    nutrition_json: JSON.stringify({
      calories_per_100g: 300,
      protein_g: 10.0,
      carbs_g: 13.3,
      sugars_g: 3.3,
      total_fat_g: 23.3,
      saturated_fat_g: 11.7,
      sodium_mg: 1180
    }),
    i18n_json: JSON.stringify({
      en: {
        title: 'Eden Original Processed Filled Cheese Spread (430g Block)',
        description: 'Creamy Filipino cheese block for pandesal, Pinoy spaghetti, caldereta, and ensaymada.'
      },
      he: {
        title: 'גבינת עדן מקורית בלוק משפחתי (430 גרם)',
        description: 'בלוק הגבינה הקרמית הפיליפינית האהובה לכריכי פנדסאל, גירוד מעל ספגטי פיליפיני ומאפים.'
      },
      hi: {
        title: 'ईडन ओरिजिनल प्रोसेस्ड चीज़ स्प्रेड ब्लॉक (430g)',
        description: 'सैंडविच, पास्ता और बेकिंग के लिए मलाईदार फिलिपिनो चीज़ ब्लॉक।'
      },
      th: {
        title: 'อีเดน ออริจินัล ชีสก้อนปรุงสำเร็จสไตล์ฟิลิปปินส์ (430 กรัม)',
        description: 'ชีสก้อนเนื้อเนียนหอมมัน สำหรับทาขนมปัง ขูดโรยสปาเก็ตตี้ และอบขนม'
      },
      si: {
        title: 'ඊඩන් ඔරිජිනල් ක්‍රීමි චීස් කුට්ටිය (430g)',
        description: 'සැන්ඩ්විච්, පැස්ටා සහ බේකරි ආහාර සඳහා ප්‍රසිද්ධ පිලිපීන චීස්.'
      },
      tl: {
        title: 'Eden Original Processed Filled Cheese (430g)',
        description: 'Malinamnam at creamy na keso para sa mainit na pandesal, Pinoy spaghetti, puto, at ensaymada.'
      }
    }),
    importer_israel: 'Dinu Market Imports, Israel',
    price_ils: 47.00,
    compare_at_price_ils: null,
    net_weight_grams: 430,
    unit_measure_type: '100g',
    stock_quantity: 34,
    expiry_date: '2027-06-17',
    primary_image_url: 'images/products/eden-original-cheese-430g.jpg',
    secondary_image_url: '',
    is_authentic_photo: 1,
    is_featured: 1,
    rating_average: 5.0,
    rating_count: 1,
    sales_count: 145
  },
  {
    sku: 'DM-PH-006',
    barcode_ean: '4806508340013',
    title: 'Cabalen Bagoong Alamang Salted Shrimp Fry (340g Jar)',
    title_he: 'קבאלן באגואונג אלאמאנג ממרח שרימפס מומלח מסורתי 340 גרם',
    slug: 'cabalen-bagoong-alamang-salted-shrimp-fry-340g',
    vendor_brand: 'Cabalen',
    category_slug: 'sauce-seasoning',
    subcategory_slug: 'dipping-sauces',
    region_slug: 'philippines',
    short_description: 'Authentic Kapampangan sautéed salted shrimp paste with no MSG and no extenders — indispensable alongside Kare-Kare, pinakbet, and green mangoes.',
    description: 'Cabalen Bagoong Alamang (Salted Shrimp Fry) is slow-cooked in the traditional Kapampangan style using 100% natural tiny shrimp, garlic, cane vinegar, and seasonings with zero MSG and zero extenders. Ready to serve straight from the jar with oxtail Kare-Kare, crispy binagoongan, pinakbet, or sliced tart green mango.',
    ingredients: 'Salted Fermented Krill/Shrimp (Alamang), Cane Vinegar, Vegetable Oil, Garlic, Onion, Sugar, Spices.',
    allergens_json: JSON.stringify(['Crustacean Shellfish (Shrimp)']),
    dietary_tags_json: JSON.stringify(['No MSG', 'No Extenders', '100% Natural']),
    red_labels_json: JSON.stringify(['High Sodium (נתרן בכמות גבוהה)']),
    nutrition_json: JSON.stringify({
      calories_per_100g: 195,
      protein_g: 12.0,
      carbs_g: 14.0,
      sugars_g: 9.0,
      total_fat_g: 10.2,
      saturated_fat_g: 2.1,
      sodium_mg: 3800
    }),
    i18n_json: JSON.stringify({
      en: {
        title: 'Cabalen Bagoong Alamang Salted Shrimp Fry (340g Jar)',
        description: 'Authentic Kapampangan sautéed shrimp paste with no MSG or extenders for Kare-Kare and pinakbet.'
      },
      he: {
        title: 'קבאלן באגואונג אלאמאנג ממרח חסילונים מומלח (צנצנת 340 גרם)',
        description: 'ממרח שרימפס פיליפיני מסורתי מבושל מוכן להגשה ללא מונוסודיום גלוטמט, לצד קארה-קארה ותבשילים.'
      },
      hi: {
        title: 'कबालेन बागूंग अलामांग सॉल्टेड श्रिम्प फ्राई पेस्ट (340g जार)',
        description: 'बिना एमएसजी के पारंपरिक फिलिपिनो भुना हुआ झींगा पेस्ट (100% प्राकृतिक)।'
      },
      th: {
        title: 'คาบาเลน บากูง อลามัง กะปิกุ้งผัดปรุงรสพร้อมทาน (กระปุก 340 กรัม)',
        description: 'กะปิกุ้งผัดต้นตำรับฟิลิปปินส์ ธรรมชาติ 100% ไม่ใส่ผงชูรส ทานคู่แกงคาเร-คาเรและมะม่วงดิบ'
      },
      si: {
        title: 'කබාලෙන් බගූං අලමං ලුණු දැමූ ඉස්සන් පේස්ට් (340g බෝතලය)',
        description: 'MSG රහිත 100% ස්වභාවික සම්ප්‍රදායික පිලිපීන ඉස්සන් බැදුම් පේස්ට්.'
      },
      tl: {
        title: 'Cabalen Bagoong Alamang Salted Shrimp Fry (340g Garapon)',
        description: 'Authentic Kapampangan gisadong bagoong alamang — walang MSG at walang extenders, swak sa Kare-Kare at manggang hilaw.'
      }
    }),
    importer_israel: 'Dinu Market Imports, Israel',
    price_ils: 25.00,
    compare_at_price_ils: null,
    net_weight_grams: 340,
    unit_measure_type: '100g',
    stock_quantity: 28,
    expiry_date: '2027-10-01',
    primary_image_url: 'images/products/cabalen-bagoong-alamang-340g.jpg',
    secondary_image_url: '',
    is_authentic_photo: 1,
    is_featured: 1,
    rating_average: 4.9,
    rating_count: 1,
    sales_count: 112
  },
  {
    sku: 'DM-PH-007',
    barcode_ean: '4800086010100',
    title: 'Super Q Special Pancit Canton Flour Noodles (454g / 16oz)',
    title_he: 'אטריות פאנסיט קנטון מיוחדות למוקפץ סופר קיו 454 גרם',
    slug: 'super-q-special-pancit-canton-454g',
    vendor_brand: 'Super Q',
    category_slug: 'pantry',
    subcategory_slug: 'noodles',
    region_slug: 'philippines',
    short_description: 'Golden wheat-flour egg noodles crafted for celebratory Filipino Pancit Canton, Bam-I (Pancit Bisaya), and savory wok stir-fries.',
    description: 'Super Q Special Pancit Canton (454g / 16 oz family pack) features pre-steamed golden wheat noodles that cook in minutes with meat, shrimp, cabbage, carrots, soy sauce, and calamansi for classic birthday and fiesta Pancit Canton.',
    ingredients: 'Wheat Flour, Vegetable Oil (Palm Oil), Water, Iodized Salt, Acidity Regulators (Sodium Carbonate, Potassium Carbonate), Tartrazine (E102).',
    allergens_json: JSON.stringify(['Wheat (Gluten)', 'May contain Egg & Soy']),
    dietary_tags_json: JSON.stringify(['Vegetarian', 'HACCP Certified']),
    red_labels_json: JSON.stringify([]),
    nutrition_json: JSON.stringify({
      calories_per_100g: 445,
      protein_g: 9.2,
      carbs_g: 62.0,
      sugars_g: 1.0,
      total_fat_g: 17.5,
      saturated_fat_g: 8.0,
      sodium_mg: 420
    }),
    i18n_json: JSON.stringify({
      en: {
        title: 'Super Q Special Pancit Canton Flour Noodles (454g / 16oz)',
        description: 'Golden Filipino Pancit Canton noodles for fiesta stir-fries and Bam-I.'
      },
      he: {
        title: 'אטריות פאנסיט קנטון מיוחדות סופר קיו (454 גרם)',
        description: 'אטריות חיטה זהובות להקפצה מהירה בסגנון פאנסיט קנטון פיליפיני חגיגי עם ירקות ורוטב סויה.'
      },
      hi: {
        title: 'सुपर क्यू स्पेशल पैनसिट कैंटन नूडल्स (454g / 16oz)',
        description: 'चाउमीन और फिलिपिनो पैनसिट कैंटन स्टर-फ्राई के लिए सुनहरे गेहूं नूडल्स।'
      },
      th: {
        title: 'ซูเปอร์ คิว บะหมี่ปันซิตกันตงสูตรพิเศษ (454 กรัม)',
        description: 'เส้นบะหมี่เหลืองสไตล์ฟิลิปปินส์ เหนียวนุ่ม สำหรับผัดปันซิตกันตงและผัดหมี่งานเลี้ยง'
      },
      si: {
        title: 'සුපර් Q විශේෂ පැන්සිට් කැන්ටන් නූඩ්ල්ස් (454g)',
        description: 'එළවළු සහ සෝයා සෝස් සමඟ බැදීමට සුදුසු රන්වන් පිලිපීන නූඩ්ල්ස්.'
      },
      tl: {
        title: 'Super Q Special Pancit Canton (454g / 16oz)',
        description: 'Malinamnam na gintong Pancit Canton noodles para sa handaan, kaarawan, at Bam-I.'
      }
    }),
    importer_israel: 'Dinu Market Imports, Israel',
    price_ils: 19.00,
    compare_at_price_ils: null,
    net_weight_grams: 454,
    unit_measure_type: '100g',
    stock_quantity: 44,
    expiry_date: '2028-07-01',
    primary_image_url: 'images/products/super-q-pancit-canton-454g.jpg',
    secondary_image_url: '',
    is_authentic_photo: 1,
    is_featured: 1,
    rating_average: 4.9,
    rating_count: 1,
    sales_count: 154
  },
  {
    sku: 'DM-PH-008',
    barcode_ean: '4806504710148',
    title: 'Buenas Coconut Sport Macapuno String in Syrup (907g / 32oz Jar)',
    title_he: 'בואנס רצועות קוקוס מאקאפונו מתוקות בסירופ 907 גרם',
    slug: 'buenas-coconut-sport-macapuno-string-907g',
    vendor_brand: 'Buenas',
    category_slug: 'canned-jarred-goods',
    subcategory_slug: 'canned-jarred-fruits',
    region_slug: 'philippines',
    short_description: 'Tender, gelatinous Philippine macapuno coconut strings preserved in sweet syrup — a crown jewel topping for Halo-Halo, leche flan, ice cream, and pastries.',
    description: 'Buenas Coconut Sport Macapuno String (large 32 oz / 907g glass jar) is made from prized Philippine macapuno coconuts, prized for their soft, rich, jelly-like flesh. Ready to spoon directly onto Halo-Halo shaved ice, buko pandan, ube cakes, sweet buns, and tropical desserts. Halal certified (IDCP) and GMP/HACCP certified.',
    ingredients: 'Coconut Sport (Macapuno) Strings, Cane Sugar, Water.',
    allergens_json: JSON.stringify(['Coconut']),
    dietary_tags_json: JSON.stringify(['Vegan', 'Vegetarian', 'Gluten-Free', 'Halal (IDCP)']),
    red_labels_json: JSON.stringify(['High Sugar (סוכר בכמות גבוהה)']),
    nutrition_json: JSON.stringify({
      calories_per_100g: 295,
      protein_g: 0.8,
      carbs_g: 66.0,
      sugars_g: 54.0,
      total_fat_g: 3.1,
      saturated_fat_g: 2.7,
      sodium_mg: 22
    }),
    i18n_json: JSON.stringify({
      en: {
        title: 'Buenas Coconut Sport Macapuno String in Syrup (907g / 32oz Jar)',
        description: 'Tender Philippine macapuno coconut strings in sweet syrup for Halo-Halo and desserts.'
      },
      he: {
        title: 'בואנס רצועות קוקוס מאקאפונו בסירופ מתוק (צנצנת 907 גרם)',
        description: 'רצועות קוקוס מאקאפונו פיליפיני רכות ועשירות בסירופ, מושלמות להאלו-האלו, גלידות וקינוחים.'
      },
      hi: {
        title: 'बुएनास कोकोनट स्पोर्ट मकापुनो स्ट्रिंग सिरप में (907g जार)',
        description: 'हालो-हालो, आइसक्रीम और मिठाइयों के लिए मीठे सिरप में मुलायम फिलिपिनो नारियल के लच्छे।'
      },
      th: {
        title: 'บูเอนาส เนื้อมะพร้าวกะทิเส้น มาคาปูโน ในน้ำเชื่อม (กระปุก 907 กรัม)',
        description: 'เนื้อมะพร้าวกะทิเส้นนุ่มละมุนในน้ำเชื่อม สำหรับทำฮาโล-ฮาโล ไอศกรีม และขนมหวาน'
      },
      si: {
        title: 'බුවෙනාස් මකපුනෝ පොල් තීරු පැණි සිරප් වල (907g බෝතලය)',
        description: 'හලෝ-හලෝ, අයිස්ක්‍රීම් සහ අතුරුපස සඳහා පැණි සිරප් වල දැමූ මෘදු පොල් තීරු.'
      },
      tl: {
        title: 'Buenas Coconut Sport Macapuno String in Syrup (907g / 32oz)',
        description: 'Malambot at matamis na hibla ng macapuno para sa Halo-Halo, leche flan, ube cake, at panghimagas.'
      }
    }),
    importer_israel: 'Dinu Market Imports, Israel',
    price_ils: 48.00,
    compare_at_price_ils: null,
    net_weight_grams: 907,
    unit_measure_type: '100g',
    stock_quantity: 26,
    expiry_date: '2027-02-28',
    primary_image_url: 'images/products/buenas-macapuno-string-907g.jpg',
    secondary_image_url: '',
    is_authentic_photo: 1,
    is_featured: 1,
    rating_average: 5.0,
    rating_count: 1,
    sales_count: 98
  },
  {
    sku: 'DM-PH-009',
    barcode_ean: '4806014800017',
    title: 'Boy Bawang Cornick Crunchy Garlic Corn Nuts (100g)',
    title_he: 'בוי באוואנג קורניק חטיף גרעיני תירס קלויים בטעם שום 100 גרם',
    slug: 'boy-bawang-cornick-garlic-flavor-100g',
    vendor_brand: 'Boy Bawang',
    category_slug: 'snacks',
    subcategory_slug: 'nuts-seeds',
    region_slug: 'philippines',
    short_description: 'Ultra-crunchy puffed Filipino cornick tossed with real roasted garlic chips — light, savory, and irresistibly crisp.',
    description: 'Boy Bawang ("Garlic Boy") Cornick in Original Garlic Flavor is the Philippines’ favorite crunchy corn snack, popped to an airy crunch and seasoned with real fried garlic chips. Great as a movie snack, merienda crunch, or crispy topping over lugaw and goto.',
    ingredients: 'Corn, Vegetable Oil (Coconut / Palmolein Oil), Garlic, Iodized Salt, Sugar, Monosodium Glutamate (E621), Chili Powder.',
    allergens_json: JSON.stringify(['Manufactured on equipment that also processes Peanuts, Soy & Wheat']),
    dietary_tags_json: JSON.stringify(['Vegetarian']),
    red_labels_json: JSON.stringify(['High Saturated Fat (שומן רווי בכמות גבוהה)', 'High Sodium (נתרן בכמות גבוהה)']),
    nutrition_json: JSON.stringify({
      calories_per_100g: 467,
      protein_g: 6.7,
      carbs_g: 66.7,
      sugars_g: 3.3,
      total_fat_g: 20.0,
      saturated_fat_g: 13.3,
      sodium_mg: 760
    }),
    i18n_json: JSON.stringify({
      en: {
        title: 'Boy Bawang Cornick Crunchy Garlic Corn Nuts (100g)',
        description: 'Light, ultra-crunchy Filipino roasted garlic cornick snack with real garlic chips.'
      },
      he: {
        title: 'בוי באוואנג קורניק חטיף תירס פריך עם שבבי שום (100 גרם)',
        description: 'חטיף התירס הקלוי הפיליפיני המפורסם במרקם פריך במיוחד עם שבבי שום קלוי אמיתיים.'
      },
      hi: {
        title: 'बॉय बावांग कॉर्निक क्रंची गार्लिक कॉर्न स्नैक (100g)',
        description: 'असली भुने हुए लहसुन चिप्स के साथ कुरकुरा फिलिपिनो कॉर्न स्नैक।'
      },
      th: {
        title: 'บอย บาวัง คอร์นิก ข้าวโพดอบกรอบรสกระเทียมแท้ (100 กรัม)',
        description: 'ขนมข้าวโพดกรอบยอดฮิตจากฟิลิปปินส์ คลุกเคล้ากระเทียมเจียวแท้หอมกรอบเคี้ยวเพลิน'
      },
      si: {
        title: 'බෝයි බවාං කෝනික් සුදුළූණු රසැති හැපෙනසුළු බඩඉරිඟු ස්නැක් (100g)',
        description: 'සැබෑ බැදපු සුදුළූණු කැබලි මිශ්‍ර රසවත් පිලිපීන බඩඉරිඟු අතුරු ආහාරය.'
      },
      tl: {
        title: 'Boy Bawang Cornick Garlic Flavor (100g)',
        description: 'Malutong at malinamnam na cornick na may tunay na garlic chips — paboritong pang-merienda at pulutan.'
      }
    }),
    importer_israel: 'Dinu Market Imports, Israel',
    price_ils: 7.00,
    compare_at_price_ils: null,
    net_weight_grams: 100,
    unit_measure_type: '100g',
    stock_quantity: 80,
    expiry_date: '2027-09-01',
    primary_image_url: 'images/products/boy-bawang-cornick-garlic-100g.jpg',
    secondary_image_url: '',
    is_authentic_photo: 1,
    is_featured: 1,
    rating_average: 4.9,
    rating_count: 1,
    sales_count: 240
  },
  {
    sku: 'DM-PH-010',
    barcode_ean: '4806502350025',
    title: 'King Choc Nut Peanut Milk Chocolate Bars (200g — 24 × 8g Pack)',
    title_he: 'קינג צ׳וק-נאט חטיפי שוקולד חלב ובוטנים פיליפיני 200 גרם (24 יח׳)',
    slug: 'king-choc-nut-peanut-milk-chocolate-200g',
    vendor_brand: 'Unisman (King Choc Nut)',
    category_slug: 'sweets',
    subcategory_slug: 'chocolates',
    region_slug: 'philippines',
    short_description: 'Nostalgic melt-in-your-mouth Filipino roasted peanut and milk chocolate bars — pack of 24 individually wrapped 8g bars.',
    description: 'Unisman King Choc Nut (24 × 8g = 200g pack) is the iconic childhood sweet of the Philippines, blending finely ground roasted peanuts, cocoa powder, milk powder, and cane sugar into crumbly, melt-in-your-mouth mini bars.',
    ingredients: 'Roasted Peanuts, Cane Sugar, Milk Powder, Cocoa Powder, Vanilla.',
    allergens_json: JSON.stringify(['Peanuts', 'Milk (Dairy)']),
    dietary_tags_json: JSON.stringify(['Vegetarian']),
    red_labels_json: JSON.stringify(['High Saturated Fat (שומן רווי בכמות גבוהה)', 'High Sugar (סוכר בכמות גבוהה)']),
    nutrition_json: JSON.stringify({
      calories_per_100g: 500,
      protein_g: 12.5,
      carbs_g: 58.3,
      sugars_g: 45.8,
      total_fat_g: 25.0,
      saturated_fat_g: 10.4,
      sodium_mg: 62
    }),
    i18n_json: JSON.stringify({
      en: {
        title: 'King Choc Nut Peanut Milk Chocolate Bars (200g — 24 × 8g Pack)',
        description: 'Classic nostalgic Filipino peanut milk chocolate bars (24 × 8g pack).'
      },
      he: {
        title: 'קינג צ׳וק-נאט חטיפי בוטנים ושוקולד חלב (מארז 24 יח׳ - 200 גרם)',
        description: 'ממתק הבוטנים והשוקולד הפיליפיני הנוסטלגי במרקם נימוח, במארז של 24 חטיפים עטופים בנפרד.'
      },
      hi: {
        title: 'किंग चॉक-नट पीनट मिल्क चॉकलेट बार (200g — 24 × 8g पैक)',
        description: 'भुनी हुई मूंगफली और मिल्क चॉकलेट से बनी प्रसिद्ध फिलिपिनो मिनी चॉकलेट बार (24 पीस)।'
      },
      th: {
        title: 'คิง ช็อกนัท ขนมช็อกโกแลตนมผสมถั่วลิสงคั่วบด (200 กรัม — 24 ชิ้น)',
        description: 'ขนมช็อกโกแลตถั่วลิสงระดับตำนานของฟิลิปปินส์ เนื้อเนียนละลายในปาก บรรจุ 24 ชิ้น'
      },
      si: {
        title: 'කිං චොක්-නට් රටකජු කිරි චොකලට් (200g — කෑලි 24 ඇසුරුම)',
        description: 'බැදපු රටකජු සහ කිරි චොකලට් වලින් සාදන ලද රසවත් පිලිපීන රසකැවිලි කෑලි 24ක්.'
      },
      tl: {
        title: 'King Choc Nut Peanut Milk Chocolate (200g — 24 × 8g)',
        description: 'Ang paboritong pambatang panghimagas ng Pinoy na gawa sa mani at tsokolate (24 piraso).'
      }
    }),
    importer_israel: 'Dinu Market Imports, Israel',
    price_ils: 14.00,
    compare_at_price_ils: null,
    net_weight_grams: 200,
    unit_measure_type: '100g',
    stock_quantity: 65,
    expiry_date: '2028-02-06',
    primary_image_url: 'images/products/king-choc-nut-200g.jpg',
    secondary_image_url: '',
    is_authentic_photo: 1,
    is_featured: 1,
    rating_average: 5.0,
    rating_count: 1,
    sales_count: 205
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

  // 3. Remove any non-uploaded synthetic products and ensure all 6 uploaded products are under 'india'
  const uploadedSkus = SEED_PRODUCTS.map((p) => `'${p.sku}'`).join(', ');
  const uploadedBarcodes = SEED_PRODUCTS.map((p) => `'${p.barcode_ean}'`).join(', ');
  db.exec(`DELETE FROM products WHERE sku NOT IN (${uploadedSkus}) AND barcode_ean NOT IN (${uploadedBarcodes});`);

  const upsertProd = db.prepare(`
    INSERT INTO products (
      id, sku, barcode_ean, title, title_he, slug, vendor_brand,
      category_slug, subcategory_slug, region_slug, short_description, description,
      ingredients, allergens_json, dietary_tags_json, red_labels_json, nutrition_json, i18n_json,
      storage_instructions, importer_israel, price_ils, compare_at_price_ils,
      net_weight_grams, unit_measure_type, stock_quantity, expiry_date,
      primary_image_url, secondary_image_url, variants_json,
      rating_average, rating_count, sales_count, is_authentic_photo, is_featured, is_active, created_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?,
      ?, ?, ?, 1, 1, 1, ?
    )
    ON CONFLICT(slug) DO UPDATE SET
      sku = excluded.sku,
      barcode_ean = excluded.barcode_ean,
      title = excluded.title,
      title_he = excluded.title_he,
      vendor_brand = excluded.vendor_brand,
      category_slug = excluded.category_slug,
      subcategory_slug = excluded.subcategory_slug,
      region_slug = excluded.region_slug,
      short_description = excluded.short_description,
      description = excluded.description,
      ingredients = excluded.ingredients,
      allergens_json = excluded.allergens_json,
      dietary_tags_json = excluded.dietary_tags_json,
      red_labels_json = excluded.red_labels_json,
      nutrition_json = excluded.nutrition_json,
      i18n_json = excluded.i18n_json,
      price_ils = excluded.price_ils,
      net_weight_grams = excluded.net_weight_grams,
      unit_measure_type = excluded.unit_measure_type,
      expiry_date = excluded.expiry_date,
      primary_image_url = excluded.primary_image_url,
      secondary_image_url = excluded.secondary_image_url,
      is_authentic_photo = 1,
      is_active = 1
  `);

  const insertReview = db.prepare(`
    INSERT INTO product_reviews (id, product_id, user_id, author_name, rating, title, body, is_verified_purchase, created_at)
    VALUES (?, ?, NULL, ?, ?, ?, ?, 1, ?)
  `);

  SEED_PRODUCTS.forEach((p) => {
    const pid = crypto.randomUUID();
    upsertProd.run(
      pid,
      p.sku,
      p.barcode_ean || '',
      p.title,
      p.title_he || '',
      p.slug,
      p.vendor_brand,
      p.category_slug,
      p.subcategory_slug,
      p.region_slug || 'india',
      p.short_description,
      p.description,
      p.ingredients || '',
      p.allergens_json || '[]',
      p.dietary_tags_json || '[]',
      p.red_labels_json || '[]',
      p.nutrition_json || '{}',
      p.i18n_json || '{}',
      p.storage_instructions || 'Store in a cool, dry place away from direct sunlight.',
      p.importer_israel || 'Dinu Market Imports Ltd., Israel',
      p.price_ils,
      p.compare_at_price_ils || null,
      p.net_weight_grams,
      p.unit_measure_type || '100g',
      p.stock_quantity || 40,
      p.expiry_date || '2027-06-06',
      p.primary_image_url,
      p.secondary_image_url || '',
      DEFAULT_VARIANTS,
      p.rating_average || 4.9,
      p.rating_count || 30,
      p.sales_count || 120,
      now
    );

    const actualProd = db.prepare('SELECT id FROM products WHERE slug = ?').get(p.slug);
    if (actualProd) {
      const revCount = db.prepare('SELECT COUNT(*) AS cnt FROM product_reviews WHERE product_id = ?').get(actualProd.id).cnt;
      if (revCount === 0) {
        insertReview.run(
          crypto.randomUUID(),
          actualProd.id,
          'Noa Levi (Tel Aviv)',
          5,
          'Authentic imported quality & fast delivery!',
          `Ordered ${p.title} from Dinu Market and it arrived fresh, well-packed, and with clear Hebrew nutrition labels.`,
          now
        );
      }
    }
  });

  // Ensure Silver Swan maps to philippines and Indian items map to india
  db.exec(`UPDATE products SET region_slug = 'philippines' WHERE slug = 'silver-swan-special-soy-sauce-1000ml';`);

  // 4. Seed Configurable Israeli Shipping Zones if empty
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

  // 5. Seed Promotional Discounts if empty
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

  // 6. Seed Default Store Settings if empty & ensure live delivery/contact settings exist
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

  // 7. Seed Demo Admin & Customer Accounts if empty
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
function mergeGuestCartIntoUserCart(sessionToken, userId) {
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
        const product = db.prepare('SELECT stock_quantity FROM products WHERE id = ?').get(item.product_id);
        const maxStock = product ? Math.max(1, product.stock_quantity) : 99;

        const existing = db.prepare(
          'SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ? AND variant_code = ?'
        ).get(userCart.id, item.product_id, item.variant_code);

        if (existing) {
          const mergedQty = Math.min(existing.quantity + item.quantity, maxStock, 99);
          db.prepare('UPDATE cart_items SET quantity = ?, updated_at = ? WHERE id = ?').run(mergedQty, now, existing.id);
        } else {
          const cappedQty = Math.min(item.quantity, maxStock, 99);
          db.prepare(`
            INSERT INTO cart_items (id, cart_id, product_id, variant_code, variant_label, price_multiplier, quantity, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            crypto.randomUUID(),
            userCart.id,
            item.product_id,
            item.variant_code,
            item.variant_label,
            item.price_multiplier,
            cappedQty,
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

function getHydratedCart({ userId, sessionToken, zoneCode = 'IL-Z1', deliveryMethod = 'standard' }) {
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
    SELECT
      ci.id AS cart_item_id,
      ci.product_id,
      ci.variant_code,
      ci.variant_label,
      ci.price_multiplier,
      ci.quantity,
      p.sku,
      p.title,
      p.title_he,
      p.i18n_json,
      p.slug,
      p.vendor_brand,
      p.price_ils AS base_price_ils,
      p.compare_at_price_ils,
      p.net_weight_grams,
      p.stock_quantity,
      p.primary_image_url,
      p.region_slug
    FROM cart_items ci
    JOIN products p ON p.id = ci.product_id
    WHERE ci.cart_id = ? AND p.is_active = 1
    ORDER BY ci.updated_at DESC
  `).all(cart.id);

  let subtotal = 0;
  let totalQuantity = 0;
  let totalWeightGrams = 0;

  const items = rawItems.map((row) => {
    const unitPrice = Number((row.base_price_ils * row.price_multiplier).toFixed(2));
    const lineTotal = Number((unitPrice * row.quantity).toFixed(2));
    subtotal += lineTotal;
    totalQuantity += row.quantity;
    totalWeightGrams += row.net_weight_grams * row.quantity;
    return {
      ...row,
      i18n: JSON.parse(row.i18n_json || '{}'),
      unit_price_ils: unitPrice,
      line_total_ils: lineTotal
    };
  });

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
