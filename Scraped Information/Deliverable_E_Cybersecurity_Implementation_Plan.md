# Deliverable E: Cybersecurity Implementation Plan & Specification

## 1. Security Architecture Overview

This document provides the complete cybersecurity assessment and engineering specification for the e-commerce platform. Every single security measure mandated in Section 7 is analyzed across five required dimensions:
1. **What it protects against** (Threat Vector)
2. **Why it is necessary** (Business & Compliance Impact)
3. **How it should be implemented** (Technical Specification)
4. **Additional service, plugin, or subscription required**
5. **Estimated implementation complexity** (`Low`, `Medium`, `High`)

---

## 2. Domain 1: Website and Server Security

### 1.1 HTTPS and TLS Encryption
1. **What it protects against:** Man-in-the-Middle (MitM) packet sniffing, session hijacking, credential interception, and SSL-stripping attacks over public networks.
2. **Why it is necessary:** Mandatory for protecting customer PII, session tokens, and checkout traffic; required by PCI-DSS v4.0, modern browsers (for `Secure` cookies and Payment Request API / Apple Pay), and search engine ranking signals.
3. **How it should be implemented:** Enforce TLS 1.3 (with TLS 1.2 fallback using strong AEAD cipher suites only: `TLS_AES_128_GCM_SHA256`, `TLS_AES_256_GCM_SHA384`, `TLS_CHACHA20_POLY1305_SHA256`). Enable HTTP Strict Transport Security (`Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`), automatic HTTP-to-HTTPS 301 redirects at the edge, and automated Let's Encrypt / DigiCert certificate renewal.
4. **Additional service/subscription:** Included free with Cloudflare + Vercel / managed edge hosting.
5. **Implementation complexity:** **Low** (1–2 hours).

### 1.2 Secure Hosting Infrastructure
1. **What it protects against:** Physical data center breaches, hypervisor/container escape, unpatched OS vulnerabilities, and unauthorized infrastructure access.
2. **Why it is necessary:** E-commerce workloads require high availability, isolated runtime environments, encrypted storage volumes, and SOC 2 Type II / ISO 27001 certified infrastructure.
3. **How it should be implemented:** Deploy the frontend/API on **Vercel (Enterprise/Pro)** or **AWS ECS/CloudFront** in the `eu-central-1` (Frankfurt) or `il-central-1` (Tel Aviv) region, backed by **Supabase (AWS-hosted PostgreSQL)** with AES-256 encryption at rest, isolated VPC networking, and zero-trust IAM access with hardware MFA for deployment keys.
4. **Additional service/subscription:** Yes — Vercel Pro (~$20/mo) + Supabase Pro (~$25/mo).
5. **Implementation complexity:** **Low–Medium** (4–6 hours).

### 1.3 Web Application Firewall (WAF)
1. **What it protects against:** OWASP Top 10 exploit payloads (SQLi, XSS, Local/Remote File Inclusion, SSRF, Log4Shell/RCE signatures), malicious scanners, and zero-day protocol exploits.
2. **Why it is necessary:** Blocks automated exploit traffic at the network edge before malicious requests ever reach the Next.js application server or Supabase database.
3. **How it should be implemented:** Place **Cloudflare WAF** (with OWASP Core Rule Set + Cloudflare Managed Ruleset enabled in `Block` mode) in front of the domain proxy. Configure custom WAF rules blocking anomalous payloads on `/api/checkout/*`, `/api/auth/*`, and `/api/webhooks/*`.
4. **Additional service/subscription:** Yes — Cloudflare Pro Plan ($20–$25/mo).
5. **Implementation complexity:** **Low** (2–4 hours).

### 1.4 DDoS Protection
1. **What it protects against:** Volumetric Layer 3/4 floods (SYN/UDP amplification) and Layer 7 HTTP application-layer exhaustion attacks aimed at taking the store offline during peak sales.
2. **Why it is necessary:** Downtime directly halts revenue, corrupts active checkout sessions, and inflates serverless compute billing ("Denial of Wallet").
3. **How it should be implemented:** Route all DNS and ingress traffic through **Cloudflare Anycast Edge** with Autonomous L3/L4/L7 DDoS Mitigation enabled, combined with strict origin lockdown (only Cloudflare IP ranges or Authenticated Origin Pulls via mTLS allowed to reach the origin host).
4. **Additional service/subscription:** Included in Cloudflare Free/Pro plans.
5. **Implementation complexity:** **Low** (2 hours).

