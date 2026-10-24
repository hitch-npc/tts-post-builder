/* Конструктор постов TTS — общие данные и утилиты. Без DOM, используется и конструктором, и справочником. */
(function () {
  'use strict';
  var T = window.TTS = window.TTS || {};

  // Поля: 72 по бокам (сетка 6 колонок, промежуток 24). Сторис: сверху 112 + 150 из smm.tokens.json,
  // снизу 250 — под строку ответа.
  T.FORMATS = {
    post:   { h: 1350, name: '4:5',  label: 'Пост 4:5', padTop: 72,  padBottom: 72 },
    square: { h: 1080, name: '1:1',  label: '1:1',      padTop: 64,  padBottom: 64 },
    story:  { h: 1920, name: '9:16', label: 'Сторис 9:16', padTop: 262, padBottom: 250 }
  };
  T.SIDE = 72;

  // Блоб = жанр (CLAUDE.md, принцип 4): классика и театр — синий, опера — тёплый, мюзикл — зелёный
  T.GENRES = {
    theatre: { name: 'Театр',    blob: 'cool' },
    classic: { name: 'Классика', blob: 'cool' },
    opera:   { name: 'Опера',    blob: 'warm' },
    musical: { name: 'Мюзикл',   blob: 'green' },
    other:   { name: 'Другое',   blob: 'cool' }
  };
  // Теги — цвет по смыслу (правило 14.3): зелёный, оранжевый, красный
  T.STATUSES = {
    start: { name: 'Старт продаж',     tag: 'g', why: 'Билеты только поступили в продажу — лучшие места по стартовой цене разбирают первыми.' },
    few:   { name: 'Мало мест',        tag: 'o', why: 'Мест осталось немного — если планировали пойти, лучше не откладывать.' },
    last:  { name: 'Последние билеты', tag: 'r', why: 'Это последние билеты на этот вечер.' }
  };
  T.CHANGES = {
    move:   { name: 'Перенос', tag: 'o', note: 'Купленные билеты действуют на новую дату. Если она не подходит, билеты можно вернуть.' },
    cancel: { name: 'Отмена',  tag: 'r', note: 'Билеты можно вернуть: деньги придут на карту, с которой оплачивали.' }
  };
  T.TYPES = {
    announce: 'Анонс',
    status: 'Статус продаж',
    change: 'Перенос или отмена',
    digest: 'Подборка'
  };
  T.LAYOUTS = { frame: 'Картинка в поле', band: 'Картинка полосой', album: 'Альбом из 2' };

  // Настройки «Расширенного» режима. В «Простом» всегда действуют эти значения — так держится стандарт.
  T.ADV_DEFAULTS = {
    titleSize: 0,            // 0 — авто: 118 (smm display), не больше двух строк
    titleCaps: false,
    blobColor: 'auto',       // auto — по жанру
    blobLevel: 'auto',       // auto — «Тихо», у служебных постов — «Нет»
    logoTone: 'auto',        // auto — по яркости картинки под логотипом
    imageSize: 60,
    infoCount: 2,
    customInfo: null,
    customRows: null,
    subline: '',
    detailsLead: '',
    slides: 'auto',
    typograph: true,
    guides: false,
    exportType: 'jpeg', exportScale: 1, jpegQuality: 0.92
  };

  T.DEFAULTS = {
    v: 2,
    mode: 'simple',
    type: 'announce',
    layout: 'frame',
    slide: 1,
    format: 'post',
    theme: 'light',
    genre: 'theatre',
    status: 'start',
    event: {
      kind: 'Спектакль-концерт',
      title: 'Мёртвые души',
      lead: 'Гоголь — Евгений Миронов и Мария Смольникова. Шнитке — Юрий Башмет и оркестр «Новая Россия».',
      date: '2027-04-29', time: '19:00',
      venue: 'Дом музыки', city: 'Москва',
      price: '3000', link: '', age: '12+',
      image: { ref: 'example', x: 50, y: 50, zoom: 1 }
    },
    change: { kind: 'move', date: '2027-05-12', time: '19:00', venue: '', note: '' },
    digest: {
      kind: 'Подборка',
      title: 'Куда пойти в конце апреля',
      items: [
        { title: 'Мёртвые души', date: '2027-04-29', time: '19:00', venue: 'Дом музыки', price: '3000', link: '' },
        { title: 'Название события', date: '2027-04-30', time: '19:00', venue: 'Площадка', price: '', link: '' },
        { title: 'Название события', date: '2027-05-02', time: '19:00', venue: 'Площадка', price: '', link: '' }
      ]
    },
    caption: {
      hook: 'Евгений Миронов, Юрий Башмет на одной сцене',
      body: '«Мёртвые души» — спектакль-концерт, где отрывки из поэмы Гоголя звучат вместе с «Гоголь-сюитой» Альфреда Шнитке. На сцене — Евгений Миронов, Мария Смольникова, Юрий Башмет и Государственный симфонический оркестр «Новая Россия». Режиссёр — Мария Брусникина.',
      why: 'Билеты только поступили в продажу — лучшие места по стартовой цене разбирают первыми.',
      change: '',
      intro: ''
    },
    adv: JSON.parse(JSON.stringify(T.ADV_DEFAULTS)),
    ig: { handle: 'tickettoshow.ru' },
    tab: 'canvas',
    tgTheme: 'dark'
  };

  T.PLACEHOLDER_TITLE = 'Название события';
  T.LIMITS = { kind: 32, title: 48, lead: 160, subline: 70, detailsLead: 240, venue: 32, city: 24, itemTitle: 36, digestTitle: 44, note: 160 };

  /* ── утилиты ── */
  T.clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  T.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  T.br = function (s) { return T.esc(s).replace(/\n/g, '<br>'); };

  /* ── типограф: тире, кавычки, неразрывные пробелы ── */
  var NB = ' ';
  T.typo = function (s) {
    if (!s) return s || '';
    s = String(s).replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').trim();
    s = s.replace(/\.\.\./g, '…');
    // кавычки: открывающая после начала строки, пробела или скобки, иначе закрывающая
    var out = '', depth = 0;
    for (var i = 0; i < s.length; i++) {
      var c = s[i];
      if (c === '"' || c === '“' || c === '”' || c === '„') {
        var prev = i ? s[i - 1] : '';
        var opening = !prev || /[\s(\[«„—–-]/.test(prev);
        if (opening) { out += depth ? '„' : '«'; depth++; }
        else { depth = Math.max(0, depth - 1); out += depth ? '“' : '»'; }
      } else out += c;
    }
    s = out;
    s = s.replace(/(^|\s)--?(?=\s)/g, '$1—');          // « - » и « -- » → тире
    s = s.replace(/(\d)-(\d)(?!\d*-)/g, '$1–$2');       // 10-12 → 10–12
    s = s.replace(/ —/g, NB + '—');                      // тире не переносится на новую строку
    // короткие слова не висят в конце строки
    for (var k = 0; k < 2; k++) s = s.replace(/(^|[\s («„])([а-яёА-ЯЁa-zA-Z]{1,2})\s/g, '$1$2' + NB);
    s = s.replace(/(\d) (?=[а-яёА-ЯЁ₽%])/g, '$1' + NB);  // 29 апреля, 3 000 ₽
    return s;
  };
  // 1 знак, 2 знака, 5 знаков
  T.plural = function (n, forms) {
    var a = Math.abs(n) % 100, b = a % 10;
    return forms[a > 10 && a < 20 ? 2 : b > 1 && b < 5 ? 1 : b === 1 ? 0 : 2];
  };
  T.hasEmoji = function (s) { try { return /\p{Extended_Pictographic}/u.test(s || ''); } catch (e) { return false; } };

  /* ── даты, время, цены ── */
  var MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  var MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  var DOW = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  var DOW_FULL = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
  T.MONTHS = MONTHS;
  T.parseDate = function (iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!m) return null;
    var d = new Date(+m[1], +m[2] - 1, +m[3]);
    return isNaN(d) ? null : d;
  };
  T.fmt = {
    dayMonth: function (iso) { var d = T.parseDate(iso); return d ? d.getDate() + NB + MONTHS[d.getMonth()] : ''; },
    short: function (iso) { var d = T.parseDate(iso); return d ? d.getDate() + NB + MONTHS[d.getMonth()] + ', ' + DOW[d.getDay()] : ''; },
    long: function (iso) { var d = T.parseDate(iso); return d ? d.getDate() + NB + MONTHS[d.getMonth()] + ' ' + d.getFullYear() : ''; },
    longDow: function (iso) { var d = T.parseDate(iso); return d ? d.getDate() + NB + MONTHS[d.getMonth()] + ' ' + d.getFullYear() + ', ' + DOW_FULL[d.getDay()] : ''; },
    dow: function (iso) { var d = T.parseDate(iso); return d ? DOW[d.getDay()] : ''; },
    dowFull: function (iso) { var d = T.parseDate(iso); return d ? DOW_FULL[d.getDay()] : ''; },
    monthShort: function (iso) { var d = T.parseDate(iso); return d ? MONTHS_SHORT[d.getMonth()] : ''; },
    day: function (iso) { var d = T.parseDate(iso); return d ? String(d.getDate()) : ''; },
    price: function (p) {
      var digits = String(p || '').replace(/\D/g, '');
      if (!digits) return '';
      return digits.replace(/\B(?=(\d{3})+(?!\d))/g, NB);
    }
  };
  // «29 апреля 2027» → 2027-04-29 (для старых сохранений)
  T.parseRuDate = function (s) {
    var m = /(\d{1,2})\s+([а-яё]+)\s+(\d{4})/i.exec(s || '');
    if (!m) return '';
    var mi = MONTHS.indexOf(m[2].toLowerCase());
    if (mi < 0) return '';
    return m[3] + '-' + String(mi + 1).padStart(2, '0') + '-' + String(+m[1]).padStart(2, '0');
  };
  T.todayIso = function () {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };

  T.slug = function (s) {
    var map = { а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'c',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya' };
    return String(s).toLowerCase().split('').map(function (c) { return map[c] != null ? map[c] : c; }).join('')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'post';
  };
})();
