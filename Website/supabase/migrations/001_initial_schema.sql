-- ============================================================================
-- DINU MARKET — AUTHORITATIVE SUPABASE POSTGRESQL SCHEMA & SEED MIGRATION
-- Complies with "Design of the DINU Market.docx" (Sections 13, 14, 16, 17)
-- and "DINU_MARKET_Brand_Identity_and_Design_System.docx"
-- ============================================================================
-- Business Location & Shipping Origin: Israel
-- Delivery Destination: Israel ONLY (Domestic Israeli shipping only)
-- Sourcing Countries of Origin: India, Thailand, Sri Lanka, Philippines
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ----------------------------------------------------------------------------
-- 1. COUNTRIES OF ORIGIN (Strictly India, Thailand, Sri Lanka, Philippines)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.countries_of_origin (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    name_he TEXT DEFAULT '',
    slug TEXT UNIQUE NOT NULL CHECK (slug IN ('india', 'thailand', 'sri-lanka', 'philippines')),
    iso_code CHAR(2) NOT NULL,
    flag_emoji TEXT DEFAULT '',
    hero_headline TEXT DEFAULT '',
    description TEXT DEFAULT '',
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Alias view for compatibility
CREATE OR REPLACE VIEW public.regions AS SELECT * FROM public.countries_of_origin;

-- ----------------------------------------------------------------------------
-- 2. PRODUCT CATEGORIES & SUBCATEGORIES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_slug TEXT,
    name TEXT NOT NULL,
    name_he TEXT DEFAULT '',
    slug TEXT UNIQUE NOT NULL,
    description TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 3. BRANDS AND MANUFACTURERS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    country_slug TEXT REFERENCES public.countries_of_origin(slug),
    importer_israel TEXT DEFAULT '',
    description TEXT DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 4. PRODUCTS (Master Catalogue Table)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT UNIQUE NOT NULL,
    barcode_ean TEXT DEFAULT '',
    title TEXT NOT NULL,
    title_he TEXT DEFAULT '',
    slug TEXT UNIQUE NOT NULL,
    vendor_brand TEXT NOT NULL,
    brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
    category_slug TEXT NOT NULL,
    subcategory_slug TEXT NOT NULL,
    region_slug TEXT NOT NULL REFERENCES public.countries_of_origin(slug),
    short_description TEXT NOT NULL,
    description TEXT NOT NULL,
    size_label TEXT NOT NULL DEFAULT '250g',
    net_weight_grams INTEGER NOT NULL DEFAULT 250,
    unit_measure_type TEXT NOT NULL DEFAULT '100g',
    ingredients TEXT DEFAULT '',
    allergens_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    dietary_tags_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    red_labels_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    nutrition_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    i18n_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    storage_instructions TEXT DEFAULT 'Store in a cool, dry place away from direct sunlight.',
    importer_israel TEXT DEFAULT '',
    purchase_price_ils NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (purchase_price_ils >= 0),
    price_ils NUMERIC(10,2) NOT NULL CHECK (price_ils >= 0),
    promotional_price_ils NUMERIC(10,2) CHECK (promotional_price_ils IS NULL OR promotional_price_ils >= 0),
    compare_at_price_ils NUMERIC(10,2),
    vat_rate NUMERIC(5,2) NOT NULL DEFAULT 18.00,
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    low_stock_threshold INTEGER NOT NULL DEFAULT 8,
    expiry_date TEXT DEFAULT '',
    primary_image_url TEXT NOT NULL,
    secondary_image_url TEXT DEFAULT '',
    variants_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discontinued')),
    is_authentic_photo BOOLEAN NOT NULL DEFAULT TRUE,
    is_featured BOOLEAN NOT NULL DEFAULT TRUE,
    is_best_seller BOOLEAN NOT NULL DEFAULT FALSE,
    is_new_arrival BOOLEAN NOT NULL DEFAULT FALSE,
    rating_average NUMERIC(3,2) NOT NULL DEFAULT 0.00,
    rating_count INTEGER NOT NULL DEFAULT 0,
    sales_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 5. PRODUCT IMAGES (Supabase Storage Bucket Paths: /products/{region}/...)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    public_url TEXT NOT NULL,
    alt_text TEXT NOT NULL,
    image_type TEXT NOT NULL DEFAULT 'front' CHECK (image_type IN ('front', 'back_label', 'gallery')),
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 6. PRODUCT VARIANTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    variant_code TEXT NOT NULL,
    variant_label TEXT NOT NULL,
    price_multiplier NUMERIC(6,2) NOT NULL DEFAULT 1.00,
    sku_suffix TEXT DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (product_id, variant_code)
);

-- ----------------------------------------------------------------------------
-- 7. INVENTORY AND STOCK LEVELS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inventory_levels (
    product_id UUID PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
    available_quantity INTEGER NOT NULL DEFAULT 0 CHECK (available_quantity >= 0),
    reserved_quantity INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
    low_stock_threshold INTEGER NOT NULL DEFAULT 8,
    warehouse_location TEXT NOT NULL DEFAULT 'Central Israel Fulfillment Hub',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 8. PRODUCT PRICING
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    purchase_price_ils NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    selling_price_ils NUMERIC(10,2) NOT NULL,
    promotional_price_ils NUMERIC(10,2),
    vat_rate NUMERIC(5,2) NOT NULL DEFAULT 18.00,
    effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    effective_to TIMESTAMPTZ
);