### 1.5 Secure Server Configuration & HTTP Security Headers
1. **What it protects against:** Clickjacking (`iframe` overlays), MIME-type sniffing, cross-origin data leaks, reflected XSS, and verbose stack trace reconnaissance.
2. **Why it is necessary:** Hardens browser-side execution boundaries and prevents attackers from fingerprinting backend versions or framing checkout screens.
3. **How it should be implemented:** Configure Next.js middleware (`next.config.mjs` / `middleware.ts`) to emit strict security headers on every response:
   - `Content-Security-Policy` (strict nonce-based script policy + whitelisted payment gateway domains)
   - `X-Frame-Options: DENY`
   - `X-Content-Type-Options: nosniff`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
   - Disable `X-Powered-By` header and suppress stack traces in production error responses.
4. **Additional service/subscription:** None (native code configuration).
5. **Implementation complexity:** **Medium** (4–6 hours, particularly tuning CSP for payment iframes).

### 1.6 Regular Software and Dependency Updates
1. **What it protects against:** Supply-chain vulnerabilities (known CVEs in `npm` packages, OS libraries, or framework runtimes).
2. **Why it is necessary:** Modern web stacks rely on ratusan transitive dependencies; unpatched CVEs in framework or serialization libraries are a primary entry vector for automated attackers.
3. **How it should be implemented:** Enable **GitHub Dependabot** and **npm audit / Snyk** in the CI/CD pipeline (`GitHub Actions`) to fail builds on `High`/`Critical` CVEs, lock exact versions via `package-lock.json` / `pnpm-lock.yaml`, and schedule weekly automated patch PRs.
4. **Additional service/subscription:** Free with GitHub Dependabot.
5. **Implementation complexity:** **Low** (2 hours).

### 1.7 Secure Backups and Recovery Procedures
1. **What it protects against:** Accidental table deletion, ransomware, catastrophic data corruption, or regional cloud outages.
2. **Why it is necessary:** Loss of order history, tax records, or inventory data violates Israeli tax book-keeping laws (7-year retention requirement) and halts business continuity.
3. **How it should be implemented:** Enable **Supabase Point-in-Time Recovery (PITR)** (allowing restoration to any second within the last 7–14 days) plus automated daily encrypted pg_dump snapshots replicated to an immutable, cross-region AWS S3 bucket (`Object Lock` enabled). Conduct quarterly restore drills to verify RPO (< 5 minutes) and RTO (< 1 hour).
4. **Additional service/subscription:** Supabase Pro daily backups included; PITR add-on (~$100/mo when scaling) or automated GitHub Action + AWS S3 (~$3/mo).
5. **Implementation complexity:** **Low–Medium** (3–5 hours).

---

## 3. Domain 2: Customer Account Security

### 2.1 Secure Password Hashing (Argon2id / Configurable Work Factor)
1. **What it protects against:** Offline brute-force and GPU/ASIC rainbow-table cracking if password hashes are ever exposed.
2. **Why it is necessary:** Plaintext or weakly hashed (MD5/SHA1) passwords allow immediate account takeover and lateral credential reuse across customers' email/banking accounts.
3. **How it should be implemented:** Configure **Argon2id** (OWASP recommended parameters: `m=19456 KiB`, `t=2` iterations, `p=1` parallelism, with unique 128-bit cryptographic salt per user) for custom auth verification, or high-cost salted `bcrypt` (cost factor `>= 12`) in Supabase Auth (`GoTrue`), paired with HaveIBeenPwned (`k-anonymity` API) checks at registration/password change to reject known breached passwords.
4. **Additional service/subscription:** Included in Supabase Auth + free HIBP k-anonymity API.
5. **Implementation complexity:** **Low** (2–3 hours).

### 2.2 Multi-Factor Authentication (MFA / 2FA)
1. **What it protects against:** Account takeover via phishing, keylogging, or stolen passwords.
2. **Why it is necessary:** Mandatory for **all Administrator and Staff accounts** (which have access to PII, inventory, and refund actions) and recommended as an opt-in security enhancement for customer accounts.
3. **How it should be implemented:** Enable **Supabase Auth TOTP MFA** (RFC 6238 Authenticator App: Google Authenticator, 1Password, Apple Passwords). Enforce a database RLS check (`auth.jwt()->>'aal' = 'aal2'`) on all `/admin/*` routes and admin database mutations so no staff member can access the admin panel without completing 2FA.
4. **Additional service/subscription:** Included free in Supabase Auth.
5. **Implementation complexity:** **Medium** (6–8 hours).

