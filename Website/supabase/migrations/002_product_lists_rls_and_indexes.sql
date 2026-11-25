-- ============================================================================
-- DINU MARKET — SUPABASE RLS POLICIES & PERFORMANCE INDEXES FOR "Product lists"
-- Run this script in the Supabase Dashboard -> SQL Editor for project:
-- https://altzvjhhuetgswrigrdy.supabase.co
--
-- IMPORTANT: Does NOT rename, drop, or alter any existing columns or tables.
-- ============================================================================

-- 1. Enable Row Level Security on "Product lists" (idempotent)
ALTER TABLE public."Product lists" ENABLE ROW LEVEL SECURITY;

-- 2. Grant read-only SELECT access to website visitors (anon & authenticated roles)
--    Note: Public storefront API queries explicitly exclude the "Cost" column.
--    For defense-in-depth column-level security in PostgreSQL, we also revoke
--    column-level SELECT on "Cost" from anon/authenticated and grant SELECT only
--    on the public storefront columns!
REVOKE ALL ON public."Product lists" FROM anon, authenticated;

GRANT SELECT (
  id,
  "Bar Code",
  "Product Name",
  "Category",
  "Country of Origin",
  "Supplier",
  "Price",
  "Items in Stock",
  "Items Sold",
  "Image Link",
  "Ingredients"
) ON public."Product lists" TO anon, authenticated;

DROP POLICY IF EXISTS "Public read-only access to Product lists" ON public."Product lists";
CREATE POLICY "Public read-only access to Product lists"
  ON public."Product lists"
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 3. Restrict INSERT, UPDATE, DELETE on "Product lists" strictly to authenticated admins
--    (service_role bypasses RLS automatically; unauthenticated visitors have ZERO write grants)
DROP POLICY IF EXISTS "Admins manage Product lists" ON public."Product lists";
CREATE POLICY "Admins manage Product lists"
  ON public."Product lists"
  FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin'));

-- 4. Public read-only access to "Product Images" bucket in Supabase Storage;
--    block all unauthenticated uploads, edits, and deletions.
DROP POLICY IF EXISTS "Public read access for Product Images" ON storage.objects;
CREATE POLICY "Public read access for Product Images"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'Product Images');

DROP POLICY IF EXISTS "Admin write access for Product Images" ON storage.objects;
CREATE POLICY "Admin write access for Product Images"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'Product Images'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin')
  )
  WITH CHECK (
    bucket_id = 'Product Images'
    AND (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'super_admin')
  );

-- 5. Recommended Indexes for Fast Country, Category & Barcode Lookups
CREATE INDEX IF NOT EXISTS idx_product_lists_country
  ON public."Product lists" ("Country of Origin");

CREATE INDEX IF NOT EXISTS idx_product_lists_category
  ON public."Product lists" ("Category");

CREATE INDEX IF NOT EXISTS idx_product_lists_barcode
  ON public."Product lists" ("Bar Code");

-- 6. Enable Supabase Realtime notifications on "Product lists" so open browser tabs
--    auto-refresh when products, prices, or stock change in Supabase
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'Product lists'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public."Product lists";
  END IF;
END $$;
