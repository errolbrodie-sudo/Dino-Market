/**
 * DINU MARKET: Official Supabase Database & Storage Integration Layer
 *
 * Connects to the existing Supabase project (`Product lists` table & `Product Images` bucket)
 * using the official `@supabase/supabase-js` client.
 *
 * Security & Architectural Guarantees:
 * - Never exposes `SUPABASE_SERVICE_ROLE_KEY` or internal `"Cost"` column to public clients.
 * - Preserves exact Supabase column spelling, capitalisation, and spacing (`"Image Link"`, etc.).
 * - Resolves full URLs, bucket+object paths, relative paths, and bare filenames with spaces/special chars.
 * - Allocates products strictly to India, Thailand, Sri Lanka, or Philippines; flags unrecognised values.
 * - Validates live prices and stock directly from Supabase before completing checkout.
 */

const fs = require('node:fs');
const path = require('node:path');
const { createClient } = require('@supabase/supabase-js');

/**
 * Load `.env` files for local development without overriding existing environment variables
 * (compatible with both local Node.js execution and Vercel Serverless Environment Variables).
 */
function loadLocalEnvFiles() {
  const candidates = [
    path.join(__dirname, '.env'),
    path.join(__dirname, '.env.local'),
    path.join(__dirname, '..', '.env'),
    path.join(__dirname, '..', '.env.local')
  ];

  for (const envPath of candidates) {
    if (!fs.existsSync(envPath)) continue;
    try {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#')) continue;
        const eqIdx = line.indexOf('=');
        if (eqIdx <= 0) continue;
        const key = line.slice(0, eqIdx).trim();
        let val = line.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (process.env[key] === undefined) {
          process.env[key] = val;
        }
      }
    } catch {
      // Ignore unreadable local env files
    }
  }
}

loadLocalEnvFiles();

const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/\/$/, '');
const SUPABASE_PUBLISHABLE_KEY = (
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  ''
).trim();
const SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const SUPABASE_PRODUCTS_TABLE = (process.env.SUPABASE_PRODUCTS_TABLE || 'Product lists').trim();
const SUPABASE_STORAGE_BUCKET = (process.env.SUPABASE_STORAGE_BUCKET || 'Product Images').trim();
const SUPABASE_BUCKET_PUBLIC = String(process.env.SUPABASE_BUCKET_PUBLIC || 'true').toLowerCase() !== 'false';

const PLACEHOLDER_IMAGE_URL = '/images/brand/product-placeholder.svg';

/**
 * Public columns retrieved for the storefront catalogue.
 * Strictly excludes internal `"Cost"` column to protect wholesale margin data.
 */
const PUBLIC_PRODUCT_COLUMNS = [
  'id',
  '"Bar Code"',
  '"Product Name"',
  '"Category"',
  '"Country of Origin"',
  '"Supplier"',
  '"Price"',
  '"Items in Stock"',
  '"Items Sold"',
  '"Image Link"',
  '"Ingredients"'
].join(',');

let publicSupabaseClient = null;
let serviceSupabaseClient = null;

function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
}

function getSupabaseClient({ useServiceRole = false } = {}) {
  if (!isSupabaseConfigured()) return null;

  if (useServiceRole && SUPABASE_SERVICE_ROLE_KEY) {
    if (!serviceSupabaseClient) {
      serviceSupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
    }
    return serviceSupabaseClient;
  }

  if (!publicSupabaseClient) {
    publicSupabaseClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  }
  return publicSupabaseClient;
}

/**
 * Safe public configuration for browser Realtime subscriptions (NEVER includes service-role key).
 */
function getPublicRealtimeConfig() {
  if (!isSupabaseConfigured()) return null;
  return {
    url: SUPABASE_URL,
    publishableKey: SUPABASE_PUBLISHABLE_KEY,
    table: SUPABASE_PRODUCTS_TABLE,
    bucket: SUPABASE_STORAGE_BUCKET,
    placeholderImageUrl: PLACEHOLDER_IMAGE_URL
  };
}

/**
 * Normalize URL encoding without double-encoding existing `%XX` sequences,
 * preserving spaces (`%20`), parentheses, and special characters in filenames.
 */
function normalizeEncodedUrl(rawUrl) {
  try {
    const decoded = decodeURI(rawUrl);
    return encodeURI(decoded);
  } catch {
    return rawUrl.replace(/ /g, '%20');
  }
}

/**
 * Signed URL cache for private buckets (if `SUPABASE_BUCKET_PUBLIC=false`).
 */
const signedUrlCache = new Map();

/**
 * Resolve the `"Image Link"` column from `Product lists` into a valid, safe image URL:
 * 1. Complete HTTP(S) Supabase Storage or external public URL -> normalized & used directly.
 * 2. Storage API path (`/storage/v1/object/public/<bucket>/<path>`) -> resolved cleanly.
 * 3. `<bucket>/<objectPath>` reference (including `"Product Imags/..."` typo normalization) -> `getPublicUrl()`.
 * 4. Relative storage object path or bare filename -> `getPublicUrl()` on `SUPABASE_STORAGE_BUCKET`.
 * 5. Missing / empty / invalid -> `PLACEHOLDER_IMAGE_URL` + flagged in diagnostics.
 */
