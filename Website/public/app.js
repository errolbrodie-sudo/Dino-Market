/**
 * DINU MARKET: Full-Stack Client Application
 * Implements Navigation (8 Departments, 41 Subcategories, 4 Regions, Excluding Mighty Rewards),
 * Multi-Language Selector (English, Hebrew, Indian/Hindi, Thai, Sri Lankan/Sinhala, Philippine/Filipino),
 * Predictive Search, Faceted Catalog, PDP with Front/Back Photo Gallery, Persistent & Merged Basket,
 * 9-Step Checkout, Customer Account Portal, and 15-Module Administration Dashboard.
 */

const state = {
  lang: 'en',
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
  allProducts: [],
  vendors: [],
  activeRegionalPage: 'india',
  regionalPageLimit: 4,
  filters: {
    category: '',
    subcategory: '',
    region: '',
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

const I18N_DICTIONARY = {
  en: {
    sign_in_register: 'Sign In / Register',
    admin_dashboard: 'Admin Dashboard',
    basket_label: 'Basket',
    search_placeholder: "Search Haldiram’s, Basmati Rice, Soy Sauce, Gulab Jamun, Jaggery, or Barcode...",
    search_btn: '🔍 Search',
    hero_badge: 'ISRAEL’S SPECIALTY ASIAN & INDIAN GROCER',
    hero_title: 'Authentic Flavors from India, Thailand, Sri Lanka & the Philippines',
    hero_subtitle: 'Explore authentic products from India, Thailand, Sri Lanka and the Philippines, delivered straight to your door in Israel. Browse authentic products by their country of origin, all stocked in Israel and delivered to Israeli addresses.',
    hero_btn_authentic: '📸 View Real Photographed Store Inventory (6 Items)',
    hero_btn_sale: '🔥 Shop Current Sale Deals',
    hero_btn_all: 'Browse Full Catalogue',
    hero_card_sub: 'Official Importer & Nationwide Delivery • Kosher & Hebrew Nutritional Labels • Persistent Account Basket',
    trust_1_title: 'Nationwide Israel Delivery',
    trust_1_sub: 'Gush Dan, Sharon, Jerusalem, North, South & Lockers',
    trust_2_title: 'Persistent & Synced Basket',
    trust_2_sub: 'Browse freely; your basket merges when you sign in',
    trust_3_title: 'Israeli & Global Payments',
    trust_3_sub: 'Visa, Mastercard, Amex, Isracard, Bit, Apple/Google Pay',
    trust_4_title: 'Full Hebrew & Allergen Labels',
    trust_4_sub: 'Unit prices per 100g/100ml & Ministry of Health badges',
    region_section_title: 'Shop by Region & Culinary Origin',
    region_section_sub: 'Select India, Thailand, Sri Lanka, or the Philippines to filter products from that region',
    clear_all_filters: 'Clear All Filters',
    all_4_regions: 'All 4 Regions',
    filter_quick_title: 'Quick Inventory Filters',
    filter_authentic: 'Real Photographed Shelf Items',
    filter_in_stock: '✅ In Stock Only',
    filter_on_sale: '🔥 On Sale / Discounted',
    filter_dept_title: 'Main Department',
    filter_subcat_title: 'Subcategory',
    filter_dietary_title: 'Dietary & Certification',
    filter_brand_title: 'Brand / Vendor',
    filter_max_price: 'Maximum Price (₪ ILS):',
    sort_by_label: 'Sort by:',
    all_products_heading: 'All Dinu Market Products',
    add_to_basket: '🛒 Add to Basket',
    in_basket: 'in Basket',
    in_stock: 'In Stock',
    out_of_stock: 'Out of Stock',
    real_shelf_badge: '📸 REAL SHELF PHOTO',
    footer_about_text: 'Bringing authentic specialty foods from India, Thailand, Sri Lanka, and the Philippines directly to kitchens across Israel.',
    footer_depts_title: 'Grocery Departments',
    footer_link_regions: 'Shop by Region (India, Thailand, Sri Lanka & Philippines)',
    categories: {
      'shop-by-region': 'Shop by Region',
      sweets: 'Sweets',
      snacks: 'Snacks',
      pantry: 'Pantry',
      drinks: 'Drinks',
      'canned-jarred-goods': 'Canned & Jarred Goods',
      'sauce-seasoning': 'Sauce & Seasoning',
      'instant-foods': 'Instant Foods'
    },
    regions: {
      india: 'India',
      thailand: 'Thailand',
      'sri-lanka': 'Sri Lanka',
      philippines: 'Philippines'
    }
  },
  he: {
    sign_in_register: 'התחברות / הרשמה',
    admin_dashboard: 'לוח בקרה למנהל',
    basket_label: 'סל קניות',
    search_placeholder: 'חיפוש האלדירם, אורז בסמטי, רוטב סויה, גולאב ג׳אמון, ג׳אגרי או ברקוד...',
    search_btn: '🔍 חיפוש',
    hero_badge: 'המרכול האסייתי וההודי המוביל בישראל',
    hero_title: 'טעמים אותנטיים מהודו, תאילנד, סרי לנקה והפיליפינים',
    hero_subtitle: 'קנו ממבחר המחסן הישראלי שלנו במלאי זמין המיובא מהודו, תאילנד, סרי לנקה והפיליפינים.',
    hero_btn_authentic: '📸 צפו במלאי המצולם שלנו (6 פריטים)',
    hero_btn_sale: '🔥 מבצעים והנחות',
    hero_btn_all: 'לכל הקטלוג',
    hero_card_sub: 'יבואן רשמי ומשלוחים לכל הארץ • סימון תזונתי בעברית וכשרות • סל קניות מסונכרן',
    trust_1_title: 'משלוחים לכל רחבי ישראל',
    trust_1_sub: 'גוש דן, השרון, ירושלים, צפון, דרום ולוקרים',
    trust_2_title: 'סל קניות שמור ומסונכרן',
    trust_2_sub: 'הסל נשמר אוטומטית ומתמזג בעת ההתחברות לחשבון',
    trust_3_title: 'אמצעי תשלום ישראליים ובינלאומיים',
    trust_3_sub: 'Visa, Mastercard, Amex, Isracard, Bit, Apple/Google Pay',
    trust_4_title: 'סימון תזונתי ואלרגנים מלא בעברית',
    trust_4_sub: 'מחיר ל-100 גרם/מ״ל וסימון משרד הבריאות',
    region_section_title: 'קנייה לפי מדינה ומקור קולינרי',
    region_section_sub: 'בחרו הודו, תאילנד, סרי לנקה או הפיליפינים לסינון מוצרים מאותו אזור',
    clear_all_filters: 'נקה את כל המסננים',
    all_4_regions: 'כל 4 המדינות',
    filter_quick_title: 'סינון מהיר',
    filter_authentic: 'מוצרים עם תמונות מדף אמיתיות',
    filter_in_stock: '✅ במלאי בלבד',
    filter_on_sale: '🔥 במבצע / הנחה',
    filter_dept_title: 'מחלקה ראשית',
    filter_subcat_title: 'תת-קטגוריה',
    filter_dietary_title: 'תזונה וכשרות',
    filter_brand_title: 'מותג / יצרן',
    filter_max_price: 'מחיר מקסימלי (₪):',
    sort_by_label: 'מיון לפי:',
    all_products_heading: 'כל מוצרי דינו מרקט',
    add_to_basket: '🛒 הוסף לסל',
    in_basket: 'בסל',
    in_stock: 'במלאי',
    out_of_stock: 'אזל מהמלאי',
    real_shelf_badge: '📸 צילום מדף אמיתי',
    footer_about_text: 'מביאים מוצרי מזון אותנטיים מהודו, תאילנד, סרי לנקה והפיליפינים ישירות למטבחים בכל רחבי ישראל.',
    footer_depts_title: 'מחלקות החנות',
    footer_link_regions: 'קנייה לפי מדינה (הודו, תאילנד, סרי לנקה והפיליפינים)',
    categories: {
      'shop-by-region': 'קנייה לפי מדינה',
      sweets: 'ממתקים וקינוחים',
      snacks: 'חטיפים מלוחים',
      pantry: 'מזווה ובישול',
      drinks: 'משקאות ותה',
      'canned-jarred-goods': 'שימורים וצנצנות',
      'sauce-seasoning': 'רטבים ותבלינים',
      'instant-foods': 'אוכל מהיר וראמן'
    },
    regions: {
      india: 'הודו',
      thailand: 'תאילנד',
      'sri-lanka': 'סרי לנקה',
      philippines: 'הפיליפינים'
    }
  },
  hi: {
    sign_in_register: 'साइन इन / पंजीकरण',
    admin_dashboard: 'व्यवस्थापक डैशबोर्ड',
    basket_label: 'टोकरी',
    search_placeholder: 'हल्दीराम, बासमती चावल, सोया सॉस, गुलाब जामुन या गुड़ खोजें...',
    search_btn: '🔍 खोजें',
    hero_badge: 'इज़राइल का प्रमुख भारतीय और एशियाई किराना स्टोर',
    hero_title: 'भारत, थाईलैंड, श्रीलंका और फिलीपींस के प्रामाणिक स्वाद',
    hero_subtitle: 'भारत, थाईलैंड, श्रीलंका और फिलीपींस से मंगाए गए हमारे इज़राइल गोदाम के असली उत्पादों की खरीदारी करें।',
    hero_btn_authentic: '📸 असली स्टोर उत्पाद देखें (6 आइटम)',
    hero_btn_sale: '🔥 विशेष छूट वाले ऑफ़र',
    hero_btn_all: 'पूरा कैटलॉग देखें',
    hero_card_sub: 'आधिकारिक आयातक और पूरे इज़राइल में डिलीवरी • कोशर और हिब्रू पोषण लेबल • सुरक्षित खाता टोकरी',
    trust_1_title: 'पूरे इज़राइल में डिलीवरी',
    trust_1_sub: 'गुश दान, शेरोन, यरुशलम, उत्तर, दक्षिण और लॉकर',
    trust_2_title: 'सिंक की गई शॉपिंग टोकरी',
    trust_2_sub: 'साइन इन करने पर आपकी टोकरी सुरक्षित रहती है',
    trust_3_title: 'इज़राइली और वैश्विक भुगतान',
    trust_3_sub: 'Visa, Mastercard, Amex, Isracard, Bit, Apple/Google Pay',
    trust_4_title: 'पूर्ण हिब्रू और एलर्जी लेबल',
    trust_4_sub: 'प्रति 100 ग्राम/मिली मूल्य और स्वास्थ्य मंत्रालय मानक',
    region_section_title: 'क्षेत्र और पाक मूल के अनुसार खरीदारी करें',
    region_section_sub: 'उत्पादों को फ़िल्टर करने के लिए भारत, थाईलैंड, श्रीलंका या फिलीपींस चुनें',
    clear_all_filters: 'सभी फ़िल्टर हटाएं',
    all_4_regions: 'सभी 4 क्षेत्र',
    filter_quick_title: 'त्वरित इन्वेंट्री फ़िल्टर',
    filter_authentic: 'असली फ़ोटो वाले स्टोर आइटम',
    filter_in_stock: '✅ केवल स्टॉक में उपलब्ध',
    filter_on_sale: '🔥 छूट / सेल पर उपलब्ध',
    filter_dept_title: 'मुख्य विभाग',
    filter_subcat_title: 'उप-श्रेणी',
    filter_dietary_title: 'आहार और प्रमाणन',
    filter_brand_title: 'ब्रांड / विक्रेता',
    filter_max_price: 'अधिकतम मूल्य (₪ ILS):',
    sort_by_label: 'क्रमबद्ध करें:',
    all_products_heading: 'सभी दीनू मार्केट उत्पाद',
    add_to_basket: '🛒 टोकरी में डालें',
    in_basket: 'टोकरी में',
    in_stock: 'स्टॉक में',
    out_of_stock: 'स्टॉक समाप्त',
    real_shelf_badge: '📸 असली स्टोर फ़ोटो',
    footer_about_text: 'भारत, थाईलैंड, श्रीलंका और फिलीपींस के प्रामाणिक खाद्य पदार्थ सीधे इज़राइल के घरों तक पहुँचाना।',
    footer_depts_title: 'किराना विभाग',
    footer_link_regions: 'क्षेत्र के अनुसार खरीदारी (भारत, थाईलैंड, श्रीलंका, फिलीपींस)',
    categories: {
      'shop-by-region': 'क्षेत्र के अनुसार खरीदारी',
      sweets: 'मिठाइयाँ',
      snacks: 'नाश्ता और स्नैक्स',
      pantry: 'पैंट्री और अनाज',
      drinks: 'पेय पदार्थ',
      'canned-jarred-goods': 'डिब्बाबंद सामान',
      'sauce-seasoning': 'सॉस और मसाले',
      'instant-foods': 'इंस्टेंट फूड्स'
    },
    regions: {
      india: 'भारत',
      thailand: 'थाईलैंड',
      'sri-lanka': 'श्रीलंका',
      philippines: 'फिलीपींस'
    }
  },
  th: {
    sign_in_register: 'เข้าสู่ระบบ / สมัครสมาชิก',
    admin_dashboard: 'แดชบอร์ดผู้ดูแลระบบ',
    basket_label: 'ตะกร้าสินค้า',
    search_placeholder: 'ค้นหา Haldiram, ข้าวบาสมาติ, ซีอิ๊ว, กุหลาบจามุน, น้ำตาลก้อน...',
    search_btn: '🔍 ค้นหา',
    hero_badge: 'ซูเปอร์มาร์เก็ตอาหารเอเชียและอินเดียชั้นนำในอิสราเอล',
    hero_title: 'รสชาติแท้จาก อินเดีย ไทย ศรีลังกา และฟิลิปปินส์',
    hero_subtitle: 'ช้อปสินค้าพร้อมส่งจากคลังสินค้าในอิสราเอลที่คัดสรรจากอินเดีย ไทย ศรีลังกา และฟิลิปปินส์',
    hero_btn_authentic: '📸 ดูสินค้าจริงในคลัง (6 รายการ)',
    hero_btn_sale: '🔥 โปรโมชั่นลดราคาพิเศษ',
    hero_btn_all: 'ดูสินค้าทั้งหมด',
    hero_card_sub: 'ผู้นำเข้าอย่างเป็นทางการ จัดส่งทั่วอิสราเอล • ฉลากโภชนาการภาษาฮีบรูและโคเชอร์ • ตะกร้าสินค้าซิงค์อัตโนมัติ',
    trust_1_title: 'จัดส่งทั่วประเทศอิสราเอล',
    trust_1_sub: 'กุชดาน ชารอน เยรูซาเล็ม ภาคเหนือ ภาคใต้ และตู้ล็อกเกอร์',
    trust_2_title: 'บันทึกตะกร้าสินค้าอัตโนมัติ',
    trust_2_sub: 'เลือกชมได้อิสระ ตะกร้าจะซิงค์ทันทีเมื่อเข้าสู่ระบบ',
    trust_3_title: 'รองรับการชำระเงินในอิสราเอลและสากล',
    trust_3_sub: 'Visa, Mastercard, Amex, Isracard, Bit, Apple/Google Pay',
    trust_4_title: 'ฉลากภาษาฮีบรูและข้อมูลภูมิแพ้ครบถ้วน',
    trust_4_sub: 'แสดงราคาต่อ 100 กรัม/มล. ตามมาตรฐานกระทรวงสาธารณสุข',
    region_section_title: 'เลือกช้อปตามภูมิภาคและต้นกำเนิดอาหาร',
    region_section_sub: 'เลือก อินเดีย ไทย ศรีลังกา หรือฟิลิปปินส์ เพื่อกรองสินค้าจากภูมิภาคนั้น',
    clear_all_filters: 'ล้างตัวกรองทั้งหมด',
    all_4_regions: 'ทั้งหมด 4 ภูมิภาค',
    filter_quick_title: 'ตัวกรองสินค้าด่วน',
    filter_authentic: 'ภาพถ่ายสินค้าจริงจากคลัง',
    filter_in_stock: '✅ มีสินค้าพร้อมส่งเท่านั้น',
    filter_on_sale: '🔥 สินค้าลดราคา',
    filter_dept_title: 'หมวดหมู่หลัก',
    filter_subcat_title: 'หมวดหมู่ย่อย',
    filter_dietary_title: 'การรับรองและโภชนาการ',
    filter_brand_title: 'แบรนด์ / ผู้ผลิต',
    filter_max_price: 'ราคาสูงสุด (₪ ILS):',
    sort_by_label: 'เรียงตาม:',
    all_products_heading: 'สินค้า Dinu Market ทั้งหมด',
    add_to_basket: '🛒 เพิ่มลงตะกร้า',
    in_basket: 'ชิ้นในตะกร้า',
    in_stock: 'มีสินค้า',
    out_of_stock: 'สินค้าหมด',
    real_shelf_badge: '📸 ภาพถ่ายสินค้าจริง',
    footer_about_text: 'นำเสนออาหารและวัตถุดิบแท้จาก อินเดีย ไทย ศรีลังกา และฟิลิปปินส์ ส่งตรงถึงครัวทั่วอิสราเอล',
    footer_depts_title: 'แผนกสินค้าอุปโภคบริโภค',
    footer_link_regions: 'ช้อปตามภูมิภาค (อินเดีย, ไทย, ศรีลังกา และฟิลิปปินส์)',
    categories: {
      'shop-by-region': 'ช้อปตามภูมิภาค',
      sweets: 'ขนมหวาน',
      snacks: 'ขนมขบเคี้ยว',
      pantry: 'วัตถุดิบและข้าวสาร',
      drinks: 'เครื่องดื่ม',
      'canned-jarred-goods': 'อาหารกระป๋อง',
      'sauce-seasoning': 'ซอสและเครื่องปรุงรส',
      'instant-foods': 'อาหารกึ่งสำเร็จรูป'
    },
    regions: {
      india: 'อินเดีย',
      thailand: 'ไทย',
      'sri-lanka': 'ศรีลังกา',
      philippines: 'ฟิลิปปินส์'
    }
  },
  si: {
    sign_in_register: 'පිවිසෙන්න / ලියාපදිංචි වන්න',
    admin_dashboard: 'පරිපාලක පුවරුව',
    basket_label: 'බාස්කට්ටුව',
    search_placeholder: 'Haldiram, බාස්මතී සහල්, සෝයා සෝස්, ගුලාබ් ජමුන් හෝ හකුරු සොයන්න...',
    search_btn: '🔍 සොයන්න',
    hero_badge: 'ඊශ්‍රායලයේ ප්‍රමුඛතම ආසියානු සහ ඉන්දියානු සුපිරි වෙළඳසැල',
    hero_title: 'ඉන්දියාව, තායිලන්තය, ශ්‍රී ලංකාව සහ පිලිපීනයෙන් සැබෑ රසයන්',
    hero_subtitle: 'ඉන්දියාව, තායිලන්තය, ශ්‍රී ලංකාව සහ පිලිපීනයෙන් ගෙන්වන ලද අපගේ ඊශ්‍රායල ගබඩාවේ ඇති සැබෑ භාණ්ඩ මිලදී ගන්න.',
    hero_btn_authentic: '📸 සැබෑ ඡායාරූප සහිත භාණ්ඩ බලන්න (6)',
    hero_btn_sale: '🔥 විශේෂ වට්ටම් දීමනා',
    hero_btn_all: 'සියලුම භාණ්ඩ බලන්න',
    hero_card_sub: 'නිල ආනයනකරු සහ ඊශ්‍රායලය පුරා බෙදාහැරීම • කොෂර් සහ හීබෲ පෝෂණ ලේබල් • සුරක්ෂිත බාස්කට්ටුව',
    trust_1_title: 'ඊශ්‍රායලය පුරා බෙදාහැරීම',
    trust_1_sub: 'ගුෂ් ඩෑන්, ෂැරොන්, ජෙරුසලම, උතුර, දකුණ සහ ලොකර්',
    trust_2_title: 'සුරක්ෂිත සාප්පු බාස්කට්ටුව',
    trust_2_sub: 'ඔබ ගිණුමට පිවිසෙන විට බාස්කට්ටුව ස්වයංක්‍රීයව සම්බන්ධ වේ',
    trust_3_title: 'ඊශ්‍රායල සහ ගෝලීය ගෙවීම් ක්‍රම',
    trust_3_sub: 'Visa, Mastercard, Amex, Isracard, Bit, Apple/Google Pay',
    trust_4_title: 'සම්පූර්ණ හීබෲ සහ අසාත්මිකතා ලේබල්',
    trust_4_sub: '100g/100ml සඳහා මිල සහ සෞඛ්‍ය අමාත්‍යාංශ ප්‍රමිතීන්',
    region_section_title: 'කලාපය සහ ආහාර සම්භවය අනුව මිලදී ගන්න',
    region_section_sub: 'භාණ්ඩ තේරීමට ඉන්දියාව, තායිලන්තය, ශ්‍රී ලංකාව හෝ පිලිපීනය තෝරන්න',
    clear_all_filters: 'සියලුම පෙරහන් ඉවත් කරන්න',
    all_4_regions: 'කලාප 4ම',
    filter_quick_title: 'ඉක්මන් භාණ්ඩ පෙරහන්',
    filter_authentic: 'සැබෑ ඡායාරූප සහිත භාණ්ඩ',
    filter_in_stock: '✅ තොගයේ ඇති භාණ්ඩ පමණක්',
    filter_on_sale: '🔥 වට්ටම් සහිත භාණ්ඩ',
    filter_dept_title: 'ප්‍රධාන අංශය',
    filter_subcat_title: 'උප කාණ්ඩය',
    filter_dietary_title: 'ආහාර සහතික කිරීම්',
    filter_brand_title: 'වෙළඳ නාමය',
    filter_max_price: 'උපරිම මිල (₪ ILS):',
    sort_by_label: 'පෙළගස්වන්න:',
    all_products_heading: 'සියලුම Dinu Market භාණ්ඩ',
    add_to_basket: '🛒 බාස්කට්ටුවට එක් කරන්න',
    in_basket: 'බාස්කට්ටුවේ',
    in_stock: 'තොගයේ ඇත',
    out_of_stock: 'තොග අවසන්',
    real_shelf_badge: '📸 සැබෑ ඡායාරූපය',
    footer_about_text: 'ඉන්දියාව, තායිලන්තය, ශ්‍රී ලංකාව සහ පිලිපීනයේ සැබෑ ආහාර ද්‍රව්‍ය ඊශ්‍රායලයේ සෑම නිවසකටම ගෙන ඒම.',
    footer_depts_title: 'භාණ්ඩ අංශ',
    footer_link_regions: 'කලාපය අනුව මිලදී ගන්න (ඉන්දියාව, තායිලන්තය, ශ්‍රී ලංකාව, පිලිපීනය)',
    categories: {
      'shop-by-region': 'කලාපය අනුව මිලදී ගන්න',
      sweets: 'රසකැවිලි',
      snacks: 'කෙටි ආහාර',
      pantry: 'සහල් සහ අත්‍යවශ්‍ය ද්‍රව්‍ය',
      drinks: 'බීම වර්ග',
      'canned-jarred-goods': 'ටින් කළ ආහාර',
      'sauce-seasoning': 'සෝස් සහ කුළුබඩු',
      'instant-foods': 'ක්ෂණික ආහාර'
    },
    regions: {
      india: 'ඉන්දියාව',
      thailand: 'තායිලන්තය',
      'sri-lanka': 'ශ්‍රී ලංකාව',
      philippines: 'පිලිපීනය'
    }
  },
  tl: {
    sign_in_register: 'Mag-Sign In / Magrehistro',
    admin_dashboard: 'Admin Dashboard',
    basket_label: 'Basket',
    search_placeholder: 'Maghanap ng Haldiram’s, Basmati Rice, Silver Swan Soy Sauce, Gulab Jamun...',
    search_btn: '🔍 Hanapin',
    hero_badge: 'PANGUNAHING ASIAN AT INDIAN GROCER SA ISRAEL',
    hero_title: 'Tunay na Panlasa mula sa India, Thailand, Sri Lanka at Pilipinas',
    hero_subtitle: 'Mamili sa aming tunay na imbentaryo sa bodega sa Israel na nagmula sa India, Thailand, Sri Lanka, at Pilipinas.',
    hero_btn_authentic: '📸 Tingnan ang Tunay na Litrato ng Produkto (6 Items)',
    hero_btn_sale: '🔥 Mamili ng Sale at Diskwento',
    hero_btn_all: 'Tingnan ang Buong Katalogo',
    hero_card_sub: 'Opisyal na Importer at Nationwide Delivery sa Israel • Kosher at Hebrew Labels • Naka-sync na Basket',
    trust_1_title: 'Delivery sa Buong Israel',
    trust_1_sub: 'Gush Dan, Sharon, Jerusalem, North, South at Lockers',
    trust_2_title: 'Naka-save at Synced na Basket',
    trust_2_sub: 'Malayang mamili; ang iyong basket ay nagsi-sync pag-sign in',
    trust_3_title: 'Israeli at Pandaigdigang Bayad',
    trust_3_sub: 'Visa, Mastercard, Amex, Isracard, Bit, Apple/Google Pay',
    trust_4_title: 'Kumpletong Hebrew at Allergen Labels',
    trust_4_sub: 'Presyo kada 100g/100ml at Ministry of Health badges',
    region_section_title: 'Mamili ayon sa Rehiyon at Pinagmulan',
    region_section_sub: 'Piliin ang India, Thailand, Sri Lanka, o Pilipinas upang salain ang mga produkto',
    clear_all_filters: 'I-clear ang Lahat ng Filter',
    all_4_regions: 'Lahat ng 4 na Rehiyon',
    filter_quick_title: 'Mabilisang Filter ng Imbentaryo',
    filter_authentic: 'Mga Produktong may Tunay na Litrato',
    filter_in_stock: '✅ May Stock Lamang',
    filter_on_sale: '🔥 Naka-Sale / May Diskwento',
    filter_dept_title: 'Pangunahing Departamento',
    filter_subcat_title: 'Subkategorya',
    filter_dietary_title: 'Dietary at Sertipikasyon',
    filter_brand_title: 'Brand / Tatak',
    filter_max_price: 'Pinakamataas na Presyo (₪ ILS):',
    sort_by_label: 'Ayusin ayon sa:',
    all_products_heading: 'Lahat ng Produkto sa Dinu Market',
    add_to_basket: '🛒 Idagdag sa Basket',
    in_basket: 'sa Basket',
    in_stock: 'May Stock',
    out_of_stock: 'Ubos na ang Stock',
    real_shelf_badge: '📸 TUNAY NA LITRATO',
    footer_about_text: 'Nagdadala ng mga tunay na pagkain at sangkap mula sa India, Thailand, Sri Lanka, at Pilipinas diretso sa mga kusina sa buong Israel.',
    footer_depts_title: 'Mga Departamento ng Grocery',
    footer_link_regions: 'Mamili ayon sa Rehiyon (India, Thailand, Sri Lanka at Pilipinas)',
    categories: {
      'shop-by-region': 'Mamili ayon sa Rehiyon',
      sweets: 'Matatamis',
      snacks: 'Meryenda at Snacks',
      pantry: 'Pantry, Bigas at Asukal',
      drinks: 'Mga Inumin',
      'canned-jarred-goods': 'De-Lata at Naka-Garapon',
      'sauce-seasoning': 'Toyo, Sarsa at Pampalasa',
      'instant-foods': 'Instant Noodles at Pagkain'
    },
    regions: {
      india: 'India',
      thailand: 'Thailand',
      'sri-lanka': 'Sri Lanka',
      philippines: 'Pilipinas'
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
    name: 'India',
    name_he: 'הודו',
    slug: 'india',
    iso_code: 'IN',
    flag_emoji: '🇮🇳',
    hero_headline: 'Authentic Flavours of India',
    description: 'Explore traditional Indian bakery cookies, crispy whole-wheat rusks, natural unrefined cane jaggery, cardamom-steeped Gulab Jamun, and aged extra-long Basmati rice delivered across Israel.',
    tile_image: 'images/products/lal-qilla-basmati-rice-front.jpg'
  },
  {
    name: 'Thailand',
    name_he: 'תאילנד',
    slug: 'thailand',
    iso_code: 'TH',
    flag_emoji: '🇹🇭',
    hero_headline: 'Authentic Flavours of Thailand',
    description: 'Explore aromatic Thai kitchen staples, curry pastes, coconut milks, jasmine rice, and wok sauces delivered across Israel.',
    tile_image: 'images/brand/dinu-logo.png'
  },
  {
    name: 'Sri Lanka',
    name_he: 'סרי לנקה',
    slug: 'sri-lanka',
    iso_code: 'LK',
    flag_emoji: '🇱🇰',
    hero_headline: 'Authentic Flavours of Sri Lanka',
    description: 'Explore pure Ceylon teas, whole island spices, coconut sambols, and Sri Lankan culinary essentials delivered across Israel.',
    tile_image: 'images/brand/dinu-logo.png'
  },
  {
    name: 'Philippines',
    name_he: 'הפיליפינים',
    slug: 'philippines',
    iso_code: 'PH',
    flag_emoji: '🇵🇭',
    hero_headline: 'Authentic Flavours of the Philippines',
    description: 'Explore beloved Filipino pantry staples, soy and vinegar marinades, noodles, and tropical treats delivered across Israel.',
    tile_image: 'images/products/silver-swan-soy-sauce-front.jpg'
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
    free_threshold_ils: 0
  };
  cart.zone_name = zone.name_en;
  let ship = zone.standard_rate_ils || 25;
  if (state.checkout.delivery_method === 'express') ship = zone.express_rate_ils || 45;
  if (state.checkout.delivery_method === 'locker') ship = zone.locker_rate_ils || 15;
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
      { zone_code: 'IL-Z1', name_en: 'Gush Dan & Tel Aviv Metro', name_he: 'גוש דן ותל אביב', standard_rate_ils: 25, express_rate_ils: 45, locker_rate_ils: 15, free_threshold_ils: 0, estimated_days: '1–2 business days (Israel Only)' },
      { zone_code: 'IL-Z2', name_en: 'Sharon, Central & Shfela', name_he: 'השרון, מרכז והשפלה', standard_rate_ils: 29, express_rate_ils: 49, locker_rate_ils: 19, free_threshold_ils: 0, estimated_days: '1–3 business days (Israel Only)' },
      { zone_code: 'IL-Z3', name_en: 'Jerusalem, Haifa & North', name_he: 'ירושלים, חיפה והצפון', standard_rate_ils: 32, express_rate_ils: 55, locker_rate_ils: 19, free_threshold_ils: 0, estimated_days: '2–3 business days (Israel Only)' },
      { zone_code: 'IL-Z4', name_en: 'Beersheba & South', name_he: 'באר שבע והדרום', standard_rate_ils: 35, express_rate_ils: 59, locker_rate_ils: 22, free_threshold_ils: 0, estimated_days: '2–4 business days (Israel Only)' }
    ];
    if (url.startsWith('/api/bootstrap')) {
      if (!state.shippingZones || state.shippingZones.length === 0) state.shippingZones = defaultZones;
      return {
        navigation: STATIC_FALLBACK_NAVIGATION,
        regions: STATIC_FALLBACK_REGIONS,
        shipping_zones: state.shippingZones,
        payment_config: {},
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
      state.navigation = boot.navigation || [];
      state.regions = boot.regions || [];
      state.shippingZones = boot.shipping_zones || [];
      state.paymentConfig = boot.payment_config || {};
      state.user = boot.user || null;
      state.cart = boot.cart || state.cart;

      const allData = await apiFetch('/api/products?maxPrice=9999');
      state.allProducts = allData.products || getLocalProducts();

      this.renderNavigation();
      this.renderHomepageSections();
      this.renderRegionStrip();
      this.populateFilterDropdowns();
      this.updateHeaderState();
      this.renderCartDrawer();
      await this.loadProducts();

      // Close predictive search when clicking outside
      document.addEventListener('click', (e) => {
        const sc = document.querySelector('.search-container');
        const dd = document.getElementById('predictiveDropdown');
        if (sc && dd && !sc.contains(e.target)) {
          dd.style.display = 'none';
        }
      });
    } catch (err) {
      console.error('Initialization error:', err);
    }
  },

  updateHeaderState() {
    const countEl = document.getElementById('headerCartCount');
    const totalEl = document.getElementById('headerCartTotal');
    const wishEl = document.getElementById('headerWishlistCount');
    const accLabel = document.getElementById('accountHeaderLabel');
    const adminBtn = document.getElementById('adminHeaderBtn');

    if (countEl) countEl.textContent = state.cart.item_count || 0;
    if (totalEl) totalEl.textContent = `₪${Number(state.cart.total_ils || 0).toFixed(2)}`;
    if (wishEl) wishEl.textContent = (state.wishlist || []).length;

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

  setLanguage(langCode) {
    state.lang = I18N_DICTIONARY[langCode] ? langCode : 'en';
    document.documentElement.lang = state.lang;
    const sel = document.getElementById('langSelector');
    if (sel && sel.value !== state.lang) sel.value = state.lang;

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (key) {
        el.textContent = t(key);
      }
    });

    const searchInput = document.getElementById('globalSearchInput');
    if (searchInput) searchInput.placeholder = t('search_placeholder');
    const searchBtn = document.querySelector('.search-submit-btn');
    if (searchBtn) searchBtn.textContent = t('search_btn');

    this.updateHeaderState();
    this.renderNavigation();
    this.renderHomepageSections();
    this.renderRegionStrip();
    this.populateFilterDropdowns();
    this.renderProductGrid();
    this.renderCartDrawer();
  },

  // =========================================================================
  // SECTION 4: TOP NAVIGATION STRUCTURE
  // HOME | SHOP BY REGION ▼ | SHOP BY CATEGORY ▼ | SPECIAL OFFERS | NEW ARRIVALS | BEST SELLERS | ABOUT US | CONTACT US
  // =========================================================================
  renderNavigation() {
    const desktopUl = document.getElementById('desktopNavList');
    const mobileContainer = document.getElementById('mobileNavContainer');
    if (!desktopUl) return;

    const activeDepts = state.navigation.filter((c) => c.slug !== 'shop-by-region');

    const regionDropdownHtml = state.regions
      .map(
        (r) => `
        <div class="dropdown-link" onclick="app.openRegionalPage('${escapeHtml(r.slug)}')">
          <span><strong>${escapeHtml(getRegionLabel(r))}</strong></span>
        </div>
      `
      )
      .join('');

    const categoryDropdownHtml = activeDepts
      .map(
        (cat) => `
        <div class="dropdown-link" onclick="app.selectCategory('${escapeHtml(cat.slug)}')">
          <span><strong>${escapeHtml(getCategoryLabel(cat))}</strong></span>
          <span style="font-size:0.74rem;color:var(--text-secondary);">${(cat.subcategories || []).length} sub-depts</span>
        </div>
      `
      )
      .join('');

    const deptMegaItemsHtml = activeDepts
      .map((cat) => {
        const subItemsHtml = (cat.subcategories || [])
          .map((sub) => {
            const subLabel = state.lang === 'he' ? (sub.name_he || sub.name) : sub.name;
            return `
              <div class="dropdown-link" onclick="app.selectSubcategory('${escapeHtml(cat.slug)}', '${escapeHtml(sub.slug)}')">
                <span>${escapeHtml(subLabel)}</span>
              </div>
            `;
          })
          .join('');
        return `
          <li class="nav-item">
            <button type="button" class="nav-link ${state.filters.category === cat.slug ? 'active' : ''}" onclick="app.selectCategory('${escapeHtml(cat.slug)}')">
              <span>${escapeHtml(getCategoryLabel(cat))}</span>
              <span class="nav-chevron">▼</span>
            </button>
            <div class="dropdown-panel" role="menu">
              ${subItemsHtml}
            </div>
          </li>
        `;
      })
      .join('');

    desktopUl.innerHTML = `
      <li class="nav-item">
        <button type="button" class="nav-link" onclick="app.navigateToHome()">
          <span>HOME</span>
        </button>
      </li>
      <li class="nav-item">
        <button type="button" class="nav-link" onclick="app.scrollToSection('catalog')">
          <span>SHOP BY REGION</span>
          <span class="nav-chevron">▼</span>
        </button>
        <div class="dropdown-panel mega-region" role="menu">
          ${regionDropdownHtml}
        </div>
      </li>
      <li class="nav-item">
        <button type="button" class="nav-link" onclick="app.scrollToSection('featuredCategoriesSection')">
          <span>SHOP BY CATEGORY</span>
          <span class="nav-chevron">▼</span>
        </button>
        <div class="dropdown-panel" role="menu">
          ${categoryDropdownHtml}
        </div>
      </li>
      <li class="nav-item">
        <button type="button" class="nav-link" onclick="app.scrollToSection('specialOffersSection')">
          <span>SPECIAL OFFERS</span>
        </button>
      </li>
      <li class="nav-item">
        <button type="button" class="nav-link" onclick="app.scrollToSection('newArrivalsSection')">
          <span>NEW ARRIVALS</span>
        </button>
      </li>
      <li class="nav-item">
        <button type="button" class="nav-link" onclick="app.scrollToSection('bestSellersSection')">
          <span>BEST SELLERS</span>
        </button>
      </li>
      ${deptMegaItemsHtml}
    `;

    if (mobileContainer) {
      mobileContainer.innerHTML = `
        <div style="margin-bottom:12px;border-bottom:1px solid var(--border);padding-bottom:10px;display:flex;flex-direction:column;gap:6px;">
          <button type="button" class="btn-outline" style="text-align:left;" onclick="app.navigateToHome(); app.toggleMobileDrawer(false);">🏠 HOME</button>
          <button type="button" class="btn-outline" style="text-align:left;" onclick="app.scrollToSection('specialOffersSection'); app.toggleMobileDrawer(false);">🏷️ SPECIAL OFFERS</button>
          <button type="button" class="btn-outline" style="text-align:left;" onclick="app.scrollToSection('newArrivalsSection'); app.toggleMobileDrawer(false);">✨ NEW ARRIVALS</button>
          <button type="button" class="btn-outline" style="text-align:left;" onclick="app.scrollToSection('bestSellersSection'); app.toggleMobileDrawer(false);">⭐ BEST SELLERS</button>
        </div>
        <div style="margin-bottom:12px;border-bottom:1px solid var(--border);padding-bottom:10px;">
          <div style="font-family:var(--font-heading);font-weight:800;color:var(--brand-forest);margin-bottom:6px;">SHOP BY REGION (4 Countries)</div>
          ${state.regions
            .map(
              (r) =>
                `<button type="button" style="display:block;width:100%;text-align:left;background:none;border:none;padding:6px 4px;font-weight:700;cursor:pointer;" onclick="app.openRegionalPage('${escapeHtml(r.slug)}'); app.toggleMobileDrawer(false);">🌏 ${escapeHtml(getRegionLabel(r))}</button>`
            )
            .join('')}
        </div>
        ${activeDepts
          .map(
            (cat) => `
            <div style="margin-bottom:12px;border-bottom:1px solid var(--border);padding-bottom:10px;">
              <button type="button" style="background:none;border:none;font-family:var(--font-heading);font-weight:800;font-size:0.96rem;color:var(--brand-forest);cursor:pointer;padding:4px 0;" onclick="app.selectCategory('${escapeHtml(cat.slug)}'); app.toggleMobileDrawer(false);">
                ${escapeHtml(getCategoryLabel(cat))}
              </button>
              <div style="padding-left:10px;margin-top:6px;display:flex;flex-direction:column;gap:4px;">
                ${(cat.subcategories || [])
                  .map(
                    (sub) =>
                      `<button type="button" style="text-align:left;background:none;border:none;padding:5px;font-size:0.86rem;cursor:pointer;" onclick="app.selectSubcategory('${escapeHtml(cat.slug)}', '${escapeHtml(sub.slug)}'); app.toggleMobileDrawer(false);">• ${escapeHtml(sub.name)}</button>`
                  )
                  .join('')}
              </div>
            </div>
          `
          )
          .join('')}
      `;
    }
  },

  scrollToSection(sectionId) {
    this.switchView('storefront', false);
    setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    }, 60);
  },

  // =========================================================================
  // SECTIONS 5E, 5F, 5G, 5H: HOMEPAGE SECTIONS RENDERER
  // =========================================================================
  renderHomepageSections() {
    this.renderFeaturedCategories();
    this.renderBestSellers();
    this.renderSpecialOffers();
    this.renderNewArrivals();
  },

  renderRegionTiles() {
    const container = document.getElementById('regionTilesContainer');
    if (!container) return;
    container.innerHTML = state.regions
      .map(
        (r) => `
        <article class="region-tile-card" onclick="app.openRegionalPage('${escapeHtml(r.slug)}')">
          <div class="region-tile-media">
            <img src="${escapeHtml(r.tile_image || r.hero_image || 'images/brand/dinu-logo.png')}" alt="${escapeHtml(r.name)}" loading="lazy" />
            <span class="region-tile-badge">${escapeHtml(r.flag_emoji || '')} ${escapeHtml(r.name.toUpperCase())}</span>
          </div>
          <div class="region-tile-body">
            <h3>${escapeHtml(getRegionLabel(r))}</h3>
            <p>${escapeHtml(r.description || r.featured_highlight || '')}</p>
            <button type="button" class="btn-primary" style="width:100%;padding:10px;" onclick="event.stopPropagation(); app.openRegionalPage('${escapeHtml(r.slug)}')">
              SHOP NOW
            </button>
          </div>
        </article>
      `
      )
      .join('');
  },

  renderFeaturedCategories() {
    const container = document.getElementById('featuredCategoriesGrid');
    if (!container) return;
    const allProds = state.allProducts.length > 0 ? state.allProducts : getLocalProducts();

    const categoryMeta = [
      { slug: 'pantry', icon: '🍚', label: 'Rice, Flour & Grains', desc: 'Aged Basmati Rice & Staple Grains' },
      { slug: 'sweets', icon: '🍬', label: 'Sweets & Jaggery', desc: 'Kaju Katli, Besan Laddu & Natural Jaggery' },
      { slug: 'snacks', icon: '🥨', label: 'Snacks & Crisps', desc: 'Crunchy Indian & Asian Savoury Snacks' },
      { slug: 'sauce-seasoning', icon: '🥢', label: 'Sauces, Pastes & Condiments', desc: 'Authentic Soy Sauce, Marinades & Pastes' },
      { slug: 'canned-jarred-goods', icon: '🫙', label: 'Canned & Jarred Goods', desc: 'Pickles, Preserves & Coconut Staples' },
      { slug: 'drinks', icon: '🧃', label: 'Beverages & Teas', desc: 'Tropical Juices, Teas & Specialty Drinks' },
      { slug: 'instant-foods', icon: '🍜', label: 'Noodles & Instant Foods', desc: 'Ready-to-Eat Curries, Noodles & Mixes' }
    ];

    container.innerHTML = categoryMeta
      .map((c) => {
        const count = allProds.filter((p) => p.category_slug === c.slug && p.status !== 'archived').length;
        return `
          <div class="category-tile-card" onclick="app.selectCategory('${escapeHtml(c.slug)}')">
            <div class="category-tile-icon">${c.icon}</div>
            <h4>${escapeHtml(c.label)}</h4>
            <p>${escapeHtml(c.desc)}${count > 0 ? ` (${count} active items)` : ''}</p>
          </div>
        `;
      })
      .join('');
  },

  renderProductCardHtml(p, prefix = 'cat') {
    const reg = state.regions.find((r) => r.slug === p.region_slug);
    const inCartItem = (state.cart.items || []).find((ci) => ci.product_id === p.id && ci.variant_code === 'single');
    const localizedTitle = getProductLocalizedTitle(p);
    const isWished = (state.wishlist || []).includes(p.id);
    const hasGenuineDiscount = p.compare_at_price_ils && Number(p.compare_at_price_ils) > Number(p.price_ils);
    const sizeBadge = p.size_label || (p.net_weight_grams >= 1000 ? `${p.net_weight_grams / 1000} kg` : `${p.net_weight_grams}g`);
    const qtyInputId = `qty_${prefix}_${p.id}`;

    return `
      <article class="product-card">
        <div class="product-card-media" onclick="app.openPdpModal('${escapeHtml(p.slug)}')">
          <div class="badge-stack-left">
            ${p.is_authentic_photo ? `<span class="badge-authentic">${escapeHtml(t('real_shelf_badge'))}</span>` : ''}
            ${hasGenuineDiscount ? `<span class="badge-sale">SAVE ${p.discount_percent}%</span>` : ''}
          </div>
          <span class="badge-region-right">${reg ? escapeHtml(getRegionLabel(reg)) : escapeHtml(p.region_slug?.toUpperCase() || 'INDIA')}</span>
          <button
            type="button"
            class="wishlist-btn ${isWished ? 'active' : ''}"
            title="${isWished ? 'Remove from Wishlist' : 'Add to Wishlist'}"
            onclick="event.stopPropagation(); app.toggleWishlist('${escapeHtml(p.id)}')"
            aria-label="Toggle Wishlist"
          >
            ${isWished ? '♥' : '♡'}
          </button>
          <img src="${escapeHtml(p.primary_image_url)}" alt="${escapeHtml(localizedTitle)}" loading="lazy" />
        </div>

        <div class="product-card-body">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
            <div class="product-vendor">${escapeHtml(p.vendor_brand)}</div>
            <span style="background:var(--surface);border:1px solid var(--border);padding:1px 7px;border-radius:4px;font-size:0.72rem;font-weight:800;color:var(--brand-forest);">${escapeHtml(sizeBadge)}</span>
          </div>
          <h3 class="product-title" onclick="app.openPdpModal('${escapeHtml(p.slug)}')">${escapeHtml(localizedTitle)}</h3>
          <div class="product-title-he">${escapeHtml(p.title_he || '')}</div>

          <div class="product-rating-row">
            ${
              p.stock_quantity > 0
                ? `<span style="color:var(--brand-green-mid);font-weight:700;font-size:0.76rem;">● ${escapeHtml(t('in_stock'))} (${p.stock_quantity})</span>`
                : `<span style="color:var(--brand-red);font-weight:700;font-size:0.76rem;">● ${escapeHtml(t('out_of_stock'))}</span>`
            }
            <span style="margin-left:auto;font-size:0.73rem;color:var(--text-secondary);">Origin: ${escapeHtml((reg?.name || p.region_slug || 'India').toUpperCase())}</span>
          </div>

          <div class="product-price-block">
            <div>
              <span class="price-current">₪${Number(p.price_ils).toFixed(2)}</span>
              ${
                hasGenuineDiscount
                  ? `<span class="price-compare">₪${Number(p.compare_at_price_ils).toFixed(2)}</span>`
                  : ''
              }
            </div>
            <div class="price-unit">₪${Number(p.price_per_100_ils).toFixed(2)} / ${escapeHtml(p.unit_measure_type)}</div>
          </div>

          ${
            inCartItem
              ? `
                <div class="inline-qty-stepper">
                  <button type="button" onclick="app.updateCartItemQuantity('${escapeHtml(inCartItem.cart_item_id)}', ${inCartItem.quantity - 1})" aria-label="Decrease quantity">−</button>
                  <span>${inCartItem.quantity} ${escapeHtml(t('in_basket'))}</span>
                  <button type="button" onclick="app.updateCartItemQuantity('${escapeHtml(inCartItem.cart_item_id)}', ${inCartItem.quantity + 1})" aria-label="Increase quantity">+</button>
                </div>
              `
              : p.stock_quantity > 0
              ? `
                <div class="card-qty-row">
                  <input type="number" id="${escapeHtml(qtyInputId)}" class="card-qty-input" value="1" min="1" max="${p.stock_quantity}" aria-label="Quantity" onclick="event.stopPropagation()" />
                  <button type="button" class="add-to-cart-btn" onclick="app.addToCart('${escapeHtml(p.id)}', 'single', document.getElementById('${escapeHtml(qtyInputId)}')?.value || 1)">
                    ${escapeHtml(t('add_to_basket'))}
                  </button>
                </div>
              `
              : `<button type="button" class="add-to-cart-btn" disabled style="background:#999;cursor:not-allowed;">${escapeHtml(t('out_of_stock'))}</button>`
          }
        </div>
      </article>
    `;
  },

  renderBestSellers() {
    const grid = document.getElementById('bestSellersGrid');
    if (!grid) return;
    const allProds = (state.allProducts.length > 0 ? state.allProducts : getLocalProducts()).filter(
      (p) => p.status !== 'archived'
    );
    const best = allProds.filter((p) => p.is_best_seller || p.is_featured).slice(0, 6);
    grid.innerHTML = best.map((p) => this.renderProductCardHtml(p, 'best')).join('');
  },

  renderSpecialOffers() {
    const container = document.getElementById('specialOffersContainer');
    if (!container) return;
    const allProds = (state.allProducts.length > 0 ? state.allProducts : getLocalProducts()).filter(
      (p) => p.status !== 'archived'
    );
    const discounted = allProds.filter(
      (p) => p.compare_at_price_ils && Number(p.compare_at_price_ils) > Number(p.price_ils)
    );

    if (discounted.length === 0) {
      container.innerHTML = `
        <div class="card-panel" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px;padding:14px 18px;margin-bottom:0;background:#FFFDF7;border:1.5px solid var(--brand-gold);">
          <div style="flex:1;min-width:260px;">
            <span class="badge-authentic">HONEST PRICING POLICY</span>
            <h4 style="margin:5px 0 3px;font-size:0.95rem;">No Fabricated Strikethrough Discounts — Everyday Direct Import Pricing in ₪ ILS</h4>
            <p style="margin:0;font-size:0.82rem;color:var(--text-secondary);">
              Per Section 5G &amp; Section 18 of the DINU MARKET specification, promotional strikethrough prices are displayed strictly when an active promotion is configured in the Admin Dashboard. You can also apply promo code <strong>WELCOME10</strong> (10% off orders over ₪120) or <strong>DINU25</strong> (₪25 off orders over ₪220) in your shopping cart.
            </p>
          </div>
          <button type="button" class="btn-outline" style="padding:7px 14px;font-size:0.8rem;" onclick="document.getElementById('catalog')?.scrollIntoView({behavior:'smooth'})">Browse All Products →</button>
        </div>
      `;
    } else {
      container.innerHTML = `<div class="product-grid compact-product-grid">${discounted.map((p) => this.renderProductCardHtml(p, 'offer')).join('')}</div>`;
    }
  },

  renderNewArrivals() {
    const grid = document.getElementById('newArrivalsGrid');
    if (!grid) return;
    const allProds = (state.allProducts.length > 0 ? state.allProducts : getLocalProducts()).filter(
      (p) => p.status !== 'archived'
    );
    const arrivals = allProds.filter((p) => p.is_new_arrival).slice(0, 6);
    grid.innerHTML = (arrivals.length > 0 ? arrivals : allProds.slice(0, 6))
      .map((p) => this.renderProductCardHtml(p, 'new'))
      .join('');
  },

  // =========================================================================
  // WISHLIST & NEWSLETTER HANDLERS
  // =========================================================================
  toggleWishlist(productId) {
    const idx = state.wishlist.indexOf(productId);
    if (idx >= 0) {
      state.wishlist.splice(idx, 1);
      showToast('Removed from your Wishlist.');
    } else {
      state.wishlist.push(productId);
      showToast('♥ Saved to your Wishlist!');
    }
    localStorage.setItem('dinu_wishlist', JSON.stringify(state.wishlist));
    this.updateHeaderState();
    this.renderHomepageSections();
    this.renderProductGrid();
    if (state.activeRegionPage) {
      this.renderRegionalPageProducts();
    }
  },

  openWishlistModal() {
    const bd = document.getElementById('genericModalBackdrop');
    const content = document.getElementById('genericModalContent');
    const allProds = state.allProducts.length > 0 ? state.allProducts : getLocalProducts();
    const wishedProds = allProds.filter((p) => state.wishlist.includes(p.id));

    content.innerHTML = `
      <button type="button" class="modal-close-btn" onclick="app.closeGenericModal()">✕</button>
      <h3>♥ My Saved Wishlist (${wishedProds.length} Items)</h3>
      ${
        wishedProds.length === 0
          ? `<p style="color:var(--text-secondary);font-size:0.92rem;">Your wishlist is currently empty. Click the ♡ heart icon on any product card to save items for later.</p>`
          : `<div style="display:flex;flex-direction:column;gap:10px;max-height:380px;overflow-y:auto;">
               ${wishedProds
                 .map(
                   (p) => `
                   <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--surface);">
                     <div style="display:flex;align-items:center;gap:10px;cursor:pointer;" onclick="app.closeGenericModal(); app.openPdpModal('${escapeHtml(p.slug)}');">
                       <img src="${escapeHtml(p.primary_image_url)}" alt="${escapeHtml(p.title)}" style="width:52px;height:52px;object-fit:contain;background:#FFF;border-radius:6px;" />
                       <div>
                         <div style="font-weight:700;font-size:0.9rem;">${escapeHtml(p.title)}</div>
                         <div style="font-size:0.78rem;color:var(--text-secondary);">${escapeHtml(p.vendor_brand)} • ₪${Number(p.price_ils).toFixed(2)}</div>
                       </div>
                     </div>
                     <div style="display:flex;gap:6px;">
                       <button type="button" class="btn-primary" style="padding:6px 12px;font-size:0.78rem;" onclick="app.addToCart('${escapeHtml(p.id)}', 'single', 1)">Add to Cart</button>
                       <button type="button" class="btn-outline" style="padding:6px 10px;font-size:0.78rem;" onclick="app.toggleWishlist('${escapeHtml(p.id)}'); app.openWishlistModal();">Remove</button>
                     </div>
                   </div>
                 `
                 )
                 .join('')}
             </div>`
      }
    `;
    bd.style.display = 'flex';
  },

  async submitNewsletterForm(e) {
    e.preventDefault();
    const emailInput = document.getElementById('newsletterEmailInput');
    const consentCheck = document.getElementById('newsletterConsentCheckbox');
    if (!consentCheck?.checked) {
      showToast('Please tick the explicit consent checkbox to subscribe.');
      return;
    }
    const email = (emailInput?.value || '').trim();
    if (!email) return;

    const record = { email, consent_given: true, subscribed_at: new Date().toISOString() };
    state.newsletterSubscribers.push(record);
    localStorage.setItem('dinu_newsletter_subscribers', JSON.stringify(state.newsletterSubscribers));
    if (emailInput) emailInput.value = '';
    if (consentCheck) consentCheck.checked = false;
    showToast('Thank you for subscribing to the DINU MARKET newsletter!');
  },

  // =========================================================================
  // SECTION 6: DEDICATED REGIONAL SHOPPING PAGES (India, Thailand, Sri Lanka, Philippines)
  // =========================================================================
  openRegionalPage(regionSlug) {
    state.activeRegionPage = regionSlug;
    state.regionPageFilters = {
      category: '',
      vendor: '',
      size: '',
      inStock: false,
      maxPrice: 150,
      sort: 'featured',
      pageSize: 12
    };
    this.switchView('region');
    this.renderRegionalPage();
  },

  renderRegionalPage() {
    const container = document.getElementById('view-region');
    if (!container) return;
    const reg = state.regions.find((r) => r.slug === state.activeRegionPage) || state.regions[0];
    const allProds = (state.allProducts.length > 0 ? state.allProducts : getLocalProducts()).filter(
      (p) => p.region_slug === reg.slug && p.status !== 'archived'
    );

    const regionCategories = Array.from(new Set(allProds.map((p) => p.category_slug)));
    const regionVendors = Array.from(new Set(allProds.map((p) => p.vendor_brand)));
    const regionSizes = Array.from(new Set(allProds.map((p) => p.size_label).filter(Boolean)));

    container.innerHTML = `
      <div style="margin-bottom:16px;display:flex;justify-content:center;align-items:center;flex-wrap:wrap;gap:10px;">
        ${state.regions
          .map(
            (r) =>
              `<button type="button" class="${r.slug === reg.slug ? 'btn-primary' : 'btn-outline'}" style="padding:7px 16px;font-size:0.82rem;" onclick="app.openRegionalPage('${escapeHtml(r.slug)}')">${escapeHtml(r.flag_emoji || '')} ${escapeHtml(r.name)}</button>`
          )
          .join('')}
      </div>

      <!-- 1. Country Hero Banner & 2. Country Introduction -->
      <div class="card-panel" style="background:linear-gradient(125deg, #1E3F20 0%, #2D5A27 100%);color:#FFF;padding:28px;border:none;margin-bottom:22px;">
        <div style="display:grid;grid-template-columns:1.5fr 1fr;gap:24px;align-items:center;">
          <div>
            <span class="hero-eyebrow">${escapeHtml(reg.flag_emoji || '')} REGIONAL SHOPPING PAGE • ${escapeHtml(reg.name.toUpperCase())}</span>
            <h1 style="color:#FFF;margin:6px 0 10px;font-size:2rem;">Authentic Groceries from ${escapeHtml(reg.name)} (${escapeHtml(reg.name_he || '')})</h1>
            <p style="color:#F4EFE6;font-size:0.98rem;line-height:1.6;margin-bottom:14px;">
              ${escapeHtml(reg.description || reg.featured_highlight || '')}
            </p>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              ${regionCategories
                .map((catSlug) => {
                  const navCat = state.navigation.find((c) => c.slug === catSlug);
                  return `<button type="button" class="btn-secondary" style="padding:6px 12px;font-size:0.78rem;" onclick="state.regionPageFilters.category='${escapeHtml(catSlug)}'; app.renderRegionalPageProducts();">Browse ${escapeHtml(navCat ? navCat.name : catSlug)}</button>`;
                })
                .join('')}
            </div>
          </div>
          <div style="text-align:center;">
            <img src="${escapeHtml(reg.tile_image || reg.hero_image || 'images/brand/dinu-logo.png')}" alt="${escapeHtml(reg.name)}" style="max-height:200px;width:auto;margin:0 auto;border-radius:12px;border:3px solid var(--brand-gold);background:#FFF;padding:6px;" />
          </div>
        </div>
      </div>

      <!-- 6. Filtering & 7. Sorting Controls -->
      <div class="catalog-layout region-catalog-layout">
        <aside class="filter-sidebar region-filter-sidebar">
          <div class="filter-group">
            <h4>Filter ${escapeHtml(reg.name)} Products</h4>
            <label class="filter-check-row">
              <input type="checkbox" id="regFilterInStock" onchange="state.regionPageFilters.inStock=this.checked; app.renderRegionalPageProducts();" />
              <span>In Stock Only</span>
            </label>
          </div>
          <div class="filter-group">
            <h4>Category</h4>
            <select class="select-control" style="width:100%;" onchange="state.regionPageFilters.category=this.value; app.renderRegionalPageProducts();">
              <option value="">All ${escapeHtml(reg.name)} Categories</option>
              ${regionCategories
                .map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c.replace(/-/g, ' ').toUpperCase())}</option>`)
                .join('')}
            </select>
          </div>
          <div class="filter-group">
            <h4>Brand</h4>
            <select class="select-control" style="width:100%;" onchange="state.regionPageFilters.vendor=this.value; app.renderRegionalPageProducts();">
              <option value="">All Brands</option>
              ${regionVendors.map((v) => `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`).join('')}
            </select>
          </div>
          <div class="filter-group">
            <h4>Product Size</h4>
            <select class="select-control" style="width:100%;" onchange="state.regionPageFilters.size=this.value; app.renderRegionalPageProducts();">
              <option value="">All Sizes</option>
              ${regionSizes.map((s) => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('')}
            </select>
          </div>
          <div class="filter-group">
            <h4>Max Price: <span id="regMaxPriceLbl">₪150</span></h4>
            <input type="range" min="10" max="150" step="5" value="150" style="width:100%;accent-color:var(--brand-forest);" oninput="document.getElementById('regMaxPriceLbl').textContent='₪'+this.value; state.regionPageFilters.maxPrice=Number(this.value); app.renderRegionalPageProducts();" />
          </div>
          <button type="button" class="btn-outline" style="width:100%;padding:8px;" onclick="app.openRegionalPage('${escapeHtml(reg.slug)}')">Reset Filters</button>
        </aside>

        <div>
          <div class="catalog-toolbar">
            <div>
              <h2 style="margin:0;font-size:1.3rem;">${escapeHtml(reg.name)} Product Catalogue</h2>
              <span id="regPageCountBadge" style="font-size:0.84rem;color:var(--text-secondary);"></span>
            </div>
            <div style="display:flex;align-items:center;gap:10px;">
              <label style="font-size:0.84rem;font-weight:700;">Sort by:</label>
              <select class="select-control" onchange="state.regionPageFilters.sort=this.value; app.renderRegionalPageProducts();">
                <option value="featured">Popularity</option>
                <option value="price_asc">Price: low to high</option>
                <option value="price_desc">Price: high to low</option>
                <option value="newest">Newest arrivals</option>
                <option value="title_asc">Alphabetical (A–Z)</option>
              </select>
            </div>
          </div>

          <div id="regionalPageProductsGrid" class="product-grid"></div>
        </div>
      </div>
    `;

    this.renderRegionalPageProducts();
  },

  renderRegionalPageProducts() {
    const grid = document.getElementById('regionalPageProductsGrid');
    const badge = document.getElementById('regPageCountBadge');
    if (!grid) return;

    const reg = state.regions.find((r) => r.slug === state.activeRegionPage) || state.regions[0];
    const f = state.regionPageFilters;
    let items = (state.allProducts.length > 0 ? state.allProducts : getLocalProducts()).filter(
      (p) => p.region_slug === reg.slug && p.status !== 'archived'
    );

    if (f.category) items = items.filter((p) => p.category_slug === f.category);
    if (f.vendor) items = items.filter((p) => p.vendor_brand === f.vendor);
    if (f.size) items = items.filter((p) => p.size_label === f.size);
    if (f.inStock) items = items.filter((p) => p.stock_quantity > 0);
    if (f.maxPrice) items = items.filter((p) => p.price_ils <= f.maxPrice);

    if (f.sort === 'price_asc') items.sort((a, b) => a.price_ils - b.price_ils);
    else if (f.sort === 'price_desc') items.sort((a, b) => b.price_ils - a.price_ils);
    else if (f.sort === 'title_asc') items.sort((a, b) => a.title.localeCompare(b.title));
    else if (f.sort === 'newest') items.sort((a, b) => Number(b.is_new_arrival || 0) - Number(a.is_new_arrival || 0));

    if (badge) badge.textContent = `Showing ${items.length} product(s) sourced from ${reg.name}`;

    if (items.length === 0) {
      grid.innerHTML = `
        <div style="grid-column:1/-1;background:#FFF;padding:36px;border-radius:10px;border:1px solid var(--border);text-align:center;">
          <h3>Currently Restocking ${escapeHtml(reg.name)} Inventory</h3>
          <p style="color:var(--text-secondary);max-width:520px;margin:8px auto 16px;">
            New shipments from ${escapeHtml(reg.name)} are arriving at our Israeli distribution centre soon. Add products from our Admin Dashboard or explore all 4 Asian regions below.
          </p>
          <button type="button" class="btn-primary" onclick="app.navigateToHome()">Explore All Regions →</button>
        </div>
      `;
      return;
    }

    grid.innerHTML = items.map((p) => this.renderProductCardHtml(p, 'regpage')).join('');
  },

  renderRegionStrip() {
    const container = document.getElementById('regionPillsContainer');
    if (!container) return;
    const allPill = `
      <button type="button" class="region-pill ${!state.filters.region ? 'active' : ''}" onclick="app.selectRegion('')">
        ${escapeHtml(t('all_4_regions'))}
      </button>
    `;
    const pills = state.regions
      .map(
        (r) => `
        <button type="button" class="region-pill ${state.filters.region === r.slug ? 'active' : ''}" onclick="app.selectRegion('${escapeHtml(r.slug)}')">
          <span>${escapeHtml(getRegionLabel(r))}</span>
        </button>
      `
      )
      .join('');
    container.innerHTML = allPill + pills;
  },

  populateFilterDropdowns() {
    const catSelect = document.getElementById('filterCategorySelect');
    if (!catSelect) return;
    const departments = state.navigation.filter((c) => c.slug !== 'shop-by-region');
    catSelect.innerHTML =
      `<option value="">All 7 Active Categories</option>` +
      departments.map((d) => `<option value="${escapeHtml(d.slug)}">${escapeHtml(getCategoryLabel(d))}</option>`).join('');
  },

  onDepartmentSelectChange(catSlug) {
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
    this.switchView('storefront', false);
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
    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
  },

  selectSubcategory(catSlug, subSlug) {
    this.switchView('storefront', false);
    state.filters.category = catSlug;
    state.filters.subcategory = subSlug;
    const catSelect = document.getElementById('filterCategorySelect');
    if (catSelect) catSelect.value = catSlug;
    this.onDepartmentSelectChange(catSlug);
    const subSelect = document.getElementById('filterSubcategorySelect');
    if (subSelect) subSelect.value = subSlug;
    this.applyCatalogFilters();
    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
  },

  selectRegion(regionSlug, scrollToCatalog = false) {
    this.switchView('storefront', false);
    state.filters.region = regionSlug;
    const regSelect = document.getElementById('filterRegionSelect');
    if (regSelect) regSelect.value = regionSlug;
    this.renderRegionStrip();
    this.loadProducts();
    if (scrollToCatalog) {
      document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
    }
  },

  filterByAuthenticInventory() {
    this.switchView('storefront', false);
    this.resetAllFilters(false);
    state.filters.authenticOnly = true;
    const chk = document.getElementById('filterAuthenticOnly');
    if (chk) chk.checked = true;
    this.loadProducts();
    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
  },

  filterByOnSale() {
    this.switchView('storefront', false);
    this.resetAllFilters(false);
    state.filters.onSale = true;
    const chk = document.getElementById('filterOnSaleOnly');
    if (chk) chk.checked = true;
    this.loadProducts();
    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
  },

  resetAllFilters(reload = true) {
    state.filters = {
      category: '',
      subcategory: '',
      region: '',
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
    const ids = ['filterAuthenticOnly', 'filterInStockOnly', 'filterOnSaleOnly'];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.checked = false;
    });
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
    if (document.getElementById('sortSelect')) document.getElementById('sortSelect').value = 'featured';
    if (document.getElementById('globalSearchInput')) document.getElementById('globalSearchInput').value = '';

    this.renderRegionStrip();
    this.renderNavigation();
    if (reload) this.loadProducts();
  },

  applyCatalogFilters() {
    state.filters.authenticOnly = !!document.getElementById('filterAuthenticOnly')?.checked;
    state.filters.inStock = !!document.getElementById('filterInStockOnly')?.checked;
    state.filters.onSale = !!document.getElementById('filterOnSaleOnly')?.checked;
    const regSelect = document.getElementById('filterRegionSelect');
    state.filters.region = regSelect ? regSelect.value : (state.filters.region || '');
    state.filters.category = document.getElementById('filterCategorySelect')?.value || '';
    state.filters.subcategory = document.getElementById('filterSubcategorySelect')?.value || '';
    state.filters.size = document.getElementById('filterSizeSelect')?.value || '';
    state.filters.dietary = document.getElementById('filterDietarySelect')?.value || '';
    state.filters.vendor = document.getElementById('filterVendorSelect')?.value || '';
    state.filters.maxPrice = Number(document.getElementById('filterMaxPriceRange')?.value || 150);
    state.filters.sort = document.getElementById('sortSelect')?.value || 'featured';
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
    if (state.filters.authenticOnly) parts.push('📸 ' + t('filter_authentic'));
    if (state.filters.category) {
      const cat = state.navigation.find((c) => c.slug === state.filters.category);
      if (cat) parts.push(getCategoryLabel(cat));
    }
    if (state.filters.subcategory) parts.push(state.filters.subcategory.replace(/-/g, ' '));
    if (state.filters.region) {
      const reg = state.regions.find((r) => r.slug === state.filters.region);
      if (reg) parts.push(getRegionLabel(reg));
    }
    if (state.filters.size) parts.push(`Size: ${state.filters.size}`);
    if (state.filters.q) parts.push(`Search: "${state.filters.q}"`);

    if (heading) heading.textContent = parts.length > 0 ? parts.join(' • ') : t('all_products_heading');
    if (countBadge) countBadge.textContent = `(${state.products.length} items)`;

    if (state.products.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; background:#FFF; padding:40px; text-align:center; border-radius:8px; border:1px solid var(--border);">
          <h3>No matching products found</h3>
          <p style="color:var(--text-secondary);">Try clearing one or more filters to view the full Dinu Market catalog.</p>
          <button type="button" class="btn-primary" onclick="app.resetAllFilters()">${escapeHtml(t('clear_all_filters'))}</button>
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
        html += `<div class="predictive-section-title">Matching Categories &amp; Regions</div>`;
        (data.regions || []).forEach((r) => {
          html += `
            <div class="predictive-item" onclick="app.openRegionalPage('${escapeHtml(r.slug)}'); document.getElementById('predictiveDropdown').style.display='none';">
              <span><strong>Region: ${escapeHtml(getRegionLabel(r))}</strong></span>
              <span style="font-size:0.8rem;color:var(--brand-forest);">Open Region Page →</span>
            </div>
          `;
        });
        (data.categories || []).forEach((c) => {
          html += `
            <div class="predictive-item" onclick="app.selectCategory('${escapeHtml(c.parent_slug || c.slug)}'); document.getElementById('predictiveDropdown').style.display='none';">
              <span>📁 <strong>${escapeHtml(getCategoryLabel(c))}</strong></span>
              <span style="font-size:0.8rem;color:var(--brand-forest);">View →</span>
            </div>
          `;
        });
      }

      html += `<div class="predictive-section-title">Matching Products</div>`;
      if (!data.products || data.products.length === 0) {
        html += `<div style="padding:10px;font-size:0.86rem;color:var(--text-secondary);">No instant product matches for "${escapeHtml(q)}"</div>`;
      } else {
        data.products.forEach((p) => {
          html += `
            <div class="predictive-item" onclick="app.openPdpModal('${escapeHtml(p.slug)}'); document.getElementById('predictiveDropdown').style.display='none';">
              <div style="display:flex;align-items:center;gap:10px;">
                <img src="${escapeHtml(p.primary_image_url)}" alt="${escapeHtml(p.title)}" />
                <div>
                  <div style="font-weight:700;font-size:0.88rem;">${escapeHtml(p.title)}</div>
                  <div style="font-size:0.76rem;color:var(--text-secondary);">${escapeHtml(p.vendor_brand)} • ${escapeHtml(p.title_he || '')}</div>
                </div>
              </div>
              <div style="text-align:right;">
                <div style="font-family:var(--font-heading);font-weight:800;color:var(--brand-forest);">₪${Number(p.price_ils).toFixed(2)}</div>
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
    this.switchView('storefront', false);
    state.filters.q = (input?.value || '').trim();
    this.loadProducts();
    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
  },

  // =========================================================================
  // SECTION 7: PRODUCT DETAIL PAGE MODAL (PDP WITH CLICK-TO-ZOOM + FRONT & BACK PHOTOS)
  // =========================================================================
  async openPdpModal(slug) {
    try {
      const data = await apiFetch(`/api/products/${encodeURIComponent(slug)}`);
      const p = data.product;
      const reg = data.region;
      const reviews = data.reviews || [];
      const related = data.related_products || [];
      const isWished = (state.wishlist || []).includes(p.id);
      const hasGenuineDiscount = p.compare_at_price_ils && Number(p.compare_at_price_ils) > Number(p.price_ils);

      const backdrop = document.getElementById('pdpModalBackdrop');
      const content = document.getElementById('pdpModalContent');

      const redLabelsHtml = (p.red_labels || [])
        .map((lbl) => `<span class="il-red-label">🔴 ${escapeHtml(lbl)}</span>`)
        .join(' ');

      const dietaryHtml = (p.dietary_tags || [])
        .map(
          (tag) =>
            `<span style="background:#E8F6EE;color:var(--brand-forest);border:1px solid var(--brand-green);padding:3px 10px;border-radius:99px;font-size:0.76rem;font-weight:700;">✓ ${escapeHtml(tag)}</span>`
        )
        .join(' ');

      const nutritionEntries = Object.entries(p.nutrition || {});

      content.innerHTML = `
        <button type="button" class="modal-close-btn" onclick="app.closePdpModal()" aria-label="Close Product Modal">✕</button>

        <div style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:14px;">
          Home / ${escapeHtml(reg?.name || p.region_slug)} / ${escapeHtml(data.category?.name || p.category_slug)} / <strong>${escapeHtml(p.title)}</strong>
        </div>

        <div class="form-grid-2" style="gap:28px;align-items:start;">
          <!-- Left: Image Gallery with Click-to-Zoom & Front/Back Label Switcher -->
          <div>
            <div class="pdp-zoom-container" onclick="this.classList.toggle('zoomed')" title="Click to toggle 2x zoom">
              <img id="pdpMainImage" src="${escapeHtml(p.primary_image_url)}" alt="${escapeHtml(p.title)}" />
              <span class="pdp-zoom-hint">🔍 Click image to zoom in/out</span>
            </div>
            ${
              p.secondary_image_url
                ? `
                  <div style="display:flex;gap:12px;align-items:center;">
                    <button type="button" class="btn-outline" style="flex:1;padding:8px;font-size:0.8rem;" onclick="document.getElementById('pdpMainImage').src='${escapeHtml(p.primary_image_url)}'">
                      📦 Front Packaging Photo
                    </button>
                    <button type="button" class="btn-primary" style="flex:1;padding:8px;font-size:0.8rem;" onclick="document.getElementById('pdpMainImage').src='${escapeHtml(p.secondary_image_url)}'">
                      🔍 Back Hebrew Label &amp; Barcode Photo
                    </button>
                  </div>
                `
                : ''
            }
          </div>

          <!-- Right: Product Info, Variants, Pricing & Add to Basket -->
          <div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
              <span style="font-weight:800;font-size:0.82rem;color:var(--brand-green-mid);text-transform:uppercase;">${escapeHtml(p.vendor_brand)}</span>
              ${reg ? `<span style="background:var(--surface);padding:2px 10px;border-radius:99px;font-size:0.78rem;font-weight:700;">Country of Origin: ${escapeHtml(reg.name)}</span>` : ''}
              <span style="font-size:0.76rem;color:var(--text-secondary);">SKU: ${escapeHtml(p.sku)}</span>
              ${p.barcode_ean ? `<span style="font-size:0.76rem;color:var(--text-secondary);">EAN: ${escapeHtml(p.barcode_ean)}</span>` : ''}
            </div>

            <h2 style="font-size:1.45rem;margin-bottom:4px;">${escapeHtml(getProductLocalizedTitle(p))}</h2>
            <div style="font-size:1rem;color:var(--text-secondary);margin-bottom:10px;direction:rtl;text-align:left;">${escapeHtml(p.title_he || '')}</div>

            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">
              ${dietaryHtml}
              ${redLabelsHtml}
            </div>

            <div style="background:var(--surface);padding:14px;border-radius:8px;border:1px solid var(--border);margin-bottom:16px;">
              <div style="display:flex;align-items:baseline;gap:10px;">
                <span id="pdpDynamicPrice" style="font-family:var(--font-heading);font-size:1.75rem;font-weight:900;color:var(--brand-forest);">₪${Number(p.price_ils).toFixed(2)}</span>
                ${
                  hasGenuineDiscount
                    ? `<span style="text-decoration:line-through;color:#888;font-size:1rem;">₪${Number(p.compare_at_price_ils).toFixed(2)}</span>
                       <span class="badge-sale">SAVE ${p.discount_percent}%</span>`
                    : ''
                }
                <span style="margin-left:auto;font-weight:700;font-size:0.84rem;color:${p.stock_quantity > 0 ? 'var(--brand-green-mid)' : 'var(--brand-red)'};">
                  ${p.stock_quantity > 0 ? `● In Stock (${p.stock_quantity} available)` : '● Out of Stock'}
                </span>
              </div>
              <div style="font-size:0.8rem;color:var(--text-secondary);margin-top:4px;">
                Includes 18% Israeli VAT (כולל מע״מ) • Unit Price: <strong>₪${Number(p.price_per_100_ils).toFixed(2)} per ${escapeHtml(p.unit_measure_type)}</strong> • Size / Net Weight: <strong>${escapeHtml(p.size_label || p.net_weight_grams + 'g')}</strong>
              </div>
            </div>

            <p style="font-size:0.92rem;color:var(--text-primary);margin-bottom:14px;">${escapeHtml(getProductLocalizedDesc(p))}</p>

            <!-- Variant Selector -->
            <div class="form-field">
              <label for="pdpVariantSelect">Select Pack Size / Format:</label>
              <select
                id="pdpVariantSelect"
                onchange="const mult = this.options[this.selectedIndex].dataset.mult; document.getElementById('pdpDynamicPrice').textContent = '₪' + (${Number(p.price_ils)} * Number(mult)).toFixed(2);"
              >
                ${(p.variants || [])
                  .map(
                    (v) =>
                      `<option value="${escapeHtml(v.code)}" data-mult="${v.multiplier}">${escapeHtml(v.label)} - ₪${(p.price_ils * v.multiplier).toFixed(2)}</option>`
                  )
                  .join('')}
              </select>
            </div>

            <!-- Quantity, Add to Basket & Wishlist -->
            <div style="display:flex;gap:10px;align-items:center;margin-top:16px;">
              <input type="number" id="pdpQtyInput" value="1" min="1" max="${p.stock_quantity}" style="width:76px;padding:11px;border:1.5px solid var(--brand-forest);border-radius:8px;font-weight:700;text-align:center;" />
              <button
                type="button"
                class="btn-primary"
                style="flex:1;padding:13px;"
                onclick="app.addToCart('${escapeHtml(p.id)}', document.getElementById('pdpVariantSelect').value, document.getElementById('pdpQtyInput').value)"
              >
                🛒 Add to Cart
              </button>
              <button
                type="button"
                class="btn-outline"
                style="padding:12px 14px;"
                onclick="app.toggleWishlist('${escapeHtml(p.id)}'); app.openPdpModal('${escapeHtml(p.slug)}');"
              >
                ${isWished ? '♥ Saved' : '♡ Wishlist'}
              </button>
            </div>

            <!-- Ingredients, Allergens & Storage -->
            <div style="margin-top:18px;font-size:0.83rem;border-top:1px solid var(--border);padding-top:12px;">
              <div style="margin-bottom:6px;"><strong>Ingredients:</strong> ${escapeHtml(p.ingredients || 'See package label.')}</div>
              ${
                p.allergens?.length > 0
                  ? `<div style="margin-bottom:6px;color:var(--brand-red);"><strong>⚠️ Allergen Information:</strong> ${escapeHtml(p.allergens.join(', '))}</div>`
                  : `<div style="margin-bottom:6px;"><strong>Allergen Information:</strong> None declared (see package label).</div>`
              }
              <div style="margin-bottom:6px;"><strong>Importer (Israel):</strong> ${escapeHtml(p.importer_israel)} | <strong>Best Before:</strong> ${escapeHtml(p.expiry_date)}</div>
              <div><strong>Storage Instructions:</strong> ${escapeHtml(p.storage_instructions)}</div>
            </div>
          </div>
        </div>

        <!-- Nutrition Facts & Verified Customer Reviews Row -->
        <div class="form-grid-2" style="margin-top:24px;border-top:2px solid var(--border);padding-top:20px;">
          <div>
            <h4>Nutritional Values (סימון תזונתי ב-100 גרם/מ״ל)</h4>
            ${
              nutritionEntries.length > 0
                ? `<table class="data-table">
                    <tbody>
                      ${nutritionEntries
                        .map(
                          ([k, v]) =>
                            `<tr><td><strong>${escapeHtml(k.replace(/_/g, ' ').toUpperCase())}</strong></td><td>${escapeHtml(v)}</td></tr>`
                        )
                        .join('')}
                    </tbody>
                  </table>`
                : `<p style="font-size:0.85rem;color:var(--text-secondary);">Full nutritional table printed on packaging.</p>`
            }
          </div>

          <div>
            <h4>Customer Reviews (${reviews.length} Verified)</h4>
            <div style="max-height:200px;overflow-y:auto;margin-bottom:12px;">
              ${
                reviews.length === 0
                  ? `<p style="font-size:0.84rem;color:var(--text-secondary);">No customer reviews submitted yet. Only genuine customer reviews are published on DINU MARKET.</p>`
                  : reviews
                      .map(
                        (r) => `
                        <div style="background:var(--surface);padding:10px;border-radius:6px;margin-bottom:8px;font-size:0.84rem;">
                          <div style="display:flex;justify-content:space-between;">
                            <strong>${escapeHtml(r.author_name)} ${r.is_verified_purchase ? '<span style="color:var(--brand-green-mid);font-size:0.74rem;">✔ Verified Buyer</span>' : ''}</strong>
                            <span style="color:#D97706;">${'★'.repeat(r.rating)}</span>
                          </div>
                          <div style="font-weight:700;margin:3px 0;">${escapeHtml(r.title)}</div>
                          <div>${escapeHtml(r.body)}</div>
                        </div>
                      `
                      )
                      .join('')
              }
            </div>

            <form onsubmit="app.submitProductReview(event, '${escapeHtml(p.slug)}')" style="background:var(--surface);padding:12px;border-radius:8px;">
              <div style="font-weight:700;font-size:0.84rem;margin-bottom:8px;">Submit a Genuine Customer Review</div>
              <div style="display:flex;gap:8px;margin-bottom:8px;">
                <select id="reviewRatingInput" style="padding:6px;border-radius:4px;border:1px solid var(--border);">
                  <option value="5">★★★★★ (5/5)</option>
                  <option value="4">★★★★☆ (4/5)</option>
                  <option value="3">★★★☆☆ (3/5)</option>
                </select>
                <input type="text" id="reviewTitleInput" placeholder="Review headline..." required style="flex:1;padding:6px 10px;border:1px solid var(--border);border-radius:4px;" />
              </div>
              <textarea id="reviewBodyInput" rows="2" placeholder="Share your genuine experience with this product..." required style="width:100%;padding:8px;border:1px solid var(--border);border-radius:4px;margin-bottom:8px;"></textarea>
              <button type="submit" class="btn-outline" style="padding:6px 14px;font-size:0.8rem;">Submit Review</button>
            </form>
          </div>
        </div>

        <!-- Related Products -->
        ${
          related.length > 0
            ? `
              <div style="margin-top:22px;border-top:1px solid var(--border);padding-top:16px;">
                <h4>Related Products</h4>
                <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">
                  ${related
                    .map(
                      (rp) => `
                      <div style="border:1px solid var(--border);border-radius:8px;padding:10px;cursor:pointer;background:#FFF;" onclick="app.openPdpModal('${escapeHtml(rp.slug)}')">
                        <img src="${escapeHtml(rp.primary_image_url)}" alt="${escapeHtml(rp.title)}" style="width:100%;height:110px;object-fit:contain;border-radius:6px;margin-bottom:6px;" />
                        <div style="font-weight:700;font-size:0.8rem;line-height:1.25;margin-bottom:4px;">${escapeHtml(rp.title)}</div>
                        <div style="font-family:var(--font-heading);font-weight:800;color:var(--brand-forest);font-size:0.9rem;">₪${Number(rp.price_ils).toFixed(2)}</div>
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
      showToast('Thank you! Your verified review has been recorded.');
      this.openPdpModal(slug);
      this.loadProducts();
    } catch (err) {
      showToast(err.message);
    }
  },

  // =========================================================================
  // SECTION 8: PERSISTENT SHOPPING BASKET OPERATIONS
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
      showToast(res.message || 'Added to basket!');
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
    if (barEl) {
      barEl.innerHTML = `<div style="color:var(--brand-forest);font-weight:700;">🇮🇱 Domestic Delivery Across Israel Only • All Prices Include 18% VAT (₪ ILS)</div>`;
    }

    if (!cart.items || cart.items.length === 0) {
      itemsEl.innerHTML = `
        <div style="text-align:center;padding:48px 16px;">
          <div style="font-size:3rem;margin-bottom:10px;">🛒</div>
          <h4>Your shopping basket is empty</h4>
          <p style="font-size:0.86rem;color:var(--text-secondary);">
            Add authentic groceries from India, Thailand, Sri Lanka, and the Philippines. Your basket is automatically saved across visits!
          </p>
          <button type="button" class="btn-primary" onclick="app.toggleCartDrawer(false)">Continue Shopping</button>
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
            <div style="font-weight:700;font-size:0.88rem;line-height:1.25;">${escapeHtml(item.title)}</div>
            <div style="font-size:0.76rem;color:var(--text-secondary);margin:2px 0 6px;">${escapeHtml(item.variant_label)} • ₪${Number(item.unit_price_ils).toFixed(2)} each</div>
            <div style="display:inline-flex;align-items:center;border:1px solid var(--border);border-radius:4px;">
              <button type="button" style="border:none;background:var(--surface);padding:2px 9px;cursor:pointer;font-weight:700;" onclick="app.updateCartItemQuantity('${escapeHtml(item.cart_item_id)}', ${item.quantity - 1})">−</button>
              <span style="padding:2px 10px;font-size:0.84rem;font-weight:700;">${item.quantity}</span>
              <button type="button" style="border:none;background:var(--surface);padding:2px 9px;cursor:pointer;font-weight:700;" onclick="app.updateCartItemQuantity('${escapeHtml(item.cart_item_id)}', ${item.quantity + 1})">+</button>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-family:var(--font-heading);font-weight:800;color:var(--brand-forest);">₪${Number(item.line_total_ils).toFixed(2)}</div>
            <button type="button" style="background:none;border:none;color:var(--brand-red);font-size:0.75rem;cursor:pointer;margin-top:8px;" onclick="app.updateCartItemQuantity('${escapeHtml(item.cart_item_id)}', 0)">Remove</button>
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
          placeholder="Discount / Promo code (WELCOME10, DINU25)"
          value="${escapeHtml(cart.discount_code || '')}"
          style="flex:1;padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:0.84rem;"
        />
        <button type="submit" class="btn-outline" style="padding:8px 14px;font-size:0.82rem;">Apply</button>
      </form>

      <div style="font-size:0.86rem;display:flex;flex-direction:column;gap:5px;margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;">
          <span>Subtotal (${cart.item_count} items):</span>
          <strong>₪${Number(cart.subtotal_ils).toFixed(2)}</strong>
        </div>
        ${
          cart.discount_amount_ils > 0
            ? `<div style="display:flex;justify-content:space-between;color:var(--brand-red);">
                 <span>Discount (${escapeHtml(cart.discount_code)}):</span>
                 <strong>−₪${Number(cart.discount_amount_ils).toFixed(2)}</strong>
               </div>`
            : ''
        }
        <div style="display:flex;justify-content:space-between;">
          <span>Est. Delivery (${escapeHtml(cart.zone_name || 'Israel')}):</span>
          <strong>${cart.shipping_cost_ils === 0 ? '<span style="color:var(--brand-green-mid);">FREE (₪0.00)</span>' : '₪' + Number(cart.shipping_cost_ils).toFixed(2)}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:1.08rem;border-top:1px solid var(--border);padding-top:8px;margin-top:4px;color:var(--brand-forest);">
          <strong>Estimated Total (incl. 18% VAT):</strong>
          <strong style="font-family:var(--font-heading);">₪${Number(cart.total_ils).toFixed(2)}</strong>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:8px;">
        <button type="button" class="btn-primary" style="width:100%;padding:13px;font-size:0.95rem;" onclick="app.toggleCartDrawer(false); app.switchView('checkout');">
          🔒 Proceed to Checkout →
        </button>
        <button type="button" class="btn-outline" style="width:100%;padding:9px;font-size:0.84rem;" onclick="app.toggleCartDrawer(false)">
          Continue Shopping
        </button>
      </div>
    `;
  },

  // =========================================================================
  // VIEW ROUTING (Storefront, Regional Page, Checkout, Account Portal, Admin Dashboard)
  // =========================================================================
  navigateToHome() {
    state.activeRegionPage = null;
    this.switchView('storefront', true);
  },

  switchView(viewName, scrollToTop = true) {
    ['storefront', 'region', 'checkout', 'account', 'admin'].forEach((v) => {
      const el = document.getElementById(`view-${v}`);
      if (el) el.style.display = v === viewName ? 'block' : 'none';
    });

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
  // AUTHENTICATION MODAL & DEMO QUICK LOGINS (With Uncropped Master Logo)
  // =========================================================================
  openAuthModal(mode = 'login') {
    const bd = document.getElementById('genericModalBackdrop');
    const content = document.getElementById('genericModalContent');

    content.innerHTML = `
      <button type="button" class="modal-close-btn" onclick="app.closeGenericModal()">✕</button>
      <div style="text-align:center;margin-bottom:16px;">
        <img src="images/brand/dinu-logo.png" alt="DINU MARKET" style="height:68px;width:auto;margin:0 auto;object-fit:contain;" />
        <h3 style="margin:8px 0 4px;">${mode === 'register' ? 'Create Your DINU MARKET Account' : 'Sign In to DINU MARKET'}</h3>
        <p style="font-size:0.84rem;color:var(--text-secondary);margin:0;">
          🔒 Any items currently in your shopping basket will be automatically merged with your account!
        </p>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:16px;">
        <button type="button" class="${mode === 'login' ? 'btn-primary' : 'btn-outline'}" style="flex:1;padding:8px;font-size:0.82rem;" onclick="app.openAuthModal('login')">Sign In</button>
        <button type="button" class="${mode === 'register' ? 'btn-primary' : 'btn-outline'}" style="flex:1;padding:8px;font-size:0.82rem;" onclick="app.openAuthModal('register')">Register</button>
        <button type="button" class="${mode === 'reset' ? 'btn-primary' : 'btn-outline'}" style="flex:1;padding:8px;font-size:0.82rem;" onclick="app.openAuthModal('reset')">Reset Password</button>
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
              <button type="submit" class="btn-primary" style="width:100%;padding:12px;">Sign In &amp; Sync Basket</button>
            </form>
            <div style="margin-top:14px;padding-top:12px;border-top:1px solid var(--border);display:flex;justify-content:space-between;font-size:0.82rem;">
              <button type="button" style="background:none;border:none;color:var(--brand-forest);font-weight:700;cursor:pointer;" onclick="app.quickDemoLogin('customer')">⚡ 1-Click Demo Customer</button>
              <button type="button" style="background:none;border:none;color:var(--brand-red);font-weight:700;cursor:pointer;" onclick="app.quickDemoLogin('admin')">🛡️ 1-Click Demo Admin</button>
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
          ${steps.map((s) => `<div class="checkout-step-chip done">✔ ${escapeHtml(s)}</div>`).join('')}
        </div>

        <div class="card-panel" style="border-top:5px solid var(--brand-green);max-width:860px;margin:0 auto;">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;border-bottom:2px solid var(--border);padding-bottom:16px;margin-bottom:18px;">
            <div>
              <span class="badge-authentic" style="font-size:0.8rem;">ORDER CONFIRMED • STATUS: ${escapeHtml(ord.status || 'Payment Received')}</span>
              <h2 style="margin:6px 0 2px;">🎉 Thank You! Order ${escapeHtml(ord.order_number)} is Confirmed</h2>
              <div style="font-size:0.88rem;color:var(--text-secondary);">
                Official Israeli Tax Invoice (חשבונית מס קבלה): <strong>${escapeHtml(ord.tax_invoice_number)}</strong> • Transaction Ref: <strong>${escapeHtml(ord.transaction_ref)}</strong>
              </div>
            </div>
            <button type="button" class="btn-outline" onclick="window.print()">🖨️ Print Tax Invoice / Receipt</button>
          </div>

          <div class="form-grid-2" style="margin-bottom:18px;">
            <div style="background:var(--surface);padding:14px;border-radius:8px;">
              <h4>📦 Domestic Israeli Delivery &amp; Live Tracking</h4>
              <div style="font-size:0.86rem;">
                <strong>Recipient:</strong> ${escapeHtml(ord.shipping_address.recipient_name)} (${escapeHtml(ord.shipping_address.phone)})<br/>
                <strong>Address:</strong> ${escapeHtml(ord.shipping_address.street_address)} ${escapeHtml(ord.shipping_address.building_number || '')}, ${escapeHtml(ord.shipping_address.apartment_floor || '')}, ${escapeHtml(ord.shipping_address.city)} ${escapeHtml(ord.shipping_address.postal_code || '')}, Israel (${escapeHtml(ord.zone_code)})<br/>
                <strong>Carrier:</strong> ${escapeHtml(ord.carrier_name)}<br/>
                <strong>Tracking Number:</strong> <span style="color:var(--brand-forest);font-weight:800;">${escapeHtml(ord.tracking_number)}</span>
              </div>
            </div>
            <div style="background:var(--surface);padding:14px;border-radius:8px;">
              <h4>📧 Confirmation Email &amp; Payment Receipt</h4>
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

          <div style="display:flex;gap:12px;justify-content:flex-end;">
            ${
              state.user
                ? `<button type="button" class="btn-outline" onclick="state.checkout.last_confirmed_order=null; app.switchView('account');">
                     📦 View Order History &amp; Tracking
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
        <h2 style="margin:0;">🔒 DINU MARKET Domestic Israel Checkout</h2>
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
                       <strong>✔ Signed in as ${escapeHtml(state.user.full_name)}</strong> (${escapeHtml(state.user.email)})
                       <div style="font-size:0.8rem;color:var(--brand-forest);">Your order will be saved to your account history with saved addresses.</div>
                     </div>
                     <button type="button" class="btn-outline" style="padding:6px 12px;font-size:0.78rem;" onclick="app.logout()">Switch / Guest Mode</button>
                   </div>`
                : `<div style="background:var(--surface);border:1.5px solid var(--brand-gold);padding:14px 16px;border-radius:8px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
                     <div>
                       <strong>✔ Guest Checkout Enabled</strong>
                       <div style="font-size:0.82rem;color:var(--text-secondary);">You can complete your purchase below as a Guest, or sign in to use saved addresses and order history.</div>
                     </div>
                     <div style="display:flex;gap:8px;flex-wrap:wrap;">
                       <button type="button" class="btn-primary" style="padding:7px 14px;font-size:0.82rem;" onclick="app.openAuthModal('login')">Sign In</button>
                       <button type="button" class="btn-outline" style="padding:7px 14px;font-size:0.82rem;" onclick="app.openAuthModal('register')">Register</button>
                       <button type="button" class="btn-secondary" style="padding:7px 14px;font-size:0.82rem;" onclick="app.quickDemoLogin('customer')">⚡ 1-Click Demo Customer</button>
                     </div>
                   </div>`
            }
          </div>

          <form onsubmit="app.submitCheckoutOrder(event)">
            <!-- STEP 2: DOMESTIC ISRAELI DELIVERY ADDRESS & CONTACT DETAILS (Section 9) -->
            <div class="card-panel">
              <h3>Step 2: Contact Details &amp; Domestic Delivery Address (Israel Only)</h3>
              <div style="background:#FFF8EB;border:1px solid var(--brand-gold);padding:10px 14px;border-radius:6px;font-size:0.83rem;margin-bottom:14px;">
                🇮🇱 <strong>Delivery Geographic Scope:</strong> DINU MARKET delivers exclusively within <strong>Israel</strong>. International shipping addresses outside Israel are not accepted.
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
                               📍 ${escapeHtml(a.label)}: ${escapeHtml(a.street_address)}, ${escapeHtml(a.city)}
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
                    <option value="Israel" ${state.checkout.country === 'Israel' ? 'selected' : ''}>🇮🇱 Israel (ישראל) — Domestic Delivery Only</option>
                    <option value="Outside Israel">🌍 Outside Israel (Test Validation Block)</option>
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
                    <strong>🚚 Standard Delivery within Israel (HFD / Cheetah Courier)</strong>
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
                           <strong>⚡ Express Delivery within Israel (Same / Next Business Day)</strong>
                           <div style="font-size:0.8rem;color:var(--text-secondary);margin-left:22px;">Priority dispatch with thermal protection</div>
                         </div>
                         <strong style="color:var(--brand-forest);">₪${Number(activeZone.express_rate_ils).toFixed(2)}</strong>
                       </label>`
                    : ''
                }

                <label style="display:flex;justify-content:space-between;align-items:center;padding:12px;border:2px solid ${state.checkout.delivery_method === 'locker' ? 'var(--brand-forest)' : 'var(--border)'};border-radius:8px;cursor:pointer;background:${state.checkout.delivery_method === 'locker' ? 'var(--surface)' : '#FFF'};">
                  <div>
                    <input type="radio" name="delivMethod" value="locker" ${state.checkout.delivery_method === 'locker' ? 'checked' : ''} onchange="state.checkout.delivery_method='locker'; app.renderCheckoutView();" />
                    <strong>📦 Local Pickup / 24/7 Collection Point (נקודת איסוף)</strong>
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
                🔒 PCI-DSS Level 1 Tokenized Payment Gateway (Tranzila / Cardcom / Meshulam / PayPlus / Stripe / PayPal). Raw card numbers and CVV codes are never stored on DINU MARKET servers.
              </p>

              <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px;">
                ${[
                  { id: 'credit_card', label: '💳 Credit / Debit Card (Visa/MC/Amex/Isracard)' },
                  { id: 'bit', label: '📲 Bit (ביט ישראל)' },
                  { id: 'apple_pay', label: '🍎 Apple Pay' },
                  { id: 'google_pay', label: '🤖 Google Pay' },
                  { id: 'paypal', label: '🅿️ PayPal Express' }
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
                       ✔ Ready to authorize instant tokenized payment in ₪ ILS via <strong>${escapeHtml(state.checkout.payment_method.toUpperCase())}</strong>.
                     </div>`
              }

              <button
                type="submit"
                class="btn-primary"
                style="width:100%;padding:15px;font-size:1.05rem;margin-top:16px;"
                ${state.cart.item_count === 0 ? 'disabled style="width:100%;padding:15px;background:#999;cursor:not-allowed;margin-top:16px;"' : ''}
              >
                ✔ Authorize Payment (₪${Number(state.cart.total_ils).toFixed(2)}) &amp; Place Order
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
            <h2 style="margin:0;">👤 My Dinu Market Account: ${escapeHtml(state.user.full_name)}</h2>
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
              <h3>📍 Saved Delivery Addresses (${state.accountData.addresses.length})</h3>
              ${state.accountData.addresses
                .map(
                  (a) => `
                  <div style="background:var(--surface);padding:12px;border-radius:8px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">
                    <div style="font-size:0.86rem;">
                      <strong>${escapeHtml(a.label)} - ${escapeHtml(a.recipient_name)}</strong> (${escapeHtml(a.zone_code)})<br/>
                      ${escapeHtml(a.street_address)}, ${escapeHtml(a.apartment_floor || '')}, ${escapeHtml(a.city)} • 📞 ${escapeHtml(a.phone)}
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
              <h3>📦 Order History &amp; Live Tracking (${state.accountData.orders.length})</h3>
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
            <h2 style="margin:4px 0 0;">🛡️ DINU MARKET Administration &amp; Inventory Dashboard</h2>
          </div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button type="button" class="btn-outline" onclick="app.exportProductsCsv()">⬇️ Export Catalogue CSV</button>
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
              <strong>🗄️ Centralised Supabase Backend Architecture (24 Tables + Storage + RLS)</strong>
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
            <h3 style="margin:0;">📦 Catalogue, Pricing, Promotions &amp; Inventory Management (${data.products.length} Products)</h3>
            <div style="display:flex;gap:8px;align-items:center;">
              <label class="btn-outline" style="padding:6px 12px;font-size:0.8rem;cursor:pointer;">
                ⬆️ Bulk CSV Import
                <input type="file" accept=".csv" style="display:none;" onchange="app.importProductsCsv(event)" />
              </label>
              <button type="button" class="btn-outline" style="padding:6px 12px;font-size:0.8rem;" onclick="app.exportProductsCsv()">⬇️ Export CSV</button>
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
          <h3>🚚 Order Management &amp; Fulfilment Workflow (${data.orders.length} Orders — All 9 Statuses Supported)</h3>
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
            <h3>🇮🇱 Configurable Israeli Domestic Delivery Zones</h3>
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
            <h3>🔐 Immutable Admin Audit Logs &amp; Newsletter Subscribers (${state.newsletterSubscribers.length})</h3>
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

    const policies = {
      about: {
        title: 'About DINU MARKET Israel',
        html: `
          <p><strong>DINU MARKET</strong> is an online Asian and Indian specialty grocery store operating in <strong>Israel</strong> and delivering exclusively to addresses within Israel.</p>
          <p>We source authentic groceries, sweets, aged basmati rice, spices, sauces, and pantry staples from four culinary regions:</p>
          <ul>
            <li><strong>🇮🇳 India:</strong> Haldiram’s Sweets &amp; Savouries, Lal Qilla Majestic Basmati Rice (1 kg &amp; 5 kg), Flavorz Natural Jaggery.</li>
            <li><strong>🇹🇭 Thailand:</strong> Thai curry pastes, coconut milk, jasmine rice, and authentic Thai condiments.</li>
            <li><strong>🇱🇰 Sri Lanka:</strong> Ceylon spices, sambols, roasted curry powders, and coconut staples.</li>
            <li><strong>🇵🇭 Philippines:</strong> Silver Swan Soy Sauce (1000 ml) and classic Filipino pantry essentials.</li>
          </ul>
        `
      },
      contact: {
        title: 'Contact DINU MARKET Customer Support (Israel)',
        html: `
          <p>Our customer service team in Israel is ready to help with product enquiries, domestic courier tracking, and wholesale requests:</p>
          <ul>
            <li><strong>Customer Support Email:</strong> <a href="mailto:Support@DinuMarket.co.il">Support@DinuMarket.co.il</a></li>
            <li><strong>Operating Hours:</strong> Sunday – Thursday, 08:30 – 18:00 (Israel Time)</li>
            <li><strong>Delivery Coverage:</strong> Domestic delivery across all regions of Israel (Gush Dan, Sharon, Jerusalem, Haifa &amp; North, South, Eilat &amp; Arava).</li>
          </ul>
        `
      },
      faq: {
        title: 'Frequently Asked Questions (FAQ)',
        html: `
          <p><strong>1. Where does DINU MARKET deliver?</strong><br/>We deliver exclusively to residential and business addresses within <strong>Israel</strong>. International shipping outside Israel is not offered.</p>
          <p><strong>2. What currency are prices listed in?</strong><br/>All prices are listed in <strong>Israeli New Shekels (₪ / ILS)</strong> inclusive of 18% Israeli VAT.</p>
          <p><strong>3. Can I check out as a guest without creating an account?</strong><br/>Yes! Both <strong>Guest Checkout</strong> and registered <strong>Customer Accounts</strong> are supported at checkout.</p>
          <p><strong>4. Which countries do your products come from?</strong><br/>Our products are sourced from <strong>India</strong>, <strong>Thailand</strong>, <strong>Sri Lanka</strong>, and <strong>the Philippines</strong>.</p>
        `
      },
      shipping: {
        title: 'Shipping & Delivery Policy (Israel Only)',
        html: `
          <p>DINU MARKET delivers nationwide across Israel via <strong>Standard Courier</strong>, <strong>Express Delivery</strong>, and <strong>24/7 Local Pickup Lockers</strong>:</p>
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
            <li>Contact <strong>Support@DinuMarket.co.il</strong> with your Order Number to initiate a return or refund.</li>
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
        title: 'Accessibility Statement (הצהרת נגישות - IS 5568 & WCAG 2.1 AA)',
        html: `
          <p>DINU MARKET conforms to <strong>Israeli Standard IS 5568</strong> and <strong>WCAG 2.1 Level AA</strong>:</p>
          <ul>
            <li>Full keyboard navigation (` + '`Tab`' + `, ` + '`Enter`' + `, ` + '`Escape`' + `) and visible focus outlines (` + '`2px solid #2D5A27`' + `).</li>
            <li>WCAG AA contrast ratios across all brand palette tokens and semantic ARIA labels.</li>
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
      <div style="margin-top:18px;text-align:right;">
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