-- ----------------------------------------------------------------------------
-- 9. PROMOTIONAL OFFERS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.promotional_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    discount_percent NUMERIC(5,2) NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 90),
    promotional_price_ils NUMERIC(10,2),
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ends_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 10. CUSTOMERS / PROFILES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL DEFAULT '',
    last_name TEXT NOT NULL DEFAULT '',
    full_name TEXT NOT NULL,
    phone TEXT DEFAULT '',
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'support_agent', 'fulfillment_staff', 'catalog_manager', 'super_admin')),
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    marketing_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
    is_suspended BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 11. CUSTOMER ADDRESSES (Strictly Domestic Israel Addresses Only)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    label TEXT NOT NULL DEFAULT 'Home',
    first_name TEXT NOT NULL DEFAULT '',
    last_name TEXT NOT NULL DEFAULT '',
    recipient_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'Israel' CHECK (country = 'Israel'),
    zone_code TEXT NOT NULL DEFAULT 'IL-Z1',
    city TEXT NOT NULL,
    street_address TEXT NOT NULL,
    building_number TEXT NOT NULL DEFAULT '',
    apartment_number TEXT DEFAULT '',
    postal_code TEXT NOT NULL DEFAULT '',
    delivery_notes TEXT DEFAULT '',
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 12. SHOPPING CARTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'active',
    discount_code TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 13. CART ITEMS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    variant_code TEXT NOT NULL DEFAULT 'single',
    variant_label TEXT NOT NULL DEFAULT 'Single Pack',
    price_multiplier NUMERIC(6,2) NOT NULL DEFAULT 1.00,
    quantity INTEGER NOT NULL CHECK (quantity > 0 AND quantity <= 99),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (cart_id, product_id, variant_code)
);

-- ----------------------------------------------------------------------------
-- 14. SHIPPING METHODS (Domestic Israeli Shipping Only)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shipping_methods (
    zone_code TEXT PRIMARY KEY,
    name_en TEXT NOT NULL,
    name_he TEXT NOT NULL,
    cities_text TEXT NOT NULL,
    standard_rate_ils NUMERIC(10,2) NOT NULL,
    express_rate_ils NUMERIC(10,2),
    locker_rate_ils NUMERIC(10,2) NOT NULL,
    free_threshold_ils NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    free_shipping_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    estimated_days TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- ----------------------------------------------------------------------------
-- 15. DISCOUNT CODES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.discount_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed', 'free_shipping')),
    discount_value NUMERIC(10,2) NOT NULL,
    min_order_ils NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 16. ORDERS (All 9 Required Statuses, Domestic Israel Only)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    customer_email TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Payment Received' CHECK (status IN (
        'Pending Payment',
        'Payment Received',
        'Processing',
        'Packed',
        'Dispatched',
        'Out for Delivery',
        'Delivered',
        'Cancelled',
        'Refunded'
    )),
    payment_status TEXT NOT NULL DEFAULT 'captured',
    payment_method TEXT NOT NULL,
    installments INTEGER NOT NULL DEFAULT 1,
    transaction_ref TEXT NOT NULL,
    idempotency_key TEXT UNIQUE NOT NULL,
    card_last4 TEXT DEFAULT '',
    tax_invoice_number TEXT NOT NULL,
    shipping_country TEXT NOT NULL DEFAULT 'Israel' CHECK (shipping_country = 'Israel'),
    zone_code TEXT NOT NULL,
    delivery_method TEXT NOT NULL,
    shipping_address_json JSONB NOT NULL,
    subtotal_ils NUMERIC(10,2) NOT NULL,
    discount_code TEXT,
    discount_amount_ils NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    shipping_cost_ils NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    vat_included_ils NUMERIC(10,2) NOT NULL,
    total_ils NUMERIC(10,2) NOT NULL,
    tracking_number TEXT NOT NULL,
    carrier_name TEXT NOT NULL DEFAULT 'Israel Domestic Courier',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 17. ORDER ITEMS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    sku TEXT NOT NULL,
    title TEXT NOT NULL,
    variant_code TEXT NOT NULL DEFAULT 'single',
    variant_label TEXT NOT NULL DEFAULT 'Single Pack',
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price_ils NUMERIC(10,2) NOT NULL,
    line_total_ils NUMERIC(10,2) NOT NULL
);

-- ----------------------------------------------------------------------------
-- 18. PAYMENTS (Tokenized References Only - PCI-DSS Compliant)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'PayPlus Israel (PCI-DSS Level 1)',
    payment_method TEXT NOT NULL,
    transaction_ref TEXT UNIQUE NOT NULL,
    card_last4 TEXT DEFAULT '',
    installments INTEGER NOT NULL DEFAULT 1,
    amount_ils NUMERIC(10,2) NOT NULL,
    currency CHAR(3) NOT NULL DEFAULT 'ILS',
    status TEXT NOT NULL DEFAULT 'captured' CHECK (status IN ('pending', 'captured', 'failed', 'refunded')),
    verified_server_side BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 19. SHIPPING RECORDS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shipping_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    carrier_name TEXT NOT NULL,
    tracking_number TEXT NOT NULL,
    delivery_method TEXT NOT NULL,
    shipping_country TEXT NOT NULL DEFAULT 'Israel' CHECK (shipping_country = 'Israel'),
    zone_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Processing',
    tracking_history_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    dispatched_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 20. CUSTOMER REVIEWS (Genuine Verified Reviews Only)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    author_name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    is_verified_purchase BOOLEAN NOT NULL DEFAULT TRUE,
    is_approved BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 21. WEBSITE CONTENT & BANNERS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.website_content (
    key TEXT PRIMARY KEY,
    section TEXT NOT NULL,
    content_json JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 22. NEWSLETTER SUBSCRIBERS (Explicit Consent Required)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    explicit_consent BOOLEAN NOT NULL DEFAULT TRUE CHECK (explicit_consent = TRUE),
    preferred_regions JSONB NOT NULL DEFAULT '["india","thailand","sri-lanka","philippines"]'::jsonb,
    status TEXT NOT NULL DEFAULT 'subscribed' CHECK (status IN ('subscribed', 'unsubscribed')),
    subscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 23. CUSTOMER WISHLISTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wishlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    session_token TEXT,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, product_id)
);

