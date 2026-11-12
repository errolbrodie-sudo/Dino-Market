# DINU MARKET — Full-Stack Specialty Asian, Indian & Global Grocery E-Commerce Platform (Israel)

## 1. Quick Start

Run the full-stack e-commerce server directly using Node.js (`>= 22.5 / v24`):

```powershell
cd Website
node server.js
```

Then open **http://localhost:3000** in your browser.

To run the automated end-to-end verification suite:

```powershell
node Website\test-suite.js
```

---

## 2. Demo Credentials

| Role | Email | Password | Capabilities |
| :--- | :--- | :--- | :--- |
| **Customer Account** | `customer@dinumarket.co.il` | `Customer2026!` | Persistent & synchronized shopping basket, saved Israeli delivery addresses, 9-step checkout, order history & live courier tracking. |
| **Super Administrator** | `admin@dinumarket.co.il` | `AdminDinu2026!` | Full access to the RBAC-protected `/admin` dashboard (Product CRUD, live price/stock editor, order status/tracking updates, gateway refunds & credit invoices, Israeli shipping zone rate configurator, and security audit logs). |

*(You can also use the **1-Click Demo Customer** and **1-Click Demo Admin** buttons in the top announcement bar or Sign-In modal).*

---

## 3. Implemented Features & Architectural Highlights

1. **Official Dinu Market Brand Identity & Design System (`Source Information/Branding/`):**
   - Uses the official **DINU MARKET** emblem logo (`/images/brand/dinu-logo.png`), extracted color tokens (`--brand-forest: #14542E`, `--brand-green: #2B9E59`, `--brand-gold: #CCA732`, `--brand-red: #8D191C`, `--brand-orange: #FC9538`, `--surface: #F7F5EC`), and typography (`Montserrat`, `Inter`, `Playfair Display`).
2. **Real Photographed Dinu Market Store Inventory (`Source Information/Products/` — All under the Indian Region):**
   - Includes all 6 real photographed store items assigned to **India (`region_slug: 'india'`)** with interactive **Front Packaging Photo** + **Back Hebrew Label & Barcode Photo** gallery views:
     - *Haldiram's Gorus Premium Handmade Cookies (250g)* — `₪15.00` (`EAN: 8904004416091`)
     - *Haldiram's Rusky Whole Wheat Atta Toast (250g)* — `₪13.00` (`EAN: 8904004417319`)
     - *Flavorz 100% Natural Unrefined Jaggery Cubes (500g Jar)* — `₪22.00` (`EAN: 8906042233463`)
     - *Silver Swan Special Soy Sauce — Buy Pinoy Jug (1000 ml)* — `₪19.00` (`EAN: 079809001624`)
     - *Haldiram's Gulab Jamun in Cardamom Rose Syrup (1 kg Tin)* — `₪29.90` (`EAN: 8904004405910`)
     - *Lal Qilla Supreme Sella Parboiled Extra-Long Basmati Rice (5 kg Bag, Kosher Badatz)* — `₪69.90` (`EAN: 8901161104762`)
3. **4 Approved Sourcing Regions & Multi-Language Selector Drop-Down (Excluding Mighty Rewards):**
   - **Sourcing Regions (`Shop by Region` & `Shop by Region & Culinary Origin`):** Strictly limited to **India (`🇮🇳`)**, **Thailand (`🇹🇭`)**, **Sri Lanka (`🇱🇰`)**, and **the Philippines (`🇵🇭`)**.
   - **Multi-Language Drop-Down (`#langSelector`):** Instant storefront translation across **English (`en`)**, **Indian — Hindi (`hi` / हिन्दी)**, **Thai (`th` / ไทย)**, **Sri Lankan — Sinhala (`si` / සිංහල)**, and **Philippine — Filipino (`tl` / Tagalog)**.
   - **8 Main Departments:** `Shop by Region` (4 countries), `Sweets`, `Snacks`, `Pantry`, `Drinks`, `Canned & Jarred Goods`, `Sauce & Seasoning`, and `Instant Foods`, plus live predictive search.
4. **Persistent & Synchronized Shopping Basket + 9-Step Checkout:**
   - Guests can build a basket freely (`HttpOnly` signed `dinu_cart_token` cookie + database persistence).
   - Signing in or registering at Step 1 of Checkout atomically merges the guest basket into the user's persistent account basket (`mergeGuestCartIntoUserCart`).
   - Supports Israeli Delivery Zones (`IL-Z1` Gush Dan through `IL-Z5` Eilat/Arava), Free Standard Delivery thresholds (`₪250+`), promo codes (`WELCOME10`, `DINU25`, `FREESHIP`), `Visa`, `Mastercard`, `Amex`, `Isracard`, `Bit`, `Apple Pay`, `Google Pay`, `PayPal`, `Tashlumim` installments, and official Israeli Tax Invoices (`חשבונית מס קבלה`).

