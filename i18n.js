// Languages for the site and the slideshow: Vietnamese (default), Swedish, English.
// Elements carry data-i18n="key" (inner HTML) and/or data-i18n-attr="attr:key;attr:key".
// The choice is remembered per browser and shared by both pages; ?lang=sv overrides it.
window.I18N = (() => {
  const FLAGS = {
    vi: '<svg viewBox="0 0 30 20" preserveAspectRatio="xMidYMid slice"><rect width="30" height="20" fill="#da251d"/><polygon points="15.00,4.00 16.35,8.15 20.71,8.15 17.18,10.71 18.53,14.85 15.00,12.29 11.47,14.85 12.82,10.71 9.29,8.15 13.65,8.15" fill="#ff0"/></svg>',
    sv: '<svg viewBox="0 0 16 10" preserveAspectRatio="xMidYMid slice"><rect width="16" height="10" fill="#006aa7"/><rect x="5" width="2" height="10" fill="#fecc00"/><rect y="4" width="16" height="2" fill="#fecc00"/></svg>',
    en: '<svg viewBox="0 0 60 30" preserveAspectRatio="xMidYMid slice"><rect width="60" height="30" fill="#012169"/><path d="M0 0L60 30M60 0L0 30" stroke="#fff" stroke-width="6"/><path d="M0 0L60 30M60 0L0 30" stroke="#c8102e" stroke-width="2"/><path d="M30 0v30M0 15h60" stroke="#fff" stroke-width="10"/><path d="M30 0v30M0 15h60" stroke="#c8102e" stroke-width="6"/></svg>',
  };
  const LANGS = [
    { code: 'vi', name: 'Tiếng Việt' },
    { code: 'sv', name: 'Svenska' },
    { code: 'en', name: 'English' },
  ];

  const ASSOC = { vi: 'Hội Người Việt Stockholm', sv: 'Vietnamesiska Föreningen i Stockholm', en: 'Vietnamese Association in Stockholm' };
  const S = {
    // shared
    'assoc': ASSOC,
    'lang': { vi: 'Ngôn ngữ', sv: 'Språk', en: 'Language' },
    'date': { vi: 'Thứ Bảy 24.10', sv: 'Lördag 24/10', en: 'Saturday 24 Oct' },
    'prog': { vi: 'Chương trình', sv: 'Program', en: 'Programme' },
    'join': { vi: 'Trở thành hội viên', sv: 'Bli medlem', en: 'Become a member' },
    'per-year': { vi: '/ năm / người', sv: '/ år / person', en: '/ year / person' },

    // site
    'skip': { vi: 'Bỏ qua đến chương trình', sv: 'Hoppa till programmet', en: 'Skip to the programme' },
    'to-top': { vi: 'Hội Người Việt Stockholm – đầu trang', sv: 'Vietnamesiska Föreningen i Stockholm – till toppen', en: 'Vietnamese Association in Stockholm – back to top' },
    'nav': { vi: 'Mục lục', sv: 'Innehåll', en: 'Contents' },
    'nav-slides': { vi: 'Slideshow', sv: 'Bildspel', en: 'Slideshow' },
    'nav-about': { vi: 'Về Hội', sv: 'Om oss', en: 'About us' },
    'nav-member': { vi: 'Hội viên', sv: 'Medlem', en: 'Join' },
    'eyebrow': { vi: 'Hội Người Việt Stockholm mời bạn', sv: 'Välkommen på månfest', en: 'Join us for the Mid-Autumn Festival' },
    'from': { vi: 'Từ 14:00', sv: 'Från 14.00', en: 'From 14:00' },
    'open-map': { vi: ' (mở Google Maps)', sv: ' (öppna Google Maps)', en: ' (open Google Maps)' },
    'play-slides': { vi: 'Trình chiếu', sv: 'Visa bildspelet', en: 'Play slideshow' },
    'fullscreen': { vi: 'Mở toàn màn hình', sv: 'Helskärm', en: 'Full screen' },
    'about-h': { vi: 'Hội Người Việt Stockholm', sv: 'Vietnamesiska Föreningen i Stockholm', en: 'Vietnamese Association in Stockholm' },
    'about-lede': {
      vi: '<span lang="sv">Vietnamesiska Föreningen i Stockholm</span> – Tết, Trung Thu, văn nghệ và giao lưu cho người Việt ở Stockholm.',
      sv: '<span lang="vi">Hội Người Việt Stockholm</span> – Tết, Trung Thu, kultur och gemenskap för vietnameser i Stockholm.',
      en: '<span lang="vi">Hội Người Việt Stockholm</span> – Lunar New Year, Mid-Autumn, culture and community for Vietnamese people in Stockholm.',
    },
    'alt-xuan': { vi: 'Đông đảo cộng đồng trên sân khấu chương trình Xuân 2026', sv: 'Många ur föreningen på scenen vid nyårsfirandet 2026', en: 'The community together on stage at the 2026 New Year celebration' },
    'alt-longden': { vi: 'Lồng đèn giấy nhiều màu', sv: 'Färgglada papperslyktor', en: 'Colourful paper lanterns' },
    'alt-tet1': { vi: 'Thành viên Hội bên quầy Tết, phông Chúc mừng năm mới 2026', sv: 'Medlemmar vid nyårsbordet framför en gratulationsbanderoll för 2026', en: 'Members at the New Year stall in front of a Happy New Year 2026 banner' },
    'alt-aodai': { vi: 'Các chị em mặc áo dài', sv: 'Kvinnor i áo dài', en: 'Women wearing áo dài' },
    'alt-vemat': { vi: 'Em bé được vẽ mặt mèo', sv: 'Ett barn ansiktsmålat som en katt', en: 'A child with a cat face painted on' },
    'alt-besankhau': { vi: 'Các bé chơi bóng bay trên sân khấu', sv: 'Barn leker med ballonger på scenen', en: 'Children playing with balloons on stage' },
    'alt-sach': { vi: 'Gian sách thiếu nhi ngoài trời bên bờ nước Stockholm', sv: 'Ett bord med barnböcker utomhus vid vattnet i Stockholm', en: "An outdoor children's book stall by the water in Stockholm" },
    'alt-mamco': { vi: 'Mâm cỗ trái cây và bánh kẹo', sv: 'Ett festbord med frukt och sötsaker', en: 'A festive tray of fruit and sweets' },
    'copy': { vi: 'Sao chép', sv: 'Kopiera', en: 'Copy' },
    'copied': { vi: 'Đã sao chép số Swish.', sv: 'Swishnumret är kopierat.', en: 'Swish number copied.' },
    'swish-no': { vi: 'Số Swish: ', sv: 'Swishnummer: ', en: 'Swish number: ' },
    'swish-open': { vi: 'Mở Swish · 100 kr', sv: 'Öppna Swish · 100 kr', en: 'Open Swish · 100 kr' },
    'alt-qr': { vi: 'Mã QR Swish của Người Việt Stockholm, số 123 664 15 67', sv: 'Swish-QR-kod till Người Việt Stockholm, nummer 123 664 15 67', en: 'Swish QR code for Người Việt Stockholm, number 123 664 15 67' },

    // slideshow
    'about-sub': { vi: 'Vietnamesiska Föreningen i Stockholm', sv: 'Hội Người Việt Stockholm', en: 'Hội Người Việt Stockholm' },
    'about-big': {
      vi: 'Cùng nhau giữ Tết, giữ Trung Thu,<br>giữ tiếng Việt nơi xứ người.',
      sv: 'Tillsammans håller vi Tết, Trung Thu<br>och vietnamesiskan levande här.',
      en: 'Together we keep Tết, Trung Thu<br>and the Vietnamese language alive here.',
    },
    'acts': { vi: 'Hoạt động của Hội', sv: 'Våra aktiviteter', en: 'What we do' },
    'act-xuan': { vi: 'Đón Xuân', sv: 'Nyårsfirande', en: 'Lunar New Year' },
    'act-trungthu': { vi: 'Trung Thu', sv: 'Månfest', en: 'Mid-Autumn' },
    'act-kids': { vi: 'Thiếu nhi', sv: 'Barn', en: 'Kids' },
    'act-books': { vi: 'Sách tiếng Việt', sv: 'Vietnamesiska böcker', en: 'Vietnamese books' },
    'act-food': { vi: 'Ẩm thực', sv: 'Mat', en: 'Food' },
    'act-community': { vi: 'Giao lưu', sv: 'Gemenskap', en: 'Community' },
    'end-h': { vi: 'Trung Thu vui vẻ!', sv: 'Glad månfest!', en: 'Happy Mid-Autumn!' },
    'end-line': { vi: 'Cảm ơn cả nhà đã đến – hẹn gặp lại mùa trăng sau!', sv: 'Tack för att ni kom – vi ses nästa månfest!', en: 'Thank you for coming – see you next Mid-Autumn!' },
  };

  let lang = 'vi';
  try { lang = localStorage.getItem('tt-lang') || lang; } catch {}
  const q = new URLSearchParams(location.search).get('lang');
  if (q) lang = q;
  if (!LANGS.some(l => l.code === lang)) lang = 'vi';

  const t = key => S[key]?.[lang] ?? S[key]?.vi ?? key;
  // Text in data.js is either a plain (Vietnamese) string or { vi, sv, en }.
  const pick = v => (v == null || typeof v === 'string' ? v : v[lang] ?? v.vi);

  function apply(root = document) {
    document.documentElement.lang = lang;
    root.querySelectorAll('[data-i18n]').forEach(el => { el.innerHTML = t(el.dataset.i18n); });
    root.querySelectorAll('[data-i18n-attr]').forEach(el => el.dataset.i18nAttr.split(';').forEach(pair => {
      const [attr, key] = pair.split(':');
      el.setAttribute(attr, t(key));
    }));
  }
  function set(code) {
    if (code === lang || !LANGS.some(l => l.code === code)) return;
    lang = code;
    try { localStorage.setItem('tt-lang', code); } catch {}
    apply();
    dispatchEvent(new CustomEvent('langchange', { detail: code }));
  }
  const next = () => LANGS[(LANGS.findIndex(l => l.code === lang) + 1) % LANGS.length].code;

  return { LANGS, FLAGS, t, pick, apply, set, next, get lang() { return lang; } };
})();