### 2.3 Email Verification
1. **What it protects against:** Fake account creation, typo-squatted emails receiving another person's invoices, and automated bot registration abuse.
2. **Why it is necessary:** Ensures the customer owns the email address before dispatching sensitive order confirmations, tax invoices, or password reset links.
3. **How it should be implemented:** Require email verification via a cryptographic 6-digit OTP or signed confirmation link (`15-minute TTL`) sent upon registration before allowing checkout completion (`email_confirmed_at IS NOT NULL`).
4. **Additional service/subscription:** Transactional email provider (Resend or AWS SES: Free tier up to 3,000 emails/mo, then ~$20/mo).
5. **Implementation complexity:** **Low** (2–3 hours).

### 2.4 Secure Password Reset Procedures
1. **What it protects against:** Account enumeration, reset token brute-forcing, host-header poisoning, and replay attacks.
2. **Why it is necessary:** An insecure password reset flow bypasses strong password hashing entirely.
3. **How it should be implemented:**
   - Always return an identical generic response (`"If an account exists for that email, a reset link has been sent"`) with constant-time response delay to prevent email enumeration.
   - Generate a high-entropy (256-bit), single-use cryptographic token stored as a SHA-256 hash in the database with a strict `15-minute` expiration.
   - Upon successful password reset, immediately revoke all existing refresh tokens/sessions for that user and send a security alert email.
4. **Additional service/subscription:** Included in Supabase Auth + Resend.
5. **Implementation complexity:** **Low** (3 hours).

### 2.5 Login Attempt Limits
1. **What it protects against:** Online brute-force password guessing against individual customer or admin accounts.
2. **Why it is necessary:** Prevents attackers from systematically testing thousands of password combinations against a known customer email.
3. **How it should be implemented:** Implement sliding-window rate limiting per `(email, ip_address)` using **Upstash Redis**: maximum `5 failed login attempts` within `15 minutes`, followed by exponential backoff / temporary 15-minute lockout and mandatory Cloudflare Turnstile challenge.
4. **Additional service/subscription:** Upstash Redis (Free tier up to 10k commands/day; ~$10/mo production).
5. **Implementation complexity:** **Low–Medium** (4 hours).

### 2.6 Protection Against Credential Stuffing
1. **What it protects against:** Distributed botnets testing millions of leaked `(email, password)` pairs from external third-party data breaches.
2. **Why it is necessary:** Credential stuffing distributes requests across thousands of residential proxy IPs, bypassing simple per-IP rate limits.
3. **How it should be implemented:** Combine **Cloudflare Turnstile** invisible bot challenges on `/auth/login`, **Cloudflare Leaked Credentials Check** at the WAF edge, per-account failed-attempt counters (independent of IP), and HIBP breached-password screening during registration.
4. **Additional service/subscription:** Included with Cloudflare Pro + Turnstile (Free).
5. **Implementation complexity:** **Medium** (4–6 hours).

### 2.7 Secure Session Management
1. **What it protects against:** Session fixation, XSS token theft (`localStorage` exfiltration), and cross-site session riding.
2. **Why it is necessary:** Compromised session tokens grant full impersonation of the customer without needing their password or MFA.
3. **How it should be implemented:** Store session tokens exclusively in **`HttpOnly`, `Secure`, `SameSite=Lax` (or `Strict` for admin) cookies** via `@supabase/ssr` — never in accessible `localStorage`. Rotate refresh tokens on every use (Refresh Token Rotation with automatic family revocation if reuse of an old token is detected).
4. **Additional service/subscription:** None (native `@supabase/ssr` implementation).
5. **Implementation complexity:** **Medium** (4–6 hours).

### 2.8 Automatic Session Expiration
1. **What it protects against:** Unauthorized access on shared, public, or unattended computers after a user walks away.
2. **Why it is necessary:** Protects saved delivery addresses, order history, and admin capabilities on unattended devices.
3. **How it should be implemented:** Configure short-lived JWT access tokens (`15–60 minutes` expiry) with sliding refresh tokens (`14 days` for standard customers; strict **`8-hour` absolute timeout and `30-minute` idle timeout** for Administrator sessions). Note: Even when a customer's auth session expires, their shopping basket remains safely stored in the database for their next login.
4. **Additional service/subscription:** None.
5. **Implementation complexity:** **Low** (2–3 hours).

