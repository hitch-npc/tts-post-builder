/* Справочник «Как не надо»: пары «Не так / Так», нарисованные тем же движком, что и конструктор.
   «Не так» собирается в обход ограничений конструктора — в нём самом большую часть этих ошибок не сделать. */
(function () {
  'use strict';
  var T = window.TTS;
  var esc = T.esc;
  var $ = function (id) { return document.getElementById(id); };
  var EXAMPLE = 'assets/example.jpg';
  var lowres = '';
  var env = { src: function (ref) { return ref === 'lowres' ? lowres : EXAMPLE; }, tone: function () { return 'dark'; } };

  function base(mut) {
    var s = T.clone(T.DEFAULTS);
    s.mode = 'advanced';
    if (mut) mut(s);
    return s;
  }
  function slideHtml(state, i) {
    var spec = T.spec(state, env);
    T.layout(spec, i || 0, $('measure'), 1);
    var html = $('measure').innerHTML;
    $('measure').innerHTML = '';
    return { html: html, spec: spec };
  }
  var seq = 0;
  function uniq(html) { seq += 1; return html.replace(/ttsm(\d+)/g, 'ttsg' + seq + '_$1'); }
  function scaledBox(html, w, H, cropH) {
    var h = cropH || Math.round(H * w / 1080);
    var k = cropH ? Math.max(w / 1080, cropH / H) : w / 1080;
    var left = (w - 1080 * k) / 2, top = (h - H * k) / 2;
    return '<div class="pv-crop" style="width:' + w + 'px;height:' + h + 'px"><div class="pv-scaled-in" style="transform:translate(' + left + 'px,' + top + 'px) scale(' + k + ')">' + uniq(html) + '</div></div>';
  }

  /* ── правки «Не так», которых конструктор не допускает ── */
  var tweaks = {
    cobalt: function (p) {
      p.querySelectorAll('.p-eyebrow, .p-label').forEach(function (el) { el.style.color = '#0047FF'; });
    },
    overImage: function (p) {
      var im = p.querySelector('.p-img'), panel = p.querySelector('.p-panel');
      im.style.cssText += ';position:absolute;inset:0;height:auto;flex:none;z-index:0';
      panel.style.cssText += ';background:none;justify-content:flex-end;padding-top:0;z-index:1';
      p.style.setProperty('--p-fg', '#FFFFFF'); p.style.setProperty('--p-muted', '#EDEDED');
      p.style.setProperty('--p-label', '#E0E0E0'); p.style.setProperty('--p-line', '#FFFFFF');
    },
    decor: function (p) {
      var im = p.querySelector('.p-img');
      im.style.cssText += ';border-radius:48px;box-shadow:0 30px 60px #00000080;border:10px solid #FFFFFF';
      p.querySelector('.p-title').style.textShadow = '0 8px 16px #00000059';
      p.querySelectorAll('.p-info-cell').forEach(function (c) { c.style.cssText += ';background:#FFFFFF;border-radius:28px;padding:20px;box-shadow:0 12px 30px #0000002E'; });
    },
    storyEdges: function (p) {
      p.style.paddingTop = '48px'; p.style.paddingBottom = '40px';
    }
  };

  var LONG_LEAD = 'Гоголь — Евгений Миронов и Мария Смольникова. Шнитке — Юрий Башмет и оркестр «Новая Россия». Режиссёр — Мария Брусникина. Один вечер в Доме музыки.';
  var BAD_CAPTION = 'МЁРТВЫЕ ДУШИ!!! 🔥🔥🔥 СПЕШИТЕ!!! Евгений Миронов и Юрий Башмет на одной сцене в спектакле-концерте по поэме Гоголя с музыкой Шнитке, а также Мария Смольникова и оркестр Новая Россия, режиссер Мария Брусникина, 29.04 в 19.00 в Доме музыки, билеты от 3000 руб по ссылке, торопитесь, места разлетаются!!! 🎭🎭🎭';
  var BAD_TEXT = 'Спектакль-концерт "Мёртвые души" - Гоголь и Шнитке в одном вечере. Начало в 19:00, билеты от 3000 ₽, 10-12 ряды партера...';

  /* ── пары ── */
  var EX = [
    { id: 'overload', title: 'Не перегружайте картинку',
      why: 'Каждая лишняя строка делает мельче всё остальное: картинка ужимается, название уменьшается, а на телефоне текст сливается. Цены, условия и подробности — в текст поста.',
      bad: function () { return base(function (s) { s.type = 'status'; s.status = 'few'; s.event.kind = 'Спектакль-концерт с оркестром'; s.event.lead = LONG_LEAD; s.adv.infoCount = 3; }); },
      good: function () { return base(); } },
    { id: 'caps', title: 'Не пишите название капсом',
      why: 'Капс читается медленнее и выглядит как крик. По правилу 14.3 названия событий пишутся обычным регистром, капс — только по решению владельца.',
      bad: function () { return base(function (s) { s.adv.titleCaps = true; }); },
      good: function () { return base(); } },
    { id: 'long-title', title: 'Не растягивайте название на три строки',
      why: 'Длинное название уменьшается и съедает картинку. На холсте — имя события, всё остальное — в подводку.',
      bad: function () { return base(function (s) { s.event.title = 'Мёртвые души: Гоголь, Шнитке и оркестр «Новая Россия»'; s.adv.titleSize = 118; s.event.lead = 'Один вечер в Доме музыки.'; }); },
      good: function () { return base(); } },
    { id: 'emoji', title: 'Не ставьте на картинку эмодзи и восклицательные знаки',
      why: 'Эмодзи на холсте рисуются чужим шрифтом и спорят с типографикой, восклицательные знаки делают анонс крикливым. Эмодзи уместны в тексте поста — по одному в начале строки.',
      bad: function () { return base(function (s) { s.event.title = 'Мёртвые души 🔥'; s.event.lead = 'Миронов и Башмет на одной сцене!!! Только один вечер!!!'; }); },
      good: function () { return base(); } },
    { id: 'cobalt', title: 'Не красьте мелкий текст в кобальт',
      why: 'Кобальт на мелких подписях выглядит ссылкой и спорит с афишей. По правилу 14.3 кобальт в тексте — только крупно; надзаголовок и подписи — серые. На холсте кобальт есть только у активной палочки слайдов.',
      bad: function () { return base(); }, badTweak: tweaks.cobalt,
      good: function () { return base(); } },
    { id: 'blobs', title: 'Не включайте яркое свечение рядом с афишей',
      why: 'Яркое свечение и яркая афиша — два пятна, и взгляду не за что зацепиться. С картинкой — «Тихо», «Ярко» — только для слайда без картинки.',
      bad: function () { return base(function (s) { s.theme = 'dark'; s.genre = 'opera'; s.adv.blobLevel = 'full'; }); },
      good: function () { return base(function (s) { s.theme = 'dark'; s.genre = 'opera'; }); } },
    { id: 'over-image', title: 'Не кладите текст на картинку',
      why: 'На пёстрой афише текст и логотип теряются, а на другой картинке шаблон сломается. Текст стоит на спокойном поле — под картинкой или рядом.',
      bad: function () { return base(function (s) { s.layout = 'band'; }); }, badTweak: tweaks.overImage,
      good: function () { return base(function (s) { s.layout = 'band'; }); } },
    { id: 'decor', title: 'Не добавляйте рамки, тени и скругления',
      why: 'Скругления, тени и плашки — чужой стиль. Система угловатая: радиус не больше 2 px, без теней и рамок.',
      bad: function () { return base(); }, badTweak: tweaks.decor,
      good: function () { return base(); } },
    { id: 'lowres', title: 'Не берите маленькие картинки',
      why: 'Маленькая картинка растягивается и мылится. Нужен исходник от 1080 px по ширине — конструктор предупредит, если картинка мелкая.',
      bad: function () { return base(function (s) { s.event.image.ref = 'lowres'; }); },
      good: function () { return base(); } },
    { id: 'square', title: 'Не публикуйте квадрат в Instagram', view: 'tile',
      why: 'Сетка профиля показывает середину поста в пропорции 3:4. У квадрата срезается примерно по 135 px с каждой стороны — вместе с логотипом и краем текста. 4:5 теряет около 34 px, это внутри полей.',
      bad: function () { return base(function (s) { s.format = 'square'; s.event.lead = ''; }); },
      good: function () { return base(); } },
    { id: 'story', title: 'Не прячьте главное у краёв сторис', view: 'story',
      why: 'Верх сторис закрывают полоска прогресса и имя, низ — строка ответа. Название и даты у краёв окажутся под интерфейсом.',
      bad: function () { return base(function (s) { s.format = 'story'; }); }, badTweak: tweaks.storyEdges,
      good: function () { return base(function (s) { s.format = 'story'; }); } },
    { id: 'series', title: 'Не меняйте стиль от поста к посту', view: 'grid',
      why: 'В профиле посты стоят рядом. Если каждый в своей теме и шаблоне, лента выглядит случайной. Выберите тему и шаблон на серию и держите их.',
      bad: function () {
        return [
          base(function (s) { s.layout = 'band'; s.theme = 'dark'; s.adv.titleCaps = true; }),
          base(function (s) { s.type = 'status'; s.status = 'start'; s.theme = 'light'; s.adv.blobLevel = 'full'; s.genre = 'musical'; }),
          base(function (s) { s.layout = 'album'; s.theme = 'dark'; s.adv.blobLevel = 'full'; s.genre = 'opera'; }),
          base(function (s) { s.type = 'status'; s.status = 'few'; s.layout = 'band'; s.theme = 'light'; }),
          base(function (s) { s.type = 'change'; s.theme = 'dark'; }),
          base(function (s) { s.type = 'status'; s.status = 'last'; s.theme = 'light'; s.adv.titleCaps = true; s.adv.infoCount = 3; })
        ];
      },
      good: function () {
        return [
          base(),
          base(function (s) { s.type = 'status'; s.status = 'start'; }),
          base(function (s) { s.layout = 'album'; }),
          base(function (s) { s.type = 'status'; s.status = 'few'; }),
          base(function (s) { s.type = 'change'; }),
          base(function (s) { s.type = 'status'; s.status = 'last'; })
        ];
      } },
    { id: 'caption', title: 'Не пишите текст поста сплошной стеной', view: 'tg',
      why: 'Абзац капсом с датой в середине не дочитывают. Структура канала: крючок, о чём, когда и где, билеты, почему сейчас. Конструктор собирает её сам — останется вписать крючок и пару предложений.',
      badCaption: BAD_CAPTION,
      bad: function () { return base(); }, good: function () { return base(); } },
    { id: 'typo', title: 'Не ставьте дефис вместо тире и кавычки-«лапки»', view: 'text',
      why: 'Дефис вместо тире, прямые кавычки и предлог в конце строки выглядят небрежно. Типограф конструктора исправляет это сам — в расширенном интерфейсе его можно выключить, но без причины не стоит.' }
  ];

  /* ── отрисовка ── */
  function shotWidth(view, cell) {
    var w = cell.clientWidth;
    if (view === 'tg') return Math.min(360, w);
    if (view === 'story') return Math.min(240, w);
    return Math.min(w, 360);
  }
  function renderShot(ex, kind, cell) {
    var view = ex.view || 'poster';
    var w = shotWidth(view, cell);
    var make = ex[kind], tweak = ex[kind + 'Tweak'];
    if (view === 'text') {
      var t = kind === 'bad' ? BAD_TEXT : T.typo(BAD_TEXT);
      cell.innerHTML = '<div class="g-text">' + esc(t).replace(/ /g, '<span class="g-nb"> </span>') + '</div>';
      return;
    }
    if (view === 'grid') {
      var tw = Math.floor((w - 4) / 3), th = Math.round(tw * 4 / 3);
      cell.innerHTML = '<div class="g-grid" style="grid-template-columns:repeat(3,' + tw + 'px)">' + make().map(function (st) {
        var r = slideHtml(st, 0);
        return scaledBox(r.html, tw, r.spec.H, th);
      }).join('') + '</div>';
      return;
    }
    var r = slideHtml(make(), 0);
    if (view === 'tg') {
      var st = make();
      cell.innerHTML = T.previewTelegram({ H: r.spec.H, slides: [r.html], caption: kind === 'bad' ? ex.badCaption : T.captionText(st), tgTheme: 'dark' });
      return;
    }
    if (view === 'story') {
      cell.innerHTML = T.previewStory({ H: r.spec.H, slides: [r.html], handle: 'tickettoshow.ru', platform: 'ig' });
      if (tweak) tweak(cell.querySelector('.poster'));
      return;
    }
    if (view === 'tile') {
      var h = Math.round(w * 4 / 3);
      cell.innerHTML = '<div class="g-tile">' + scaledBox(r.html, w, r.spec.H, h) + '</div>';
      return;
    }
    cell.innerHTML = scaledBox(r.html, w, r.spec.H);
    if (tweak) tweak(cell.querySelector('.poster'));
  }

  function build() {
    $('toc').innerHTML = EX.map(function (ex, i) { return '<a href="#' + ex.id + '">' + (i + 1) + '. ' + esc(ex.title) + '</a>'; }).join('') +
      '<a href="#standard">Стандарт конструктора</a>';
    $('guideList').innerHTML = EX.map(function (ex, i) {
      return '<section class="g-section" id="' + ex.id + '">' +
        '<h3 class="g-title"><span class="step">' + (i + 1) + '</span>' + esc(ex.title) + '</h3>' +
        '<p class="g-why">' + esc(ex.why) + '</p>' +
        '<div class="g-pair g-view-' + (ex.view || 'poster') + '">' +
          '<figure class="g-fig"><figcaption class="g-bad">Не так</figcaption><div class="g-cell" data-ex="' + i + '" data-kind="bad"></div></figure>' +
          '<figure class="g-fig"><figcaption class="g-good">Так</figcaption><div class="g-cell" data-ex="' + i + '" data-kind="good"></div></figure>' +
        '</div></section>';
    }).join('');
    paint();
  }
  function paint() {
    document.querySelectorAll('.g-cell').forEach(function (cell) {
      renderShot(EX[+cell.getAttribute('data-ex')], cell.getAttribute('data-kind'), cell);
    });
  }

  // уменьшенная копия примера — для пары «маленькая картинка»
  function makeLowres() {
    return new Promise(function (resolve) {
      var im = new Image();
      im.onload = function () {
        var c = document.createElement('canvas'); c.width = 64; c.height = Math.round(64 * im.naturalHeight / im.naturalWidth);
        c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
        lowres = c.toDataURL('image/jpeg', 0.7); resolve();
      };
      im.onerror = resolve;
      im.src = EXAMPLE;
    });
  }

  $('appLogo').innerHTML = T.logo();
  var lastW = 0;
  Promise.all([makeLowres(), document.fonts ? document.fonts.ready : null]).then(function () {
    build();
    lastW = window.innerWidth;
    window.addEventListener('resize', function () {
      if (window.innerWidth === lastW) return;
      lastW = window.innerWidth; paint();
    });
  });
})();
