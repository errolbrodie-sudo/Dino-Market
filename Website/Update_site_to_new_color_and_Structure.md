# Dinu Market refresh: implementation guide

Nov 15, 2026 · @Fatman

## Overview

The refresh turns one generic "Flavours of Asia" shop into four home kitchens (Philippines, Thailand, India, Sri Lanka) plus a door for Israelis who miss the food from their trip. Everything below matches the design canvas "Dinu Market homepage refresh".

Work in this order, because each step is useful on its own and the early ones cost almost nothing:

1. Fix the trust killers. Placeholders and demo links are live today.
2. Swap in the color tokens and fonts. One CSS file changes the whole feel.
3. Rebuild the header and homepage.
4. Launch one kitchen storefront, the Filipino one first, then copy the pattern for the other three.

The site appears to run on Bootstrap, so the color and shape changes below are written as Bootstrap 5 variable overrides plus a small set of custom tokens.

## Step 1: fix the trust killers

These are live on the site today and they cost more sales than any color choice. A shopper who taps WhatsApp and gets nothing will not come back.

| What | Where | Fix |
| --- | --- | --- |
| Support email and phone are placeholders | Contact page, footer | Add the real email and a real Israeli mobile number |
| WhatsApp, Facebook, Instagram links go to "#" | Footer, contact | Link WhatsApp as `https://wa.me/972XXXXXXXXX` with a prefilled message; remove any social account you don't run |

For the prefilled WhatsApp message, append `?text=` with a URL-encoded greeting in the shopper's language, for example "Hi Dinu, I'd like to order:". Use a different greeting per kitchen page.

## Step 2: the color system

The rule of thumb: warm cream does most of the work, deep green says "trusted shop", chili red means "tap here to buy", and each kitchen owns one soft tint. If red shows up anywhere that isn't an action, it's being misused.

### Core palette

| Token | Hex | Role | Use it for | Never use it for |
| --- | --- | --- | --- | --- |
| `--dm-cream` | #FFF7EA | Page background | Every page background | Text |
| `--dm-white` | #FFFFFF | Surfaces | Product cards, inputs, search bar | Page background (too clinical) |
| `--dm-ink` | #1C1A17 | Main text, dark blocks | Body text, headings, basket button, dark promo bands, country badges | Large page areas |
| `--dm-green` | #0F4D2C | Brand anchor | Logo, top delivery bar, footer, text links | Buy buttons |
| `--dm-chili` | #C8261E | Action | "Add to basket" buttons, primary CTA, basket count badge, the dot in the logo | Headings, backgrounds, warnings |
| `--dm-turmeric` | #F2B21B | Highlight | Gift box band, free-delivery line on the green bar, CTAs sitting on dark ink | Text on cream or white (fails contrast) |
| `--dm-whatsapp` | #17803F | WhatsApp only | Every WhatsApp button and nothing else | Anything that isn't WhatsApp |
| `--dm-text-2` | #4A443B | Secondary text | Hero subcopy, card descriptions |  |
| `--dm-muted` | #6B6358 | Muted text | Sizes, meta, placeholders | Anything under 14px |
| `--dm-line` | #EFE4D1 | Hairlines | Card borders, dividers |  |
| `--dm-line-strong` | #E6DAC4 | Input borders | Search, language and filter pills |  |

Rough balance on any screen: about 60% cream and white, 25% kitchen tints and ink, 10% green, and no more than 5% chili and turmeric combined.

### Kitchen tints

Each kitchen gets a card color and a lighter inner tint for image wells and its storefront hero. Text on all of them is always `--dm-ink`.

| Kitchen | Card / hero | Inner tint | Mood |
| --- | --- | --- | --- |
| Philippines | #FFD089 | #FFE6BF | Mango |
| Thailand | #B9E4C3 | #D8F1DE | Pandan |
| India | #F9C1A6 | #FCDCCB | Saffron peach |
| Sri Lanka | #A9DCE0 | #CFEDEF | Ocean teal |
| Israeli travellers | #1C1A17 (ink) | n/a | Turmeric CTA on dark |

On a kitchen storefront, its tint replaces cream in the hero only. The rest of the page stays cream so the four stores still feel like one shop.

### Contrast (checked against WCAG AA, 4.5:1 for body text)