---

## 4. Domain 3: Application Security

### 3.1 SQL Injection (SQLi) Protection
1. **What it protects against:** Arbitrary SQL query manipulation allowing attackers to dump the database, bypass authentication, or modify prices/orders.
2. **Why it is necessary:** Catalog search, multi-facet category filtering, and order lookups accept dynamic user parameters on every request.
3. **How it should be implemented:** Use parameterized queries exclusively via the **Supabase PostgREST client / Drizzle ORM / Prisma** (which bind all parameters safely). Never concatenate raw user strings into SQL queries or PL/pgSQL `EXECUTE` statements.
4. **Additional service/subscription:** None.
5. **Implementation complexity:** **Low** (Enforced by architecture & code review).

### 3.2 Cross-Site Scripting (XSS) Protection
1. **What it protects against:** Injection of malicious client-side JavaScript via product reviews, search queries, customer profile names, or admin CMS content.
2. **Why it is necessary:** A single stored XSS in a product review could steal session cookies or tamper with the checkout page DOM for every visitor.
3. **How it should be implemented:** Rely on React/Next.js automatic JSX output encoding; prohibit `dangerouslySetInnerHTML` on any user-supplied data; sanitize rich-text admin product descriptions server-side using `isomorphic-dompurify` with a strict tag whitelist; and enforce a strict `Content-Security-Policy` header.
4. **Additional service/subscription:** None (`dompurify` open-source package).
5. **Implementation complexity:** **Low–Medium** (3–4 hours).

### 3.3 Cross-Site Request Forgery (CSRF) Protection
1. **What it protects against:** Malicious third-party websites tricking an authenticated user's browser into submitting unauthorized state-changing requests (e.g., changing delivery address or triggering a password/email update).
2. **Why it is necessary:** Cookie-authenticated sessions require explicit origin/token validation on all state-mutating (`POST`, `PUT`, `PATCH`, `DELETE`) requests.
3. **How it should be implemented:** Enforce `SameSite=Lax` cookies, validate `Origin` and `Referer` headers against the canonical storefront domain in Next.js Middleware/Server Actions, and require custom JSON headers (`Content-Type: application/json`) or anti-CSRF tokens on mutation endpoints.
4. **Additional service/subscription:** None.
5. **Implementation complexity:** **Low** (2–3 hours).

### 3.4 Input Validation and Sanitization
1. **What it protects against:** Type confusion, buffer/payload bloat, negative quantity/price tampering (e.g., passing `quantity: -5` to reduce cart total), and malformed data persistence.
2. **Why it is necessary:** Client-side HTML validation is trivially bypassed via `curl` or browser DevTools.
3. **How it should be implemented:** Validate every API request body, query string, and URL parameter on the server using strict **Zod** schemas (enforcing positive integers `z.number().int().min(1).max(99)` for cart quantities, UUID format for IDs, valid Israeli phone/postal patterns, and max string lengths) backed by PostgreSQL `CHECK` constraints (`CHECK (quantity > 0 AND unit_price_ils >= 0)`).
4. **Additional service/subscription:** None (`zod` open-source library).
5. **Implementation complexity:** **Medium** (6–8 hours across all endpoints).

### 3.5 API Authentication and Authorization
1. **What it protects against:** Broken Object Level Authorization (BOLA / IDOR — e.g., Customer A fetching `/api/orders/customer-B-order-id`) and unauthenticated API abuse.
2. **Why it is necessary:** Every order, address, and profile API endpoint handles private customer data.
3. **How it should be implemented:** Verify the cryptographic JWT via `supabase.auth.getUser()` on the server for every protected API route, and enforce **Supabase PostgreSQL Row-Level Security (RLS)** on every table (`USING (auth.uid() = user_id)`) so the database engine itself refuses cross-tenant data access even if an application bug occurs.
4. **Additional service/subscription:** Included in Supabase.
5. **Implementation complexity:** **Medium** (6 hours).

