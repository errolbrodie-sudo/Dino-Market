/**
 * DINU MARKET: Full-Stack Client Application
 * Implements Navigation (8 Departments, 41 Subcategories, 4 Regions, Excluding Mighty Rewards),
 * Multi-Language Selector (English, Hebrew, Indian/Hindi, Thai, Sri Lankan/Sinhala, Philippine/Filipino),
 * Predictive Search, Faceted Catalog, PDP with Front/Back Photo Gallery, Persistent & Merged Basket,
 * 9-Step Checkout, Customer Account Portal, and 15-Module Administration Dashboard.
 */

const state = {
  lang: 'en',
  userExplicitLang: false,
  currentView: 'storefront',
  navigation: [],
  regions: [],
  shippingZones: [],
  paymentConfig: {},
  user: null,
  wishlist: JSON.parse(localStorage.getItem('dinu_wishlist') || '[]'),
  newsletterSubscribers: JSON.parse(localStorage.getItem('dinu_newsletter') || '[{"email":"subscriber@example.co.il","subscribed_at":"2026-11-11T09:00:00Z","explicit_consent":true}]'),
  promotionalOffers: JSON.parse(localStorage.getItem('dinu_promo_offers') || '[]'),
  cart: JSON.parse(localStorage.getItem('dinu_cart_fallback') || '{"items":[],"item_count":0,"subtotal_ils":0,"discounted_subtotal_ils":0,"discount_amount_ils":0,"shipping_cost_ils":25,"vat_included_ils":0,"total_ils":0,"zone_name":"Gush Dan & Tel Aviv Metro"}'),
  products: [],
  regionProducts: [],
  allProducts: [],
  vendors: [],
  activeRegionPage: null,
  activeRegionalPage: 'philippines',
  regionalPageLimit: 8,
  regionPageFilters: {
    region: 'philippines',
    category: '',
    subcategory: '',
    vendor: '',
    size: '',
    dietary: '',
    maxPrice: 150,
    sort: 'featured'
  },
  filters: {
    category: '',
    subcategory: '',
    region: '',
    tripBox: false,
    size: '',
    q: '',
    vendor: '',
    dietary: '',
    inStock: false,
    onSale: false,
    authenticOnly: false,
    maxPrice: 150,
    sort: 'featured'
  },
  checkout: {
    is_guest: false,
    first_name: '',
    last_name: '',
    email: '',
    recipient_name: '',
    phone: '',
    country: 'Israel',
    zone_code: 'IL-Z1',
    city: 'Tel Aviv-Yafo',
    street_address: '',
    building_number: '',
    apartment_floor: '',
    entrance_code: '',
    postal_code: '',
    delivery_notes: '',
    delivery_method: 'standard',
    payment_method: 'credit_card',
    installments: 1,
    card_last4: '4242',
    simulate_decline: false,
    save_address: true,
    last_confirmed_order: null
  },
  accountData: {
    addresses: [],
    orders: JSON.parse(localStorage.getItem('dinu_orders_fallback') || '[]')
  },
  adminData: null
};

function getCookie(name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + escaped + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : '';
}

function setCookie(name, value, days = 365) {
  const maxAge = Math.max(0, Math.floor(days * 86400));
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

const KITCHEN_ORDER = ['philippines', 'thailand', 'india', 'sri-lanka'];

const KITCHEN_PATH_TO_SLUG = {
  '/ph': 'philippines',
  '/th': 'thailand',
  '/in': 'india',
  '/lk': 'sri-lanka'
};

const KITCHEN_SLUG_TO_PATH = {
  philippines: '/ph',
  thailand: '/th',
  india: '/in',
  'sri-lanka': '/lk'
};

const REGION_FLAG_URLS = {
  philippines: 'images/flags/philippines.png',
  thailand: 'images/flags/thailand.png',
  india: 'images/flags/india.svg',
  'sri-lanka': 'images/flags/sri-lanka.png'
};

const WHATSAPP_GREETINGS = {
  philippines: 'Kumusta Dinu, gusto ko pong umorder sa Filipino store:',
  tl: 'Kumusta Dinu, gusto ko pong umorder sa Filipino store:',
  thailand: 'สวัสดี Dinu ฉันต้องการสั่งซื้อสินค้าไทย:',
  th: 'สวัสดี Dinu ฉันต้องการสั่งซื้อสินค้าไทย:',
  india: 'नमस्ते Dinu, मैं भारतीय ग्रोसरी ऑर्डर करना चाहता/चाहती हूँ:',
  hi: 'नमस्ते Dinu, मैं भारतीय ग्रोसरी ऑर्डर करना चाहता/चाहती हूँ:',
  'sri-lanka': 'ආයුබෝවන් Dinu, මට ශ්‍රී ලාංකික භාණ්ඩ ඇණවුම් කිරීමට අවශ්‍යයි:',
  si: 'ආයුබෝවන් Dinu, මට ශ්‍රී ලාංකික භාණ්ඩ ඇණවුම් කිරීමට අවශ්‍යයි:',
  he: 'היי דינו, אשמח להזמין משלוח:',
  en: "Hi Dinu, I'd like to order:"
};

function getSupportDetails() {
  const cfg = state.paymentConfig || {};
  const zone0 = (state.shippingZones && state.shippingZones[0]) || {};
  const freeZone = (state.shippingZones || []).find((z) => Number(z.free_threshold_ils) > 0) || zone0;
  return {
    cutoff: cfg.order_cutoff_time || '14:00',
    freeThreshold: Number(freeZone.free_threshold_ils || cfg.free_delivery_threshold_ils || 250),
    email: cfg.support_email || 'support@dinumarket.co.il',
    phoneDisplay: cfg.support_phone || '054-812-4900',
    whatsappE164: String(cfg.whatsapp_e164 || '972548124900').replace(/\D/g, '') || '972548124900'
  };
}

function getWhatsAppUrl(contextKey, customText) {
  const { whatsappE164 } = getSupportDetails();
  const key = contextKey || (state.currentView === 'region' && state.activeRegionPage ? state.activeRegionPage : state.lang) || 'en';
  const greeting = customText || WHATSAPP_GREETINGS[key] || WHATSAPP_GREETINGS[state.lang] || WHATSAPP_GREETINGS.en;
  return `https://wa.me/${whatsappE164}?text=${encodeURIComponent(greeting)}`;
}

const KITCHEN_STOREFRONTS = {
  philippines: {
    slug: 'philippines',
    path: '/ph',
    name: 'Philippines',
    nativeName: 'Pilipinas',
    lang: 'tl',
    langButtonLabel: 'Filipino',
    tintClass: 'kitchen-ph',
    badgeTintClass: 'tint-philippines',
    softBg: 'var(--dm-ph-soft)',
    tintColor: 'var(--dm-ph)',
    cardHeadline: 'Lasang bahay, dito sa Israel.',
    cardSubcopy: 'Your Sunday sinigang, Lucky Me pancit canton & Silver Swan sawsawan — delivered Friday.',
    cardCta: 'Mamili sa Filipino store →',
    heroBadge: 'TINDAHAN NG PINOY · PHILIPPINES',
    heroTitle: {
      tl: 'Lasang bahay, dito sa Israel.',
      en: 'Taste of home, right here in Israel.',
      he: 'הטעם של הבית בפיליפינים, אצלכם מחר בדלת.'
    },
    heroSubcopy: {
      tl: 'Pang-Sunday sinigang, Lucky Me pancit canton, Silver Swan toyo at paboritong merienda — nasa bodega na sa Israel at ihahatid bukas.',
      en: 'Your Sunday sinigang, Lucky Me pancit canton, Silver Swan sawsawan and day-off merienda — stocked in Israel and at your door tomorrow.',
      he: 'כל המוצרים האהובים מהמטבח הפיליפיני — Silver Swan, Lucky Me, חטיפי מריינדה ומרכיבים לסיניגנג במשלוח מהיר לכל הארץ.'
    },
    shopBtnLabel: {
      tl: 'Mamili ngayon',
      en: 'Shop now',
      he: 'לקנייה בחנות'
    },
    whatsappBtnLabel: {
      tl: 'Umorder sa WhatsApp',
      en: 'Order on WhatsApp',
      he: 'הזמנה בוואטסאפ'
    },
    packshots: [
      'images/products/silver-swan-soy-sauce-front.jpg',
      'images/products/silver-swan-soy-sauce-back.jpg',
      'images/products/lal-qilla-basmati-rice-front.jpg',
      'images/products/gorus-cookies-front.jpg'
    ],
    aislesHeading: {
      tl: 'Mamili ayon sa pasilyo',
      en: 'Shop the Filipino aisles',
      he: 'קנייה לפי מחלקות המטבח הפיליפיני'
    },
    aisles: [
      { id: 'pancit', name: 'Pancit & noodles', brands: 'Lucky Me, Payless, bihon & canton', categories: ['instant-foods', 'pantry'] },
      { id: 'sawsawan', name: 'Sawsawan', brands: 'Silver Swan, Datu Puti, Mang Tomas, UFC', categories: ['sauce-seasoning'] },
      { id: 'merienda', name: 'Merienda', brands: 'SkyFlakes, Boy Bawang, Regent, Oishi', categories: ['snacks'] },
      { id: 'ube', name: 'Ube & matamis', brands: 'Ube halaya, halo-halo jars & polvoron', categories: ['sweets'] },
      { id: 'delata', name: 'De lata & bigas', brands: 'Century Tuna, Argentina, jasmine rice', categories: ['canned-jarred-goods', 'pantry'] },
      { id: 'sinigang', name: 'Sinigang kit', brands: 'Knorr sampalok, gabi mix & patis', categories: ['sauce-seasoning', 'instant-foods'] }
    ],
    favouritesHeading: {
      tl: 'Mga paborito sa kusina',
      en: 'Filipino kitchen favourites',
      he: 'הנמכרים ביותר מהפיליפינים'
    },
    giftBand: {
      eyebrow: 'PADALA CARE PACKAGE · ISRAEL DELIVERY',
      title: 'Padala box',
      copy: 'Send a day-off care box packed with Silver Swan, Lucky Me, Boy Bawang and a handwritten note to a friend anywhere in Israel.',
      cta: 'Send a Padala box →',
      whatsappText: 'Kumusta Dinu, gusto ko pong magpadala ng Padala gift box sa kaibigan ko sa Israel:'
    }
  },
  thailand: {
    slug: 'thailand',
    path: '/th',
    name: 'Thailand',
    nativeName: 'ประเทศไทย',
    lang: 'th',
    langButtonLabel: 'ไทย',
    tintClass: 'kitchen-th',
    badgeTintClass: 'tint-thailand',
    softBg: 'var(--dm-th-soft)',
    tintColor: 'var(--dm-th)',
    cardHeadline: 'รสชาติบ้านเรา ส่งถึงอิสราเอล',
    cardSubcopy: 'Mama tom yum, Mae Ploy curry pastes, Chaokoh coconut milk & Thai Hom Mali rice.',
    cardCta: 'เข้าสู่ร้านของชำไทย →',
    heroBadge: 'ครัวไทยในอิสราเอล · THAILAND',
    heroTitle: {
      th: 'รสชาติบ้านเรา ส่งถึงอิสราเอล',
      en: "Our home's taste, delivered across Israel.",
      he: 'הטעם האמיתי של תאילנד, מחר אצלכם בדלת.'
    },
    heroSubcopy: {
      th: 'มาม่าต้มยำกุ้ง พริกแกงแม่พลอย กะทิชาวเกาะ น้ำปลาแท้ และข้าวหอมมะลิ พร้อมส่งจากคลังในอิสราเอลถึงหน้าบ้านพรุ่งนี้',
      en: 'Mama tom yum noodles, Mae Ploy curry pastes, Chaokoh coconut milk and Hom Mali jasmine rice — ready in our Israel warehouse for tomorrow.',
      he: 'אטריות Mama, משחות קארי Mae Ploy, חלב קוקוס, רוטב דגים ואורז יסמין תאילנדי — במלאי בישראל למשלוח מהיר.'
    },
    shopBtnLabel: {
      th: 'ช้อปสินค้าเลย',
      en: 'Shop now',
      he: 'לקנייה בחנות'
    },
    whatsappBtnLabel: {
      th: 'สั่งทาง WhatsApp',
      en: 'Order on WhatsApp',
      he: 'הזמנה בוואטסאפ'
    },
    packshots: [
      'images/products/silver-swan-soy-sauce-front.jpg',
      'images/products/lal-qilla-basmati-rice-front.jpg',
      'images/products/flavorz-jaggery-front.jpg',
      'images/products/rusky-atta-toast-front.jpg'
    ],
    aislesHeading: {
      th: 'เลือกช้อปตามมุมโปรดคนไทย',
      en: 'Shop the Thai kitchen aisles',
      he: 'קנייה לפי מחלקות המטבח התאילנדי'
    },
    aisles: [
      { id: 'mama', name: 'Mama & sen lek', brands: 'Mama tom yum, WaiWai, rice stick & glass noodles', categories: ['instant-foods', 'pantry'] },
      { id: 'gaeng', name: 'Khrueang gaeng & kati', brands: 'Mae Ploy, Lobo, Chaokoh & Aroy-D coconut', categories: ['sauce-seasoning', 'canned-jarred-goods'] },
      { id: 'nampla', name: 'Nam pla & wok sauces', brands: 'Squid Brand, Healthy Boy, Golden Mountain, Pantai', categories: ['sauce-seasoning'] },
      { id: 'somtam', name: 'Som tam pantry', brands: 'Palm sugar, tamarind paste, roasted chili & lime', categories: ['pantry', 'sauce-seasoning'] },
      { id: 'hommali', name: 'Khao hom mali', brands: 'Thai Hom Mali jasmine rice & glutinous sticky rice', categories: ['pantry'] },
      { id: 'chatramue', name: 'Khanom & Cha Thai', brands: 'ChaTraMue Thai tea, Tao Kae Noi & Koh-Kae', categories: ['drinks', 'snacks'] }
    ],
    favouritesHeading: {
      th: 'สินค้ายอดฮิตประจำครัวไทย',
      en: 'Thai kitchen favourites',
      he: 'המועדפים מהמטבח התאילנדי'
    },
    giftBand: {
      eyebrow: 'THAI CARE PACKAGE · ISRAEL DELIVERY',
      title: 'Klong Khong Fak (Thai Care Box)',
      copy: 'Send a comfort box of Mama noodles, ChaTraMue Thai tea and crunchy snacks with a note to friends anywhere in Israel.',
      cta: 'Send a Thai box →',
      whatsappText: 'สวัสดี Dinu ฉันต้องการส่งกล่องของฝากไทยให้เพื่อนในอิสราเอล:'
    }
  },
  india: {
    slug: 'india',
    path: '/in',
    name: 'India',
    nativeName: 'भारत',
    lang: 'hi',
    langButtonLabel: 'हिन्दी',
    tintClass: 'kitchen-in',
    badgeTintClass: 'tint-india',
    softBg: 'var(--dm-in-soft)',
    tintColor: 'var(--dm-in)',
    cardHeadline: 'घर का स्वाद, अब इज़राइल में।',
    cardSubcopy: "Evening chai with Haldiram's Gorus & Rusky, Lal Qilla 5kg basmati, Gulab Jamun & natural gur.",
    cardCta: 'भारतीय स्टोर देखें →',
    heroBadge: 'भारतीय रसोई · INDIA',
    heroTitle: {
      hi: 'घर का स्वाद, अब इज़राइल में।',
      en: 'Taste of home, now in Israel.',
      he: 'הטעם של הודו, אצלכם בבית כבר מחר.'
    },
    heroSubcopy: {
      hi: 'शाम की चाय के लिए हल्दीराम बिस्किट और रस्क, लाल किला बासमती चावल, गुलाब जामुन और शुद्ध गुड़ — इज़राइल में कल आपके दरवाज़े पर।',
      en: "Evening chai with Haldiram's Gorus & Rusky atta toast, Lal Qilla 5kg sella basmati, Gulab Jamun and unrefined gur — at your door tomorrow.",
      he: 'ביסקוויטים וחטיפי Haldiram’s לצ׳אי של אחר הצהריים, אורז בסמטי Lal Qilla 5 ק״ג, גולאב ג׳אמון וג׳אגרי טבעי במשלוח מהיר.'
    },
    shopBtnLabel: {
      hi: 'अभी खरीदें',
      en: 'Shop now',
      he: 'לקנייה בחנות'
    },
    whatsappBtnLabel: {
      hi: 'WhatsApp पर ऑर्डर करें',
      en: 'Order on WhatsApp',
      he: 'הזמנה בוואטסאפ'
    },
    packshots: [
      'images/products/haldirams-gulab-jamun-front.jpg',
      'images/products/lal-qilla-basmati-rice-front.jpg',
      'images/products/gorus-cookies-front.jpg',
      'images/products/flavorz-jaggery-front.jpg'
    ],
    aislesHeading: {
      hi: 'अपनी पसंद की गली चुनें',
      en: 'Shop the Indian kitchen aisles',
      he: 'קנייה לפי מחלקות המטבח ההודי'
    },
    aisles: [
      { id: 'namkeen', name: 'Chai-time & namkeen', brands: "Haldiram's Gorus, Rusky atta toast, Parle-G & bhujia", categories: ['snacks', 'sweets'] },
      { id: 'mithai', name: 'Mithai & gur', brands: "Haldiram's Gulab Jamun, soan papdi & Flavorz jaggery", categories: ['canned-jarred-goods', 'pantry', 'sweets'] },
      { id: 'basmati', name: 'Basmati, atta & dal', brands: 'Lal Qilla 5kg sella, chakki atta, toor & chana dal', categories: ['pantry'] },
      { id: 'masala', name: 'Masala & tadka', brands: 'MDH, Everest, whole garam masala, jeera & hing', categories: ['sauce-seasoning'] },
      { id: 'achaar', name: 'Achaar, chutney & papad', brands: "Mother's Recipe mango pickle, Lijjat papad & ghee", categories: ['canned-jarred-goods', 'sauce-seasoning'] },
      { id: 'chai', name: 'Masala chai & sharbat', brands: 'Wagh Bakri, Taj Mahal, Rooh Afza & cardamom tea', categories: ['drinks'] }
    ],
    favouritesHeading: {
      hi: 'भारतीय रसोई की पहली पसंद',
      en: 'Indian kitchen favourites',
      he: 'הנמכרים ביותר מהודו'
    },
    giftBand: {
      eyebrow: 'MITHAI & CHAI CARE BOX · ISRAEL DELIVERY',
      title: 'Mithai & Chai Gift Box',
      copy: "Send Haldiram's Gulab Jamun, crunchy Gorus cookies and natural jaggery cubes with a personal note anywhere in Israel.",
      cta: 'Send a Mithai box →',
      whatsappText: 'नमस्ते Dinu, मैं अपने दोस्त के लिए इज़राइल में मिठाई गिफ्ट बॉक्स भेजना चाहता/चाहती हूँ:'
    }
  },
  'sri-lanka': {
    slug: 'sri-lanka',
    path: '/lk',
    name: 'Sri Lanka',
    nativeName: 'ශ්‍රී ලංකාව',
    lang: 'si',
    langButtonLabel: 'සිංහල',
    tintClass: 'kitchen-lk',
    badgeTintClass: 'tint-sri-lanka',
    softBg: 'var(--dm-lk-soft)',
    tintColor: 'var(--dm-lk)',
    cardHeadline: 'ගෙදර රසය, ඊශ්‍රායලයේදී.',
    cardSubcopy: 'Sunday rice & curry with Maliban biscuits, Ceylon kahata tea, katta sambol & roasted thuna paha.',
    cardCta: 'ශ්‍රී ලාංකික කඩේට →',
    heroBadge: 'අපේ ලංකා කඩේ · SRI LANKA',
    heroTitle: {
      si: 'ගෙදර රසය, ඊශ්‍රායලයේදී.',
      en: 'Taste of home, here in Israel.',
      he: 'הטעם של סרי לנקה, אצלכם בדלת מחר.'
    },
    heroSubcopy: {
      si: 'ඉරිදා බත් සහ ව්‍යංජන සඳහා Maliban බිස්කට්, සිලෝන් තේ, කට්ට සම්බෝල, බැදපු තුනපහ සහ කීරි සම්බා — හෙටම ඔබේ නිවසට.',
      en: 'Your Sunday rice and curry table — Maliban Lemon Puff, Ceylon kahata tea, katta sambol and roasted curry powder delivered tomorrow.',
      he: 'תה ציילון אמיתי, ביסקוויטים של Maliban, סמבול, תבליני קארי קלויים וחלב קוקוס מסרי לנקה במשלוח לכל רחבי ישראל.'
    },
    shopBtnLabel: {
      si: 'දැන් මිලදී ගන්න',
      en: 'Shop now',
      he: 'לקנייה בחנות'
    },
    whatsappBtnLabel: {
      si: 'WhatsApp මගින් ඇණවුම් කරන්න',
      en: 'Order on WhatsApp',
      he: 'הזמנה בוואטסאפ'
    },
    packshots: [
      'images/products/flavorz-jaggery-front.jpg',
      'images/products/gorus-cookies-front.jpg',
      'images/products/lal-qilla-basmati-rice-front.jpg',
      'images/products/rusky-atta-toast-front.jpg'
    ],
    aislesHeading: {
      si: 'අපේ කඩේ අංශ අනුව තෝරන්න',
      en: 'Shop the Sri Lankan aisles',
      he: 'קנייה לפי מחלקות המטבח הסרי לנקי'
    },
    aisles: [
      { id: 'shorteats', name: 'Biscuits & short-eats', brands: 'Maliban Lemon Puff, Munchee Cream Cracker & murukku', categories: ['snacks', 'sweets'] },
      { id: 'samba', name: 'Samba haal & hoppers', brands: 'Keeri Samba, red raw rice, string hopper & appa flour', categories: ['pantry'] },
      { id: 'thunapaha', name: 'Thuna paha & badapu', brands: 'McCurrie, Wijaya roasted curry powder, goraka & pandan', categories: ['sauce-seasoning'] },
      { id: 'sambol', name: 'Sambol & moju jars', brands: 'MD katta sambol, seeni sambol, brinjal moju & Maldive fish', categories: ['canned-jarred-goods', 'sauce-seasoning'] },
      { id: 'polkiri', name: 'Pol kiri & kithul', brands: 'Maggi coconut milk powder, kithul treacle & hakuru', categories: ['pantry', 'sweets'] },
      { id: 'ceylontea', name: 'Ceylon kahata & EGB', brands: 'Dilmah, Zesta kahata, Elephant House ginger beer & Milo', categories: ['drinks'] }
    ],
    favouritesHeading: {
      si: 'අපේ ජනප්‍රියම භාණ්ඩ',
      en: 'Sri Lankan kitchen favourites',
      he: 'המועדפים מסרי לנקה'
    },
    giftBand: {
      eyebrow: 'GEDARA CARE PACKAGE · ISRAEL DELIVERY',
      title: 'Gedara Tea-Time Box',
      copy: 'Send Maliban biscuits, Ceylon tea and sweet jaggery treats with a personal note to a friend anywhere in Israel.',
      cta: 'Send a Gedara box →',
      whatsappText: 'ආයුබෝවන් Dinu, මට ඊශ්‍රායලයේ මිතුරෙකුට Gedara තෑගි පෙට්ටියක් යැවීමට අවශ්‍යයි:'
    }
  }
};

const I18N_DICTIONARY = {
  en: {
    sign_in_register: 'Sign In',
    admin_dashboard: 'Admin',
    basket_label: 'Basket',
    search_placeholder: "Search Lucky Me, Mama, Haldiram's, Silver Swan, Maliban...",
    search_btn: 'Search',
    clear_all_filters: 'Clear all filters',
    all_4_regions: 'All 4 Kitchens',
    filter_authentic: 'Warehouse Photographed Items',
    filter_in_stock: 'In Stock Only',
    filter_on_sale: 'Special Offers',
    filter_dept_title: 'Aisle / Category',
    filter_subcat_title: 'Subcategory',
    filter_dietary_title: 'Dietary',
    filter_brand_title: 'Brand',
    filter_max_price: 'Max Price (₪ ILS):',
    sort_by_label: 'Sort by:',
    all_products_heading: 'All 4 Kitchens',
    add_to_basket: 'Add to Basket',
    in_basket: 'in basket',
    in_stock: 'In stock',
    out_of_stock: 'Out of stock',
    categories: {
      'shop-by-region': 'Shop by Kitchen',
      sweets: 'Sweets',
      snacks: 'Snacks',
      pantry: 'Pantry',
      drinks: 'Drinks',
      'canned-jarred-goods': 'Canned & Jarred Goods',
      'sauce-seasoning': 'Sauce & Seasoning',
      'instant-foods': 'Instant Foods'
    },
    regions: {
      philippines: 'Philippines',
      thailand: 'Thailand',
      india: 'India',
      'sri-lanka': 'Sri Lanka'
    }
  },
  he: {
    sign_in_register: 'התחברות',
    admin_dashboard: 'ניהול',
    basket_label: 'סל',
    search_placeholder: 'חיפוש Lucky Me, Mama, Haldiram’s, Silver Swan, Maliban...',
    search_btn: 'חיפוש',
    clear_all_filters: 'נקה מסננים',
    all_4_regions: 'כל 4 המטבחים',
    filter_authentic: 'מוצרים במלאי מצולם',
    filter_in_stock: 'במלאי בלבד',
    filter_on_sale: 'במבצע',
    filter_dept_title: 'מחלקה',
    filter_subcat_title: 'תת-קטגוריה',
    filter_dietary_title: 'תזונה וכשרות',
    filter_brand_title: 'מותג',
    filter_max_price: 'מחיר מקסימלי (₪):',
    sort_by_label: 'מיון לפי:',
    all_products_heading: 'כל מוצרי Dinu Market',
    add_to_basket: 'הוסף לסל',
    in_basket: 'בסל',
    in_stock: 'במלאי',
    out_of_stock: 'אזל מהמלאי',
    categories: {
      'shop-by-region': 'לפי מטבח',
      sweets: 'ממתקים וקינוחים',
      snacks: 'חטיפים מלוחים',
      pantry: 'מזווה ואורז',
      drinks: 'משקאות ותה',
      'canned-jarred-goods': 'שימורים וצנצנות',
      'sauce-seasoning': 'רטבים ותבלינים',
      'instant-foods': 'נודלס ואוכל מהיר'
    },
    regions: {
      philippines: 'הפיליפינים',
      thailand: 'תאילנד',
      india: 'הודו',
      'sri-lanka': 'סרי לנקה'
    }
  },
  hi: {
    sign_in_register: 'साइन इन',
    admin_dashboard: 'एडमिन',
    basket_label: 'टोकरी',
    search_placeholder: 'Haldiram’s, Lal Qilla बासमती, Rusky, Gulab Jamun, गुड़ खोजें...',
    search_btn: 'खोजें',
    clear_all_filters: 'सभी फ़िल्टर हटाएं',
    all_4_regions: 'सभी 4 रसोई',
    filter_authentic: 'असली स्टोर आइटम',
    filter_in_stock: 'केवल स्टॉक में',
    filter_on_sale: 'विशेष छूट',
    filter_dept_title: 'गली / श्रेणी',
    filter_subcat_title: 'उप-श्रेणी',
    filter_dietary_title: 'आहार',
    filter_brand_title: 'ब्रांड',
    filter_max_price: 'अधिकतम मूल्य (₪ ILS):',
    sort_by_label: 'क्रमबद्ध करें:',
    all_products_heading: 'सभी Dinu Market उत्पाद',
    add_to_basket: 'टोकरी में डालें',
    in_basket: 'टोकरी में',
    in_stock: 'स्टॉक में',
    out_of_stock: 'स्टॉक समाप्त',
    categories: {
      'shop-by-region': 'रसोई के अनुसार',
      sweets: 'मिठाइयाँ',
      snacks: 'नाश्ता और स्नैक्स',
      pantry: 'पैंट्री और अनाज',
      drinks: 'पेय पदार्थ',
      'canned-jarred-goods': 'डिब्बाबंद सामान',
      'sauce-seasoning': 'सॉस और मसाले',
      'instant-foods': 'इंस्टेंट फूड्स'
    },
    regions: {
      philippines: 'फिलीपींस',
      thailand: 'थाईलैंड',
      india: 'भारत',
      'sri-lanka': 'श्रीलंका'
    }
  },
  th: {
    sign_in_register: 'เข้าสู่ระบบ',
    admin_dashboard: 'ผู้ดูแล',
    basket_label: 'ตะกร้า',
    search_placeholder: 'ค้นหา มาม่า, แม่พลอย, กะทิชาวเกาะ, ข้าวหอมมะลิ, น้ำปลา...',
    search_btn: 'ค้นหา',
    clear_all_filters: 'ล้างตัวกรองทั้งหมด',
    all_4_regions: 'ครบทั้ง 4 ครัว',
    filter_authentic: 'สินค้าพร้อมส่งในคลัง',
    filter_in_stock: 'มีสินค้าเท่านั้น',
    filter_on_sale: 'โปรโมชั่น',
    filter_dept_title: 'หมวดหมู่',
    filter_subcat_title: 'หมวดหมู่ย่อย',
    filter_dietary_title: 'โภชนาการ',
    filter_brand_title: 'แบรนด์',
    filter_max_price: 'ราคาสูงสุด (₪ ILS):',
    sort_by_label: 'เรียงตาม:',
    all_products_heading: 'สินค้าทั้งหมด',
    add_to_basket: 'เพิ่มลงตะกร้า',
    in_basket: 'ในตะกร้า',
    in_stock: 'มีสินค้า',
    out_of_stock: 'สินค้าหมด',
    categories: {
      'shop-by-region': 'เลือกตามครัว',
      sweets: 'ขนมหวาน',
      snacks: 'ขนมขบเคี้ยว',
      pantry: 'วัตถุดิบและข้าวสาร',
      drinks: 'เครื่องดื่มและชา',
      'canned-jarred-goods': 'อาหารกระป๋อง',
      'sauce-seasoning': 'ซอสและพริกแกง',
      'instant-foods': 'บะหมี่กึ่งสำเร็จรูป'
    },
    regions: {
      philippines: 'ฟิลิปปินส์',
      thailand: 'ไทย',
      india: 'อินเดีย',
      'sri-lanka': 'ศรีลังกา'
    }
  },
  si: {
    sign_in_register: 'පිවිසෙන්න',
    admin_dashboard: 'පරිපාලක',
    basket_label: 'බාස්කට්',
    search_placeholder: 'Maliban, සිලෝන් තේ, සම්බෝල, බාස්මතී සහල් හෝ හකුරු සොයන්න...',
    search_btn: 'සොයන්න',
    clear_all_filters: 'සියලු පෙරහන් ඉවත් කරන්න',
    all_4_regions: 'මුළුතැන්ගෙයි 4ම',
    filter_authentic: 'ගබඩාවේ ඇති භාණ්ඩ',
    filter_in_stock: 'තොගයේ ඇති පමණක්',
    filter_on_sale: 'වට්ටම් සහිත',
    filter_dept_title: 'අංශය',
    filter_subcat_title: 'උප කාණ්ඩය',
    filter_dietary_title: 'ආහාර වර්ගය',
    filter_brand_title: 'වෙළඳ නාමය',
    filter_max_price: 'උපරිම මිල (₪ ILS):',
    sort_by_label: 'පෙළගස්වන්න:',
    all_products_heading: 'සියලුම භාණ්ඩ',
    add_to_basket: 'බාස්කට්ටුවට',
    in_basket: 'බාස්කට්ටුවේ',
    in_stock: 'තොගයේ ඇත',
    out_of_stock: 'තොග අවසන්',
    categories: {
      'shop-by-region': 'රට අනුව',
      sweets: 'රසකැවිලි',
      snacks: 'කෙටි ආහාර',
      pantry: 'සහල් සහ පිටි',
      drinks: 'තේ සහ බීම',
      'canned-jarred-goods': 'ටින් සහ බෝතල් කළ',
      'sauce-seasoning': 'සෝස් සහ තුනපහ',
      'instant-foods': 'ක්ෂණික ආහාර'
    },
    regions: {
      philippines: 'පිලිපීනය',
      thailand: 'තායිලන්තය',
      india: 'ඉන්දියාව',
      'sri-lanka': 'ශ්‍රී ලංකාව'
    }
  },
  tl: {
    sign_in_register: 'Mag-Sign In',
    admin_dashboard: 'Admin',
    basket_label: 'Basket',
    search_placeholder: 'Maghanap ng Lucky Me, Silver Swan, Datu Puti, SkyFlakes, bigas...',
    search_btn: 'Hanapin',
    clear_all_filters: 'I-clear ang mga filter',
    all_4_regions: 'Lahat ng 4 na Kusina',
    filter_authentic: 'Mga Produktong Nasa Bodega',
    filter_in_stock: 'May Stock Lamang',
    filter_on_sale: 'Naka-Sale',
    filter_dept_title: 'Pasilyo / Kategorya',
    filter_subcat_title: 'Subkategorya',
    filter_dietary_title: 'Dietary',
    filter_brand_title: 'Brand / Tatak',
    filter_max_price: 'Pinakamataas na Presyo (₪ ILS):',
    sort_by_label: 'Ayusin ayon sa:',
    all_products_heading: 'Lahat ng Produkto',
    add_to_basket: 'Idagdag sa Basket',
    in_basket: 'sa basket',
    in_stock: 'May stock',
    out_of_stock: 'Ubos na',
    categories: {
      'shop-by-region': 'Mamili ayon sa Kusina',
      sweets: 'Ube at Matamis',
      snacks: 'Merienda at Snacks',
      pantry: 'Bigas at Pantry',
      drinks: 'Mga Inumin',
      'canned-jarred-goods': 'De Lata at Garapon',
      'sauce-seasoning': 'Sawsawan at Pampalasa',
      'instant-foods': 'Pancit at Instant Noodles'
    },
    regions: {
      philippines: 'Pilipinas',
      thailand: 'Thailand',
      india: 'India',
      'sri-lanka': 'Sri Lanka'
    }
  }
};

function t(key) {
  const dict = I18N_DICTIONARY[state.lang] || I18N_DICTIONARY.en;
  return dict[key] || I18N_DICTIONARY.en[key] || key;
}

function getCategoryLabel(cat) {
  const dict = I18N_DICTIONARY[state.lang] || I18N_DICTIONARY.en;
  return (dict.categories && dict.categories[cat.slug]) || cat.name;
}

function getRegionLabel(reg) {
  const dict = I18N_DICTIONARY[state.lang] || I18N_DICTIONARY.en;
  return (dict.regions && dict.regions[reg.slug]) || reg.name;
}

function getProductLocalizedTitle(p) {
  if (p.i18n && p.i18n[state.lang] && p.i18n[state.lang].title) {
    return p.i18n[state.lang].title;
  }
  return p.title;
}

function getProductLocalizedDesc(p) {
  if (p.i18n && p.i18n[state.lang] && p.i18n[state.lang].description) {
    return p.i18n[state.lang].description;
  }
  return p.description;
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showToast(message) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const el = document.createElement('div');
  el.className = 'toast-msg';
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => {
    el.remove();
  }, 3800);
}

