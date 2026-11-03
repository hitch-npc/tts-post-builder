/* Конструктор постов TTS — общие данные и утилиты. Без DOM, используется и конструктором, и справочником. */
(function () {
  'use strict';
  var T = window.TTS = window.TTS || {};

  // Холсты и поля — из SMM-слоя дизайн-системы (smm.tokens.json, решение №34):
  // поле 112 (узкое 72 — в расширенном интерфейсе), сторис — 262 сверху и 250 снизу.
  T.FORMATS = {
    post:   { h: 1350, name: '4:5',  label: 'Пост 4:5' },
    square: { h: 1080, name: '1:1',  label: '1:1' },
    story:  { h: 1920, name: '9:16', label: 'Сторис 9:16' }
  };
  T.MARGINS = { wide: 112, tight: 72 };
  T.STORY_PAD = { top: 262, bottom: 250 };

  // Свечение одним цветом жанра: театр и классика — синий, опера — тёплый, мюзикл — зелёный
  T.GENRES = {
    theatre: { name: 'Театр',    hue: 'cool' },
    classic: { name: 'Классика', hue: 'cool' },
    opera:   { name: 'Опера',    hue: 'warm' },
    musical: { name: 'Мюзикл',   hue: 'green' },
    other:   { name: 'Другое',   hue: 'cool' }
  };
  // Метка статуса — инверсия, без цветных тегов
  T.STATUSES = {
    start: { name: 'Старт продаж',     why: 'Билеты только поступили в продажу — лучшие места по стартовой цене разбирают первыми.' },
    few:   { name: 'Мало мест',        why: 'Мест осталось немного — если планировали пойти, лучше не откладывать.' },
    last:  { name: 'Последние билеты', why: 'Это последние билеты на этот вечер.' }
  };
  T.CHANGES = {
    move:   { name: 'Перенос', note: 'Купленные билеты действуют на новую дату. Если она не подходит, билеты можно вернуть.' },
    cancel: { name: 'Отмена',  note: 'Билеты можно вернуть: деньги придут на карту, с которой оплачивали.' }
  };
  T.TYPES = {
    announce: 'Анонс',
    status: 'Статус продаж',
    change: 'Перенос или отмена',
    digest: 'Подборка',
    video: 'Обложка видео'
  };
  T.LAYOUTS = { frame: 'Картинка в поле', band: 'Картинка полосой', album: 'Альбом из 2', type: 'Без картинки', collage: 'Коллаж' };
  // Коллаж: фигура из двух частей, в каждой своё фото. asp — ширина к высоте фигуры
  T.SHAPES = {
    ticket: { name: 'Разорванный билет', asp: 0.8 },
    tt:     { name: 'Т и перевёрнутая Т', asp: 0.82 },
    portal: { name: 'Портал и сцена', asp: 0.8 },
    stub:   { name: 'Корешок сбоку', asp: 1.6 },
    notch:  { name: 'Билет с вырезами', asp: 1.6 },
    diag:   { name: 'Наискосок', asp: 0.8 },
    wave:   { name: 'Волной', asp: 0.8 },
    strip:  { name: 'Корешок снизу', asp: 0.62 }
  };
  // Рисунок свечения: «Рампа» — для постов с картинкой, остальные — для постов без картинки
  T.FX = {
    none: 'Нет', footlight: 'Рампа', beam: 'Луч', depth: 'Глубина', halo: 'Ореол',
    studio: 'Студия', spot: 'Прожектор', window: 'Окно', edge: 'Кромка', fog: 'Туман', vignette: 'Виньетка'
  };
  // Свет для постов без картинки и обложек видео. Новые — тональные: свет того же цвета, что поле, только светлее.
  T.GLOWS = {
    studio: 'Студия', spot: 'Прожектор', window: 'Окно', edge: 'Кромка', fog: 'Туман', vignette: 'Виньетка',
    beam: 'Луч', depth: 'Глубина', halo: 'Ореол'
  };
  // «Окно» рисуется тремя полосами света (<i>) внутри слоя
  T.FX_LAYERED = { window: 1 };
  // Поле — цвет фона целиком. Светлые поля включают светлую тему, тёмные — тёмную.
  T.FIELDS = {
    auto: { name: 'По теме' }, paper: { name: 'Бумага', theme: 'light' }, stone: { name: 'Камень', theme: 'light' },
    graphite: { name: 'Графит', theme: 'dark' }, night: { name: 'Ночь', theme: 'dark' }, cobalt: { name: 'Кобальт', theme: 'dark' }
  };
  /* Палитры: проверенные сочетания темы, поля и цвета рисунка. Выбор в один клик держит серию в одном стиле;
     ручная настройка — в расширенном интерфейсе («Тонкая настройка»). hue: auto — цвет от жанра. */
  T.PALETTES = {
    genre:     { name: 'По жанру',           theme: 'dark',  field: 'auto',     hue: 'auto' },
    night:     { name: 'Ночь в цвет жанра',  theme: 'dark',  field: 'night',    hue: 'auto' },
    gold:      { name: 'Ночь и золото',      theme: 'dark',  field: 'night',    hue: 'gold' },
    cobalt:    { name: 'Графит и кобальт',   theme: 'dark',  field: 'graphite', hue: 'cobalt' },
    silver:    { name: 'Чернила и серебро',  theme: 'dark',  field: 'auto',     hue: 'silver' },
    violet:    { name: 'Ночь и фиолетовый',  theme: 'dark',  field: 'night',    hue: 'violet' },
    teal:      { name: 'Графит и бирюза',    theme: 'dark',  field: 'graphite', hue: 'teal' },
    paper:     { name: 'Бумага и кобальт',   theme: 'light', field: 'paper',    hue: 'cobalt' },
    stone:     { name: 'Камень и золото',    theme: 'light', field: 'stone',    hue: 'gold' },
    light:     { name: 'Светлая в цвет жанра', theme: 'light', field: 'auto',   hue: 'auto' }
  };
  // Сочетания, отмеченные «Нет» на сверке, — конструктор предупреждает о них. Ключ: тема|поле|цвет.
  T.AVOID = {};
  T.TITLE_FONTS = { forum: 'Forum', cormorant: 'Cormorant' };
  // Типографика обложки видео
  T.TYPE_STYLES = {
    poster:   { name: 'Плакат',   hint: 'Название крупно у нижнего края, слева. Самый тихий вариант — читается и в сетке.' },
    stack:    { name: 'Колонка',  hint: 'Каждое слово на своей строке, плотным столбом. Для коротких названий из 2–4 слов.' },
    contrast: { name: 'Контраст', hint: 'Первое слово почти вдвое крупнее остальных. Один сильный жест — по нему находят выпуск в сетке.' },
    center:   { name: 'Центр',    hint: 'По центру между двумя тонкими чертами — афишная классика, для спокойных сюжетов.' },
    numeral:  { name: 'Номер',    hint: 'Огромная цифра выпуска и название под ней. Для серий: «Закулисье № 3».' }
  };
  // Стартовый кегль названия на обложке по типографике, px холста
  T.VT_SIZE = { poster: 196, stack: 210, contrast: 132, center: 168, numeral: 116 };
  T.VT_LINES = { poster: 3, stack: 5, contrast: 4, center: 3, numeral: 3 };

  // Настройки «Расширенного» режима. В «Простом» всегда действуют эти значения — так держится стандарт.
  // цвета метки — только теги ядра DS: .tag-accent, -green, -orange, -red, -default
  T.MARK_COLORS = ['invert', 'art', 'accent', 'green', 'orange', 'red', 'default'];

  T.ADV_DEFAULTS = {
    titleSize: 0,            // 0 — авто по шкале SMM, название не больше двух строк
    titleCaps: false,
    titleFont: 'forum',      // Forum — толще и ровнее Cormorant, лучше читается с мелкой сетки
    density: -1,             // -1 авто (обложка видео и подборка плотнее), 0 обычная, 1 плотная, 2 жирная
    grain: true,             // зерно поверх фона — тонкое, убирает ступеньки градиента
    fx: 'auto',             // auto — «Рампа» с картинкой, выбранное свечение без картинки, у служебных постов — нет
    margins: 'wide',         // wide — 112, tight — 72
    logoTone: 'auto',        // auto — по яркости картинки под логотипом
    imageSize: 60,
    customRows: null,
    subline: '',
    detailsLead: '',
    slides: 'auto',
    typograph: true,
    guides: false,
    exportType: 'jpeg', exportScale: 1, jpegQuality: 0.92
  };

  T.DEFAULTS = {
    v: 3,
    mode: 'simple',
    type: 'announce',
    layout: 'frame',
    slide: 1,
    format: 'post',
    theme: 'light',
    genre: 'theatre',
    glow: 'studio',
    art: 'glass',            // рисунок фона без картинки (T.ARTS); 'none' — вернуть свечение
    artSeed: 1,              // номер узора: «Другой рисунок» меняет его
    markColor: 'invert',     // метка статуса: invert — инверсия, art — как рисунок, или тег ядра (T.MARK_COLORS)
    artHue: 'auto',          // цвет рисунка (T.ART_HUES); задаёт палитра, вручную — в расширенном интерфейсе
    palette: 'genre',        // палитра (T.PALETTES или своя u…); custom — настроено вручную
    field: 'auto',
    status: 'start',
    event: {
      kind: 'Спектакль-концерт',
      title: 'Мёртвые души',
      lead: 'Поэма Гоголя и «Гоголь-сюита» Шнитке в одном вечере.',
      date: '2027-04-29', time: '19:00',
      venue: 'Дом музыки',
      price: '3000', link: '', age: '12+',
      image: { ref: 'example', x: 50, y: 50, zoom: 1 }
    },
    change: { kind: 'move', date: '2027-05-12', time: '19:00', venue: '', note: '' },
    // depth — объём граней 0–48; seed — номер разрыва билета; side — вертикальная строка справа
    collage: {
      shape: 'ticket', depth: 24, seed: 0, side: 'Билеты на tickettoshow.ru',
      grid: 'stack', cols: 6, align: 'start',   // сетка: компоновка, ширина фигуры в колонках из 6, выравнивание
      p1: { ref: 'example', x: 30, y: 35, zoom: 1 },
      p2: { ref: 'example', x: 80, y: 65, zoom: 1.4 }
    },
    digest: {
      title: 'Куда пойти в конце апреля',
      items: [
        { title: 'Мёртвые души', date: '2027-04-29', time: '19:00', venue: 'Дом музыки', price: '3000', link: '', image: { ref: 'example', x: 55, y: 30, zoom: 1 } },
        { title: 'Название события', date: '2027-04-30', time: '19:00', venue: 'Площадка', price: '', link: '', image: { ref: 'example', x: 12, y: 80, zoom: 1 } },
        { title: 'Название события', date: '2027-05-02', time: '19:00', venue: 'Площадка', price: '', link: '', image: { ref: 'example', x: 88, y: 45, zoom: 1 } }
      ]
    },
    video: {
      layout: 'type',        // type — только заголовок на свечении, band — кадр сверху
      style: 'poster',
      kicker: 'Закулисье',
      title: 'Как собирают «Мёртвые души»',
      line: 'Репетиция · 2 мин',
      num: '3'
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
  T.LIMITS = { kind: 32, title: 48, lead: 90, subline: 60, detailsLead: 120, venue: 32, itemTitle: 32, digestTitle: 40, note: 120, side: 40 };

  /* ── утилиты ── */
  T.clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  T.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    }).replace(/\uE000/g, '<span class="bx-we">').replace(/\uE001/g, '</span>');
  };
  // день недели на холсте: выходные помечены и рисуются с красным подчёркиванием (.bx-we)
  T.WE_OPEN = '\uE000'; T.WE_CLOSE = '\uE001';
  T.plainText = function (s) { return String(s || '').replace(/[\uE000\uE001]/g, ''); };
  T.br = function (s) { return T.esc(s).replace(/\n/g, '<br>'); };
  // Числа в названиях — в отдельном «прописном» начертании (.bx-n): в Cormorant цифры по умолчанию старостильные
  // («11» читается как «ıı», «1» как «I»), на афише так нельзя. Экранирует сам, поэтому принимает сырой текст.
  T.numsHtml = function (raw) {
    raw = String(raw == null ? '' : raw);
    var re = /\d+(?:[.,:–−-]\d+)*/g, out = '', last = 0, m;
    while ((m = re.exec(raw))) {
      out += T.esc(raw.slice(last, m.index)) + '<span class="bx-n">' + T.esc(m[0]) + '</span>';
      last = m.index + m[0].length;
    }
    return out + T.esc(raw.slice(last));
  };

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
    dow: function (iso) {
      var d = T.parseDate(iso); if (!d) return '';
      var w = DOW[d.getDay()];
      return d.getDay() === 0 || d.getDay() === 6 ? T.WE_OPEN + w + T.WE_CLOSE : w;
    },
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