### 3.6 Role-Based Access Control (RBAC)
1. **What it protects against:** Privilege escalation (e.g., a standard customer calling admin product-pricing APIs, or a warehouse packer issuing financial refunds).
2. **Why it is necessary:** Enforces the Principle of Least Privilege across customers and internal staff roles.
3. **How it should be implemented:** Define an immutable `user_roles` table (`customer`, `support_agent`, `fulfillment_staff`, `catalog_manager`, `super_admin`) injected into JWT custom claims via a Supabase Auth Hook, enforced at both Next.js Middleware (`/admin/*`) and PostgreSQL RLS policies.
4. **Additional service/subscription:** Included in Supabase.
5. **Implementation complexity:** **Medium** (6–8 hours).

### 3.7 Protection Against Unauthorized Administrative Access
1. **What it protects against:** Brute-force attacks, phishing, or lateral compromise targeting `/admin` routes.
2. **Why it is necessary:** A compromised admin account gives an attacker control over pricing, inventory, refunds, and full customer exports.
3. **How it should be implemented:**
   - Require mandatory `aal2` (TOTP 2FA) for all admin roles.
   - Optionally protect `/admin/*` behind **Cloudflare Zero Trust (Access)** or IP/device allowlisting.
   - Log every administrative mutation (`CREATE`, `UPDATE`, `DELETE`, `REFUND`) with `actor_id`, `ip_address`, `before_state`, and `after_state` into an append-only `admin_audit_logs` table.
4. **Additional service/subscription:** Cloudflare Zero Trust is free for up to 50 users.
5. **Implementation complexity:** **Medium** (6 hours).

### 3.8 Rate Limiting
1. **What it protects against:** API scraping, inventory hoarding (bots locking all stock in checkout reservations), SMS/email bombing (cost exhaustion), and coupon brute-forcing.
2. **Why it is necessary:** Protects both platform availability and third-party usage costs (SMS/Email/Serverless compute).
3. **How it should be implemented:** Implement tiered token-bucket rate limiting via **Upstash Ratelimit** + **Cloudflare Rate Limiting Rules**:
   - Auth / Password Reset / OTP: `5 req / 15 min` per IP/Email
   - Coupon Code Validation: `10 req / 10 min` per User/IP
   - Checkout Initiation: `10 req / 5 min` per User
   - Public Catalog / Search API: `120 req / 1 min` per IP
4. **Additional service/subscription:** Upstash Redis (~$10/mo) + Cloudflare.
5. **Implementation complexity:** **Low–Medium** (4 hours).

### 3.9 Bot and Spam Protection
1. **What it protects against:** Automated scalper bots, fake review spam, contact-form spam, and card-testing ("carding") bots.
2. **Why it is necessary:** Card-testing bots can run thousands of stolen credit cards through a checkout form, resulting in heavy gateway fines and merchant account termination.
3. **How it should be implemented:** Embed **Cloudflare Turnstile** (privacy-preserving, accessibility-compliant smart challenge) + hidden honeypot fields on Registration, Login, Contact Us, Review Submission, and Checkout Payment Initiation endpoints, verifying the Turnstile token server-side before processing.
4. **Additional service/subscription:** Cloudflare Turnstile (Free).
5. **Implementation complexity:** **Low** (3 hours).

---

## 5. Domain 4: Payment Security

### 4.1 PCI DSS v4.0 Compliance (SAQ-A / SAQ-A-EP Architecture)
1. **What it protects against:** Cardholder data breaches, regulatory fines, and loss of credit card processing privileges.
2. **Why it is necessary:** Required by Visa, Mastercard, Amex, and Israeli clearing house (`Shva` / `שב"א`) rules for every merchant accepting payment cards.
3. **How it should be implemented:** Architect the checkout so the merchant application qualifies for **PCI-DSS SAQ-A** by delegating 100% of cardholder data capture, transmission, and processing to a PCI-DSS Level 1 certified gateway (PayPlus / Tranzila / Grow / Stripe) via an isolated iframe or hosted redirect, paired with PCI DSS v4.0 script integrity monitoring (Subresource Integrity `SRI` + CSP) on the checkout page.
4. **Additional service/subscription:** Included with PCI-DSS Level 1 payment gateway account.
5. **Implementation complexity:** **Medium** (6–8 hours).