| Pair | Ratio | Verdict |
| --- | --- | --- |
| Ink on cream | about 17:1 | Pass |
| Green on cream | about 9:1 | Pass |
| White on chili | about 5.6:1 | Pass |
| Chili on cream | about 5.3:1 | Pass |
| White on WhatsApp green | about 5.0:1 | Pass |
| Ink on turmeric | about 9:1 | Pass |
| Muted on cream | about 5.3:1 | Pass |
| Turmeric on cream | about 1.9:1 | Fail: never do this |

Your accessibility statement promises WCAG 2.2 AA, so keep this table as the rule when adding new colors.

### Drop-in CSS

Put this in your global stylesheet, loaded after Bootstrap.

```css
:root {
  /* Dinu tokens */
  --dm-cream: #FFF7EA;
  --dm-white: #FFFFFF;
  --dm-ink: #1C1A17;
  --dm-green: #0F4D2C;
  --dm-green-dark: #0A3520;
  --dm-chili: #C8261E;
  --dm-chili-dark: #A51E17;
  --dm-turmeric: #F2B21B;
  --dm-whatsapp: #17803F;
  --dm-text-2: #4A443B;
  --dm-muted: #6B6358;
  --dm-line: #EFE4D1;
  --dm-line-strong: #E6DAC4;

  --dm-ph: #FFD089;  --dm-ph-soft: #FFE6BF;
  --dm-th: #B9E4C3;  --dm-th-soft: #D8F1DE;
  --dm-in: #F9C1A6;  --dm-in-soft: #FCDCCB;
  --dm-lk: #A9DCE0;  --dm-lk-soft: #CFEDEF;

  /* Bootstrap 5 overrides */
  --bs-body-bg: var(--dm-cream);
  --bs-body-color: var(--dm-ink);
  --bs-primary: var(--dm-chili);
  --bs-primary-rgb: 200, 38, 30;
  --bs-success: var(--dm-green);
  --bs-success-rgb: 15, 77, 44;
  --bs-link-color: var(--dm-green);
  --bs-link-color-rgb: 15, 77, 44;
  --bs-link-hover-color: var(--dm-green-dark);
  --bs-border-color: var(--dm-line);
  --bs-border-radius: 16px;
  --bs-border-radius-lg: 28px;
  --bs-border-radius-pill: 999px;
}

.btn-primary {
  --bs-btn-bg: var(--dm-chili);
  --bs-btn-border-color: var(--dm-chili);
  --bs-btn-hover-bg: var(--dm-chili-dark);
  --bs-btn-hover-border-color: var(--dm-chili-dark);
  --bs-btn-active-bg: var(--dm-chili-dark);
  border-radius: 999px;
  font-weight: 700;
}

.btn-whatsapp {
  background: var(--dm-whatsapp);
  color: #fff;
  border-radius: 999px;
  font-weight: 700;
}

.kitchen-ph { background: var(--dm-ph); }
.kitchen-th { background: var(--dm-th); }
.kitchen-in { background: var(--dm-in); }
.kitchen-lk { background: var(--dm-lk); }
```

If the project compiles Bootstrap from Sass instead, set `$primary: #C8261E; $success: #0F4D2C; $body-bg: #FFF7EA; $body-color: #1C1A17;` before importing Bootstrap. That way buttons, focus rings and alerts all pick up the new colors.

## Step 3: typography

Montserrat goes. Bricolage Grotesque takes over headings: bold, a little playful, and it reads as a market rather than a bank. Inter stays for body text. Every native script gets a matching Noto font so Thai, Sinhala, Hindi and Hebrew render properly instead of falling back to whatever the phone has.

Add to the `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Inter:wght@400;500;600;700&family=Noto+Sans+Thai:wght@500;700&family=Noto+Sans+Sinhala:wght@500;700&family=Noto+Sans+Devanagari:wght@500;700&family=Noto+Sans+Hebrew:wght@500;700&display=swap">
```

Then in CSS:

```css
:root {
  --dm-font-body: 'Inter', 'Noto Sans Hebrew', 'Noto Sans Thai', 'Noto Sans Sinhala', 'Noto Sans Devanagari', system-ui, sans-serif;
  --dm-font-display: 'Bricolage Grotesque', var(--dm-font-body);
  --bs-body-font-family: var(--dm-font-body);
}
h1, h2, .display { font-family: var(--dm-font-display); font-weight: 800; letter-spacing: -0.02em; }
:lang(th) { font-family: 'Noto Sans Thai', var(--dm-font-body); line-height: 1.3; }
:lang(si) { font-family: 'Noto Sans Sinhala', var(--dm-font-body); line-height: 1.3; }
:lang(hi) { font-family: 'Noto Sans Devanagari', var(--dm-font-body); line-height: 1.25; }
:lang(he) { font-family: 'Noto Sans Hebrew', var(--dm-font-body); }
```

