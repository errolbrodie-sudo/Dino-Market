/**
 * DINU MARKET: Centralised Supabase Backend & Storage Adapter
 * Implements Section 13, 16, and 17 of "Design of the DINU Market.docx".
 *
 * Security Rules:
 * - SUPABASE_SERVICE_ROLE_KEY is strictly server-side and NEVER exposed to the browser.
 * - Organizes product media in Supabase Storage under:
 *   /products/india/, /products/thailand/, /products/sri-lanka/, /products/philippines/
 * - Performs atomic inventory deductions via `deduct_inventory_atomic` RPC.
 */

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && (SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY));
}

async function supabaseRest(tableOrRpc, { method = 'GET', query = '', body = null, useServiceRole = false, isRpc = false } = {}) {
  if (!isSupabaseConfigured()) {
    return null;
  }
  const apiKey = useServiceRole && SUPABASE_SERVICE_ROLE_KEY ? SUPABASE_SERVICE_ROLE_KEY : SUPABASE_ANON_KEY;
  const endpoint = isRpc
    ? `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/rpc/${tableOrRpc}`
    : `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${tableOrRpc}${query ? `?${query}` : ''}`;

  const headers = {
    apikey: apiKey,
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation'
  };

  const res = await fetch(endpoint, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Supabase error (${res.status}): ${errText}`);
  }
  return res.json().catch(() => null);
}

function getRegionalStoragePath(regionSlug, fileName) {
  const allowed = ['india', 'thailand', 'sri-lanka', 'philippines'];
  const safeRegion = allowed.includes(regionSlug) ? regionSlug : 'india';
  return `/products/${safeRegion}/${fileName}`;
}

module.exports = {
  SUPABASE_URL,
  isSupabaseConfigured,
  supabaseRest,
  getRegionalStoragePath
};