### 4.2 Hosted Payment Pages or Tokenized Payment Processing
1. **What it protects against:** Malicious JavaScript skimmers (Magecart-style formjacking) intercepting credit card inputs from the DOM.
2. **Why it is necessary:** Isolates card input fields inside a cross-origin iframe served directly from the PCI Level 1 payment processor.
3. **How it should be implemented:** Render payment fields using the gateway's hosted iframe (`PayPlus Hosted Payment Page / Iframe` or `Stripe Payment Element`). When the customer submits payment, the gateway returns only a non-sensitive single-use payment token or transaction reference (`token_uid`) to our backend.
4. **Additional service/subscription:** Standard payment gateway fee (~1.2%–2.2% + ₪0.50 per transaction in Israel).
5. **Implementation complexity:** **Medium** (8–12 hours).

### 4.3 Secure Payment Gateway Integration & Server-Side Price Authority
1. **What it protects against:** Parameter tampering where an attacker modifies the client-side total (e.g., paying `₪1.00` for a `₪500.00` order) or spoofs a successful redirect URL.
2. **Why it is necessary:** Client browsers are untrusted; payment amounts must be computed exclusively on the server and verified against the gateway response.
3. **How it should be implemented:**
   - The server calculates `final_payable_amount_ils` directly from the database (`product_variants.price_ils`, validated `discounts`, and `shipping_zones` rates) and passes that signed amount directly to the Payment Gateway API over a server-to-server TLS 1.3 call.
   - Before marking an order `paid`, the backend asserts that `webhook.amount_charged == order.total_amount_ils` and `webhook.currency == 'ILS'`.
4. **Additional service/subscription:** None.
5. **Implementation complexity:** **Medium** (6 hours).

### 4.4 Zero Storage of CVV or Unencrypted Card Information
1. **What it protects against:** Catastrophic exposure of raw Primary Account Numbers (PAN) and CVV2 security codes in database backups, application logs, or error trackers.
2. **Why it is necessary:** Storing CVV/CVC after authorization is strictly forbidden under PCI-DSS under any circumstances, and storing raw PANs triggers full PCI Level 1 audit obligations.
3. **How it should be implemented:** The database schema (`payment_transactions`) stores **only**: `gateway_transaction_id`, `card_brand` (e.g., `Visa`), `card_last4` (e.g., `4242`), `expiry_month/year`, `installments_count`, and `payment_status`. Configure application loggers (Pino/Sentry) to scrub any 13–19 digit numeric sequences.
4. **Additional service/subscription:** None.
5. **Implementation complexity:** **Low** (1–2 hours).

### 4.5 Cryptographic Payment Webhook Verification & Idempotency
1. **What it protects against:** Forged payment confirmation webhooks (attackers sending a fake `POST /api/webhooks/payments` to get free orders) and replay/duplicate webhook delivery.
2. **Why it is necessary:** Webhooks are publicly reachable HTTP endpoints; without cryptographic signature verification, anyone could mark an unpaid order as paid.
3. **How it should be implemented:**
   - Verify the gateway's `HMAC-SHA256` signature header against the raw request body using `crypto.timingSafeEqual` and the secret webhook key stored in environment variables.
   - Enforce a `5-minute` timestamp tolerance window to block replay attacks.
   - Record every processed `gateway_event_id` in a `processed_webhooks` table with a `UNIQUE` constraint to guarantee idempotent single execution.
4. **Additional service/subscription:** None.
5. **Implementation complexity:** **Medium** (4–6 hours).

---

## 6. Domain 5: Privacy and Customer Data Protection

### 5.1 Comprehensive Privacy Policy
1. **What it protects against:** Regulatory non-compliance penalties and lack of transparency regarding PII collection and third-party processors.
2. **Why it is necessary:** Legally required under both the **Israeli Protection of Privacy Law, 5741-1981 (Amendment 13)** and the **EU GDPR**.
3. **How it should be implemented:** Publish a clear, bilingual (`עברית / English`) Privacy Policy at `/policies/privacy-policy` detailing what data is collected, the legal basis (contract fulfillment, legal tax obligation, explicit marketing consent), sub-processors (Supabase, Vercel, Payment Gateway, Courier), retention periods, and Data Protection Officer / Privacy contact details.
4. **Additional service/subscription:** Legal template review (one-time).
5. **Implementation complexity:** **Low** (2–4 hours).