Mark every native-language line with its `lang` attribute (`lang="th"`, `lang="si"`, `lang="hi"`, `lang="he"`, `lang="tl"`) and Hebrew blocks with `dir="rtl"`. That picks the right font automatically and helps screen readers.

| Element | Size desktop | Size phone | Weight |
| --- | --- | --- | --- |
| Hero H1 | 84px | 44px | 800, line-height 0.98 |
| Section H2 | 40px | 28px | 800 |
| Card title (kitchen) | 34px | 22px | 800 |
| Product name | 17px | 14px | 600 |
| Body | 17 to 19px | 15px | 400 |
| Labels, badges | 13px | 11px | 700, letter-spacing 0.6px, uppercase |

Use `font-size: clamp(44px, 6vw, 84px)` on the H1 so it scales smoothly between the two. Thai, Sinhala and Devanagari headlines run about 10% smaller than the Latin ones and need the taller line-heights above, or the vowel marks get clipped.

## Step 4: shape and components

The current 4px corners and square inputs feel like a 2015 template. Round everything up and give it room.

| Component | Spec |
| --- | --- |
| Buttons | Pill shape (`border-radius: 999px`), 44px minimum height (48 to 56px for main CTAs), 700 weight, 14 to 22px horizontal padding |
| Add-to-basket | 44×44px chili circle with a white "+", bottom right of each product card |
| Product card | White, 22px radius, 1px `--dm-line` border, 14px padding, image well 170 to 180px tall on a `--dm-cream`-ish tint (#F4EBDC) with 16px radius |
| Kitchen card | Kitchen tint background, 28px radius, 28px padding, minimum 340px tall; black pill badge with the country name in the tint color; three pack shots in a row at the bottom |
| Promo band | 28 to 36px radius, 32 to 48px padding; dark ink or turmeric only |
| Search bar | White pill, 48px tall, 1.5px `--dm-line-strong` border, magnifier icon on the left |
| Aisle chips | White cards, 20px radius, name in 18px bold with example brands underneath in muted text |
| Language and filter pills | White pill, 40 to 44px tall, 1.5px `--dm-line-strong` border; selected state is ink background with the kitchen tint as text color |

Spacing runs on a 4px base. Use 20px gaps between cards, 40 to 56px between sections, and a 1240px max content width with 24px side padding (16px on phones).

No drop shadows anywhere except the floating WhatsApp button on mobile. No gradients. No emoji in the UI: the country flag emojis in the current menu render differently on every phone, so swap them for the colored country badges.

## Step 5: page by page

### Header (every page)

1. Top bar in `--dm-green`, cream text, centered: "Order by \[cutoff\] for next-day delivery" plus the free-delivery threshold in `--dm-turmeric`. Pull both numbers from your delivery settings so they never go stale.
2. Main row: logo left, search bar in the middle (flex-grows), then language pill, WhatsApp button, basket pill on the right. The basket pill is ink with the item count and running total.
3. On kitchen pages, swap the search bar for the four kitchen pills, with the current kitchen selected.
4. Language pill shows the current language plus Hebrew ("EN · עב"), and remembers the choice in a cookie.

### Homepage

1. Hero: small chili eyebrow ("4 KITCHENS · 1 BASKET · DELIVERED IN ISRAEL"), the big H1 "Taste of home, at your door tomorrow.", one line of subcopy. Delete "DISCOVER THE FLAVOURS OF ASIA".
2. Kitchen picker: four cards in a responsive grid (`grid-template-columns: repeat(auto-fit, minmax(260px, 1fr))`). Each card links to its storefront and carries the headline and CTA in its own script.
3. Travellers band: full-width ink band, `dir="rtl"`, Hebrew headline, English line under it, turmeric CTA to a curated "trip box" collection (Thai and Indian snacks Israelis know from backpacking).
4. "Back in stock this week": four product cards, auto-filled from your New Arrivals data, each with its country badge.
5. Two side-by-side bands: "Send a box to a friend" (turmeric) and "Rather just message us?" (white with the WhatsApp button).
6. Green footer with VAT note, dietary filters mention, care links and payment methods as text.

The old Best Sellers, Special Offers and full catalogue blocks move off the homepage. Best sellers live on each storefront; the catalogue stays at /shop.

### Kitchen storefronts (/ph, /th, /in, /lk)

Build one template and feed it per-kitchen content. The Filipino page on the canvas is the reference.

1. Hero card in the kitchen tint, 36px radius: native-language badge, H1 and subcopy in that language, chili "Shop now" and WhatsApp buttons, and a real overhead food photo on the right.
2. Aisle chips named the way that community shops. For the Filipino store: Pancit & noodles, Sawsawan, Merienda, Ube & matamis, De lata & bigas, Sinigang kit. Ask a native speaker to name the aisles for the other three; don't translate the English category names.
3. "Favourites" grid of eight best sellers, filtered by country of origin.
4. Dark gift band ("Padala box" on the Filipino page).
5. Default the page language to the kitchen's language, with a toggle to English or Hebrew. Set `<html lang>` accordingly.

### Mobile

1. Top bar shortens to "Order by \[cutoff\] · at your door tomorrow".
2. Header: logo, a search icon button, basket icon with a chili count badge.
3. Kitchen cards become a 2×2 grid, 170px tall, short headline only.
4. Products go two per row.
5. A full-width WhatsApp button stays fixed 20px from the bottom of the screen on every page (`position: fixed; left: 16px; right: 16px; bottom: 20px; height: 56px`). Add bottom padding to the page so it never covers the footer.
6. Every tap target stays at least 44×44px.

## Step 6: copy and language

Write about the moment, not the catalogue. "Your Sunday sinigang, delivered Friday" sells; "Complete Product Catalogue with multi-filter browsing" doesn't.

| Kitchen | Headline on the mockup | Meaning |
| --- | --- | --- |
| Philippines | Lasang bahay, dito sa Israel. | Taste of home, here in Israel |
| Thailand | รสชาติบ้านเรา ส่งถึงอิสราเอล | Our home's taste, delivered to Israel |
| India | घर का स्वाद, अब इज़राइल में। | Taste of home, now in Israel |
| Sri Lanka | ගෙදර රසය, ඊශ්‍රායලයේදී. | Taste of home, in Israel |
| Israeli travellers | חזרתם מהודו או מתאילנד ומתגעגעים לטעם? | Back from India or Thailand and missing the taste? |

All of these were drafted by AI. Have a native speaker from each community check every line before it goes live, ideally a regular customer. A clumsy translation reads as "not for us" faster than plain English does.

Three house rules for all copy: use the brand names people actually ask for (Lucky Me, Mama, Parle-G, Maliban), write benefits as a time or a moment (tomorrow, day off, Sunday), and keep the English version on every page so mixed households and Hebrew speakers can still shop.

## Step 7: photography

This audience shops by recognizing the packet, so product photos do more for "fresh" than any color. Budget one shoot and do it properly.

| Shot | Spec | Where it goes |
| --- | --- | --- |
| Pack shots | Every product, front-on, on a plain #F4EBDC background, soft daylight, square 1200×1200 WebP | Product cards, kitchen card thumbnails |
| Kitchen heroes | One per kitchen, overhead table spread of a home meal using your products, daylight, 4:3, 2000px wide | Storefront heroes |
| Gift box | The open box with snacks and a handwritten note | Gift band, social |

Avoid stock photos of temples, elephants or lanterns. They say "tourist", and the whole point is "home". Compress everything to under 150KB, and lazy-load anything below the fold.

## Launch checklist

- [ ] No placeholder email, phone or "#" links anywhere on the site
- [ ] Demo Customer and Admin Dashboard hidden from shoppers
- [ ] WhatsApp opens a chat with a prefilled message in the right language
- [ ] Color tokens loaded after Bootstrap; no leftover Montserrat or old greens and maroons
- [ ] Chili red used only on actions; turmeric never used as text on cream
- [ ] Thai, Sinhala, Hindi and Hebrew render in their Noto fonts with no clipped vowel marks
- [ ] Every native-language line checked by a native speaker
- [ ] Delivery cutoff and free-delivery threshold pulled live from settings
- [ ] Homepage and one storefront tested on a mid-range Android phone over 4G
- [ ] All tap targets at least 44px; WhatsApp button doesn't cover the footer
- [ ] Hebrew section reads right to left
- [ ] Lighthouse accessibility score of 95 or higher on homepage and storefront