async function resolveSupabaseImageLink(rawImageLink, { client = null } = {}) {
  if (rawImageLink === null || rawImageLink === undefined) {
    return { url: PLACEHOLDER_IMAGE_URL, isPlaceholder: true, reason: 'Missing "Image Link" value' };
  }

  const trimmed = String(rawImageLink).trim();
  if (!trimmed) {
    return { url: PLACEHOLDER_IMAGE_URL, isPlaceholder: true, reason: 'Empty "Image Link" value' };
  }

  // Case 1: Local relative storefront asset (if legacy local fallback)
  if (trimmed.startsWith('images/') || trimmed.startsWith('/images/')) {
    return { url: trimmed.startsWith('/') ? trimmed : `/${trimmed}`, isPlaceholder: false, reason: null };
  }

  // Case 2: Complete HTTP(S) URL
  if (/^https?:\/\//i.test(trimmed)) {
    // Fix common bucket typo `/Product Imags/` or `/Product%20Imags/` in full URLs if present
    const fixedBucketUrl = trimmed
      .replace(/\/storage\/v1\/object\/public\/Product(%20|\s)Imags\//i, '/storage/v1/object/public/Product%20Images/');
    return {
      url: normalizeEncodedUrl(fixedBucketUrl),
      isPlaceholder: false,
      reason: null
    };
  }

  const sb = client || getSupabaseClient();
  if (!sb) {
    return { url: PLACEHOLDER_IMAGE_URL, isPlaceholder: true, reason: 'Supabase client not configured' };
  }

  // Strip leading slashes and `/storage/v1/object/public/` if stored as partial API path
  let cleanPath = trimmed
    .replace(/^\/+/, '')
    .replace(/^storage\/v1\/object\/(?:public|sign)\//i, '');

  let targetBucket = SUPABASE_STORAGE_BUCKET;

  // Detect `<bucket>/<objectPath>` prefix (handling both `Product Images` and `Product Imags`)
  const knownBuckets = [SUPABASE_STORAGE_BUCKET, 'Product Images', 'Product Imags'];
  for (const bName of knownBuckets) {
    const encodedB = encodeURIComponent(bName);
    if (cleanPath.toLowerCase().startsWith(`${bName.toLowerCase()}/`)) {
      cleanPath = cleanPath.slice(bName.length + 1);
      targetBucket = SUPABASE_STORAGE_BUCKET;
      break;
    }
    if (cleanPath.toLowerCase().startsWith(`${encodedB.toLowerCase()}/`)) {
      cleanPath = cleanPath.slice(encodedB.length + 1);
      targetBucket = SUPABASE_STORAGE_BUCKET;
      break;
    }
  }

  // Decode any pre-encoded `%20` before passing to `getPublicUrl` so the SDK encodes once cleanly
  try {
    cleanPath = decodeURIComponent(cleanPath);
  } catch {
    // Keep as-is if not URI-encoded
  }
  cleanPath = cleanPath.replace(/^\/+/, '');

  if (!cleanPath) {
    return { url: PLACEHOLDER_IMAGE_URL, isPlaceholder: true, reason: 'Empty object path after parsing "Image Link"' };
  }

  // Private bucket mode: server-side signed URL with safe expiration cache
  if (!SUPABASE_BUCKET_PUBLIC) {
    const cacheKey = `${targetBucket}:${cleanPath}`;
    const cached = signedUrlCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now() + 60_000) {
      return { url: cached.url, isPlaceholder: false, reason: null };
    }
    const adminSb = getSupabaseClient({ useServiceRole: true });
    const { data, error } = await adminSb.storage.from(targetBucket).createSignedUrl(cleanPath, 3600);
    if (error || !data?.signedUrl) {
      return {
        url: PLACEHOLDER_IMAGE_URL,
        isPlaceholder: true,
        reason: `Signed URL generation failed: ${error?.message || 'unknown error'}`
      };
    }
    signedUrlCache.set(cacheKey, { url: data.signedUrl, expiresAt: Date.now() + 3500_000 });
    return { url: data.signedUrl, isPlaceholder: false, reason: null };
  }

  // Public bucket mode: official Supabase Storage `getPublicUrl()`
  const { data } = sb.storage.from(targetBucket).getPublicUrl(cleanPath);
  if (!data?.publicUrl) {
    return { url: PLACEHOLDER_IMAGE_URL, isPlaceholder: true, reason: 'Could not construct public Storage URL' };
  }

  return { url: data.publicUrl, isPlaceholder: false, reason: null };
}

/**
 * Strictly map `"Country of Origin"` to one of the 4 supported country pages:
 * `'india'`, `'thailand'`, `'sri-lanka'`, `'philippines'`.
 * Never arbitrarily assigns unknown countries — returns `null` so caller flags it!
 */
function mapCountryToRegionSlug(rawCountry) {
  if (!rawCountry) return null;
  const norm = String(rawCountry).trim().toLowerCase();
  if (!norm) return null;

  if (['india', 'in', 'indian', 'bharat', 'הודו'].includes(norm)) return 'india';
  if (['thailand', 'th', 'thai', 'siam', 'תאילנד'].includes(norm)) return 'thailand';
  if (['sri lanka', 'sri-lanka', 'srilanka', 'lk', 'ceylon', 'sri lankan', 'סרי לנקה'].includes(norm)) return 'sri-lanka';
  if (['philippines', 'the philippines', 'philippine', 'ph', 'filipino', 'pilipinas', 'פיליפינים', 'הפיליפינים'].includes(norm)) {
    return 'philippines';
  }
  return null;
}

/**
 * Map `"Category"` (and product name hints for subcategory) to the website's 7 active category slugs:
 * `sweets`, `snacks`, `pantry`, `drinks`, `canned-jarred-goods`, `sauce-seasoning`, `instant-foods`.
 * Returns `null` if missing or unrecognised so it can be flagged rather than arbitrarily assigned.
 */
function mapCategoryAndSubcategory(rawCategory, productTitle = '') {
  if (!rawCategory) return { categorySlug: null, subcategorySlug: 'general' };
  const c = String(rawCategory).trim().toLowerCase();
  if (!c) return { categorySlug: null, subcategorySlug: 'general' };
  const t = String(productTitle || '').toLowerCase();

  if (/(sweet|dessert|candy|candies|chocolate|cookie|biscuit|cake|mithai|mochi|jelly|jellies|halwa|jamun|confectionery)/i.test(c)) {
    let sub = 'cookies';
    if (/chocolate|choc/i.test(c + ' ' + t)) sub = 'chocolates';
    else if (/candy|toffee/i.test(c + ' ' + t)) sub = 'candy';
    else if (/jelly|pudding/i.test(c + ' ' + t)) sub = 'jelly';
    else if (/mochi/i.test(c + ' ' + t)) sub = 'mochi';
    else if (/cake|fudge|bar/i.test(c + ' ' + t)) sub = 'cakes';
    return { categorySlug: 'sweets', subcategorySlug: sub };
  }

  if (/(snack|chip|crisp|puff|cracker|rusk|toast|nut|seed|cornick|seaweed|namkeen|bhujia|murukku|papad)/i.test(c)) {
    let sub = 'chips-crisps-puffs';
    if (/cracker|rusk|toast|bun|skyflakes|fita/i.test(c + ' ' + t)) sub = 'crackers-buns';
    else if (/seaweed|fish|shrimp|prawn|squid|bento/i.test(c + ' ' + t)) sub = 'seafood-snacks';
    else if (/nut|seed|cornick|peanut|cashew|dal/i.test(c + ' ' + t)) sub = 'nuts-seeds';
    return { categorySlug: 'snacks', subcategorySlug: sub };
  }

  if (/(drink|beverage|tea|coffee|juice|nectar|soda|water|milk drink|malt|milo|nestomalt)/i.test(c)) {
    let sub = 'juice';
    if (/coffee|nescafe|kopiko/i.test(c + ' ' + t)) sub = 'coffee';
    else if (/tea|chai|dilmah|zesta|watawala/i.test(c + ' ' + t)) sub = 'tea';
    else if (/milk|soy|milo|bear brand|nestomalt/i.test(c + ' ' + t)) sub = 'soy-milk';
    else if (/soda|sparkling|energy|carabao/i.test(c + ' ' + t)) sub = 'soda';
    return { categorySlug: 'drinks', subcategorySlug: sub };
  }

  if (/(canned|jarred|tin|tinned|preserve|pickle|achar|achcharu|sardine|tuna|corned beef|macapuno|coconut milk)/i.test(c)) {
    let sub = 'canned-jarred-vegetables';
    if (/tuna|sardine|meat|beef|chicken|fish|luncheon|tocino|longganisa/i.test(c + ' ' + t)) sub = 'canned-jarred-meats';
    else if (/fruit|macapuno|jamun|syrup|mango|jackfruit|lychee/i.test(c + ' ' + t)) sub = 'canned-jarred-fruits';
    return { categorySlug: 'canned-jarred-goods', subcategorySlug: sub };
  }

  if (/(sauce|seasoning|spice|masala|curry|paste|condiment|vinegar|ketchup|soy|bagoong|sambol|oil|herb|chili|chilli|marinade)/i.test(c)) {
    let sub = 'spices-seasonings';
    if (/soy sauce|toyo|mushroom soy/i.test(c + ' ' + t)) sub = 'soy-sauces';
    else if (/vinegar|suka/i.test(c + ' ' + t)) sub = 'vinegars';
    else if (/ketchup|banana sauce/i.test(c + ' ' + t)) sub = 'ketchups';
    else if (/hot sauce|sriracha|chili oil/i.test(c + ' ' + t)) sub = 'hot-sauces';
    else if (/dressing|mayo/i.test(c + ' ' + t)) sub = 'dressings';
    else if (/dipping|sweet chili|bagoong|fish sauce|oyster/i.test(c + ' ' + t)) sub = 'dipping-sauces';
    return { categorySlug: 'sauce-seasoning', subcategorySlug: sub };
  }

  if (/(instant|ramen|ready[- ]to[- ]eat|cup noodle|mama|lucky me|yum yum|kottu|soup)/i.test(c)) {
    let sub = 'instant-noodles-ramen';
    if (/soup/i.test(c + ' ' + t)) sub = 'soups';
    else if (/meal|hot pot|ready/i.test(c + ' ' + t)) sub = 'hot-pot-meals';
    return { categorySlug: 'instant-foods', subcategorySlug: sub };
  }

  if (/(pantry|staple|grain|rice|noodle|bihon|canton|vermicelli|pasta|flour|atta|besan|suji|sooji|dal|dhal|lentil|legume|pulse|bean|sugar|jaggery|gur|treacle|ghee|butter|cheese|dairy|spread|baking|cooking)/i.test(c)) {
    let sub = 'rice';
    if (/noodle|bihon|canton|vermicelli|rice paper/i.test(c + ' ' + t)) sub = 'noodles';
    else if (/flour|atta|besan|suji|sooji|hopper/i.test(c + ' ' + t)) sub = 'flour';
    else if (/sugar|jaggery|gur|treacle|honey|palm sugar/i.test(c + ' ' + t)) sub = 'sugar';
    else if (/cheese|ghee|paneer|butter|spread|eden/i.test(c + ' ' + t)) sub = 'spreads-dairy';
    return { categorySlug: 'pantry', subcategorySlug: sub };
  }

  return { categorySlug: null, subcategorySlug: 'general' };
}

/**
 * Parse size/weight/volume from `"Product Name"` (e.g., `(700 ml)`, `(250g)`, `5 kg`, `32 oz (907 g)`).
 */
function extractSizeAndWeight(productName) {
  const name = String(productName || '');

  // Match explicit grams or kg or ml or L
  const kgMatch = name.match(/(\d+(?:\.\d+)?)\s*(?:kg|ק״ג|ק"ג)\b/i);
  if (kgMatch) {
    const val = parseFloat(kgMatch[1]);
    return {
      sizeLabel: `${kgMatch[1]} kg`,
      netWeightGrams: Math.max(1, Math.round(val * 1000)),
      unitMeasureType: '100g'
    };
  }

  const lMatch = name.match(/(\d+(?:\.\d+)?)\s*(?:l|liter|litre|ליטר)\b/i);
  if (lMatch) {
    const val = parseFloat(lMatch[1]);
    return {
      sizeLabel: `${lMatch[1]} L`,
      netWeightGrams: Math.max(1, Math.round(val * 1000)),
      unitMeasureType: '100ml'
    };
  }

  const mlMatch = name.match(/(\d+(?:\.\d+)?)\s*(?:ml|מ״ל|מ"ל)\b/i);
  if (mlMatch) {
    const val = parseFloat(mlMatch[1]);
    return {
      sizeLabel: `${Math.round(val)} ml`,
      netWeightGrams: Math.max(1, Math.round(val)),
      unitMeasureType: '100ml'
    };
  }

  const gMatch = name.match(/(\d+(?:\.\d+)?)\s*(?:g|gm|gms|grams|גרם)\b/i);
  if (gMatch) {
    const val = parseFloat(gMatch[1]);
    return {
      sizeLabel: `${Math.round(val)}g`,
      netWeightGrams: Math.max(1, Math.round(val)),
      unitMeasureType: '100g'
    };
  }

  const ozMatch = name.match(/(\d+(?:\.\d+)?)\s*oz\b/i);
  if (ozMatch) {
    const val = parseFloat(ozMatch[1]);
    return {
      sizeLabel: `${ozMatch[1]} oz`,
      netWeightGrams: Math.max(1, Math.round(val * 28.35)),
      unitMeasureType: '100g'
    };
  }

  return {
    sizeLabel: '',
    netWeightGrams: 250,
    unitMeasureType: '100g'
  };
}

function parseNumericPrice(rawPrice) {
  if (typeof rawPrice === 'number' && Number.isFinite(rawPrice)) return Number(rawPrice.toFixed(2));
  if (rawPrice === null || rawPrice === undefined) return NaN;
  const cleaned = String(rawPrice).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : NaN;
}

function slugifyProduct(title, id) {
  const base = String(title || 'product')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return `${base || 'item'}-${String(id)}`;
}

/**
 * Transform a raw Supabase `"Product lists"` row into the normalized Dinu Market catalogue object.
 */
async function mapSupabaseRowToProduct(row, diagnostics = null, client = null) {
  const rawId = row?.id ?? row?.Id;
  const id = rawId !== undefined && rawId !== null ? String(rawId).trim() : '';
  const rawTitle = String(row?.['Product Name'] ?? '').trim();
  const rawBarcode = row?.['Bar Code'] !== null && row?.['Bar Code'] !== undefined ? String(row['Bar Code']).trim() : '';
  const rawCategory = row?.['Category'] !== null && row?.['Category'] !== undefined ? String(row['Category']).trim() : '';
  const rawCountry = row?.['Country of Origin'] !== null && row?.['Country of Origin'] !== undefined ? String(row['Country of Origin']).trim() : '';
  const rawSupplier = row?.['Supplier'] !== null && row?.['Supplier'] !== undefined ? String(row['Supplier']).trim() : '';
  const rawIngredients = row?.['Ingredients'] !== null && row?.['Ingredients'] !== undefined ? String(row['Ingredients']).trim() : '';
  const rawImageLink = row?.['Image Link'];

  const priceIls = parseNumericPrice(row?.['Price']);
  const stockQtyRaw = row?.['Items in Stock'];
  const stockQuantity = stockQtyRaw !== null && stockQtyRaw !== undefined && !Number.isNaN(Number(stockQtyRaw))
    ? Math.max(0, Math.floor(Number(stockQtyRaw)))
    : 0;
  const soldRaw = row?.['Items Sold'];
  const salesCount = soldRaw !== null && soldRaw !== undefined && !Number.isNaN(Number(soldRaw))
    ? Math.max(0, Math.floor(Number(soldRaw)))
    : 0;

  const regionSlug = mapCountryToRegionSlug(rawCountry);
  const { categorySlug, subcategorySlug } = mapCategoryAndSubcategory(rawCategory, rawTitle);
  const { sizeLabel, netWeightGrams, unitMeasureType } = extractSizeAndWeight(rawTitle);
  const imageResolved = await resolveSupabaseImageLink(rawImageLink, { client });

  const missingFields = [];
  if (!rawTitle) missingFields.push('Product Name');
  if (!Number.isFinite(priceIls) || priceIls < 0) missingFields.push('Price');
  if (!rawSupplier) missingFields.push('Supplier');
  if (!rawIngredients) missingFields.push('Ingredients');
  if (!rawBarcode) missingFields.push('Bar Code');

  if (diagnostics) {
    if (!regionSlug) {
      diagnostics.unrecognisedCountryProducts.push({
        id,
        title: rawTitle || `(Row ${id})`,
        rawCountry: rawCountry || null
      });
    }
    if (!categorySlug) {
      diagnostics.unrecognisedCategoryProducts.push({
        id,
        title: rawTitle || `(Row ${id})`,
        rawCategory: rawCategory || null
      });
    }
    if (imageResolved.isPlaceholder) {
      diagnostics.missingImageProducts.push({
        id,
        title: rawTitle || `(Row ${id})`,
        rawImageLink: rawImageLink ?? null,
        reason: imageResolved.reason
      });
    } else {
      diagnostics.resolvedImagesCount += 1;
    }
    if (missingFields.length > 0) {
      diagnostics.incompleteProducts.push({
        id,
        title: rawTitle || `(Row ${id})`,
        missingFields
      });
    }
  }

  const safePrice = Number.isFinite(priceIls) && priceIls >= 0 ? priceIls : 0;
  const weightRatio = netWeightGrams > 0 ? 100 / netWeightGrams : 1;
  const pricePer100 = Number((safePrice * weightRatio).toFixed(2));
  const title = rawTitle || `Product #${id}`;
  const vendorBrand = rawSupplier || 'Dinu Market';
  const originLabel = rawCountry || 'Imported';
  const categoryLabel = rawCategory || 'Specialty Grocery';

  const generatedDescription = rawIngredients
    ? `${title} — authentic ${originLabel} ${categoryLabel.toLowerCase()} supplied by ${vendorBrand}. Ingredients: ${rawIngredients}`
    : `${title} — authentic ${originLabel} ${categoryLabel.toLowerCase()} stocked in Israel and delivered nationwide by Dinu Market.`;

  return {
    id,
    supabase_id: rawId,
    sku: rawBarcode ? `SB-${rawBarcode}` : `SB-${id}`,
    barcode_ean: rawBarcode,
    title,
    title_he: '',
    slug: slugifyProduct(title, id),
    vendor_brand: vendorBrand,
    category_slug: categorySlug || 'uncategorised',
    subcategory_slug: subcategorySlug,
    raw_category: rawCategory,
    region_slug: regionSlug || 'unassigned',
    raw_country: rawCountry,
    short_description: `${title} (${originLabel})`,
    description: generatedDescription,
    ingredients: rawIngredients,
    allergens: [],
    dietary_tags: [],
    red_labels: [],
    nutrition: {},
    i18n: {
      en: { title, description: generatedDescription }
    },
    storage_instructions: 'Store in a cool, dry place away from direct sunlight.',
    importer_israel: rawSupplier || 'Dinu Market Imports, Israel',
    price_ils: safePrice,
    price_per_100_ils: pricePer100,
    compare_at_price_ils: null,
    discount_percent: 0,
    size_label: sizeLabel || `${netWeightGrams}${unitMeasureType === '100ml' ? ' ml' : 'g'}`,
    net_weight_grams: netWeightGrams,
    unit_measure_type: unitMeasureType,
    stock_quantity: stockQuantity,
    in_stock: stockQuantity > 0,
    low_stock_threshold: 8,
    primary_image_url: imageResolved.url,
    secondary_image_url: '',
    raw_image_link: rawImageLink ?? '',
    has_placeholder_image: imageResolved.isPlaceholder,
    variants: [
      { code: 'single', label: 'Single Pack (1x)', multiplier: 1.0 },
      { code: 'bundle3', label: 'Value 3-Pack (Save 6%)', multiplier: 2.82 },
      { code: 'case6', label: 'Pantry Case of 6 (Save 12%)', multiplier: 5.28 }
    ],
    rating_average: 4.9,
    rating_count: 1,
    sales_count: salesCount,
    is_authentic_photo: imageResolved.isPlaceholder ? 0 : 1,
    is_featured: 1,
    is_new_arrival: true,
    is_active: 1,
    status: 'active',
    source: 'supabase'
  };
}

/**
 * Short-lived catalogue cache (8 seconds TTL) so database changes in Supabase
 * appear automatically without redeploying, while protecting Supabase from burst traffic.
 */
const CACHE_TTL_MS = 8_000;
let catalogueCache = {
  fetchedAt: 0,
  products: [],
  byId: new Map(),
  bySlug: new Map(),
  diagnostics: null,
  error: null
};

let mockRowsProviderForTests = null;

function __setMockRowsProviderForTests(fn) {
  mockRowsProviderForTests = typeof fn === 'function' ? fn : null;
  catalogueCache = {
    fetchedAt: 0,
    products: [],
    byId: new Map(),
    bySlug: new Map(),
    diagnostics: null,
    error: null
  };
}

function invalidateSupabaseCatalogueCache() {
  catalogueCache.fetchedAt = 0;
}

/**
 * Fetch all rows from Supabase `"Product lists"` using paginated `range()` queries
 * (supports catalogues > 1,000 items cleanly), deduplicate by unique `id`, and map fields.
 */
async function fetchSupabaseCatalogue({ forceRefresh = false } = {}) {
  const now = Date.now();
  if (!forceRefresh && catalogueCache.fetchedAt > 0 && now - catalogueCache.fetchedAt < CACHE_TTL_MS) {
    return catalogueCache;
  }

  const diagnostics = {
    configured: isSupabaseConfigured(),
    table: SUPABASE_PRODUCTS_TABLE,
    bucket: SUPABASE_STORAGE_BUCKET,
    totalRowsRetrieved: 0,
    uniqueProductsMapped: 0,
    eligibleAssignableProducts: 0,
    resolvedImagesCount: 0,
    missingImageProducts: [],
    unrecognisedCountryProducts: [],
    unrecognisedCategoryProducts: [],
    incompleteProducts: [],
    rlsLikelyBlockingAnonRead: false,
    lastFetchedAt: new Date().toISOString(),
    error: null
  };

  if (!isSupabaseConfigured()) {
    diagnostics.error = 'Supabase environment variables (SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY) are not configured.';
    return {
      fetchedAt: now,
      products: [],
      byId: new Map(),
      bySlug: new Map(),
      diagnostics,
      error: diagnostics.error
    };
  }

  // Prefer service role on server ONLY if explicitly provided; otherwise use publishable/anon key (respecting RLS)
  const sb = getSupabaseClient({ useServiceRole: Boolean(SUPABASE_SERVICE_ROLE_KEY) });

  try {
    let allRows = [];
    if (mockRowsProviderForTests) {
      allRows = await mockRowsProviderForTests();
    } else {
      const pageSize = 500;
      let from = 0;

      while (true) {
        const { data, error } = await sb
          .from(SUPABASE_PRODUCTS_TABLE)
          .select(PUBLIC_PRODUCT_COLUMNS)
          .order('id', { ascending: true })
          .range(from, from + pageSize - 1);

        if (error) {
          throw new Error(`Supabase query failed (${error.code || 'ERR'}): ${error.message}`);
        }

        if (!data || data.length === 0) break;
        allRows.push(...data);
        if (data.length < pageSize) break;
        from += pageSize;
      }
    }

    diagnostics.totalRowsRetrieved = allRows.length;
    if (allRows.length === 0 && !SUPABASE_SERVICE_ROLE_KEY) {
      diagnostics.rlsLikelyBlockingAnonRead = true;
    }

    // Deduplicate strictly by unique database `id`
    const byId = new Map();
    const bySlug = new Map();

    for (const row of allRows) {
      const rawId = row?.id ?? row?.Id;
      if (rawId === null || rawId === undefined || String(rawId).trim() === '') continue;
      const keyId = String(rawId).trim();
      if (byId.has(keyId)) continue;

      const mapped = await mapSupabaseRowToProduct(row, diagnostics, sb);
      byId.set(keyId, mapped);
      bySlug.set(mapped.slug, mapped);
    }

    const products = Array.from(byId.values());
    diagnostics.uniqueProductsMapped = products.length;
    diagnostics.eligibleAssignableProducts = products.filter(
      (p) => p.region_slug !== 'unassigned' && p.category_slug !== 'uncategorised'
    ).length;

    catalogueCache = {
      fetchedAt: Date.now(),
      products,
      byId,
      bySlug,
      diagnostics,
      error: null
    };

    return catalogueCache;
  } catch (err) {
    // Log safely without leaking keys
    console.error('[Supabase Catalogue Error]:', err.message);
    diagnostics.error = 'Product catalogue is temporarily unable to reach the database. Please try again shortly.';

    // Serve last-known good cache if available during transient network hiccup
    if (catalogueCache.products.length > 0) {
      return {
        ...catalogueCache,
        diagnostics: { ...catalogueCache.diagnostics, staleCacheServed: true, error: diagnostics.error },
        error: diagnostics.error
      };
    }

    return {
      fetchedAt: 0,
      products: [],
      byId: new Map(),
      bySlug: new Map(),
      diagnostics,
      error: diagnostics.error
    };
  }
}

/**
 * Retrieve a single live product directly from Supabase (bypassing cache when `live=true`)
 * for authoritative server-side basket & checkout price/stock validation.
 */
async function getSupabaseProductByIdOrSlug(idOrSlug, { live = false } = {}) {
  const key = String(idOrSlug || '').trim();
  if (!key) return null;

  if (live && isSupabaseConfigured() && !mockRowsProviderForTests) {
    const sb = getSupabaseClient({ useServiceRole: Boolean(SUPABASE_SERVICE_ROLE_KEY) });
    // If numeric or exact ID match, query directly by `id`
    if (/^\d+$/.test(key) || /^[0-9a-f-]{36}$/i.test(key)) {
      const idVal = /^\d+$/.test(key) ? Number(key) : key;
      const { data, error } = await sb
        .from(SUPABASE_PRODUCTS_TABLE)
        .select(PUBLIC_PRODUCT_COLUMNS)
        .eq('id', idVal)
        .maybeSingle();

      if (!error && data) {
        return mapSupabaseRowToProduct(data, null, sb);
      }
    }
  }

  const cat = await fetchSupabaseCatalogue({ forceRefresh: live });
  return cat.byId.get(key) || cat.bySlug.get(key) || null;
}

/**
 * Attempt to decrement stock & increment sold count in Supabase after order capture
 * when `SUPABASE_SERVICE_ROLE_KEY` is configured on the server.
 */
async function deductSupabaseStockAfterOrder(orderItems = []) {
  if (!SUPABASE_SERVICE_ROLE_KEY || !isSupabaseConfigured()) {
    return { updated: false, reason: 'No SUPABASE_SERVICE_ROLE_KEY configured; read-only publishable key active.' };
  }
  const adminSb = getSupabaseClient({ useServiceRole: true });
  for (const item of orderItems) {
    const idVal = /^\d+$/.test(String(item.product_id)) ? Number(item.product_id) : item.product_id;
    const { data: current } = await adminSb
      .from(SUPABASE_PRODUCTS_TABLE)
      .select('id, "Items in Stock", "Items Sold"')
      .eq('id', idVal)
      .maybeSingle();

    if (current) {
      const nextStock = Math.max(0, Number(current['Items in Stock'] || 0) - Number(item.quantity || 0));
      const nextSold = Math.max(0, Number(current['Items Sold'] || 0) + Number(item.quantity || 0));
      await adminSb
        .from(SUPABASE_PRODUCTS_TABLE)
        .update({ 'Items in Stock': nextStock, 'Items Sold': nextSold })
        .eq('id', idVal);
    }
  }
  invalidateSupabaseCatalogueCache();
  return { updated: true };
}

const REGION_SLUG_TO_COUNTRY_LABEL = {
  india: 'India',
  thailand: 'Thailand',
  'sri-lanka': 'Sri Lanka',
  philippines: 'Philippines'
};

const CATEGORY_SLUG_TO_LABEL = {
  sweets: 'Sweets',
  snacks: 'Snacks',
  pantry: 'Pantry',
  drinks: 'Drinks',
  'canned-jarred-goods': 'Canned & Jarred Goods',
  'sauce-seasoning': 'Sauce & Seasoning',
  'instant-foods': 'Instant Foods'
};

async function adminCreateSupabaseProduct(payload = {}) {
  if (!SUPABASE_SERVICE_ROLE_KEY || !isSupabaseConfigured()) {
    throw new Error(
      'Direct catalogue writes from the website Admin Dashboard require SUPABASE_SERVICE_ROLE_KEY on the server. Manage products directly in the Supabase "Product lists" table or set SUPABASE_SERVICE_ROLE_KEY.'
    );
  }
  const adminSb = getSupabaseClient({ useServiceRole: true });
  const titleWithSize =
    payload.size_label && !String(payload.title || '').includes(payload.size_label)
      ? `${payload.title} (${payload.size_label})`
      : payload.title;

  const insertRow = {
    'Bar Code': payload.barcode_ean || null,
    'Product Name': titleWithSize,
    Category: CATEGORY_SLUG_TO_LABEL[payload.category_slug] || payload.category_slug || 'Snacks',
    'Country of Origin': REGION_SLUG_TO_COUNTRY_LABEL[payload.region_slug] || payload.region_slug || 'India',
    Supplier: payload.vendor_brand || 'Dinu Market',
    Price: Number(payload.price_ils || 0),
    'Items in Stock': Math.max(0, parseInt(payload.stock_quantity ?? 25, 10)),
    'Items Sold': 0,
    'Image Link': payload.primary_image_url || null,
    Ingredients: payload.ingredients || payload.description || null
  };

  const { data, error } = await adminSb
    .from(SUPABASE_PRODUCTS_TABLE)
    .insert(insertRow)
    .select(PUBLIC_PRODUCT_COLUMNS)
    .single();

  if (error) {
    throw new Error(`Supabase insert failed: ${error.message}`);
  }
  invalidateSupabaseCatalogueCache();
  return mapSupabaseRowToProduct(data, null, adminSb);
}

async function adminUpdateSupabaseProduct(id, payload = {}) {
  if (!SUPABASE_SERVICE_ROLE_KEY || !isSupabaseConfigured()) {
    throw new Error(
      'Direct catalogue updates from the website Admin Dashboard require SUPABASE_SERVICE_ROLE_KEY on the server. Edit rows directly in Supabase "Product lists" or set SUPABASE_SERVICE_ROLE_KEY.'
    );
  }
  const adminSb = getSupabaseClient({ useServiceRole: true });
  const idVal = /^\d+$/.test(String(id)) ? Number(id) : id;
  const patch = {};
  if (payload.title !== undefined) patch['Product Name'] = payload.title;
  if (payload.price_ils !== undefined) patch['Price'] = Math.max(0, Number(payload.price_ils));
  if (payload.stock_quantity !== undefined) patch['Items in Stock'] = Math.max(0, parseInt(payload.stock_quantity, 10));
  if (payload.status === 'archived') patch['Items in Stock'] = 0;

  const { data, error } = await adminSb
    .from(SUPABASE_PRODUCTS_TABLE)
    .update(patch)
    .eq('id', idVal)
    .select(PUBLIC_PRODUCT_COLUMNS)
    .maybeSingle();

  if (error) {
    throw new Error(`Supabase update failed: ${error.message}`);
  }
  invalidateSupabaseCatalogueCache();
  return data ? mapSupabaseRowToProduct(data, null, adminSb) : null;
}

async function adminDeleteSupabaseProduct(id) {
  if (!SUPABASE_SERVICE_ROLE_KEY || !isSupabaseConfigured()) {
    throw new Error(
      'Deleting products from the website Admin Dashboard requires SUPABASE_SERVICE_ROLE_KEY on the server. Delete rows in Supabase "Product lists" or set SUPABASE_SERVICE_ROLE_KEY.'
    );
  }
  const adminSb = getSupabaseClient({ useServiceRole: true });
  const idVal = /^\d+$/.test(String(id)) ? Number(id) : id;
  const { error } = await adminSb.from(SUPABASE_PRODUCTS_TABLE).delete().eq('id', idVal);
  if (error) {
    throw new Error(`Supabase delete failed: ${error.message}`);
  }
  invalidateSupabaseCatalogueCache();
  return true;
}

module.exports = {
  SUPABASE_URL,
  SUPABASE_PRODUCTS_TABLE,
  SUPABASE_STORAGE_BUCKET,
  PUBLIC_PRODUCT_COLUMNS,
  PLACEHOLDER_IMAGE_URL,
  isSupabaseConfigured,
  getSupabaseClient,
  getPublicRealtimeConfig,
  resolveSupabaseImageLink,
  mapCountryToRegionSlug,
  mapCategoryAndSubcategory,
  extractSizeAndWeight,
  mapSupabaseRowToProduct,
  fetchSupabaseCatalogue,
  getSupabaseProductByIdOrSlug,
  deductSupabaseStockAfterOrder,
  invalidateSupabaseCatalogueCache,
  adminCreateSupabaseProduct,
  adminUpdateSupabaseProduct,
  adminDeleteSupabaseProduct,
  __setMockRowsProviderForTests
};