### 5.2 Cookie Consent Management
1. **What it protects against:** Unlawful tracking via non-essential analytics/advertising cookies prior to user consent.
2. **Why it is necessary:** Required by GDPR / ePrivacy Directive and Israeli privacy best practices whenever optional analytics or marketing pixels are used.
3. **How it should be implemented:** Implement a lightweight, accessible Cookie Consent Banner categorising cookies into **Strictly Necessary** (Auth session, Cart session token, CSRF/Turnstile — always active) and **Analytics / Marketing** (opt-in only; blocked until accepted), storing consent preferences with version timestamps.
4. **Additional service/subscription:** Open-source (`vanilla-cookieconsent`) or CookieYes Free tier.
5. **Implementation complexity:** **Low** (3 hours).

### 5.3 Customer Data Protection (Encryption at Rest & In Transit)
1. **What it protects against:** Unauthorized disclosure of customer PII from storage media or database dumps.
2. **Why it is necessary:** Required by the **Israeli Protection of Privacy Regulations (Data Security), 5777-2017**.
3. **How it should be implemented:** Combine AWS/Supabase volume-level AES-256 encryption at rest with application-layer/pgsodium column encryption for sensitive tokens, strict PII redaction in application logs, and separation of authentication credentials (`auth.users`) from public profile metadata.
4. **Additional service/subscription:** Included in Supabase.
5. **Implementation complexity:** **Low–Medium** (3–4 hours).