-- ----------------------------------------------------------------------------
-- 24. ADMIN SECURITY AUDIT LOGS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_email TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    details TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ATOMIC INVENTORY DEDUCTION & RESTORATION STORED PROCEDURES
-- Prevents concurrent purchases from creating negative stock
-- ============================================================================
CREATE OR REPLACE FUNCTION public.deduct_inventory_atomic(p_product_id UUID, p_qty INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    rows_updated INTEGER;
BEGIN
    UPDATE public.products
    SET stock_quantity = stock_quantity - p_qty,
        sales_count = sales_count + p_qty,
        updated_at = NOW()
    WHERE id = p_product_id AND stock_quantity >= p_qty AND status = 'active';
    GET DIAGNOSTICS rows_updated = ROW_COUNT;

    IF rows_updated = 0 THEN
        RAISE EXCEPTION 'Insufficient stock for product %', p_product_id;
    END IF;

    UPDATE public.inventory_levels
    SET available_quantity = available_quantity - p_qty,
        updated_at = NOW()
    WHERE product_id = p_product_id;

    RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_inventory_atomic(p_product_id UUID, p_qty INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.products
    SET stock_quantity = stock_quantity + p_qty,
        updated_at = NOW()
    WHERE id = p_product_id;

    UPDATE public.inventory_levels
    SET available_quantity = available_quantity + p_qty,
        updated_at = NOW()
    WHERE product_id = p_product_id;

    RETURN TRUE;
END;
$$;

-- ============================================================================
-- INDEXES FOR PERFORMANCE & SEARCH
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_products_region ON public.products(region_slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_slug, subcategory_slug);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_number ON public.orders(order_number);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES (Section 13 Database Security)
-- ============================================================================
ALTER TABLE public.countries_of_origin ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotional_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Public read access for active catalog tables only
CREATE POLICY "Public read active countries" ON public.countries_of_origin FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Public read active categories" ON public.categories FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Public read active brands" ON public.brands FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Public read active products" ON public.products FOR SELECT USING (status = 'active');
CREATE POLICY "Public read product images" ON public.product_images FOR SELECT USING (TRUE);
CREATE POLICY "Public read active variants" ON public.product_variants FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Public read active offers" ON public.promotional_offers FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Public read active shipping methods" ON public.shipping_methods FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Public read approved reviews" ON public.product_reviews FOR SELECT USING (is_approved = TRUE);
CREATE POLICY "Public read website content" ON public.website_content FOR SELECT USING (TRUE);

-- Customers access only their own records
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users manage own addresses" ON public.customer_addresses FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own cart" ON public.carts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users read own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users read own order items" ON public.order_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
);
CREATE POLICY "Users manage own wishlist" ON public.wishlists FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- SEED DATA: 4 COUNTRIES OF ORIGIN, CATEGORIES, BRANDS & 6 AUTHENTIC PRODUCTS
-- ============================================================================
INSERT INTO public.countries_of_origin (name, name_he, slug, iso_code, flag_emoji, hero_headline, description, display_order) VALUES
    ('India', 'הודו', 'india', 'IN', '🇮🇳', 'Authentic Flavours of India', 'Explore traditional Indian bakery cookies, crispy whole-wheat rusks, natural unrefined cane jaggery, cardamom-steeped Gulab Jamun, and aged extra-long Basmati rice delivered across Israel.', 1),
    ('Thailand', 'תאילנד', 'thailand', 'TH', '🇹🇭', 'Authentic Flavours of Thailand', 'Explore aromatic Thai kitchen staples, curry pastes, coconut milks, jasmine rice, and wok sauces delivered across Israel.', 2),
    ('Sri Lanka', 'סרי לנקה', 'sri-lanka', 'LK', '🇱🇰', 'Authentic Flavours of Sri Lanka', 'Explore pure Ceylon teas, whole island spices, coconut sambols, and Sri Lankan culinary essentials delivered across Israel.', 3),
    ('Philippines', 'הפיליפינים', 'philippines', 'PH', '🇵🇭', 'Authentic Flavours of the Philippines', 'Explore beloved Filipino pantry staples, soy and vinegar marinades, noodles, and tropical treats delivered across Israel.', 4)
ON CONFLICT (slug) DO UPDATE SET
    hero_headline = EXCLUDED.hero_headline,
    description = EXCLUDED.description;

INSERT INTO public.brands (name, slug, country_slug, importer_israel, description) VALUES
    ('Haldiram''s', 'haldirams', 'india', 'Maharaja Ltd., HaAvoda 32, Ashdod, Israel', 'Iconic Indian sweets, snacks, and bakery producer founded in 1937.'),
    ('Flavorz (Spice of India)', 'flavorz', 'india', 'Shasha Yehoram Ltd., HaYetzira 23, Ramla, Israel', 'Producer of 100% natural unrefined Indian sugar cane jaggery.'),
    ('Silver Swan', 'silver-swan', 'philippines', 'Dinu Market Imports, Israel', 'Classic Filipino savory soy sauce and kitchen condiments.'),
    ('Lal Qilla (No. 4268)', 'lal-qilla', 'india', 'Gershon Spices Ltd., Israel', 'Royal aged extra-long grain sella parboiled Basmati rice.'),
    ('Maggi', 'maggi', 'philippines', 'Dinu Market Imports, Israel', 'Beloved Magic Sarap all-in-one seasoning granules and kitchen staples.'),
    ('UFC (NutriAsia)', 'ufc', 'philippines', 'Dinu Market Imports, Israel', 'The Philippines'' #1 Tamis Anghang sweet and spicy banana sauce.'),
    ('Super Q', 'super-q', 'philippines', 'Dinu Market Imports, Israel', 'Traditional Golden Bihon and Special Pancit Canton Filipino noodles.'),
    ('Eden (Mondelēz)', 'eden', 'philippines', 'Dinu Market Imports, Israel', 'Creamy Filipino processed filled cheese blocks and spreads.'),
    ('Cabalen', 'cabalen', 'philippines', 'Dinu Market Imports, Israel', 'Authentic Kapampangan sautéed bagoong alamang shrimp paste.'),
    ('Buenas', 'buenas', 'philippines', 'Dinu Market Imports, Israel', 'Traditional Philippine macapuno coconut strings and tropical preserves.'),
    ('Boy Bawang', 'boy-bawang', 'philippines', 'Dinu Market Imports, Israel', 'Ultra-crunchy roasted garlic Filipino cornick snacks.'),
    ('Unisman (King Choc Nut)', 'king-choc-nut', 'philippines', 'Dinu Market Imports, Israel', 'Iconic Filipino roasted peanut milk chocolate mini bars.')
ON CONFLICT (slug) DO UPDATE SET
    country_slug = EXCLUDED.country_slug,
    description = EXCLUDED.description;

INSERT INTO public.products (
    sku, barcode_ean, title, title_he, slug, vendor_brand, category_slug, subcategory_slug, region_slug,
    short_description, description, size_label, net_weight_grams, unit_measure_type,
    ingredients, allergens_json, dietary_tags_json, red_labels_json, nutrition_json,
    importer_israel, purchase_price_ils, price_ils, promotional_price_ils, compare_at_price_ils,
    stock_quantity, low_stock_threshold, expiry_date, primary_image_url, secondary_image_url,
    status, is_authentic_photo, is_featured, is_best_seller, is_new_arrival
) VALUES
    (
        'DM-IN-001', '8904004416091',
        'Haldiram''s Gorus Premium Handmade Cookies (250g)',
        'עוגיות גורוס פרימיום האלדירם 250 גרם',
        'haldirams-gorus-premium-cookies-250g',
        'Haldiram''s', 'sweets', 'cookies', 'india',
        'Crunchy golden Indian bakery biscuits crafted with wheat, cashews, and aromatic cardamom.',
        'Live life at its crunchiest with Haldiram’s Gorus Cookies, the perfect bite of crunchy delight to pair with hot masala chai or coffee. Baked in Nagpur, India and officially imported to Israel with full Hebrew nutritional labeling.',
        '250g', 250, '100g',
        'Refined Wheat Flour (Maida), Sugar, Edible Vegetable Oil, Cashews, Milk Solids, Liquid Glucose, Raising Agent [INS 500(ii)].',
        '["Wheat (Gluten)", "Cashews (Tree Nuts)", "Milk", "May contain Almond, Peanut, Mustard, Sesame & Soy"]'::jsonb,
        '["Vegetarian"]'::jsonb,
        '["High Sugar (סוכר בכמות גבוהה)", "High Saturated Fat (שומן רווי בכמות גבוהה)"]'::jsonb,
        '{"calories_per_100g": 519, "protein_g": 7.4, "carbs_g": 58.8, "sugars_g": 26.0, "total_fat_g": 27.6, "saturated_fat_g": 12.2, "trans_fat_g": "<0.5", "sodium_mg": 46}'::jsonb,
        'Maharaja Ltd., HaAvoda 32, Ashdod, Israel',
        9.50, 15.00, NULL, NULL,
        45, 8, '2027-06-06',
        'images/products/gorus-cookies-front.png?v=20261123prod1', 'images/products/gorus-cookies-back.jpg',
        'active', TRUE, TRUE, TRUE, FALSE
    ),
    (
        'DM-IN-002', '8904004417319',
        'Haldiram''s Rusky Whole Wheat Atta Toast (250g)',
        'טוסט חיטה מלאה ראסקי האלדירם 250 גרם',
        'haldirams-rusky-whole-wheat-atta-toast-250g',
        'Haldiram''s', 'snacks', 'crackers-buns', 'india',
        'Twice-baked crispy whole wheat atta bread toast (rusk), trans-fat free and rich in dietary fibre.',
        'Haldiram’s Rusky Atta Toast is a classic Indian tea-time staple baked with whole wheat flour for a wholesome, golden crunch. Trans-fat free and a natural source of dietary fibre.',
        '250g', 250, '100g',
        'Whole Wheat Flour (Atta), Sugar, Edible Vegetable Oil, Yeast, Milk Solids, Salt, Cardamom.',
        '["Wheat (Gluten)", "Milk", "May contain Soy & Sesame"]'::jsonb,
        '["Vegetarian", "Trans-Fat Free", "High Fibre"]'::jsonb,
        '["High Sugar (סוכר בכמות גבוהה)"]'::jsonb,
        '{"calories_per_100g": 435, "protein_g": 9.8, "carbs_g": 72.4, "sugars_g": 21.0, "total_fat_g": 11.2, "saturated_fat_g": 3.8, "trans_fat_g": "0", "sodium_mg": 240}'::jsonb,
        'Maharaja Ltd., HaAvoda 32, Ashdod, Israel',
        8.20, 13.00, NULL, NULL,
        52, 8, '2027-05-30',
        'images/products/rusky-atta-toast-front.jpg', 'images/products/rusky-atta-toast-back.jpg',
        'active', TRUE, TRUE, TRUE, TRUE
    ),
    (
        'DM-IN-003', '8906042233463',
        'Flavorz 100% Natural Unrefined Jaggery Cubes (500g Jar)',
        'ג''אגרי קוביות סוכר קנים טבעי לא מזוקק 500 גרם',
        'flavorz-natural-jaggery-cubes-500g',
        'Flavorz (Spice of India)', 'pantry', 'sugar', 'india',
        '100% natural unrefined sugar cane jaggery cubes (~50 cubes per jar) crafted on organic farms without chemical preservatives.',
        'Traditional Indian unrefined cane sweetener (Gur / Jaggery) in convenient bite-sized 10g cubes. Retains natural trace minerals including iron, calcium, potassium, and magnesium.',
        '500g', 500, '100g',
        '100% Natural Unrefined Sugar Cane Juice.',
        '["Packaged in a facility that handles Wheat, Peanuts, Tree Nuts, Soy, Sesame, Mustard & Dairy"]'::jsonb,
        '["Vegan", "Vegetarian", "100% Natural", "Chemical-Free"]'::jsonb,
        '["High Sugar (סוכר בכמות גבוהה)"]'::jsonb,
        '{"calories_per_100g": 367, "protein_g": 5.19, "carbs_g": 64.0, "sugars_g": 60.0, "total_fat_g": 0.17, "saturated_fat_g": 0.0, "sodium_mg": 4.6, "potassium_mg": 407, "calcium_mg": 103, "iron_mg": 8.35}'::jsonb,
        'Shasha Yehoram Ltd., HaYetzira 23, Ramla, Israel (08-9209939)',
        14.00, 22.00, NULL, NULL,
        38, 8, '2027-08-15',
        'images/products/flavorz-jaggery-front.jpg', 'images/products/flavorz-jaggery-back.jpg',
        'active', TRUE, TRUE, FALSE, TRUE
    ),
    (
        'DM-IN-004', '8904004405910',
        'Haldiram''s Gulab Jamun in Cardamom Rose Syrup (1 kg Tin)',
        'גולאב ג''אמון בסירופ הל האלדירם מארז 1 ק״ג (16 יח׳)',
        'haldirams-gulab-jamun-tin-1kg',
        'Haldiram''s', 'canned-jarred-goods', 'canned-jarred-fruits', 'india',
        '16 soft, melt-in-the-mouth milk-solid (khoa) dumplings steeped in fragrant cardamom syrup. Ready to warm and serve.',
        'Authentic Indian Gulab Jamun crafted from rich khoa (milk solids) and delicately spiced with green cardamom. Contains 16 pieces (1 kg net weight / 430g drained weight).',
        '1 kg', 1000, '100g',
        'Sugar, Water, Milk Solids (Khoa & Skimmed Milk Powder), Refined Wheat Flour (Maida), Palmolein Oil, Cardamom, Rose Water.',
        '["Milk (Dairy)", "Wheat (Gluten)"]'::jsonb,
        '["Vegetarian"]'::jsonb,
        '["High Sugar (סוכר בכמות גבוהה)", "High Saturated Fat (שומן רווי בכמות גבוהה)"]'::jsonb,
        '{"calories_per_100g": 312, "protein_g": 4.2, "carbs_g": 56.5, "sugars_g": 46.0, "total_fat_g": 8.1, "saturated_fat_g": 3.9, "sodium_mg": 35}'::jsonb,
        'Maharaja Ltd., HaAvoda 32, Ashdod, Israel',
        19.00, 29.90, NULL, NULL,
        33, 8, '2027-09-10',
        'images/products/haldirams-gulab-jamun-front.jpg', 'images/products/haldirams-gulab-jamun-back.jpg',
        'active', TRUE, TRUE, TRUE, FALSE
    ),
    (
        'DM-IN-005', '8901161104762',
        'Lal Qilla Supreme Sella Parboiled Extra-Long Basmati Rice (5 kg Bag)',
        'אורז לבן בסמטי סופרים סלה לאל קילה שק 5 ק״ג (כשר בד״ץ)',
        'lal-qilla-supreme-sella-basmati-rice-5kg',
        'Lal Qilla (No. 4268)', 'pantry', 'rice', 'india',
        'Royal aged extra-long grain parboiled sella basmati rice in a 5 kg family carry sack. Non-GMO and certified Kosher.',
        'Lal Qilla Supreme Sella (Meza) Parboiled Basmati Rice features slender, aromatic grains that elongate to more than double their length when cooked while staying fluffy and separate.',
        '5 kg', 5000, '100g',
        '100% Aged Extra-Long Grain Parboiled Basmati Rice (Non-GMO).',
        '[]'::jsonb,
        '["Kosher (Badatz & Chief Rabbinate)", "Vegan", "Gluten-Free", "Non-GMO"]'::jsonb,
        '[]'::jsonb,
        '{"calories_per_100g_dry": 333, "calories_per_100g_cooked": 167, "protein_g": 6.7, "carbs_g": 77.8, "sugars_g": 0.0, "total_fat_g": 0.0, "saturated_fat_g": 0.0, "sodium_mg": 2}'::jsonb,
        'Gershon Spices Ltd., Israel (Approved by Chief Rabbinate of Israel & Badatz Jerusalem)',
        48.00, 69.90, NULL, NULL,
        42, 8, '2028-04-01',
        'images/products/lal-qilla-basmati-rice-front.jpg', 'images/products/lal-qilla-basmati-rice-back.jpg',
        'active', TRUE, TRUE, TRUE, TRUE
    ),
    (
        'DM-IN-006', '079809001624',
        'Silver Swan Special Soy Sauce 1 Liter Family Jug (1000 ml)',
        'רוטב סויה מיוחד סילבר סוואן 1 ליטר',
        'silver-swan-special-soy-sauce-1000ml',
        'Silver Swan', 'sauce-seasoning', 'soy-sauces', 'philippines',
        'Rich, savory soy sauce in a 1-liter handled jug, essential for stir-fries, marinades, rice dishes, and dipping sauces.',
        'Silver Swan Special Soy Sauce delivers deep umami and balanced salinity in a generous 1000 ml handled bottle for everyday cooking, marinades, and table dipping.',
        '1000 ml', 1000, '100ml',
        'Water, Soybean Extract, Wheat, Iodized Salt, Caramel Color, Less than 0.1% Potassium Sorbate as preservative.',
        '["Soybeans", "Wheat (Gluten)"]'::jsonb,
        '["Vegan", "Vegetarian"]'::jsonb,
        '["High Sodium (נתרן בכמות גבוהה)"]'::jsonb,
        '{"calories_per_100g": 53, "protein_g": 4.0, "carbs_g": 6.7, "sugars_g": 0.0, "total_fat_g": 0.0, "saturated_fat_g": 0.0, "sodium_mg": 5800}'::jsonb,
        'Dinu Market Imports, Israel',
        12.00, 19.00, NULL, NULL,
        64, 8, '2028-01-20',
        'images/products/silver-swan-soy-sauce-front.jpg?v=20261119', 'images/products/silver-swan-soy-sauce-back.jpg',
        'active', TRUE, TRUE, TRUE, TRUE
    ),
    (
        'DM-PH-002', '4800361390804',
        'Maggi Magic Sarap All-in-One Seasoning Granules (150g)',
        'מאגי מג׳יק סאראפ גרגירי תיבול לכל תבשיל 150 גרם',
        'maggi-magic-sarap-all-in-one-seasoning-150g',
        'Maggi', 'sauce-seasoning', 'spices-seasonings', 'philippines',
        'Iconic Filipino all-in-one seasoning granules made with fresh garlic, onion, real chicken taste, and iron fortification.',
        'Maggi Magic Sarap All-in-One Seasoning Granules bring instant savory umami to stir-fries, sinigang, fried rice, marinades, eggs, and everyday Filipino home cooking.',
        '150g', 150, '100g',
        'Iodized Salt, Sugar, Flavour Enhancers (MSG, Disodium Inosinate, Disodium Guanylate), Garlic, Onion, Chicken Fat & Meat Powder, Spices, Iron Pyrophosphate, Egg Yolk Powder.',
        '["Egg", "May contain Wheat (Gluten), Soy, Milk, Celery & Crustaceans"]'::jsonb,
        '["Halal (IDCP)", "Fortified with Iron"]'::jsonb,
        '["High Sodium (נתרן בכמות גבוהה)"]'::jsonb,
        '{"calories_per_100g": 150, "protein_g": 8.5, "carbs_g": 24.0, "sugars_g": 12.0, "total_fat_g": 2.2, "saturated_fat_g": 0.9, "sodium_mg": 21500}'::jsonb,
        'Dinu Market Imports, Israel',
        14.00, 22.00, NULL, NULL,
        55, 8, '2027-08-30',
        'images/products/maggi-magic-sarap-150g.jpg', '',
        'active', TRUE, TRUE, TRUE, TRUE
    ),
    (
        'DM-PH-003', '014285000306',
        'UFC Tamis Anghang Sweet & Spicy Banana Sauce (320g Bottle)',
        'רוטב בננה מתוק-חריף UFC טאמיס אנגהאנג 320 גרם',
        'ufc-tamis-anghang-banana-sauce-320g',
        'UFC (NutriAsia)', 'sauce-seasoning', 'ketchups', 'philippines',
        'The Philippines'' #1 sweet and mildly spicy ("Tamis Anghang") banana ketchup for fried chicken, lumpia, and Filipino spaghetti.',
        'Crafted by NutriAsia from select Philippine saba bananas, savory spices, and chili, UFC Tamis Anghang Banana Sauce balances fruity sweetness with a gentle kick.',
        '320g', 320, '100g',
        'Water, Sugar, Banana (10%), Modified Corn Starch, Vinegar, Iodized Salt, Onion, Chili, Garlic, Sodium Benzoate (E211), Food Colors.',
        '[]'::jsonb,
        '["Vegan", "Vegetarian"]'::jsonb,
        '["High Sodium (נתרן בכמות גבוהה)", "High Sugar (סוכר בכמות גבוהה)"]'::jsonb,
        '{"calories_per_100g": 120, "protein_g": 0.4, "carbs_g": 29.0, "sugars_g": 22.0, "total_fat_g": 0.0, "saturated_fat_g": 0.0, "sodium_mg": 980}'::jsonb,
        'Dinu Market Imports, Israel',
        7.50, 12.00, NULL, NULL,
        48, 8, '2027-07-15',
        'images/products/ufc-banana-sauce-320g.jpg', '',
        'active', TRUE, TRUE, TRUE, TRUE
    ),
    (
        'DM-PH-004', '4800086020109',
        'Super Q Golden Bihon Cornstarch Sticks Noodles (500g)',
        'אטריות ביהון מוזהבות מקורנפלור סופר קיו 500 גרם',
        'super-q-golden-bihon-cornstarch-sticks-500g',
        'Super Q', 'pantry', 'noodles', 'philippines',
        'Fine, springy Filipino golden bihon noodles crafted from cornstarch and water — the authentic base for Pancit Bihon Guisado.',
        'Super Q Original Golden Bihon Cornstarch Sticks cook quickly while holding a firm, non-soggy bite that absorbs savory soy, calamansi, and broth flavors.',
        '500g', 500, '100g',
        'Cornstarch, Water.',
        '[]'::jsonb,
        '["Vegan", "Vegetarian", "Gluten-Free"]'::jsonb,
        '[]'::jsonb,
        '{"calories_per_100g": 352, "protein_g": 0.5, "carbs_g": 87.0, "sugars_g": 0.0, "total_fat_g": 0.2, "saturated_fat_g": 0.0, "sodium_mg": 18}'::jsonb,
        'Dinu Market Imports, Israel',
        8.20, 13.00, NULL, NULL,
        60, 8, '2028-05-25',
        'images/products/super-q-golden-bihon-500g.jpg', '',
        'active', TRUE, TRUE, TRUE, TRUE
    ),
    (
        'DM-PH-005', '7622210615091',
        'Eden Original Processed Filled Cheese Spread (430g Block)',
        'גבינת עדן מקורית למריחה ולבישול פיליפיני 430 גרם',
        'eden-original-processed-filled-cheese-430g',
        'Eden (Mondelēz)', 'pantry', 'spreads-dairy', 'philippines',
        'Creamy, sliceable and grateable Filipino cheese block loved on warm pandesal, Pinoy-style sweet spaghetti, and baked macaroni.',
        'Eden Original Processed Filled Cheese Spread (430g family block) melts smoothly over sweet Filipino spaghetti, caldereta, pandesal sandwiches, puto, and ensaymada.',
        '430g', 430, '100g',
        'Water, Cheddar Cheese, Vegetable Oil, Milk Solids, Modified Starch, Emulsifying Salts, Salt, Vitamins A & B2, Calcium, Annatto.',
        '["Milk (Dairy)"]'::jsonb,
        '["Vegetarian", "Source of Calcium & Vitamins A & B2"]'::jsonb,
        '["High Saturated Fat (שומן רווי בכמות גבוהה)"]'::jsonb,
        '{"calories_per_100g": 300, "protein_g": 10.0, "carbs_g": 13.3, "sugars_g": 3.3, "total_fat_g": 23.3, "saturated_fat_g": 11.7, "sodium_mg": 1180}'::jsonb,
        'Dinu Market Imports, Israel',
        31.00, 47.00, NULL, NULL,
        34, 8, '2027-06-17',
        'images/products/eden-original-cheese-430g.jpg', '',
        'active', TRUE, TRUE, TRUE, TRUE
    ),
    (
        'DM-PH-006', '4806508340013',
        'Cabalen Bagoong Alamang Salted Shrimp Fry (340g Jar)',
        'קבאלן באגואונג אלאמאנג ממרח שרימפס מומלח מסורתי 340 גרם',
        'cabalen-bagoong-alamang-salted-shrimp-fry-340g',
        'Cabalen', 'sauce-seasoning', 'dipping-sauces', 'philippines',
        'Authentic Kapampangan sautéed salted shrimp paste with no MSG and no extenders — indispensable alongside Kare-Kare and green mangoes.',
        'Cabalen Bagoong Alamang is slow-cooked in the traditional Kapampangan style using 100% natural tiny shrimp, garlic, cane vinegar, and seasonings.',
        '340g', 340, '100g',
        'Salted Fermented Shrimp (Alamang), Cane Vinegar, Vegetable Oil, Garlic, Onion, Sugar, Spices.',
        '["Crustacean Shellfish (Shrimp)"]'::jsonb,
        '["No MSG", "No Extenders", "100% Natural"]'::jsonb,
        '["High Sodium (נתרן בכמות גבוהה)"]'::jsonb,
        '{"calories_per_100g": 195, "protein_g": 12.0, "carbs_g": 14.0, "sugars_g": 9.0, "total_fat_g": 10.2, "saturated_fat_g": 2.1, "sodium_mg": 3800}'::jsonb,
        'Dinu Market Imports, Israel',
        16.00, 25.00, NULL, NULL,
        28, 8, '2027-10-01',
        'images/products/cabalen-bagoong-alamang-340g.jpg', '',
        'active', TRUE, TRUE, FALSE, TRUE
    ),
    (
        'DM-PH-007', '4800086010100',
        'Super Q Special Pancit Canton Flour Noodles (454g / 16oz)',
        'אטריות פאנסיט קנטון מיוחדות למוקפץ סופר קיו 454 גרם',
        'super-q-special-pancit-canton-454g',
        'Super Q', 'pantry', 'noodles', 'philippines',
        'Golden wheat-flour noodles crafted for celebratory Filipino Pancit Canton, Bam-I, and savory wok stir-fries.',
        'Super Q Special Pancit Canton (454g / 16 oz family pack) features pre-steamed golden wheat noodles that cook in minutes for classic fiesta Pancit Canton.',
        '454g', 454, '100g',
        'Wheat Flour, Vegetable Oil, Water, Iodized Salt, Acidity Regulators, Tartrazine (E102).',
        '["Wheat (Gluten)", "May contain Egg & Soy"]'::jsonb,
        '["Vegetarian", "HACCP Certified"]'::jsonb,
        '[]'::jsonb,
        '{"calories_per_100g": 445, "protein_g": 9.2, "carbs_g": 62.0, "sugars_g": 1.0, "total_fat_g": 17.5, "saturated_fat_g": 8.0, "sodium_mg": 420}'::jsonb,
        'Dinu Market Imports, Israel',
        12.00, 19.00, NULL, NULL,
        44, 8, '2028-07-01',
        'images/products/super-q-pancit-canton-454g.jpg', '',
        'active', TRUE, TRUE, TRUE, TRUE
    ),
    (
        'DM-PH-008', '4806504710148',
        'Buenas Coconut Sport Macapuno String in Syrup (907g / 32oz Jar)',
        'בואנס רצועות קוקוס מאקאפונו מתוקות בסירופ 907 גרם',
        'buenas-coconut-sport-macapuno-string-907g',
        'Buenas', 'canned-jarred-goods', 'canned-jarred-fruits', 'philippines',
        'Tender, gelatinous Philippine macapuno coconut strings preserved in sweet syrup — essential for Halo-Halo, leche flan, and pastries.',
        'Buenas Coconut Sport Macapuno String (large 32 oz / 907g glass jar) is made from prized Philippine macapuno coconuts preserved in sweet cane syrup.',
        '907g', 907, '100g',
        'Coconut Sport (Macapuno) Strings, Cane Sugar, Water.',
        '["Coconut"]'::jsonb,
        '["Vegan", "Vegetarian", "Gluten-Free", "Halal (IDCP)"]'::jsonb,
        '["High Sugar (סוכר בכמות גבוהה)"]'::jsonb,
        '{"calories_per_100g": 295, "protein_g": 0.8, "carbs_g": 66.0, "sugars_g": 54.0, "total_fat_g": 3.1, "saturated_fat_g": 2.7, "sodium_mg": 22}'::jsonb,
        'Dinu Market Imports, Israel',
        31.50, 48.00, NULL, NULL,
        26, 8, '2027-02-28',
        'images/products/buenas-macapuno-string-907g.jpg', '',
        'active', TRUE, TRUE, FALSE, TRUE
    ),
    (
        'DM-PH-009', '4806014800017',
        'Boy Bawang Cornick Crunchy Garlic Corn Nuts (100g)',
        'בוי באוואנג קורניק חטיף גרעיני תירס קלויים בטעם שום 100 גרם',
        'boy-bawang-cornick-garlic-flavor-100g',
        'Boy Bawang', 'snacks', 'nuts-seeds', 'philippines',
        'Ultra-crunchy puffed Filipino cornick tossed with real roasted garlic chips — light, savory, and irresistibly crisp.',
        'Boy Bawang Cornick in Original Garlic Flavor is popped to an airy crunch and seasoned with real fried garlic chips.',
        '100g', 100, '100g',
        'Corn, Vegetable Oil, Garlic, Iodized Salt, Sugar, Monosodium Glutamate (E621), Chili Powder.',
        '["Manufactured on equipment that also processes Peanuts, Soy & Wheat"]'::jsonb,
        '["Vegetarian"]'::jsonb,
        '["High Saturated Fat (שומן רווי בכמות גבוהה)", "High Sodium (נתרן בכמות גבוהה)"]'::jsonb,
        '{"calories_per_100g": 467, "protein_g": 6.7, "carbs_g": 66.7, "sugars_g": 3.3, "total_fat_g": 20.0, "saturated_fat_g": 13.3, "sodium_mg": 760}'::jsonb,
        'Dinu Market Imports, Israel',
        4.20, 7.00, NULL, NULL,
        80, 8, '2027-09-01',
        'images/products/boy-bawang-cornick-garlic-100g.jpg', '',
        'active', TRUE, TRUE, TRUE, TRUE
    ),
    (
        'DM-PH-010', '4806502350025',
        'King Choc Nut Peanut Milk Chocolate Bars (200g — 24 × 8g Pack)',
        'קינג צ׳וק-נאט חטיפי שוקולד חלב ובוטנים פיליפיני 200 גרם (24 יח׳)',
        'king-choc-nut-peanut-milk-chocolate-200g',
        'Unisman (King Choc Nut)', 'sweets', 'chocolates', 'philippines',
        'Nostalgic melt-in-your-mouth Filipino roasted peanut and milk chocolate bars — pack of 24 individually wrapped 8g bars.',
        'Unisman King Choc Nut (24 × 8g = 200g pack) blends finely ground roasted peanuts, cocoa powder, milk powder, and cane sugar into crumbly mini bars.',
        '200g', 200, '100g',
        'Roasted Peanuts, Cane Sugar, Milk Powder, Cocoa Powder, Vanilla.',
        '["Peanuts", "Milk (Dairy)"]'::jsonb,
        '["Vegetarian"]'::jsonb,
        '["High Saturated Fat (שומן רווי בכמות גבוהה)", "High Sugar (סוכר בכמות גבוהה)"]'::jsonb,
        '{"calories_per_100g": 500, "protein_g": 12.5, "carbs_g": 58.3, "sugars_g": 45.8, "total_fat_g": 25.0, "saturated_fat_g": 10.4, "sodium_mg": 62}'::jsonb,
        'Dinu Market Imports, Israel',
        8.80, 14.00, NULL, NULL,
        65, 8, '2028-02-06',
        'images/products/king-choc-nut-200g.jpg', '',
        'active', TRUE, TRUE, TRUE, TRUE
    )
ON CONFLICT (sku) DO UPDATE SET
    title = EXCLUDED.title,
    region_slug = EXCLUDED.region_slug,
    price_ils = EXCLUDED.price_ils,
    stock_quantity = EXCLUDED.stock_quantity,
    primary_image_url = EXCLUDED.primary_image_url,
    secondary_image_url = EXCLUDED.secondary_image_url;

-- Populate inventory_levels from products
INSERT INTO public.inventory_levels (product_id, available_quantity, low_stock_threshold)
SELECT id, stock_quantity, low_stock_threshold FROM public.products
ON CONFLICT (product_id) DO UPDATE SET
    available_quantity = EXCLUDED.available_quantity;

-- Populate product_images with organized regional storage paths (/products/india/...)
INSERT INTO public.product_images (product_id, storage_path, public_url, alt_text, image_type, display_order)
SELECT id, '/products/' || region_slug || '/' || sku || '-front.jpg', primary_image_url, title || ' Front Packaging', 'front', 1
FROM public.products
ON CONFLICT DO NOTHING;