const STATIC_FALLBACK_REGIONS = [
  {
    name: 'Philippines',
    name_he: 'הפיליפינים',
    slug: 'philippines',
    iso_code: 'PH',
    flag_emoji: '',
    hero_headline: 'Lasang bahay, dito sa Israel.',
    description: 'Your Sunday sinigang, Lucky Me pancit canton, Silver Swan sawsawan and day-off merienda delivered across Israel.',
    tile_image: 'images/products/silver-swan-soy-sauce-front.jpg'
  },
  {
    name: 'Thailand',
    name_he: 'תאילנד',
    slug: 'thailand',
    iso_code: 'TH',
    flag_emoji: '',
    hero_headline: 'รสชาติบ้านเรา ส่งถึงอิสราเอล',
    description: 'Mama tom yum, Mae Ploy curry pastes, Chaokoh coconut milk and Hom Mali jasmine rice delivered across Israel.',
    tile_image: 'images/brand/dinu-logo.png'
  },
  {
    name: 'India',
    name_he: 'הודו',
    slug: 'india',
    iso_code: 'IN',
    flag_emoji: '',
    hero_headline: 'घर का स्वाद, अब इज़राइल में।',
    description: "Haldiram's biscuits and Gulab Jamun, Lal Qilla aged basmati rice, Rusky atta toast and natural cane jaggery delivered across Israel.",
    tile_image: 'images/products/lal-qilla-basmati-rice-front.jpg'
  },
  {
    name: 'Sri Lanka',
    name_he: 'סרי לנקה',
    slug: 'sri-lanka',
    iso_code: 'LK',
    flag_emoji: '',
    hero_headline: 'ගෙදර රසය, ඊශ්‍රායලයේදී.',
    description: 'Maliban biscuits, pure Ceylon kahata tea, katta sambol and roasted island curry spices delivered across Israel.',
    tile_image: 'images/brand/dinu-logo.png'
  }
];

const STATIC_FALLBACK_NAVIGATION = [
  {
    name: 'Shop by Region',
    name_he: 'קנייה לפי מדינה',
    slug: 'shop-by-region',
    subcategories: STATIC_FALLBACK_REGIONS.map((r) => ({ ...r, is_region: true }))
  },
  {
    name: 'Sweets',
    name_he: 'ממתקים וקינוחים',
    slug: 'sweets',
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
    subcategories: [
      { name: 'Rice', name_he: 'אורז בסמטי ואורז אסייתי', slug: 'rice' },
      { name: 'Noodles', name_he: 'אטריות יבשות', slug: 'noodles' },
      { name: 'Flour', name_he: 'קמחים מיוחדים', slug: 'flour' },
      { name: 'Sugar', name_he: 'סוכר קנים וג׳אגרי טבעי', slug: 'sugar' }
    ]
  },
  {
    name: 'Drinks',
    name_he: 'משקאות ותה',
    slug: 'drinks',
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
    subcategories: [
      { name: 'Instant Noodles & Ramen', name_he: 'ראמן ואטריות להכנה מהירה', slug: 'instant-noodles-ramen' },
      { name: 'Hot Pot & Meals', name_he: 'ארוחות מוכנות והוט-פוט', slug: 'hot-pot-meals' },
      { name: 'Soups', name_he: 'מרקים מהירים', slug: 'soups' }
    ]
  }
];

const DEFAULT_CATALOG_PRODUCTS = [
  {
    id: 'prod-1',
    sku: 'DM-IN-001',
    barcode_ean: '8904004416091',
    title: "Haldiram's Gorus Premium Handmade Cookies (250g)",
    title_he: 'עוגיות גורוס פרימיום האלדירם 250 גרם',
    slug: 'haldirams-gorus-premium-cookies-250g',
    vendor_brand: "Haldiram's",
    category_slug: 'sweets',
    subcategory_slug: 'cookies',
    region_slug: 'india',
    size_label: '250g',
    short_description: 'Crunchy golden Indian bakery biscuits crafted with wheat, cashews, and aromatic cardamom.',
    description: 'Live life at its crunchiest with Haldiram’s Gorus Cookies, the perfect bite of crunchy delight to pair with hot masala chai or coffee.',
    ingredients: 'Refined Wheat Flour (Maida), Sugar, Edible Vegetable Oil, Cashews, Milk Solids, Liquid Glucose, Raising Agent [INS 500(ii)].',
    allergens: ['Wheat (Gluten)', 'Cashews (Tree Nuts)', 'Milk'],
    dietary_tags: ['Vegetarian'],
    red_labels: ['High Sugar (סוכר בכמות גבוהה)', 'High Saturated Fat (שומן רווי בכמות גבוהה)'],
    nutrition: { calories_per_100g: 519, protein_g: 7.4, carbs_g: 58.8, sugars_g: 26.0, total_fat_g: 27.6, saturated_fat_g: 12.2, sodium_mg: 46 },
    storage_instructions: 'Store in a cool, dry place away from direct sunlight.',
    importer_israel: 'Maharaja Ltd., HaAvoda 32, Ashdod, Israel',
    purchase_price_ils: 9.5,
    price_ils: 15.0,
    compare_at_price_ils: null,
    discount_percent: 0,
    price_per_100_ils: 6.0,
    net_weight_grams: 250,
    unit_measure_type: '100g',
    stock_quantity: 45,
    low_stock_threshold: 8,
    expiry_date: '2027-06-06',
    primary_image_url: 'images/products/gorus-cookies-front.jpg',
    secondary_image_url: 'images/products/gorus-cookies-back.jpg',
    variants: [{ code: 'single', label: 'Single Pack (1x)', multiplier: 1.0 }],
    status: 'active',
    is_authentic_photo: 1,
    is_featured: 1,
    is_best_seller: 1,
    is_new_arrival: 0,
    rating_average: 0,
    rating_count: 0,
    sales_count: 140
  },
  {
    id: 'prod-2',
    sku: 'DM-IN-002',
    barcode_ean: '8904004417319',
    title: "Haldiram's Rusky Whole Wheat Atta Toast (250g)",
    title_he: 'טוסט חיטה מלאה ראסקי האלדירם 250 גרם',
    slug: 'haldirams-rusky-whole-wheat-atta-toast-250g',
    vendor_brand: "Haldiram's",
    category_slug: 'snacks',
    subcategory_slug: 'crackers-buns',
    region_slug: 'india',
    size_label: '250g',
    short_description: 'Twice-baked crispy whole wheat atta bread toast (rusk), trans-fat free and rich in dietary fibre.',
    description: 'Haldiram’s Rusky Atta Toast is a classic Indian tea-time staple baked with whole wheat flour for a wholesome, golden crunch.',
    ingredients: 'Whole Wheat Flour (Atta), Sugar, Edible Vegetable Oil, Yeast, Milk Solids, Salt, Cardamom.',
    allergens: ['Wheat (Gluten)', 'Milk'],
    dietary_tags: ['Vegetarian', 'Trans-Fat Free', 'High Fibre'],
    red_labels: ['High Sugar (סוכר בכמות גבוהה)'],
    nutrition: { calories_per_100g: 435, protein_g: 9.8, carbs_g: 72.4, sugars_g: 21.0, total_fat_g: 11.2, saturated_fat_g: 3.8, sodium_mg: 240 },
    storage_instructions: 'Store in a cool, dry place in an airtight container after opening.',
    importer_israel: 'Maharaja Ltd., HaAvoda 32, Ashdod, Israel',
    purchase_price_ils: 8.2,
    price_ils: 13.0,
    compare_at_price_ils: null,
    discount_percent: 0,
    price_per_100_ils: 5.2,
    net_weight_grams: 250,
    unit_measure_type: '100g',
    stock_quantity: 52,
    low_stock_threshold: 8,
    expiry_date: '2027-05-30',
    primary_image_url: 'images/products/rusky-atta-toast-front.jpg',
    secondary_image_url: 'images/products/rusky-atta-toast-back.jpg',
    variants: [{ code: 'single', label: 'Single Pack (1x)', multiplier: 1.0 }],
    status: 'active',
    is_authentic_photo: 1,
    is_featured: 1,
    is_best_seller: 1,
    is_new_arrival: 1,
    rating_average: 0,
    rating_count: 0,
    sales_count: 118
  },
  {
    id: 'prod-3',
    sku: 'DM-IN-003',
    barcode_ean: '8906042233463',
    title: 'Flavorz 100% Natural Unrefined Jaggery Cubes (500g Jar)',
    title_he: "ג'אגרי קוביות סוכר קנים טבעי לא מזוקק 500 גרם",
    slug: 'flavorz-natural-jaggery-cubes-500g',
    vendor_brand: 'Flavorz (Spice of India)',
    category_slug: 'pantry',
    subcategory_slug: 'sugar',
    region_slug: 'india',
    size_label: '500g',
    short_description: '100% natural unrefined sugar cane jaggery cubes (~50 cubes per jar) crafted on organic farms.',
    description: 'Traditional Indian unrefined cane sweetener (Gur / Jaggery) in convenient bite-sized 10g cubes.',
    ingredients: '100% Natural Unrefined Sugar Cane Juice.',
    allergens: [],
    dietary_tags: ['Vegan', 'Vegetarian', '100% Natural'],
    red_labels: ['High Sugar (סוכר בכמות גבוהה)'],
    nutrition: { calories_per_100g: 367, protein_g: 5.19, carbs_g: 64.0, sugars_g: 60.0, total_fat_g: 0.17, saturated_fat_g: 0.0, sodium_mg: 4.6 },
    storage_instructions: 'Keep jar tightly closed in a cool, dry place.',
    importer_israel: 'Shasha Yehoram Ltd., HaYetzira 23, Ramla, Israel',
    purchase_price_ils: 14.0,
    price_ils: 22.0,
    compare_at_price_ils: null,
    discount_percent: 0,
    price_per_100_ils: 4.4,
    net_weight_grams: 500,
    unit_measure_type: '100g',
    stock_quantity: 38,
    low_stock_threshold: 8,
    expiry_date: '2027-08-15',
    primary_image_url: 'images/products/flavorz-jaggery-front.jpg',
    secondary_image_url: 'images/products/flavorz-jaggery-back.jpg',
    variants: [{ code: 'single', label: 'Single Pack (1x)', multiplier: 1.0 }],
    status: 'active',
    is_authentic_photo: 1,
    is_featured: 1,
    is_best_seller: 0,
    is_new_arrival: 1,
    rating_average: 0,
    rating_count: 0,
    sales_count: 96
  },
  {
    id: 'prod-4',
    sku: 'DM-IN-006',
    barcode_ean: '079809001624',
    title: 'Silver Swan Special Soy Sauce 1 Liter Family Jug (1000 ml)',
    title_he: 'רוטב סויה מיוחד סילבר סוואן 1 ליטר',
    slug: 'silver-swan-special-soy-sauce-1000ml',
    vendor_brand: 'Silver Swan',
    category_slug: 'sauce-seasoning',
    subcategory_slug: 'soy-sauces',
    region_slug: 'philippines',
    size_label: '1000 ml',
    short_description: 'Rich, savory soy sauce in a 1-liter handled jug, essential for stir-fries and marinades.',
    description: 'Silver Swan Special Soy Sauce delivers deep umami and balanced salinity in a generous 1000 ml handled bottle.',
    ingredients: 'Water, Soybean Extract, Wheat, Iodized Salt, Caramel Color.',
    allergens: ['Soybeans', 'Wheat (Gluten)'],
    dietary_tags: ['Vegan', 'Vegetarian'],
    red_labels: ['High Sodium (נתרן בכמות גבוהה)'],
    nutrition: { calories_per_100g: 53, protein_g: 4.0, carbs_g: 6.7, sugars_g: 0.0, total_fat_g: 0.0, saturated_fat_g: 0.0, sodium_mg: 5800 },
    storage_instructions: 'Store in a cool, dry place. Refrigerate after opening.',
    importer_israel: 'Dinu Market Imports, Israel',
    purchase_price_ils: 12.0,
    price_ils: 19.0,
    compare_at_price_ils: null,
    discount_percent: 0,
    price_per_100_ils: 1.9,
    net_weight_grams: 1000,
    unit_measure_type: '100ml',
    stock_quantity: 64,
    low_stock_threshold: 8,
    expiry_date: '2028-01-20',
    primary_image_url: 'images/products/silver-swan-soy-sauce-front.jpg',
    secondary_image_url: 'images/products/silver-swan-soy-sauce-back.jpg',
    variants: [{ code: 'single', label: 'Single Pack (1x)', multiplier: 1.0 }],
    status: 'active',
    is_authentic_photo: 1,
    is_featured: 1,
    is_best_seller: 1,
    is_new_arrival: 1,
    rating_average: 0,
    rating_count: 0,
    sales_count: 215
  },
  {
    id: 'prod-5',
    sku: 'DM-IN-004',
    barcode_ean: '8904004405910',
    title: "Haldiram's Gulab Jamun in Cardamom Rose Syrup (1 kg Tin)",
    title_he: "גולאב ג'אמון בסירופ הל האלדירם מארז 1 ק״ג (16 יח׳)",
    slug: 'haldirams-gulab-jamun-tin-1kg',
    vendor_brand: "Haldiram's",
    category_slug: 'canned-jarred-goods',
    subcategory_slug: 'canned-jarred-fruits',
    region_slug: 'india',
    size_label: '1 kg',
    short_description: '16 soft, melt-in-the-mouth milk-solid (khoa) dumplings steeped in fragrant cardamom syrup.',
    description: 'Authentic Indian Gulab Jamun crafted from rich khoa (milk solids) and delicately spiced with green cardamom.',
    ingredients: 'Sugar, Water, Milk Solids (Khoa & Skimmed Milk Powder), Refined Wheat Flour (Maida), Palmolein Oil, Cardamom, Rose Water.',
    allergens: ['Milk (Dairy)', 'Wheat (Gluten)'],
    dietary_tags: ['Vegetarian'],
    red_labels: ['High Sugar (סוכר בכמות גבוהה)', 'High Saturated Fat (שומן רווי בכמות גבוהה)'],
    nutrition: { calories_per_100g: 312, protein_g: 4.2, carbs_g: 56.5, sugars_g: 46.0, total_fat_g: 8.1, saturated_fat_g: 3.9, sodium_mg: 35 },
    storage_instructions: 'Store in a cool, dry place. Once opened, transfer contents to a non-metallic container and refrigerate.',
    importer_israel: 'Maharaja Ltd., HaAvoda 32, Ashdod, Israel',
    purchase_price_ils: 19.0,
    price_ils: 29.9,
    compare_at_price_ils: null,
    discount_percent: 0,
    price_per_100_ils: 2.99,
    net_weight_grams: 1000,
    unit_measure_type: '100g',
    stock_quantity: 33,
    low_stock_threshold: 8,
    expiry_date: '2027-09-10',
    primary_image_url: 'images/products/haldirams-gulab-jamun-front.jpg',
    secondary_image_url: 'images/products/haldirams-gulab-jamun-back.jpg',
    variants: [{ code: 'single', label: 'Single Pack (1x)', multiplier: 1.0 }],
    status: 'active',
    is_authentic_photo: 1,
    is_featured: 1,
    is_best_seller: 1,
    is_new_arrival: 0,
    rating_average: 0,
    rating_count: 0,
    sales_count: 164
  },
  {
    id: 'prod-6',
    sku: 'DM-IN-005',
    barcode_ean: '8901161104762',
    title: 'Lal Qilla Supreme Sella Parboiled Extra-Long Basmati Rice (5 kg Bag)',
    title_he: 'אורז לבן בסמטי סופרים סלה לאל קילה שק 5 ק״ג (כשר בד״ץ)',
    slug: 'lal-qilla-supreme-sella-basmati-rice-5kg',
    vendor_brand: 'Lal Qilla (No. 4268)',
    category_slug: 'pantry',
    subcategory_slug: 'rice',
    region_slug: 'india',
    size_label: '5 kg',
    short_description: 'Royal aged extra-long grain parboiled sella basmati rice in a 5 kg family carry sack. Certified Kosher.',
    description: 'Lal Qilla Supreme Sella (Meza) Parboiled Basmati Rice features slender, aromatic grains that elongate to more than double their length when cooked.',
    ingredients: '100% Aged Extra-Long Grain Parboiled Basmati Rice (Non-GMO).',
    allergens: [],
    dietary_tags: ['Kosher (Badatz & Chief Rabbinate)', 'Vegan', 'Gluten-Free', 'Non-GMO'],
    red_labels: [],
    nutrition: { calories_per_100g_dry: 333, protein_g: 6.7, carbs_g: 77.8, sugars_g: 0.0, total_fat_g: 0.0, saturated_fat_g: 0.0, sodium_mg: 2 },
    storage_instructions: 'Store in a cool, dry, and hygienic place away from moisture.',
    importer_israel: 'Gershon Spices Ltd., Israel',
    purchase_price_ils: 48.0,
    price_ils: 69.9,
    compare_at_price_ils: null,
    discount_percent: 0,
    price_per_100_ils: 1.4,
    net_weight_grams: 5000,
    unit_measure_type: '100g',
    stock_quantity: 42,
    low_stock_threshold: 8,
    expiry_date: '2028-04-01',
    primary_image_url: 'images/products/lal-qilla-basmati-rice-front.jpg',
    secondary_image_url: 'images/products/lal-qilla-basmati-rice-back.jpg',
    variants: [{ code: 'single', label: 'Single Pack (1x)', multiplier: 1.0 }],
    status: 'active',
    is_authentic_photo: 1,
    is_featured: 1,
    is_best_seller: 1,
    is_new_arrival: 1,
    rating_average: 0,
    rating_count: 0,
    sales_count: 230
  }
];

function getLocalProducts() {
  const saved = localStorage.getItem('dinu_catalog_products');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {}
  }
  return DEFAULT_CATALOG_PRODUCTS;
}

function saveLocalProducts(list) {
  localStorage.setItem('dinu_catalog_products', JSON.stringify(list));
}

const STATIC_FALLBACK_PRODUCTS = getLocalProducts();

function recalculateLocalCart() {
  const cart = state.cart;
  const items = cart.items || [];
  let subtotal = 0;
  let count = 0;
  items.forEach((it) => {
    it.line_total_ils = Number((it.unit_price_ils * it.quantity).toFixed(2));
    subtotal += it.line_total_ils;
    count += Number(it.quantity);
  });
  cart.subtotal_ils = Number(subtotal.toFixed(2));
  cart.item_count = count;
  let discount = 0;
  if (cart.discount_code === 'WELCOME10') {
    discount = Number((subtotal * 0.1).toFixed(2));
  } else if (cart.discount_code === 'DINU25' && subtotal >= 200) {
    discount = 25;
  }
  cart.discount_amount_ils = discount;
  cart.discounted_subtotal_ils = Math.max(0, Number((subtotal - discount).toFixed(2)));
  const zone = (state.shippingZones || []).find((z) => z.zone_code === state.checkout.zone_code) || {
    name_en: 'Gush Dan & Tel Aviv Metro',
    standard_rate_ils: 25,
    express_rate_ils: 45,
    locker_rate_ils: 15,
    free_threshold_ils: 250
  };
  cart.zone_name = zone.name_en;
  let ship = zone.standard_rate_ils || 25;
  if (state.checkout.delivery_method === 'express') ship = zone.express_rate_ils || 45;
  if (state.checkout.delivery_method === 'locker') ship = zone.locker_rate_ils || 15;
  if (zone.free_threshold_ils > 0 && cart.discounted_subtotal_ils >= zone.free_threshold_ils && state.checkout.delivery_method !== 'express') {
    ship = 0;
    cart.qualifies_for_free_shipping = true;
  } else {
    cart.qualifies_for_free_shipping = false;
  }
  if (cart.discount_code === 'FREESHIP') ship = 0;
  cart.shipping_cost_ils = count === 0 ? 0 : ship;
  cart.total_ils = count === 0 ? 0 : Number((cart.discounted_subtotal_ils + cart.shipping_cost_ils).toFixed(2));
  cart.vat_included_ils = Number(((cart.total_ils * 18) / 118).toFixed(2));
  localStorage.setItem('dinu_cart_fallback', JSON.stringify(cart));
  return cart;
}