### 5.4 Secure Database Access
1. **What it protects against:** Direct external connections to PostgreSQL, leaked service-role keys, and overly permissive database roles.
2. **Why it is necessary:** The `service_role` key bypasses RLS; if exposed to the browser or committed to git, the entire database is compromised.
3. **How it should be implemented:**
   - Enable Row-Level Security (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`) on 100% of tables in the `public` schema.
   - Keep `SUPABASE_SERVICE_ROLE_KEY` strictly on server-side runtime environment variables (never prefixed with `NEXT_PUBLIC_`), enforced by pre-commit secret scanning (`gitleaks`).
   - Restrict direct PostgreSQL port (`5432`/`6543`) access via IP allowlisting.
4. **Additional service/subscription:** Free (`gitleaks` in GitHub Actions).
5. **Implementation complexity:** **Low–Medium** (4 hours).

### 5.5 Data Retention and Deletion Policies ("Right to Erasure" vs. Tax Law)
1. **What it protects against:** Indefinite hoarding of obsolete PII (increasing breach blast radius) while preventing illegal deletion of statutory financial records.
2. **Why it is necessary:** GDPR Art. 17 and Israeli Privacy Law grant customers the right to request deletion/rectification of personal data, whereas **Israeli Tax Authority (הוראות ניהול ספרים)** requires retaining financial invoices and order totals for **7 years**.
3. **How it should be implemented:** Implement an automated `/account/privacy/delete-account` workflow and nightly cron job:
   - Expired abandoned guest carts (`> 30 days`) and expired password reset tokens (`> 24 hours`) are hard-deleted automatically.
   - When a customer requests account deletion, their `profiles` row, saved `customer_addresses`, and authentication record are permanently erased, while historical `orders` rows are **pseudonymized** (`user_id = NULL`, PII scrubbed from profile references, retaining only the statutory tax invoice record required by law for 7 years).
4. **Additional service/subscription:** None (Supabase `pg_cron`).
5. **Implementation complexity:** **Medium** (6 hours).

### 5.6 GDPR & Israeli Privacy Legislation Compliance (PPL 5741-1981 & Amendment 13)
1. **What it protects against:** Regulatory enforcement by the Israeli Privacy Protection Authority (`PPA` / `הרשות להגנת הפרטיות`) and EU data protection authorities, plus statutory civil lawsuits under the Israeli Communications Law (Section 30A "Spam Law").
2. **Why it is necessary:** Operating an e-commerce store serving Israel requires compliance with Israeli Data Security Regulations 2017, Consumer Protection Law, and Section 30A (which requires explicit, unchecked-by-default opt-in for commercial emails/SMS and a 1-click unsubscribe mechanism).
3. **How it should be implemented:**
   - Ensure marketing checkboxes on Registration and Checkout are **unchecked by default**.
   - Log exact opt-in timestamp and IP address in `marketing_consents`.
   - Include a one-click `List-Unsubscribe` header and footer link in every promotional message.
   - Maintain a Self-Service Data Export (`JSON` download of profile, addresses, and orders) inside `/account/profile`.
4. **Additional service/subscription:** None.
5. **Implementation complexity:** **Medium** (4–6 hours).

### 5.7 Secure Handling of Customer Addresses and Contact Information
1. **What it protects against:** Exposure of physical home addresses, apartment entrance codes (`קוד כניסה`), and mobile numbers to unauthorized users or excessive exposure to third-party couriers.
2. **Why it is necessary:** Physical addresses and building entry codes pose a direct physical security and privacy risk to customers.
3. **How it should be implemented:**
   - Isolate `customer_addresses` under strict RLS (`auth.uid() = user_id`).
   - Store immutable address snapshots on `orders` at checkout time so editing a saved address later does not alter historical delivery records.
   - Mask building entrance codes and phone numbers in customer-facing order confirmation emails (`054-***-1234`), transmitting full delivery instructions only over encrypted TLS API calls to the assigned courier (`HFD`/`Cheetah`).
4. **Additional service/subscription:** None.
5. **Implementation complexity:** **Low–Medium** (3–4 hours).

---

## 7. Prioritized Security Implementation Checklist

| Priority Tier | ID | Security Control | Target Milestone | Complexity | Status / Gate |
| :---: | :--- | :--- | :--- | :---: | :--- |
| **P0 — Critical (Launch Blockers)** | `SEC-01` | HTTPS / TLS 1.3 + HSTS Enforcement at Edge | Stage 1 (Infra) | Low | Mandatory Pre-Launch |
| **P0 — Critical** | `SEC-02` | Supabase PostgreSQL Row-Level Security (RLS) on 100% of Tables | Stage 3–5 (DB) | Medium | Mandatory Pre-Launch |
| **P0 — Critical** | `SEC-03` | PCI-DSS SAQ-A Hosted Payment Iframe (Zero PAN/CVV on Server) | Stage 7 (Payments) | Medium | Mandatory Pre-Launch |
| **P0 — Critical** | `SEC-04` | Server-Side Price/Cart Calculation & Webhook HMAC Signature Verification | Stage 7 (Payments) | Medium | Mandatory Pre-Launch |
| **P0 — Critical** | `SEC-05` | Argon2id / High-Cost Salted Password Hashing + HIBP Breached Check | Stage 4 (Auth) | Low | Mandatory Pre-Launch |
| **P0 — Critical** | `SEC-06` | `HttpOnly`, `Secure`, `SameSite=Lax` Cookie Sessions + Refresh Rotation | Stage 4 (Auth) | Medium | Mandatory Pre-Launch |
| **P0 — Critical** | `SEC-07` | Mandatory TOTP 2FA (`aal2`) + RBAC for All `/admin/*` Accounts | Stage 8 (Admin) | Medium | Mandatory Pre-Launch |
| **P0 — Critical** | `SEC-08` | Parameterized Queries (SQLi Prevention) + Server-Side Zod Validation | Stage 3–7 (App) | Medium | Mandatory Pre-Launch |
| **P1 — High (Pre-Production)** | `SEC-09` | Cloudflare WAF (OWASP Ruleset) + L3/L4/L7 DDoS Protection | Stage 9 (Security) | Low | Pre-Production |
| **P1 — High** | `SEC-10` | Upstash Redis Rate Limiting + Cloudflare Turnstile Bot Protection | Stage 9 (Security) | Medium | Pre-Production |
| **P1 — High** | `SEC-11` | Strict HTTP Security Headers (`CSP`, `X-Frame-Options`, `nosniff`) | Stage 9 (Security) | Medium | Pre-Production |
| **P1 — High** | `SEC-12` | Automated Encrypted Daily Database Backups + PITR Restore Verification | Stage 9 (Security) | Low | Pre-Production |
| **P1 — High** | `SEC-13` | Israeli PPL / GDPR Privacy Policy, Unchecked-by-Default Opt-In, Account Erasure | Stage 9 (Security) | Medium | Pre-Production |
| **P2 — Medium (Operational)** | `SEC-14` | Immutable `admin_audit_logs` Table for All Staff Actions | Stage 8 (Admin) | Low | Launch Ready |
| **P2 — Medium** | `SEC-15` | GitHub Dependabot + CI/CD `npm audit` & `gitleaks` Secret Scanning | Stage 1 (Infra) | Low | Launch Ready |
| **P2 — Medium** | `SEC-16` | Automated `pg_cron` Purge of Expired Guest Carts & Reset Tokens | Stage 9 (Security) | Low | Launch Ready |