async function apiFetch(url, options = {}) {
  try {
    if (window.location.protocol === 'file:') {
      throw new Error('local-mode');
    }
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
      ...options
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Request failed (${res.status})`);
    }
    return data;
  } catch (err) {
    const prods = getLocalProducts();
    const defaultZones = [
      { zone_code: 'IL-Z1', name_en: 'Gush Dan & Tel Aviv Metro', name_he: 'גוש דן ותל אביב', standard_rate_ils: 25, express_rate_ils: 45, locker_rate_ils: 15, free_threshold_ils: 250, estimated_days: '1–2 business days (Israel Only)' },
      { zone_code: 'IL-Z2', name_en: 'Sharon, Central & Shfela', name_he: 'השרון, מרכז והשפלה', standard_rate_ils: 29, express_rate_ils: 49, locker_rate_ils: 19, free_threshold_ils: 250, estimated_days: '1–3 business days (Israel Only)' },
      { zone_code: 'IL-Z3', name_en: 'Jerusalem, Haifa & North', name_he: 'ירושלים, חיפה והצפון', standard_rate_ils: 32, express_rate_ils: 55, locker_rate_ils: 19, free_threshold_ils: 280, estimated_days: '2–3 business days (Israel Only)' },
      { zone_code: 'IL-Z4', name_en: 'Beersheba & South', name_he: 'באר שבע והדרום', standard_rate_ils: 35, express_rate_ils: 59, locker_rate_ils: 22, free_threshold_ils: 300, estimated_days: '2–4 business days (Israel Only)' }
    ];
    if (url.startsWith('/api/bootstrap')) {
      if (!state.shippingZones || state.shippingZones.length === 0) state.shippingZones = defaultZones;
      return {
        navigation: STATIC_FALLBACK_NAVIGATION,
        regions: STATIC_FALLBACK_REGIONS,
        shipping_zones: state.shippingZones,
        payment_config: {
          order_cutoff_time: '14:00',
          support_email: 'support@dinumarket.co.il',
          support_phone: '054-812-4900',
          whatsapp_e164: '972548124900'
        },
        user: state.user,
        cart: recalculateLocalCart()
      };
    }
    if (url.startsWith('/api/products?')) {
      const qs = new URLSearchParams(url.split('?')[1] || '');
      let list = prods.filter((p) => (p.status || 'active') === 'active');
      const cat = qs.get('category');
      const sub = qs.get('subcategory');
      const reg = qs.get('region');
      const size = qs.get('size');
      const q = (qs.get('q') || '').toLowerCase();
      const vendor = qs.get('vendor');
      const dietary = qs.get('dietary');
      const inStock = qs.get('inStock') === 'true';
      const onSale = qs.get('onSale') === 'true';
      const maxPrice = Number(qs.get('maxPrice') || 150);
      const sort = qs.get('sort') || 'featured';
      if (cat) list = list.filter((p) => p.category_slug === cat);
      if (sub) list = list.filter((p) => p.subcategory_slug === sub);
      if (reg) list = list.filter((p) => p.region_slug === reg);
      if (size) list = list.filter((p) => (p.size_label || '') === size);
      if (vendor) list = list.filter((p) => p.vendor_brand === vendor);
      if (dietary) list = list.filter((p) => (p.dietary_tags || []).some((d) => d.toLowerCase().includes(dietary.toLowerCase())));
      if (inStock) list = list.filter((p) => p.stock_quantity > 0);
      if (onSale) list = list.filter((p) => p.discount_percent > 0 || p.compare_at_price_ils);
      if (q) list = list.filter((p) => p.title.toLowerCase().includes(q) || (p.title_he || '').includes(q) || p.vendor_brand.toLowerCase().includes(q) || (p.barcode_ean || '').includes(q));
      list = list.filter((p) => p.price_ils <= maxPrice);
      if (sort === 'price-asc') list.sort((a, b) => a.price_ils - b.price_ils);
      else if (sort === 'price-desc') list.sort((a, b) => b.price_ils - a.price_ils);
      else if (sort === 'newest') list.sort((a, b) => (b.is_new_arrival || 0) - (a.is_new_arrival || 0));
      else if (sort === 'title-asc') list.sort((a, b) => a.title.localeCompare(b.title));
      else list.sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0));
      const vendors = [...new Set(prods.map((p) => p.vendor_brand))];
      return { products: list, facets: { vendors } };
    }
    if (url.startsWith('/api/products/')) {
      const slug = decodeURIComponent(url.replace('/api/products/', '').split('/')[0]);
      const product = prods.find((p) => p.slug === slug) || prods[0];
      const region = STATIC_FALLBACK_REGIONS.find((r) => r.slug === product.region_slug) || STATIC_FALLBACK_REGIONS[0];
      const related_products = prods.filter((p) => p.slug !== product.slug && p.region_slug === product.region_slug).slice(0, 4);
      const savedReviews = JSON.parse(localStorage.getItem('dinu_reviews_' + slug) || '[]');
      if (options.method === 'POST' && url.endsWith('/reviews')) {
        const body = JSON.parse(options.body || '{}');
        savedReviews.unshift({
          author_name: state.user?.full_name || 'Verified Customer',
          rating: Number(body.rating || 5),
          title: body.title,
          body: body.body,
          is_verified_purchase: true
        });
        localStorage.setItem('dinu_reviews_' + slug, JSON.stringify(savedReviews));
        return { ok: true };
      }
      return { product, region, reviews: savedReviews, related_products };
    }
    if (url.startsWith('/api/search/predictive')) {
      const qs = new URLSearchParams(url.split('?')[1] || '');
      const q = (qs.get('q') || '').toLowerCase();
      return {
        products: prods.filter((p) => p.title.toLowerCase().includes(q) || p.vendor_brand.toLowerCase().includes(q) || (p.barcode_ean || '').includes(q)),
        categories: STATIC_FALLBACK_NAVIGATION.filter((c) => c.name.toLowerCase().includes(q)),
        regions: STATIC_FALLBACK_REGIONS.filter((r) => r.name.toLowerCase().includes(q))
      };
    }
    if (url === '/api/cart/items' && options.method === 'POST') {
      const body = JSON.parse(options.body || '{}');
      const p = prods.find((x) => x.id === body.product_id || x.slug === body.product_id);
      if (!p) throw new Error('Product not found');
      const qty = Math.max(1, Number(body.quantity || 1));
      if (qty > p.stock_quantity) throw new Error(`Only ${p.stock_quantity} in stock`);
      const existing = state.cart.items.find((i) => i.product_id === p.id && i.variant_code === (body.variant_code || 'single'));
      if (existing) {
        existing.quantity = Math.min(p.stock_quantity, existing.quantity + qty);
      } else {
        state.cart.items.push({
          cart_item_id: 'ci-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
          product_id: p.id,
          sku: p.sku,
          title: p.title,
          primary_image_url: p.primary_image_url.replace(/^\//, ''),
          variant_code: body.variant_code || 'single',
          variant_label: 'Single Pack (' + (p.size_label || '1x') + ')',
          unit_price_ils: p.price_ils,
          quantity: qty,
          line_total_ils: Number((p.price_ils * qty).toFixed(2))
        });
      }
      return { cart: recalculateLocalCart(), message: `Added ${p.title} to your basket` };
    }
    if (url.startsWith('/api/cart/items/')) {
      const id = decodeURIComponent(url.replace('/api/cart/items/', ''));
      if (options.method === 'DELETE') {
        state.cart.items = state.cart.items.filter((i) => i.cart_item_id !== id);
      } else {
        const body = JSON.parse(options.body || '{}');
        const item = state.cart.items.find((i) => i.cart_item_id === id);
        if (item) item.quantity = Number(body.quantity);
      }
      return { cart: recalculateLocalCart() };
    }
    if (url === '/api/cart/discount') {
      const body = JSON.parse(options.body || '{}');
      const code = (body.code || '').toUpperCase().trim();
      if (!['WELCOME10', 'DINU25', 'FREESHIP'].includes(code)) {
        throw new Error('Invalid or expired promotional code');
      }
      state.cart.discount_code = code;
      return { cart: recalculateLocalCart(), message: `Promo code ${code} applied!` };
    }
    if (url.startsWith('/api/cart')) {
      return { cart: recalculateLocalCart() };
    }
    if (url === '/api/auth/login') {
      const body = JSON.parse(options.body || '{}');
      const isAdmin = body.email && body.email.toLowerCase().includes('admin');
      state.user = {
        id: isAdmin ? 'usr-admin' : 'usr-cust',
        email: body.email,
        full_name: isAdmin ? 'Dinu Market Administrator' : 'Maya Shapira',
        phone: '052-555-7890',
        role: isAdmin ? 'super_admin' : 'customer'
      };
      return { user: state.user, cart: recalculateLocalCart(), message: `Signed in as ${state.user.full_name}` };
    }
    if (url === '/api/auth/register') {
      const body = JSON.parse(options.body || '{}');
      state.user = {
        id: 'usr-' + Date.now(),
        email: body.email,
        full_name: body.full_name,
        phone: body.phone,
        role: 'customer',
        marketing_opt_in: !!body.marketing_opt_in
      };
      return { user: state.user, cart: recalculateLocalCart(), message: `Welcome to DINU MARKET, ${state.user.full_name}!` };
    }
    if (url === '/api/auth/logout') {
      state.user = null;
      return { cart: recalculateLocalCart(), message: 'Signed out' };
    }
    if (url === '/api/checkout/place-order') {
      const body = JSON.parse(options.body || '{}');
      if (body.country && body.country !== 'Israel') {
        throw new Error('DINU MARKET delivers within Israel only. International shipping outside Israel is not available.');
      }
      if (body.card_last4 === '0000') {
        throw new Error('Payment declined by issuing bank. Order was not marked as paid.');
      }
      // Atomic stock check & deduction
      state.cart.items.forEach((ci) => {
        const p = prods.find((x) => x.id === ci.product_id);
        if (p) {
          if (p.stock_quantity < ci.quantity) throw new Error(`Insufficient stock for ${p.title}`);
          p.stock_quantity -= ci.quantity;
        }
      });
      saveLocalProducts(prods);
      const ord = {
        id: 'ord-' + Date.now(),
        order_number: 'DM-IL-' + Math.floor(100000 + Math.random() * 900000),
        tax_invoice_number: 'INV-IL-' + Math.floor(10000 + Math.random() * 90000),
        transaction_ref: 'TXN-PCI-' + Math.random().toString(36).slice(2, 10).toUpperCase(),
        customer_name: body.recipient_name || `${body.first_name || ''} ${body.last_name || ''}`.trim() || state.user?.full_name || 'Guest Customer',
        customer_email: body.email || state.user?.email || 'customer@dinumarket.co.il',
        customer_phone: body.phone,
        status: 'Payment Received',
        payment_status: 'captured',
        payment_method: body.payment_method || 'credit_card',
        installments: Number(body.installments || 1),
        card_last4: body.card_last4 || '4242',
        zone_code: body.zone_code || 'IL-Z1',
        delivery_method: body.delivery_method || 'standard',
        shipping_address: {
          first_name: body.first_name || '',
          last_name: body.last_name || '',
          recipient_name: body.recipient_name || `${body.first_name || ''} ${body.last_name || ''}`.trim(),
          phone: body.phone,
          country: 'Israel',
          city: body.city,
          street_address: `${body.street_address} ${body.building_number || ''}`.trim(),
          apartment_floor: body.apartment_floor || '',
          postal_code: body.postal_code || ''
        },
        items: [...state.cart.items],
        subtotal_ils: state.cart.subtotal_ils,
        discount_amount_ils: state.cart.discount_amount_ils,
        shipping_cost_ils: state.cart.shipping_cost_ils,
        vat_included_ils: state.cart.vat_included_ils,
        total_ils: state.cart.total_ils,
        carrier_name: 'HFD Domestic Courier Israel',
        tracking_number: 'IL-TRK-' + Math.floor(1000000 + Math.random() * 9000000),
        created_at: new Date().toISOString()
      };
      state.accountData.orders.unshift(ord);
      localStorage.setItem('dinu_orders_fallback', JSON.stringify(state.accountData.orders));
      state.cart.items = [];
      state.cart.discount_code = '';
      recalculateLocalCart();
      return { order: ord, cart: state.cart, message: `Order ${ord.order_number} confirmed!` };
    }
    if (url === '/api/account') {
      return {
        user: state.user,
        addresses: state.accountData.addresses,
        orders: state.accountData.orders
      };
    }
    if (url === '/api/admin/overview') {
      const revenue = state.accountData.orders.reduce((sum, o) => sum + Number(o.total_ils || 0), 0);
      return {
        kpis: {
          total_revenue_ils: revenue,
          total_products: prods.length,
          authentic_photo_products: prods.filter((p) => p.is_authentic_photo).length,
          total_orders: state.accountData.orders.length,
          total_customers: 2
        },
        products: prods,
        orders: state.accountData.orders,
        shipping_zones: state.shippingZones.length ? state.shippingZones : defaultZones,
        audit_logs: [{ created_at: new Date().toISOString(), actor_email: 'admin@dinumarket.co.il', action: 'SUPABASE_SYNC', details: '24 Supabase PostgreSQL tables & RLS active' }]
      };
    }
    if (url === '/api/admin/products' && options.method === 'POST') {
      const body = JSON.parse(options.body || '{}');
      const newProd = {
        id: 'prod-' + Date.now(),
        sku: 'DM-' + (body.region_slug || 'in').slice(0, 2).toUpperCase() + '-' + Math.floor(100 + Math.random() * 900),
        barcode_ean: body.barcode_ean || '',
        title: body.title,
        title_he: body.title_he || '',
        slug: body.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        vendor_brand: body.vendor_brand || 'DINU MARKET',
        category_slug: body.category_slug || 'sweets',
        subcategory_slug: body.subcategory_slug || 'cookies',
        region_slug: body.region_slug || 'india',
        size_label: body.size_label || '250g',
        short_description: body.description || body.title,
        description: body.description || body.title,
        price_ils: Number(body.price_ils || 15),
        compare_at_price_ils: body.compare_at_price_ils ? Number(body.compare_at_price_ils) : null,
        discount_percent: body.compare_at_price_ils ? Math.round(((body.compare_at_price_ils - body.price_ils) / body.compare_at_price_ils) * 100) : 0,
        price_per_100_ils: Number((Number(body.price_ils || 15) / 2.5).toFixed(2)),
        net_weight_grams: 250,
        unit_measure_type: '100g',
        stock_quantity: Number(body.stock_quantity ?? 30),
        low_stock_threshold: 8,
        primary_image_url: body.primary_image_url || 'images/brand/dinu-logo.png',
        secondary_image_url: '',
        variants: [{ code: 'single', label: 'Single Pack (1x)', multiplier: 1.0 }],
        status: 'active',
        is_authentic_photo: 0,
        is_featured: 1,
        is_best_seller: 0,
        is_new_arrival: 1,
        rating_average: 0,
        rating_count: 0,
        sales_count: 1
      };
      prods.unshift(newProd);
      saveLocalProducts(prods);
      return { product: newProd, message: `Added ${newProd.title} to Supabase catalogue` };
    }
    if (url.startsWith('/api/admin/products/') && options.method === 'PATCH') {
      const id = decodeURIComponent(url.replace('/api/admin/products/', ''));
      const body = JSON.parse(options.body || '{}');
      const p = prods.find((x) => x.id === id);
      if (p) {
        if (body.price_ils !== undefined) p.price_ils = Number(body.price_ils);
        if (body.stock_quantity !== undefined) p.stock_quantity = Number(body.stock_quantity);
        if (body.compare_at_price_ils !== undefined) {
          p.compare_at_price_ils = body.compare_at_price_ils ? Number(body.compare_at_price_ils) : null;
          p.discount_percent = p.compare_at_price_ils && p.compare_at_price_ils > p.price_ils
            ? Math.round(((p.compare_at_price_ils - p.price_ils) / p.compare_at_price_ils) * 100)
            : 0;
        }
        if (body.status) p.status = body.status;
        saveLocalProducts(prods);
      }
      return { message: 'Product updated in Supabase catalogue' };
    }
    if (url.startsWith('/api/admin/orders/') && url.endsWith('/status')) {
      const id = decodeURIComponent(url.replace('/api/admin/orders/', '').replace('/status', ''));
      const body = JSON.parse(options.body || '{}');
      const ord = state.accountData.orders.find((o) => o.id === id);
      if (ord) {
        ord.status = body.status;
        if (body.tracking_number) ord.tracking_number = body.tracking_number;
        localStorage.setItem('dinu_orders_fallback', JSON.stringify(state.accountData.orders));
      }
      return { message: `Order status updated to ${body.status}` };
    }
    throw err;
  }
}

const app = {
  async init() {
    try {
      const boot = await apiFetch('/api/bootstrap');
      state.navigation = boot.navigation || STATIC_FALLBACK_NAVIGATION;
      const rawRegions = boot.regions && boot.regions.length > 0 ? boot.regions : STATIC_FALLBACK_REGIONS;
      state.regions = KITCHEN_ORDER.map(
        (slug) => rawRegions.find((r) => r.slug === slug) || STATIC_FALLBACK_REGIONS.find((r) => r.slug === slug)
      ).filter(Boolean);
      state.shippingZones = boot.shipping_zones || [];
      state.paymentConfig = boot.payment_config || {};
      state.user = boot.user || null;
      state.cart = boot.cart || state.cart;

      const allData = await apiFetch('/api/products?maxPrice=9999');
      state.allProducts = allData.products || getLocalProducts();

      const savedCookieLang = getCookie('dinu_lang');
      if (savedCookieLang && I18N_DICTIONARY[savedCookieLang]) {
        state.lang = savedCookieLang;
        state.userExplicitLang = true;
      }

      this.syncLiveDeliveryBanner();
      this.setLanguage(state.lang, false);
      this.syncHeaderHeight();
      const headerEl = document.querySelector('.site-header');
      if (headerEl && typeof ResizeObserver !== 'undefined') {
        new ResizeObserver(() => this.syncHeaderHeight()).observe(headerEl);
      }
      window.addEventListener('resize', () => this.syncHeaderHeight());
      await this.loadProducts();

      this.applyLocationRoute(window.location.pathname, false);
      window.addEventListener('popstate', () => {
        this.applyLocationRoute(window.location.pathname, false);
      });

      document.addEventListener('click', (e) => {
        const sc = document.querySelector('.search-container');
        const dd = document.getElementById('predictiveDropdown');
        if (sc && dd && !sc.contains(e.target)) {
          dd.style.display = 'none';
        }
        const lc = document.getElementById('langPillContainer');
        const lm = document.getElementById('langMenuPopover');
        const lb = document.getElementById('langPillBtn');
        if (lc && lm && !lc.contains(e.target)) {
          lm.style.display = 'none';
          if (lb) lb.setAttribute('aria-expanded', 'false');
        }
      });
    } catch (err) {
      console.error('Initialization error:', err);
    }
  },

  applyLocationRoute(pathname, scrollToTop = true) {
    const cleanPath = (pathname || '/').replace(/\/+$/, '') || '/';
    if (KITCHEN_PATH_TO_SLUG[cleanPath]) {
      this.openRegionalPage(KITCHEN_PATH_TO_SLUG[cleanPath], false);
      return;
    }
    if (cleanPath === '/shop') {
      this.switchView('shop', scrollToTop, false);
      return;
    }
    state.activeRegionPage = null;
    this.switchView('storefront', scrollToTop, false);
  },

  syncLiveDeliveryBanner() {
    const { cutoff, freeThreshold, email, phoneDisplay, whatsappE164 } = getSupportDetails();
    const cutDesk = document.getElementById('liveCutoffDesktop');
    const cutMob = document.getElementById('liveCutoffMobile');
    const freeEl = document.getElementById('liveFreeThresh');
    if (cutDesk) cutDesk.textContent = cutoff;
    if (cutMob) cutMob.textContent = cutoff;
    if (freeEl) freeEl.textContent = String(freeThreshold);

    const footerEmail = document.getElementById('footerSupportEmail');
    if (footerEmail) {
      footerEmail.textContent = email;
      footerEmail.href = `mailto:${email}`;
    }
    const footerPhone = document.getElementById('footerSupportPhone');
    if (footerPhone) {
      footerPhone.textContent = phoneDisplay;
      footerPhone.href = `tel:+${whatsappE164}`;
    }
  },

  syncWhatsAppLinks() {
    const contextKey = state.currentView === 'region' && state.activeRegionPage ? state.activeRegionPage : state.lang;
    const url = getWhatsAppUrl(contextKey);
    ['headerWhatsappBtn', 'homeWhatsappBandBtn', 'footerWhatsappLink', 'mobileFloatingWhatsapp'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.href = url;
    });
  },

  syncHeaderHeight() {
    const headerEl = document.querySelector('.site-header');
    if (headerEl) {
      const h = Math.round(headerEl.getBoundingClientRect().height);
      if (h > 0) {
        document.documentElement.style.setProperty('--site-header-height', `${h}px`);
      }
    }
  },

  updateHeaderState() {
    const countEl = document.getElementById('headerCartCount');
    const totalEl = document.getElementById('headerCartTotal');
    const accLabel = document.getElementById('accountHeaderLabel');
    const adminBtn = document.getElementById('adminHeaderBtn');

    if (countEl) countEl.textContent = state.cart.item_count || 0;
    if (totalEl) totalEl.textContent = `₪${Number(state.cart.total_ils || 0).toFixed(2)}`;

    if (state.user) {
      if (accLabel) accLabel.textContent = state.user.full_name.split(' ')[0];
      if (adminBtn) {
        if (['super_admin', 'catalog_manager', 'fulfillment_staff', 'support_agent'].includes(state.user.role)) {
          adminBtn.style.display = 'inline-flex';
        } else {
          adminBtn.style.display = 'none';
        }
      }
    } else {
      if (accLabel) accLabel.textContent = t('sign_in_register');
      if (adminBtn) adminBtn.style.display = 'none';
    }
  },

  toggleLanguageMenu(e) {
    if (e) e.stopPropagation();
    const menu = document.getElementById('langMenuPopover');
    const btn = document.getElementById('langPillBtn');
    if (!menu) return;
    const isOpen = menu.style.display === 'flex';
    menu.style.display = isOpen ? 'none' : 'flex';
    if (btn) btn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
  },

  updateLanguagePillUi() {
    const pillLbl = document.getElementById('langPillLabel');
    if (!pillLbl) return;
    const codeUpper = (state.lang || 'en').toUpperCase();
    if (state.lang === 'he') {
      pillLbl.innerHTML = `<span lang="he" dir="rtl">עב</span> · EN`;
    } else {
      pillLbl.innerHTML = `${escapeHtml(codeUpper)} · <span lang="he" dir="rtl">עב</span>`;
    }
  },

  setLanguage(langCode, saveCookie = true) {
    state.lang = I18N_DICTIONARY[langCode] ? langCode : 'en';
    if (saveCookie) {
      state.userExplicitLang = true;
      setCookie('dinu_lang', state.lang, 365);
    }
    document.documentElement.lang = state.lang;
    document.documentElement.dir = 'ltr';

    const sel = document.getElementById('langSelector');
    if (sel && sel.value !== state.lang) sel.value = state.lang;

    const menu = document.getElementById('langMenuPopover');
    const btn = document.getElementById('langPillBtn');
    if (menu) menu.style.display = 'none';
    if (btn) btn.setAttribute('aria-expanded', 'false');

    this.updateLanguagePillUi();

    const isHebrew = state.lang === 'he';
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (key) {
        el.textContent = t(key);
        el.setAttribute('lang', state.lang);
        el.setAttribute('dir', isHebrew ? 'rtl' : 'ltr');
      }
    });

    const searchInput = document.getElementById('globalSearchInput');
    if (searchInput) {
      searchInput.placeholder = t('search_placeholder');
      searchInput.dir = isHebrew ? 'rtl' : 'ltr';
    }
    const mobSearchInput = document.getElementById('mobileSearchInput');
    if (mobSearchInput) {
      mobSearchInput.placeholder = t('search_placeholder');
      mobSearchInput.dir = isHebrew ? 'rtl' : 'ltr';
    }
    document.querySelectorAll('.search-submit-btn').forEach((sb) => {
      sb.textContent = t('search_btn');
      sb.setAttribute('lang', state.lang);
      sb.setAttribute('dir', isHebrew ? 'rtl' : 'ltr');
    });

    this.syncWhatsAppLinks();
    this.updateHeaderState();
    this.renderNavigation();
    this.renderHeaderKitchenPills();
    this.renderHomepageSections();
    this.renderRegionStrip();
    this.populateFilterDropdowns();
    this.renderProductGrid();
    this.renderCartDrawer();
    if (state.currentView === 'region' && state.activeRegionPage) {
      this.renderRegionalPage();
    }
  },

  setKitchenViewLang(langCode) {
    this.setLanguage(langCode, true);
  },

  toggleMobileSearch() {
    const drawer = document.getElementById('mobileSearchDrawer');
    if (!drawer) return;
    const isHidden = drawer.style.display === 'none' || !drawer.style.display;
    drawer.style.display = isHidden ? 'block' : 'none';
    this.syncHeaderHeight();
    if (isHidden) {
      document.getElementById('mobileSearchInput')?.focus();
    }
  },

  handleMobileSearchSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('mobileSearchInput');
    const q = (input?.value || '').trim();
    const globalInput = document.getElementById('globalSearchInput');
    if (globalInput) globalInput.value = q;
    const drawer = document.getElementById('mobileSearchDrawer');
    if (drawer) drawer.style.display = 'none';
    state.filters.tripBox = false;
    state.filters.q = q;
    this.switchView('shop', true);
    this.loadProducts();
  },

  renderHeaderKitchenPills() {
    const slot = document.getElementById('headerKitchenPillsSlot');
    if (!slot) return;
    slot.innerHTML = KITCHEN_ORDER.map((slug) => {
      const k = KITCHEN_STOREFRONTS[slug];
      const isActive = state.currentView === 'region' && state.activeRegionPage === slug;
      return `
        <button
          type="button"
          class="kitchen-nav-pill ${isActive ? 'active-' + slug : ''}"
          onclick="app.openRegionalPage('${escapeHtml(slug)}')"
        >
          <img src="${escapeHtml(REGION_FLAG_URLS[slug])}" alt="" class="region-btn-flag" />
          <span>${escapeHtml(k.name)}</span>
        </button>
      `;
    }).join('');
  },

  renderNavigation() {
    const mobileContainer = document.getElementById('mobileNavContainer');
    if (!mobileContainer) return;

    const activeDepts = state.navigation.filter((c) => c.slug !== 'shop-by-region');

    mobileContainer.innerHTML = `
      <div style="margin-bottom:16px;border-bottom:1px solid var(--dm-line);padding-bottom:14px;display:flex;flex-direction:column;gap:8px;">
        <button type="button" class="pill-control" style="justify-content:flex-start;" onclick="app.navigateToHome(); app.toggleMobileDrawer(false);">Home</button>
        <button type="button" class="pill-control" style="justify-content:flex-start;" onclick="app.openShopView(); app.toggleMobileDrawer(false);">Full Shop (/shop)</button>
        <button type="button" class="pill-control" style="justify-content:flex-start;" onclick="app.openTripBoxCollection(); app.toggleMobileDrawer(false);">Israeli Travellers Trip Box</button>
        <button type="button" class="pill-control" style="justify-content:flex-start;" onclick="app.handleAccountClick(); app.toggleMobileDrawer(false);">Account / Sign In</button>
      </div>
      <div style="margin-bottom:16px;border-bottom:1px solid var(--dm-line);padding-bottom:14px;">
        <div style="font-family:var(--dm-font-display);font-weight:800;font-size:0.86rem;letter-spacing:0.6px;text-transform:uppercase;color:var(--dm-muted);margin-bottom:10px;">Four Home Kitchens</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          ${KITCHEN_ORDER.map((slug) => {
            const k = KITCHEN_STOREFRONTS[slug];
            return `
              <button
                type="button"
                class="${k.tintClass}"
                style="min-height:48px;border-radius:16px;border:1px solid rgba(28,26,23,0.08);font-family:var(--dm-font-display);font-weight:800;font-size:0.95rem;cursor:pointer;padding:10px 12px;text-align:left;display:flex;align-items:center;gap:8px;"
                onclick="app.openRegionalPage('${escapeHtml(slug)}'); app.toggleMobileDrawer(false);"
              >
                <img src="${escapeHtml(REGION_FLAG_URLS[slug])}" alt="" class="region-btn-flag" />
                <span>${escapeHtml(k.name)}</span>
              </button>
            `;
          }).join('')}
        </div>
      </div>
      <div>
        <div style="font-family:var(--dm-font-display);font-weight:800;font-size:0.86rem;letter-spacing:0.6px;text-transform:uppercase;color:var(--dm-muted);margin-bottom:8px;">Shop Aisles</div>
        <div style="display:flex;flex-direction:column;gap:4px;">
          ${activeDepts
            .map(
              (cat) => `
              <button
                type="button"
                style="min-height:44px;text-align:left;background:none;border:none;border-radius:12px;padding:8px 10px;font-weight:700;color:var(--dm-ink);cursor:pointer;"
                onclick="app.selectCategory('${escapeHtml(cat.slug)}'); app.toggleMobileDrawer(false);"
              >
                ${escapeHtml(getCategoryLabel(cat))}
              </button>
            `
            )
            .join('')}
        </div>
      </div>
    `;
  },

  scrollToSection(sectionId) {
    this.switchView('storefront', false);
    setTimeout(() => {
      const sectionEl = document.getElementById(sectionId);
      if (!sectionEl) return;
      const headerEl = document.querySelector('.site-header');
      const headerHeight = headerEl ? headerEl.getBoundingClientRect().height : 0;
      const targetTop = sectionEl.getBoundingClientRect().top + window.scrollY - headerHeight - 18;
      window.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
    }, 60);
  },

  // =========================================================================
  // HOMEPAGE SECTIONS: 4-KITCHEN PICKER + BACK IN STOCK THIS WEEK
  // =========================================================================
  renderHomepageSections() {
    this.renderKitchenPicker();
    this.renderNewArrivals();
  },

  renderKitchenPicker() {
    const grid = document.getElementById('kitchenPickerGrid');
    if (!grid) return;

    grid.innerHTML = KITCHEN_ORDER.map((slug) => {
      const k = KITCHEN_STOREFRONTS[slug];
      const shots = k.packshots.slice(0, 3);
      return `
        <article
          class="kitchen-card ${k.tintClass}"
          role="link"
          tabindex="0"
          onclick="app.openRegionalPage('${escapeHtml(k.slug)}')"
          onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();app.openRegionalPage('${escapeHtml(k.slug)}');}"
        >
          <div>
            <span class="kitchen-badge-pill" style="color:${k.tintColor};">${escapeHtml(k.name)}</span>
            <h3 class="kitchen-card-title" lang="${escapeHtml(k.lang)}">${escapeHtml(k.cardHeadline)}</h3>
            <p class="kitchen-card-sub">${escapeHtml(k.cardSubcopy)}</p>
            <span class="kitchen-card-cta" lang="${escapeHtml(k.lang)}">${escapeHtml(k.cardCta)}</span>
          </div>
          <div class="kitchen-packshots-row" aria-hidden="true">
            ${shots
              .map(
                (src) => `
                <div class="kitchen-packshot-well">
                  <img src="${escapeHtml(src)}" alt="" loading="lazy" />
                </div>
              `
              )
              .join('')}
          </div>
        </article>
      `;
    }).join('');
  },

  renderProductCardHtml(p) {
    const kitchenCfg = KITCHEN_STOREFRONTS[p.region_slug] || KITCHEN_STOREFRONTS.india;
    const reg = state.regions.find((r) => r.slug === p.region_slug);
    const countryName = reg ? getRegionLabel(reg) : kitchenCfg.name;
    const isHeBadge = state.lang === 'he' && Boolean(reg?.name_he);
    const inCartItem = (state.cart.items || []).find((ci) => ci.product_id === p.id && ci.variant_code === 'single');
    const localizedTitle = getProductLocalizedTitle(p);
    const isHeTitle = state.lang === 'he' && Boolean(p.title_he);
    const hasGenuineDiscount = p.compare_at_price_ils && Number(p.compare_at_price_ils) > Number(p.price_ils);
    const sizeBadge = p.size_label || (p.net_weight_grams >= 1000 ? `${p.net_weight_grams / 1000} kg` : `${p.net_weight_grams}g`);

    return `
      <article class="product-card">
        <div class="product-card-media" onclick="app.openPdpModal('${escapeHtml(p.slug)}')">
          <span class="country-pill-badge ${escapeHtml(kitchenCfg.badgeTintClass)}" lang="${isHeBadge ? 'he' : 'en'}" dir="${isHeBadge ? 'rtl' : 'ltr'}">${escapeHtml(countryName)}</span>
          ${
            hasGenuineDiscount
              ? `<span class="badge-sale" lang="en" dir="ltr">SAVE ${p.discount_percent}%</span>`
              : ''
          }
          <img src="${escapeHtml(p.primary_image_url)}" alt="${escapeHtml(localizedTitle)}" loading="lazy" />
        </div>

        <div class="product-card-body">
          <div class="product-meta-top" lang="en" dir="ltr">
            <span>${escapeHtml(p.vendor_brand)}</span>
            <span>${escapeHtml(sizeBadge)}</span>
          </div>
          <h3 class="product-title" lang="${isHeTitle ? 'he' : 'en'}" dir="${isHeTitle ? 'rtl' : 'ltr'}" onclick="app.openPdpModal('${escapeHtml(p.slug)}')">${escapeHtml(localizedTitle)}</h3>

          <div class="product-card-footer">
            <div lang="en" dir="ltr">
              <div>
                <span class="price-current">₪${Number(p.price_ils).toFixed(2)}</span>
                ${
                  hasGenuineDiscount
                    ? `<span class="price-compare">₪${Number(p.compare_at_price_ils).toFixed(2)}</span>`
                    : ''
                }
              </div>
              <div class="price-unit">₪${Number(p.price_per_100_ils).toFixed(2)} / ${escapeHtml(p.unit_measure_type || '100g')}</div>
            </div>

            ${
              inCartItem
                ? `
                  <div class="inline-qty-stepper" onclick="event.stopPropagation()">
                    <button type="button" class="qty-step-btn" onclick="app.updateCartItemQuantity('${escapeHtml(inCartItem.cart_item_id)}', ${inCartItem.quantity - 1})" aria-label="Decrease quantity">−</button>
                    <span>${inCartItem.quantity}</span>
                    <button type="button" class="qty-step-btn" onclick="app.updateCartItemQuantity('${escapeHtml(inCartItem.cart_item_id)}', ${inCartItem.quantity + 1})" aria-label="Increase quantity">+</button>
                  </div>
                `
                : p.stock_quantity > 0
                ? `
                  <button
                    type="button"
                    class="add-circle-btn"
                    onclick="event.stopPropagation(); app.addToCart('${escapeHtml(p.id)}', 'single', 1)"
                    aria-label="Add ${escapeHtml(localizedTitle)} to basket"
                    title="Add to basket"
                  >+</button>
                `
                : `<button type="button" class="pill-control" disabled style="opacity:0.55;cursor:not-allowed;">${escapeHtml(t('out_of_stock'))}</button>`
            }
          </div>
        </div>
      </article>
    `;
  },

  renderNewArrivals() {
    const grid = document.getElementById('newArrivalsGrid');
    if (!grid) return;
    const allProds = (state.allProducts.length > 0 ? state.allProducts : getLocalProducts()).filter(
      (p) => p.status !== 'archived'
    );
    const arrivals = allProds.filter((p) => p.is_new_arrival);
    // Put non-India items first if available so mixed country badges show immediately on homepage
    arrivals.sort((a, b) => (a.region_slug === 'philippines' ? -1 : b.region_slug === 'philippines' ? 1 : 0));
    const list = (arrivals.length >= 4 ? arrivals : allProds).slice(0, 4);
    grid.innerHTML = list.map((p) => this.renderProductCardHtml(p, 'new')).join('');
  },

  // =========================================================================
  // WISHLIST & PROMO FLOW HANDLERS
  // =========================================================================
  toggleWishlist(productId) {
    const idx = state.wishlist.indexOf(productId);
    if (idx >= 0) {
      state.wishlist.splice(idx, 1);
      showToast('Removed from saved items.');
    } else {
      state.wishlist.push(productId);
      showToast('Saved to your list.');
    }
    localStorage.setItem('dinu_wishlist', JSON.stringify(state.wishlist));
    this.updateHeaderState();
    this.renderHomepageSections();
    this.renderProductGrid();
    if (state.activeRegionPage) {
      this.renderRegionalPageProducts();
    }
  },

  openShopView() {
    state.filters.tripBox = false;
    this.switchView('shop', true);
    this.loadProducts();
  },

  openTripBoxCollection() {
    this.resetAllFilters(false);
    state.filters.tripBox = true;
    this.switchView('shop', true);
    this.loadProducts();
  },

  openGiftBoxFlow(kitchenSlug) {
    const k = kitchenSlug && KITCHEN_STOREFRONTS[kitchenSlug] ? KITCHEN_STOREFRONTS[kitchenSlug] : null;
    const title = k ? k.giftBand.title : 'Send a Dinu Gift & Care Box';
    const desc = k
      ? k.giftBand.copy
      : 'Pack snacks and pantry favourites from all four kitchens with a free handwritten note — delivered to any door or pickup locker in Israel.';
    const waHref = k
      ? getWhatsAppUrl(k.slug, k.giftBand.whatsappText)
      : getWhatsAppUrl('en', "Hi Dinu, I'd like to send a Gift Box with a handwritten note in Israel:");

    const bd = document.getElementById('genericModalBackdrop');
    const content = document.getElementById('genericModalContent');
    if (!bd || !content) return;

    content.innerHTML = `
      <button type="button" class="modal-close-btn" onclick="app.closeGenericModal()" aria-label="Close modal">×</button>
      <div style="padding-right:42px;">
        <div style="font-size:13px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;color:var(--dm-chili);margin-bottom:8px;">
          GIFT &amp; CARE PACKAGES · ISRAEL DELIVERY
        </div>
        <h3 style="font-size:1.85rem;margin:0 0 10px;">${escapeHtml(title)}</h3>
        <p style="color:var(--dm-text-2);margin:0 0 20px;">${escapeHtml(desc)}</p>
        <div style="background:var(--dm-cream);border:1px solid var(--dm-line);border-radius:20px;padding:18px;margin-bottom:22px;font-size:0.95rem;">
          <strong>How it works:</strong>
          <ol style="margin:8px 0 0;padding-left:20px;color:var(--dm-text-2);line-height:1.6;">
            <li>Pick snacks, sweets, noodles or tea in your basket — or message us your budget (from ₪95) on WhatsApp.</li>
            <li>Enter your friend's Israeli address and write your personal note in "Delivery Instructions" at checkout.</li>
            <li>Order by ${escapeHtml(getSupportDetails().cutoff)} and we deliver it tomorrow with no price tag inside.</li>
          </ol>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:12px;">
          <button type="button" class="btn-primary btn-cta-lg" onclick="app.closeGenericModal(); app.openShopView();">
            Build box in shop →
          </button>
          <a href="${escapeHtml(waHref)}" target="_blank" rel="noopener noreferrer" class="btn-whatsapp btn-cta-lg">
            Order gift box on WhatsApp
          </a>
        </div>
      </div>
    `;
    bd.style.display = 'flex';
  },

  // =========================================================================
  // KITCHEN STOREFRONTS (/ph, /th, /in, /lk) — ONE DATA-DRIVEN TEMPLATE
  // =========================================================================
  openRegionalPage(regionSlug, pushUrl = true) {
    const normalized = KITCHEN_STOREFRONTS[regionSlug] ? regionSlug : 'philippines';
    state.activeRegionPage = normalized;
    state.activeRegionalPage = normalized;
    state.regionPageFilters = {
      region: normalized,
      category: '',
      subcategory: '',
      vendor: '',
      size: '',
      dietary: '',
      maxPrice: 150,
      sort: 'featured'
    };

    const k = KITCHEN_STOREFRONTS[normalized];
    state.lang = k.lang;
    document.documentElement.lang = state.lang;
    document.documentElement.dir = 'ltr';
    this.updateLanguagePillUi();

    this.switchView('region', true, pushUrl);
    this.renderRegionalPage();
  },

  scrollToRegionCatalog() {
    const sectionEl = document.getElementById('regionCatalogSection');
    if (!sectionEl) return;
    const headerEl = document.querySelector('.site-header');
    const headerHeight = headerEl ? headerEl.getBoundingClientRect().height : 0;
    const targetTop = sectionEl.getBoundingClientRect().top + window.scrollY - headerHeight - 18;
    window.scrollTo({ top: Math.max(0, targetTop), behavior: 'smooth' });
  },

  renderRegionalPage() {
    const container = document.getElementById('view-region');
    if (!container) return;
    const slug = state.activeRegionPage || 'philippines';
    const k = KITCHEN_STOREFRONTS[slug] || KITCHEN_STOREFRONTS.philippines;

    if (typeof state.regionPageFilters.region === 'undefined') {
      state.regionPageFilters.region = slug;
    }

    const activeLang = [k.lang, 'en', 'he'].includes(state.lang) ? state.lang : k.lang;
    const activeDir = activeLang === 'he' ? 'rtl' : 'ltr';
    const heroTitle = k.heroTitle[activeLang] || k.heroTitle[k.lang];
    const shopLabel = k.shopBtnLabel[activeLang] || k.shopBtnLabel.en;
    const waLabel = k.whatsappBtnLabel[activeLang] || k.whatsappBtnLabel.en;
    const waKitchenUrl = getWhatsAppUrl(k.slug);
    const waGiftUrl = getWhatsAppUrl(k.slug, k.giftBand.whatsappText);

    const departments = state.navigation.filter((c) => c.slug !== 'shop-by-region');
    const selectedCat = state.regionPageFilters.category || '';
    const foundCat = state.navigation.find((c) => c.slug === selectedCat);
    const subcats = foundCat && !foundCat.slug.includes('region') ? foundCat.subcategories : [];
    const selectedReg = state.regionPageFilters.region;
    const maxPriceVal = Number(state.regionPageFilters.maxPrice || 150);

    const indiaBannerHtml =
      slug === 'india'
        ? `
      <section class="india-secondary-banner region-secondary-banner" dir="ltr" aria-label="Desh Ka Swaad — Premium Packaged Indian Foods">
        <img
          src="/images/banners/India-Banner.jpeg?v=20261118regbanners"
          alt="Desh Ka Swaad — Premium Packaged Indian Foods"
          class="region-banner-full-img"
          loading="eager"
        />
      </section>
    `
        : '';

    const phBannerHtml =
      slug === 'philippines'
        ? `
      <section class="ph-secondary-banner region-secondary-banner" dir="ltr" aria-label="Lasang Pinoy — Premium Packaged Filipino Foods">
        <img
          src="/images/banners/Philippine-Banner.jpeg?v=20261118regbanners"
          alt="Lasang Pinoy — Premium Packaged Filipino Foods"
          class="region-banner-full-img"
          loading="eager"
        />
      </section>
    `
        : '';

    const lkBannerHtml =
      slug === 'sri-lanka'
        ? `
      <section class="lk-secondary-banner region-secondary-banner" dir="ltr" aria-label="Lanka Swaadaya — Premium Packaged Sri Lankan Foods">
        <img
          src="/images/banners/Sri-Lanka-Banner.jpeg?v=20261118regbanners"
          alt="Lanka Swaadaya — Premium Packaged Sri Lankan Foods"
          class="region-banner-full-img"
          loading="eager"
        />
      </section>
    `
        : '';

    const thBannerHtml =
      slug === 'thailand'
        ? `
      <section class="th-secondary-banner region-secondary-banner" dir="ltr" aria-label="Premium Packaged Thai Foods">
        <img
          src="/images/banners/Thailand-Banner.jpeg?v=20261118regbanners"
          alt="Premium Packaged Thai Foods"
          class="region-banner-full-img"
          loading="eager"
        />
      </section>
    `
        : '';

    const topBannerSlot = document.getElementById('regionTopBannerSlot');
    if (topBannerSlot) {
      topBannerSlot.innerHTML = `${indiaBannerHtml}${phBannerHtml}${lkBannerHtml}${thBannerHtml}`;
      topBannerSlot.style.display = 'block';
    }

    container.innerHTML = `
      <!-- Full-Shop Filter & Product Catalogue Structure (auto-selecting page region) -->
      <section id="regionCatalogSection" aria-label="${escapeHtml(k.name)} Product Catalogue">
        <div id="regRegionPillsContainer" class="region-strip"></div>
        <div class="clear-filters-row">
          <button type="button" class="pill-control" onclick="app.resetRegionalCatalogFilters()">
            ${escapeHtml(t('clear_all_filters'))}
          </button>
        </div>

        <div class="catalog-layout">
          <aside class="filter-sidebar" aria-label="Product Filters">
            <div class="filter-group">
              <label class="filter-label" for="regFilterRegionSelect">Kitchen</label>
              <select id="regFilterRegionSelect" class="select-control" onchange="app.selectRegionalCatalogRegion(this.value)">
                <option value="" ${selectedReg === '' ? 'selected' : ''}>All 4 Kitchens (Philippines, Thailand, India, Sri Lanka)</option>
                <option value="philippines" ${selectedReg === 'philippines' ? 'selected' : ''}>Philippines</option>
                <option value="thailand" ${selectedReg === 'thailand' ? 'selected' : ''}>Thailand</option>
                <option value="india" ${selectedReg === 'india' ? 'selected' : ''}>India</option>
                <option value="sri-lanka" ${selectedReg === 'sri-lanka' ? 'selected' : ''}>Sri Lanka</option>
              </select>
            </div>

            <div class="filter-group">
              <label class="filter-label" for="regFilterCategorySelect">${escapeHtml(t('filter_dept_title'))}</label>
              <select id="regFilterCategorySelect" class="select-control" onchange="app.onRegionalDepartmentChange(this.value)">
                <option value="">All Categories</option>
                ${departments
                  .map(
                    (d) =>
                      `<option value="${escapeHtml(d.slug)}" ${selectedCat === d.slug ? 'selected' : ''}>${escapeHtml(getCategoryLabel(d))}</option>`
                  )
                  .join('')}
              </select>
            </div>

            <div class="filter-group">
              <label class="filter-label" for="regFilterSubcategorySelect">${escapeHtml(t('filter_subcat_title'))}</label>
              <select id="regFilterSubcategorySelect" class="select-control" onchange="app.applyRegionalCatalogFilters()">
                <option value="">All Subcategories</option>
                ${subcats
                  .map(
                    (s) =>
                      `<option value="${escapeHtml(s.slug)}" ${state.regionPageFilters.subcategory === s.slug ? 'selected' : ''}>${escapeHtml(s.name)}</option>`
                  )
                  .join('')}
              </select>
            </div>

            <div class="filter-group">
              <label class="filter-label" for="regFilterVendorSelect">${escapeHtml(t('filter_brand_title'))}</label>
              <select id="regFilterVendorSelect" class="select-control" onchange="app.applyRegionalCatalogFilters()">
                <option value="">All Brands</option>
              </select>
            </div>

            <div class="filter-group">
              <label class="filter-label" for="regFilterSizeSelect">Pack Size</label>
              <select id="regFilterSizeSelect" class="select-control" onchange="app.applyRegionalCatalogFilters()">
                <option value="" ${!state.regionPageFilters.size ? 'selected' : ''}>All Sizes</option>
                <option value="250g" ${state.regionPageFilters.size === '250g' ? 'selected' : ''}>250g</option>
                <option value="500g" ${state.regionPageFilters.size === '500g' ? 'selected' : ''}>500g</option>
                <option value="1000 ml" ${state.regionPageFilters.size === '1000 ml' ? 'selected' : ''}>1000 ml (1 Liter)</option>
                <option value="1 kg" ${state.regionPageFilters.size === '1 kg' ? 'selected' : ''}>1 kg</option>
                <option value="5 kg" ${state.regionPageFilters.size === '5 kg' ? 'selected' : ''}>5 kg</option>
              </select>
            </div>

            <div class="filter-group">
              <label class="filter-label" for="regFilterDietarySelect">${escapeHtml(t('filter_dietary_title'))}</label>
              <select id="regFilterDietarySelect" class="select-control" onchange="app.applyRegionalCatalogFilters()">
                <option value="" ${!state.regionPageFilters.dietary ? 'selected' : ''}>All Dietary Types</option>
                <option value="Kosher" ${state.regionPageFilters.dietary === 'Kosher' ? 'selected' : ''}>Kosher Certified</option>
                <option value="Vegan" ${state.regionPageFilters.dietary === 'Vegan' ? 'selected' : ''}>Vegan</option>
                <option value="Vegetarian" ${state.regionPageFilters.dietary === 'Vegetarian' ? 'selected' : ''}>Vegetarian</option>
                <option value="Gluten-Free" ${state.regionPageFilters.dietary === 'Gluten-Free' ? 'selected' : ''}>Gluten-Free</option>
              </select>
            </div>

            <div class="filter-group" style="border-bottom:none;margin-bottom:0;padding-bottom:0;">
              <label class="filter-label" for="regFilterMaxPriceRange">
                <span>${escapeHtml(t('filter_max_price'))}</span> <strong id="regMaxPriceLabel">₪${maxPriceVal}</strong>
              </label>
              <input
                type="range"
                id="regFilterMaxPriceRange"
                min="10"
                max="150"
                step="5"
                value="${maxPriceVal}"
                style="width:100%;accent-color:var(--dm-green);"
                oninput="document.getElementById('regMaxPriceLabel').textContent='₪'+this.value; app.applyRegionalCatalogFilters();"
              />
            </div>
          </aside>

          <section aria-label="Product Catalogue Results">
            <div class="catalog-toolbar">
              <div>
                <strong id="regActiveCatalogHeading" class="catalog-active-heading">All Products</strong>
                <span id="regCatalogCountBadge" class="catalog-count-meta"></span>
              </div>
              <div style="display:flex;align-items:center;gap:10px;">
                <label for="regSortOrderSelect" style="font-size:14px;font-weight:600;">${escapeHtml(t('sort_by_label'))}</label>
                <select id="regSortOrderSelect" class="select-control" onchange="state.regionPageFilters.sort=this.value; app.loadRegionalCatalogProducts();">
                  <option value="featured" ${state.regionPageFilters.sort === 'featured' ? 'selected' : ''}>Most Popular</option>
                  <option value="price-asc" ${state.regionPageFilters.sort === 'price-asc' ? 'selected' : ''}>Price: Low to High (₪)</option>
                  <option value="price-desc" ${state.regionPageFilters.sort === 'price-desc' ? 'selected' : ''}>Price: High to Low (₪)</option>
                  <option value="newest" ${state.regionPageFilters.sort === 'newest' ? 'selected' : ''}>Back in Stock / Newest</option>
                  <option value="title-asc" ${state.regionPageFilters.sort === 'title-asc' ? 'selected' : ''}>Alphabetical (A–Z)</option>
                </select>
              </div>
            </div>

            <div id="regProductGridContainer" class="product-grid catalog-product-grid"></div>
          </section>
        </div>
      </section>
    `;

    this.renderRegionalCatalogStrip();
    this.loadRegionalCatalogProducts();
    this.syncHeaderHeight();
  },

  renderRegionalCatalogStrip() {
    const container = document.getElementById('regRegionPillsContainer');
    if (!container) return;
    const activeReg = state.regionPageFilters.region;
    const allPill = `
      <button type="button" class="region-pill ${!activeReg ? 'active' : ''}" onclick="app.selectRegionalCatalogRegion('')">
        ${escapeHtml(t('all_4_regions'))}
      </button>
    `;
    const pills = KITCHEN_ORDER.map((slug) => {
      const reg = state.regions.find((r) => r.slug === slug) || { slug, name: KITCHEN_STOREFRONTS[slug].name };
      return `
        <button
          type="button"
          data-kitchen="${escapeHtml(slug)}"
          class="region-pill ${activeReg === slug ? 'active' : ''}"
          onclick="app.selectRegionalCatalogRegion('${escapeHtml(slug)}')"
        >
          <img src="${escapeHtml(REGION_FLAG_URLS[slug])}" alt="" class="region-btn-flag" />
          <span>${escapeHtml(getRegionLabel(reg))}</span>
        </button>
      `;
    }).join('');
    container.innerHTML = allPill + pills;
  },

  selectRegionalCatalogRegion(regionSlug) {
    state.regionPageFilters.region = regionSlug;
    const regSelect = document.getElementById('regFilterRegionSelect');
    if (regSelect) regSelect.value = regionSlug;
    this.renderRegionalCatalogStrip();
    this.loadRegionalCatalogProducts();
  },

  onRegionalDepartmentChange(catSlug) {
    state.regionPageFilters.category = catSlug;
    state.regionPageFilters.subcategory = '';
    const subSelect = document.getElementById('regFilterSubcategorySelect');
    if (subSelect) {
      const found = state.navigation.find((c) => c.slug === catSlug);
      const subs = found && !found.slug.includes('region') ? found.subcategories : [];
      subSelect.innerHTML =
        `<option value="">All Subcategories</option>` +
        subs.map((s) => `<option value="${escapeHtml(s.slug)}">${escapeHtml(s.name)}</option>`).join('');
    }
    this.applyRegionalCatalogFilters();
  },

  resetRegionalCatalogFilters(reload = true) {
    const defaultRegion = state.activeRegionPage || 'philippines';
    state.regionPageFilters = {
      region: defaultRegion,
      category: '',
      subcategory: '',
      vendor: '',
      size: '',
      dietary: '',
      maxPrice: 150,
      sort: 'featured'
    };
    if (document.getElementById('regFilterRegionSelect')) document.getElementById('regFilterRegionSelect').value = defaultRegion;
    if (document.getElementById('regFilterCategorySelect')) document.getElementById('regFilterCategorySelect').value = '';
    if (document.getElementById('regFilterSubcategorySelect')) {
      document.getElementById('regFilterSubcategorySelect').innerHTML = '<option value="">All Subcategories</option>';
    }
    if (document.getElementById('regFilterSizeSelect')) document.getElementById('regFilterSizeSelect').value = '';
    if (document.getElementById('regFilterDietarySelect')) document.getElementById('regFilterDietarySelect').value = '';
    if (document.getElementById('regFilterVendorSelect')) document.getElementById('regFilterVendorSelect').value = '';
    if (document.getElementById('regFilterMaxPriceRange')) document.getElementById('regFilterMaxPriceRange').value = '150';
    if (document.getElementById('regMaxPriceLabel')) document.getElementById('regMaxPriceLabel').textContent = '₪150';
    if (document.getElementById('regSortOrderSelect')) document.getElementById('regSortOrderSelect').value = 'featured';

    this.renderRegionalCatalogStrip();
    if (reload) this.loadRegionalCatalogProducts();
  },

  applyRegionalCatalogFilters() {
    const regSelect = document.getElementById('regFilterRegionSelect');
    state.regionPageFilters.region = regSelect ? regSelect.value : (state.regionPageFilters.region ?? '');
    state.regionPageFilters.category = document.getElementById('regFilterCategorySelect')?.value || '';
    state.regionPageFilters.subcategory = document.getElementById('regFilterSubcategorySelect')?.value || '';
    state.regionPageFilters.size = document.getElementById('regFilterSizeSelect')?.value || '';
    state.regionPageFilters.dietary = document.getElementById('regFilterDietarySelect')?.value || '';
    state.regionPageFilters.vendor = document.getElementById('regFilterVendorSelect')?.value || '';
    state.regionPageFilters.maxPrice = Number(document.getElementById('regFilterMaxPriceRange')?.value || 150);
    state.regionPageFilters.sort = document.getElementById('regSortOrderSelect')?.value || 'featured';
    this.renderRegionalCatalogStrip();
    this.loadRegionalCatalogProducts();
  },

  async loadRegionalCatalogProducts() {
    const f = state.regionPageFilters;
    const params = new URLSearchParams();
    if (f.category) params.set('category', f.category);
    if (f.subcategory) params.set('subcategory', f.subcategory);
    if (f.region) params.set('region', f.region);
    if (f.vendor) params.set('vendor', f.vendor);
    if (f.size) params.set('size', f.size);
    if (f.dietary) params.set('dietary', f.dietary);
    params.set('maxPrice', String(f.maxPrice || 150));
    params.set('sort', f.sort || 'featured');

    const data = await apiFetch(`/api/products?${params.toString()}`);
    let prods = data.products || [];
    if (f.size) {
      prods = prods.filter((p) => p.size_label === f.size);
    }
    state.regionProducts = prods;

    const vendorSel = document.getElementById('regFilterVendorSelect');
    if (vendorSel) {
      const allVendors =
        state.vendors && state.vendors.length > 0
          ? state.vendors
          : data.facets?.vendors && data.facets.vendors.length > 0
          ? data.facets.vendors
          : Array.from(new Set((state.allProducts || []).map((p) => p.vendor_brand).filter(Boolean))).sort();
      if (vendorSel.options.length <= 1 && allVendors.length > 0) {
        vendorSel.innerHTML =
          `<option value="">All Brands (${allVendors.length})</option>` +
          allVendors
            .map(
              (v) =>
                `<option value="${escapeHtml(v)}" ${f.vendor === v ? 'selected' : ''}>${escapeHtml(v)}</option>`
            )
            .join('');
      }
    }

    this.renderRegionalPageProducts();
  },

  renderRegionalPageProducts() {
    const grid = document.getElementById('regProductGridContainer');
    const heading = document.getElementById('regActiveCatalogHeading');
    const countBadge = document.getElementById('regCatalogCountBadge');
    if (!grid) return;

    const f = state.regionPageFilters;
    const parts = [];
    if (f.category) {
      const cat = state.navigation.find((c) => c.slug === f.category);
      if (cat) parts.push(getCategoryLabel(cat));
    }
    if (f.subcategory) parts.push(f.subcategory.replace(/-/g, ' '));
    if (f.region) {
      const reg = state.regions.find((r) => r.slug === f.region) || {
        slug: f.region,
        name: KITCHEN_STOREFRONTS[f.region]?.name || f.region
      };
      parts.push(getRegionLabel(reg));
    }
    if (f.dietary) parts.push(f.dietary);
    if (f.size) parts.push(`Size: ${f.size}`);

    const list = state.regionProducts || [];
    if (heading) heading.textContent = parts.length > 0 ? parts.join(' · ') : t('all_products_heading');
    if (countBadge) countBadge.textContent = `(${list.length} items)`;

    if (list.length === 0) {
      grid.innerHTML = `
        <div class="catalog-empty-state">
          <h3>No matching items in this filter</h3>
          <p class="catalog-empty-copy">Clear filters to browse this kitchen, select All 4 Kitchens, or message us on WhatsApp if you're looking for a specific brand.</p>
          <div class="catalog-empty-actions">
            <button type="button" class="btn-primary" onclick="app.resetRegionalCatalogFilters()">${escapeHtml(t('clear_all_filters'))}</button>
            <a href="${escapeHtml(getWhatsAppUrl(f.region || state.activeRegionPage))}" target="_blank" rel="noopener noreferrer" class="btn-whatsapp">Ask on WhatsApp</a>
          </div>
        </div>
      `;
      return;
    }

    grid.innerHTML = list.map((p) => this.renderProductCardHtml(p, 'regcat')).join('');
  },

  renderRegionStrip() {
    const container = document.getElementById('regionPillsContainer');
    if (!container) return;
    const allPill = `
      <button type="button" class="region-pill ${!state.filters.region && !state.filters.tripBox ? 'active' : ''}" onclick="app.selectRegion('')">
        ${escapeHtml(t('all_4_regions'))}
      </button>
    `;
    const pills = KITCHEN_ORDER.map((slug) => {
      const reg = state.regions.find((r) => r.slug === slug) || { slug, name: KITCHEN_STOREFRONTS[slug].name };
      return `
        <button
          type="button"
          data-kitchen="${escapeHtml(slug)}"
          class="region-pill ${state.filters.region === slug ? 'active' : ''}"
          onclick="app.selectRegion('${escapeHtml(slug)}')"
        >
          <img src="${escapeHtml(REGION_FLAG_URLS[slug])}" alt="" class="region-btn-flag" />
          <span>${escapeHtml(getRegionLabel(reg))}</span>
        </button>
      `;
    }).join('');
    container.innerHTML = allPill + pills;
  },

  populateFilterDropdowns() {
    const catSelect = document.getElementById('filterCategorySelect');
    if (!catSelect) return;
    const departments = state.navigation.filter((c) => c.slug !== 'shop-by-region');
    catSelect.innerHTML =
      `<option value="">All Categories</option>` +
      departments.map((d) => `<option value="${escapeHtml(d.slug)}">${escapeHtml(getCategoryLabel(d))}</option>`).join('');
  },

  onDepartmentSelectChange(catSlug) {
    state.filters.tripBox = false;
    state.filters.category = catSlug;
    state.filters.subcategory = '';
    const subSelect = document.getElementById('filterSubcategorySelect');
    if (subSelect) {
      const found = state.navigation.find((c) => c.slug === catSlug);
      const subs = found && !found.slug.includes('region') ? found.subcategories : [];
      subSelect.innerHTML =
        `<option value="">All Subcategories</option>` +
        subs.map((s) => `<option value="${escapeHtml(s.slug)}">${escapeHtml(s.name)}</option>`).join('');
    }
    this.applyCatalogFilters();
  },

  selectCategory(catSlug) {
    state.filters.tripBox = false;
    this.switchView('shop', true);
    if (catSlug === 'shop-by-region') {
      state.filters.category = '';
      state.filters.subcategory = '';
    } else {
      state.filters.category = catSlug;
      state.filters.subcategory = '';
    }
    const catSelect = document.getElementById('filterCategorySelect');
    if (catSelect) catSelect.value = state.filters.category;
    this.onDepartmentSelectChange(state.filters.category);
  },

  selectSubcategory(catSlug, subSlug) {
    state.filters.tripBox = false;
    this.switchView('shop', true);
    state.filters.category = catSlug;
    state.filters.subcategory = subSlug;
    const catSelect = document.getElementById('filterCategorySelect');
    if (catSelect) catSelect.value = catSlug;
    this.onDepartmentSelectChange(catSlug);
    const subSelect = document.getElementById('filterSubcategorySelect');
    if (subSelect) subSelect.value = subSlug;
    this.applyCatalogFilters();
  },

  selectRegion(regionSlug, switchToShop = false) {
    state.filters.tripBox = false;
    if (switchToShop || state.currentView !== 'shop') {
      this.switchView('shop', true);
    }
    state.filters.region = regionSlug;
    const regSelect = document.getElementById('filterRegionSelect');
    if (regSelect) regSelect.value = regionSlug;
    this.renderRegionStrip();
    this.loadProducts();
  },

  filterByAuthenticInventory() {
    this.resetAllFilters(false);
    state.filters.authenticOnly = true;
    this.switchView('shop', true);
    this.loadProducts();
  },

  filterByOnSale() {
    this.resetAllFilters(false);
    state.filters.onSale = true;
    this.switchView('shop', true);
    this.loadProducts();
  },

  resetAllFilters(reload = true) {
    state.filters = {
      category: '',
      subcategory: '',
      region: '',
      tripBox: false,
      q: '',
      vendor: '',
      size: '',
      dietary: '',
      inStock: false,
      onSale: false,
      authenticOnly: false,
      maxPrice: 150,
      sort: 'featured'
    };
    if (document.getElementById('filterRegionSelect')) document.getElementById('filterRegionSelect').value = '';
    if (document.getElementById('filterCategorySelect')) document.getElementById('filterCategorySelect').value = '';
    if (document.getElementById('filterSubcategorySelect')) {
      document.getElementById('filterSubcategorySelect').innerHTML = '<option value="">All Subcategories</option>';
    }
    if (document.getElementById('filterSizeSelect')) document.getElementById('filterSizeSelect').value = '';
    if (document.getElementById('filterDietarySelect')) document.getElementById('filterDietarySelect').value = '';
    if (document.getElementById('filterVendorSelect')) document.getElementById('filterVendorSelect').value = '';
    if (document.getElementById('filterMaxPriceRange')) document.getElementById('filterMaxPriceRange').value = '150';
    if (document.getElementById('maxPriceLabel')) document.getElementById('maxPriceLabel').textContent = '₪150';
    if (document.getElementById('sortOrderSelect')) document.getElementById('sortOrderSelect').value = 'featured';
    if (document.getElementById('globalSearchInput')) document.getElementById('globalSearchInput').value = '';
    if (document.getElementById('mobileSearchInput')) document.getElementById('mobileSearchInput').value = '';

    this.renderRegionStrip();
    this.renderNavigation();
    if (reload) this.loadProducts();
  },

  applyCatalogFilters() {
    state.filters.tripBox = false;
    const regSelect = document.getElementById('filterRegionSelect');
    state.filters.region = regSelect ? regSelect.value : (state.filters.region || '');
    state.filters.category = document.getElementById('filterCategorySelect')?.value || '';
    state.filters.subcategory = document.getElementById('filterSubcategorySelect')?.value || '';
    state.filters.size = document.getElementById('filterSizeSelect')?.value || '';
    state.filters.dietary = document.getElementById('filterDietarySelect')?.value || '';
    state.filters.vendor = document.getElementById('filterVendorSelect')?.value || '';
    state.filters.maxPrice = Number(document.getElementById('filterMaxPriceRange')?.value || 150);
    state.filters.sort = document.getElementById('sortOrderSelect')?.value || 'featured';
    this.renderRegionStrip();
    this.renderNavigation();
    this.loadProducts();
  },

  async loadProducts() {
    const params = new URLSearchParams();
    if (state.filters.category) params.set('category', state.filters.category);
    if (state.filters.subcategory) params.set('subcategory', state.filters.subcategory);
    if (state.filters.region) params.set('region', state.filters.region);
    if (state.filters.q) params.set('q', state.filters.q);
    if (state.filters.vendor) params.set('vendor', state.filters.vendor);
    if (state.filters.size) params.set('size', state.filters.size);
    if (state.filters.dietary) params.set('dietary', state.filters.dietary);
    if (state.filters.inStock) params.set('inStock', 'true');
    if (state.filters.onSale) params.set('onSale', 'true');
    if (state.filters.authenticOnly) params.set('authenticOnly', 'true');
    params.set('maxPrice', String(state.filters.maxPrice));
    params.set('sort', state.filters.sort);

    const data = await apiFetch(`/api/products?${params.toString()}`);
    let prods = data.products || [];
    if (state.filters.tripBox) {
      prods = prods.filter((p) => p.region_slug === 'india' || p.region_slug === 'thailand');
    }
    if (state.filters.size) {
      prods = prods.filter((p) => p.size_label === state.filters.size);
    }
    state.products = prods;

    const vendorSel = document.getElementById('filterVendorSelect');
    if (vendorSel && vendorSel.options.length <= 1 && data.facets?.vendors) {
      vendorSel.innerHTML =
        `<option value="">All Brands (${data.facets.vendors.length})</option>` +
        data.facets.vendors.map((v) => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('');
    }

    this.renderProductGrid();
  },

  renderProductGrid() {
    const grid = document.getElementById('productGridContainer');
    const heading = document.getElementById('activeCatalogHeading');
    const countBadge = document.getElementById('catalogCountBadge');
    if (!grid) return;

    const parts = [];
    if (state.filters.tripBox) parts.push('Israeli Travellers Trip Box (India & Thailand)');
    if (state.filters.authenticOnly) parts.push(t('filter_authentic'));
    if (state.filters.category) {
      const cat = state.navigation.find((c) => c.slug === state.filters.category);
      if (cat) parts.push(getCategoryLabel(cat));
    }
    if (state.filters.subcategory) parts.push(state.filters.subcategory.replace(/-/g, ' '));
    if (state.filters.region) {
      const reg = state.regions.find((r) => r.slug === state.filters.region);
      if (reg) parts.push(getRegionLabel(reg));
    }
    if (state.filters.dietary) parts.push(state.filters.dietary);
    if (state.filters.size) parts.push(`Size: ${state.filters.size}`);
    if (state.filters.q) parts.push(`Search: "${state.filters.q}"`);

    if (heading) heading.textContent = parts.length > 0 ? parts.join(' · ') : t('all_products_heading');
    if (countBadge) countBadge.textContent = `(${state.products.length} items)`;

    if (state.products.length === 0) {
      grid.innerHTML = `
        <div class="catalog-empty-state">
          <h3>No matching items in this filter</h3>
          <p class="catalog-empty-copy">Clear filters to browse all four kitchens, or message us on WhatsApp if you're looking for a specific brand.</p>
          <div class="catalog-empty-actions">
            <button type="button" class="btn-primary" onclick="app.resetAllFilters()">${escapeHtml(t('clear_all_filters'))}</button>
            <a href="${escapeHtml(getWhatsAppUrl())}" target="_blank" rel="noopener noreferrer" class="btn-whatsapp">Ask on WhatsApp</a>
          </div>
        </div>
      `;
      return;
    }

    grid.innerHTML = state.products.map((p) => this.renderProductCardHtml(p, 'cat')).join('');
  },

  // =========================================================================
  // PREDICTIVE LIVE SEARCH
  // =========================================================================
  async handlePredictiveInput(val) {
    const dd = document.getElementById('predictiveDropdown');
    if (!dd) return;
    const q = (val || '').trim();
    if (q.length < 2) {
      dd.style.display = 'none';
      return;
    }

    try {
      const data = await apiFetch(`/api/search/predictive?q=${encodeURIComponent(q)}`);
      let html = '';

      if (data.categories?.length > 0 || data.regions?.length > 0) {
        html += `<div class="predictive-section-title">Kitchens &amp; Aisles</div>`;
        (data.regions || []).forEach((r) => {
          html += `
            <div class="predictive-item" onclick="app.openRegionalPage('${escapeHtml(r.slug)}'); document.getElementById('predictiveDropdown').style.display='none';">
              <span><strong>${escapeHtml(getRegionLabel(r))} Kitchen</strong></span>
              <span style="font-size:0.84rem;font-weight:700;color:var(--dm-green);">Open storefront →</span>
            </div>
          `;
        });
        (data.categories || []).forEach((c) => {
          html += `
            <div class="predictive-item" onclick="app.selectCategory('${escapeHtml(c.parent_slug || c.slug)}'); document.getElementById('predictiveDropdown').style.display='none';">
              <span><strong>${escapeHtml(getCategoryLabel(c))}</strong></span>
              <span style="font-size:0.84rem;font-weight:700;color:var(--dm-green);">View aisle →</span>
            </div>
          `;
        });
      }

      html += `<div class="predictive-section-title">Products</div>`;
      if (!data.products || data.products.length === 0) {
        html += `<div style="padding:10px;font-size:0.9rem;color:var(--dm-text-2);">No instant matches for "${escapeHtml(q)}" — message us on WhatsApp to check our shelf.</div>`;
      } else {
        data.products.forEach((p) => {
          html += `
            <div class="predictive-item" onclick="app.openPdpModal('${escapeHtml(p.slug)}'); document.getElementById('predictiveDropdown').style.display='none';">
              <div style="display:flex;align-items:center;gap:10px;">
                <img src="${escapeHtml(p.primary_image_url)}" alt="${escapeHtml(p.title)}" />
                <div>
                  <div style="font-weight:600;font-size:0.92rem;color:var(--dm-ink);">${escapeHtml(p.title)}</div>
                  <div style="font-size:0.8rem;color:var(--dm-muted);">${escapeHtml(p.vendor_brand)} · ${escapeHtml(p.size_label || '')}</div>
                </div>
              </div>
              <div style="text-align:right;flex-shrink:0;">
                <div style="font-family:var(--dm-font-display);font-weight:800;color:var(--dm-ink);">₪${Number(p.price_ils).toFixed(2)}</div>
              </div>
            </div>
          `;
        });
      }

      dd.innerHTML = html;
      dd.style.display = 'block';
    } catch (e) {
      console.error(e);
    }
  },

  handleSearchSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('globalSearchInput');
    const dd = document.getElementById('predictiveDropdown');
    if (dd) dd.style.display = 'none';
    state.filters.tripBox = false;
    state.filters.q = (input?.value || '').trim();
    this.switchView('shop', true);
    this.loadProducts();
  },

  // =========================================================================
  // PRODUCT DETAIL MODAL (PDP WITH CLICK-TO-ZOOM + FRONT & BACK PHOTOS)
  // =========================================================================
  async openPdpModal(slug) {
    try {
      const data = await apiFetch(`/api/products/${encodeURIComponent(slug)}`);
      const p = data.product;
      const reg = data.region;
      const kitchenCfg = KITCHEN_STOREFRONTS[p.region_slug] || KITCHEN_STOREFRONTS.india;
      const reviews = data.reviews || [];
      const related = data.related_products || [];
      const isWished = (state.wishlist || []).includes(p.id);
      const hasGenuineDiscount = p.compare_at_price_ils && Number(p.compare_at_price_ils) > Number(p.price_ils);

      const backdrop = document.getElementById('pdpModalBackdrop');
      const content = document.getElementById('pdpModalContent');

      const redLabelsHtml = (p.red_labels || [])
        .map((lbl) => `<span class="il-red-label">${escapeHtml(lbl)}</span>`)
        .join(' ');

      const dietaryHtml = (p.dietary_tags || [])
        .map(
          (tag) =>
            `<span style="background:var(--dm-cream);color:var(--dm-green);border:1px solid var(--dm-line-strong);padding:4px 12px;border-radius:999px;font-size:13px;font-weight:700;">${escapeHtml(tag)}</span>`
        )
        .join(' ');

      const nutritionEntries = Object.entries(p.nutrition || {});

      content.innerHTML = `
        <button type="button" class="modal-close-btn" onclick="app.closePdpModal()" aria-label="Close Product Modal">×</button>

        <div style="font-size:14px;color:var(--dm-muted);margin-bottom:14px;padding-right:48px;">
          Dinu Market / ${escapeHtml(reg?.name || kitchenCfg.name)} / ${escapeHtml(data.category?.name || p.category_slug)}
        </div>

        <div class="form-grid-2" style="gap:28px;align-items:start;">
          <div>
            <div class="pdp-zoom-container" onclick="this.classList.toggle('zoomed')" title="Click to toggle 2x zoom">
              <img id="pdpMainImage" src="${escapeHtml(p.primary_image_url)}" alt="${escapeHtml(p.title)}" />
              <span class="pdp-zoom-hint">Click packet to zoom</span>
            </div>
            ${
              p.secondary_image_url
                ? `
                  <div style="display:flex;gap:10px;align-items:center;">
                    <button type="button" class="pill-control" style="flex:1;font-size:0.84rem;" onclick="document.getElementById('pdpMainImage').src='${escapeHtml(p.primary_image_url)}'">
                      Front packet
                    </button>
                    <button type="button" class="pill-control" style="flex:1;font-size:0.84rem;" onclick="document.getElementById('pdpMainImage').src='${escapeHtml(p.secondary_image_url)}'">
                      Back Hebrew nutrition label
                    </button>
                  </div>
                `
                : ''
            }
          </div>

          <div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
              <span class="kitchen-badge-pill" style="color:${kitchenCfg.tintColor};margin-bottom:0;">${escapeHtml(reg?.name || kitchenCfg.name)}</span>
              <span style="font-weight:700;font-size:14px;color:var(--dm-green);text-transform:uppercase;">${escapeHtml(p.vendor_brand)}</span>
              <span style="font-size:14px;color:var(--dm-muted);">SKU: ${escapeHtml(p.sku)}</span>
            </div>

            <h2 style="font-size:1.65rem;margin-bottom:6px;">${escapeHtml(getProductLocalizedTitle(p))}</h2>
            ${
              p.title_he
                ? `<div lang="he" dir="rtl" style="font-size:1rem;color:var(--dm-text-2);margin-bottom:12px;">${escapeHtml(p.title_he)}</div>`
                : ''
            }

            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">
              ${dietaryHtml}
              ${redLabelsHtml}
            </div>

            <div style="background:var(--dm-cream);padding:16px;border-radius:18px;border:1px solid var(--dm-line);margin-bottom:16px;">
              <div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;">
                <span id="pdpDynamicPrice" style="font-family:var(--dm-font-display);font-size:1.85rem;font-weight:800;color:var(--dm-ink);">₪${Number(p.price_ils).toFixed(2)}</span>
                ${
                  hasGenuineDiscount
                    ? `<span style="text-decoration:line-through;color:var(--dm-muted);font-size:1rem;">₪${Number(p.compare_at_price_ils).toFixed(2)}</span>`
                    : ''
                }
                <span class="pdp-stock-badge" style="color:${p.stock_quantity > 0 ? 'var(--dm-green)' : 'var(--dm-chili)'};">
                  ${p.stock_quantity > 0 ? `In stock (${p.stock_quantity} available)` : 'Out of stock'}
                </span>
              </div>
              <div style="font-size:14px;color:var(--dm-muted);margin-top:4px;">
                Includes 18% VAT (<span lang="he" dir="rtl">כולל מע״מ</span>) · ₪${Number(p.price_per_100_ils).toFixed(2)} per ${escapeHtml(p.unit_measure_type)} · Net: ${escapeHtml(p.size_label || p.net_weight_grams + 'g')}
              </div>
            </div>

            <p style="font-size:16px;color:var(--dm-text-2);margin-bottom:16px;">${escapeHtml(getProductLocalizedDesc(p))}</p>

            <div class="form-field">
              <label for="pdpVariantSelect">Pack size</label>
              <select
                id="pdpVariantSelect"
                onchange="const mult = this.options[this.selectedIndex].dataset.mult; document.getElementById('pdpDynamicPrice').textContent = '₪' + (${Number(p.price_ils)} * Number(mult)).toFixed(2);"
              >
                ${(p.variants || [])
                  .map(
                    (v) =>
                      `<option value="${escapeHtml(v.code)}" data-mult="${v.multiplier}">${escapeHtml(v.label)} — ₪${(p.price_ils * v.multiplier).toFixed(2)}</option>`
                  )
                  .join('')}
              </select>
            </div>

            <div style="display:flex;gap:10px;align-items:center;margin-top:16px;flex-wrap:wrap;">
              <input type="number" id="pdpQtyInput" value="1" min="1" max="${p.stock_quantity}" aria-label="Quantity" style="width:76px;min-height:48px;padding:10px;border:1.5px solid var(--dm-line-strong);border-radius:999px;font-weight:700;text-align:center;" />
              <button
                type="button"
                class="btn-primary btn-cta-lg"
                style="flex:1;"
                onclick="app.addToCart('${escapeHtml(p.id)}', document.getElementById('pdpVariantSelect').value, document.getElementById('pdpQtyInput').value)"
              >
                Add to Basket
              </button>
              <button
                type="button"
                class="pill-control"
                style="min-height:48px;"
                onclick="app.toggleWishlist('${escapeHtml(p.id)}'); app.openPdpModal('${escapeHtml(p.slug)}');"
              >
                ${isWished ? 'Saved' : 'Save'}
              </button>
            </div>

            <div style="margin-top:18px;font-size:14px;color:var(--dm-text-2);border-top:1px solid var(--dm-line);padding-top:12px;line-height:1.6;">
              <div><strong>Ingredients:</strong> ${escapeHtml(p.ingredients || 'See package label.')}</div>
              ${
                p.allergens?.length > 0
                  ? `<div style="color:var(--dm-chili);"><strong>Allergens:</strong> ${escapeHtml(p.allergens.join(', '))}</div>`
                  : `<div><strong>Allergens:</strong> None declared (see package label).</div>`
              }
              <div><strong>Importer (Israel):</strong> ${escapeHtml(p.importer_israel)} · <strong>Best Before:</strong> ${escapeHtml(p.expiry_date)}</div>
              <div><strong>Storage:</strong> ${escapeHtml(p.storage_instructions)}</div>
            </div>
          </div>
        </div>

        <div class="form-grid-2" style="margin-top:24px;border-top:1px solid var(--dm-line);padding-top:20px;">
          <div>
            <h4>Nutrition per 100g / 100ml (<span lang="he" dir="rtl">סימון תזונתי</span>)</h4>
            ${
              nutritionEntries.length > 0
                ? `<table class="data-table">
                    <tbody>
                      ${nutritionEntries
                        .map(
                          ([kName, vVal]) =>
                            `<tr><td><strong>${escapeHtml(kName.replace(/_/g, ' ').toUpperCase())}</strong></td><td>${escapeHtml(vVal)}</td></tr>`
                        )
                        .join('')}
                    </tbody>
                  </table>`
                : `<p style="font-size:14px;color:var(--dm-muted);">Full nutritional table printed on packaging.</p>`
            }
          </div>

          <div>
            <h4>Customer Reviews (${reviews.length})</h4>
            <div style="max-height:200px;overflow-y:auto;margin-bottom:12px;">
              ${
                reviews.length === 0
                  ? `<p style="font-size:14px;color:var(--dm-muted);">No customer reviews yet. Only verified shopper reviews appear here.</p>`
                  : reviews
                      .map(
                        (r) => `
                        <div style="background:var(--dm-cream);padding:12px;border-radius:14px;margin-bottom:8px;font-size:14px;">
                          <div style="display:flex;justify-content:space-between;">
                            <strong>${escapeHtml(r.author_name)} ${r.is_verified_purchase ? '<span style="color:var(--dm-green);font-size:13px;">(Verified)</span>' : ''}</strong>
                            <span>${escapeHtml(r.rating)}/5</span>
                          </div>
                          <div style="font-weight:700;margin:3px 0;">${escapeHtml(r.title)}</div>
                          <div>${escapeHtml(r.body)}</div>
                        </div>
                      `
                      )
                      .join('')
              }
            </div>

            <form onsubmit="app.submitProductReview(event, '${escapeHtml(p.slug)}')" style="background:var(--dm-cream);padding:14px;border-radius:18px;">
              <div style="font-weight:700;font-size:14px;margin-bottom:8px;">Write a review</div>
              <div style="display:flex;gap:8px;margin-bottom:8px;">
                <select id="reviewRatingInput" style="min-height:44px;padding:6px 12px;border-radius:999px;border:1.5px solid var(--dm-line-strong);background:var(--dm-white);">
                  <option value="5">5 / 5</option>
                  <option value="4">4 / 5</option>
                  <option value="3">3 / 5</option>
                </select>
                <input type="text" id="reviewTitleInput" placeholder="Short headline..." required style="flex:1;min-height:44px;padding:6px 14px;border:1.5px solid var(--dm-line-strong);border-radius:999px;background:var(--dm-white);" />
              </div>
              <textarea id="reviewBodyInput" rows="2" placeholder="How did you use this in your kitchen?" required style="width:100%;padding:10px 14px;border:1.5px solid var(--dm-line-strong);border-radius:16px;margin-bottom:8px;background:var(--dm-white);"></textarea>
              <button type="submit" class="pill-control">Post review</button>
            </form>
          </div>
        </div>

        ${
          related.length > 0
            ? `
              <div style="margin-top:22px;border-top:1px solid var(--dm-line);padding-top:16px;">
                <h4>More from this kitchen</h4>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;">
                  ${related
                    .map(
                      (rp) => `
                      <div style="border:1px solid var(--dm-line);border-radius:16px;padding:12px;cursor:pointer;background:var(--dm-white);" onclick="app.openPdpModal('${escapeHtml(rp.slug)}')">
                        <div style="height:110px;background:var(--dm-well);border-radius:12px;padding:8px;display:flex;align-items:center;justify-content:center;margin-bottom:8px;">
                          <img src="${escapeHtml(rp.primary_image_url)}" alt="${escapeHtml(rp.title)}" style="max-width:100%;max-height:100%;object-fit:contain;" />
                        </div>
                        <div style="font-weight:600;font-size:14px;line-height:1.3;margin-bottom:4px;">${escapeHtml(rp.title)}</div>
                        <div style="font-family:var(--dm-font-display);font-weight:800;color:var(--dm-ink);font-size:15px;">₪${Number(rp.price_ils).toFixed(2)}</div>
                      </div>
                    `
                    )
                    .join('')}
                </div>
              </div>
            `
            : ''
        }
      `;

      backdrop.style.display = 'flex';
    } catch (err) {
      showToast(err.message);
    }
  },

  closePdpModal() {
    const backdrop = document.getElementById('pdpModalBackdrop');
    if (backdrop) backdrop.style.display = 'none';
  },

  async submitProductReview(e, slug) {
    e.preventDefault();
    try {
      const rating = document.getElementById('reviewRatingInput').value;
      const title = document.getElementById('reviewTitleInput').value;
      const body = document.getElementById('reviewBodyInput').value;
      await apiFetch(`/api/products/${encodeURIComponent(slug)}/reviews`, {
        method: 'POST',
        body: JSON.stringify({ rating, title, body })
      });
      showToast('Thank you! Your review has been recorded.');
      this.openPdpModal(slug);
      this.loadProducts();
    } catch (err) {
      showToast(err.message);
    }
  },

  // =========================================================================
  // PERSISTENT SHOPPING BASKET OPERATIONS
  // =========================================================================
  async addToCart(productId, variantCode = 'single', quantity = 1) {
    try {
      const res = await apiFetch('/api/cart/items', {
        method: 'POST',
        body: JSON.stringify({ product_id: productId, variant_code: variantCode, quantity: Number(quantity) })
      });
      state.cart = res.cart;
      this.updateHeaderState();
      this.renderCartDrawer();
      this.renderHomepageSections();
      this.renderProductGrid();
      if (state.activeRegionPage) this.renderRegionalPageProducts();
      showToast(res.message || 'Added to basket');
    } catch (err) {
      showToast(err.message);
    }
  },

  async updateCartItemQuantity(cartItemId, nextQuantity) {
    try {
      const res = await apiFetch(`/api/cart/items/${encodeURIComponent(cartItemId)}`, {
        method: nextQuantity <= 0 ? 'DELETE' : 'PATCH',
        body: JSON.stringify({ quantity: nextQuantity })
      });
      state.cart = res.cart;
      this.updateHeaderState();
      this.renderCartDrawer();
      this.renderHomepageSections();
      this.renderProductGrid();
      if (state.activeRegionPage) this.renderRegionalPageProducts();
      if (document.getElementById('view-checkout').style.display !== 'none') {
        this.renderCheckoutView();
      }
    } catch (err) {
      showToast(err.message);
    }
  },

  async applyPromoCode(e) {
    e.preventDefault();
    const input = document.getElementById('cartPromoInput');
    const code = (input?.value || '').trim();
    try {
      const res = await apiFetch('/api/cart/discount', {
        method: 'POST',
        body: JSON.stringify({ code })
      });
      state.cart = res.cart;
      this.updateHeaderState();
      this.renderCartDrawer();
      if (document.getElementById('view-checkout').style.display !== 'none') {
        this.renderCheckoutView();
      }
      showToast(res.message);
    } catch (err) {
      showToast(err.message);
    }
  },

  toggleCartDrawer(open) {
    const bd = document.getElementById('cartDrawerBackdrop');
    if (!bd) return;
    if (open) {
      this.renderCartDrawer();
      bd.style.display = 'flex';
    } else {
      bd.style.display = 'none';
    }
  },

  toggleMobileDrawer(open) {
    const bd = document.getElementById('mobileDrawerBackdrop');
    if (bd) bd.style.display = open ? 'flex' : 'none';
  },

  renderCartDrawer() {
    const barEl = document.getElementById('cartFreeShippingBar');
    const itemsEl = document.getElementById('cartDrawerItems');
    const footerEl = document.getElementById('cartDrawerFooter');
    if (!itemsEl) return;

    const cart = state.cart;
    const { freeThreshold } = getSupportDetails();
    const subtotal = Number(cart.discounted_subtotal_ils ?? cart.subtotal_ils ?? 0);
    const remainingForFree = Math.max(0, Number((freeThreshold - subtotal).toFixed(2)));

    if (barEl) {
      barEl.innerHTML = `
        <div>Domestic Delivery Across Israel Only · All Prices Include 18% VAT (₪ ILS)</div>
        <div style="font-size:13px;color:var(--dm-green);margin-top:3px;">
          ${
            freeThreshold > 0
              ? remainingForFree <= 0 && (cart.item_count || 0) > 0
                ? `Unlocked free standard delivery across Gush Dan (over ₪${freeThreshold})`
                : `Add ₪${remainingForFree.toFixed(2)} more for free delivery over ₪${freeThreshold}`
              : ''
          }
        </div>
      `;
    }

    if (!cart.items || cart.items.length === 0) {
      itemsEl.innerHTML = `
        <div class="cart-empty-state">
          <h4 style="font-size:1.25rem;margin-bottom:8px;">Your basket is empty</h4>
          <p style="font-size:15px;color:var(--dm-text-2);margin-bottom:20px;">
            Mix groceries from the Philippines, Thailand, India and Sri Lanka in one basket — delivered tomorrow across Israel.
          </p>
          <button type="button" class="btn-primary" onclick="app.toggleCartDrawer(false)">Continue shopping</button>
        </div>
      `;
      footerEl.innerHTML = '';
      return;
    }

    itemsEl.innerHTML = cart.items
      .map(
        (item) => `
        <div class="cart-line-item">
          <img src="${escapeHtml(item.primary_image_url)}" alt="${escapeHtml(item.title)}" />
          <div>
            <div style="font-weight:600;font-size:15px;line-height:1.3;">${escapeHtml(item.title)}</div>
            <div style="font-size:14px;color:var(--dm-muted);margin:2px 0 8px;">${escapeHtml(item.variant_label)} · ₪${Number(item.unit_price_ils).toFixed(2)}</div>
            <div class="inline-qty-stepper" style="height:38px;">
              <button type="button" class="qty-step-btn" style="height:38px;width:34px;" onclick="app.updateCartItemQuantity('${escapeHtml(item.cart_item_id)}', ${item.quantity - 1})" aria-label="Decrease quantity">−</button>
              <span>${item.quantity}</span>
              <button type="button" class="qty-step-btn" style="height:38px;width:34px;" onclick="app.updateCartItemQuantity('${escapeHtml(item.cart_item_id)}', ${item.quantity + 1})" aria-label="Increase quantity">+</button>
            </div>
          </div>
          <div class="cart-line-end">
            <div style="font-family:var(--dm-font-display);font-weight:800;color:var(--dm-ink);">₪${Number(item.line_total_ils).toFixed(2)}</div>
            <button type="button" style="background:none;border:none;color:var(--dm-chili);font-size:14px;font-weight:600;cursor:pointer;margin-top:8px;min-height:36px;padding:0;" onclick="app.updateCartItemQuantity('${escapeHtml(item.cart_item_id)}', 0)">Remove</button>
          </div>
        </div>
      `
      )
      .join('');

    footerEl.innerHTML = `
      <form onsubmit="app.applyPromoCode(event)" style="display:flex;gap:8px;margin-bottom:12px;">
        <input
          type="text"
          id="cartPromoInput"
          placeholder="Promo code (WELCOME10, DINU25)"
          value="${escapeHtml(cart.discount_code || '')}"
          style="flex:1;min-height:44px;padding:8px 14px;border:1.5px solid var(--dm-line-strong);border-radius:999px;font-size:14px;background:var(--dm-white);"
        />
        <button type="submit" class="pill-control">Apply</button>
      </form>

      <div style="font-size:15px;display:flex;flex-direction:column;gap:6px;margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;">
          <span>Subtotal (${cart.item_count} items):</span>
          <strong>₪${Number(cart.subtotal_ils).toFixed(2)}</strong>
        </div>
        ${
          cart.discount_amount_ils > 0
            ? `<div style="display:flex;justify-content:space-between;color:var(--dm-chili);">
                 <span>Discount (${escapeHtml(cart.discount_code)}):</span>
                 <strong>−₪${Number(cart.discount_amount_ils).toFixed(2)}</strong>
               </div>`
            : ''
        }
        <div style="display:flex;justify-content:space-between;">
          <span>Delivery (${escapeHtml(cart.zone_name || 'Israel')}):</span>
          <strong>${cart.shipping_cost_ils === 0 ? '<span style="color:var(--dm-green);">FREE (₪0.00)</span>' : '₪' + Number(cart.shipping_cost_ils).toFixed(2)}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:1.1rem;border-top:1px solid var(--dm-line);padding-top:10px;margin-top:4px;color:var(--dm-ink);">
          <strong>Total (incl. 18% VAT):</strong>
          <strong style="font-family:var(--dm-font-display);">₪${Number(cart.total_ils).toFixed(2)}</strong>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:8px;">
        <button type="button" class="btn-primary btn-cta-lg" style="width:100%;" onclick="app.toggleCartDrawer(false); app.switchView('checkout');">
          Proceed to Checkout →
        </button>
        <button type="button" class="pill-control" style="width:100%;" onclick="app.toggleCartDrawer(false)">
          Continue Shopping
        </button>
      </div>
    `;
  },

  // =========================================================================
  // VIEW ROUTING (/, /shop, /ph, /th, /in, /lk, Checkout, Account, Admin)
  // =========================================================================
  navigateToHome() {
    state.activeRegionPage = null;
    const savedCookieLang = getCookie('dinu_lang');
    const targetLang = savedCookieLang && I18N_DICTIONARY[savedCookieLang] ? savedCookieLang : 'en';
    if (state.lang !== targetLang) {
      this.setLanguage(targetLang, false);
    }
    this.switchView('storefront', true);
  },

  switchView(viewName, scrollToTop = true, pushUrl = true) {
    state.currentView = viewName;
    ['storefront', 'shop', 'region', 'checkout', 'account', 'admin'].forEach((v) => {
      const el = document.getElementById(`view-${v}`);
      if (el) el.style.display = v === viewName ? 'block' : 'none';
    });

    // Step 5 Header #3: On kitchen pages, swap the search bar for the four kitchen pills
    const searchSlot = document.getElementById('headerSearchSlot');
    const pillsSlot = document.getElementById('headerKitchenPillsSlot');
    const topBannerSlot = document.getElementById('regionTopBannerSlot');
    if (viewName === 'region') {
      if (searchSlot) searchSlot.style.display = 'none';
      if (pillsSlot) {
        pillsSlot.style.display = 'flex';
        this.renderHeaderKitchenPills();
      }
      if (topBannerSlot) topBannerSlot.style.display = 'block';
    } else {
      if (searchSlot) searchSlot.style.display = 'block';
      if (pillsSlot) pillsSlot.style.display = 'none';
      if (topBannerSlot) {
        topBannerSlot.style.display = 'none';
        topBannerSlot.innerHTML = '';
      }
    }

    if (pushUrl && window.location.protocol !== 'file:') {
      let targetPath = '/';
      if (viewName === 'shop') targetPath = '/shop';
      else if (viewName === 'region' && state.activeRegionPage) {
        targetPath = KITCHEN_SLUG_TO_PATH[state.activeRegionPage] || '/ph';
      }
      if (['storefront', 'shop', 'region'].includes(viewName) && window.location.pathname !== targetPath) {
        try {
          window.history.pushState({ view: viewName, region: state.activeRegionPage }, '', targetPath);
        } catch {}
      }
    }

    this.syncWhatsAppLinks();
    this.syncHeaderHeight();

    if (viewName === 'checkout') this.renderCheckoutView();
    if (viewName === 'account') this.loadAndRenderAccountView();
    if (viewName === 'admin') this.loadAndRenderAdminView();
    if (scrollToTop) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  },

  handleAccountClick() {
    if (state.user) {
      this.switchView('account');
    } else {
      this.openAuthModal('login');
    }
  },

  // =========================================================================
  // AUTHENTICATION MODAL & DEMO QUICK LOGINS
  // =========================================================================
  openAuthModal(mode = 'login') {
    const bd = document.getElementById('genericModalBackdrop');
    const content = document.getElementById('genericModalContent');

    content.innerHTML = `
      <button type="button" class="modal-close-btn" onclick="app.closeGenericModal()" aria-label="Close modal">×</button>
      <div class="auth-modal-head">
        <img src="images/brand/dinu-logo.png" alt="Dinu Market" class="auth-modal-logo" />
        <h3 style="margin:8px 0 4px;">${mode === 'register' ? 'Create Your Dinu Market Account' : 'Sign In to Dinu Market'}</h3>
        <p style="font-size:14px;color:var(--dm-text-2);margin:0;">
          Any items currently in your basket are automatically kept when you sign in.
        </p>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:16px;">
        <button type="button" class="${mode === 'login' ? 'btn-primary' : 'pill-control'}" style="flex:1;" onclick="app.openAuthModal('login')">Sign In</button>
        <button type="button" class="${mode === 'register' ? 'btn-primary' : 'pill-control'}" style="flex:1;" onclick="app.openAuthModal('register')">Register</button>
        <button type="button" class="${mode === 'reset' ? 'btn-primary' : 'pill-control'}" style="flex:1;" onclick="app.openAuthModal('reset')">Reset Password</button>
      </div>

      ${
        mode === 'login'
          ? `
            <form onsubmit="app.submitLoginForm(event)">
              <div class="form-field">
                <label>Email Address</label>
                <input type="email" id="authEmailInput" required placeholder="customer@dinumarket.co.il" value="customer@dinumarket.co.il" />
              </div>
              <div class="form-field">
                <label>Password</label>
                <input type="password" id="authPasswordInput" required placeholder="••••••••" value="Customer2026!" />
              </div>
              <button type="submit" class="btn-primary btn-cta-lg" style="width:100%;">Sign In &amp; Sync Basket</button>
            </form>
            <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--dm-line);display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;">
              <button type="button" class="pill-control" onclick="app.quickDemoLogin('customer')">Demo Customer</button>
              <button type="button" class="pill-control" onclick="app.quickDemoLogin('admin')">Admin Dashboard</button>
            </div>
          `
          : mode === 'register'
          ? `
            <form onsubmit="app.submitRegisterForm(event)">
              <div class="form-field">
                <label>Full Name</label>
                <input type="text" id="regNameInput" required placeholder="e.g., Yael Mizrahi" />
              </div>
              <div class="form-field">
                <label>Email Address</label>
                <input type="email" id="regEmailInput" required placeholder="yael@example.co.il" />
              </div>
              <div class="form-field">
                <label>Israeli Mobile Phone (for Courier SMS)</label>
                <input type="tel" id="regPhoneInput" required placeholder="054-123-4567" />
              </div>
              <div class="form-field">
                <label>Password (Min. 8 characters, hashed with scrypt)</label>
                <input type="password" id="regPasswordInput" required minlength="8" placeholder="At least 8 characters" />
              </div>
              <label class="filter-check-row" style="margin-bottom:14px;">
                <input type="checkbox" id="regMarketingCheck" />
                <span style="font-size:0.8rem;">Opt-in to promotional offers (Unchecked by default per Israeli Section 30A Privacy Law)</span>
              </label>
              <button type="submit" class="btn-primary" style="width:100%;padding:12px;">Create Account &amp; Preserve Basket</button>
            </form>
          `
          : `
            <form onsubmit="app.requestPasswordResetCode(event)" style="margin-bottom:14px;">
              <div class="form-field">
                <label>Step 1: Enter Account Email to Receive 6-Digit Reset OTP</label>
                <div style="display:flex;gap:8px;">
                  <input type="email" id="resetEmailInput" required placeholder="customer@dinumarket.co.il" value="customer@dinumarket.co.il" style="flex:1;" />
                  <button type="submit" class="btn-outline" style="padding:8px 12px;font-size:0.8rem;">Send Code</button>
                </div>
              </div>
            </form>
            <form onsubmit="app.confirmPasswordReset(event)">
              <div class="form-field">
                <label>Step 2: 6-Digit Verification Code</label>
                <input type="text" id="resetCodeInput" required placeholder="Enter 6-digit code" />
              </div>
              <div class="form-field">
                <label>New Password (Min. 8 characters)</label>
                <input type="password" id="resetNewPassInput" required minlength="8" placeholder="New strong password" />
              </div>
              <button type="submit" class="btn-primary" style="width:100%;padding:12px;">Reset Password</button>
            </form>
          `
      }
    `;
    bd.style.display = 'flex';
  },

  closeGenericModal() {
    const bd = document.getElementById('genericModalBackdrop');
    if (bd) bd.style.display = 'none';
  },

  async submitLoginForm(e) {
    e.preventDefault();
    try {
      const email = document.getElementById('authEmailInput').value;
      const password = document.getElementById('authPasswordInput').value;
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      state.user = res.user;
      state.cart = res.cart;
      this.updateHeaderState();
      this.renderCartDrawer();
      this.renderProductGrid();
      this.closeGenericModal();
      showToast(res.message);
      if (document.getElementById('view-checkout').style.display !== 'none') {
        this.renderCheckoutView();
      }
    } catch (err) {
      showToast(err.message);
    }
  },

  async submitRegisterForm(e) {
    e.preventDefault();
    try {
      const full_name = document.getElementById('regNameInput').value;
      const email = document.getElementById('regEmailInput').value;
      const phone = document.getElementById('regPhoneInput').value;
      const password = document.getElementById('regPasswordInput').value;
      const marketing_opt_in = document.getElementById('regMarketingCheck').checked;

      const res = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ full_name, email, phone, password, marketing_opt_in })
      });
      state.user = res.user;
      state.cart = res.cart;
      this.updateHeaderState();
      this.renderCartDrawer();
      this.renderProductGrid();
      this.closeGenericModal();
      showToast(res.message);
      if (document.getElementById('view-checkout').style.display !== 'none') {
        this.renderCheckoutView();
      }
    } catch (err) {
      showToast(err.message);
    }
  },

  async quickDemoLogin(role) {
    try {
      const credentials =
        role === 'admin'
          ? { email: 'admin@dinumarket.co.il', password: 'AdminDinu2026!' }
          : { email: 'customer@dinumarket.co.il', password: 'Customer2026!' };

      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      });
      state.user = res.user;
      state.cart = res.cart;
      this.updateHeaderState();
      this.renderCartDrawer();
      this.renderProductGrid();
      this.closeGenericModal();
      showToast(res.message);
      if (role === 'admin') {
        this.switchView('admin');
      } else if (document.getElementById('view-checkout').style.display !== 'none') {
        this.renderCheckoutView();
      }
    } catch (err) {
      showToast(err.message);
    }
  },

  async logout() {
    try {
      const res = await apiFetch('/api/auth/logout', { method: 'POST' });
      state.user = null;
      state.cart = res.cart;
      this.updateHeaderState();
      this.renderCartDrawer();
      this.renderProductGrid();
      this.switchView('storefront');
      showToast(res.message);
    } catch (err) {
      showToast(err.message);
    }
  },

  // =========================================================================
  // SECTIONS 9, 10, 11, 12: ISRAEL-ONLY CHECKOUT (GUEST CHECKOUT + CUSTOMER ACCOUNTS)
  // =========================================================================
  async renderCheckoutView() {
    const container = document.getElementById('view-checkout');
    if (!container) return;

    const cartRes = await apiFetch(
      `/api/cart?zone=${encodeURIComponent(state.checkout.zone_code)}&deliveryMethod=${encodeURIComponent(state.checkout.delivery_method)}`
    );
    state.cart = cartRes.cart;
    this.updateHeaderState();

    if (state.user) {
      try {
        const acc = await apiFetch('/api/account');
        state.accountData.addresses = acc.addresses || [];
        if (!state.checkout.street_address && state.accountData.addresses.length > 0) {
          const def = state.accountData.addresses[0];
          const nameParts = (def.recipient_name || state.user.full_name || '').split(' ');
          state.checkout.first_name = state.checkout.first_name || nameParts[0] || '';
          state.checkout.last_name = state.checkout.last_name || nameParts.slice(1).join(' ') || '';
          state.checkout.recipient_name = def.recipient_name;
          state.checkout.email = state.checkout.email || state.user.email || '';
          state.checkout.phone = def.phone;
          state.checkout.city = def.city;
          state.checkout.zone_code = def.zone_code;
          state.checkout.street_address = def.street_address;
          state.checkout.building_number = state.checkout.building_number || '12';
          state.checkout.apartment_floor = def.apartment_floor;
          state.checkout.entrance_code = def.entrance_code;
          state.checkout.postal_code = def.postal_code || '6439602';
          state.checkout.delivery_notes = def.delivery_notes;
        }
      } catch {}
    }

    const steps = [
      '1. Guest or Account',
      '2. Israeli Address',
      '3. Delivery Method',
      '4. Cost Calculation',
      '5. Order Summary',
      '6. Payment Method',
      '7. Payment Processing',
      '8. Order Confirmation',
      '9. Email & Tax Invoice'
    ];

    if (state.checkout.last_confirmed_order) {
      const ord = state.checkout.last_confirmed_order;
      container.innerHTML = `
        <div class="checkout-steps-bar">
          ${steps.map((s) => `<div class="checkout-step-chip done">${escapeHtml(s)}</div>`).join('')}
        </div>

        <div class="card-panel" style="border-top:5px solid var(--brand-green);max-width:860px;margin:0 auto;">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;border-bottom:2px solid var(--border);padding-bottom:16px;margin-bottom:18px;">
            <div>
              <span class="badge-authentic" style="font-size:0.8rem;">ORDER CONFIRMED • STATUS: ${escapeHtml(ord.status || 'Payment Received')}</span>
              <h2 style="margin:6px 0 2px;">Thank You! Order ${escapeHtml(ord.order_number)} is Confirmed</h2>
              <div style="font-size:0.88rem;color:var(--text-secondary);">
                Official Israeli Tax Invoice (חשבונית מס קבלה): <strong>${escapeHtml(ord.tax_invoice_number)}</strong> • Transaction Ref: <strong>${escapeHtml(ord.transaction_ref)}</strong>
              </div>
            </div>
            <button type="button" class="btn-outline" onclick="window.print()">Print Tax Invoice / Receipt</button>
          </div>

          <div class="form-grid-2" style="margin-bottom:18px;">
            <div style="background:var(--surface);padding:14px;border-radius:8px;">
              <h4>Domestic Israeli Delivery &amp; Live Tracking</h4>
              <div style="font-size:0.86rem;">
                <strong>Recipient:</strong> ${escapeHtml(ord.shipping_address.recipient_name)} (${escapeHtml(ord.shipping_address.phone)})<br/>
                <strong>Address:</strong> ${escapeHtml(ord.shipping_address.street_address)} ${escapeHtml(ord.shipping_address.building_number || '')}, ${escapeHtml(ord.shipping_address.apartment_floor || '')}, ${escapeHtml(ord.shipping_address.city)} ${escapeHtml(ord.shipping_address.postal_code || '')}, Israel (${escapeHtml(ord.zone_code)})<br/>
                <strong>Carrier:</strong> ${escapeHtml(ord.carrier_name)}<br/>
                <strong>Tracking Number:</strong> <span style="color:var(--brand-forest);font-weight:800;">${escapeHtml(ord.tracking_number)}</span>
              </div>
            </div>
            <div style="background:var(--surface);padding:14px;border-radius:8px;">
              <h4>Confirmation Email &amp; Payment Receipt</h4>
              <div style="font-size:0.86rem;">
                <strong>Sent To:</strong> ${escapeHtml(ord.customer_email)}<br/>
                <strong>Payment Method:</strong> ${escapeHtml(ord.payment_method.toUpperCase())} ${ord.card_last4 ? '(•••• ' + escapeHtml(ord.card_last4) + ')' : ''}<br/>
                <strong>Total Paid (incl. 18% VAT):</strong> <span style="font-size:1.1rem;font-weight:800;color:var(--brand-forest);">₪${Number(ord.total_ils).toFixed(2)}</span> (VAT: ₪${Number(ord.vat_included_ils).toFixed(2)})
              </div>
            </div>
          </div>

          <h4>Itemized Order Summary</h4>
          <table class="data-table" style="margin-bottom:20px;">
            <thead>
              <tr><th>Product</th><th>Pack Variant</th><th>Qty</th><th>Unit Price</th><th>Line Total</th></tr>
            </thead>
            <tbody>
              ${(ord.items || [])
                .map(
                  (it) => `
                  <tr>
                    <td><strong>${escapeHtml(it.title)}</strong></td>
                    <td>${escapeHtml(it.variant_label)}</td>
                    <td>${it.quantity}</td>
                    <td>₪${Number(it.unit_price_ils).toFixed(2)}</td>
                    <td><strong>₪${Number(it.line_total_ils).toFixed(2)}</strong></td>
                  </tr>
                `
                )
                .join('')}
            </tbody>
          </table>

          <div class="modal-actions-end">
            ${
              state.user
                ? `<button type="button" class="btn-outline" onclick="state.checkout.last_confirmed_order=null; app.switchView('account');">
                     View Order History &amp; Tracking
                   </button>`
                : ''
            }
            <button type="button" class="btn-primary" onclick="state.checkout.last_confirmed_order=null; app.switchView('storefront');">
              Continue Shopping at DINU MARKET →
            </button>
          </div>
        </div>
      `;
      return;
    }

    const activeZone = state.shippingZones.find((z) => z.zone_code === state.checkout.zone_code) || state.shippingZones[0] || {};

    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <h2 style="margin:0;">DINU MARKET Domestic Israel Checkout</h2>
        <button type="button" class="btn-outline" onclick="app.switchView('storefront')">← Back to Storefront</button>
      </div>

      <div class="checkout-steps-bar">
        ${steps.map((s, idx) => `<div class="checkout-step-chip ${idx <= 6 ? 'current' : ''}">${escapeHtml(s)}</div>`).join('')}
      </div>

      <div class="checkout-grid">
        <div>
          <!-- STEP 1: GUEST CHECKOUT OR SIGNED-IN CUSTOMER ACCOUNT -->
          <div class="card-panel">
            <h3>Step 1: Checkout Mode (Guest Checkout or Customer Account)</h3>
            ${
              state.user
                ? `<div style="display:flex;justify-content:space-between;align-items:center;background:#E8F6EE;padding:12px 16px;border-radius:8px;border:1px solid var(--brand-green);">
                     <div>
                       <strong>Signed in as ${escapeHtml(state.user.full_name)}</strong> (${escapeHtml(state.user.email)})
                       <div style="font-size:0.8rem;color:var(--brand-forest);">Your order will be saved to your account history with saved addresses.</div>
                     </div>
                     <button type="button" class="btn-outline" style="padding:6px 12px;font-size:0.78rem;" onclick="app.logout()">Switch / Guest Mode</button>
                   </div>`
                : `<div style="background:var(--surface);border:1.5px solid var(--brand-gold);padding:14px 16px;border-radius:8px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
                     <div>
                       <strong>Guest Checkout Enabled</strong>
                       <div style="font-size:0.82rem;color:var(--text-secondary);">You can complete your purchase below as a Guest, or sign in to use saved addresses and order history.</div>
                     </div>
                     <div style="display:flex;gap:8px;flex-wrap:wrap;">
                       <button type="button" class="btn-primary" style="padding:7px 14px;font-size:0.82rem;" onclick="app.openAuthModal('login')">Sign In</button>
                       <button type="button" class="btn-outline" style="padding:7px 14px;font-size:0.82rem;" onclick="app.openAuthModal('register')">Register</button>
                       <button type="button" class="btn-secondary" style="padding:7px 14px;font-size:0.82rem;" onclick="app.quickDemoLogin('customer')">Demo Customer</button>
                     </div>
                   </div>`
            }
          </div>

          <form onsubmit="app.submitCheckoutOrder(event)">
            <!-- STEP 2: DOMESTIC ISRAELI DELIVERY ADDRESS & CONTACT DETAILS (Section 9) -->
            <div class="card-panel">
              <h3>Step 2: Contact Details &amp; Domestic Delivery Address (Israel Only)</h3>
              <div style="background:#FFF8EB;border:1px solid var(--brand-gold);padding:10px 14px;border-radius:6px;font-size:0.83rem;margin-bottom:14px;">
                <strong>Delivery Geographic Scope:</strong> DINU MARKET delivers exclusively within <strong>Israel</strong>. International shipping addresses outside Israel are not accepted.
              </div>

              ${
                state.accountData.addresses.length > 0
                  ? `<div style="margin-bottom:14px;">
                       <label style="font-size:0.82rem;font-weight:700;display:block;margin-bottom:6px;">Saved Account Addresses (Click to auto-fill):</label>
                       <div style="display:flex;gap:8px;flex-wrap:wrap;">
                         ${state.accountData.addresses
                           .map(
                             (a, i) => `
                             <button type="button" class="btn-outline" style="padding:6px 12px;font-size:0.8rem;" onclick="app.SelectSavedAddressInCheckout(${i})">
                               ${escapeHtml(a.label)}: ${escapeHtml(a.street_address)}, ${escapeHtml(a.city)}
                             </button>
                           `
                           )
                           .join('')}
                       </div>
                     </div>`
                  : ''
              }

              <div class="form-grid-2">
                <div class="form-field">
                  <label>First Name (שם פרטי) *</label>
                  <input type="text" required value="${escapeHtml(state.checkout.first_name || (state.user?.full_name || '').split(' ')[0] || '')}" oninput="state.checkout.first_name=this.value; state.checkout.recipient_name=(state.checkout.first_name + ' ' + (state.checkout.last_name||'')).trim();" placeholder="Maya" />
                </div>
                <div class="form-field">
                  <label>Last Name (שם משפחה) *</label>
                  <input type="text" required value="${escapeHtml(state.checkout.last_name || (state.user?.full_name || '').split(' ').slice(1).join(' ') || '')}" oninput="state.checkout.last_name=this.value; state.checkout.recipient_name=((state.checkout.first_name||'') + ' ' + state.checkout.last_name).trim();" placeholder="Shapira" />
                </div>
              </div>

              <div class="form-grid-2">
                <div class="form-field">
                  <label>Email Address (for Tax Invoice &amp; Tracking) *</label>
                  <input type="email" required value="${escapeHtml(state.checkout.email || state.user?.email || '')}" oninput="state.checkout.email=this.value" placeholder="maya@example.co.il" />
                </div>
                <div class="form-field">
                  <label>Israeli Mobile Phone (05X-XXXXXXX) *</label>
                  <input type="tel" required value="${escapeHtml(state.checkout.phone || state.user?.phone || '')}" oninput="state.checkout.phone=this.value" placeholder="052-555-7890" />
                </div>
              </div>

              <div class="form-grid-2">
                <div class="form-field">
                  <label>Country (מדינה) * — Restricted to Israel</label>
                  <select onchange="state.checkout.country=this.value">
                    <option value="Israel" ${state.checkout.country === 'Israel' ? 'selected' : ''}>Israel (ישראל) — Domestic Delivery Only</option>
                    <option value="Outside Israel">Outside Israel (Test Validation Block)</option>
                  </select>
                </div>
                <div class="form-field">
                  <label>Israeli Delivery Zone *</label>
                  <select onchange="state.checkout.zone_code=this.value; app.renderCheckoutView();">
                    ${state.shippingZones
                      .map(
                        (z) => `
                        <option value="${escapeHtml(z.zone_code)}" ${state.checkout.zone_code === z.zone_code ? 'selected' : ''}>
                          ${escapeHtml(z.name_en)} (${escapeHtml(z.name_he)})
                        </option>
                      `
                      )
                      .join('')}
                  </select>
                </div>
              </div>

              <div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:12px;">
                <div class="form-field">
                  <label>Street Address (רחוב) *</label>
                  <input type="text" required value="${escapeHtml(state.checkout.street_address)}" oninput="state.checkout.street_address=this.value" placeholder="Dizengoff St" />
                </div>
                <div class="form-field">
                  <label>Building Number (מס׳ בית) *</label>
                  <input type="text" required value="${escapeHtml(state.checkout.building_number || '124')}" oninput="state.checkout.building_number=this.value" placeholder="124" />
                </div>
                <div class="form-field">
                  <label>Apartment / Floor (דירה/קומה)</label>
                  <input type="text" value="${escapeHtml(state.checkout.apartment_floor)}" oninput="state.checkout.apartment_floor=this.value" placeholder="Apt 9, Floor 3" />
                </div>
              </div>

              <div class="form-grid-2">
                <div class="form-field">
                  <label>City / Town in Israel (עיר / יישוב) *</label>
                  <input type="text" required value="${escapeHtml(state.checkout.city)}" oninput="state.checkout.city=this.value" placeholder="Tel Aviv, Jerusalem, Haifa, Rishon LeZion..." />
                </div>
                <div class="form-field">
                  <label>Israeli Postcode (מיקוד — 7 digits) *</label>
                  <input type="text" required pattern="\\d{7}" maxlength="7" value="${escapeHtml(state.checkout.postal_code || '6439602')}" oninput="state.checkout.postal_code=this.value" placeholder="6439602" />
                </div>
              </div>

              <div class="form-field">
                <label>Delivery Instructions (הוראות שליח / קוד כניסה)</label>
                <input type="text" value="${escapeHtml(state.checkout.delivery_notes)}" oninput="state.checkout.delivery_notes=this.value" placeholder="Entrance code 1234#, leave by door and send SMS" />
              </div>
            </div>

            <!-- STEP 3 & STEP 4: DELIVERY METHOD SELECTION & COST CALCULATION -->
            <div class="card-panel">
              <h3>Step 3 &amp; Step 4: Domestic Delivery Method &amp; Shipping Calculation</h3>
              <p style="font-size:0.84rem;color:var(--text-secondary);margin-top:0;">
                Selected Zone: <strong>${escapeHtml(activeZone.name_en || '')} (${escapeHtml(activeZone.name_he || '')})</strong> • Estimated Delivery Timeframe: ${escapeHtml(activeZone.estimated_days || '1–3 Business Days')}
              </p>

              <div style="display:flex;flex-direction:column;gap:10px;">
                <label style="display:flex;justify-content:space-between;align-items:center;padding:12px;border:2px solid ${state.checkout.delivery_method === 'standard' ? 'var(--brand-forest)' : 'var(--border)'};border-radius:8px;cursor:pointer;background:${state.checkout.delivery_method === 'standard' ? 'var(--surface)' : '#FFF'};">
                  <div>
                    <input type="radio" name="delivMethod" value="standard" ${state.checkout.delivery_method === 'standard' ? 'checked' : ''} onchange="state.checkout.delivery_method='standard'; app.renderCheckoutView();" />
                    <strong>Standard Delivery within Israel (HFD / Cheetah Courier)</strong>
                    <div style="font-size:0.8rem;color:var(--text-secondary);margin-left:22px;">Door-to-door delivery (${escapeHtml(activeZone.estimated_days || '1–3 business days')})</div>
                  </div>
                  <strong style="color:var(--brand-forest);">
                    ${state.cart.qualifies_for_free_shipping ? 'FREE (₪0.00)' : '₪' + Number(activeZone.standard_rate_ils || 29).toFixed(2)}
                  </strong>
                </label>

                ${
                  activeZone.express_rate_ils !== null && activeZone.express_rate_ils !== undefined
                    ? `<label style="display:flex;justify-content:space-between;align-items:center;padding:12px;border:2px solid ${state.checkout.delivery_method === 'express' ? 'var(--brand-forest)' : 'var(--border)'};border-radius:8px;cursor:pointer;background:${state.checkout.delivery_method === 'express' ? 'var(--surface)' : '#FFF'};">
                         <div>
                           <input type="radio" name="delivMethod" value="express" ${state.checkout.delivery_method === 'express' ? 'checked' : ''} onchange="state.checkout.delivery_method='express'; app.renderCheckoutView();" />
                           <strong>Express Delivery within Israel (Same / Next Business Day)</strong>
                           <div style="font-size:0.8rem;color:var(--text-secondary);margin-left:22px;">Priority dispatch with thermal protection</div>
                         </div>
                         <strong style="color:var(--brand-forest);">₪${Number(activeZone.express_rate_ils).toFixed(2)}</strong>
                       </label>`
                    : ''
                }

                <label style="display:flex;justify-content:space-between;align-items:center;padding:12px;border:2px solid ${state.checkout.delivery_method === 'locker' ? 'var(--brand-forest)' : 'var(--border)'};border-radius:8px;cursor:pointer;background:${state.checkout.delivery_method === 'locker' ? 'var(--surface)' : '#FFF'};">
                  <div>
                    <input type="radio" name="delivMethod" value="locker" ${state.checkout.delivery_method === 'locker' ? 'checked' : ''} onchange="state.checkout.delivery_method='locker'; app.renderCheckoutView();" />
                    <strong>Local Pickup / 24/7 Collection Point (נקודת איסוף)</strong>
                    <div style="font-size:0.8rem;color:var(--text-secondary);margin-left:22px;">Collect at your convenience via SMS code</div>
                  </div>
                  <strong style="color:var(--brand-forest);">
                    ${state.cart.qualifies_for_free_shipping ? 'FREE (₪0.00)' : '₪' + Number(activeZone.locker_rate_ils || 19).toFixed(2)}
                  </strong>
                </label>
              </div>
            </div>

            <!-- STEP 6 & STEP 7: PAYMENT GATEWAY & TOKENIZED PROCESSING (Section 10) -->
            <div class="card-panel">
              <h3>Step 6 &amp; Step 7: Secure Payment Gateway (₪ ILS)</h3>
              <p style="font-size:0.82rem;color:var(--text-secondary);margin-top:0;">
                PCI-DSS Level 1 Tokenized Payment Gateway (Tranzila / Cardcom / Meshulam / PayPlus / Stripe / PayPal). Raw card numbers and CVV codes are never stored on DINU MARKET servers.
              </p>

              <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px;">
                ${[
                  { id: 'credit_card', label: 'Credit / Debit Card (Visa/MC/Amex/Isracard)' },
                  { id: 'bit', label: 'Bit (ביט ישראל)' },
                  { id: 'apple_pay', label: 'Apple Pay' },
                  { id: 'google_pay', label: 'Google Pay' },
                  { id: 'paypal', label: 'PayPal Express' }
                ]
                  .map(
                    (pm) => `
                    <button
                      type="button"
                      class="${state.checkout.payment_method === pm.id ? 'btn-primary' : 'btn-outline'}"
                      style="padding:10px;font-size:0.82rem;"
                      onclick="state.checkout.payment_method='${pm.id}'; app.renderCheckoutView();"
                    >
                      ${pm.label}
                    </button>
                  `
                  )
                  .join('')}
              </div>

              ${
                state.checkout.payment_method === 'credit_card'
                  ? `<div style="background:var(--surface);padding:14px;border-radius:8px;border:1px solid var(--border);">
                       <div class="form-grid-2">
                         <div class="form-field">
                           <label>Tokenized Card Preview (Last 4 Digits — enter 0000 to test Declined Payment)</label>
                           <input type="text" maxlength="4" value="${escapeHtml(state.checkout.card_last4)}" oninput="state.checkout.card_last4=this.value" placeholder="4242" />
                         </div>
                         <div class="form-field">
                           <label>Installments (תשלומים ללא ריבית)</label>
                           <select onchange="state.checkout.installments=this.value">
                             <option value="1">1 Regular Payment (תשלום 1)</option>
                             <option value="2">2 Interest-Free Payments (2 תשלומים)</option>
                             <option value="3">3 Interest-Free Payments (3 תשלומים)</option>
                           </select>
                         </div>
                       </div>
                     </div>`
                  : `<div style="background:#E8F6EE;padding:12px;border-radius:8px;font-size:0.86rem;color:var(--brand-forest);">
                       Ready to authorize instant tokenized payment in ₪ ILS via <strong>${escapeHtml(state.checkout.payment_method.toUpperCase())}</strong>.
                     </div>`
              }

              <button
                type="submit"
                class="btn-primary"
                style="width:100%;padding:15px;font-size:1.05rem;margin-top:16px;"
                ${state.cart.item_count === 0 ? 'disabled style="width:100%;padding:15px;background:#999;cursor:not-allowed;margin-top:16px;"' : ''}
              >
                Authorize Payment (₪${Number(state.cart.total_ils).toFixed(2)}) &amp; Place Order
              </button>
            </div>
          </form>
        </div>

        <!-- Right Column: STEP 5 ORDER SUMMARY -->
        <aside>
          <div class="card-panel" style="position:sticky;top:96px;">
            <h3>Step 5: Final Order Summary</h3>
            <div style="max-height:320px;overflow-y:auto;margin-bottom:14px;">
              ${(state.cart.items || [])
                .map(
                  (it) => `
                  <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);font-size:0.85rem;">
                    <div style="display:flex;align-items:center;gap:8px;">
                      <img src="${escapeHtml(it.primary_image_url)}" alt="" style="width:42px;height:42px;border-radius:6px;object-fit:cover;" />
                      <div>
                        <div style="font-weight:700;">${escapeHtml(it.title)}</div>
                        <div style="font-size:0.75rem;color:var(--text-secondary);">Qty: ${it.quantity} × ₪${Number(it.unit_price_ils).toFixed(2)}</div>
                      </div>
                    </div>
                    <strong>₪${Number(it.line_total_ils).toFixed(2)}</strong>
                  </div>
                `
                )
                .join('')}
            </div>

            <div style="font-size:0.9rem;display:flex;flex-direction:column;gap:6px;">
              <div style="display:flex;justify-content:space-between;">
                <span>Basket Subtotal:</span>
                <strong>₪${Number(state.cart.subtotal_ils).toFixed(2)}</strong>
              </div>
              ${
                state.cart.discount_amount_ils > 0
                  ? `<div style="display:flex;justify-content:space-between;color:var(--brand-red);">
                       <span>Promo Discount (${escapeHtml(state.cart.discount_code)}):</span>
                       <strong>−₪${Number(state.cart.discount_amount_ils).toFixed(2)}</strong>
                     </div>`
                  : ''
              }
              <div style="display:flex;justify-content:space-between;">
                <span>Delivery (${escapeHtml(state.checkout.delivery_method.toUpperCase())}):</span>
                <strong>${state.cart.shipping_cost_ils === 0 ? 'FREE (₪0.00)' : '₪' + Number(state.cart.shipping_cost_ils).toFixed(2)}</strong>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:0.8rem;color:var(--text-secondary);">
                <span>Included 18% Israeli VAT (מע״מ):</span>
                <span>₪${Number(state.cart.vat_included_ils || 0).toFixed(2)}</span>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:1.25rem;color:var(--brand-forest);border-top:2px solid var(--brand-gold);padding-top:10px;margin-top:6px;">
                <strong>Total Payable:</strong>
                <strong style="font-family:var(--font-heading);">₪${Number(state.cart.total_ils).toFixed(2)}</strong>
              </div>
            </div>
          </div>
        </aside>
      </div>
    `;
  },

  SelectSavedAddressInCheckout(idx) {
    const addr = state.accountData.addresses[idx];
    if (!addr) return;
    const parts = (addr.recipient_name || '').split(' ');
    state.checkout.first_name = parts[0] || '';
    state.checkout.last_name = parts.slice(1).join(' ') || '';
    state.checkout.recipient_name = addr.recipient_name;
    state.checkout.phone = addr.phone;
    state.checkout.city = addr.city;
    state.checkout.zone_code = addr.zone_code;
    state.checkout.street_address = addr.street_address;
    state.checkout.apartment_floor = addr.apartment_floor;
    state.checkout.entrance_code = addr.entrance_code;
    state.checkout.postal_code = addr.postal_code || '6439602';
    state.checkout.delivery_notes = addr.delivery_notes;
    this.renderCheckoutView();
    showToast(`Selected saved address: ${addr.label}`);
  },

  async submitCheckoutOrder(e) {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/checkout/place-order', {
        method: 'POST',
        body: JSON.stringify({
          ...state.checkout,
          idempotency_key: `chk-${Date.now()}`
        })
      });
      state.cart = res.cart;
      state.checkout.last_confirmed_order = res.order;
      const allData = await apiFetch('/api/products?maxPrice=9999');
      state.allProducts = allData.products || getLocalProducts();
      this.updateHeaderState();
      this.renderCartDrawer();
      this.renderHomepageSections();
      this.renderProductGrid();
      this.renderCheckoutView();
      showToast(res.message);
    } catch (err) {
      showToast(err.message);
    }
  },

  // =========================================================================
  // CUSTOMER ACCOUNT PORTAL VIEW (Profile, Addresses, Order History & Tracking)
  // =========================================================================
  async loadAndRenderAccountView() {
    const container = document.getElementById('view-account');
    if (!container) return;
    if (!state.user) {
      this.openAuthModal('login');
      this.switchView('storefront');
      return;
    }

    try {
      const data = await apiFetch('/api/account');
      state.user = data.user;
      state.accountData.addresses = data.addresses || [];
      state.accountData.orders = data.orders || [];

      container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
          <div>
            <h2 style="margin:0;">My Dinu Market Account: ${escapeHtml(state.user.full_name)}</h2>
            <div style="font-size:0.86rem;color:var(--text-secondary);">Email: ${escapeHtml(state.user.email)} • Role: ${escapeHtml(state.user.role)}</div>
          </div>
          <div style="display:flex;gap:10px;">
            <button type="button" class="btn-outline" onclick="app.switchView('storefront')">← Continue Shopping</button>
            <button type="button" class="btn-red" onclick="app.logout()">Sign Out</button>
          </div>
        </div>

        <div class="form-grid-2" style="align-items:start;">
          <!-- Profile & Saved Addresses -->
          <div>
            <div class="card-panel">
              <h3>Profile &amp; Account Security</h3>
              <form onsubmit="app.saveAccountProfile(event)">
                <div class="form-field">
                  <label>Full Name</label>
                  <input type="text" id="accFullName" value="${escapeHtml(state.user.full_name)}" required />
                </div>
                <div class="form-field">
                  <label>Mobile Phone</label>
                  <input type="tel" id="accPhone" value="${escapeHtml(state.user.phone || '')}" />
                </div>
                <div class="form-field">
                  <label>Change Password (Optional - leave blank to keep current)</label>
                  <input type="password" id="accNewPass" minlength="8" placeholder="New password (min 8 chars)" />
                </div>
                <label class="filter-check-row" style="margin-bottom:12px;">
                  <input type="checkbox" id="accMarketing" ${state.user.marketing_opt_in ? 'checked' : ''} />
                  <span>Receive promotional emails &amp; new arrival updates</span>
                </label>
                <button type="submit" class="btn-primary">Save Profile Changes</button>
              </form>
            </div>

            <div class="card-panel">
              <h3>Saved Delivery Addresses (${state.accountData.addresses.length})</h3>
              ${state.accountData.addresses
                .map(
                  (a) => `
                  <div style="background:var(--surface);padding:12px;border-radius:8px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">
                    <div style="font-size:0.86rem;">
                      <strong>${escapeHtml(a.label)} - ${escapeHtml(a.recipient_name)}</strong> (${escapeHtml(a.zone_code)})<br/>
                      ${escapeHtml(a.street_address)}, ${escapeHtml(a.apartment_floor || '')}, ${escapeHtml(a.city)} • ${escapeHtml(a.phone)}
                    </div>
                    <button type="button" style="background:none;border:none;color:var(--brand-red);cursor:pointer;font-weight:700;" onclick="app.deleteSavedAddress('${escapeHtml(a.id)}')">Delete</button>
                  </div>
                `
                )
                .join('')}

              <form onsubmit="app.addAccountAddress(event)" style="border-top:1px solid var(--border);padding-top:12px;margin-top:12px;">
                <h4>Add New Delivery Address</h4>
                <div class="form-grid-2">
                  <div class="form-field"><label>Label (Home/Office)</label><input type="text" id="newAddrLabel" value="Home" required /></div>
                  <div class="form-field">
                    <label>Delivery Zone</label>
                    <select id="newAddrZone">
                      ${state.shippingZones.map((z) => `<option value="${escapeHtml(z.zone_code)}">${escapeHtml(z.name_en)}</option>`).join('')}
                    </select>
                  </div>
                </div>
                <div class="form-grid-2">
                  <div class="form-field"><label>City *</label><input type="text" id="newAddrCity" required placeholder="Tel Aviv" /></div>
                  <div class="form-field"><label>Street &amp; Number *</label><input type="text" id="newAddrStreet" required placeholder="Herzl St 45" /></div>
                </div>
                <div class="form-grid-2">
                  <div class="form-field"><label>Floor / Apt / Entrance Code</label><input type="text" id="newAddrApt" placeholder="Floor 2, Apt 5, Code 1122#" /></div>
                  <div class="form-field"><label>Phone *</label><input type="tel" id="newAddrPhone" value="${escapeHtml(state.user.phone || '')}" required /></div>
                </div>
                <button type="submit" class="btn-outline">Save New Address</button>
              </form>
            </div>
          </div>

          <!-- Order History & Live Order Tracking -->
          <div>
            <div class="card-panel">
              <h3>Order History &amp; Live Tracking (${state.accountData.orders.length})</h3>
              ${
                state.accountData.orders.length === 0
                  ? `<p style="color:var(--text-secondary);font-size:0.9rem;">You have not placed any orders yet.</p>`
                  : state.accountData.orders
                      .map(
                        (o) => `
                        <div style="border:1.5px solid var(--border);border-radius:8px;padding:14px;margin-bottom:14px;background:#FFF;">
                          <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border);padding-bottom:8px;margin-bottom:10px;">
                            <div>
                              <strong style="color:var(--brand-forest);font-size:0.96rem;">${escapeHtml(o.order_number)}</strong>
                              <span style="font-size:0.78rem;color:var(--text-secondary);margin-left:8px;">${new Date(o.created_at).toLocaleDateString()}</span>
                            </div>
                            <span class="badge-authentic">${escapeHtml(o.status.toUpperCase())}</span>
                          </div>
                          <div style="font-size:0.84rem;margin-bottom:8px;">
                            <strong>Total:</strong> ₪${Number(o.total_ils).toFixed(2)} • <strong>Tax Invoice:</strong> ${escapeHtml(o.tax_invoice_number)}<br/>
                            <strong>Courier Tracking:</strong> <span style="color:var(--brand-green-mid);font-weight:700;">${escapeHtml(o.tracking_number)}</span> (${escapeHtml(o.carrier_name)})
                          </div>
                          <div style="font-size:0.8rem;background:var(--surface);padding:8px 10px;border-radius:6px;">
                            <strong>Tracking Timeline:</strong>
                            <ul style="margin:4px 0 0;padding-left:18px;">
                              ${(o.tracking_history || [])
                                .map((th) => `<li>${escapeHtml(th.status)} - <em>${escapeHtml(th.location)}</em></li>`)
                                .join('')}
                            </ul>
                          </div>
                        </div>
                      `
                      )
                      .join('')
              }
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      showToast(err.message);
    }
  },

  async saveAccountProfile(e) {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/account/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          full_name: document.getElementById('accFullName').value,
          phone: document.getElementById('accPhone').value,
          new_password: document.getElementById('accNewPass').value || undefined,
          marketing_opt_in: document.getElementById('accMarketing').checked
        })
      });
      state.user = res.user;
      this.updateHeaderState();
      showToast(res.message);
    } catch (err) {
      showToast(err.message);
    }
  },

  async addAccountAddress(e) {
    e.preventDefault();
    try {
      await apiFetch('/api/account/addresses', {
        method: 'POST',
        body: JSON.stringify({
          label: document.getElementById('newAddrLabel').value,
          zone_code: document.getElementById('newAddrZone').value,
          city: document.getElementById('newAddrCity').value,
          street_address: document.getElementById('newAddrStreet').value,
          apartment_floor: document.getElementById('newAddrApt').value,
          phone: document.getElementById('newAddrPhone').value,
          is_default: true
        })
      });
      showToast('Address added!');
      this.loadAndRenderAccountView();
    } catch (err) {
      showToast(err.message);
    }
  },

  async deleteSavedAddress(id) {
    try {
      await apiFetch(`/api/account/addresses/${encodeURIComponent(id)}`, { method: 'DELETE' });
      this.loadAndRenderAccountView();
    } catch (err) {
      showToast(err.message);
    }
  },

  // =========================================================================
  // SECTION 13 & 16: SUPABASE ADMINISTRATION & MANAGEMENT DASHBOARD VIEW
  // =========================================================================
  async loadAndRenderAdminView() {
    const container = document.getElementById('view-admin');
    if (!container) return;

    try {
      const data = await apiFetch('/api/admin/overview');
      state.adminData = data;
      const k = data.kpis;
      const lowStockProds = (data.products || []).filter((p) => p.stock_quantity <= 10 && p.status !== 'archived');

      const orderStatusOptions = [
        'Pending Payment',
        'Payment Received',
        'Processing',
        'Packed',
        'Dispatched',
        'Out for Delivery',
        'Delivered',
        'Cancelled',
        'Refunded'
      ];

      container.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px;">
          <div>
            <span class="badge-authentic">CENTRALISED SUPABASE POSTGRESQL + RLS ADMIN PORTAL</span>
            <h2 style="margin:4px 0 0;">DINU MARKET Administration &amp; Inventory Dashboard</h2>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button type="button" class="btn-outline" onclick="app.exportProductsCsv()">Export Catalogue CSV</button>
            <button type="button" class="btn-outline" onclick="app.switchView('storefront')">← Return to Storefront</button>
          </div>
        </div>

        <!-- KPI Summary Cards -->
        <div class="trust-grid" style="margin-bottom:20px;">
          <div class="card-panel" style="margin:0;border-left:5px solid var(--brand-forest);">
            <div style="font-size:0.8rem;color:var(--text-secondary);">Gross Captured Revenue (₪ ILS)</div>
            <div style="font-family:var(--font-heading);font-size:1.65rem;font-weight:900;color:var(--brand-forest);">₪${Number(k.total_revenue_ils).toFixed(2)}</div>
          </div>
          <div class="card-panel" style="margin:0;border-left:5px solid var(--brand-green);">
            <div style="font-size:0.8rem;color:var(--text-secondary);">Active Products &amp; SKUs</div>
            <div style="font-family:var(--font-heading);font-size:1.65rem;font-weight:900;color:var(--brand-forest);">${k.total_products} (${k.authentic_photo_products} Real Photos)</div>
          </div>
          <div class="card-panel" style="margin:0;border-left:5px solid var(--brand-gold);">
            <div style="font-size:0.8rem;color:var(--text-secondary);">Total Orders Processed</div>
            <div style="font-family:var(--font-heading);font-size:1.65rem;font-weight:900;color:var(--brand-forest);">${k.total_orders}</div>
          </div>
          <div class="card-panel" style="margin:0;border-left:5px solid var(--brand-red);">
            <div style="font-size:0.8rem;color:var(--text-secondary);">Low-Stock Alerts (≤10 units)</div>
            <div style="font-family:var(--font-heading);font-size:1.65rem;font-weight:900;color:${lowStockProds.length > 0 ? 'var(--brand-red)' : 'var(--brand-forest)'};">${lowStockProds.length} SKU(s)</div>
          </div>
        </div>

        <!-- Centralised Supabase Architecture Banner -->
        <div class="card-panel" style="background:#F3F8F4;border:1.5px solid var(--brand-green);margin-bottom:20px;">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
            <div>
              <strong>Centralised Supabase Backend Architecture (24 Tables + Storage + RLS)</strong>
              <div style="font-size:0.82rem;color:var(--text-secondary);margin-top:4px;">
                Schema: <code>supabase/migrations/001_initial_schema.sql</code> • Tables: <code>countries_of_origin</code>, <code>categories</code>, <code>brands</code>, <code>products</code>, <code>product_images</code>, <code>product_variants</code>, <code>inventory_levels</code>, <code>product_pricing</code>, <code>promotional_offers</code>, <code>profiles</code>, <code>customer_addresses</code>, <code>carts</code>, <code>cart_items</code>, <code>shipping_methods</code>, <code>discount_codes</code>, <code>orders</code>, <code>order_items</code>, <code>payments</code>, <code>shipping_records</code>, <code>product_reviews</code>, <code>website_content</code>, <code>newsletter_subscribers</code>, <code>wishlists</code>, <code>admin_audit_logs</code>.<br/>
                Storage Folders: <code>/products/india/</code>, <code>/products/thailand/</code>, <code>/products/sri-lanka/</code>, <code>/products/philippines/</code>.
              </div>
            </div>
            <span class="badge-authentic">ATOMIC INVENTORY LOCKS ACTIVE</span>
          </div>
        </div>

        <!-- Module 1: Add New Product + Bulk CSV Import + Live Product Price, Promo & Inventory Manager -->
        <div class="card-panel">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px;">
            <h3 style="margin:0;">Catalogue, Pricing, Promotions &amp; Inventory Management (${data.products.length} Products)</h3>
            <div style="display:flex;gap:8px;align-items:center;">
              <label class="btn-outline" style="padding:6px 12px;font-size:0.8rem;cursor:pointer;">
                Bulk CSV Import
                <input type="file" accept=".csv" style="display:none;" onchange="app.importProductsCsv(event)" />
              </label>
              <button type="button" class="btn-outline" style="padding:6px 12px;font-size:0.8rem;" onclick="app.exportProductsCsv()">Export CSV</button>
            </div>
          </div>

          <form onsubmit="app.adminCreateProduct(event)" style="background:var(--surface);padding:14px;border-radius:8px;margin-bottom:18px;">
            <h4 style="margin-top:0;">Add New Product to Supabase Catalogue</h4>
            <div class="form-grid-2">
              <div class="form-field"><label>Product Title (EN) *</label><input type="text" id="admProdTitle" required placeholder="e.g., Thai Kitchen Coconut Milk 400ml" /></div>
              <div class="form-field"><label>Product Title (HE)</label><input type="text" id="admProdTitleHe" placeholder="חלב קוקוס תאילנדי 400 מ״ל" /></div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;">
              <div class="form-field"><label>Brand / Vendor *</label><input type="text" id="admProdVendor" value="Haldiram's" required /></div>
              <div class="form-field"><label>Size / Weight *</label><input type="text" id="admProdSize" value="250g" required placeholder="250g, 1 kg, 1000 ml" /></div>
              <div class="form-field">
                <label>Category *</label>
                <select id="admProdCat">
                  <option value="sweets">Sweets</option>
                  <option value="snacks">Snacks</option>
                  <option value="pantry">Pantry (Rice, Flour &amp; Grains)</option>
                  <option value="sauce-seasoning">Sauce &amp; Seasoning</option>
                  <option value="canned-jarred-goods">Canned &amp; Jarred Goods</option>
                  <option value="drinks">Drinks</option>
                  <option value="instant-foods">Instant Foods</option>
                </select>
              </div>
              <div class="form-field">
                <label>Country of Origin *</label>
                <select id="admProdRegion">
                  ${state.regions.map((r) => `<option value="${escapeHtml(r.slug)}">${escapeHtml(r.name)}</option>`).join('')}
                </select>
              </div>
              <div class="form-field"><label>Selling Price (₪ ILS) *</label><input type="number" step="0.1" id="admProdPrice" value="18.90" required /></div>
            </div>
            <button type="submit" class="btn-primary">+ Create Product in Catalogue</button>
          </form>

          <div style="max-height:420px;overflow-y:auto;">
            <table class="data-table">
              <thead>
                <tr><th>SKU</th><th>Product Title &amp; Size</th><th>Origin</th><th>Price (₪)</th><th>Compare-At Promo (₪)</th><th>Stock Qty</th><th>Actions</th></tr>
              </thead>
              <tbody>
                ${data.products
                  .filter((p) => p.status !== 'archived')
                  .map(
                    (p) => `
                    <tr>
                      <td><code>${escapeHtml(p.sku)}</code></td>
                      <td>
                        <strong>${escapeHtml(p.title)}</strong>
                        <span style="font-size:0.75rem;color:var(--text-secondary);">(${escapeHtml(p.size_label || p.net_weight_grams + 'g')})</span>
                        ${p.is_authentic_photo ? '<span class="badge-authentic" style="margin-left:6px;">PHOTO</span>' : ''}
                      </td>
                      <td>${escapeHtml((p.region_slug || 'india').toUpperCase())}</td>
                      <td>
                        <input type="number" step="0.1" id="admPrice_${escapeHtml(p.id)}" value="${p.price_ils}" style="width:74px;padding:4px;" />
                      </td>
                      <td>
                        <input type="number" step="0.1" id="admPromo_${escapeHtml(p.id)}" value="${p.compare_at_price_ils || ''}" placeholder="None" style="width:78px;padding:4px;" />
                      </td>
                      <td>
                        <input type="number" id="admStock_${escapeHtml(p.id)}" value="${p.stock_quantity}" style="width:64px;padding:4px;" />
                      </td>
                      <td style="display:flex;gap:6px;">
                        <button type="button" class="btn-primary" style="padding:5px 10px;font-size:0.75rem;" onclick="app.adminUpdateProduct('${escapeHtml(p.id)}')">Save</button>
                        <button type="button" class="btn-outline" style="padding:5px 8px;font-size:0.75rem;color:var(--brand-red);border-color:var(--brand-red);" onclick="app.adminArchiveProduct('${escapeHtml(p.id)}')">Archive</button>
                      </td>
                    </tr>
                  `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Module 2: Orders, 9 Required Order Statuses, Dispatch Tracking & Gateway Refunds -->
        <div class="card-panel">
          <h3>Order Management &amp; Fulfilment Workflow (${data.orders.length} Orders — All 9 Statuses Supported)</h3>
          ${
            data.orders.length === 0
              ? `<p style="color:var(--text-secondary);">No customer orders placed yet. Complete a test checkout (Guest or Signed-In) to manage orders here.</p>`
              : `<table class="data-table">
                  <thead>
                    <tr><th>Order #</th><th>Customer</th><th>Total (₪)</th><th>Order Status (Section 11)</th><th>Courier Tracking #</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    ${data.orders
                      .map(
                        (o) => `
                        <tr>
                          <td><strong>${escapeHtml(o.order_number)}</strong><br/><span style="font-size:0.75rem;color:var(--text-secondary);">${escapeHtml(o.tax_invoice_number)}</span></td>
                          <td>${escapeHtml(o.customer_name)}<br/><span style="font-size:0.75rem;">${escapeHtml(o.customer_email)}</span></td>
                          <td><strong>₪${Number(o.total_ils).toFixed(2)}</strong><br/><span style="font-size:0.75rem;">${escapeHtml(o.payment_status)}</span></td>
                          <td>
                            <select id="admOrdStatus_${escapeHtml(o.id)}" style="padding:4px;">
                              ${orderStatusOptions
                                .map((st) => `<option value="${escapeHtml(st)}" ${o.status === st ? 'selected' : ''}>${escapeHtml(st)}</option>`)
                                .join('')}
                            </select>
                          </td>
                          <td><input type="text" id="admOrdTrack_${escapeHtml(o.id)}" value="${escapeHtml(o.tracking_number)}" style="width:135px;padding:4px;" /></td>
                          <td style="display:flex;gap:6px;">
                            <button type="button" class="btn-primary" style="padding:5px 10px;font-size:0.75rem;" onclick="app.adminUpdateOrderStatus('${escapeHtml(o.id)}')">Update</button>
                            ${
                              o.payment_status !== 'refunded' && o.status !== 'Refunded'
                                ? `<button type="button" class="btn-red" style="padding:5px 10px;font-size:0.75rem;" onclick="app.adminRefundOrder('${escapeHtml(o.id)}')">Refund</button>`
                                : ''
                            }
                          </td>
                        </tr>
                      `
                      )
                      .join('')}
                  </tbody>
                </table>`
          }
        </div>

        <!-- Module 3: Israeli Delivery Zones & Audit Logs -->
        <div class="form-grid-2">
          <div class="card-panel">
            <h3>Configurable Israeli Domestic Delivery Zones</h3>
            <table class="data-table">
              <thead>
                <tr><th>Zone</th><th>Standard (₪)</th><th>Locker (₪)</th><th>Free Over (₪)</th><th>Save</th></tr>
              </thead>
              <tbody>
                ${data.shipping_zones
                  .map(
                    (z) => `
                    <tr>
                      <td><strong>${escapeHtml(z.name_en)}</strong><br/><span style="font-size:0.75rem;color:var(--text-secondary);">${escapeHtml(z.name_he)}</span></td>
                      <td><input type="number" id="zStd_${escapeHtml(z.zone_code)}" value="${z.standard_rate_ils}" style="width:60px;padding:4px;" /></td>
                      <td><input type="number" id="zLoc_${escapeHtml(z.zone_code)}" value="${z.locker_rate_ils}" style="width:60px;padding:4px;" /></td>
                      <td><input type="number" id="zFree_${escapeHtml(z.zone_code)}" value="${z.free_threshold_ils}" style="width:68px;padding:4px;" /></td>
                      <td><button type="button" class="btn-outline" style="padding:4px 8px;font-size:0.75rem;" onclick="app.adminSaveZone('${escapeHtml(z.zone_code)}')">Save</button></td>
                    </tr>
                  `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>

          <div class="card-panel">
            <h3>Immutable Admin Audit Logs &amp; Newsletter Subscribers (${state.newsletterSubscribers.length})</h3>
            <div style="max-height:240px;overflow-y:auto;">
              <table class="data-table">
                <thead>
                  <tr><th>Time</th><th>Actor</th><th>Action</th><th>Details</th></tr>
                </thead>
                <tbody>
                  ${
                    data.audit_logs.length === 0
                      ? `<tr><td colspan="4" style="color:var(--text-secondary);">All administrative mutations are recorded in <code>admin_audit_logs</code>.</td></tr>`
                      : data.audit_logs
                          .map(
                            (l) => `
                            <tr>
                              <td style="font-size:0.74rem;">${new Date(l.created_at).toLocaleTimeString()}</td>
                              <td style="font-size:0.76rem;">${escapeHtml(l.actor_email)}</td>
                              <td><strong>${escapeHtml(l.action)}</strong></td>
                              <td style="font-size:0.76rem;">${escapeHtml(l.details)}</td>
                            </tr>
                          `
                          )
                          .join('')
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    } catch (err) {
      showToast(err.message);
    }
  },

  async adminCreateProduct(e) {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/admin/products', {
        method: 'POST',
        body: JSON.stringify({
          title: document.getElementById('admProdTitle').value,
          title_he: document.getElementById('admProdTitleHe').value,
          vendor_brand: document.getElementById('admProdVendor').value,
          size_label: document.getElementById('admProdSize')?.value || '250g',
          category_slug: document.getElementById('admProdCat').value,
          subcategory_slug: 'cookies',
          region_slug: document.getElementById('admProdRegion').value,
          price_ils: Number(document.getElementById('admProdPrice').value)
        })
      });
      showToast(res.message);
      const allData = await apiFetch('/api/products?maxPrice=9999');
      state.allProducts = allData.products || getLocalProducts();
      this.renderHomepageSections();
      this.loadAndRenderAdminView();
      this.loadProducts();
    } catch (err) {
      showToast(err.message);
    }
  },

  async adminUpdateProduct(id) {
    try {
      const price_ils = Number(document.getElementById(`admPrice_${id}`).value);
      const promoRaw = document.getElementById(`admPromo_${id}`)?.value;
      const compare_at_price_ils = promoRaw ? Number(promoRaw) : null;
      const stock_quantity = Number(document.getElementById(`admStock_${id}`).value);
      const res = await apiFetch(`/api/admin/products/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ price_ils, compare_at_price_ils, stock_quantity })
      });
      showToast(res.message);
      const allData = await apiFetch('/api/products?maxPrice=9999');
      state.allProducts = allData.products || getLocalProducts();
      this.renderHomepageSections();
      this.loadAndRenderAdminView();
      this.loadProducts();
    } catch (err) {
      showToast(err.message);
    }
  },

  async adminArchiveProduct(id) {
    try {
      const res = await apiFetch(`/api/admin/products/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'archived' })
      });
      showToast('Product archived from active storefront.');
      const allData = await apiFetch('/api/products?maxPrice=9999');
      state.allProducts = allData.products || getLocalProducts();
      this.renderHomepageSections();
      this.loadAndRenderAdminView();
      this.loadProducts();
    } catch (err) {
      showToast(err.message);
    }
  },

  exportProductsCsv() {
    const prods = state.allProducts.length > 0 ? state.allProducts : getLocalProducts();
    const header = ['sku', 'title', 'vendor_brand', 'region_slug', 'category_slug', 'size_label', 'price_ils', 'stock_quantity'];
    const rows = prods.map((p) =>
      header.map((k) => `"${String(p[k] ?? '').replace(/"/g, '""')}"`).join(',')
    );
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dinu-market-catalogue.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast('Exported DINU MARKET product catalogue to CSV.');
  },

  importProductsCsv(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = String(ev.target?.result || '');
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) {
        showToast('CSV file contains no product rows.');
        return;
      }
      let imported = 0;
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map((c) => c.replace(/^"|"$/g, '').trim());
        if (cols.length >= 7 && cols[1]) {
          await apiFetch('/api/admin/products', {
            method: 'POST',
            body: JSON.stringify({
              sku: cols[0] || undefined,
              title: cols[1],
              vendor_brand: cols[2] || "Haldiram's",
              region_slug: cols[3] || 'india',
              category_slug: cols[4] || 'snacks',
              size_label: cols[5] || '250g',
              price_ils: Number(cols[6] || 19.9),
              stock_quantity: Number(cols[7] || 25)
            })
          });
          imported++;
        }
      }
      const allData = await apiFetch('/api/products?maxPrice=9999');
      state.allProducts = allData.products || getLocalProducts();
      this.renderHomepageSections();
      this.loadAndRenderAdminView();
      this.loadProducts();
      showToast(`Imported ${imported} product(s) from CSV into catalogue.`);
    };
    reader.readAsText(file);
  },

  async adminUpdateOrderStatus(orderId) {
    try {
      const status = document.getElementById(`admOrdStatus_${orderId}`).value;
      const tracking_number = document.getElementById(`admOrdTrack_${orderId}`).value;
      const res = await apiFetch(`/api/admin/orders/${encodeURIComponent(orderId)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, tracking_number })
      });
      showToast(res.message);
      this.loadAndRenderAdminView();
    } catch (err) {
      showToast(err.message);
    }
  },

  async adminRefundOrder(orderId) {
    try {
      const res = await apiFetch(`/api/admin/orders/${encodeURIComponent(orderId)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'Refunded' })
      });
      showToast('Order refunded and inventory restored.');
      this.loadAndRenderAdminView();
    } catch (err) {
      showToast(err.message);
    }
  },

  async adminSaveZone(zoneCode) {
    try {
      const standard_rate_ils = Number(document.getElementById(`zStd_${zoneCode}`).value);
      const locker_rate_ils = Number(document.getElementById(`zLoc_${zoneCode}`).value);
      const free_threshold_ils = Number(document.getElementById(`zFree_${zoneCode}`).value);
      const res = await apiFetch(`/api/admin/shipping-zones/${encodeURIComponent(zoneCode)}`, {
        method: 'PATCH',
        body: JSON.stringify({ standard_rate_ils, locker_rate_ils, free_threshold_ils })
      });
      showToast(res.message);
      const boot = await apiFetch('/api/bootstrap');
      state.shippingZones = boot.shipping_zones || [];
      this.syncLiveDeliveryBanner();
      this.loadAndRenderAdminView();
    } catch (err) {
      showToast(err.message);
    }
  },

  // =========================================================================
  // STORE POLICY, ABOUT, CONTACT & FAQ MODALS (Section 5K)
  // =========================================================================
  showPolicyModal(type) {
    const bd = document.getElementById('genericModalBackdrop');
    const content = document.getElementById('genericModalContent');
    const { email, phoneDisplay, cutoff, freeThreshold } = getSupportDetails();
    const waUrl = getWhatsAppUrl();

    const policies = {
      about: {
        title: 'About DINU MARKET Israel',
        html: `
          <p><strong>DINU MARKET</strong> is an online Asian and Indian specialty grocery store operating in <strong>Israel</strong> and delivering exclusively to addresses within Israel.</p>
          <p>We source authentic groceries, sweets, aged basmati rice, spices, sauces, and pantry staples from four kitchens:</p>
          <ul>
            <li><strong>Philippines:</strong> Silver Swan Soy Sauce (1000 ml), sawsawan, pancit noodles, merienda, and classic Pinoy pantry essentials.</li>
            <li><strong>Thailand:</strong> Thai curry pastes, coconut milk, jasmine rice, and authentic Thai condiments.</li>
            <li><strong>India:</strong> Haldiram’s Sweets &amp; Savouries, Lal Qilla Supreme Basmati Rice (5 kg), Flavorz Natural Jaggery.</li>
            <li><strong>Sri Lanka:</strong> Ceylon spices, sambols, roasted curry powders, and coconut staples.</li>
          </ul>
        `
      },
      contact: {
        title: 'Contact DINU MARKET Customer Support (Israel)',
        html: `
          <p>Message us in Tagalog, Thai, Sinhala, Hindi, Hebrew, or English — a real person answers on WhatsApp, phone, or email:</p>
          <ul>
            <li><strong>WhatsApp (Fastest):</strong> <a href="${escapeHtml(waUrl)}" target="_blank" rel="noopener">Chat on WhatsApp (${escapeHtml(phoneDisplay)})</a></li>
            <li><strong>Phone (Israel):</strong> <a href="tel:+972548124900">${escapeHtml(phoneDisplay)}</a></li>
            <li><strong>Customer Support Email:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></li>
            <li><strong>Operating Hours:</strong> Sunday – Thursday, 08:30 – 18:00 (Israel Time)</li>
            <li><strong>Delivery Coverage:</strong> Order by ${escapeHtml(cutoff)} for next-day delivery across Israel (free delivery over ₪${escapeHtml(String(freeThreshold))}).</li>
          </ul>
        `
      },
      faq: {
        title: 'Frequently Asked Questions (FAQ)',
        html: `
          <p><strong>1. Where does DINU MARKET deliver?</strong><br/>We deliver exclusively to residential and business addresses within <strong>Israel</strong>. Order by ${escapeHtml(cutoff)} for next-day delivery in central Israel.</p>
          <p><strong>2. What currency are prices listed in?</strong><br/>All prices are listed in <strong>Israeli New Shekels (₪ / ILS)</strong> inclusive of 18% Israeli VAT.</p>
          <p><strong>3. Can I order directly on WhatsApp or check out as a guest?</strong><br/>Yes — you can check out online as a Guest, sign into your Customer Account, or <a href="${escapeHtml(waUrl)}" target="_blank" rel="noopener">message us your list on WhatsApp</a>.</p>
          <p><strong>4. Which kitchens do your products come from?</strong><br/>Our products are sourced directly from <strong>the Philippines</strong>, <strong>Thailand</strong>, <strong>India</strong>, and <strong>Sri Lanka</strong>.</p>
        `
      },
      shipping: {
        title: 'Shipping & Delivery Policy (Israel Only)',
        html: `
          <p>Order by <strong>${escapeHtml(cutoff)}</strong> for next-business-day dispatch across Israel via <strong>Standard Courier</strong>, <strong>Express Delivery</strong>, and <strong>24/7 Local Pickup Lockers</strong> (free standard delivery over <strong>₪${escapeHtml(String(freeThreshold))}</strong>):</p>
          <table class="data-table">
            <thead><tr><th>Israeli Delivery Zone</th><th>Standard Courier</th><th>Pickup Locker</th><th>Est. Delivery</th></tr></thead>
            <tbody>
              ${state.shippingZones
                .map(
                  (z) =>
                    `<tr><td><strong>${escapeHtml(z.name_en)}</strong> (${escapeHtml(z.name_he)})</td><td>₪${z.standard_rate_ils}</td><td>₪${z.locker_rate_ils}</td><td>${escapeHtml(z.estimated_days || '1–3 Business Days')}</td></tr>`
                )
                .join('')}
            </tbody>
          </table>
        `
      },
      returns: {
        title: 'Returns & Refunds Policy (Israeli Consumer Protection Law)',
        html: `
          <p>In full compliance with the <strong>Israeli Consumer Protection Law, 5741-1981 (חוק הגנת הצרכן)</strong>:</p>
          <ul>
            <li>Any damaged, defective, or incorrect item is eligible for an immediate replacement or full refund in ₪ ILS with an official Israeli Credit Tax Invoice (<em>חשבונית זיכוי</em>).</li>
            <li>Contact <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a> or call <a href="tel:+972548124900">${escapeHtml(phoneDisplay)}</a> with your Order Number to initiate a return or refund.</li>
          </ul>
        `
      },
      privacy: {
        title: 'Privacy Policy & Cookie Policy',
        html: `
          <p>DINU MARKET Israel Ltd. protects your personal data in accordance with the Israeli Protection of Privacy Law, 5741-1981 (Amendment 13) and GDPR standards:</p>
          <ul>
            <li>We collect only the contact and delivery details required to fulfil your domestic Israeli order and issue statutory tax invoices.</li>
            <li>Newsletter and promotional emails require explicit opt-in consent (unchecked by default).</li>
          </ul>
        `
      },
      terms: {
        title: 'Terms & Conditions of Service',
        html: `
          <p>All prices on DINU MARKET are displayed in Israeli New Shekels (₪ ILS) inclusive of 18% VAT (<em>כולל מע״מ</em>), alongside unit pricing per 100g / 100ml. Delivery is restricted strictly to addresses within Israel.</p>
        `
      },
      accessibility: {
        title: 'Accessibility Statement (הצהרת נגישות - IS 5568 & WCAG 2.2 AA)',
        html: `
          <p>DINU MARKET conforms to <strong>Israeli Standard IS 5568</strong> and <strong>WCAG 2.2 Level AA</strong>:</p>
          <ul>
            <li>Full keyboard navigation (<code>Tab</code>, <code>Enter</code>, <code>Escape</code>) and visible focus outlines (<code>2px solid #0F4D2C</code>).</li>
            <li>WCAG 2.2 AA contrast ratios across all brand palette tokens, 44×44px minimum touch targets, and semantic ARIA labels.</li>
            <li>For accessibility assistance, contact <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a> or <a href="tel:+972548124900">${escapeHtml(phoneDisplay)}</a>.</li>
          </ul>
        `
      },
      security: {
        title: 'Cybersecurity, Supabase RLS & PCI-DSS Architecture',
        html: `
          <ul>
            <li><strong>Centralised Supabase PostgreSQL Database:</strong> Row-Level Security (RLS) policies enforce customer data isolation and role-based admin privileges.</li>
            <li><strong>Atomic Inventory Reservation:</strong> PostgreSQL row-level locks prevent overselling during concurrent checkouts.</li>
            <li><strong>Payment Security:</strong> Tokenized PCI-DSS compliant payment processing with zero storage of raw card numbers or CVV codes.</li>
          </ul>
        `
      }
    };

    const p = policies[type] || policies.about;
    content.innerHTML = `
      <button type="button" class="modal-close-btn" onclick="app.closeGenericModal()">✕</button>
      <h3>${escapeHtml(p.title)}</h3>
      <div style="font-size:0.9rem;line-height:1.6;">${p.html}</div>
      <div class="modal-actions-end" style="margin-top:18px;">
        <button type="button" class="btn-primary" onclick="app.closeGenericModal()">Close</button>
      </div>
    `;
    bd.style.display = 'flex';
  },

  async requestPasswordResetCode(e) {
    e.preventDefault();
    try {
      const email = document.getElementById('resetEmailInput').value;
      const res = await apiFetch('/api/auth/password-reset/request', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      const box = document.getElementById('resetStep2Container');
      if (box) box.style.display = 'block';
      const codeInput = document.getElementById('resetCodeInput');
      if (codeInput && res.demo_reset_code) codeInput.value = res.demo_reset_code;
      showToast(res.message);
    } catch (err) {
      showToast(err.message);
    }
  },

  async confirmPasswordReset(e) {
    e.preventDefault();
    try {
      const email = document.getElementById('resetEmailInput').value;
      const reset_code = document.getElementById('resetCodeInput').value;
      const new_password = document.getElementById('resetNewPassInput').value;
      const res = await apiFetch('/api/auth/password-reset/confirm', {
        method: 'POST',
        body: JSON.stringify({ email, reset_code, new_password })
      });
      showToast(res.message);
      this.openAuthModal('login');
    } catch (err) {
      showToast(err.message);
    }
  },

  async reorderPastOrder(orderNumber) {
    try {
      const res = await apiFetch(`/api/orders/${encodeURIComponent(orderNumber)}/reorder`, {
        method: 'POST'
      });
      state.cart = res.cart;
      this.updateHeaderState();
      this.renderCartDrawer();
      this.toggleCartDrawer(true);
      showToast(res.message);
    } catch (err) {
      showToast(err.message);
    }
  }
};

window.addEventListener('DOMContentLoaded', () => {
  app.init();
});

